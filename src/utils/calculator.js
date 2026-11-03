/**
 * calculator.js
 * 평가 점수, 투표 집계, 동점자 처리(Tie-breaking), 2026 신규 포상(특별상 포함) 및 2025 레거시 훈격 산정 로직
 */

import {
    PRESENTERS,
    EVALUATION_CRITERIA,
    VOTE_SCORE_MAP,
    CATEGORY_VOTE_SCORE_MAPS,
    AWARD_SLOTS_2026
} from '../config/constants.js';
import { appState } from '../state/appState.js';

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
 * 투표 득표 순위에 따른 부문별 환산 점수 계산 (동점자 공동 순위 처리 — Standard Competition Ranking 1224 방식)
 * - 2026년 지원 부문(support): [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] (1~10점, 1점 등분)
 * - 2026년 기술 부문(technology): [10, 8, 6, 4, 2, 0] (0~10점, 2점 등분)
 * - 2025년 아카이브 모드: [10, 7, 4, 1] 유지
 */
export function calculateVoteScores(presenters = PRESENTERS, selections = {}, scoreMapOverride = null) {
    const voteCounts = calculateVoteCounts(presenters, selections);
    const voteScores = {};

    Object.keys(presenters).forEach(category => {
        voteScores[category] = {};

        const categoryScoreMap = Array.isArray(scoreMapOverride)
            ? scoreMapOverride
            : (appState.isArchiveMode()
                ? VOTE_SCORE_MAP
                : (CATEGORY_VOTE_SCORE_MAPS[category] || VOTE_SCORE_MAP));

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

            if (item.count !== previousCount) {
                currentRank = index;
                previousCount = item.count;
            }

            const assignedScore = (currentRank < categoryScoreMap.length) ? categoryScoreMap[currentRank] : 0;
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
 * 훈격 문자열로부터 시상 티어 추론 헬퍼
 */
export function inferAwardTier(awardName = '') {
    if (!awardName || awardName === '-') return '';
    if (awardName === '최우수') return 'top';
    if (awardName === '우수') return 'runnerup';
    if (awardName === '장려') return 'encouragement';
    if (awardName.startsWith('특별상')) return 'special';
    return 'special';
}

/**
 * 부문별 종합 결과 계산 (평균 점수 + 투표 점수 + 훈격/특별상/포상비고)
 */
export function calculateResults(
    presenters = PRESENTERS,
    criteria = EVALUATION_CRITERIA,
    allScores = {},
    selections = {},
    awardOverrides = null
) {
    const activeOverrides = awardOverrides !== null
        ? awardOverrides
        : (appState.isArchiveMode() ? {} : (appState.awardOverrides || {}));

    const voteScoresByCategory = calculateVoteScores(presenters, selections);
    const results = {};

    Object.keys(presenters).forEach(category => {
        results[category] = (presenters[category] || []).map(p => {
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

        const categoryAwardSlots = AWARD_SLOTS_2026[category] || null;

        // 훈격 배정 (2026년 신규 포상 슬롯 vs 2025년 레거시 훈격 분기)
        results[category].forEach((p, index) => {
            p.award = '-';
            p.awardId = '';
            p.awardTier = '';
            p.awardNote = '';
            p.awardAttribution = '';

            if (categoryAwardSlots && !appState.isArchiveMode()) {
                // 1) 기본 순위 자동 매핑 (점수가 1점이라도 입력된 경우)
                if (p.totalScore > 0 && index < categoryAwardSlots.length) {
                    const slot = categoryAwardSlots[index];
                    p.award = slot.award;
                    p.awardId = slot.awardId;
                    p.awardTier = slot.tier;
                    p.awardNote = slot.note || '';
                    p.awardAttribution = slot.attribution || '';
                }

                // 2) 관리자 수동 지정 오버라이드 적용 (후원 특별상 지정 변경 등)
                const override = activeOverrides[p.id];
                if (override) {
                    if (override.award === '-' || override.awardId === '-') {
                        p.award = '-';
                        p.awardId = '';
                        p.awardTier = '';
                        p.awardNote = '';
                        p.awardAttribution = '';
                    } else if (override.awardId) {
                        const matchedSlot = categoryAwardSlots.find(s => s.awardId === override.awardId);
                        if (matchedSlot) {
                            p.award = matchedSlot.award;
                            p.awardId = matchedSlot.awardId;
                            p.awardTier = matchedSlot.tier;
                            p.awardNote = matchedSlot.note || '';
                            p.awardAttribution = matchedSlot.attribution || '';
                        } else {
                            p.award = override.award || '-';
                            p.awardId = override.awardId;
                            p.awardTier = override.tier || inferAwardTier(override.award);
                            p.awardNote = override.note || '';
                        }
                    } else if (override.award) {
                        p.award = override.award;
                        p.awardTier = override.tier || inferAwardTier(override.award);
                        p.awardNote = override.note || '';
                    }
                }
            } else {
                // 2025년 아카이브 모드 (4개 부문 레거시 훈격 산정 기준 100% 보존)
                if (p.totalScore > 0) {
                    if (index === 0) {
                        p.award = '최우수';
                        p.awardTier = 'top';
                    } else if (index === 1) {
                        p.award = '우수';
                        p.awardTier = 'runnerup';
                    } else if (category === 'ai') {
                        if (index === 2 || index === 3) {
                            p.award = '장려';
                            p.awardTier = 'encouragement';
                        }
                    } else if (index === 2) {
                        p.award = '장려';
                        p.awardTier = 'encouragement';
                    }
                }
            }
        });
    });

    return results;
}
