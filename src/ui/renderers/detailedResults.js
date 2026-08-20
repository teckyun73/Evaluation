/**
 * detailedResults.js
 * 평가자별 상세 결과(발표자별 부여 점수, 평균 및 심사평 모음) 렌더링 모듈
 */

import { CATEGORY_DISPLAY_NAMES, INTRO_TEXTS } from '../../config/constants.js';
import { appState } from '../../state/appState.js';
import { getUniqueEvaluators } from '../../utils/calculator.js';

export function renderDetailedResults() {
    const presenters = appState.presenters;
    const criteria = appState.evaluationCriteria;
    const evaluators = getUniqueEvaluators(appState.allScores);
    let html = `<div class="p-4 mb-6 bg-sky-50 border border-sky-200 rounded-lg text-slate-700"><p>${INTRO_TEXTS.detailed_results}</p></div>`;

    html += `<div class="overflow-x-auto bg-white rounded-lg shadow"><table class="w-full text-sm text-left text-slate-500">`;
    
    // 헤더 렌더링
    let headerHtml = `<thead class="text-xs text-slate-700 uppercase bg-slate-100">`;
    headerHtml += `<tr><th class="px-6 py-4 sticky left-0 bg-slate-100 z-10" rowspan="2">평가자</th>`;
    
    Object.keys(presenters).forEach(category => {
        headerHtml += `<th class="px-6 py-3 text-center" colspan="${presenters[category].length}">${CATEGORY_DISPLAY_NAMES[category]}</th>`;
    });
    headerHtml += `</tr><tr>`;
    
    Object.keys(presenters).forEach(category => {
        presenters[category].forEach(presenter => {
            headerHtml += `<th class="px-4 py-3 text-center font-medium">${presenter.name}</th>`;
        });
    });
    headerHtml += `</tr></thead>`;

    // 본문: 평균점수 행
    let bodyHtml = `<tbody>`;
    bodyHtml += `<tr class="font-bold text-slate-900 bg-slate-50 border-b-2"><td class="px-6 py-4 sticky left-0 bg-slate-50 z-10">평균점수</td>`;
    
    Object.keys(presenters).forEach(category => {
        presenters[category].forEach(presenter => {
            const presenterScores = appState.allScores[presenter.id]?.scores;
            let averageScore = "0.00";
            if (presenterScores) {
                const evalIds = Object.keys(presenterScores).filter(id => !id.startsWith('sim-voter-'));
                if (evalIds.length > 0) {
                    const totalSum = evalIds.reduce((sum, evalId) => {
                        const currentEvalScore = (criteria[category] || []).reduce((s, c) => {
                            return s + (presenterScores[evalId]?.[c.key] || 0);
                        }, 0);
                        return sum + currentEvalScore;
                    }, 0);
                    averageScore = (totalSum / evalIds.length).toFixed(2);
                }
            }
            bodyHtml += `<td class="px-6 py-4 text-center text-teal-600 font-bold">${averageScore}</td>`;
        });
    });
    bodyHtml += `</tr>`;

    // 본문: 각 평가자별 점수 행
    evaluators.forEach(evaluator => {
        bodyHtml += `<tr class="bg-white border-b"><td class="px-6 py-4 font-medium text-slate-900 sticky left-0 bg-white z-10">${evaluator}</td>`;
        Object.keys(presenters).forEach(category => {
            presenters[category].forEach(presenter => {
                let totalScore = 0;
                const criteriaList = criteria[category] || [];
                const scores = appState.allScores[presenter.id]?.scores?.[evaluator];
                if (scores) {
                    totalScore = criteriaList.reduce((sum, c) => sum + (scores[c.key] || 0), 0);
                }
                bodyHtml += `<td class="px-6 py-4 text-center">${totalScore || '-'}</td>`;
            });
        });
        bodyHtml += `</tr>`;
    });
    bodyHtml += `</tbody>`;

    html += headerHtml + bodyHtml + `</table></div>`;

    // 하단: 심사위원 심사평 모음 리포트 카드
    let commentsSummaryHTML = `
        <div class="mt-10">
            <h3 class="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <svg class="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                발표자별 심사위원 종합 심사평 (피드백 모음)
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    `;

    Object.keys(presenters).forEach(category => {
        presenters[category].forEach(presenter => {
            const commentsObj = appState.allScores[presenter.id]?.comments || {};
            const commentsList = Object.entries(commentsObj).filter(([, text]) => text && text.trim() !== '');

            commentsSummaryHTML += `
                <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div class="flex justify-between items-center mb-3 pb-2 border-b">
                        <h4 class="font-bold text-slate-900">${presenter.name} <span class="text-xs font-normal text-slate-500">(${CATEGORY_DISPLAY_NAMES[category]})</span></h4>
                        <span class="text-xs px-2 py-0.5 bg-sky-50 text-sky-700 font-semibold rounded-full">${commentsList.length}개 심사평</span>
                    </div>
                    <div class="space-y-2.5 max-h-48 overflow-y-auto">
                        ${commentsList.length > 0 ? commentsList.map(([evalId, text]) => `
                            <div class="bg-slate-50 p-2.5 rounded-lg text-xs">
                                <div class="font-semibold text-slate-700 mb-0.5">${evalId}</div>
                                <div class="text-slate-600 leading-relaxed">${text}</div>
                            </div>
                        `).join('') : `
                            <div class="text-xs text-slate-400 py-3 text-center">등록된 심사평이 없습니다.</div>
                        `}
                    </div>
                </div>
            `;
        });
    });

    commentsSummaryHTML += `</div></div>`;

    return html + commentsSummaryHTML;
}
