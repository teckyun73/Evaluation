/**
 * exportCsv.js
 * 평가 및 투표 종합 데이터를 UTF-8 CSV 파일로 안전하게 내보내기
 */

import { CATEGORY_DISPLAY_NAMES } from '../config/constants.js';
import { appState } from '../state/appState.js';
import { calculateResults, getUniqueEvaluators, calculateVoteCounts, calculateVoteScores } from './calculator.js';

function escapeCsvCell(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export function exportToCSV(allScores = {}, selections = {}) {
    const presenters = appState.presenters;
    const criteria = appState.evaluationCriteria;

    let csvContent = "\uFEFF"; // UTF-8 BOM 추가 (Excel 한글 깨짐 방지)

    // 1. 부문별 훈격 요약
    const summaryResults = calculateResults(presenters, criteria, allScores, selections);
    csvContent += `부문별 훈격 (${appState.currentYear}년)\n`;
    csvContent += "부문,순위,발표자,평균점수,투표점수,종합점수,훈격,포상내역\n";

    Object.keys(summaryResults).forEach(category => {
        const catName = CATEGORY_DISPLAY_NAMES[category] || category;
        summaryResults[category].forEach((p, idx) => {
            csvContent += [
                escapeCsvCell(catName),
                `${idx + 1}위`,
                escapeCsvCell(p.name),
                p.score.toFixed(2),
                p.voteScore,
                p.totalScore.toFixed(2),
                escapeCsvCell(p.award),
                escapeCsvCell(p.awardNote || '')
            ].join(',') + "\n";
        });
    });

    // 2. 평가자별 상세 결과 (총점)
    csvContent += "\n\n평가자별 상세 결과 (총점)\n";
    const evaluators = getUniqueEvaluators(allScores);

    let header1 = ["평가자"];
    let header2 = [""];
    Object.keys(presenters).forEach(category => {
        const catName = CATEGORY_DISPLAY_NAMES[category] || category;
        presenters[category].forEach((p, idx) => {
            header1.push(idx === 0 ? escapeCsvCell(catName) : "");
            header2.push(escapeCsvCell(p.name));
        });
    });
    csvContent += header1.join(",") + "\n" + header2.join(",") + "\n";

    evaluators.forEach(evaluator => {
        let row = [escapeCsvCell(evaluator)];
        Object.keys(presenters).forEach(category => {
            presenters[category].forEach(presenter => {
                let totalScore = 0;
                const criteriaList = criteria[category] || [];
                const scores = allScores[presenter.id]?.scores?.[evaluator];
                if (scores) {
                    totalScore = criteriaList.reduce((sum, c) => sum + (scores[c.key] || 0), 0);
                }
                row.push(totalScore || '0');
            });
        });
        csvContent += row.join(",") + "\n";
    });

    // 3. 투표자별 상세 결과
    csvContent += "\n\n투표자별 상세 결과\n";
    const voters = Object.keys(selections).sort();
    const voteCounts = calculateVoteCounts(presenters, selections);
    const voteScores = calculateVoteScores(presenters, selections);

    let voterHeader1 = ["투표자"];
    let voterHeader2 = [""];
    Object.keys(presenters).forEach(category => {
        const catName = CATEGORY_DISPLAY_NAMES[category] || category;
        presenters[category].forEach((p, idx) => {
            voterHeader1.push(idx === 0 ? escapeCsvCell(catName) : "");
            voterHeader2.push(escapeCsvCell(p.name));
        });
    });
    csvContent += voterHeader1.join(",") + "\n" + voterHeader2.join(",") + "\n";

    let voteCountRow = ["투표건수"];
    Object.keys(presenters).forEach(category => {
        presenters[category].forEach(presenter => {
            voteCountRow.push(voteCounts[category]?.[presenter.name] || 0);
        });
    });
    csvContent += voteCountRow.join(",") + "\n";

    let voteScoreRow = ["투표점수"];
    Object.keys(presenters).forEach(category => {
        presenters[category].forEach(presenter => {
            voteScoreRow.push(voteScores[category]?.[presenter.name] || 0);
        });
    });
    csvContent += voteScoreRow.join(",") + "\n";

    voters.forEach(voterId => {
        const selectionData = selections[voterId];
        if (!selectionData || !selectionData.selections) return;

        let row = [escapeCsvCell(voterId)];
        Object.keys(presenters).forEach(category => {
            presenters[category].forEach(presenter => {
                const selectedPresenter = selectionData.selections[category];
                row.push(selectedPresenter === presenter.name ? '✓' : '');
            });
        });
        csvContent += row.join(",") + "\n";
    });

    // 파일 다운로드 실행
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `evaluation_results_${appState.currentYear}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
