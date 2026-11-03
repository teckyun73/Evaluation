/**
 * results.js
 * 종합 결과(순위, 평균점수, 투표점수, 훈격/특별상 및 차트) 렌더링 모듈
 */

import { CATEGORY_DISPLAY_NAMES, CATEGORY_METADATA, INTRO_TEXTS } from '../../config/constants.js';
import { appState } from '../../state/appState.js';
import { calculateResults } from '../../utils/calculator.js';
import { renderResultsCharts } from '../chartManager.js';

function renderAwardBadge(p) {
    const award = p.award || '-';
    if (award === '-') {
        return `<span class="text-slate-400 font-medium">-</span>`;
    }

    let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    if (award === '최우수') {
        badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
    } else if (award === '우수') {
        badgeClass = 'bg-sky-100 text-sky-800 border-sky-300';
    } else if (award === '장려') {
        badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (award.startsWith('특별상')) {
        badgeClass = 'bg-purple-100 text-purple-800 border-purple-300';
    }

    return `
        <div class="flex flex-col items-start gap-0.5">
            <span class="inline-block text-xs font-extrabold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${badgeClass}">
                ${award}
            </span>
            ${p.awardNote ? `<span class="text-[11px] text-slate-400 font-medium whitespace-nowrap">${p.awardNote}</span>` : ''}
        </div>
    `;
}

export function renderResults() {
    const presenters = appState.presenters;
    const criteria = appState.evaluationCriteria;
    const results = calculateResults(presenters, criteria, appState.allScores, appState.excellentPresenterSelections);

    const introText = appState.isArchiveMode() ? (INTRO_TEXTS.results_2025 || INTRO_TEXTS.results) : INTRO_TEXTS.results;
    let introHTML = `<div class="p-4 mb-6 bg-sky-50 border border-sky-200 rounded-xl text-slate-700 text-sm md:text-base"><p>${introText}</p></div>`;
    let contentHTML = `<div class="grid grid-cols-1 xl:grid-cols-12 gap-8">`;

    // 왼쪽: 부문별 훈격 테이블 (7 cols)
    contentHTML += `
        <div class="xl:col-span-7">
            <h2 class="text-2xl font-bold mb-4 text-slate-800">부문별 훈격 및 종합 순위</h2>
            <div class="overflow-x-auto bg-white rounded-xl shadow border border-slate-200">
                <table class="w-full text-sm text-left text-slate-500">
                    <thead class="text-xs text-slate-700 uppercase bg-slate-100">
                        <tr>
                            <th class="px-4 py-3 whitespace-nowrap">부문</th>
                            <th class="px-3 py-3 text-center whitespace-nowrap">순위</th>
                            <th class="px-4 py-3 whitespace-nowrap">발표자</th>
                            <th class="px-3 py-3 text-right whitespace-nowrap">평균점수</th>
                            <th class="px-3 py-3 text-right whitespace-nowrap">투표점수</th>
                            <th class="px-3 py-3 text-right whitespace-nowrap">종합점수</th>
                            <th class="px-4 py-3 whitespace-nowrap">훈격 / 포상</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    Object.keys(results).forEach(category => {
        const meta = CATEGORY_METADATA[category] || {};
        results[category].forEach((p, index) => {
            contentHTML += `
                <tr class="bg-white border-b hover:bg-slate-50/70 transition">
                    ${index === 0 ? `
                        <td class="px-4 py-4 font-bold text-slate-900 bg-slate-50/60 border-r border-slate-100 whitespace-nowrap" rowspan="${results[category].length}">
                            <div>${meta.icon ? `${meta.icon} ` : ''}${CATEGORY_DISPLAY_NAMES[category] || category}</div>
                            <div class="text-[11px] font-normal text-slate-400 mt-0.5">총 ${results[category].length}건</div>
                        </td>
                    ` : ''}
                    <td class="px-3 py-3.5 text-center font-bold text-slate-500">${index + 1}위</td>
                    <td class="px-4 py-3.5 font-semibold text-slate-900 whitespace-nowrap">${p.name}</td>
                    <td class="px-3 py-3.5 text-right">${p.score.toFixed(2)}</td>
                    <td class="px-3 py-3.5 text-right">${p.voteScore}</td>
                    <td class="px-3 py-3.5 text-right font-extrabold text-blue-600">${p.totalScore.toFixed(2)}</td>
                    <td class="px-4 py-3">${renderAwardBadge(p)}</td>
                </tr>
            `;
        });
    });

    contentHTML += `</tbody></table></div></div>`;

    // 오른쪽: 부문별 차트 (5 cols)
    contentHTML += `
        <div class="xl:col-span-5">
            <h2 class="text-2xl font-bold mb-4 text-slate-800">부문별 점수 차트</h2>
            <div class="space-y-6">
    `;

    Object.keys(presenters).forEach(category => {
        const meta = CATEGORY_METADATA[category] || {};
        const chartHeight = Math.max(200, presenters[category].length * 38 + 60);
        contentHTML += `
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="font-bold text-slate-800">${meta.icon ? `${meta.icon} ` : ''}${CATEGORY_DISPLAY_NAMES[category] || category} 부문 종합점수</h3>
                    <button class="download-single-chart-btn text-xs text-slate-500 hover:text-sky-600 px-2.5 py-1 bg-slate-50 hover:bg-sky-50 rounded border border-slate-200 transition" data-canvas-id="${category}-chart" data-filename="${category}_results.png">
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
