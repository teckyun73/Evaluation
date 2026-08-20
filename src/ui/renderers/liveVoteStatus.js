/**
 * liveVoteStatus.js
 * 실시간 득표 현황 및 투표 점수 환산 렌더링 모듈
 */

import { CATEGORY_DISPLAY_NAMES, INTRO_TEXTS } from '../../config/constants.js';
import { appState } from '../../state/appState.js';
import { calculateVoteCounts, calculateVoteScores } from '../../utils/calculator.js';
import { renderLiveVoteCharts } from '../chartManager.js';

export function renderLiveVoteStatus() {
    const presenters = appState.presenters;
    const voteCounts = calculateVoteCounts(presenters, appState.excellentPresenterSelections);
    const voteScores = calculateVoteScores(presenters, appState.excellentPresenterSelections);

    let introHTML = `<div class="p-4 mb-6 bg-sky-50 border border-sky-200 rounded-lg text-slate-700"><p>${INTRO_TEXTS.live_vote_status}</p></div>`;
    let contentHTML = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">`;

    // 1. 실시간 득표 현황 차트
    contentHTML += `<div><h2 class="text-2xl font-bold mb-4 text-slate-800">실시간 득표 현황</h2><div class="space-y-8">`;
    Object.keys(presenters).forEach(category => {
        const chartHeight = presenters[category].length * 50 + 40;
        contentHTML += `
            <div>
                <h3 class="font-semibold mb-2">${CATEGORY_DISPLAY_NAMES[category]} 득표수</h3>
                <div class="chart-container mx-auto" style="height:${chartHeight}px">
                    <canvas id="live-vote-${category}-chart"></canvas>
                </div>
            </div>
        `;
    });
    contentHTML += `</div></div>`;

    // 2. 투표 점수 환산 테이블
    contentHTML += `<div><h2 class="text-2xl font-bold mb-4 text-slate-800">투표 점수 환산</h2><div class="space-y-8">`;
    Object.keys(presenters).forEach(category => {
        contentHTML += `
            <div>
                <h3 class="font-semibold mb-2">${CATEGORY_DISPLAY_NAMES[category]} 점수</h3>
                <div class="overflow-x-auto bg-white rounded-lg shadow">
                    <table class="w-full text-sm text-left text-slate-500">
                        <thead class="text-xs text-slate-700 uppercase bg-slate-100">
                            <tr>
                                <th class="px-6 py-3">발표자</th>
                                <th class="px-6 py-3">투표점수</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        const sortedByScore = Object.entries(voteScores[category] || {})
            .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

        sortedByScore.forEach(([name, score]) => {
            contentHTML += `
                <tr class="bg-white border-b">
                    <td class="px-6 py-4 font-medium text-slate-900">${name}</td>
                    <td class="px-6 py-4 font-bold text-blue-600">${score}</td>
                </tr>
            `;
        });

        contentHTML += `</tbody></table></div></div>`;
    });
    contentHTML += `</div></div></div>`;

    setTimeout(() => {
        renderLiveVoteCharts(voteCounts);
    }, 0);

    return introHTML + contentHTML;
}
