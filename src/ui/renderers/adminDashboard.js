/**
 * adminDashboard.js
 * 관리자 전용 실시간 진척도 모니터링 대시보드 컴포넌트
 */

import { CATEGORY_DISPLAY_NAMES } from '../../config/constants.js';
import { appState } from '../../state/appState.js';
import { getUniqueEvaluators } from '../../utils/calculator.js';

export function renderAdminDashboard() {
    const presenters = appState.presenters;
    const evaluators = getUniqueEvaluators(appState.allScores);
    const totalEvaluatorCount = evaluators.length || 0;
    
    // 부문별 평가 제출 현황 집계
    const categorySubmissions = {};
    Object.keys(presenters).forEach(cat => {
        let count = 0;
        Object.values(appState.allSubmissions).forEach(sub => {
            if (sub && sub[cat] === true) {
                count++;
            }
        });
        categorySubmissions[cat] = count;
    });

    // 투표자 제출 현황 집계
    const totalVotersTarget = appState.eventInfo?.TOTAL_VOTERS || 200;
    const voterSubmittedCount = Object.values(appState.excellentPresenterSelections).filter(s => s && s.submitted === true).length;
    const voterProgressPercent = totalVotersTarget > 0 ? Math.min(100, Math.round((voterSubmittedCount / totalVotersTarget) * 100)) : 0;

    let html = `
        <div id="admin-dashboard-container" class="mb-8 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div class="flex items-center gap-2">
                    <svg class="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                    <h3 class="text-base md:text-lg font-bold text-slate-800">
                        실시간 행사 진행 현황 대시보드
                    </h3>
                </div>
                <div class="flex items-center gap-2">
                    <button id="unlock-sessions-btn" class="text-xs font-semibold px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition border border-amber-300 flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
                        투표자 세션 일괄 해제
                    </button>
                    <span class="text-xs font-semibold px-2.5 py-1.5 bg-sky-100 text-sky-700 rounded-lg">실시간 동기화 중</span>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <!-- 투표자 참여율 카드 -->
                <div class="admin-card lg:col-span-1 border-emerald-200 bg-emerald-50/40">
                    <div class="text-xs font-medium text-slate-500 mb-1">투표자 참여 현황</div>
                    <div class="flex items-baseline justify-between mb-2">
                        <span class="text-2xl font-bold text-emerald-600">${voterSubmittedCount}명</span>
                        <span class="text-xs font-semibold text-slate-500">/ ${totalVotersTarget}명 (${voterProgressPercent}%)</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill bg-emerald-500" style="width: ${voterProgressPercent}%;"></div>
                    </div>
                </div>
    `;

    // 4개 부문별 평가자 제출율 카드
    Object.keys(presenters).forEach(category => {
        const submittedCount = categorySubmissions[category] || 0;
        const evalProgressPercent = totalEvaluatorCount > 0 ? Math.min(100, Math.round((submittedCount / totalEvaluatorCount) * 100)) : 0;

        html += `
            <div class="admin-card">
                <div class="text-xs font-medium text-slate-500 mb-1">${CATEGORY_DISPLAY_NAMES[category]} 부문 제출</div>
                <div class="flex items-baseline justify-between mb-2">
                    <span class="text-2xl font-bold text-sky-600">${submittedCount}명</span>
                    <span class="text-xs font-semibold text-slate-500">/ ${totalEvaluatorCount}명 (${evalProgressPercent}%)</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill bg-sky-500" style="width: ${evalProgressPercent}%;"></div>
                </div>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    return html;
}
