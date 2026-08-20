/**
 * presentationResults.js
 * 부문별 발표 결과(세로 막대 그래프, 프레젠테이션 전체화면 모드 및 이미지 저장) 렌더링 모듈
 */

import { CATEGORY_DISPLAY_NAMES, INTRO_TEXTS } from '../../config/constants.js';
import { appState } from '../../state/appState.js';
import { calculateResults } from '../../utils/calculator.js';
import { renderPresentationChart, downloadChartAsPNG } from '../chartManager.js';

export function renderPresentationResults() {
    const presenters = appState.presenters;
    const criteria = appState.evaluationCriteria;
    const results = calculateResults(presenters, criteria, appState.allScores, appState.excellentPresenterSelections);
    const selectedCategory = appState.selectedPresentationCategory || '6s';
    const categoryResults = results[selectedCategory] || [];

    let introHTML = `
        <div class="p-4 mb-6 bg-sky-50 border border-sky-200 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <p class="text-slate-700 text-sm md:text-base">${INTRO_TEXTS.presentation_results}</p>
            <div class="flex items-center gap-2 flex-shrink-0">
                <button id="download-presentation-chart-btn" class="text-xs font-semibold px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-300 shadow-sm transition flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    차트 이미지 저장
                </button>
                <button id="toggle-presentation-fullscreen-btn" class="text-xs font-semibold px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                    프레젠테이션 모드
                </button>
            </div>
        </div>
    `;
    
    let contentHTML = `
        <div class="mb-6">
            <label for="category-select" class="block text-sm font-medium text-slate-700 mb-2">부문 선택</label>
            <select id="category-select" class="block w-full max-w-xs px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 font-medium">
    `;

    Object.keys(presenters).forEach(category => {
        contentHTML += `<option value="${category}" ${category === selectedCategory ? 'selected' : ''}>${CATEGORY_DISPLAY_NAMES[category]}</option>`;
    });

    contentHTML += `
            </select>
        </div>
        <div id="presentation-card-container" class="bg-white rounded-xl shadow p-6 border border-slate-100 transition-all">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-slate-800">${CATEGORY_DISPLAY_NAMES[selectedCategory]} 발표 결과</h2>
                <span class="text-xs font-medium text-slate-400">평균 점수 + 투표 환산 점수</span>
            </div>
            <div class="chart-container mx-auto" style="height:520px; max-width:850px">
                <canvas id="presentation-chart"></canvas>
            </div>
        </div>
    `;

    setTimeout(() => {
        renderPresentationChart(categoryResults);
    }, 0);

    return introHTML + contentHTML;
}
