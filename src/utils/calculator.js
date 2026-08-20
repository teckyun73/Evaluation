/**
 * calculator.js
 * 평가 점수, 투표 집계, 동점자 처리(Tie-breaking), 훈격 산정 계산 로직
 */

import { PRESENTERS, EVALUATION_CRITERIA, VOTE_SCORE_MAP } from '../config/constants.js';

/**
 * 부문별/발표자별 투표 득표수 계산
 */
export function calculateVoteCounts(presenters = PRESENTERS, selections = {}) {
    const voteCounts = {};
    Object.keys(presenters).forEach(category => {
        voteCounts[category] = {};
        presenters[category].forEach(p => {
            voteCounts[category][p.name] = 0;
        });
    });

    Object.values(selections).forEach(selectionDoc => {
        if (selectionDoc && selectionDoc.selections) {
            Object.entries(selectionDoc.selections).forEach(([category, presenterName]) => {
                if (presenterName && voteCounts[category] && voteCounts[category][presenterName] !== undefined) {
                    voteCounts[category][presenterName]++;
                }
            });
        }
    });

    return voteCounts;
}

/**
 * 투표 득표 순위에 따른 환산 점수 계산 (동점자 공동 순위 처리 개선)
 * 예: 득표수가 같을 경우 동일한 순위 점수를 부여하고 다음 순위는 건너뜀 (Standard Competition Ranking 1224 방식)
 */
export function calculateVoteScores(presenters = PRESENTERS, selections = {}, scoreMap = VOTE_SCORE_MAP) {
    const voteCounts = calculateVoteCounts(presenters, selections);
    const voteScores = {};

    Object.keys(presenters).forEach(category => {
        voteScores[category] = {};
        
        // 득표순 정렬
        const sortedByVotes = Object.entries(voteCounts[category])
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        let currentRank = 0;
        let previousCount = -1;

        sortedByVotes.forEach((item, index) => {
            if (item.count === 0) {
                voteScores[category][item.name] = 0;
                return;
            }

            // 득표수가 이전과 다르면 현재 인덱스가 새로운 랭크가 됨
            if (item.count !== previousCount) {
                currentRank = index;
                previousCount = item.count;
            }

            // scoreMap 범위를 벗어나지 않으면 해당 순위 점수 배정
            const assignedScore = (currentRank < scoreMap.length) ? scoreMap[currentRank] : 0;
            voteScores[category][item.name] = assignedScore;
        });
    });

    return voteScores;
}

/**
 * 평가자 목록 추출 (시뮬레이션 투표자 제외)
 */
export function getUniqueEvaluators(allScores = {}) {
    const evaluatorSet = new Set();
    for (const presenterId in allScores) {
        if (allScores[presenterId] && allScores[presenterId].scores) {
            Object.keys(allScores[presenterId].scores).forEach(evaluatorId => {
                if (!evaluatorId.startsWith('sim-voter-')) {
                    evaluatorSet.add(evaluatorId);
                }
            });
        }
    }
    return Array.from(evaluatorSet).sort();
}

/**
 * 부문별 종합 결과 계산 (평균 점수 + 투표 점수 + 훈격)
 */
export function calculateResults(
    presenters = PRESENTERS, 
    criteria = EVALUATION_CRITERIA, 
    allScores = {}, 
    selections = {}
) {
    const voteScoresByCategory = calculateVoteScores(presenters, selections);
    const results = {};

    Object.keys(presenters).forEach(category => {
        results[category] = presenters[category].map(p => {
            const presenterData = allScores[p.id];
            let averageScore = 0;

            if (presenterData && presenterData.scores) {
                const evaluatorIds = Object.keys(presenterData.scores).filter(id => !id.startsWith('sim-voter-'));
                if (evaluatorIds.length > 0) {
                    const totalSum = evaluatorIds.reduce((sum, evalId) => {
                        const evalTotal = (criteria[category] || []).reduce((s, c) => {
                            return s + (presenterData.scores[evalId]?.[c.key] || 0);
                        }, 0);
                        return sum + evalTotal;
                    }, 0);
                    averageScore = totalSum / evaluatorIds.length;
                }
            }

            const voteScore = voteScoresByCategory[category]?.[p.name] || 0;
            const totalScore = averageScore + voteScore;

            return {
                ...p,
                score: averageScore,
                voteScore: voteScore,
                totalScore: totalScore
            };
        }).sort((a, b) => {
            // 종합 점수 내림차순, 동점 시 평가자 평균 점수 높은 순
            if (Math.abs(b.totalScore - a.totalScore) > 0.001) {
                return b.totalScore - a.totalScore;
            }
            return b.score - a.score;
        });

        // 훈격 배정
        results[category].forEach((p, index) => {
            p.award = '-';
            if (p.totalScore > 0) {
                if (index === 0) {
                    p.award = '최우수';
                } else if (index === 1) {
                    p.award = '우수';
                } else if (category === 'ai') {
                    if (index === 2 || index === 3) {
                        p.award = '장려';
                    }
                } else if (index === 2) {
                    p.award = '장려';
                }
            }
        });
    });

    return results;
}
