/**
 * ceremony.js
 * 시상식 전용 별도 창(Stand-alone Award Ceremony Window) 진입점 및 실시간 제어 동기화 모듈
 */

import { initializeFirebaseOnce } from './config/firebase.js';
import { appState } from './state/appState.js';
import { 
    setupConfigListener, 
    setupRealtimeScoresListener, 
    setupExcellentPresenterListener 
} from './services/firestoreService.js';
import { 
    renderAwardCeremony, 
    handleNextReveal, 
    handleResetCeremony, 
    updateCeremonyCards,
    broadcastCeremonyAction
} from './ui/renderers/awardCeremony.js';
import { soundEngine } from './utils/soundEffects.js';

function renderStandaloneCeremony() {
    const root = document.getElementById('ceremony-standalone-root');
    if (!root) return;

    root.innerHTML = renderAwardCeremony();
    
    // 별도 창에서는 '별도 창으로 열기' 버튼 숨김 처리
    const popoutBtn = root.querySelector('#open-ceremony-window-btn');
    if (popoutBtn) {
        popoutBtn.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Firebase 초기화 완료 대기
    try {
        await initializeFirebaseOnce();
    } catch (e) {
        console.error("Firebase init error in ceremony window:", e);
    }

    // 2. 실시간 Firestore 리스너 구독
    setupConfigListener(() => {
        renderStandaloneCeremony();
    });

    setupRealtimeScoresListener(() => {
        const root = document.getElementById('ceremony-standalone-root');
        if (root && root.querySelector('#award-ceremony-container')) {
            updateCeremonyCards();
        } else {
            renderStandaloneCeremony();
        }
    });

    setupExcellentPresenterListener(() => {
        const root = document.getElementById('ceremony-standalone-root');
        if (root && root.querySelector('#award-ceremony-container')) {
            updateCeremonyCards();
        } else {
            renderStandaloneCeremony();
        }
    });

    // 3. 화면 초기 렌더링
    renderStandaloneCeremony();

    // 4. 메인 창 원격 제어 수신 리스너 (BroadcastChannel)
    if (typeof BroadcastChannel !== 'undefined') {
        const syncChannel = new BroadcastChannel('ceremony_sync_channel');
        syncChannel.onmessage = (event) => {
            const { action, payload } = event.data || {};
            if (action === 'NEXT_REVEAL') {
                handleNextReveal(true);
            } else if (action === 'RESET') {
                handleResetCeremony(true);
            } else if (action === 'SET_CATEGORY') {
                if (payload && payload.category) {
                    appState.setPresentationCategory(payload.category);
                    handleResetCeremony(true);
                    renderStandaloneCeremony();
                }
            }
        };
    }

    // 5. 별도 창 내부 클릭 이벤트 핸들러
    document.addEventListener('click', async (e) => {
        // 다음 순위 공개 버튼
        if (e.target.closest('#next-reveal-btn')) {
            handleNextReveal();
        }

        // 다시 진행 버튼
        if (e.target.closest('#reset-ceremony-btn')) {
            handleResetCeremony();
        }

        // 사운드 효과음 토글 버튼
        const soundBtn = e.target.closest('#toggle-ceremony-sound-btn');
        if (soundBtn) {
            const isMuted = await soundEngine.toggleMute();
            soundBtn.className = `text-xs md:text-sm font-semibold px-3.5 py-2 ${isMuted ? 'bg-slate-300 text-slate-600' : 'bg-emerald-600 text-white'} rounded-lg transition shadow flex items-center gap-1`;
            soundBtn.innerHTML = `<span>${isMuted ? '🔇 음소거' : '🔊 효과음 ON'}</span>`;
        }

        // 전체화면 토글 버튼
        if (e.target.closest('#toggle-ceremony-fullscreen-btn')) {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error("Fullscreen error:", err);
                });
            } else {
                document.exitFullscreen();
            }
        }
    });

    // 부문 변경 이벤트
    document.addEventListener('change', (e) => {
        if (e.target.id === 'ceremony-category-select') {
            appState.setPresentationCategory(e.target.value);
            broadcastCeremonyAction('SET_CATEGORY', { category: e.target.value });
            handleResetCeremony();
            renderStandaloneCeremony();
        }
    });
});
