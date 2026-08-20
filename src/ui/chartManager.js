/**
 * chartManager.js
 * Chart.js 인스턴스 생명주기 관리, 가로/세로/레이더 차트 렌더링 및 이미지 내보내기 모듈
 */

// 생성된 차트 인스턴스 캐시
const chartRegistry = {
    results: {},
    presentation: null,
    liveVotes: {},
    final: {},
    radar: null
};

/**
 * 캔버스 차트를 고화질 PNG 이미지로 다운로드
 */
export function downloadChartAsPNG(canvasId, fileName = 'chart.png') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    const imageURL = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imageURL;
    link.download = fileName;
    link.click();
}

/**
 * 다차원 역량 분석 레이더(방사형) 차트 렌더링
 */
export function renderRadarChart(category, categoryPresenters, criteriaList, allScores) {
    const canvas = document.getElementById('radar-analysis-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }

    const labels = criteriaList.map(c => `${c.name} (${c.max}점)`);
    const colorPalette = [
        { bg: 'rgba(14, 165, 233, 0.2)', border: '#0ea5e9' },
        { bg: 'rgba(16, 185, 129, 0.2)', border: '#10b981' },
        { bg: 'rgba(245, 158, 11, 0.2)', border: '#f59e0b' },
        { bg: 'rgba(139, 92, 246, 0.2)', border: '#8b5cf6' }
    ];

    const datasets = categoryPresenters.map((presenter, idx) => {
        const color = colorPalette[idx % colorPalette.length];
        const presenterScores = allScores[presenter.id]?.scores || {};
        const evalIds = Object.keys(presenterScores).filter(id => !id.startsWith('sim-voter-'));

        const dataPoints = criteriaList.map(criterion => {
            if (evalIds.length === 0) return 0;
            const sum = evalIds.reduce((acc, evalId) => acc + (presenterScores[evalId]?.[criterion.key] || 0), 0);
            const avg = sum / evalIds.length;
            // 100점 만점 기준 득점 백분율(%)로 환산
            return parseFloat(((avg / criterion.max) * 100).toFixed(1));
        });

        return {
            label: presenter.name,
            data: dataPoints,
            backgroundColor: color.bg,
            borderColor: color.border,
            borderWidth: 2,
            pointBackgroundColor: color.border,
            pointRadius: 4
        };
    });

    const newChart = new Chart(canvas, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(0, 0, 0, 0.1)' },
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    ticks: {
                        stepSize: 20,
                        callback: (value) => `${value}%`
                    },
                    pointLabels: {
                        font: { size: 12, weight: 'bold' }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { size: 13 }, padding: 15 }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: 득점율 ${ctx.formattedValue}%`
                    }
                }
            }
        }
    });

    chartRegistry.radar = newChart;
}

/**
 * 부문별 종합 결과 가로 막대 차트 렌더링 / 업데이트
 */
export function renderResultsCharts(results) {
    if (!results || typeof Chart === 'undefined') return;

    Object.keys(results).forEach(category => {
        const canvas = document.getElementById(`${category}-chart`);
        if (!canvas) return;

        const sortedResults = [...results[category]].sort((a, b) => a.totalScore - b.totalScore);
        const labels = sortedResults.map(p => p.name);
        const avgScores = sortedResults.map(p => p.score.toFixed(2));
        const voteScores = sortedResults.map(p => p.voteScore);

        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.data.labels = labels;
            existingChart.data.datasets[0].data = avgScores;
            existingChart.data.datasets[1].data = voteScores;
            existingChart.update();
            chartRegistry.results[category] = existingChart;
            return;
        }

        const newChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '평균점수',
                        data: avgScores,
                        backgroundColor: 'rgba(56, 189, 248, 0.8)',
                        borderColor: 'rgba(14, 165, 233, 1)',
                        borderWidth: 1
                    },
                    {
                        label: '투표점수',
                        data: voteScores,
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderColor: 'rgba(5, 150, 105, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                scales: { 
                    x: { stacked: true, beginAtZero: true, max: 110 },
                    y: { stacked: true }
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: true, position: 'top' } 
                }
            }
        });
        chartRegistry.results[category] = newChart;
    });
}

/**
 * 발표 결과 세로 막대 차트 및 훈격 뱃지 렌더링
 */
export function renderPresentationChart(categoryResults) {
    const canvas = document.getElementById('presentation-chart');
    if (!canvas || !categoryResults || typeof Chart === 'undefined') return;

    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }

    const labels = categoryResults.map(p => p.name);
    const avgScores = categoryResults.map(p => p.score);
    const voteScores = categoryResults.map(p => p.voteScore);
    const awards = categoryResults.map(p => p.award);

    const chartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '평균점수',
                    data: avgScores,
                    backgroundColor: 'rgba(56, 189, 248, 0.8)',
                    borderColor: 'rgba(14, 165, 233, 1)',
                    borderWidth: 2
                },
                {
                    label: '투표점수',
                    data: voteScores,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgba(5, 150, 105, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { bottom: 30 }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        font: { size: 13, weight: 'bold' }
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    max: 110,
                    ticks: { font: { size: 12 } },
                    title: {
                        display: true,
                        text: '점수',
                        font: { size: 14, weight: 'bold' }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { font: { size: 13 }, padding: 15 }
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const index = context.dataIndex;
                            return '훈격: ' + (awards[index] || '-');
                        }
                    }
                }
            }
        },
        plugins: [{
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                chart.data.labels.forEach((label, index) => {
                    const meta2 = chart.getDatasetMeta(1);
                    const bar2 = meta2.data[index];
                    
                    if (bar2) {
                        const totalScore = (avgScores[index] + voteScores[index]).toFixed(2);
                        const award = awards[index];
                        
                        ctx.save();
                        ctx.font = 'bold 12px Inter';
                        ctx.fillStyle = '#1e293b';
                        ctx.textAlign = 'center';
                        
                        const x = bar2.x;
                        const y = bar2.y - 10;
                        ctx.fillText(totalScore, x, y);
                        
                        ctx.font = 'bold 15px Inter';
                        let awardColor = '#64748b';
                        if (award === '최우수') awardColor = '#f59e0b';
                        else if (award === '우수') awardColor = '#0ea5e9';
                        else if (award === '장려') awardColor = '#10b981';
                        
                        ctx.fillStyle = awardColor;
                        ctx.fillText(`[${award}]`, x, chart.chartArea.bottom + 35);
                        ctx.restore();
                    }
                });
            }
        }]
    });

    chartRegistry.presentation = chartInstance;
}

/**
 * 실시간 투표 현황 가로 차트 렌더링
 */
export function renderLiveVoteCharts(voteCounts) {
    if (!voteCounts || typeof Chart === 'undefined') return;

    Object.keys(voteCounts).forEach(category => {
        const canvas = document.getElementById(`live-vote-${category}-chart`);
        if (!canvas) return;

        const chartData = Object.entries(voteCounts[category]).sort(([, a], [, b]) => a - b);
        const labels = chartData.map(([name]) => name);
        const counts = chartData.map(([, count]) => count);

        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.data.labels = labels;
            existingChart.data.datasets[0].data = counts;
            existingChart.update();
            chartRegistry.liveVotes[category] = existingChart;
            return;
        }

        const newChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '득표 수',
                    data: counts,
                    backgroundColor: 'rgba(22, 163, 74, 0.8)',
                    borderColor: 'rgba(21, 128, 61, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                scales: { 
                    x: { beginAtZero: true, ticks: { stepSize: 1 } }
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false } 
                }
            }
        });
        chartRegistry.liveVotes[category] = newChart;
    });
}

/**
 * 관리자 최종 결과 차트 렌더링
 */
export function renderFinalResultsCharts(finalResultsData) {
    if (!finalResultsData || typeof Chart === 'undefined') return;

    Object.keys(finalResultsData).forEach(category => {
        const canvas = document.getElementById(`final-${category}-chart`);
        if (!canvas) return;

        const sortedResults = [...finalResultsData[category]].sort((a, b) => a.totalScore - b.totalScore);
        const labels = sortedResults.map(p => p.name);
        const scores = sortedResults.map(p => p.score);
        const voteScores = sortedResults.map(p => p.voteScore);

        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.data.labels = labels;
            existingChart.data.datasets[0].data = scores;
            existingChart.data.datasets[1].data = voteScores;
            existingChart.update();
            chartRegistry.final[category] = existingChart;
            return;
        }

        const newChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '평균점수',
                        data: scores,
                        backgroundColor: 'rgba(56, 189, 248, 0.8)',
                        borderColor: 'rgba(14, 165, 233, 1)',
                        borderWidth: 1
                    },
                    {
                        label: '투표점수',
                        data: voteScores,
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderColor: 'rgba(5, 150, 105, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                scales: { 
                    x: { stacked: true, beginAtZero: true, max: 110 },
                    y: { stacked: true }
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: true, position: 'top' } 
                }
            }
        });
        chartRegistry.final[category] = newChart;
    });
}
