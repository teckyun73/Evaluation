/**
 * results.js
 * 종합 결과(순위, 평균점수, 투표점수, 훈격 및 차트) 렌더링 모듈
 */

import { CATEGORY_DISPLAY_NAMES, INTRO_TEXTS } from '../../config/constants.js';
import { appState } from '../../state/appState.js';
import { calculateResults } from '../../utils/calculator.js';
import { renderResultsCharts } from '../chartManager.js';

export function renderResults() {
    const presenters = appState.presenters;
    const criteria = appState.evaluationCriteria;
    const results = calculateResults(presenters, criteria, appState.allScores, appState.excellentPresenterSelections);

    let introHTML = `<div class="p-4 mb-6 bg-sky-50 border border-sky-200 rounded-lg text-slate-700"><p>${INTRO_TEXTS.results}</p></div>`;
    let contentHTML = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">`;
    
    // 왼쪽: 부문별 훈격 테이블
    contentHTML += `
        <div>
            <h2 class="text-2xl font-bold mb-4 text-slate-800">부문별 훈격</h2>
            <div class="overflow-x-auto bg-white rounded-lg shadow">
                <table class="w-full text-sm text-left text-slate-500">
                    <thead class="text-xs text-slate-700 uppercase bg-slate-100">
                        <tr>
                            <th class="px-6 py-3">부문</th>
                            <th class="px-6 py-3">발표자</th>
                            <th class="px-6 py-3">평균점수</th>
                            <th class="px-6 py-3">투표점수</th>
                            <th class="px-6 py-3">종합점수</th>
                            <th class="px-6 py-3">훈격</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    Object.keys(results).forEach(category => {
        results[category].forEach((p, index) => {
            contentHTML += `
                <tr class="bg-white border-b">
                    ${index === 0 ? `<td class="px-6 py-4 font-semibold" rowspan="${results[category].length}">${CATEGORY_DISPLAY_NAMES[category] || category}</td>` : ''}
                    <td class="px-6 py-4 font-medium text-slate-900">${p.name}</td>
                    <td class="px-6 py-4">${p.score.toFixed(2)}</td>
                    <td class="px-6 py-4">${p.voteScore}</td>
                    <td class="px-6 py-4 font-bold text-blue-600">${p.totalScore.toFixed(2)}</td>
                    <td class="px-6 py-4 font-bold ${p.award === '최우수' ? 'text-amber-500' : p.award === '우수' ? 'text-sky-500' : 'text-slate-600'}">${p.award}</td>
                </tr>
            `;
        });
    });

    contentHTML += `</tbody></table></div></div>`;

    // 오른쪽: 부문별 차트 (이미지 다운로드 버튼 포함)
    contentHTML += `
        <div>
            <h2 class="text-2xl font-bold mb-4 text-slate-800">부문별 점수 차트</h2>
            <div class="space-y-8">
    `;

    Object.keys(presenters).forEach(category => {
        const chartHeight = presenters[category].length * 40 + 40;
        contentHTML += `
            <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="font-semibold text-slate-800">${CATEGORY_DISPLAY_NAMES[category] || category} 종합점수</h3>
                    <button class="download-single-chart-btn text-xs text-slate-500 hover:text-sky-600 px-2 py-1 bg-slate-50 hover:bg-sky-50 rounded border border-slate-200 transition" data-canvas-id="${category}-chart" data-filename="${category}_results.png">
                        📷 차트 저장
                    </button>
                </div>
                <div class="chart-container mx-auto" style="height:${chartHeight}px">
                    <canvas id="${category}-chart"></canvas>
                </div>
            </div>
        `;
    });

    contentHTML += `</div></div></div>`;

    setTimeout(() => {
        renderResultsCharts(results);
    }, 0);

    return introHTML + contentHTML;
}
