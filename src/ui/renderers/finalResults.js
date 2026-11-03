/**
 * finalResults.js
 * 관리자 최종 결과 확인, 후원 특별상/훈격 지정 드롭다운 및 시상식 실시간 동기화 모듈
 */

import { CATEGORY_DISPLAY_NAMES, CATEGORY_METADATA, INTRO_TEXTS, AWARD_SLOTS_2026 } from '../../config/constants.js';
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
    const isArchive = appState.isArchiveMode();
    const finalData = appState.finalResultsData;
    const presenters = appState.presenters;
    const hasCustomOverrides = !isArchive && appState.awardOverrides && Object.keys(appState.awardOverrides).length > 0;

    let introHTML = `
        <div class="p-4 mb-6 bg-amber-50 border border-amber-200 rounded-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div class="text-slate-700 text-sm md:text-base">
                <div class="flex items-center gap-2 mb-1">
                    <span class="font-extrabold text-amber-900">🏅 최종 훈격 및 특별상 확정 관리</span>
                    ${hasCustomOverrides ? `<span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">수동 지정 훈격 적용 중</span>` : `<span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">종합점수 순위 자동 배정 기준</span>`}
                </div>
                <p>${INTRO_TEXTS.final_results}</p>
            </div>
            ${!isArchive ? `
            <div class="flex flex-wrap items-center gap-2 flex-shrink-0">
                <button id="reset-final-awards-btn" class="text-xs md:text-sm font-semibold px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg shadow-xs transition whitespace-nowrap">
                    ↺ 점수 순위대로 자동 재산정
                </button>
                <button id="save-final-awards-btn" class="text-xs md:text-sm font-bold px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition whitespace-nowrap">
                    💾 훈격 확정 저장 (시상식 동기화)
                </button>
            </div>
            ` : ''}
        </div>
    `;

    let contentHTML = `<div class="grid grid-cols-1 xl:grid-cols-12 gap-8">`;

    // 왼쪽: 수정 가능한 결과 테이블 (7 cols)
    contentHTML += `
        <div class="xl:col-span-7">
            <h2 class="text-2xl font-bold mb-4 text-slate-800">부문별 훈격 ${isArchive ? '(조회 전용)' : '(수정 및 특별상 지정 가능)'}</h2>
            <div class="overflow-x-auto bg-white rounded-xl shadow border border-slate-200">
                <table class="w-full text-sm text-left text-slate-500">
                    <thead class="text-xs text-slate-700 uppercase bg-slate-100">
                        <tr>
                            <th class="px-4 py-3 whitespace-nowrap">부문</th>
                            <th class="px-4 py-3 whitespace-nowrap">발표자</th>
                            <th class="px-3 py-3 text-right whitespace-nowrap">평균점수</th>
                            <th class="px-3 py-3 text-right whitespace-nowrap">투표점수</th>
                            <th class="px-3 py-3 text-right whitespace-nowrap">종합점수</th>
                            <th class="px-4 py-3 whitespace-nowrap">훈격 / 특별상 지정</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    Object.keys(finalData).forEach(category => {
        const meta = CATEGORY_METADATA[category] || {};
        const categoryAwardSlots = AWARD_SLOTS_2026[category] || null;

        finalData[category].forEach((p, index) => {
            const presenterOptions = (presenters[category] || [])
                .map(option => `<option value="${option.id}" ${option.id === p.id ? 'selected' : ''}>${option.name}</option>`)
                .join('');

            let awardCellInner = '';
            if (categoryAwardSlots && !isArchive) {
                const slotOptions = categoryAwardSlots.map(slot => {
                    const isSelected = p.awardId
                        ? p.awardId === slot.awardId
                        : (p.award === slot.award && (!p.awardNote || p.awardNote === slot.note));
                    return `<option value="${slot.awardId}" ${isSelected ? 'selected' : ''}>${slot.selectLabel}</option>`;
                }).join('');

                awardCellInner = `
                    <select class="final-award-select bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs md:text-sm font-bold text-slate-800 w-full min-w-[230px] focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="-" ${(!p.award || p.award === '-') ? 'selected' : ''}>- (수상 제외)</option>
                        ${slotOptions}
                    </select>
                    ${p.awardNote ? `<div class="final-award-note text-[11px] text-slate-400 mt-1">${p.awardNote}</div>` : `<div class="final-award-note text-[11px] text-slate-400 mt-1"></div>`}
                `;
            } else {
                awardCellInner = `<span class="final-award-cell font-bold" ${isArchive ? '' : 'contenteditable="true"'}>${p.award}</span>`;
            }

            contentHTML += `
                <tr class="bg-white border-b hover:bg-slate-50/60" data-category="${category}" data-index="${index}">
                    ${index === 0 ? `<td class="px-4 py-4 font-bold text-slate-900 bg-slate-50/60 border-r border-slate-100 whitespace-nowrap" rowspan="${finalData[category].length}">${meta.icon ? `${meta.icon} ` : ''}${CATEGORY_DISPLAY_NAMES[category] || category}</td>` : ''}
                    <td class="px-4 py-3">
                        <select class="final-presenter-select bg-white border border-slate-300 rounded-md p-1.5 text-xs md:text-sm font-medium text-slate-800 w-full min-w-[120px]" ${isArchive ? 'disabled' : ''}>
                            ${presenterOptions}
                        </select>
                    </td>
                    <td class="px-3 py-3 text-right final-score-cell" ${isArchive ? '' : 'contenteditable="true"'}>${p.score.toFixed(2)}</td>
                    <td class="px-3 py-3 text-right final-vote-score-cell" ${isArchive ? '' : 'contenteditable="true"'}>${p.voteScore}</td>
                    <td class="px-3 py-3 text-right final-total-score-cell font-extrabold text-blue-600">${p.totalScore.toFixed(2)}</td>
                    <td class="px-4 py-3">${awardCellInner}</td>
                </tr>
            `;
        });
    });

    contentHTML += `</tbody></table></div></div>`;

    // 오른쪽: 수정 반영 차트 (5 cols)
    contentHTML += `
        <div class="xl:col-span-5">
            <h2 class="text-2xl font-bold mb-4 text-slate-800">부문별 점수 차트 (수정 반영)</h2>
            <div class="space-y-6">
    `;

    Object.keys(presenters).forEach(category => {
        const meta = CATEGORY_METADATA[category] || {};
        const chartHeight = Math.max(200, presenters[category].length * 38 + 60);
        contentHTML += `
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 class="font-bold text-slate-800 mb-2">${meta.icon ? `${meta.icon} ` : ''}${CATEGORY_DISPLAY_NAMES[category] || category} 부문 종합 점수</h3>
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
