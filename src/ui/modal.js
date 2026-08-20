/**
 * modal.js
 * 메시지 알림 및 확인(Confirm) 다이얼로그 모달 제어 모듈
 */

let confirmActionCallback = null;

export function showMessage(message, isConfirmation = false, onConfirm = null) {
    const modal = document.getElementById('messageModal');
    const modalContent = document.getElementById('modal-content');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('confirmModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    
    if (!modal || !modalContent) return;

    modalTitle.textContent = isConfirmation ? '확인' : '알림';
    modalMessage.textContent = message;
    
    if (isConfirmation) {
        confirmBtn.classList.remove('hidden');
        closeBtn.textContent = '취소';
        confirmActionCallback = onConfirm;
    } else {
        confirmBtn.classList.add('hidden');
        closeBtn.textContent = '확인';
        confirmActionCallback = null;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // 부드러운 애니메이션
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95', 'opacity-0');
    }, 10);
}

export function hideMessage() {
    const modal = document.getElementById('messageModal');
    const modalContent = document.getElementById('modal-content');
    if (!modal || !modalContent) return;

    modal.classList.add('opacity-0');
    modalContent.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        confirmActionCallback = null;
    }, 300);
}

export function initModal() {
    const closeBtn = document.getElementById('closeModalBtn');
    const confirmBtn = document.getElementById('confirmModalBtn');

    if (closeBtn) {
        closeBtn.addEventListener('click', hideMessage);
    }
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (typeof confirmActionCallback === 'function') {
                confirmActionCallback();
            }
            hideMessage();
        });
    }
}
