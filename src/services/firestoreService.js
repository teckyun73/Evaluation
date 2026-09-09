/**
 * firestoreService.js
 * Firestore 실시간 리스너 구독, 점수/투표/설정 CRUD 및 배치 시뮬레이션 서비스
 * (연도별 독립 네임스페이스 및 실시간 전환 지원)
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
    getAppId 
} from '../config/firebase.js';
import { appState } from '../state/appState.js';
import { generateUUID } from '../utils/helpers.js';
import { hashPassword } from '../utils/crypto.js';

/**
 * 현재 활성 연도에 따른 Firestore appId(네임스페이스) 반환
 */
export function getTargetAppId() {
    return getAppId(appState.currentYear);
}

// 활성 실시간 리스너 목록 (연도 전환 시 일괄 해제)
let activeUnsubscribes = [];

export function cleanupAllListeners() {
    activeUnsubscribes.forEach(unsub => {
        if (typeof unsub === 'function') {
            try { unsub(); } catch (e) { console.warn("Unsubscribe error:", e); }
        }
    });
    activeUnsubscribes = [];
}

/**
 * 연도 전환 (이전 리스너 해제 -> 연도 변경 -> 새 연도 리스너 재구독)
 */
export function switchYear(newYear, onUpdateCallback) {
    cleanupAllListeners();
    appState.setYear(newYear);

    const unsubConfig = setupConfigListener(() => { if (onUpdateCallback) onUpdateCallback(); });
    const unsubScores = setupRealtimeScoresListener(() => { if (onUpdateCallback) onUpdateCallback(); });
    const unsubVotes = setupExcellentPresenterListener(() => { if (onUpdateCallback) onUpdateCallback(); });
    const unsubSubs = setupAllSubmissionsListener(() => { if (onUpdateCallback) onUpdateCallback(); });

    activeUnsubscribes.push(unsubConfig, unsubScores, unsubVotes, unsubSubs);

    if (appState.loginId && appState.currentUserRole === 'evaluator') {
        const unsubMySub = setupSubmissionListener(appState.loginId, () => { if (onUpdateCallback) onUpdateCallback(); });
        activeUnsubscribes.push(unsubMySub);
    }

    if (onUpdateCallback) onUpdateCallback();
}

/**
 * 대회 동적 설정(발표자, 배점기준, 메타데이터) 실시간 리스너
 */
export function setupConfigListener(callback) {
    const db = getDb();
    const configDocRef = doc(db, `/artifacts/${getTargetAppId()}/public/data/config`, 'default-config');

    const unsub = onSnapshot(configDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const remoteConfig = docSnap.data();
            appState.applyRemoteConfig(remoteConfig);
            if (callback) callback(remoteConfig);
        } else {
            if (callback) callback(null);
        }
    }, (error) => {
        console.error("Config listener error:", error);
    });

    activeUnsubscribes.push(unsub);
    return unsub;
}

/**
 * 대회 동적 설정을 Firestore에 영구 저장
 */
export async function saveRemoteConfig(configData) {
    const db = getDb();
    const configDocRef = doc(db, `/artifacts/${getTargetAppId()}/public/data/config`, 'default-config');
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
    const authDocRef = doc(db, `/artifacts/${getTargetAppId()}/public/data/auth_config`, 'credentials');

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
    const scoresCollectionRef = collection(db, `/artifacts/${getTargetAppId()}/public/data/scores`);

    const unsub = onSnapshot(scoresCollectionRef, (snapshot) => {
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

    activeUnsubscribes.push(unsub);
    return unsub;
}

/**
 * 특정 평가자의 부문별 제출 상태 리스너
 */
export function setupSubmissionListener(evaluatorId, callback) {
    const db = getDb();
    const docRef = doc(db, `/artifacts/${getTargetAppId()}/public/data/submissions`, evaluatorId);

    const unsub = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            appState.setSubmissions(docSnap.data());
        } else {
            appState.setSubmissions({});
        }
        if (callback) callback();
    }, (error) => {
        console.error("Submission listener error:", error);
    });

    activeUnsubscribes.push(unsub);
    return unsub;
}

/**
 * 관리자용 전체 평가자 제출 상태 리스너
 */
export function setupAllSubmissionsListener(callback) {
    const db = getDb();
    const colRef = collection(db, `/artifacts/${getTargetAppId()}/public/data/submissions`);

    const unsub = onSnapshot(colRef, (snapshot) => {
        const allSubs = {};
        snapshot.forEach(docSnap => {
            allSubs[docSnap.id] = docSnap.data();
        });
        appState.setAllSubmissions(allSubs);
        if (callback) callback(allSubs);
    }, (error) => {
        console.error("All submissions listener error:", error);
    });

    activeUnsubscribes.push(unsub);
    return unsub;
}

/**
 * 우수 발표자 투표 실시간 리스너
 */
export function setupExcellentPresenterListener(callback) {
    const db = getDb();
    const selectionsCollectionRef = collection(db, `/artifacts/${getTargetAppId()}/public/data/excellent_presenter_selections`);

    const unsub = onSnapshot(selectionsCollectionRef, (snapshot) => {
        const selections = {};
        snapshot.forEach(docSnap => {
            selections[docSnap.id] = docSnap.data();
        });
        appState.setExcellentPresenterSelections(selections);
        if (callback) callback(selections);
    }, (error) => {
        console.error("Excellent presenter listener error:", error);
    });

    activeUnsubscribes.push(unsub);
    return unsub;
}

/**
 * 점수 업데이트
 */
export async function updateScore(presenterId, criterionKey, value) {
    if (!appState.loginId) return;

    appState.setSaveStatus('SAVING');
    const db = getDb();
    const docRef = doc(db, `/artifacts/${getTargetAppId()}/public/data/scores`, presenterId);

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
    const docRef = doc(db, `/artifacts/${getTargetAppId()}/public/data/scores`, presenterId);

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
    const docRef = doc(db, `/artifacts/${getTargetAppId()}/public/data/submissions`, appState.loginId);

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
    const docRef = doc(db, `/artifacts/${getTargetAppId()}/public/data/excellent_presenter_selections`, appState.loginId);

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
    const docRef = doc(db, `/artifacts/${getTargetAppId()}/public/data/excellent_presenter_selections`, appState.loginId);

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
    const sessionCollectionRef = collection(db, `/artifacts/${getTargetAppId()}/public/data/voter_sessions`);
    const snapshot = await getDocs(sessionCollectionRef);
    const batch = writeBatch(db);

    snapshot.forEach(docSnap => {
        batch.delete(docSnap.ref);
    });

    await batch.commit();
}

/**
 * 가상 평가 및 투표 시뮬레이션 (고속 writeBatch 청크 엔진)
 */
export async function runSimulation() {
    const db = getDb();
    const batchList = [];
    let currentBatch = writeBatch(db);
    let opCount = 0;

    function addOp(opFn) {
        opFn(currentBatch);
        opCount++;
        if (opCount >= 400) { // Firestore batch 최대 500개 한도 안전 분할
            batchList.push(currentBatch.commit());
            currentBatch = writeBatch(db);
            opCount = 0;
        }
    }

    // 1. 가상 평가자 6명의 점수 생성
    const simulatedEvaluators = Array.from({ length: 6 }, () => `sim-evaluator-${generateUUID().substring(0, 8)}`);

    for (const presenterCat in appState.presenters) {
        const catPresenters = appState.presenters[presenterCat];
        const criteria = appState.evaluationCriteria[presenterCat] || [];

        for (const presenter of catPresenters) {
            const docRef = doc(db, `/artifacts/${getTargetAppId()}/public/data/scores`, presenter.id);
            const existingScores = appState.allScores[presenter.id]?.scores || {};
            const simScores = { ...existingScores };

            simulatedEvaluators.forEach(evalId => {
                const evalScores = {};
                criteria.forEach(c => {
                    const max = parseInt(c.max, 10) || 20;
                    // 현실적인 70~100% 점수 분포
                    evalScores[c.key] = Math.floor(Math.random() * (max * 0.3)) + Math.floor(max * 0.7);
                });
                simScores[evalId] = evalScores;
            });

            addOp(b => b.set(docRef, { 
                presenterId: presenter.id, 
                scores: simScores, 
                updatedAt: serverTimestamp() 
            }, { merge: true }));
        }
    }

    // 2. 가상 평가자 부문별 제출 상태 생성
    for (const evalId of simulatedEvaluators) {
        const subDocRef = doc(db, `/artifacts/${getTargetAppId()}/public/data/submissions`, evalId);
        const subData = { 
            evaluatorName: evalId,
            updatedAt: serverTimestamp()
        };
        Object.keys(appState.presenters).forEach(cat => {
            subData[cat] = true;
        });
        addOp(b => b.set(subDocRef, subData, { merge: true }));
    }

    // 3. 가상 투표자 투표 데이터 생성 (설정된 TOTAL_VOTERS 기준)
    const totalVoters = appState.eventInfo?.TOTAL_VOTERS || 200;
    for (let i = 0; i < totalVoters; i++) {
        const voterId = `sim-voter-${(i + 1).toString().padStart(4, '0')}`;
        const docRef = doc(db, `/artifacts/${getTargetAppId()}/public/data/excellent_presenter_selections`, voterId);
        const selections = {};

        for (const category in appState.presenters) {
            const catPresenters = appState.presenters[category];
            if (catPresenters.length > 0) {
                const randomIdx = Math.floor(Math.random() * catPresenters.length);
                selections[category] = catPresenters[randomIdx].name;
            }
        }

        addOp(b => b.set(docRef, {
            evaluatorName: voterId,
            selections,
            submitted: true,
            updatedAt: serverTimestamp()
        }, { merge: true }));
    }

    if (opCount > 0) {
        batchList.push(currentBatch.commit());
    }

    await Promise.all(batchList);
}

/**
 * 시뮬레이션 데이터 초기화 (청크 분할 배치)
 */
export async function resetSimulationData() {
    const db = getDb();
    const batchList = [];
    let currentBatch = writeBatch(db);
    let opCount = 0;

    function addOp(opFn) {
        opFn(currentBatch);
        opCount++;
        if (opCount >= 400) {
            batchList.push(currentBatch.commit());
            currentBatch = writeBatch(db);
            opCount = 0;
        }
    }

    const scoresCollectionRef = collection(db, `/artifacts/${getTargetAppId()}/public/data/scores`);
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
                addOp(b => b.update(docSnap.ref, updates));
            }
        }
    });

    const selectionsCollectionRef = collection(db, `/artifacts/${getTargetAppId()}/public/data/excellent_presenter_selections`);
    const selectionsSnapshot = await getDocs(selectionsCollectionRef);
    
    selectionsSnapshot.forEach(docSnap => {
        if (docSnap.id.startsWith('sim-voter-')) {
            addOp(b => b.delete(docSnap.ref));
        }
    });

    const submissionsCollectionRef = collection(db, `/artifacts/${getTargetAppId()}/public/data/submissions`);
    const submissionsSnapshot = await getDocs(submissionsCollectionRef);
    submissionsSnapshot.forEach(docSnap => {
        if (docSnap.id.startsWith('sim-evaluator-')) {
            addOp(b => b.delete(docSnap.ref));
        }
    });

    if (opCount > 0) {
        batchList.push(currentBatch.commit());
    }

    await Promise.all(batchList);
}

/**
 * 전체 데이터 초기화 (청크 분할 배치)
 */
export async function resetAllData() {
    const db = getDb();
    const collectionsToDelete = ['scores', 'excellent_presenter_selections', 'submissions', 'voter_sessions', 'evaluator_sessions'];
    const batchList = [];
    let currentBatch = writeBatch(db);
    let opCount = 0;

    function addOp(opFn) {
        opFn(currentBatch);
        opCount++;
        if (opCount >= 400) {
            batchList.push(currentBatch.commit());
            currentBatch = writeBatch(db);
            opCount = 0;
        }
    }

    for (const collectionName of collectionsToDelete) {
        const collectionRef = collection(db, `/artifacts/${getTargetAppId()}/public/data/${collectionName}`);
        const snapshot = await getDocs(collectionRef);
        snapshot.forEach(d => {
            addOp(b => b.delete(d.ref));
        });
    }

    if (opCount > 0) {
        batchList.push(currentBatch.commit());
    }

    await Promise.all(batchList);
}
