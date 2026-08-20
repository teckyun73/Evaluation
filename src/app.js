/**
 * app.js
 * 메인 애플리케이션 진입점 및 전역 이벤트 컨트롤러
 */

import { CATEGORY_DISPLAY_NAMES } from './config/constants.js';
import { appState } from './state/appState.js';
import { debounce } from './utils/helpers.js';
import { exportToCSV } from './utils/exportCsv.js';
import { handleScoreTableKeyDown } from './utils/keyboardNav.js';
import { exportFullDatabaseToJSON, importDatabaseFromJSON } from './utils/backupRestore.js';
import { soundEngine } from './utils/soundEffects.js';
import { showMessage, initModal } from './ui/modal.js';
import { login, logout } from './services/authService.js';
import { 
    setupConfigListener,
    setupRealtimeScoresListener, 
    setupSubmissionListener, 
    setupAllSubmissionsListener,
    setupExcellentPresenterListener, 
    updateScore, 
    updateComment,
    submitCategory as firestoreSubmitCategory,
    saveExcellentSelection, 
    submitExcellentSelections, 
    resetVoterSessions,
    runSimulation, 
    resetSimulationData, 
    resetAllData 
} from './services/firestoreService.js';

// UI 렌더러 모듈
import { renderEvaluationTable, renderColumnTotals, updateAutosaveBadge } from './ui/renderers/evaluationTable.js';
import { renderAdminDashboard } from './ui/renderers/adminDashboard.js';
import { renderAdminSettings, handleSaveConfig, handleChangePassword } from './ui/renderers/adminSettings.js';
import { renderAwardCeremony, handleNextReveal, handleResetCeremony, updateCeremonyCards } from './ui/renderers/awardCeremony.js';
import { renderRadarAnalysis } from './ui/renderers/radarAnalysis.js';
import { renderResults } from './ui/renderers/results.js';
import { renderPresentationResults } from './ui/renderers/presentationResults.js';
import { renderLiveVoteStatus } from './ui/renderers/liveVoteStatus.js';
import { renderDetailedResults } from './ui/renderers/detailedResults.js';
import { renderVoterDetailedResults } from './ui/renderers/voterDetailedResults.js';
import { renderFinalResults } from './ui/renderers/finalResults.js';
import { renderFinalResultsCharts, downloadChartAsPNG } from './ui/chartManager.js';
import { renderExcellentPresenters } from './ui/renderers/excellentPresenters.js';

// 디바운스된 점수 및 심사평 업데이트 함수
const debouncedUpdateScore = debounce((id, key, value) => {
    updateScore(id, key, value).catch(err => {
        console.error("Score update failed:", err);
    });
}, 400);

const debouncedUpdateComment = debounce((presenterId, text) => {
    updateComment(presenterId, text).catch(err => {
        console.error("Comment update failed:", err);
    });
}, 500);

/**
 * 역할에 따른 UI 탭 및 관리자 버튼 가시성 제어
 */
export function updateUIVisibility() {
    const allTabs = document.querySelectorAll('#tab-buttons button');
    const simBtn = document.getElementById('simulationBtn');
    const exportBtn = document.getElementById('exportBtn');
    const backupJsonBtn = document.getElementById('backupJsonBtn');
    const restoreJsonBtn = document.getElementById('restoreJsonBtn');
    const printBtn = document.getElementById('printBtn');
    const saveLogoutBtn = document.getElementById('save-logout-btn');
    const resetSimBtn = document.getElementById('resetSimBtn');
    const fullResetBtn = document.getElementById('fullResetBtn');
    const adminDashboardSlot = document.getElementById('admin-dashboard-slot');

    [simBtn, exportBtn, backupJsonBtn, restoreJsonBtn, printBtn, saveLogoutBtn, resetSimBtn, fullResetBtn].forEach(btn => {
        if (btn) btn.style.display = 'none';
    });

    if (appState.currentUserRole === 'admin') {
        if (simBtn) simBtn.style.display = 'inline-flex';
        if (exportBtn) exportBtn.style.display = 'inline-flex';
        if (backupJsonBtn) backupJsonBtn.style.display = 'inline-flex';
        if (restoreJsonBtn) restoreJsonBtn.style.display = 'inline-flex';
        if (printBtn) printBtn.style.display = 'inline-flex';
        if (resetSimBtn) resetSimBtn.style.display = 'inline-flex';
        if (fullResetBtn) fullResetBtn.style.display = 'inline-flex';
        if (saveLogoutBtn) saveLogoutBtn.style.display = 'inline-flex';
        allTabs.forEach(tab => tab.style.display = 'inline-flex');

        if (adminDashboardSlot) {
            adminDashboardSlot.innerHTML = renderAdminDashboard();
            adminDashboardSlot.style.display = 'block';
        }
    } else if (appState.currentUserRole === 'voter') {
        if (saveLogoutBtn) saveLogoutBtn.style.display = 'inline-flex';
        if (adminDashboardSlot) adminDashboardSlot.style.display = 'none';
        
        const voterVisibleTabs = ['excellent_presenters', 'live_vote_status'];
        allTabs.forEach(tab => {
            if (voterVisibleTabs.includes(tab.dataset.tab)) {
                tab.style.display = 'inline-flex';
            } else {
                tab.style.display = 'none';
            }
        });
        if (!voterVisibleTabs.includes(appState.activeTab)) {
            const firstVoterTab = document.querySelector('.tab-button[data-tab="excellent_presenters"]');
            if (firstVoterTab) firstVoterTab.click();
        }
    } else if (appState.currentUserRole === 'evaluator') {
        if (saveLogoutBtn) saveLogoutBtn.style.display = 'inline-flex';
        if (adminDashboardSlot) adminDashboardSlot.style.display = 'none';
        
        const evaluatorHiddenTabs = [
            'detailed_results', 
            'voter_detailed_results', 
            'final_results', 
            'excellent_presenters', 
            'live_vote_status', 
            'presentation_results',
            'award_ceremony',
            'admin_settings'
        ];
        allTabs.forEach(tab => {
            if (evaluatorHiddenTabs.includes(tab.dataset.tab)) {
                tab.style.display = 'none';
            } else {
                tab.style.display = 'inline-flex';
            }
        });
        if (evaluatorHiddenTabs.includes(appState.activeTab)) {
            const firstEvalTab = document.querySelector('.tab-button[data-tab="6s"]');
            if (firstEvalTab) firstEvalTab.click();
        }
    }
}

/**
 * 활성 탭 화면 렌더링
 */
export function render() {
    const tabContent = document.getElementById('tab-content');
    if (!tabContent) return;

    updateUIVisibility();

    switch (appState.activeTab) {
        case 'results':
            tabContent.innerHTML = renderResults();
            break;
        case 'presentation_results':
            tabContent.innerHTML = renderPresentationResults();
            break;
        case 'radar_analysis':
            tabContent.innerHTML = renderRadarAnalysis();
            break;
        case 'award_ceremony':
            tabContent.innerHTML = renderAwardCeremony();
            break;
        case 'live_vote_status':
            tabContent.innerHTML = renderLiveVoteStatus();
            break;
        case 'detailed_results':
            tabContent.innerHTML = renderDetailedResults();
            break;
        case 'voter_detailed_results':
            tabContent.innerHTML = renderVoterDetailedResults();
            break;
        case 'final_results':
            tabContent.innerHTML = renderFinalResults();
            break;
        case 'excellent_presenters':
            tabContent.innerHTML = renderExcellentPresenters();
            break;
        case 'admin_settings':
            tabContent.innerHTML = renderAdminSettings();
            break;
        default:
            tabContent.innerHTML = renderEvaluationTable(appState.activeTab);
            break;
    }
}

/**
 * 부문별 평가 최종 제출 처리
 */
async function handleSubmitCategory(categoryKey) {
    if (!appState.loginId) return;

    let allScoresFilled = true;
    const categoryPresenters = appState.presenters[categoryKey] || [];
    const criteria = appState.evaluationCriteria[categoryKey] || [];

    for (const presenter of categoryPresenters) {
        for (const criterion of criteria) {
            const score = appState.allScores[presenter.id]?.scores?.[appState.loginId]?.[criterion.key];
            if (score === undefined || score === null || score === '') {
                allScoresFilled = false;
                break;
            }
        }
        if (!allScoresFilled) break;
    }

    if (!allScoresFilled) {
        showMessage(`'${CATEGORY_DISPLAY_NAMES[categoryKey]}' 부문의 모든 항목을 평가해야 제출할 수 있습니다.`);
        return;
    }

    showMessage('최종 제출하시겠습니까? 제출 후에는 수정할 수 없습니다.', true, async () => {
        try {
            await firestoreSubmitCategory(categoryKey);
            showMessage(`'${CATEGORY_DISPLAY_NAMES[categoryKey]}' 부문 평가를 최종 제출했습니다. 이제 수정할 수 없습니다.`);
        } catch (error) {
            console.error("Error submitting category:", error);
            showMessage("제출 중 오류가 발생했습니다. 다시 시도해 주세요.");
        }
    });
}

/**
 * 로그인 폼 처리
 */
async function onLoginSubmit() {
    const roleInput = document.getElementById('login-role');
    const idInput = document.getElementById('login-id');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('login-error');
    const errorMessage = document.getElementById('login-error-message');

    const role = roleInput ? roleInput.value : 'evaluator';
    const id = idInput ? idInput.value : '';
    const password = passwordInput ? passwordInput.value : '';

    if (errorDiv) errorDiv.classList.add('hidden');

    try {
        await login(role, id, password);

        // 로그인 성공 시 화면 전환
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');

        const roleText = appState.currentUserRole === 'admin' ? '관리자' : 
                         appState.currentUserRole === 'evaluator' ? '평가자' : '투표자';
        const userInfoEl = document.getElementById('userInfo');
        if (userInfoEl) userInfoEl.textContent = `${roleText}: ${appState.loginId}`;

        // 상태 변경 리스너 구독 (자동저장 뱃지 갱신)
        appState.subscribe((eventType) => {
            if (eventType === 'SAVE_STATUS_CHANGED') {
                updateAutosaveBadge();
            }
            if (eventType === 'CONFIG_CHANGED') {
                render();
            }
        });

        // 원격 동적 설정 구독
        setupConfigListener(() => {
            render();
        });

        // 실시간 리스너 구독
        setupRealtimeScoresListener(() => {
            const isAggregateTab = [
                'results', 'detailed_results', 'final_results', 
                'excellent_presenters', 'voter_detailed_results', 
                'live_vote_status', 'presentation_results', 'radar_analysis'
            ].includes(appState.activeTab);

            if (isAggregateTab) {
                render();
            } else if (appState.activeTab === 'award_ceremony') {
                updateCeremonyCards();
            } else {
                renderColumnTotals(appState.activeTab);
            }
        });

        if (appState.currentUserRole === 'evaluator') {
            setupSubmissionListener(appState.loginId, () => render());
        }

        if (appState.currentUserRole === 'admin') {
            setupAllSubmissionsListener(() => {
                const adminDashboardSlot = document.getElementById('admin-dashboard-slot');
                if (adminDashboardSlot && adminDashboardSlot.style.display !== 'none') {
                    adminDashboardSlot.innerHTML = renderAdminDashboard();
                }
            });
        }

        setupExcellentPresenterListener(() => {
            if (appState.activeTab === 'award_ceremony') {
                updateCeremonyCards();
            } else {
                render();
            }
            const adminDashboardSlot = document.getElementById('admin-dashboard-slot');
            if (adminDashboardSlot && adminDashboardSlot.style.display !== 'none') {
                adminDashboardSlot.innerHTML = renderAdminDashboard();
            }
        });

        render();
    } catch (error) {
        if (errorMessage) errorMessage.textContent = error.message;
        if (errorDiv) errorDiv.classList.remove('hidden');
    }
}

/**
 * 온라인/오프라인 네트워크 상태 감지
 */
function setupNetworkListeners() {
    const offlineBanner = document.getElementById('offline-banner');

    function updateNetworkStatus() {
        if (navigator.onLine) {
            appState.setOnlineStatus(true);
            if (offlineBanner) offlineBanner.classList.add('hidden');
        } else {
            appState.setOnlineStatus(false);
            if (offlineBanner) offlineBanner.classList.remove('hidden');
        }
    }

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();
}

/**
 * DOM 초기화 및 이벤트 리스너 바인딩
 */
document.addEventListener('DOMContentLoaded', () => {
    initModal();
    setupNetworkListeners();

    // 역할 선택 버튼
    const roleEvaluatorBtn = document.getElementById('role-evaluator');
    const roleVoterBtn = document.getElementById('role-voter');
    const roleAdminBtn = document.getElementById('role-admin');
    const loginIdLabel = document.getElementById('login-id-label');
    const loginIdInput = document.getElementById('login-id');
    const loginRoleInput = document.getElementById('login-role');

    function setRole(role) {
        if (loginRoleInput) loginRoleInput.value = role;
        [roleEvaluatorBtn, roleVoterBtn, roleAdminBtn].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });

        if (role === 'evaluator') {
            if (roleEvaluatorBtn) roleEvaluatorBtn.classList.add('active');
            if (loginIdLabel) loginIdLabel.textContent = '성명';
            if (loginIdInput) loginIdInput.placeholder = '성명 (예: 홍길동)';
        } else if (role === 'voter') {
            if (roleVoterBtn) roleVoterBtn.classList.add('active');
            if (loginIdLabel) loginIdLabel.textContent = '아이디';
            if (loginIdInput) loginIdInput.placeholder = '아이디 (예: atec001)';
        } else if (role === 'admin') {
            if (roleAdminBtn) roleAdminBtn.classList.add('active');
            if (loginIdLabel) loginIdLabel.textContent = '관리자 ID';
            if (loginIdInput) loginIdInput.placeholder = 'admin';
        }
    }

    setRole('evaluator');

    if (roleEvaluatorBtn) roleEvaluatorBtn.addEventListener('click', () => setRole('evaluator'));
    if (roleVoterBtn) roleVoterBtn.addEventListener('click', () => setRole('voter'));
    if (roleAdminBtn) roleAdminBtn.addEventListener('click', () => setRole('admin'));

    // 로그인 및 헤더 버튼
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.addEventListener('click', onLoginSubmit);

    const loginPasswordInput = document.getElementById('password');
    if (loginPasswordInput) {
        loginPasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') onLoginSubmit();
        });
    }

    const simulationBtn = document.getElementById('simulationBtn');
    if (simulationBtn) {
        simulationBtn.addEventListener('click', async () => {
            simulationBtn.disabled = true;
            simulationBtn.textContent = '시뮬레이션 진행 중...';
            try {
                await runSimulation();
                simulationBtn.textContent = '시뮬레이션 완료';
                showMessage('가상 평가자 점수 입력과 가상 투표자 투표를 완료했습니다. 결과를 확인하세요.');
            } catch (err) {
                console.error("Simulation error:", err);
                showMessage('시뮬레이션 중 오류가 발생했습니다.');
            } finally {
                simulationBtn.disabled = false;
                simulationBtn.textContent = '가상 평가 시뮬레이션';
            }
        });
    }

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportToCSV(appState.allScores, appState.excellentPresenterSelections);
        });
    }

    const backupJsonBtn = document.getElementById('backupJsonBtn');
    if (backupJsonBtn) {
        backupJsonBtn.addEventListener('click', () => {
            exportFullDatabaseToJSON();
        });
    }

    const restoreJsonBtn = document.getElementById('restoreJsonBtn');
    const restoreFileInput = document.getElementById('restoreFileInput');
    if (restoreJsonBtn && restoreFileInput) {
        restoreJsonBtn.addEventListener('click', () => {
            restoreFileInput.click();
        });
        restoreFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                importDatabaseFromJSON(file);
                restoreFileInput.value = '';
            }
        });
    }

    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    const saveLogoutBtn = document.getElementById('save-logout-btn');
    if (saveLogoutBtn) {
        saveLogoutBtn.addEventListener('click', logout);
    }

    const resetSimBtn = document.getElementById('resetSimBtn');
    if (resetSimBtn) {
        resetSimBtn.addEventListener('click', () => {
            showMessage('모든 시뮬레이션 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.', true, async () => {
                resetSimBtn.disabled = true;
                resetSimBtn.textContent = '초기화 중...';
                try {
                    await resetSimulationData();
                    showMessage('시뮬레이션 데이터가 성공적으로 초기화되었습니다.');
                } catch (err) {
                    console.error("Reset simulation error:", err);
                    showMessage('데이터 초기화 중 오류가 발생했습니다.');
                } finally {
                    resetSimBtn.disabled = false;
                    resetSimBtn.textContent = '시뮬레이션 초기화';
                }
            });
        });
    }

    const fullResetBtn = document.getElementById('fullResetBtn');
    if (fullResetBtn) {
        fullResetBtn.addEventListener('click', () => {
            showMessage('모든 평가 및 투표 데이터를 영구적으로 삭제하시겠습니까? 삭제 전 데이터가 CSV 파일로 자동 저장됩니다.', true, async () => {
                exportToCSV(appState.allScores, appState.excellentPresenterSelections);
                fullResetBtn.disabled = true;
                fullResetBtn.textContent = '삭제 중...';
                try {
                    await resetAllData();
                    showMessage('모든 데이터가 성공적으로 초기화되었습니다.');
                } catch (err) {
                    console.error("Full reset error:", err);
                    showMessage('전체 데이터 초기화 중 오류가 발생했습니다.');
                } finally {
                    fullResetBtn.disabled = false;
                    fullResetBtn.textContent = '전체 데이터 초기화';
                }
            });
        });
    }

    // 탭 버튼 클릭
    const tabButtons = document.getElementById('tab-buttons');
    if (tabButtons) {
        tabButtons.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                appState.setActiveTab(e.target.dataset.tab);
                document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                render();
            }
        });
    }

    // 관리자 대시보드 내부 이벤트 (세션 일괄 해제)
    document.addEventListener('click', async (e) => {
        if (e.target.closest('#unlock-sessions-btn')) {
            showMessage('모든 투표자 세션을 일괄 해제하시겠습니까? 중복 로그인 잠김 상태인 모든 투표자가 즉시 다시 로그인할 수 있게 됩니다.', true, async () => {
                try {
                    await resetVoterSessions();
                    showMessage('모든 투표자 세션이 성공적으로 해제되었습니다.');
                } catch (err) {
                    console.error("Unlock sessions error:", err);
                    showMessage('세션 해제 중 오류가 발생했습니다.');
                }
            });
        }
    });

    // 탭 콘텐츠 내부 이벤트 위임
    const tabContent = document.getElementById('tab-content');
    if (tabContent) {
        // 스마트 키보드 내비게이션 바인딩
        tabContent.addEventListener('keydown', handleScoreTableKeyDown);

        // 클릭 이벤트
        tabContent.addEventListener('click', async (e) => {
            if (e.target.classList.contains('submit-btn')) {
                const categoryKey = e.target.dataset.category;
                handleSubmitCategory(categoryKey);
            }
            
            if (e.target.id === 'excellent-presenter-submit-btn') {
                showMessage('우수 발표자 선정을 최종 제출하시겠습니까? 제출 후에는 수정할 수 없습니다.', true, async () => {
                    try {
                        await submitExcellentSelections();
                        showMessage("우수 발표자 선정을 최종 제출했습니다. 이제 수정할 수 없습니다.");
                    } catch (err) {
                        showMessage("제출 중 오류가 발생했습니다.");
                    }
                });
            }

            if (e.target.classList.contains('excellent-presenter-checkbox')) {
                const clickedCheckbox = e.target;
                const category = clickedCheckbox.dataset.category;
                const presenterName = clickedCheckbox.dataset.presenterName;
                const isChecked = clickedCheckbox.checked;

                if (isChecked) {
                    const checkboxesInCategory = document.querySelectorAll(`.excellent-presenter-checkbox[data-category="${category}"]`);
                    checkboxesInCategory.forEach(cb => {
                        if (cb !== clickedCheckbox) cb.checked = false;
                    });
                    saveExcellentSelection(category, presenterName);
                } else {
                    const myCurrentSelections = appState.excellentPresenterSelections[appState.loginId]?.selections || {};
                    if (myCurrentSelections[category] === presenterName) {
                        saveExcellentSelection(category, null);
                    }
                }
            }

            // 개별 차트 이미지 저장
            const singleChartBtn = e.target.closest('.download-single-chart-btn');
            if (singleChartBtn) {
                const canvasId = singleChartBtn.dataset.canvasId;
                const filename = singleChartBtn.dataset.filename || 'chart.png';
                downloadChartAsPNG(canvasId, filename);
            }

            // 발표 결과 차트 이미지 저장
            if (e.target.closest('#download-presentation-chart-btn')) {
                const selectedCat = appState.selectedPresentationCategory || '6s';
                downloadChartAsPNG('presentation-chart', `${selectedCat}_presentation_result.png`);
            }

            // 레이더 차트 이미지 저장
            if (e.target.closest('#download-radar-chart-btn')) {
                const selectedCat = appState.selectedPresentationCategory || '6s';
                downloadChartAsPNG('radar-analysis-chart', `${selectedCat}_radar_analysis.png`);
            }

            // 시상식 다음 공개 버튼 (전체화면 풀림 없이 내부 카드만 갱신)
            if (e.target.closest('#next-reveal-btn')) {
                handleNextReveal();
            }

            // 시상식 초기화 버튼 (전체화면 풀림 없이 내부 카드만 갱신)
            if (e.target.closest('#reset-ceremony-btn')) {
                handleResetCeremony();
            }

            // 시상식 사운드 효과음 토글 버튼
            const soundBtn = e.target.closest('#toggle-ceremony-sound-btn');
            if (soundBtn) {
                const isMuted = await soundEngine.toggleMute();
                soundBtn.className = `text-xs md:text-sm font-semibold px-3.5 py-2 ${isMuted ? 'bg-slate-300 text-slate-600' : 'bg-emerald-600 text-white'} rounded-lg transition shadow flex items-center gap-1`;
                soundBtn.innerHTML = `<span>${isMuted ? '🔇 음소거' : '🔊 효과음 ON'}</span>`;
            }

            // 시상식 전체화면 모드 토글 버튼
            if (e.target.closest('#toggle-ceremony-fullscreen-btn')) {
                const ceremonyContainer = document.getElementById('award-ceremony-container');
                if (ceremonyContainer) {
                    if (!document.fullscreenElement) {
                        ceremonyContainer.requestFullscreen().catch(err => {
                            console.error("Ceremony fullscreen error:", err);
                        });
                    } else {
                        document.exitFullscreen();
                    }
                }
            }

            // 프레젠테이션 전체화면 모드 토글
            if (e.target.closest('#toggle-presentation-fullscreen-btn')) {
                const card = document.getElementById('presentation-card-container');
                if (card) {
                    if (!document.fullscreenElement) {
                        card.requestFullscreen().catch(err => {
                            console.error("Fullscreen error:", err);
                        });
                    } else {
                        document.exitFullscreen();
                    }
                }
            }

            // 설정 저장 버튼
            if (e.target.closest('#save-config-btn')) {
                await handleSaveConfig();
            }

            // 관리자 비밀번호 변경 버튼
            if (e.target.closest('#change-admin-pw-btn')) {
                await handleChangePassword('admin');
            }

            // 심사위원 비밀번호 변경 버튼
            if (e.target.closest('#change-evaluator-pw-btn')) {
                await handleChangePassword('evaluator');
            }

            // 발표자 추가 버튼
            if (e.target.classList.contains('add-presenter-btn')) {
                const category = e.target.dataset.category;
                const nextNum = (appState.presenters[category]?.length || 0) + 1;
                const newId = `${category}-${nextNum}`;
                appState.presenters[category].push({ id: newId, name: `새 발표자 ${nextNum}` });
                render();
            }

            // 발표자 삭제 버튼
            if (e.target.classList.contains('delete-presenter-btn')) {
                const category = e.target.dataset.category;
                const index = parseInt(e.target.dataset.index, 10);
                if (appState.presenters[category].length <= 1) {
                    showMessage("최소 1명 이상의 발표자가 등록되어 있어야 합니다.");
                    return;
                }
                appState.presenters[category].splice(index, 1);
                render();
            }
        });

        // 변경 이벤트 (드롭다운)
        tabContent.addEventListener('change', (e) => {
            if (e.target.id === 'ceremony-category-select') {
                appState.setPresentationCategory(e.target.value);
                handleResetCeremony();
                return;
            }

            if (e.target.id === 'category-select' || e.target.id === 'radar-category-select') {
                appState.setPresentationCategory(e.target.value);
                render();
            }

            if (e.target.classList.contains('final-presenter-select')) {
                const tr = e.target.closest('tr');
                const category = tr.dataset.category;
                const index = parseInt(tr.dataset.index, 10);
                const selectedId = e.target.value;
                const selectedPresenter = appState.presenters[category].find(p => p.id === selectedId);

                if (appState.finalResultsData && appState.finalResultsData[category] && selectedPresenter) {
                    appState.finalResultsData[category][index].id = selectedPresenter.id;
                    appState.finalResultsData[category][index].name = selectedPresenter.name;
                    renderFinalResultsCharts(appState.finalResultsData);
                }
            }
        });

        // 입력 이벤트 (점수 및 심사평 코멘트 입력)
        tabContent.addEventListener('input', (e) => {
            if (e.target.classList.contains('score-input')) {
                const { id, key } = e.target.dataset;
                const value = e.target.value;
                const max = parseInt(e.target.max, 10);
                let scoreValue = value === '' ? null : parseInt(value, 10);

                if (scoreValue !== null) {
                    if (scoreValue > max) { e.target.value = max; scoreValue = max; }
                    if (scoreValue < 0) { e.target.value = 0; scoreValue = 0; }
                }

                appState.updateScoreInMemory(id, appState.loginId, key, scoreValue);
                renderColumnTotals(appState.activeTab);
                debouncedUpdateScore(id, key, e.target.value);
            }

            if (e.target.classList.contains('evaluator-comment-input')) {
                const presenterId = e.target.dataset.presenterId;
                debouncedUpdateComment(presenterId, e.target.value);
            }
        });

        // 포커스 아웃 이벤트 (관리자 최종 결과 수정 반영)
        tabContent.addEventListener('blur', (e) => {
            if (e.target.classList.contains('final-score-cell') || 
                e.target.classList.contains('final-award-cell') || 
                e.target.classList.contains('final-vote-score-cell')) {
                
                const tr = e.target.closest('tr');
                if (!tr || !appState.finalResultsData) return;
                const category = tr.dataset.category;
                const index = parseInt(tr.dataset.index, 10);

                if (e.target.classList.contains('final-score-cell')) {
                    const newScore = parseFloat(e.target.textContent) || 0;
                    appState.finalResultsData[category][index].score = newScore;
                } else if (e.target.classList.contains('final-vote-score-cell')) {
                    const newVoteScore = parseInt(e.target.textContent, 10) || 0;
                    appState.finalResultsData[category][index].voteScore = newVoteScore;
                } else if (e.target.contains && e.target.classList.contains('final-award-cell')) {
                    const newAward = e.target.textContent.trim();
                    appState.finalResultsData[category][index].award = newAward;
                }

                const currentData = appState.finalResultsData[category][index];
                currentData.totalScore = currentData.score + currentData.voteScore;
                
                const totalCell = tr.querySelector('.final-total-score-cell');
                if (totalCell) totalCell.textContent = currentData.totalScore.toFixed(2);

                renderFinalResultsCharts(appState.finalResultsData);
            }
        }, true);
    }
});
