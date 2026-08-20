/**
 * backupRestore.js
 * Firestore 전체 데이터베이스 JSON 스냅샷 백업 및 안전 복원 모듈
 */

import { getDb, collection, getDocs, doc, setDoc, writeBatch, appId } from '../config/firebase.js';
import { showMessage } from '../ui/modal.js';

export async function exportFullDatabaseToJSON() {
    const db = getDb();
    const collectionsToBackup = ['scores', 'excellent_presenter_selections', 'submissions', 'config'];
    const backupData = {
        version: "2026.1",
        exportedAt: new Date().toISOString(),
        appId: appId,
        data: {}
    };

    try {
        for (const colName of collectionsToBackup) {
            backupData.data[colName] = {};
            const colRef = collection(db, `/artifacts/${appId}/public/data/${colName}`);
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
        link.download = `evaluation_backup_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
        link.click();
        URL.revokeObjectURL(url);

        showMessage("전체 데이터베이스가 성공적으로 JSON 파일로 백업되었습니다.");
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

            showMessage(`백업 시점(${backupData.exportedAt || '알 수 없음'})의 데이터로 복원하시겠습니까? 현재 데이터가 덮어씌워집니다.`, true, async () => {
                const db = getDb();
                const collections = Object.keys(backupData.data);

                for (const colName of collections) {
                    const docs = backupData.data[colName];
                    const batch = writeBatch(db);
                    for (const docId of Object.keys(docs)) {
                        const docRef = doc(db, `/artifacts/${appId}/public/data/${colName}`, docId);
                        batch.set(docRef, docs[docId], { merge: true });
                    }
                    await batch.commit();
                }

                showMessage("데이터가 성공적으로 복원되었습니다. 화면을 새로고침합니다.", false);
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            });
        } catch (error) {
            console.error("Restore error:", error);
            showMessage("복원 중 오류가 발생했습니다: " + error.message);
        }
    };
    reader.readAsText(file);
}
