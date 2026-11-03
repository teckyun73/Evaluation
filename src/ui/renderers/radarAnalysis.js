/**
 * radarAnalysis.js
 * 부문별 세부 평가항목 득점률 다차원 역량 분석 레이더 차트 뷰 (6축 정육각형 밸런스 지원)
 */

import { CATEGORY_DISPLAY_NAMES, CATEGORY_METADATA } from '../../config/constants.js';
import { appState } from '../../state/appState.js';
import { renderRadarChart } from '../chartManager.js';

export function renderRadarAnalysis() {
    const presenters = appState.presenters;
    const criteria = appState.evaluationCriteria;
    const categories = Object.keys(presenters);
    const selectedCategory = categories.includes(appState.selectedPresentationCategory)
        ? appState.selectedPresentationCategory
        : appState.getFirstCategory();
    const categoryPresenters = presenters[selectedCategory] || [];
    const criteriaList = criteria[selectedCategory] || [];
    const meta = CATEGORY_METADATA[selectedCategory] || {};

    let html = `
        <div class="space-y-6">
            <div class="p-4 bg-sky-50 border border-sky-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 class="text-xl font-bold text-slate-800">다차원 평가항목 역량 분석 (Radar Chart)</h2>
                    <p class="text-sm text-slate-600 mt-0.5">부문별 세부 평가항목(AI 활용 역량 포함)의 100점 만점 환산 득점율(%)을 방사형 차트로 비교 분석합니다.</p>
                </div>
                <div class="flex items-center gap-3">
                    <select id="radar-category-select" class="px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
    `;

    categories.forEach(cat => {
        const cMeta = CATEGORY_METADATA[cat] || {};
        html += `<option value="${cat}" ${cat === selectedCategory ? 'selected' : ''}>${cMeta.icon ? `${cMeta.icon} ` : ''}${CATEGORY_DISPLAY_NAMES[cat] || cat} 부문</option>`;
    });

    html += `
                    </select>
                    <button id="download-radar-chart-btn" class="text-xs font-semibold px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-300 shadow-sm transition flex items-center gap-1.5">
                        <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        차트 이미지 저장
                    </button>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow p-6 border border-slate-100">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                    <div>
                        <h3 class="text-lg font-bold text-slate-800">${meta.icon ? `${meta.icon} ` : ''}${CATEGORY_DISPLAY_NAMES[selectedCategory] || selectedCategory} 부문 세부 항목별 득점률 분석</h3>
                        ${meta.jobScope ? `<p class="text-xs text-slate-500 mt-0.5">${meta.jobScope}</p>` : ''}
                    </div>
                    <span class="text-xs text-slate-400 font-medium">각 축: 배점 대비 평균 획득률 (0% ~ 100%)</span>
                </div>
                <div class="chart-container mx-auto" style="height:560px; max-width:800px">
                    <canvas id="radar-analysis-chart"></canvas>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        renderRadarChart(selectedCategory, categoryPresenters, criteriaList, appState.allScores);
    }, 0);

    return html;
}
