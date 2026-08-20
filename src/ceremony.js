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

async function initCeremony() {
    // 1. 부모 창(window.opener)이 열려 있는 경우 메모리 상태 즉시 복제 (0초 즉시 렌더링)
    try {
        if (window.opener && window.opener.appState) {
            const parentState = window.opener.appState;
            if (parentState.presenters) appState.presenters = JSON.parse(JSON.stringify(parentState.presenters));
            if (parentState.evaluationCriteria) appState.evaluationCriteria = JSON.parse(JSON.stringify(parentState.evaluationCriteria));
            if (parentState.allScores) appState.allScores = JSON.parse(JSON.stringify(parentState.allScores));
            if (parentState.excellentPresenterSelections) appState.excellentPresenterSelections = JSON.parse(JSON.stringify(parentState.excellentPresenterSelections));
            if (parentState.selectedPresentationCategory) appState.selectedPresentationCategory = parentState.selectedPresentationCategory;
        }
    } catch (e) {
        console.warn("Could not copy parent state:", e);
    }

    // 2. 즉시 1차 렌더링 실행
    renderStandaloneCeremony();

    // 3. Firebase 초기화 및 실시간 Firestore 리스너 연결
    try {
        await initializeFirebaseOnce();
        
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
    } catch (err) {
        console.error("Firebase init/sync error in ceremony window:", err);
    }

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
            const ceremonyContainer = document.getElementById('award-ceremony-container') || document.getElementById('ceremony-standalone-root');
            if (ceremonyContainer) {
                if (!document.fullscreenElement) {
                    ceremonyContainer.requestFullscreen().catch(err => {
                        console.error("Fullscreen error:", err);
                    });
                } else {
                    document.exitFullscreen();
                }
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
}

// DOM 상태에 상관없이 즉시 초기화 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCeremony);
} else {
    initCeremony();
}
