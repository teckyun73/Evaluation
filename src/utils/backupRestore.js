/**
 * backupRestore.js
 * Firestore 전체 데이터베이스 JSON 스냅샷 백업 및 안전 복원 모듈
 * (연도별 데이터베이스 네임스페이스 지원)
 */

import { getDb, collection, getDocs, doc, setDoc, writeBatch, getAppId } from '../config/firebase.js';
import { appState } from '../state/appState.js';
import { showMessage } from '../ui/modal.js';

export async function exportFullDatabaseToJSON() {
    const db = getDb();
    const targetAppId = getAppId(appState.currentYear);
    const collectionsToBackup = ['scores', 'excellent_presenter_selections', 'submissions', 'config'];
    const backupData = {
        version: "2026.2",
        year: appState.currentYear,
        exportedAt: new Date().toISOString(),
        appId: targetAppId,
        data: {}
    };

    try {
        for (const colName of collectionsToBackup) {
            backupData.data[colName] = {};
            const colRef = collection(db, `/artifacts/${targetAppId}/public/data/${colName}`);
            const snapshot = await getDocs(colRef);
            snapshot.forEach(docSnap => {
                backupData.data[colName][docSnap.id] = docSnap.data();
            });
        }

        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `evaluation_backup_${appState.currentYear}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
        link.click();
        URL.revokeObjectURL(url);

        showMessage(`[${appState.currentYear}년] 전체 데이터베이스가 성공적으로 JSON 파일로 백업되었습니다.`);
    } catch (error) {
        console.error("Backup error:", error);
        showMessage("백업 중 오류가 발생했습니다: " + error.message);
    }
}

export async function importDatabaseFromJSON(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const backupData = JSON.parse(e.target.result);
            if (!backupData || !backupData.data) {
                throw new Error("올바른 백업 JSON 파일 형식이 아닙니다.");
            }

            const backupYear = backupData.year || '알 수 없음';
            showMessage(`백업 시점(${backupData.exportedAt || '알 수 없음'}, 연도: ${backupYear})의 데이터로 현재 [${appState.currentYear}년] 데이터베이스를 복원하시겠습니까? 현재 데이터가 덮어씌워집니다.`, true, async () => {
                const db = getDb();
                const targetAppId = getAppId(appState.currentYear);
                const collections = Object.keys(backupData.data);

                for (const colName of collections) {
                    const docsObj = backupData.data[colName];
                    const batchList = [];
                    let currentBatch = writeBatch(db);
                    let opCount = 0;

                    for (const docId of Object.keys(docsObj)) {
                        const docRef = doc(db, `/artifacts/${targetAppId}/public/data/${colName}`, docId);
                        currentBatch.set(docRef, docsObj[docId], { merge: true });
                        opCount++;
                        if (opCount >= 400) {
                            batchList.push(currentBatch.commit());
                            currentBatch = writeBatch(db);
                            opCount = 0;
                        }
                    }

                    if (opCount > 0) {
                        batchList.push(currentBatch.commit());
                    }

                    await Promise.all(batchList);
                }

                showMessage(`[${appState.currentYear}년] 데이터베이스 복원이 성공적으로 완료되었습니다.`);
            });
        } catch (error) {
            console.error("Restore error:", error);
            showMessage("복원 중 오류가 발생했습니다: " + error.message);
        }
    };
    reader.readAsText(file);
}
