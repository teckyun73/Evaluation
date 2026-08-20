/**
 * exportCsv.js
 * 평가 및 투표 종합 데이터를 UTF-8 CSV 파일로 내보내기
 */

import { CATEGORY_DISPLAY_NAMES } from '../config/constants.js';
import { appState } from '../state/appState.js';
import { calculateResults, getUniqueEvaluators, calculateVoteCounts, calculateVoteScores } from './calculator.js';

export function exportToCSV(allScores = {}, selections = {}) {
    const presenters = appState.presenters;
    const criteria = appState.evaluationCriteria;

    let csvContent = "\uFEFF"; // UTF-8 BOM 추가 (Excel 한글 깨짐 방지)

    // 1. 부문별 훈격 요약
    const summaryResults = calculateResults(presenters, criteria, allScores, selections);
    csvContent += "부문별 훈격\n";
    csvContent += "부문,발표자,평균점수,투표점수,종합점수,훈격\n";
    
    Object.keys(summaryResults).forEach(category => {
        summaryResults[category].forEach(p => {
            csvContent += `${CATEGORY_DISPLAY_NAMES[category]},${p.name},${p.score.toFixed(2)},${p.voteScore},${p.totalScore.toFixed(2)},${p.award}\n`;
        });
    });

    // 2. 평가자별 상세 결과 (총점)
    csvContent += "\n\n평가자별 상세 결과 (총점)\n";
    const evaluators = getUniqueEvaluators(allScores);
    
    let header1 = "평가자,";
    let header2 = ",";
    Object.keys(presenters).forEach(category => {
        header1 += `${CATEGORY_DISPLAY_NAMES[category]}${','.repeat(presenters[category].length)}`;
        presenters[category].forEach(p => {
            header2 += `${p.name},`;
        });
    });
    csvContent += header1.slice(0, -1) + "\n" + header2.slice(0, -1) + "\n";

    evaluators.forEach(evaluator => {
        let row = `${evaluator},`;
        Object.keys(presenters).forEach(category => {
            presenters[category].forEach(presenter => {
                let totalScore = 0;
                const criteriaList = criteria[category] || [];
                const scores = allScores[presenter.id]?.scores?.[evaluator];
                if (scores) {
                    totalScore = criteriaList.reduce((sum, c) => sum + (scores[c.key] || 0), 0);
                }
                row += `${totalScore || '0'},`;
            });
        });
        csvContent += row.slice(0, -1) + "\n";
    });

    // 3. 투표자별 상세 결과
    csvContent += "\n\n투표자별 상세 결과\n";
    const voters = Object.keys(selections).sort();
    const voteCounts = calculateVoteCounts(presenters, selections);
    const voteScores = calculateVoteScores(presenters, selections);

    let voterHeader1 = "투표자,";
    let voterHeader2 = ",";
    Object.keys(presenters).forEach(category => {
        voterHeader1 += `${CATEGORY_DISPLAY_NAMES[category]}${','.repeat(presenters[category].length)}`;
        presenters[category].forEach(p => {
            voterHeader2 += `${p.name},`;
        });
    });
    csvContent += voterHeader1.slice(0, -1) + "\n" + voterHeader2.slice(0, -1) + "\n";

    let voteCountRow = "투표건수,";
    Object.keys(presenters).forEach(category => {
        presenters[category].forEach(presenter => {
            voteCountRow += `${voteCounts[category]?.[presenter.name] || 0},`;
        });
    });
    csvContent += voteCountRow.slice(0, -1) + "\n";

    let voteScoreRow = "투표점수,";
    Object.keys(presenters).forEach(category => {
        presenters[category].forEach(presenter => {
            voteScoreRow += `${voteScores[category]?.[presenter.name] || 0},`;
        });
    });
    csvContent += voteScoreRow.slice(0, -1) + "\n";

    voters.forEach(voterId => {
        const selectionData = selections[voterId];
        if (!selectionData || !selectionData.selections) return;

        let row = `${voterId},`;
        Object.keys(presenters).forEach(category => {
            presenters[category].forEach(presenter => {
                const selectedPresenter = selectionData.selections[category];
                row += `${selectedPresenter === presenter.name ? '✓' : ''},`;
            });
        });
        csvContent += row.slice(0, -1) + "\n";
    });

    // 파일 다운로드 실행
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `evaluation_results_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
