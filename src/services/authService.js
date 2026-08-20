/**
 * authService.js
 * SHA-256 단방향 암호화 해시 및 성명/이메일 기반 안전 사용자 인증 모듈
 */

import { getDb, doc, getDoc, setDoc, deleteDoc, serverTimestamp, initializeFirebaseOnce, appId } from '../config/firebase.js';
import { appState } from '../state/appState.js';
import { verifyPassword, DEFAULT_ADMIN_HASH, DEFAULT_EVALUATOR_HASH } from '../utils/crypto.js';

// 세션 만료 시간 (30분 = 1800000 ms)
const SESSION_EXPIRATION_MS = 30 * 60 * 1000;

/**
 * Firestore에서 원격 저장된 암호화 자격증명 해시 조회
 */
async function getRemoteCredentials(db) {
    try {
        const authDocRef = doc(db, `/artifacts/${appId}/public/data/auth_config`, 'credentials');
        const snap = await getDoc(authDocRef);
        if (snap.exists()) {
            return snap.data();
        }
    } catch (e) {
        console.warn("Could not fetch remote credentials, using secure defaults:", e);
    }
    return null;
}

export async function login(role, id, password) {
    const trimmedId = id.trim();
    const trimmedPw = password.trim();
    
    // Firebase 초기화 확인
    await initializeFirebaseOnce();
    const db = getDb();
    const remoteCreds = await getRemoteCredentials(db);

    // 1. 심사위원(평가자) 인증 (성명 + 공통 비밀번호)
    if (role === 'evaluator') {
        if (!trimmedId || trimmedId.length < 2) {
            throw new Error('성명을 2자 이상 정확히 입력해 주세요.');
        }
        
        const targetHash = remoteCreds?.evaluatorPasswordHash || DEFAULT_EVALUATOR_HASH;
        const isValid = await verifyPassword(trimmedPw, targetHash);
        
        if (!isValid) {
            throw new Error('평가자 비밀번호가 일치하지 않습니다.');
        }

        appState.setLogin(trimmedId, 'evaluator');
        return { role: 'evaluator', id: trimmedId };
    } 
    
    // 2. 임직원(투표자) 인증 (ID: 성명, 비밀번호: 이메일)
    if (role === 'voter') {
        const voterName = trimmedId;
        const voterEmail = trimmedPw.toLowerCase();

        if (!voterName || voterName.length < 2) {
            throw new Error('성명을 2자 이상 입력해 주세요.');
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(voterEmail)) {
            throw new Error('비밀번호 칸에 올바른 이메일 주소를 입력해 주세요. (예: user@atec.co.kr)');
        }

        // 이메일 기반 고유 세션 ID 생성
        const safeSessionKey = voterEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
        const sessionDocRef = doc(db, `/artifacts/${appId}/public/data/voter_sessions`, safeSessionKey);
        const docSnap = await getDoc(sessionDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const lastActiveTime = data.lastActive ? data.lastActive.toMillis() : (data.loginTime ? data.loginTime.toMillis() : null);
            const now = Date.now();

            // 30분이 지나지 않은 유효한 활성 세션인 경우 로그인 차단
            if (lastActiveTime && (now - lastActiveTime < SESSION_EXPIRATION_MS)) {
                throw new Error(`이미 다른 기기 또는 브라우저에서 로그인 중인 이메일(${voterEmail})입니다. (30분 후 자동 만료되거나 관리자가 세션을 해제할 수 있습니다.)`);
            }
        }

        // 새 세션 생성 (또는 만료된 세션 갱신)
        await setDoc(sessionDocRef, { 
            active: true, 
            voterName: voterName,
            email: voterEmail,
            loginTime: serverTimestamp(), 
            lastActive: serverTimestamp(),
            role: 'voter' 
        });

        // 투표자 성명으로 로그인 상태 설정 (이메일 정보 포함)
        appState.setLogin(voterName, 'voter');
        appState.voterEmail = voterEmail;
        return { role: 'voter', id: voterName, email: voterEmail };
    } 
    
    // 3. 관리자 인증 (단방향 해시 암호화 검증)
    if (role === 'admin') {
        if (trimmedId !== 'admin') {
            throw new Error('관리자 아이디가 일치하지 않습니다.');
        }

        const targetAdminHash = remoteCreds?.adminPasswordHash || DEFAULT_ADMIN_HASH;
        const isValid = await verifyPassword(trimmedPw, targetAdminHash);

        if (!isValid) {
            throw new Error('관리자 비밀번호가 일치하지 않습니다.');
        }

        appState.setLogin('admin', 'admin');
        return { role: 'admin', id: 'admin' };
    }

    throw new Error('올바르지 않은 역할입니다.');
}

export async function logout() {
    const db = getDb();
    if (db && appState.currentUserRole === 'voter' && appState.voterEmail) {
        const safeSessionKey = appState.voterEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
        const sessionDocRef = doc(db, `/artifacts/${appId}/public/data/voter_sessions`, safeSessionKey);
        try {
            await deleteDoc(sessionDocRef);
        } catch (error) {
            console.error("Error removing session on logout:", error);
        }
    }
    window.location.reload();
}
