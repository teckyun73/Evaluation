/**
 * liveVoteStatus.js
 * 실시간 득표 현황 및 부문별 차등 투표 점수 환산(지원: 1~10점[1점 등분] / 기술: 0~10점[2점 등분]) 렌더링 모듈
 */

import { CATEGORY_DISPLAY_NAMES, CATEGORY_METADATA, CATEGORY_VOTE_RULE_LABELS, INTRO_TEXTS } from '../../config/constants.js';
import { appState } from '../../state/appState.js';
import { calculateVoteCounts, calculateVoteScores } from '../../utils/calculator.js';
import { renderLiveVoteCharts } from '../chartManager.js';

export function renderLiveVoteStatus() {
    const presenters = appState.presenters;
    const isArchive = appState.isArchiveMode();
    const voteCounts = calculateVoteCounts(presenters, appState.excellentPresenterSelections);
    const voteScores = calculateVoteScores(presenters, appState.excellentPresenterSelections);

    const introText = isArchive ? (INTRO_TEXTS.live_vote_status_2025 || INTRO_TEXTS.live_vote_status) : INTRO_TEXTS.live_vote_status;
    let introHTML = `<div class="p-4 mb-6 bg-sky-50 border border-sky-200 rounded-xl text-slate-700 text-sm md:text-base"><p>${introText}</p></div>`;
    let contentHTML = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">`;

    // 1. 실시간 득표 현황 차트
    contentHTML += `<div><h2 class="text-2xl font-bold mb-4 text-slate-800">실시간 득표 현황</h2><div class="space-y-8">`;
    Object.keys(presenters).forEach(category => {
        const meta = CATEGORY_METADATA[category] || {};
        const chartHeight = Math.max(200, presenters[category].length * 46 + 50);
        contentHTML += `
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 class="font-bold text-slate-800 mb-2">${meta.icon ? `${meta.icon} ` : ''}${CATEGORY_DISPLAY_NAMES[category] || category} 부문 득표수</h3>
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
        const meta = CATEGORY_METADATA[category] || {};
        const ruleLabel = isArchive
            ? "득표 순위 1위 10점 / 2위 7점 / 3위 4점 / 4위 1점"
            : (CATEGORY_VOTE_RULE_LABELS[category] || "득표 순위별 환산 배점");

        contentHTML += `
            <div>
                <div class="flex flex-wrap justify-between items-center gap-2 mb-2">
                    <h3 class="font-bold text-slate-800">${meta.icon ? `${meta.icon} ` : ''}${CATEGORY_DISPLAY_NAMES[category] || category} 부문 환산 점수</h3>
                    <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">${ruleLabel}</span>
                </div>
                <div class="overflow-x-auto bg-white rounded-xl shadow border border-slate-200">
                    <table class="w-full text-sm text-left text-slate-500">
                        <thead class="text-xs text-slate-700 uppercase bg-slate-100">
                            <tr>
                                <th class="px-4 py-3 text-center whitespace-nowrap">득표순위</th>
                                <th class="px-5 py-3">발표자</th>
                                <th class="px-4 py-3 text-right whitespace-nowrap">득표수</th>
                                <th class="px-5 py-3 text-right whitespace-nowrap">투표점수</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        const sortedItems = (presenters[category] || []).map(p => ({
            name: p.name,
            count: voteCounts[category]?.[p.name] || 0,
            score: voteScores[category]?.[p.name] || 0
        })).sort((a, b) => (b.count - a.count) || (b.score - a.score));

        let displayRank = 0;
        let prevVotes = -1;

        sortedItems.forEach((item, idx) => {
            if (item.count !== prevVotes) {
                displayRank = idx + 1;
                prevVotes = item.count;
            }
            const rankText = item.count > 0 ? `${displayRank}위` : '-';

            contentHTML += `
                <tr class="bg-white border-b hover:bg-slate-50/70 transition">
                    <td class="px-4 py-3.5 text-center font-bold text-slate-500">${rankText}</td>
                    <td class="px-5 py-3.5 font-semibold text-slate-900">${item.name}</td>
                    <td class="px-4 py-3.5 text-right font-medium text-slate-600">${item.count}표</td>
                    <td class="px-5 py-3.5 text-right font-extrabold text-blue-600">${item.score}점</td>
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
