/**
 * app.js
 * 메인 애플리케이션 진입점 및 전역 이벤트 컨트롤러
 */

import { EVENT_INFO, CATEGORY_DISPLAY_NAMES, CATEGORY_METADATA, AWARD_SLOTS_2026 } from './config/constants.js';
import { initializeFirebaseOnce } from './config/firebase.js';
import { appState } from './state/appState.js';
import { exportToCSV } from './utils/exportCsv.js';
import { handleScoreTableKeyDown } from './utils/keyboardNav.js';
import { exportFullDatabaseToJSON, importDatabaseFromJSON } from './utils/backupRestore.js';
import { soundEngine } from './utils/soundEffects.js';
import { showMessage, initModal } from './ui/modal.js';
import { login, logout } from './services/authService.js';
import {
    switchYear,
    setupConfigListener,
    updateScore,
    updateComment,
    submitCategory as firestoreSubmitCategory,
    saveExcellentSelection,
    submitExcellentSelections,
    saveAwardOverrides,
    resetVoterSessions,
    runSimulation,
    resetSimulationData,
    resetAllData
} from './services/firestoreService.js';

// UI 렌더러 모듈
import { renderEvaluationTable, renderColumnTotals, updateAutosaveBadge } from './ui/renderers/evaluationTable.js';
import { renderAdminDashboard } from './ui/renderers/adminDashboard.js';
import { renderAdminSettings, handleSaveConfig, handleChangePassword, syncSettingsFormToState } from './ui/renderers/adminSettings.js';
import { renderAwardCeremony, handleNextReveal, handleResetCeremony, updateCeremonyCards, broadcastCeremonyAction } from './ui/renderers/awardCeremony.js';
import { renderRadarAnalysis } from './ui/renderers/radarAnalysis.js';
import { renderResults } from './ui/renderers/results.js';
import { renderPresentationResults } from './ui/renderers/presentationResults.js';
import { renderLiveVoteStatus } from './ui/renderers/liveVoteStatus.js';
import { renderDetailedResults } from './ui/renderers/detailedResults.js';
import { renderVoterDetailedResults } from './ui/renderers/voterDetailedResults.js';
import { renderFinalResults } from './ui/renderers/finalResults.js';
import { renderFinalResultsCharts, downloadChartAsPNG } from './ui/chartManager.js';
import { renderExcellentPresenters } from './ui/renderers/excellentPresenters.js';

// 별도 창(ceremony.html)에서 부모 창 상태를 즉시 복제할 수 있도록 전역 노출
if (typeof window !== 'undefined') {
    window.appState = appState;
}

// 셀별 독립 디바운스 타이머 및 진행 중인 저장 작업 추적 (빠른 연속 입력 시 누락 방지 + 로그아웃 시 즉시 플러시)
const pendingScoreTimers = new Map();
const pendingCommentTimers = new Map();
const activeSavePromises = new Set();

function trackSavePromise(promise) {
    activeSavePromises.add(promise);
    promise.finally(() => activeSavePromises.delete(promise));
    return promise;
}

function debouncedUpdateScore(id, key, value) {
    const mapKey = `${id}:::${key}`;
    if (pendingScoreTimers.has(mapKey)) {
        clearTimeout(pendingScoreTimers.get(mapKey).timerId);
    }
    const task = () => {
        pendingScoreTimers.delete(mapKey);
        const p = updateScore(id, key, value).catch(err => {
            console.error("Score update failed:", err);
        });
        return trackSavePromise(p);
    };
    const timerId = setTimeout(task, 350);
    pendingScoreTimers.set(mapKey, { timerId, flush: task });
}

function debouncedUpdateComment(presenterId, text) {
    if (pendingCommentTimers.has(presenterId)) {
        clearTimeout(pendingCommentTimers.get(presenterId).timerId);
    }
    const task = () => {
        pendingCommentTimers.delete(presenterId);
        const p = updateComment(presenterId, text).catch(err => {
            console.error("Comment update failed:", err);
        });
        return trackSavePromise(p);
    };
    const timerId = setTimeout(task, 450);
    pendingCommentTimers.set(presenterId, { timerId, flush: task });
}

async function flushPendingSaves() {
    const flushes = [];
    for (const [, entry] of pendingScoreTimers.entries()) {
        clearTimeout(entry.timerId);
        flushes.push(entry.flush());
    }
    for (const [, entry] of pendingCommentTimers.entries()) {
        clearTimeout(entry.timerId);
        flushes.push(entry.flush());
    }
    if (flushes.length > 0 || activeSavePromises.size > 0) {
        await Promise.allSettled([...flushes, ...activeSavePromises]);
    }
}

/**
 * 현재 활성 연도의 부문 목록에 맞춰 상단 평가 부문 탭을 동적 생성/동기화
 */
function syncCategoryTabButtons() {
    const tabNav = document.getElementById('tab-buttons');
    if (!tabNav) return;

    const categories = Object.keys(appState.presenters || {});
    const existingCatBtns = Array.from(tabNav.querySelectorAll('button[data-category-tab="true"]'));
    const existingKeys = existingCatBtns.map(b => b.dataset.tab);

    const needsRebuild =
        categories.length !== existingKeys.length ||
        categories.some((cat, i) => cat !== existingKeys[i]);

    if (needsRebuild) {
        existingCatBtns.forEach(btn => btn.remove());
        const firstSystemBtn = tabNav.querySelector('button:not([data-category-tab="true"])');

        categories.forEach(cat => {
            const meta = CATEGORY_METADATA[cat] || {};
            const label = meta.tabLabel || `${CATEGORY_DISPLAY_NAMES[cat] || cat}`;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.tab = cat;
            btn.dataset.categoryTab = 'true';
            btn.className = 'tab-button text-sm md:text-base font-medium text-center text-slate-500 border-b-2 border-transparent px-4 py-3 hover:text-slate-700 hover:border-slate-300';
            btn.textContent = label;
            if (firstSystemBtn) {
                tabNav.insertBefore(btn, firstSystemBtn);
            } else {
                tabNav.appendChild(btn);
            }
        });
    } else {
        existingCatBtns.forEach(btn => {
            const cat = btn.dataset.tab;
            const meta = CATEGORY_METADATA[cat] || {};
            const label = meta.tabLabel || `${CATEGORY_DISPLAY_NAMES[cat] || cat}`;
            if (btn.textContent !== label) {
                btn.textContent = label;
            }
        });
    }

    tabNav.querySelectorAll('button.tab-button').forEach(btn => {
        if (btn.dataset.tab === appState.activeTab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

/**
 * 역할에 따른 UI 탭 및 관리자 버튼 가시성 제어
 */
export function updateUIVisibility() {
    appState.ensureValidCategorySelection();
    syncCategoryTabButtons();

    const allTabs = document.querySelectorAll('#tab-buttons button');
    const simBtn = document.getElementById('simulationBtn');
    const exportBtn = document.getElementById('exportBtn');
    const backupJsonBtn = document.getElementById('backupJsonBtn');
    const restoreJsonBtn = document.getElementById('restoreJsonBtn');
    const printBtn = document.getElementById('printBtn');
    const saveLogoutBtn = document.getElementById('save-logout-btn');
    const manualBtn = document.getElementById('manualBtn');
    const resetSimBtn = document.getElementById('resetSimBtn');
    const fullResetBtn = document.getElementById('fullResetBtn');
    const adminDashboardSlot = document.getElementById('admin-dashboard-slot');

    [simBtn, exportBtn, backupJsonBtn, restoreJsonBtn, printBtn, saveLogoutBtn, manualBtn, resetSimBtn, fullResetBtn].forEach(btn => {
        if (btn) {
            btn.classList.add('hidden');
            btn.style.display = 'none';
        }
    });

    const showBtn = (btn) => {
        if (btn) {
            btn.classList.remove('hidden');
            btn.style.display = 'inline-flex';
        }
    };

    if (appState.currentUserRole === 'admin') {
        if (manualBtn) manualBtn.href = './manual.html#admin';
        showBtn(simBtn);
        showBtn(exportBtn);
        showBtn(backupJsonBtn);
        showBtn(restoreJsonBtn);
        showBtn(printBtn);
        showBtn(resetSimBtn);
        showBtn(fullResetBtn);
        showBtn(manualBtn);
        showBtn(saveLogoutBtn);
        allTabs.forEach(tab => tab.style.display = 'inline-flex');

        if (adminDashboardSlot) {
            adminDashboardSlot.classList.remove('hidden');
            adminDashboardSlot.innerHTML = renderAdminDashboard();
            adminDashboardSlot.style.display = 'block';
        }
    } else if (appState.currentUserRole === 'voter') {
        showBtn(saveLogoutBtn);
        if (adminDashboardSlot) {
            adminDashboardSlot.classList.add('hidden');
            adminDashboardSlot.style.display = 'none';
        }

        const voterVisibleTabs = ['excellent_presenters', 'live_vote_status'];
        if (!voterVisibleTabs.includes(appState.activeTab)) {
            appState.activeTab = 'excellent_presenters';
            syncCategoryTabButtons();
        }
        allTabs.forEach(tab => {
            if (voterVisibleTabs.includes(tab.dataset.tab)) {
                tab.style.display = 'inline-flex';
            } else {
                tab.style.display = 'none';
            }
        });
    } else if (appState.currentUserRole === 'evaluator') {
        if (manualBtn) manualBtn.href = './manual.html#evaluator';
        showBtn(manualBtn);
        showBtn(saveLogoutBtn);
        if (adminDashboardSlot) {
            adminDashboardSlot.classList.add('hidden');
            adminDashboardSlot.style.display = 'none';
        }

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
        if (evaluatorHiddenTabs.includes(appState.activeTab)) {
            appState.activeTab = appState.getFirstCategory();
            syncCategoryTabButtons();
        }
        allTabs.forEach(tab => {
            if (evaluatorHiddenTabs.includes(tab.dataset.tab)) {
                tab.style.display = 'none';
            } else {
                tab.style.display = 'inline-flex';
            }
        });
    }
}

/**
 * 대회 기본 정보(발표 요약문집 PDF 링크 URL, 대회 제목 등)를 로그인 화면 및 헤더 DOM에 실시간 동기화
 */
function syncEventInfoToDOM() {
    const info = appState.eventInfo || EVENT_INFO;
    const docLinkEl = document.getElementById('login-doc-link');
    if (docLinkEl && info.DOC_LINK) {
        docLinkEl.href = info.DOC_LINK;
    }
    const docTitleEl = document.getElementById('login-doc-title');
    if (docTitleEl && info.DOC_TITLE) {
        docTitleEl.textContent = info.DOC_TITLE;
    }
    const headerTitleEl = document.getElementById('app-header-title');
    if (headerTitleEl && info.TITLE) {
        headerTitleEl.textContent = info.TITLE;
    }
}

/**
 * 활성 탭 화면 렌더링
 */
export function render() {
    syncEventInfoToDOM();

    const tabContent = document.getElementById('tab-content');
    if (!tabContent) return;

    // 1. 연도 선택 컨트롤러 값 동기화
    const yearSelector = document.getElementById('year-selector');
    if (yearSelector && yearSelector.value !== String(appState.currentYear)) {
        yearSelector.value = String(appState.currentYear);
    }

    // 2. 2025년 과거 아카이브 알림 배너 제어
    const archiveBanner = document.getElementById('archive-banner');
    if (archiveBanner) {
        if (appState.isArchiveMode()) {
            archiveBanner.classList.remove('hidden');
        } else {
            archiveBanner.classList.add('hidden');
        }
    }

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

    // 3. 과거 아카이브(2025년) 모드일 경우 평가표 입력/제출 차단 (안전한 Read-only 모드)
    if (appState.isArchiveMode()) {
        const scoreInputs = tabContent.querySelectorAll('.score-input');
        scoreInputs.forEach(input => {
            input.disabled = true;
            input.classList.add('bg-slate-100', 'cursor-not-allowed');
            input.title = "과거 아카이브 모드에서는 점수를 수정할 수 없습니다.";
        });
        const commentInputs = tabContent.querySelectorAll('.comment-input, .evaluator-comment-input');
        commentInputs.forEach(input => {
            input.disabled = true;
            input.classList.add('bg-slate-100', 'cursor-not-allowed');
            input.title = "과거 아카이브 모드에서는 심사평을 수정할 수 없습니다.";
        });
        const submitBtns = tabContent.querySelectorAll('.submit-btn, .submit-category-btn, #submit-excellent-btn, #excellent-presenter-submit-btn');
        submitBtns.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
            btn.title = "과거 아카이브 모드에서는 제출할 수 없습니다.";
        });
    }
}

/**
 * 부문별 평가 최종 제출 처리
 */
async function handleSubmitCategory(categoryKey) {
    if (!appState.loginId) return;

    if (appState.isArchiveMode()) {
        showMessage("과거 아카이브(2025년) 모드에서는 점수를 제출할 수 없습니다.");
        return;
    }

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
        showMessage(`'${CATEGORY_DISPLAY_NAMES[categoryKey] || categoryKey}' 부문의 모든 항목을 평가해야 제출할 수 있습니다.`);
        return;
    }

    showMessage('최종 제출하시겠습니까? 제출 후에는 수정할 수 없습니다.', true, async () => {
        try {
            await flushPendingSaves();
            await firestoreSubmitCategory(categoryKey);
            showMessage(`'${CATEGORY_DISPLAY_NAMES[categoryKey] || categoryKey}' 부문 평가를 최종 제출했습니다. 이제 수정할 수 없습니다.`);
            render();
        } catch (error) {
            console.error("Error submitting category:", error);
            showMessage("제출 중 오류가 발생했습니다. 다시 시도해 주세요.");
        }
    });
}

// 중복 구독 방지 플래그
let isStateListenerBound = false;

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

        // 상태 변경 리스너 구독 (자동저장 뱃지 및 설정 변경 갱신)
        if (!isStateListenerBound) {
            isStateListenerBound = true;
            appState.subscribe((eventType) => {
                if (eventType === 'SAVE_STATUS_CHANGED') {
                    updateAutosaveBadge();
                }
                if (eventType === 'YEAR_CHANGED') {
                    syncEventInfoToDOM();
                }
                if (eventType === 'CONFIG_CHANGED') {
                    syncEventInfoToDOM();
                    if (appState.activeTab === 'award_ceremony') {
                        updateCeremonyCards();
                    } else if (appState.activeTab !== 'admin_settings') {
                        render();
                    } else {
                        syncCategoryTabButtons();
                    }
                }
            });
        }

        // 실시간 Firestore 리스너 일괄 연동 함수
        function onFirestoreUpdate() {
            const isAggregateTab = [
                'results', 'detailed_results', 'final_results',
                'excellent_presenters', 'voter_detailed_results',
                'live_vote_status', 'presentation_results', 'radar_analysis'
            ].includes(appState.activeTab);

            if (isAggregateTab) {
                render();
            } else if (appState.activeTab === 'award_ceremony') {
                updateCeremonyCards();
            } else if (appState.activeTab !== 'admin_settings') {
                renderColumnTotals(appState.activeTab);
            }

            const adminDashboardSlot = document.getElementById('admin-dashboard-slot');
            if (adminDashboardSlot && adminDashboardSlot.style.display !== 'none') {
                adminDashboardSlot.innerHTML = renderAdminDashboard();
            }
        }

        // 현재 선택된 연도(기본: 2026)의 Firestore 실시간 리스너 구독
        switchYear(appState.currentYear, onFirestoreUpdate);

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
    syncEventInfoToDOM();

    // 로그인 전 초기 화면에서도 Firestore 최신 대회 설정(발표 요약문집 PDF 링크 URL 등)을 실시간 반영
    initializeFirebaseOnce()
        .then(() => {
            setupConfigListener(() => {
                syncEventInfoToDOM();
            });
        })
        .catch((err) => {
            console.warn('Initial config sync skipped:', err);
        });

    // 역할 선택 버튼
    const roleEvaluatorBtn = document.getElementById('role-evaluator');
    const roleVoterBtn = document.getElementById('role-voter');
    const roleAdminBtn = document.getElementById('role-admin');
    const loginIdLabel = document.getElementById('login-id-label');
    const loginIdInput = document.getElementById('login-id');
    const passwordLabel = document.getElementById('password-label');
    const loginPasswordInput = document.getElementById('password');
    const loginRoleInput = document.getElementById('login-role');

    function setRole(role) {
        if (loginRoleInput) loginRoleInput.value = role;
        [roleEvaluatorBtn, roleVoterBtn, roleAdminBtn].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });

        if (role === 'evaluator') {
            if (roleEvaluatorBtn) roleEvaluatorBtn.classList.add('active');
            if (loginIdLabel) loginIdLabel.textContent = '성명';
            if (loginIdInput) {
                loginIdInput.placeholder = '성명 (예: 홍길동)';
                if (loginIdInput.value === 'admin') loginIdInput.value = '';
            }
            if (passwordLabel) passwordLabel.textContent = '비밀번호';
            if (loginPasswordInput) {
                loginPasswordInput.placeholder = '평가자 비밀번호';
                loginPasswordInput.type = 'password';
            }
        } else if (role === 'voter') {
            if (roleVoterBtn) roleVoterBtn.classList.add('active');
            if (loginIdLabel) loginIdLabel.textContent = '성명';
            if (loginIdInput) {
                loginIdInput.placeholder = '성명 (예: 홍길동)';
                if (loginIdInput.value === 'admin') loginIdInput.value = '';
            }
            if (passwordLabel) passwordLabel.textContent = '이메일';
            if (loginPasswordInput) {
                loginPasswordInput.placeholder = '이메일 (예: gildong@atec.kr)';
                loginPasswordInput.type = 'email';
            }
        } else if (role === 'admin') {
            if (roleAdminBtn) roleAdminBtn.classList.add('active');
            if (loginIdLabel) loginIdLabel.textContent = '관리자 ID';
            if (loginIdInput) {
                loginIdInput.placeholder = 'admin';
                loginIdInput.value = 'admin';
            }
            if (passwordLabel) passwordLabel.textContent = '비밀번호';
            if (loginPasswordInput) {
                loginPasswordInput.placeholder = '관리자 비밀번호';
                loginPasswordInput.type = 'password';
            }
        }
    }

    setRole('evaluator');

    if (roleEvaluatorBtn) roleEvaluatorBtn.addEventListener('click', () => setRole('evaluator'));
    if (roleVoterBtn) roleVoterBtn.addEventListener('click', () => setRole('voter'));
    if (roleAdminBtn) roleAdminBtn.addEventListener('click', () => setRole('admin'));

    // 로그인 및 헤더 버튼
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.addEventListener('click', onLoginSubmit);

    if (loginPasswordInput) {
        loginPasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') onLoginSubmit();
        });
    }

    // 대회 연도 선택 컨트롤러 (2026년 진행 / 2025년 아카이브)
    const yearSelector = document.getElementById('year-selector');
    if (yearSelector) {
        yearSelector.addEventListener('change', (e) => {
            const selectedYear = parseInt(e.target.value, 10);
            handleResetCeremony();
            broadcastCeremonyAction('SET_YEAR', { year: selectedYear });
            switchYear(selectedYear, () => {
                render();
            });
        });
    }

    const returnTo2026Btn = document.getElementById('return-to-2026-btn');
    if (returnTo2026Btn) {
        returnTo2026Btn.addEventListener('click', () => {
            if (yearSelector) yearSelector.value = '2026';
            handleResetCeremony();
            broadcastCeremonyAction('SET_YEAR', { year: 2026 });
            switchYear(2026, () => {
                render();
            });
        });
    }

    const simulationBtn = document.getElementById('simulationBtn');
    if (simulationBtn) {
        simulationBtn.addEventListener('click', async () => {
            if (appState.isArchiveMode()) {
                showMessage("과거 아카이브(2025년) 모드에서는 시뮬레이션을 실행할 수 없습니다. 2026년 대회 모드로 전환해 주세요.");
                return;
            }
            simulationBtn.disabled = true;
            simulationBtn.textContent = '시뮬레이션 진행 중...';
            try {
                await runSimulation();
                simulationBtn.textContent = '시뮬레이션 완료';
                render();
                showMessage('가상 평가자 6명의 점수와 가상 투표자 투표가 성공적으로 생성되었습니다. 각 탭의 결과를 확인하세요.');
            } catch (err) {
                console.error("Simulation error:", err);
                showMessage('시뮬레이션 중 오류가 발생했습니다: ' + err.message);
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
        saveLogoutBtn.addEventListener('click', async () => {
            saveLogoutBtn.disabled = true;
            saveLogoutBtn.textContent = '저장 및 로그아웃 중...';
            try {
                await flushPendingSaves();
            } catch (e) {
                console.warn("Flush before logout error:", e);
            }
            await logout();
        });
    }

    const resetSimBtn = document.getElementById('resetSimBtn');
    if (resetSimBtn) {
        resetSimBtn.addEventListener('click', () => {
            if (appState.isArchiveMode()) {
                showMessage("과거 아카이브(2025년) 모드에서는 시뮬레이션 데이터를 초기화할 수 없습니다.");
                return;
            }
            showMessage('모든 시뮬레이션 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.', true, async () => {
                resetSimBtn.disabled = true;
                resetSimBtn.textContent = '초기화 중...';
                try {
                    await resetSimulationData();
                    render();
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
            if (appState.isArchiveMode()) {
                showMessage("과거 아카이브(2025년) 모드에서는 데이터를 초기화할 수 없습니다. 과거 기록은 영구 보존됩니다.");
                return;
            }
            showMessage('모든 평가 및 투표 데이터를 영구적으로 삭제하시겠습니까? 삭제 전 데이터가 CSV 파일로 자동 저장됩니다.', true, async () => {
                exportToCSV(appState.allScores, appState.excellentPresenterSelections);
                fullResetBtn.disabled = true;
                fullResetBtn.textContent = '삭제 중...';
                try {
                    await resetAllData();
                    render();
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
            const btn = e.target.closest('button[data-tab]');
            if (btn) {
                appState.setActiveTab(btn.dataset.tab);
                document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
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
                if (appState.isArchiveMode()) {
                    showMessage("과거 아카이브(2025년) 모드에서는 투표를 제출할 수 없습니다.");
                    return;
                }
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
                if (appState.isArchiveMode()) {
                    e.preventDefault();
                    showMessage("과거 아카이브(2025년) 모드에서는 투표를 변경할 수 없습니다.");
                    return;
                }
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
                const selectedCat = appState.selectedPresentationCategory || appState.getFirstCategory();
                downloadChartAsPNG('presentation-chart', `${selectedCat}_presentation_result.png`);
            }

            // 레이더 차트 이미지 저장
            if (e.target.closest('#download-radar-chart-btn')) {
                const selectedCat = appState.selectedPresentationCategory || appState.getFirstCategory();
                downloadChartAsPNG('radar-analysis-chart', `${selectedCat}_radar_analysis.png`);
            }

            // 시상식 다음 공개 버튼
            if (e.target.closest('#next-reveal-btn')) {
                handleNextReveal();
            }

            // 시상식 초기화 버튼
            if (e.target.closest('#reset-ceremony-btn')) {
                handleResetCeremony();
            }

            // 시상식 사운드 효과음 토글 버튼
            const soundBtn = e.target.closest('#toggle-ceremony-sound-btn');
            if (soundBtn) {
                const isMuted = await soundEngine.toggleMute();
                soundBtn.className = `h-9 text-xs md:text-sm font-semibold px-3 ${isMuted ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} rounded-lg transition shadow-sm flex items-center justify-center gap-1 flex-shrink-0 whitespace-nowrap`;
                soundBtn.innerHTML = `<span>${isMuted ? '🔇 음소거' : '🔊 효과음 ON'}</span>`;
            }

            // 시상식 별도 창 열기 버튼 (듀얼모니터/빔프로젝터용)
            if (e.target.closest('#open-ceremony-window-btn')) {
                window.open(
                    './ceremony.html',
                    'AwardCeremonyPopout',
                    'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
                );
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

            // 최종 결과: 훈격 확정 저장 (시상식 및 종합결과 동기화)
            if (e.target.closest('#save-final-awards-btn')) {
                if (appState.isArchiveMode() || !appState.finalResultsData) return;
                const overrides = {};
                Object.keys(appState.finalResultsData).forEach(cat => {
                    (appState.finalResultsData[cat] || []).forEach(p => {
                        overrides[p.id] = {
                            awardId: p.awardId || (p.award === '-' ? '-' : ''),
                            award: p.award || '-',
                            note: p.awardNote || '',
                            tier: p.awardTier || ''
                        };
                    });
                });
                try {
                    await saveAwardOverrides(overrides);
                    appState.setAwardOverrides(overrides);
                    broadcastCeremonyAction('AWARD_OVERRIDES_UPDATED', { overrides });
                    render();
                    showMessage("최종 훈격 및 특별상 지정 내역이 확정 저장되었으며, 종합 결과 및 시상식 무대 화면에 즉시 동기화되었습니다.");
                } catch (err) {
                    console.error("Save final awards error:", err);
                    showMessage("훈격 확정 저장 중 오류가 발생했습니다: " + err.message);
                }
            }

            // 최종 결과: 점수 순위대로 자동 재산정
            if (e.target.closest('#reset-final-awards-btn')) {
                if (appState.isArchiveMode()) return;
                showMessage('수동 지정한 훈격을 해제하고 종합점수 순위 기준으로 자동 재산정하시겠습니까?', true, async () => {
                    try {
                        await saveAwardOverrides({});
                        appState.setAwardOverrides({});
                        appState.resetFinalResultsCache();
                        broadcastCeremonyAction('AWARD_OVERRIDES_UPDATED', { overrides: {} });
                        render();
                        showMessage("종합점수 순위 기준으로 훈격이 자동 재산정되었습니다.");
                    } catch (err) {
                        console.error("Reset final awards error:", err);
                        showMessage("자동 재산정 초기화 중 오류가 발생했습니다: " + err.message);
                    }
                });
            }

            // 설정 저장 버튼
            if (e.target.closest('#save-config-btn')) {
                await handleSaveConfig();
                render();
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
                syncSettingsFormToState();
                const category = e.target.dataset.category;
                const existingIds = new Set((appState.presenters[category] || []).map(p => p.id));
                let nextNum = (appState.presenters[category]?.length || 0) + 1;
                const prefix = category === 'technology' ? 'tech' : category;
                let newId = `${prefix}-${nextNum}`;
                while (existingIds.has(newId)) {
                    nextNum++;
                    newId = `${prefix}-${nextNum}`;
                }
                const labelPrefix = CATEGORY_DISPLAY_NAMES[category] || category;
                appState.presenters[category].push({ id: newId, name: `${labelPrefix}과제 ${nextNum}` });
                render();
            }

            // 발표자 삭제 버튼
            if (e.target.classList.contains('delete-presenter-btn')) {
                syncSettingsFormToState();
                const category = e.target.dataset.category;
                const index = parseInt(e.target.dataset.index, 10);
                if (appState.presenters[category].length <= 1) {
                    showMessage("최소 1명 이상의 발표자가 등록되어 있어야 합니다.");
                    return;
                }
                appState.presenters[category].splice(index, 1);
                render();
            }

            // 배점 기준 항목 추가 버튼
            if (e.target.classList.contains('add-criterion-btn')) {
                syncSettingsFormToState();
                const category = e.target.dataset.category;
                const nextIdx = (appState.evaluationCriteria[category]?.length || 0) + 1;
                const newKey = `${category}_custom_${Date.now().toString(36)}`;
                appState.evaluationCriteria[category].push({
                    key: newKey,
                    name: `신규 평가항목 ${nextIdx}`,
                    max: 0
                });
                render();
            }

            // 배점 기준 항목 삭제 버튼
            if (e.target.classList.contains('delete-criterion-btn')) {
                syncSettingsFormToState();
                const category = e.target.dataset.category;
                const index = parseInt(e.target.dataset.index, 10);
                if (appState.evaluationCriteria[category].length <= 1) {
                    showMessage("최소 1개 이상의 평가 항목이 존재해야 합니다.");
                    return;
                }
                appState.evaluationCriteria[category].splice(index, 1);
                render();
            }
        });

        // 변경 이벤트 (드롭다운)
        tabContent.addEventListener('change', (e) => {
            if (e.target.id === 'ceremony-category-select') {
                appState.setPresentationCategory(e.target.value);
                broadcastCeremonyAction('SET_CATEGORY', { category: e.target.value });
                handleResetCeremony();
                render();
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

            if (e.target.classList.contains('final-award-select')) {
                const tr = e.target.closest('tr');
                if (!tr || !appState.finalResultsData) return;
                const category = tr.dataset.category;
                const index = parseInt(tr.dataset.index, 10);
                const selectedAwardId = e.target.value;
                const targetItem = appState.finalResultsData[category]?.[index];
                if (!targetItem) return;

                if (selectedAwardId === '-') {
                    targetItem.award = '-';
                    targetItem.awardId = '-';
                    targetItem.awardTier = '';
                    targetItem.awardNote = '';
                } else {
                    const matchedSlot = (AWARD_SLOTS_2026[category] || []).find(s => s.awardId === selectedAwardId);
                    if (matchedSlot) {
                        targetItem.award = matchedSlot.award;
                        targetItem.awardId = matchedSlot.awardId;
                        targetItem.awardTier = matchedSlot.tier;
                        targetItem.awardNote = matchedSlot.note || '';
                    }
                }

                const noteEl = tr.querySelector('.final-award-note');
                if (noteEl) noteEl.textContent = targetItem.awardNote || '';
            }
        });

        // 입력 이벤트 (점수 및 심사평 코멘트 입력)
        tabContent.addEventListener('input', (e) => {
            if (appState.isArchiveMode()) {
                e.preventDefault();
                return;
            }

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

            // 설정 관리 배점 입력 시 합계 실시간 표시 업데이트
            if (e.target.classList.contains('criterion-max-input')) {
                const card = e.target.closest('div.border-slate-200.rounded-xl');
                if (card) {
                    const inputs = card.querySelectorAll('.criterion-max-input');
                    let sum = 0;
                    inputs.forEach(inp => { sum += parseInt(inp.value, 10) || 0; });
                    const badge = card.querySelector('span.rounded');
                    if (badge) {
                        badge.textContent = `총 ${sum}점`;
                        badge.className = `text-xs font-bold px-2.5 py-0.5 rounded whitespace-nowrap ${sum === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`;
                    }
                }
            }
        });

        // 포커스 아웃 이벤트 (관리자 최종 결과 점수/훈격 수정 반영)
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
                } else if (e.target.classList.contains('final-award-cell')) {
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
