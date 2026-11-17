/**
 * finalResults.js
 * 관리자 최종 결과 확인, 후원 특별상/훈격 지정 드롭다운, 최종 훈격 요약 섹션(PNG 저장/별도 창) 및 시상식 실시간 동기화 모듈
 */

import { CATEGORY_DISPLAY_NAMES, CATEGORY_METADATA, INTRO_TEXTS, AWARD_SLOTS_2026 } from '../../config/constants.js';
import { appState } from '../../state/appState.js';
import { calculateResults } from '../../utils/calculator.js';
import { renderFinalResultsCharts } from '../chartManager.js';

const awardsBoardChannel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('awards_board_sync_channel')
    : null;

export function broadcastAwardsBoardUpdate() {
    if (!awardsBoardChannel || !appState.finalResultsData) return;
    try {
        awardsBoardChannel.postMessage({
            action: 'FINAL_AWARDS_UPDATED',
            payload: {
                year: appState.currentYear,
                eventInfo: appState.eventInfo,
                finalResultsData: appState.finalResultsData
            }
        });
    } catch (e) {
        console.warn('Broadcast awards board update failed:', e);
    }
}

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

function getAwardBadgeStyleClass(award = '-') {
    if (!award || award === '-') {
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
    if (award === '최우수') {
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
    if (award === '우수') {
        return 'bg-sky-100 text-sky-800 border-sky-300';
    }
    if (award === '장려') {
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
    return 'bg-purple-100 text-purple-800 border-purple-300';
}

/**
 * '훈격 / 특별상' | '발표자' | '종합점수' 순서의 정리된 부문별 훈격 요약 카드 HTML 생성
 * (최종 결과 내 별도 요약 섹션 및 별도 창 awards-board.html 공용 렌더러)
 */
export function renderFinalAwardsBoardCardsHTML(finalData, options = {}) {
    if (!finalData) return '';
    const showCategoryPngBtn = options.showCategoryPngBtn !== false;
    const isStandalone = Boolean(options.isStandalone);

    const categories = Object.keys(finalData);
    const gridClass = categories.length === 1
        ? 'grid grid-cols-1 gap-6'
        : 'grid grid-cols-1 lg:grid-cols-2 gap-6';

    let html = `<div class="${gridClass}">`;

    categories.forEach(category => {
        const meta = CATEGORY_METADATA[category] || {};
        const displayName = CATEGORY_DISPLAY_NAMES[category] || category;
        const items = finalData[category] || [];
        const headerBg = category === 'technology'
            ? 'bg-indigo-50/80 border-indigo-100'
            : 'bg-sky-50/80 border-sky-100';

        html += `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div class="px-5 py-3.5 ${headerBg} border-b flex flex-wrap items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <span class="text-lg font-extrabold text-slate-900">
                            ${meta.icon ? `${meta.icon} ` : ''}${displayName} 부문
                        </span>
                        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                            총 ${items.length}건
                        </span>
                    </div>
                    ${showCategoryPngBtn ? `
                    <button type="button" class="download-category-awards-png-btn text-xs font-semibold px-2.5 py-1.5 bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-300 rounded-lg transition shadow-2xs flex items-center gap-1 whitespace-nowrap" data-category="${category}">
                        <span>📷</span>
                        <span>${displayName} PNG 저장</span>
                    </button>
                    ` : ''}
                </div>

                <div class="overflow-x-auto flex-1">
                    <table class="w-full text-left border-collapse ${isStandalone ? 'text-base' : 'text-sm'}">
                        <thead class="text-xs font-bold text-slate-600 uppercase bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th class="px-4 py-3 whitespace-nowrap">훈격 / 특별상</th>
                                <th class="px-4 py-3 whitespace-nowrap">발표자</th>
                                <th class="px-4 py-3 text-right whitespace-nowrap">종합점수</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
        `;

        items.forEach((p, idx) => {
            const awardLabel = p.award || '-';
            const badgeClass = getAwardBadgeStyleClass(awardLabel);
            const rowBg = idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white';

            html += `
                <tr class="${rowBg} hover:bg-sky-50/40 transition">
                    <td class="px-4 py-3 align-middle">
                        <div class="flex flex-col items-start gap-0.5">
                            <span class="inline-block ${isStandalone ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-0.5'} font-extrabold rounded-full border whitespace-nowrap ${badgeClass}">
                                ${awardLabel}
                            </span>
                            ${p.awardNote ? `<span class="text-[11px] text-slate-500 font-medium">${p.awardNote}</span>` : ''}
                        </div>
                    </td>
                    <td class="px-4 py-3 align-middle font-bold text-slate-900 whitespace-nowrap">
                        ${p.name || '-'}
                    </td>
                    <td class="px-4 py-3 align-middle text-right font-extrabold text-blue-600 tabular-nums whitespace-nowrap ${isStandalone ? 'text-lg' : 'text-base'}">
                        ${(Number(p.totalScore) || 0).toFixed(2)}
                    </td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    return html;
}

/**
 * 상단 편집 표 수정 시 별도 요약 섹션 DOM 즉시 갱신 및 별도 창 브로드캐스트
 */
export function updateFinalAwardsSummaryBoard() {
    const slot = document.getElementById('final-awards-summary-board');
    if (slot && appState.finalResultsData) {
        slot.innerHTML = renderFinalAwardsBoardCardsHTML(appState.finalResultsData, {
            showCategoryPngBtn: true
        });
    }
    broadcastAwardsBoardUpdate();
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

    // 왼쪽: 수정 가능한 결과 테이블 (8 cols — 드롭다운 잘림 방지)
    contentHTML += `
        <div class="xl:col-span-8">
            <h2 class="text-2xl font-bold mb-4 text-slate-800">부문별 훈격 ${isArchive ? '(조회 전용)' : '(수정 및 특별상 지정 가능)'}</h2>
            <div class="overflow-x-auto bg-white rounded-xl shadow border border-slate-200">
                <table class="w-full text-sm text-left text-slate-500">
                    <thead class="text-xs text-slate-700 uppercase bg-slate-100">
                        <tr>
                            <th class="px-3 py-3 whitespace-nowrap">부문</th>
                            <th class="px-3 py-3 whitespace-nowrap">발표자</th>
                            <th class="px-2.5 py-3 text-right whitespace-nowrap">평균점수</th>
                            <th class="px-2.5 py-3 text-right whitespace-nowrap">투표점수</th>
                            <th class="px-2.5 py-3 text-right whitespace-nowrap">종합점수</th>
                            <th class="px-3 py-3 whitespace-nowrap">훈격 / 특별상 지정</th>
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
                    <select class="final-award-select bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs md:text-sm font-bold text-slate-800 w-full min-w-[195px] focus:outline-none focus:ring-2 focus:ring-purple-500">
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
                    ${index === 0 ? `<td class="px-3 py-4 font-bold text-slate-900 bg-slate-50/60 border-r border-slate-100 whitespace-nowrap" rowspan="${finalData[category].length}">${meta.icon ? `${meta.icon} ` : ''}${CATEGORY_DISPLAY_NAMES[category] || category}</td>` : ''}
                    <td class="px-3 py-3">
                        <select class="final-presenter-select bg-white border border-slate-300 rounded-md p-1.5 text-xs md:text-sm font-medium text-slate-800 w-full min-w-[130px]" ${isArchive ? 'disabled' : ''}>
                            ${presenterOptions}
                        </select>
                    </td>
                    <td class="px-2.5 py-3 text-right final-score-cell" ${isArchive ? '' : 'contenteditable="true"'}>${p.score.toFixed(2)}</td>
                    <td class="px-2.5 py-3 text-right final-vote-score-cell" ${isArchive ? '' : 'contenteditable="true"'}>${p.voteScore}</td>
                    <td class="px-2.5 py-3 text-right final-total-score-cell font-extrabold text-blue-600">${p.totalScore.toFixed(2)}</td>
                    <td class="px-3 py-3">${awardCellInner}</td>
                </tr>
            `;
        });
    });

    contentHTML += `</tbody></table></div></div>`;

    // 오른쪽: 수정 반영 차트 (4 cols)
    contentHTML += `
        <div class="xl:col-span-4">
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

    // 하단 별도 섹션: 최종 훈격 확정 요약 보드 (훈격/특별상 -> 발표자 -> 종합점수 순서, PNG 저장 및 별도 창 보기 지원)
    const summarySectionHTML = `
        <section id="final-awards-summary-section" class="mt-10 pt-8 border-t-2 border-slate-200">
            <div class="bg-gradient-to-r from-slate-50 via-sky-50/70 to-indigo-50/70 border border-slate-200 rounded-2xl p-5 mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs">
                <div>
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                        <h2 class="text-xl md:text-2xl font-extrabold text-slate-900">📋 부문별 최종 훈격 확정 요약 보드</h2>
                        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">공유 · 보고 · 시상 발표용</span>
                    </div>
                    <p class="text-xs md:text-sm text-slate-600">
                        상단 표에서 수정한 내용이 실시간 반영되며, <strong>훈격 / 특별상 ➔ 발표자 ➔ 종합점수</strong> 순서로 깔끔하게 정리되어 <strong>PNG 그림파일 저장</strong> 및 <strong>별도 창(세션) 보기</strong>가 가능합니다.
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <button type="button" id="download-all-awards-png-btn" class="text-xs md:text-sm font-bold px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition flex items-center gap-1.5 whitespace-nowrap">
                        <span>🖼️</span>
                        <span>전체 훈격표 PNG 저장</span>
                    </button>
                    <button type="button" id="open-awards-board-window-btn" class="text-xs md:text-sm font-bold px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-sm transition flex items-center gap-1.5 whitespace-nowrap">
                        <span>🖥️</span>
                        <span>별도 창(세션)으로 보기</span>
                    </button>
                </div>
            </div>

            <div id="final-awards-summary-board">
                ${renderFinalAwardsBoardCardsHTML(finalData, { showCategoryPngBtn: true })}
            </div>
        </section>
    `;

    setTimeout(() => {
        renderFinalResultsCharts(finalData);
    }, 0);

    return introHTML + contentHTML + summarySectionHTML;
}
