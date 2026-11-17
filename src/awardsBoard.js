/**
 * awardsBoard.js
 * 관리자 '최종 결과'의 부문별 훈격 요약 보드 전용 별도 창(세션) 컨트롤러
 */

import { initializeFirebaseOnce } from './config/firebase.js';
import { appState } from './state/appState.js?v=20261117_v5';
import { calculateResults } from './utils/calculator.js?v=20261117_v5';
import { exportAwardsBoardToPNG } from './utils/exportAwardsPng.js';
import {
    setupConfigListener,
    setupRealtimeScoresListener,
    setupExcellentPresenterListener
} from './services/firestoreService.js?v=20261117_v5';
import { renderFinalAwardsBoardCardsHTML } from './ui/renderers/finalResults.js?v=20261117_v5';

function syncHeaderMeta() {
    const year = appState.eventInfo?.YEAR || appState.currentYear || '2026';
    const badgeEl = document.getElementById('board-year-badge');
    const titleEl = document.getElementById('board-title');
    if (badgeEl) badgeEl.textContent = `${year} FINAL AWARDS`;
    if (titleEl) titleEl.textContent = `${year} 경영혁신 경진대회 부문별 최종 훈격 결과`;
}

function getEffectiveFinalData() {
    if (appState.finalResultsData) {
        return appState.finalResultsData;
    }
    const computed = calculateResults(
        appState.presenters,
        appState.evaluationCriteria,
        appState.allScores,
        appState.excellentPresenterSelections
    );
    appState.finalResultsData = JSON.parse(JSON.stringify(computed));
    return appState.finalResultsData;
}

function renderStandaloneBoard() {
    syncHeaderMeta();
    const root = document.getElementById('awards-board-standalone-root');
    if (!root) return;

    const finalData = getEffectiveFinalData();
    root.innerHTML = renderFinalAwardsBoardCardsHTML(finalData, {
        showCategoryPngBtn: true,
        isStandalone: true
    });
}

async function initAwardsBoard() {
    // 1. 부모 창(window.opener)이 존재하면 편집 중인 미저장 상태까지 즉시 복제
    try {
        if (window.opener && window.opener.appState) {
            const parentState = window.opener.appState;
            if (parentState.currentYear) appState.setYear(parentState.currentYear);
            if (parentState.eventInfo) appState.eventInfo = JSON.parse(JSON.stringify(parentState.eventInfo));
            if (parentState.presenters) appState.presenters = JSON.parse(JSON.stringify(parentState.presenters));
            if (parentState.evaluationCriteria) appState.evaluationCriteria = JSON.parse(JSON.stringify(parentState.evaluationCriteria));
            if (parentState.allScores) appState.allScores = JSON.parse(JSON.stringify(parentState.allScores));
            if (parentState.excellentPresenterSelections) appState.excellentPresenterSelections = JSON.parse(JSON.stringify(parentState.excellentPresenterSelections));
            if (parentState.awardOverrides) appState.awardOverrides = JSON.parse(JSON.stringify(parentState.awardOverrides));
            if (parentState.finalResultsData) {
                appState.finalResultsData = JSON.parse(JSON.stringify(parentState.finalResultsData));
            }
            appState.ensureValidCategorySelection();
        }
    } catch (e) {
        console.warn('Could not clone opener appState:', e);
    }

    renderStandaloneBoard();

    // 2. 메인 창과의 실시간 편집 브로드캐스트 수신
    if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('awards_board_sync_channel');
        channel.onmessage = (event) => {
            const { action, payload } = event.data || {};
            if (action === 'FINAL_AWARDS_UPDATED' && payload?.finalResultsData) {
                if (payload.year) appState.currentYear = payload.year;
                if (payload.eventInfo) appState.eventInfo = JSON.parse(JSON.stringify(payload.eventInfo));
                appState.finalResultsData = JSON.parse(JSON.stringify(payload.finalResultsData));
                renderStandaloneBoard();
            }
        };
    }

    // 3. Firebase 실시간 리스너 연결 (직접 새로고침/독립 실행 대응)
    try {
        await initializeFirebaseOnce();
        setupConfigListener(() => {
            appState.resetFinalResultsCache();
            renderStandaloneBoard();
        });
        setupRealtimeScoresListener(() => {
            appState.resetFinalResultsCache();
            renderStandaloneBoard();
        });
        setupExcellentPresenterListener(() => {
            appState.resetFinalResultsCache();
            renderStandaloneBoard();
        });
    } catch (err) {
        console.warn('Firebase sync error in awards board window:', err);
    }

    // 4. 버튼 이벤트 바인딩
    document.getElementById('standalone-download-all-png-btn')?.addEventListener('click', () => {
        exportAwardsBoardToPNG(getEffectiveFinalData());
    });

    document.getElementById('standalone-print-btn')?.addEventListener('click', () => {
        window.print();
    });

    document.getElementById('standalone-fullscreen-btn')?.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    });

    document.addEventListener('click', (e) => {
        const catBtn = e.target.closest('.download-category-awards-png-btn');
        if (catBtn) {
            const category = catBtn.dataset.category;
            exportAwardsBoardToPNG(getEffectiveFinalData(), { category });
        }
    });
}

document.addEventListener('DOMContentLoaded', initAwardsBoard);
