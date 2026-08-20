/**
 * firestoreService.js
 * Firestore 실시간 데이터베이스 연동, 데이터 저장, 동적 설정, 세션 및 심사평 관리 모듈
 */

import { 
    getDb, 
    doc, 
    setDoc, 
    updateDoc, 
    collection, 
    onSnapshot, 
    getDocs, 
    writeBatch, 
    deleteField, 
    appId 
} from '../config/firebase.js';
import { appState } from '../state/appState.js';
import { generateUUID } from '../utils/helpers.js';

let saveStatusResetTimeout = null;

/**
 * 대회 동적 설정 실시간 리스너 등록
 */
export function setupConfigListener(callback) {
    const db = getDb();
    const configDocRef = doc(db, `/artifacts/${appId}/public/data/config`, 'main');
    
    return onSnapshot(configDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            appState.setDynamicConfig(data);
            if (typeof callback === 'function') callback(data);
        }
    }, (err) => {
        console.warn("No remote dynamic config found, using defaults.", err);
    });
}

/**
 * 대회 동적 설정 저장 (관리자용)
 */
export async function saveEventConfig(config) {
    const db = getDb();
    const configDocRef = doc(db, `/artifacts/${appId}/public/data/config`, 'main');
    await setDoc(configDocRef, config, { merge: true });
    appState.setDynamicConfig(config);
}

/**
 * 점수 및 심사평 실시간 리스너 등록
 */
export function setupRealtimeScoresListener(callback) {
    const db = getDb();
    const collectionPath = `/artifacts/${appId}/public/data/scores`;
    const scoresCollection = collection(db, collectionPath);
    
    return onSnapshot(scoresCollection, (snapshot) => {
        let shouldRerender = false;
        snapshot.docChanges().forEach((change) => {
            shouldRerender = true;
            if (change.type === "added" || change.type === "modified") {
                const data = change.doc.data();
                if (data && !data.scores) {
                    data.scores = {};
                }
                appState.allScores[change.doc.id] = data;
            }
            if (change.type === "removed") {
                delete appState.allScores[change.doc.id];
            }
        });

        if (shouldRerender) {
            appState.resetFinalResultsCache();
            if (typeof callback === 'function') callback();
        }
    }, (error) => {
        console.error("Scores Snapshot listener error:", error);
    });
}

/**
 * 평가자 본인 제출 상태 리스너 등록
 */
export function setupSubmissionListener(evaluatorId, callback) {
    if (!evaluatorId) return () => {};
    const db = getDb();
    const submissionDocRef = doc(db, `/artifacts/${appId}/public/data/submissions`, evaluatorId);
    
    return onSnapshot(submissionDocRef, (docSnap) => {
        appState.submissionStatus = docSnap.exists() ? docSnap.data() : {};
        if (typeof callback === 'function') callback();
    });
}

/**
 * 관리자용: 모든 평가자 제출 상태 컬렉션 리스너 등록
 */
export function setupAllSubmissionsListener(callback) {
    const db = getDb();
    const submissionsCollection = collection(db, `/artifacts/${appId}/public/data/submissions`);
    
    return onSnapshot(submissionsCollection, (snapshot) => {
        const allSubs = {};
        snapshot.forEach(docSnap => {
            allSubs[docSnap.id] = docSnap.data();
        });
        appState.allSubmissions = allSubs;
        if (typeof callback === 'function') callback();
    });
}

/**
 * 우수 발표자 투표 현황 리스너 등록
 */
export function setupExcellentPresenterListener(callback) {
    const db = getDb();
    const collectionPath = `/artifacts/${appId}/public/data/excellent_presenter_selections`;
    const selectionsCollection = collection(db, collectionPath);
    
    return onSnapshot(selectionsCollection, (snapshot) => {
        let changed = false;
        snapshot.docChanges().forEach((change) => {
            changed = true;
            if (change.type === "added" || change.type === "modified") {
                appState.excellentPresenterSelections[change.doc.id] = change.doc.data();
            } else if (change.type === "removed") {
                delete appState.excellentPresenterSelections[change.doc.id];
            }
        });

        if (changed) {
            appState.resetFinalResultsCache();
            if (typeof callback === 'function') callback();
        }
    });
}

/**
 * 점수 비동기 업데이트
 */
export async function updateScore(presenterId, criterionKey, score) {
    if (!appState.loginId) return;
    const scoreValue = score === '' ? null : parseInt(score, 10);
    if (score !== '' && isNaN(scoreValue)) return;
    
    appState.setSaveStatus('saving');

    const db = getDb();
    const docRef = doc(db, `/artifacts/${appId}/public/data/scores/${presenterId}`);
    
    const scoreUpdatePayload = {
        [`scores.${appState.loginId}.${criterionKey}`]: scoreValue
    };

    try {
        const category = Object.keys(appState.presenters).find(cat => appState.presenters[cat].some(p => p.id === presenterId));
        if (!category) return;
        const presenterObj = appState.presenters[category].find(p => p.id === presenterId);
        const baseData = {
            id: presenterId,
            name: presenterObj ? presenterObj.name : presenterId,
            category: category
        };
        await setDoc(docRef, baseData, { merge: true });
        await updateDoc(docRef, scoreUpdatePayload);

        appState.setSaveStatus('saved');
        
        if (saveStatusResetTimeout) clearTimeout(saveStatusResetTimeout);
        saveStatusResetTimeout = setTimeout(() => {
            if (appState.saveStatus === 'saved') {
                appState.setSaveStatus('idle');
            }
        }, 3000);
    } catch (error) {
        console.error("Error updating score: ", error);
        appState.setSaveStatus('error');
        throw error;
    }
}

/**
 * 발표자별 심사평 코멘트 비동기 업데이트
 */
export async function updateComment(presenterId, commentText) {
    if (!appState.loginId) return;
    appState.setSaveStatus('saving');

    const db = getDb();
    const docRef = doc(db, `/artifacts/${appId}/public/data/scores/${presenterId}`);
    
    const commentUpdatePayload = {
        [`comments.${appState.loginId}`]: commentText.trim()
    };

    try {
        await updateDoc(docRef, commentUpdatePayload);
        appState.setSaveStatus('saved');
        if (saveStatusResetTimeout) clearTimeout(saveStatusResetTimeout);
        saveStatusResetTimeout = setTimeout(() => {
            if (appState.saveStatus === 'saved') appState.setSaveStatus('idle');
        }, 3000);
    } catch (error) {
        console.error("Error updating comment: ", error);
        appState.setSaveStatus('error');
    }
}

/**
 * 부문별 평가 최종 제출
 */
export async function submitCategory(categoryKey) {
    if (!appState.loginId) return;
    const db = getDb();
    const submissionDocRef = doc(db, `/artifacts/${appId}/public/data/submissions`, appState.loginId);
    
    await setDoc(submissionDocRef, { 
        [categoryKey]: true,
        evaluatorName: appState.loginId
    }, { merge: true });
}

/**
 * 우수 발표자 투표 저장
 */
export async function saveExcellentSelection(category, presenterName) {
    if (!appState.loginId) return;
    const db = getDb();
    const docRef = doc(db, `/artifacts/${appId}/public/data/excellent_presenter_selections`, appState.loginId);
    const payload = {
        [`selections.${category}`]: presenterName
    };
    
    await setDoc(docRef, { evaluatorName: appState.loginId }, { merge: true });
    await updateDoc(docRef, payload);
}

/**
 * 우수 발표자 최종 제출
 */
export async function submitExcellentSelections() {
    if (!appState.loginId) return;
    const db = getDb();
    const docRef = doc(db, `/artifacts/${appId}/public/data/excellent_presenter_selections`, appState.loginId);
    await updateDoc(docRef, { submitted: true });
}

/**
 * 투표자 세션 일괄 해제 (관리자용)
 */
export async function resetVoterSessions() {
    const db = getDb();
    const sessionsCollectionRef = collection(db, `/artifacts/${appId}/public/data/voter_sessions`);
    const snapshot = await getDocs(sessionsCollectionRef);
    const batch = writeBatch(db);
    snapshot.forEach(docSnap => {
        batch.delete(docSnap.ref);
    });
    await batch.commit();
}

/**
 * 시뮬레이션 가상 데이터 생성
 */
export async function runSimulation() {
    const db = getDb();
    const simulatedEvaluatorIds = Array.from({ length: 15 }, () => `sim-evaluator-${generateUUID()}`);
    const scorePromises = [];
    const submissionPromises = [];

    const mockComments = [
        "논리적 전개와 개선 효과가 명확함.",
        "데이터 기반의 분석 접근이 매우 우수함.",
        "현장 적용성과 완성도가 돋보임.",
        "향후 타 부서로의 확산 가능성이 큼."
    ];

    for (const userId of simulatedEvaluatorIds) {
        for (const category in appState.presenters) {
            for (const presenter of appState.presenters[category]) {
                const criteriaList = appState.evaluationCriteria[category] || [];
                for (const criterion of criteriaList) {
                    const randomScore = Math.floor(Math.random() * (criterion.max * 0.8) + (criterion.max * 0.2));
                    const docRef = doc(db, `/artifacts/${appId}/public/data/scores/${presenter.id}`);
                    
                    const baseData = {
                        id: presenter.id,
                        name: presenter.name,
                        category: category
                    };
                    const payload = {
                        [`scores.${userId}.${criterion.key}`]: randomScore,
                        [`comments.${userId}`]: mockComments[Math.floor(Math.random() * mockComments.length)]
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
