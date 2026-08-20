/**
 * voterDetailedResults.js
 * 투표자별 상세 투표 결과 렌더링 모듈
 */

import { CATEGORY_DISPLAY_NAMES, INTRO_TEXTS } from '../../config/constants.js';
import { appState } from '../../state/appState.js';
import { calculateVoteCounts, calculateVoteScores } from '../../utils/calculator.js';

export function renderVoterDetailedResults() {
    const presenters = appState.presenters;
    const voters = Object.keys(appState.excellentPresenterSelections).sort();
    let html = `<div class="p-4 mb-6 bg-sky-50 border border-sky-200 rounded-lg text-slate-700"><p>${INTRO_TEXTS.voter_detailed_results}</p></div>`;

    html += `<div class="overflow-x-auto bg-white rounded-lg shadow"><table class="w-full text-sm text-left text-slate-500">`;
    
    // 헤더 렌더링
    let headerHtml = `<thead class="text-xs text-slate-700 uppercase bg-slate-100">`;
    headerHtml += `<tr><th class="px-6 py-4 sticky left-0 bg-slate-100 z-10" rowspan="2">투표자</th>`;
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

    let bodyHtml = `<tbody>`;

    const voteCounts = calculateVoteCounts(presenters, appState.excellentPresenterSelections);
    const voteScores = calculateVoteScores(presenters, appState.excellentPresenterSelections);

    // 투표건수 행
    bodyHtml += `<tr class="bg-slate-50 border-b font-semibold text-slate-800"><td class="px-6 py-4 sticky left-0 bg-slate-50 z-10">투표건수</td>`;
    Object.keys(presenters).forEach(category => {
        presenters[category].forEach(presenter => {
            const count = voteCounts[category]?.[presenter.name] || 0;
            bodyHtml += `<td class="px-6 py-4 text-center font-bold">${count}</td>`;
        });
    });
    bodyHtml += `</tr>`;
    
    // 투표점수 행
    bodyHtml += `<tr class="bg-slate-100 border-b font-bold text-blue-600"><td class="px-6 py-4 sticky left-0 bg-slate-100 z-10">투표점수</td>`;
    Object.keys(presenters).forEach(category => {
        presenters[category].forEach(presenter => {
            const score = voteScores[category]?.[presenter.name] || 0;
            bodyHtml += `<td class="px-6 py-4 text-center">${score}</td>`;
        });
    });
    bodyHtml += `</tr>`;

    // 각 투표자별 투표 행
    voters.forEach(voterId => {
        const selectionData = appState.excellentPresenterSelections[voterId];
        if (!selectionData || !selectionData.selections) return;
        
        bodyHtml += `<tr class="bg-white border-b"><td class="px-6 py-4 font-medium text-slate-900 sticky left-0 bg-white z-10">${voterId}</td>`;
        Object.keys(presenters).forEach(category => {
            presenters[category].forEach(presenter => {
                const selectedPresenter = selectionData.selections[category];
                bodyHtml += `<td class="px-6 py-4 text-center">${selectedPresenter === presenter.name ? '✓' : ''}</td>`;
            });
        });
        bodyHtml += `</tr>`;
    });
    bodyHtml += `</tbody>`;

    html += headerHtml + bodyHtml + `</table></div>`;
    return html;
}
