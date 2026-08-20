/**
 * keyboardNav.js
 * 평가 점수 입력 테이블용 엑셀형 스마트 키보드 방향키 내비게이션 모듈
 */

export function handleScoreTableKeyDown(e) {
    const input = e.target;
    if (!input || !input.classList.contains('score-input')) return;

    const table = input.closest('table');
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const currentRow = input.closest('tr');
    const rowIndex = rows.indexOf(currentRow);
    if (rowIndex === -1) return;

    const currentInputsInRow = Array.from(currentRow.querySelectorAll('.score-input'));
    const colIndex = currentInputsInRow.indexOf(input);
    if (colIndex === -1) return;

    let targetInput = null;

    switch (e.key) {
        case 'ArrowUp':
            e.preventDefault();
            if (rowIndex > 0) {
                const prevRowInputs = Array.from(rows[rowIndex - 1].querySelectorAll('.score-input'));
                targetInput = prevRowInputs[colIndex] || prevRowInputs[prevRowInputs.length - 1];
            }
            break;

        case 'ArrowDown':
        case 'Enter':
            e.preventDefault();
            if (rowIndex < rows.length - 1) {
                const nextRowInputs = Array.from(rows[rowIndex + 1].querySelectorAll('.score-input'));
                targetInput = nextRowInputs[colIndex] || nextRowInputs[nextRowInputs.length - 1];
            }
            break;

        case 'ArrowLeft':
            // 커서가 맨 앞이거나 선택 영역이 전체일 때 왼쪽 셀로 이동
            if (input.selectionStart === 0 && input.selectionEnd === 0 && colIndex > 0) {
                e.preventDefault();
                targetInput = currentInputsInRow[colIndex - 1];
            }
            break;

        case 'ArrowRight':
            // 커서가 맨 뒤이거나 선택 영역이 전체일 때 오른쪽 셀로 이동
            if (input.selectionStart === input.value.length && colIndex < currentInputsInRow.length - 1) {
                e.preventDefault();
                targetInput = currentInputsInRow[colIndex + 1];
            }
            break;

        default:
            return;
    }

    if (targetInput) {
        targetInput.focus();
        targetInput.select();
    }
}
