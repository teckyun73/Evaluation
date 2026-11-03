/**
 * evaluationTable.js
 * 부문별(2026: 지원·기술 / 2025: 6S·6시그마·R&D·AI) 평가표 렌더링, 직무 범위 배지, 자동저장 피드백, 심사평 코멘트 및 점수 합계 표시 모듈
 */

import { CATEGORY_DISPLAY_NAMES, CATEGORY_METADATA, INTRO_TEXTS } from '../../config/constants.js';
import { appState } from '../../state/appState.js';

function getAutosaveBadgeHtml() {
    const status = (appState.saveStatus || 'idle').toLowerCase();
    if (status === 'saving') {
        return `<span class="autosave-badge autosave-saving"><span class="loader"></span> 저장 중...</span>`;
    }
    if (status === 'saved') {
        return `<span class="autosave-badge autosave-saved"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> 모든 변경사항 저장됨</span>`;
    }
    if (status === 'error') {
        return `<span class="autosave-badge autosave-error"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg> 저장 실패 (다시 시도해주세요)</span>`;
    }
    return `<span class="autosave-badge text-slate-400 bg-slate-100 border border-slate-200">실시간 자동저장</span>`;
}

export function renderEvaluationTable(categoryKey) {
    const isSubmitted = appState.submissionStatus[categoryKey] === true;
    const criteria = appState.evaluationCriteria[categoryKey] || [];
    const categoryPresenters = appState.presenters[categoryKey] || [];
    const meta = CATEGORY_METADATA[categoryKey] || {};
    const totalMaxPoints = criteria.reduce((sum, c) => sum + (parseInt(c.max, 10) || 0), 0);
    const isCompactCols = categoryPresenters.length >= 6;
    const cellPadClass = isCompactCols ? 'px-3 py-3.5' : 'px-6 py-4';
    const headPadClass = isCompactCols ? 'px-3 py-3.5 min-w-[104px]' : 'px-6 py-3.5';

    const scopeBadgesHTML = meta.jobScope ? `
        <div class="flex flex-wrap items-center gap-2 mt-1.5 mb-1.5">
            <span class="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white text-sky-800 border border-sky-200 shadow-xs">
                직무 범위: ${meta.jobScope}
            </span>
            <span class="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                평가 대상: 총 ${categoryPresenters.length}건
            </span>
        </div>
    ` : '';

    let introHTML = `
        <div class="p-4 mb-4 bg-sky-50 border border-sky-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div class="flex-grow">
                <div class="flex flex-wrap items-center gap-2.5 mb-1">
                    <span class="font-extrabold text-base md:text-lg text-slate-900">
                        ${meta.icon ? `${meta.icon} ` : ''}${CATEGORY_DISPLAY_NAMES[categoryKey] || categoryKey.toUpperCase()} 부문 평가
                    </span>
                    <div id="autosave-status-container">${getAutosaveBadgeHtml()}</div>
                </div>
                ${scopeBadgesHTML}
                <p class="text-slate-700 text-xs md:text-sm leading-relaxed">${INTRO_TEXTS[categoryKey] || ''}</p>
            </div>
            <button data-category="${categoryKey}" class="submit-btn w-full md:w-auto flex-shrink-0 bg-teal-600 text-white px-5 py-2.5 rounded-lg hover:bg-teal-700 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-slate-400 disabled:cursor-not-allowed font-semibold text-sm shadow-sm" ${isSubmitted ? 'disabled' : ''}>
                ${isSubmitted ? '제출 완료' : '최종 제출'}
            </button>
        </div>
    `;

    let tableHTML = `<div class="overflow-x-auto rounded-xl border border-slate-200 shadow-xs"><table class="w-full text-sm text-left text-slate-500">`;
    tableHTML += `<thead class="text-xs text-slate-700 uppercase bg-slate-100"><tr>`;
    tableHTML += `<th scope="col" class="px-5 py-3.5 sticky-col bg-slate-100 min-w-[220px]">평가항목</th>`;
    tableHTML += `<th scope="col" class="px-3 py-3.5 text-center whitespace-nowrap">배점</th>`;
    categoryPresenters.forEach((p, idx) => {
        tableHTML += `<th scope="col" class="${headPadClass} text-center font-bold text-slate-800"><div class="text-[11px] text-slate-400 font-semibold mb-0.5">#${idx + 1}</div><div class="whitespace-nowrap">${p.name}</div></th>`;
    });
    tableHTML += `</tr></thead>`;
    tableHTML += `<tbody>`;

    criteria.forEach(c => {
        const isAiCriterion = c.key && c.key.includes('ai_utilization');
        tableHTML += `<tr class="bg-white border-b hover:bg-slate-50 transition">`;
        tableHTML += `
            <th scope="row" class="px-5 py-3.5 font-semibold text-slate-900 sticky-col bg-white">
                <div class="flex items-center gap-1.5 whitespace-nowrap">
                    <span>${c.name}</span>
                    ${isAiCriterion ? `<span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">AI 활용</span>` : ''}
                </div>
                ${c.desc ? `<div class="text-[11px] font-normal text-slate-400 mt-0.5 leading-snug max-w-xs whitespace-normal">${c.desc}</div>` : ''}
            </th>
        `;
        tableHTML += `<td class="px-3 py-3.5 text-center font-bold text-slate-600 whitespace-nowrap">${c.max}</td>`;

        categoryPresenters.forEach(p => {
            const score = appState.allScores[p.id]?.scores?.[appState.loginId]?.[c.key];
            const myScore = (score === null || score === undefined) ? '' : score;
            const isInvalid = myScore !== '' && (myScore < 0 || myScore > c.max);

            tableHTML += `
                <td class="${cellPadClass} score-input-cell">
                    <input type="number" max="${c.max}" min="0" value="${myScore}" data-id="${p.id}" data-key="${c.key}" 
                           placeholder="0~${c.max}"
                           class="score-input w-20 md:w-24 text-center p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 ${isInvalid ? 'input-error' : 'border-slate-300'}" 
                           ${isSubmitted ? 'disabled' : ''}>
                </td>
            `;
        });
        tableHTML += `</tr>`;
    });

    tableHTML += `</tbody>`;
    tableHTML += `<tfoot class="font-bold text-slate-900 bg-slate-50">`;
    tableHTML += `<tr class="border-t-2"><th scope="row" class="px-5 py-4 sticky-col bg-slate-50">내 점수 합계</th><td class="text-center font-bold text-slate-600">${totalMaxPoints}</td>`;

    categoryPresenters.forEach(p => {
        const myTotal = criteria.reduce((sum, c) => {
            return sum + (appState.allScores[p.id]?.scores?.[appState.loginId]?.[c.key] || 0);
        }, 0);
        tableHTML += `<td class="${cellPadClass} text-center text-lg text-sky-600 font-extrabold">${myTotal}</td>`;
    });
    tableHTML += `</tr>`;

    tableHTML += `<tr class="border-t"><th scope="row" class="px-5 py-4 sticky-col bg-slate-50">평균 점수</th><td></td>`;
    categoryPresenters.forEach(p => {
        const presenterScores = appState.allScores[p.id]?.scores;
        let totalAverage = "0.00";
        if (presenterScores) {
            const evaluatorIds = Object.keys(presenterScores).filter(id => !id.startsWith('sim-voter-'));
            if (evaluatorIds.length > 0) {
                const sumOfScores = evaluatorIds.reduce((total, evalId) => {
                    return total + criteria.reduce((sum, c) => sum + (presenterScores[evalId]?.[c.key] || 0), 0);
                }, 0);
                totalAverage = (sumOfScores / evaluatorIds.length).toFixed(2);
            }
        }
        tableHTML += `<td class="${cellPadClass} text-center text-lg text-teal-600 font-extrabold">${totalAverage}</td>`;
    });
    tableHTML += `</tr>`;
    tableHTML += `</tfoot></table></div>`;

    // 하단: 발표자별 심사위원 종합 심사평(코멘트) 입력 영역
    let commentsHTML = `
        <div class="mt-8 pt-6 border-t border-slate-200">
            <h4 class="font-bold text-slate-800 text-base mb-3 flex items-center gap-2">
                <svg class="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                발표자별 심사평 / 피드백 메모 (선택사항)
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    `;

    categoryPresenters.forEach((p, idx) => {
        const comment = appState.allScores[p.id]?.comments?.[appState.loginId] || '';
        commentsHTML += `
            <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <label class="block text-xs font-bold text-slate-700 mb-1.5">#${idx + 1} ${p.name} 심사평</label>
                <textarea data-presenter-id="${p.id}" class="evaluator-comment-input w-full p-2 text-xs md:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none h-16" placeholder="과제의 우수한 점 또는 개선 제언을 작성해 주세요..." ${isSubmitted ? 'disabled' : ''}>${comment}</textarea>
            </div>
        `;
    });

    commentsHTML += `</div></div>`;

    return introHTML + tableHTML + commentsHTML;
}

export function updateAutosaveBadge() {
    const container = document.getElementById('autosave-status-container');
    if (container) {
        container.innerHTML = getAutosaveBadgeHtml();
    }
}

export function renderColumnTotals(categoryKey) {
    const tabContent = document.getElementById('tab-content');
    if (tabContent && appState.loginId) {
        // 포커스 중이지 않은 점수 입력칸에 Firestore 최신 로드값 동기화 (재로그인 시 즉시 복원)
        const scoreInputs = tabContent.querySelectorAll('.score-input');
        scoreInputs.forEach(input => {
            if (document.activeElement === input) return;
            const { id, key } = input.dataset;
            const score = appState.allScores[id]?.scores?.[appState.loginId]?.[key];
            const myScore = (score === null || score === undefined) ? '' : String(score);
            if (input.value !== myScore) {
                input.value = myScore;
            }
        });

        // 포커스 중이지 않은 심사평 입력칸에 Firestore 최신 로드값 동기화
        const commentInputs = tabContent.querySelectorAll('.evaluator-comment-input');
        commentInputs.forEach(textarea => {
            if (document.activeElement === textarea) return;
            const presenterId = textarea.dataset.presenterId;
            const comment = appState.allScores[presenterId]?.comments?.[appState.loginId] || '';
            if (textarea.value !== comment) {
                textarea.value = comment;
            }
        });
    }

    const table = document.querySelector('#tab-content table');
    if (!table || !table.tfoot) return;

    const criteria = appState.evaluationCriteria[categoryKey] || [];
    const categoryPresenters = appState.presenters[categoryKey] || [];

    const myTotalRow = table.tfoot.rows[0];
    const avgTotalRow = table.tfoot.rows[1];

    categoryPresenters.forEach((p, index) => {
        const cellIndex = index + 2;

        let myTotal = 0;
        if (appState.allScores[p.id]?.scores?.[appState.loginId]) {
            myTotal = criteria.reduce((sum, c) => sum + (appState.allScores[p.id].scores[appState.loginId][c.key] || 0), 0);
        }
        if (myTotalRow && myTotalRow.cells[cellIndex]) {
            myTotalRow.cells[cellIndex].textContent = myTotal;
        }

        const presenterScores = appState.allScores[p.id]?.scores;
        let totalAverage = "0.00";
        if (presenterScores) {
            const evaluatorIds = Object.keys(presenterScores).filter(id => !id.startsWith('sim-voter-'));
            if (evaluatorIds.length > 0) {
                const sumOfScores = evaluatorIds.reduce((total, evalId) => {
                    const evalTotal = criteria.reduce((sum, c) => sum + (presenterScores[evalId]?.[c.key] || 0), 0);
                    return total + evalTotal;
                }, 0);
                totalAverage = (sumOfScores / evaluatorIds.length).toFixed(2);
            }
        }
        if (avgTotalRow && avgTotalRow.cells[cellIndex]) {
            avgTotalRow.cells[cellIndex].textContent = totalAverage;
        }
    });
}
