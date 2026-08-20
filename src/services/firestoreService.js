/**
 * firestoreService.js
 * Firestore 실시간 리스너 구독, 점수/투표/설정 CRUD 및 배치 시뮬레이션 서비스
 */

import { 
    getDb, 
    doc, 
    setDoc, 
    updateDoc, 
    onSnapshot, 
    collection, 
    serverTimestamp, 
    getDocs, 
    writeBatch, 
    deleteField, 
    appId 
} from '../config/firebase.js';
import { appState } from '../state/appState.js';
import { generateUUID } from '../utils/helpers.js';
import { hashPassword } from '../utils/crypto.js';

/**
 * 대회 동적 설정(발표자, 배점기준, 메타데이터) 실시간 리스너
 */
export function setupConfigListener(callback) {
    const db = getDb();
    const configDocRef = doc(db, `/artifacts/${appId}/public/data/config`, 'default-config');

    return onSnapshot(configDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const remoteConfig = docSnap.data();
            appState.applyRemoteConfig(remoteConfig);
            if (callback) callback(remoteConfig);
        }
    }, (error) => {
        console.error("Config listener error:", error);
    });
}

/**
 * 대회 동적 설정을 Firestore에 영구 저장
 */
export async function saveRemoteConfig(configData) {
    const db = getDb();
    const configDocRef = doc(db, `/artifacts/${appId}/public/data/config`, 'default-config');
    await setDoc(configDocRef, {
        ...configData,
        updatedAt: serverTimestamp()
    }, { merge: true });
}

/**
 * 관리자/평가자 비밀번호를 SHA-256 해시로 안전하게 변경 저장
 * @param {'admin'|'evaluator'} role 
 * @param {string} newPassword 
 */
export async function changeSystemPassword(role, newPassword) {
    if (!newPassword || newPassword.trim().length < 4) {
        throw new Error("비밀번호는 최소 4자리 이상이어야 합니다.");
    }
    const db = getDb();
    const newHash = await hashPassword(newPassword.trim());
    const authDocRef = doc(db, `/artifacts/${appId}/public/data/auth_config`, 'credentials');

    const updateData = {};
    if (role === 'admin') {
        updateData.adminPasswordHash = newHash;
    } else if (role === 'evaluator') {
        updateData.evaluatorPasswordHash = newHash;
    }
    updateData.updatedAt = serverTimestamp();

    await setDoc(authDocRef, updateData, { merge: true });
}

/**
 * 평가 점수 실시간 리스너
 */
export function setupRealtimeScoresListener(callback) {
    const db = getDb();
    const scoresCollectionRef = collection(db, `/artifacts/${appId}/public/data/scores`);

    return onSnapshot(scoresCollectionRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const presenterId = change.doc.id;
            const data = change.doc.data();

            if (change.type === "added" || change.type === "modified") {
                appState.setPresenterScoreData(presenterId, data);
            } else if (change.type === "removed") {
                appState.deletePresenterScoreData(presenterId);
            }
        });

        if (callback) callback();
    }, (error) => {
        console.error("Realtime scores listener error:", error);
    });
}

/**
 * 특정 평가자의 부문별 제출 상태 리스너
 */
export function setupSubmissionListener(evaluatorId, callback) {
    const db = getDb();
    const docRef = doc(db, `/artifacts/${appId}/public/data/submissions`, evaluatorId);

    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            appState.setSubmissions(docSnap.data());
        } else {
            appState.setSubmissions({});
        }
        if (callback) callback();
    }, (error) => {
        console.error("Submission listener error:", error);
    });
}

/**
 * 관리자용 전체 평가자 제출 상태 리스너
 */
export function setupAllSubmissionsListener(callback) {
    const db = getDb();
    const colRef = collection(db, `/artifacts/${appId}/public/data/submissions`);

    return onSnapshot(colRef, (snapshot) => {
        const allSubs = {};
        snapshot.forEach(docSnap => {
            allSubs[docSnap.id] = docSnap.data();
        });
        appState.setAllSubmissions(allSubs);
        if (callback) callback(allSubs);
    }, (error) => {
        console.error("All submissions listener error:", error);
    });
}

/**
 * 우수 발표자 투표 실시간 리스너
 */
export function setupExcellentPresenterListener(callback) {
    const db = getDb();
    const selectionsCollectionRef = collection(db, `/artifacts/${appId}/public/data/excellent_presenter_selections`);

    return onSnapshot(selectionsCollectionRef, (snapshot) => {
        const selections = {};
        snapshot.forEach(docSnap => {
            selections[docSnap.id] = docSnap.data();
        });
        appState.setExcellentPresenterSelections(selections);
        if (callback) callback(selections);
    }, (error) => {
        console.error("Excellent presenter listener error:", error);
    });
}

/**
 * 점수 업데이트
 */
export async function updateScore(presenterId, criterionKey, value) {
    if (!appState.loginId) return;

    appState.setSaveStatus('SAVING');
    const db = getDb();
    const docRef = doc(db, `/artifacts/${appId}/public/data/scores`, presenterId);

    try {
        const scoreVal = value === '' ? null : parseInt(value, 10);
        const payload = {
            [`scores.${appState.loginId}.${criterionKey}`]: scoreVal,
            updatedAt: serverTimestamp()
        };

        const baseData = {
            presenterId,
            updatedAt: serverTimestamp()
        };

        await setDoc(docRef, baseData, { merge: true });
        await updateDoc(docRef, payload);

        appState.setSaveStatus('SAVED');
    } catch (error) {
        console.error("Error updating score:", error);
        appState.setSaveStatus('ERROR');
        throw error;
    }
}

/**
 * 심사평 코멘트 업데이트
 */
export async function updateComment(presenterId, text) {
    if (!appState.loginId) return;

    appState.setSaveStatus('SAVING');
    const db = getDb();
    const docRef = doc(db, `/artifacts/${appId}/public/data/scores`, presenterId);

    try {
        const payload = {
            [`comments.${appState.loginId}`]: text.trim(),
            updatedAt: serverTimestamp()
        };

        const baseData = {
            presenterId,
            updatedAt: serverTimestamp()
        };

        await setDoc(docRef, baseData, { merge: true });
        await updateDoc(docRef, payload);

        appState.setSaveStatus('SAVED');
    } catch (error) {
        console.error("Error updating comment:", error);
        appState.setSaveStatus('ERROR');
        throw error;
    }
}

/**
 * 부문별 최종 제출
 */
export async function submitCategory(categoryKey) {
    if (!appState.loginId) return;

    const db = getDb();
    const docRef = doc(db, `/artifacts/${appId}/public/data/submissions`, appState.loginId);

    const payload = {
        evaluatorName: appState.loginId,
        [categoryKey]: true,
        updatedAt: serverTimestamp()
    };

    await setDoc(docRef, payload, { merge: true });
}

/**
 * 우수 발표자 선택 임시 저장
 */
export async function saveExcellentSelection(category, presenterName) {
    if (!appState.loginId) return;

    const db = getDb();
    const docRef = doc(db, `/artifacts/${appId}/public/data/excellent_presenter_selections`, appState.loginId);

    const payload = {
        evaluatorName: appState.loginId,
        [`selections.${category}`]: presenterName,
        submitted: false,
        updatedAt: serverTimestamp()
    };

    await setDoc(docRef, payload, { merge: true });
}

/**
 * 우수 발표자 최종 제출
 */
export async function submitExcellentSelections() {
    if (!appState.loginId) return;

    const db = getDb();
    const docRef = doc(db, `/artifacts/${appId}/public/data/excellent_presenter_selections`, appState.loginId);

    await updateDoc(docRef, {
        submitted: true,
        updatedAt: serverTimestamp()
    });
}

/**
 * 투표자 세션 일괄 해제 (관리자용)
 */
export async function resetVoterSessions() {
    const db = getDb();
    const sessionCollectionRef = collection(db, `/artifacts/${appId}/public/data/voter_sessions`);
    const snapshot = await getDocs(sessionCollectionRef);
    const batch = writeBatch(db);

    snapshot.forEach(docSnap => {
        batch.delete(docSnap.ref);
    });

    await batch.commit();
}

/**
 * 가상 평가 및 투표 시뮬레이션
 */
export async function runSimulation() {
    const db = getDb();
    const simulatedEvaluators = Array.from({ length: 6 }, () => `sim-evaluator-${generateUUID()}`);

    const scorePromises = [];
    const submissionPromises = [];

    for (const userId of simulatedEvaluators) {
        for (const category in appState.presenters) {
            const categoryPresenters = appState.presenters[category];
            const criteria = appState.evaluationCriteria[category] || [];

            for (const presenter of categoryPresenters) {
                const docRef = doc(db, `/artifacts/${appId}/public/data/scores`, presenter.id);
                for (const criterion of criteria) {
                    const score = Math.floor(Math.random() * (criterion.maxScore - 5)) + 5;
                    const payload = {
                        [`scores.${userId}.${criterion.key}`]: score,
                        updatedAt: serverTimestamp()
                    };
                    const baseData = {
                        presenterId: presenter.id,
                        updatedAt: serverTimestamp()
                    };

                    scorePromises.push(
                        setDoc(docRef, baseData, { merge: true }).then(() => updateDoc(docRef, payload))
                    );
                }
            }
        }

        const subDocRef = doc(db, `/artifacts/${appId}/public/data/submissions`, userId);
        const subData = { evaluatorName: userId };
        Object.keys(appState.presenters).forEach(cat => {
            subData[cat] = true;
        });
        submissionPromises.push(setDoc(subDocRef, subData, { merge: true }));
    }

    const totalVoters = appState.eventInfo?.TOTAL_VOTERS || 200;
    const simulatedVoterIds = Array.from({ length: totalVoters }, () => `sim-voter-${generateUUID()}`);
    const votePromises = [];

    for (const userId of simulatedVoterIds) {
        const docRef = doc(db, `/artifacts/${appId}/public/data/excellent_presenter_selections`, userId);
        const selections = {};
        for (const category in appState.presenters) {
            const categoryPresenters = appState.presenters[category];
            if (categoryPresenters.length > 0) {
                const randomIndex = Math.floor(Math.random() * categoryPresenters.length);
                selections[category] = categoryPresenters[randomIndex].name;
            }
        }
        votePromises.push(
            setDoc(docRef, { evaluatorName: userId, selections, submitted: true }, { merge: true })
        );
    }

    await Promise.all([...scorePromises, ...submissionPromises, ...votePromises]);
}

/**
 * 시뮬레이션 데이터 초기화
 */
export async function resetSimulationData() {
    const db = getDb();
    const batch = writeBatch(db);

    const scoresCollectionRef = collection(db, `/artifacts/${appId}/public/data/scores`);
    const scoresSnapshot = await getDocs(scoresCollectionRef);
    
    scoresSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.scores) {
            let needsUpdate = false;
            const updates = {};
            Object.keys(data.scores).forEach(key => {
                if (key.startsWith('sim-evaluator-')) {
                    updates[`scores.${key}`] = deleteField();
                    if (data.comments && data.comments[key]) {
                        updates[`comments.${key}`] = deleteField();
                    }
                    needsUpdate = true;
                }
            });
            if (needsUpdate) {
                batch.update(docSnap.ref, updates);
            }
        }
    });

    const selectionsCollectionRef = collection(db, `/artifacts/${appId}/public/data/excellent_presenter_selections`);
    const selectionsSnapshot = await getDocs(selectionsCollectionRef);
    
    selectionsSnapshot.forEach(docSnap => {
        if (docSnap.id.startsWith('sim-voter-')) {
            batch.delete(docSnap.ref);
        }
    });

    const submissionsCollectionRef = collection(db, `/artifacts/${appId}/public/data/submissions`);
    const submissionsSnapshot = await getDocs(submissionsCollectionRef);
    submissionsSnapshot.forEach(docSnap => {
        if (docSnap.id.startsWith('sim-evaluator-')) {
            batch.delete(docSnap.ref);
        }
    });

    await batch.commit();
}

/**
 * 전체 데이터 초기화
 */
export async function resetAllData() {
    const db = getDb();
    const collectionsToDelete = ['scores', 'excellent_presenter_selections', 'submissions', 'voter_sessions', 'evaluator_sessions'];
    const batch = writeBatch(db);

    for (const collectionName of collectionsToDelete) {
        const collectionRef = collection(db, `/artifacts/${appId}/public/data/${collectionName}`);
        const snapshot = await getDocs(collectionRef);
        snapshot.forEach(d => {
            batch.delete(d.ref);
        });
    }

    await batch.commit();
}
