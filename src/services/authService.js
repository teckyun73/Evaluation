/**
 * authService.js
 * 사용자 인증, 역할 검증 및 세션 만료 제어 모듈
 */

import { getDb, doc, getDoc, setDoc, deleteDoc, serverTimestamp, initializeFirebaseOnce, appId } from '../config/firebase.js';
import { appState } from '../state/appState.js';

// 세션 만료 시간 (30분 = 1800000 ms)
const SESSION_EXPIRATION_MS = 30 * 60 * 1000;

export async function login(role, id, password) {
    const trimmedId = id.trim();
    
    // Firebase 초기화 확인
    await initializeFirebaseOnce();
    const db = getDb();

    if (role === 'evaluator') {
        if (!trimmedId) {
            throw new Error('성명을 입력해 주세요.');
        }
        if (password !== 'atec1114') {
            throw new Error('비밀번호가 일치하지 않습니다.');
        }
        appState.setLogin(trimmedId, 'evaluator');
        return { role: 'evaluator', id: trimmedId };
    } 
    
    if (role === 'voter') {
        const voterIdRegex = /^atec(00[1-9]|0[1-9]\d|1\d\d|200)$/;
        if (!voterIdRegex.test(trimmedId)) {
            throw new Error('아이디 형식이 올바르지 않습니다. (예: atec001)');
        }
        if (trimmedId !== password) {
            throw new Error('아이디와 비밀번호가 일치하지 않습니다.');
        }

        const sessionDocRef = doc(db, `/artifacts/${appId}/public/data/voter_sessions`, trimmedId);
        const docSnap = await getDoc(sessionDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const lastActiveTime = data.lastActive ? data.lastActive.toMillis() : (data.loginTime ? data.loginTime.toMillis() : null);
            const now = Date.now();

            // 30분이 지나지 않은 유효한 활성 세션인 경우 로그인 차단
            if (lastActiveTime && (now - lastActiveTime < SESSION_EXPIRATION_MS)) {
                throw new Error('이미 다른 브라우저에서 로그인 중인 아이디입니다. (이전 세션이 30분 후 자동 만료되거나 관리자가 세션을 해제할 수 있습니다.)');
            }
        }

        // 새 세션 생성 (또는 만료된 세션 갱신)
        await setDoc(sessionDocRef, { 
            active: true, 
            loginTime: serverTimestamp(), 
            lastActive: serverTimestamp(),
            role: 'voter' 
        });

        appState.setLogin(trimmedId, 'voter');
        return { role: 'voter', id: trimmedId };
    } 
    
    if (role === 'admin') {
        if (trimmedId !== 'admin' || password !== '$atec@000$') {
            throw new Error('관리자 아이디 또는 비밀번호가 일치하지 않습니다.');
        }
        appState.setLogin('admin', 'admin');
        return { role: 'admin', id: 'admin' };
    }

    throw new Error('올바르지 않은 역할입니다.');
}

export async function logout() {
    const db = getDb();
    if (db && appState.loginId && appState.currentUserRole === 'voter') {
        const sessionDocRef = doc(db, `/artifacts/${appId}/public/data/voter_sessions`, appState.loginId);
        try {
            await deleteDoc(sessionDocRef);
        } catch (error) {
            console.error("Error removing session on logout:", error);
        }
    }
    window.location.reload();
}
