/**
 * finalResults.js
 * 관리자 최종 결과 수정 및 반영 렌더링 모듈
 */

import { CATEGORY_DISPLAY_NAMES, INTRO_TEXTS } from '../../config/constants.js';
import { appState } from '../../state/appState.js';
import { calculateResults } from '../../utils/calculator.js';
import { renderFinalResultsCharts } from '../chartManager.js';

export function initializeFinalResultsData() {
    if (!appState.finalResultsData) {
        const computed = calculateResults(
            appState.presenters, 
            appState.evaluationCriteria, 
            appState.allScores, 
            appState.excellentPresenterSelections
        );
        appState.finalResultsData = JSON.parse(JSON.stringify(computed));
    }
}

export function renderFinalResults() {
    initializeFinalResultsData();
    const finalData = appState.finalResultsData;
    const presenters = appState.presenters;

    let introHTML = `<div class="p-4 mb-6 bg-amber-50 border border-amber-200 rounded-lg text-slate-700"><p>${INTRO_TEXTS.final_results}</p></div>`;
    let contentHTML = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">`;
    
    // 왼쪽: 수정 가능한 결과 테이블
    contentHTML += `
        <div>
            <h2 class="text-2xl font-bold mb-4 text-slate-800">부문별 훈격 (수정 가능)</h2>
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

    Object.keys(finalData).forEach(category => {
        finalData[category].forEach((p, index) => {
            const presenterOptions = (presenters[category] || [])
                .map(option => `<option value="${option.id}" ${option.id === p.id ? 'selected' : ''}>${option.name}</option>`)
                .join('');

            contentHTML += `
                <tr class="bg-white border-b" data-category="${category}" data-index="${index}">
                    ${index === 0 ? `<td class="px-6 py-4 font-semibold" rowspan="${finalData[category].length}">${CATEGORY_DISPLAY_NAMES[category]}</td>` : ''}
                    <td class="px-6 py-4">
                        <select class="final-presenter-select bg-white border border-slate-300 rounded-md p-1 w-full">
                            ${presenterOptions}
                        </select>
                    </td>
                    <td class="px-6 py-4 final-score-cell" contenteditable="true">${p.score.toFixed(2)}</td>
                    <td class="px-6 py-4 final-vote-score-cell" contenteditable="true">${p.voteScore}</td>
                    <td class="px-6 py-4 final-total-score-cell font-bold text-blue-600">${p.totalScore.toFixed(2)}</td>
                    <td class="px-6 py-4 final-award-cell font-bold" contenteditable="true">${p.award}</td>
                </tr>
            `;
        });
    });

    contentHTML += `</tbody></table></div></div>`;

    // 오른쪽: 수정 반영 차트
    contentHTML += `
        <div>
            <h2 class="text-2xl font-bold mb-4 text-slate-800">부문별 점수 차트 (수정 반영)</h2>
            <div class="space-y-8">
    `;

    Object.keys(presenters).forEach(category => {
        const chartHeight = presenters[category].length * 40 + 40;
        contentHTML += `
            <div>
                <h3 class="font-semibold mb-2">${CATEGORY_DISPLAY_NAMES[category] || category} 종합 점수</h3>
                <div class="chart-container mx-auto" style="height:${chartHeight}px">
                    <canvas id="final-${category}-chart"></canvas>
                </div>
            </div>
        `;
    });

    contentHTML += `</div></div></div>`;

    setTimeout(() => {
        renderFinalResultsCharts(finalData);
    }, 0);

    return introHTML + contentHTML;
}
