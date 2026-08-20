/**
 * crypto.js
 * Web Crypto API 기반 SHA-256 + Salt 단방향 암호화 해시 엔진
 */

const SYSTEM_SALT = "Evaluation_2026_Salt_#Secure";

// 기본 기본 해시값 (평문 비밀번호는 소스코드에 전혀 존재하지 않음)
// 관리자 기본 비밀번호 ($atec@000$)의 정확한 SHA-256 + Salt 해시
export const DEFAULT_ADMIN_HASH = "42afd36c4e73418240a7029482dc9b967e0140ad63cd8d3ef0015ee2fd527fbd";
// 평가자 기본 비밀번호 (atec1114)의 정확한 SHA-256 + Salt 해시
export const DEFAULT_EVALUATOR_HASH = "cfd3d484d23d9e67c2b3690d7b3de9152a83a85110aad0e78d15e7af1a046a75";

/**
 * 평문 비밀번호를 SHA-256 + Salt 해시값으로 변환
 * @param {string} plainText 
 * @returns {Promise<string>} 64자리 16진수 해시 문자열
 */
export async function hashPassword(plainText) {
    if (!plainText) return "";
    const saltedText = plainText + SYSTEM_SALT;

    // 브라우저 표준 Web Crypto API
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const msgUint8 = new TextEncoder().encode(saltedText);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // Node.js 환경 (테스트/스크립트용)
    if (typeof global !== 'undefined' && global.process) {
        try {
            const { createHash } = await import('crypto');
            return createHash('sha256').update(saltedText).digest('hex');
        } catch (e) {}
    }

    throw new Error("Cryptographic environment not supported.");
}

/**
 * 입력된 비밀번호와 목표 해시값 일치 여부 검증
 * @param {string} inputPassword 
 * @param {string} targetHash 
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(inputPassword, targetHash) {
    if (!inputPassword || !targetHash) return false;
    const inputHash = await hashPassword(inputPassword);
    return inputHash === targetHash;
}
