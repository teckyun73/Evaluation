/**
 * exportAwardsPng.js
 * 관리자 '최종 결과'의 부문별 훈격 확정 요약표(훈격/특별상, 발표자, 종합점수)를
 * 고해상도(2x DPI) PNG 그림파일로 렌더링 및 다운로드하는 순수 Canvas 2D 모듈
 */

import { CATEGORY_DISPLAY_NAMES, CATEGORY_METADATA } from '../config/constants.js';
import { appState } from '../state/appState.js';

function getAwardStyle(award = '-') {
    if (!award || award === '-') {
        return {
            bg: '#f1f5f9',
            border: '#cbd5e1',
            text: '#64748b'
        };
    }
    if (award === '최우수') {
        return {
            bg: '#fef3c7',
            border: '#f59e0b',
            text: '#92400e'
        };
    }
    if (award === '우수') {
        return {
            bg: '#e0f2fe',
            border: '#38bdf8',
            text: '#075985'
        };
    }
    if (award === '장려') {
        return {
            bg: '#d1fae5',
            border: '#34d399',
            text: '#065f46'
        };
    }
    return {
        bg: '#f3e8ff',
        border: '#c084fc',
        text: '#6b21a8'
    };
}

function drawRoundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
    const str = String(text ?? '');
    if (ctx.measureText(str).width <= maxWidth) return str;
    let clipped = str;
    while (clipped.length > 1 && ctx.measureText(clipped + '…').width > maxWidth) {
        clipped = clipped.slice(0, -1);
    }
    return clipped + '…';
}

/**
 * 단일 카테고리 카드 높이 계산
 */
function measureCategoryCardHeight(items) {
    const cardHeaderH = 56;
    const tableHeaderH = 40;
    const rowsHeight = (items || []).reduce((sum, item) => {
        return sum + (item.awardNote ? 62 : 48);
    }, 0);
    return cardHeaderH + tableHeaderH + Math.max(rowsHeight, 60) + 12;
}

/**
 * 단일 카테고리 카드 렌더링
 */
function drawCategoryCard(ctx, category, items, x, y, width, height) {
    const meta = CATEGORY_METADATA[category] || {};
    const displayName = CATEGORY_DISPLAY_NAMES[category] || category;
    const icon = meta.icon ? `${meta.icon} ` : '';

    // 카드 외곽 및 배경
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.06)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    drawRoundedRect(ctx, x, y, width, height, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    drawRoundedRect(ctx, x, y, width, height, 14);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 카드 상단 헤더
    ctx.save();
    drawRoundedRect(ctx, x, y, width, 56, 14);
    ctx.clip();
    ctx.fillStyle = category === 'technology' ? '#eef2ff' : '#f0f9ff';
    ctx.fillRect(x, y, width, 56);
    ctx.restore();

    // 헤더 하단 구분선
    ctx.beginPath();
    ctx.moveTo(x, y + 56);
    ctx.lineTo(x + width, y + 56);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 부문 타이틀
    ctx.font = '800 19px Inter, "Malgun Gothic", "맑은 고딕", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${icon}${displayName} 부문`, x + 20, y + 28);

    // 총 건수 배지
    const countLabel = `총 ${(items || []).length}건`;
    ctx.font = '700 12px Inter, "Malgun Gothic", sans-serif';
    const badgeW = ctx.measureText(countLabel).width + 20;
    drawRoundedRect(ctx, x + width - badgeW - 18, y + 15, badgeW, 26, 13);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#334155';
    ctx.textAlign = 'center';
    ctx.fillText(countLabel, x + width - badgeW / 2 - 18, y + 28);

    // 테이블 컬럼 헤더 (목록 순서: 훈격 / 특별상 | 발표자 | 종합점수)
    const theadY = y + 56;
    const theadH = 40;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x + 1, theadY, width - 2, theadH);

    ctx.beginPath();
    ctx.moveTo(x, theadY + theadH);
    ctx.lineTo(x + width, theadY + theadH);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const col1X = x + 20;
    const col2X = x + Math.round(width * 0.50);
    const col3RightX = x + width - 22;

    ctx.font = '700 13px Inter, "Malgun Gothic", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';
    ctx.fillText('훈격 / 특별상', col1X, theadY + theadH / 2);
    ctx.fillText('발표자', col2X, theadY + theadH / 2);
    ctx.textAlign = 'right';
    ctx.fillText('종합점수', col3RightX, theadY + theadH / 2);

    // 데이터 행 렌더링
    let curY = theadY + theadH;
    (items || []).forEach((item, idx) => {
        const hasNote = Boolean(item.awardNote && item.awardNote.trim());
        const rowH = hasNote ? 62 : 48;

        if (idx % 2 === 1) {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(x + 1, curY, width - 2, rowH);
        }

        if (idx < items.length - 1) {
            ctx.beginPath();
            ctx.moveTo(x + 14, curY + rowH);
            ctx.lineTo(x + width - 14, curY + rowH);
            ctx.strokeStyle = '#f1f5f9';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // 1열: 훈격 / 특별상 배지 (+ 비고)
        const awardText = item.award || '-';
        const style = getAwardStyle(awardText);
        ctx.font = '800 13px Inter, "Malgun Gothic", sans-serif';
        const maxBadgeW = col2X - col1X - 18;
        const badgeLabel = fitText(ctx, awardText, maxBadgeW - 22);
        const pillW = Math.min(maxBadgeW, ctx.measureText(badgeLabel).width + 22);
        const pillH = 26;
        const pillY = hasNote ? curY + 9 : curY + (rowH - pillH) / 2;

        drawRoundedRect(ctx, col1X, pillY, pillW, pillH, 13);
        ctx.fillStyle = style.bg;
        ctx.fill();
        ctx.strokeStyle = style.border;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = style.text;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeLabel, col1X + 11, pillY + pillH / 2);

        if (hasNote) {
            ctx.font = '500 11px Inter, "Malgun Gothic", sans-serif';
            ctx.fillStyle = '#64748b';
            const noteText = fitText(ctx, item.awardNote, maxBadgeW);
            ctx.fillText(noteText, col1X + 4, curY + 47);
        }

        // 2열: 발표자
        const centerY = curY + rowH / 2;
        ctx.font = '700 15px Inter, "Malgun Gothic", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const maxNameW = col3RightX - col2X - 90;
        ctx.fillText(fitText(ctx, item.name || '-', maxNameW), col2X, centerY);

        // 3열: 종합점수
        ctx.font = '800 16px Inter, "Malgun Gothic", sans-serif';
        ctx.fillStyle = '#2563eb';
        ctx.textAlign = 'right';
        ctx.fillText((Number(item.totalScore) || 0).toFixed(2), col3RightX, centerY);

        curY += rowH;
    });
}

/**
 * 부문별 최종 훈격 확정 요약표를 PNG 파일로 생성 후 다운로드
 * @param {Object} finalResultsData - { support: [...], technology: [...] }
 * @param {Object} [options] - { category?: string, fileName?: string }
 */
export function exportAwardsBoardToPNG(finalResultsData, options = {}) {
    if (!finalResultsData) return;

    const targetCategory = options.category || null;
    const categories = targetCategory
        ? [targetCategory].filter(c => Array.isArray(finalResultsData[c]))
        : Object.keys(finalResultsData).filter(c => Array.isArray(finalResultsData[c]));

    if (categories.length === 0) return;

    const isSingle = categories.length === 1;
    const scale = 2; // 2x 고해상도 레티나 PNG
    const padX = 40;
    const headerH = 98;
    const footerH = 44;
    const gap = 28;
    const cols = isSingle ? 1 : 2;
    const cardW = isSingle ? 700 : 660;
    const canvasW = cardW * cols + gap * (cols - 1) + padX * 2;

    const rowsCount = Math.ceil(categories.length / cols);
    const rowHeights = [];
    for (let r = 0; r < rowsCount; r++) {
        const rowCats = categories.slice(r * cols, (r + 1) * cols);
        rowHeights.push(Math.max(...rowCats.map(cat => measureCategoryCardHeight(finalResultsData[cat]))));
    }
    const totalCardsH = rowHeights.reduce((sum, h) => sum + h, 0) + gap * (rowsCount - 1);
    const canvasH = headerH + totalCardsH + footerH + 16;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW * scale;
    canvas.height = canvasH * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // 전체 배경
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // 상단 타이틀 배너
    const eventYear = appState.eventInfo?.YEAR || appState.currentYear || '2026';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '900 24px Inter, "Malgun Gothic", "맑은 고딕", sans-serif';
    const titleLabel = targetCategory
        ? `${eventYear} 경영혁신 경진대회 — ${CATEGORY_DISPLAY_NAMES[targetCategory] || targetCategory} 부문 최종 훈격 결과`
        : `${eventYear} 경영혁신 경진대회 — 부문별 최종 훈격 확정 결과`;
    ctx.fillText(titleLabel, padX, 38);

    ctx.font = '600 13px Inter, "Malgun Gothic", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('목록 순서: 훈격 / 특별상  |  발표자  |  종합점수 (심사위원 평균 점수 + 임직원 투표 점수 합산)', padX, 68);

    // 상단 구분선
    ctx.beginPath();
    ctx.moveTo(padX, 86);
    ctx.lineTo(canvasW - padX, 86);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 부문별 카드 그리기 (2열 그리드 배치)
    let curRowY = headerH;
    for (let r = 0; r < rowsCount; r++) {
        const rowCats = categories.slice(r * cols, (r + 1) * cols);
        const rowH = rowHeights[r];
        rowCats.forEach((cat, colIdx) => {
            const cardX = padX + colIdx * (cardW + gap);
            drawCategoryCard(ctx, cat, finalResultsData[cat], cardX, curRowY, cardW, rowH);
        });
        curRowY += rowH + gap;
    }

    // 하단 푸터
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    ctx.font = '500 12px Inter, "Malgun Gothic", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText(`출력 일시: ${timestamp}`, padX, canvasH - 22);
    ctx.textAlign = 'right';
    ctx.fillText(`${eventYear} 경영혁신 경진대회 평가 시스템`, canvasW - padX, canvasH - 22);

    const defaultName = targetCategory
        ? `${eventYear}_${CATEGORY_DISPLAY_NAMES[targetCategory] || targetCategory}부문_최종_훈격_결과.png`
        : `${eventYear}_부문별_최종_훈격_결과.png`;
    const fileName = options.fileName || defaultName;

    const imageURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imageURL;
    link.download = fileName;
    link.click();
}
