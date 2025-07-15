// UI Utilities and Components
// ==============================

// Toast Notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 2000);
    }, 100);
}

// Modal Management
function showModal(title, content, buttons = [], options = {}) {
    const modalElement = document.getElementById('commonModal');
    if (!modalElement) return;
    
    // 기존 모달 인스턴스 제거
    const existingModal = bootstrap.Modal.getInstance(modalElement);
    if (existingModal) {
        existingModal.dispose();
    }

    // 모달 초기화 전에 이벤트 리스너 제거
    modalElement.removeEventListener('hidden.bs.modal', handleModalHidden);
    
    // Set modal size if specified
    const dialogElement = modalElement.querySelector('.modal-dialog');
    dialogElement.className = 'modal-dialog'; // Reset classes
    if (options.modalSize) {
        dialogElement.classList.add(options.modalSize);
    } else {
        dialogElement.classList.add('modal-xl');
    }

    // Set modal header with Bootstrap close button
    const header = modalElement.querySelector('.modal-header');
    if (header) {
        header.innerHTML = `
            <h5 class="modal-title" id="commonModalLabel">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" onclick="closeModal()"></button>
        `;
    }

    const modalBody = modalElement.querySelector('.modal-body');
    if (modalBody) {
        modalBody.innerHTML = content;
    }

    const footer = modalElement.querySelector('.modal-footer');
    if (footer) {
        footer.className = 'modal-footer modal-footer-custom';

        // Handle both string and array inputs for buttons
        if (typeof buttons === 'string') {
            // If buttons is a string, use it directly as HTML
            footer.innerHTML = buttons;
        } else if (Array.isArray(buttons)) {
            // If buttons is an array, map it to HTML
            footer.innerHTML = buttons.map(btn => `
                <button type="button" class="btn ${btn.class}" ${btn.handler}>
                    ${btn.text}
                </button>
            `).join('');
        } else {
            // If no valid buttons provided, add a default close button
            footer.innerHTML = `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" onclick="closeModal()">닫기</button>
            `;
        }
    }

    // 모달 이벤트 리스너 추가
    modalElement.addEventListener('hidden.bs.modal', handleModalHidden);

    // 새로운 모달 인스턴스 생성
    const modal = new bootstrap.Modal(modalElement, {
        backdrop: true,  // 배경 클릭으로 닫히도록 설정
        keyboard: true   // ESC 키로 닫히도록 허용
    });
    
    // 모달 표시 전에 기존 backdrop 제거
    const existingBackdrops = document.querySelectorAll('.modal-backdrop');
    existingBackdrops.forEach(backdrop => backdrop.remove());
    
    // body 클래스 초기화
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    
    // 모달 표시
    setTimeout(() => {
        modal.show();
    }, 0);
    
    return modalElement;
}

// 모달이 닫힐 때 실행되는 핸들러
function handleModalHidden(event) {
    // 이벤트가 현재 모달에서 발생한 것인지 확인
    if (event && event.target !== this) {
        return;
    }

    const modalElement = this;
    
    // 모달 인스턴스 제거
    try {
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
            modalInstance.dispose();
        }
    } catch (error) {
        console.warn('Modal instance disposal failed:', error);
    }
    
    // 배경 제거
    try {
        const modalBackdrops = document.querySelectorAll('.modal-backdrop');
        modalBackdrops.forEach(backdrop => backdrop.remove());
    } catch (error) {
        console.warn('Modal backdrop removal failed:', error);
    }
    
    // body 클래스 및 스타일 제거
    try {
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
    } catch (error) {
        console.warn('Body style cleanup failed:', error);
    }

    // 모달 내용 초기화
    try {
        const modalBody = modalElement.querySelector('.modal-body');
        const modalFooter = modalElement.querySelector('.modal-footer');
        if (modalBody) modalBody.innerHTML = '';
        if (modalFooter) modalFooter.innerHTML = '';
    } catch (error) {
        console.warn('Modal content cleanup failed:', error);
    }
}

function closeModal() {
    const modalEl = document.getElementById('commonModal');
    if (!modalEl) return;

    try {
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) {
            modalInstance.hide();
        } else {
            // 인스턴스가 없는 경우 수동으로 정리
            handleModalHidden.call(modalEl);
        }
    } catch (error) {
        console.warn('Modal closing failed:', error);
        // 강제로 모달 정리
        modalEl.style.display = 'none';
        modalEl.classList.remove('show');
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
        const modalBackdrops = document.querySelectorAll('.modal-backdrop');
        modalBackdrops.forEach(backdrop => backdrop.remove());
    }
}

// Confirmation Modal
function showConfirmation({ title, message, confirmText = '확인', cancelText = '취소', onConfirm }) {
    console.log('showConfirmation() 함수 호출됨. 제목:', title);
    const confirmationModalEl = document.getElementById('confirmationModal');
    const confirmationModal = bootstrap.Modal.getOrCreateInstance(confirmationModalEl);
    
    confirmationModalEl.querySelector('#confirmationModalLabel').textContent = title;
    confirmationModalEl.querySelector('#confirmationMessage').textContent = message;
    
    const confirmBtn = confirmationModalEl.querySelector('#confirmBtn');
    confirmBtn.textContent = confirmText;

    const cancelBtn = confirmationModalEl.querySelector('#cancelBtn');
    cancelBtn.textContent = cancelText;

    const confirmHandler = () => {
        if (onConfirm) {
            onConfirm();
        }
        confirmationModal.hide();
    };
    
    // cloneNode is a robust way to remove all previous event listeners.
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.addEventListener('click', confirmHandler);

    console.log('확인 모달을 표시합니다.');
    confirmationModal.show();
}

// Modern Search Dropdown
function createModernSearchDropdown(input, items, onSelect) {
    if (!input || !items || !onSelect) {
        console.warn('드롭다운 생성 실패: 필수 파라미터 누락', { input, items, onSelect });
        return;
    }

    // 입력 필드에 ID가 없으면 생성
    if (!input.id) {
        input.id = 'dropdown-input-' + Math.random().toString(36).substr(2, 9);
    }

    // 기존 드롭다운 찾기 또는 새로 생성
    let dropdown = document.querySelector(`[data-for="${input.id}"]`);
    
    // 드롭다운이 없거나 body의 직접적인 자식이 아닌 경우 새로 생성
    if (!dropdown || dropdown.parentElement !== document.body) {
        // 기존 드롭다운 제거
        if (dropdown) {
            dropdown.remove();
        }
        
        // 새 드롭다운 생성 및 body에 직접 추가
        dropdown = document.createElement('div');
        dropdown.className = 'searchable-select-dropdown';
        dropdown.setAttribute('data-for', input.id);
        document.body.appendChild(dropdown);
        
        console.log('새 드롭다운 생성됨:', {
            id: input.id,
            parentIsBody: dropdown.parentElement === document.body
        });
    }
    
    // 드롭다운 스타일 설정
    const baseStyles = {
        position: 'fixed', // fixed로 변경하여 스크롤에 영향받지 않도록
        zIndex: '9999',
        backgroundColor: 'white',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        overflowY: 'auto',
        minHeight: '36px',
        maxHeight: '260px',
        padding: '8px 0',
        display: 'none', // 초기에는 숨김
        minWidth: '200px',
        color: '#333' // 기본 텍스트 색상 지정
    };

    // 스타일 적용
    Object.assign(dropdown.style, baseStyles);

    let activeIdx = -1;
    let filteredItems = items;
    let isMouseOverDropdown = false;
    let blurTimeout = null;

    // 드롭다운 위치 업데이트 함수
    function updateDropdownPosition() {
        const inputRect = input.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        const dropdownHeight = dropdown.offsetHeight;
        const viewportHeight = window.innerHeight;
        
        // 입력창 아래쪽 공간
        const spaceBelow = viewportHeight - inputRect.bottom;
        // 입력창 위쪽 공간
        const spaceAbove = inputRect.top;
        
        // 아래쪽에 충분한 공간이 있거나, 위쪽보다 더 많은 공간이 있는 경우 아래에 표시
        const showBelow = spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove;
        
        // 위치 계산
        const left = inputRect.left + scrollX;
        const top = showBelow 
            ? inputRect.bottom + scrollY // 아래쪽에 표시
            : inputRect.top + scrollY - dropdownHeight; // 위쪽에 표시
        
        // 스타일 적용
        const styles = {
            position: 'absolute',
            left: `${left}px`,
            top: `${top}px`,
            width: `${Math.max(inputRect.width, 200)}px`,
            maxHeight: '260px'
        };
        
        Object.assign(dropdown.style, styles);
        
        // 방향에 따른 클래스 설정
        dropdown.classList.toggle('dropdown-up', !showBelow);
        dropdown.classList.toggle('dropdown-down', showBelow);
        
        // 위치 업데이트 로깅
        console.log('드롭다운 위치 업데이트:', {
            input: {
                rect: inputRect,
                scroll: { x: scrollX, y: scrollY }
            },
            space: {
                below: spaceBelow,
                above: spaceAbove
            },
            position: {
                left,
                top,
                showBelow,
                dropdownHeight
            },
            viewport: {
                height: viewportHeight,
                scroll: scrollY
            }
        });
    }

    // 마우스 이벤트 핸들러
    function setupMouseHandlers() {
        dropdown.addEventListener('mouseenter', () => {
            isMouseOverDropdown = true;
            if (blurTimeout) {
                clearTimeout(blurTimeout);
                blurTimeout = null;
            }
        });
        
        dropdown.addEventListener('mouseleave', () => {
            isMouseOverDropdown = false;
        });
    }

    // 드롭다운 표시/숨김 함수
    function showDropdown() {
        dropdown.style.display = 'block';
        updateDropdownPosition();
        
        // 드롭다운이 body의 직접적인 자식인지 확인
        if (dropdown.parentElement !== document.body) {
            document.body.appendChild(dropdown);
            console.warn('드롭다운이 body로 강제 이동됨');
        }
    }

    function hideDropdown() {
        if (!isMouseOverDropdown) {
            dropdown.style.display = 'none';
        }
    }

    // 입력창 이벤트 핸들러
    function setupInputHandlers() {
        input.addEventListener('focus', () => {
            if (blurTimeout) {
                clearTimeout(blurTimeout);
                blurTimeout = null;
            }
            filterList(input.value);
        });

        input.addEventListener('blur', () => {
            blurTimeout = setTimeout(() => {
                if (!isMouseOverDropdown) {
                    hideDropdown();
                }
            }, 200);
        });

        input.addEventListener('input', () => {
            filterList(input.value);
        });
    }

    // 필터링 및 렌더링
    function filterList(query = '') {
        const searchQuery = query.toLowerCase().trim();
        filteredItems = items.filter(item => 
            (item.text || '').toLowerCase().includes(searchQuery)
        );
        renderDropdown();
        showDropdown();
    }

    function renderDropdown() {
        if (filteredItems.length === 0) {
            dropdown.innerHTML = `
                <div class="no-results" style="
                    padding: 12px 16px;
                    color: #666;
                    text-align: center;
                    font-style: italic;
                    min-height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: white;
                ">검색 결과가 없습니다</div>
            `;
        } else {
            dropdown.innerHTML = filteredItems.map((item, idx) => `
                <div class="modern-search-item ${idx === activeIdx ? 'active' : ''}" 
                     data-idx="${idx}" 
                     data-value="${item.value || ''}"
                     style="
                        padding: 12px 16px;
                        cursor: pointer;
                        min-height: 36px;
                        display: flex;
                        align-items: center;
                        background-color: ${idx === activeIdx ? '#f0f7ff' : 'white'};
                        color: ${idx === activeIdx ? '#2563eb' : '#333'};
                        transition: all 0.2s ease;
                        border-bottom: 1px solid #eee;
                        font-size: 14px;
                        font-weight: ${idx === activeIdx ? '500' : 'normal'};
                     ">
                    <span class="item-main" style="
                        display: block;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        flex: 1;
                    ">${item.text || ''}</span>
                </div>
            `).join('');
        }

        // 아이템 클릭 이벤트 설정
        dropdown.querySelectorAll('.modern-search-item').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.idx);
                if (idx >= 0 && idx < filteredItems.length) {
                    const selectedItem = filteredItems[idx];
                    onSelect(selectedItem);
                    input.value = selectedItem.text || '';
                    hideDropdown();
                }
            });
            
            el.addEventListener('mouseover', () => {
                activeIdx = parseInt(el.dataset.idx);
                updateActive();
            });
        });
    }

    function updateActive() {
        dropdown.querySelectorAll('.modern-search-item').forEach((el, idx) => {
            const isActive = idx === activeIdx;
            el.style.backgroundColor = isActive ? '#f0f7ff' : 'white';
            el.style.color = isActive ? '#2563eb' : '#333';
            el.style.fontWeight = isActive ? '500' : 'normal';
        });
    }

    // 초기 설정
    setupMouseHandlers();
    setupInputHandlers();
    filterList(input.value);

    // 스크롤/리사이즈 시 위치 업데이트
    window.addEventListener('scroll', () => {
        if (dropdown.style.display === 'block') {
            requestAnimationFrame(updateDropdownPosition);
        }
    }, true);

    window.addEventListener('resize', () => {
        if (dropdown.style.display === 'block') {
            requestAnimationFrame(updateDropdownPosition);
        }
    });

    // 클린업 함수 반환
    return {
        destroy: () => {
            dropdown.remove();
            // 이벤트 리스너 제거는 여기에 추가
        }
    };
}

// Pagination Component
function renderPagination(key, totalPages, currentPage) {
    const container = document.getElementById('pagination-container');
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let paginationHTML = '<nav><ul class="pagination">';

    // Previous button
    paginationHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="event.preventDefault(); changePage('${key}', ${currentPage - 1})">이전</a>
    </li>`;

    // Page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 3) {
        endPage = Math.min(5, totalPages);
    }
    if (currentPage > totalPages - 2) {
        startPage = Math.max(1, totalPages - 4);
    }
    
    if (startPage > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="event.preventDefault(); changePage('${key}', 1)">1</a></li>`;
        if (startPage > 2) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="event.preventDefault(); changePage('${key}', ${i})">${i}</a>
        </li>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="event.preventDefault(); changePage('${key}', ${totalPages})">${totalPages}</a></li>`;
    }

    // Next button
    paginationHTML += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="event.preventDefault(); changePage('${key}', ${currentPage + 1})">다음</a>
    </li>`;

    paginationHTML += '</ul></nav>';
    container.innerHTML = paginationHTML;
}

function changePage(key, page) {
    const items = state[key];
    if (!items) return;
    const totalPages = Math.ceil(items.length / 10);
    if (page < 1 || page > totalPages) return;

    state[key + 'CurrentPage'] = page;
    
    switch(key) {
        case 'partners':
            if (typeof window.displayPartners === 'function') {
                const searchInput = document.getElementById('partnerSearchInput');
                const searchTerm = searchInput ? searchInput.value : '';
                window.displayPartners(page, searchTerm);
            } else {
                // fallback: 강제로 전체 페이지 새로고침
                location.reload();
            }
            break;
    }
}

// Export functions for use in HTML
window.showToast = showToast;
window.showModal = showModal;
window.showConfirmation = showConfirmation;
window.createModernSearchDropdown = createModernSearchDropdown;
window.renderPagination = renderPagination;
window.changePage = changePage;

function showModalWithPurchaseForm(purchase = null) {
    const isEditing = purchase !== null;
    const modalTitle = isEditing ? '매입 수정' : '매입 등록';
    
    const now = new Date();
    const today = now.toISOString().substring(0, 10);
    const purchaseDate = isEditing ? purchase.date.substring(0, 10) : today;

    const modalBody = `
        <form id="purchaseForm">
            <div class="mb-3">
                <label for="partnerSearch" class="form-label">거래처</label>
                <div class="input-group">
                    <input type="text" class="form-control" id="partnerSearch" placeholder="거래처 검색" required>
                    <input type="hidden" id="partnerId" name="partnerId" required>
                </div>
            </div>
            <div class="mb-3">
                <label class="form-label">매입일자</label>
                <input type="date" class="form-control" name="purchaseDate" required>
            </div>
            <div class="purchase-items">
                <!-- 매입 품목 목록 -->
            </div>
            <button type="button" class="btn btn-secondary btn-sm mb-3" onclick="addPurchaseItem()">
                + 품목 추가
            </button>
        </form>
    `;

    const modalFooter = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">취소</button>
        <button type="button" class="btn btn-primary" onclick="savePurchase(${purchase?.id || 'null'})">저장</button>
    `;

    showModal(modalTitle, modalBody, [modalFooter]);

    // 모달이 표시된 후 드롭다운 초기화
    const modal = document.getElementById('commonModal');
    modal.addEventListener('shown.bs.modal', () => {
        // 모달이 열릴 때 자동 focus 방지 (드롭다운 자동 노출 방지)
        document.activeElement.blur();
        // 거래처 검색 드롭다운 초기화
        const partnerSearch = document.getElementById('partnerSearch');
        const partnerId = document.getElementById('partnerId');
        
        const partnerItems = state.partners.map(partner => ({
            text: `${partner.name} (${partner.businessNumber || '사업자번호 없음'})`,
            value: partner.id
        }));

        createModernSearchDropdown(partnerSearch, partnerItems, (selected) => {
            partnerId.value = selected.value;
            partnerSearch.value = selected.text;
        });

        // 기존 데이터가 있는 경우 값 설정
        if (purchase?.partnerId) {
            const partner = state.partners.find(p => p.id === purchase.partnerId);
            if (partner) {
                partnerId.value = partner.id;
                partnerSearch.value = `${partner.name} (${partner.businessNumber || '사업자번호 없음'})`;
            }
        }

        // 날짜 필드 초기화
        const dateField = modal.querySelector('[name="purchaseDate"]');
        dateField.value = purchase?.date || new Date().toISOString().split('T')[0];

        // 기존 품목이 있는 경우 추가
        if (purchase?.items) {
            purchase.items.forEach(item => addPurchaseItem(item));
        } else {
            addPurchaseItem(); // 빈 품목 하나 추가
        }
    });
}

function addPurchaseItem(itemData = null) {
    const container = document.querySelector('.purchase-items');
    const itemIndex = container.children.length;

    const itemRow = document.createElement('div');
    itemRow.className = 'purchase-item row g-3 mb-3 align-items-center';
    itemRow.innerHTML = `
        <div class="col-md-4">
            <div class="input-group">
                <input type="text" class="form-control item-search" placeholder="품목 검색" required>
                <input type="hidden" name="itemId[]" required>
            </div>
        </div>
        <div class="col-md-2">
            <input type="number" class="form-control" name="quantity[]" placeholder="수량" required>
        </div>
        <div class="col-md-3">
            <input type="text" class="form-control text-end" name="unitPrice[]" placeholder="단가" required>
        </div>
        <div class="col-md-2">
            <input type="text" class="form-control text-end" name="amount[]" placeholder="금액" readonly>
        </div>
        <div class="col-md-1">
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="removePurchaseItem(this)">삭제</button>
        </div>
    `;

    container.appendChild(itemRow);

    // 품목 검색 드롭다운 초기화
    const itemSearch = itemRow.querySelector('.item-search');
    const itemIdField = itemRow.querySelector('[name="itemId[]"]');
    
    const itemsList = state.items.map(item => ({
        text: `${item.name} (${item.code})`,
        value: item.id
    }));

    createModernSearchDropdown(itemSearch, itemsList, (selected) => {
        itemIdField.value = selected.value;
        itemSearch.value = selected.text;
        
        // 선택된 품목의 기본 단가 설정
        const selectedItem = state.items.find(item => item.id === selected.value);
        if (selectedItem?.defaultUnitPrice) {
            const unitPriceField = itemRow.querySelector('[name="unitPrice[]"]');
            unitPriceField.value = formatCurrency(selectedItem.defaultUnitPrice);
            calculatePurchaseRow(unitPriceField);
        }
    });

    // 기존 데이터가 있는 경우 값 설정
    if (itemData) {
        const item = state.items.find(i => i.id === itemData.itemId);
        if (item) {
            itemIdField.value = item.id;
            itemSearch.value = `${item.name} (${item.code})`;
        }
        itemRow.querySelector('[name="quantity[]"]').value = itemData.quantity;
        itemRow.querySelector('[name="unitPrice[]"]').value = formatCurrency(itemData.unitPrice);
        itemRow.querySelector('[name="amount[]"]').value = formatCurrency(itemData.amount);
    }

    // 수량/단가 변경 시 금액 계산
    const quantityField = itemRow.querySelector('[name="quantity[]"]');
    const unitPriceField = itemRow.querySelector('[name="unitPrice[]"]');

    quantityField.addEventListener('input', () => calculatePurchaseRow(quantityField));
    unitPriceField.addEventListener('input', () => calculatePurchaseRow(unitPriceField));
}

// 품목 행 삭제
function removePurchaseItem(button) {
    const row = button.closest('.item-list-row');
    if (row) {
        row.remove();
        updateTotalPurchaseAmount();
    }
}

// 행 계산
function calculatePurchaseRow(element) {
    const row = element.closest('.item-list-row');
    if (!row) return;

    const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
    const price = parseCurrency(row.querySelector('.item-price').value) || 0;
    
    const supplyAmount = quantity * price;
    const tax = Math.round(supplyAmount * 0.1);
    const total = supplyAmount + tax;

    row.querySelector('.item-supply-amount').value = formatCurrency(supplyAmount);
    row.querySelector('.item-tax').value = formatCurrency(tax);
    row.querySelector('.item-total').value = formatCurrency(total);

    updateTotalPurchaseAmount();
}

// 총액 업데이트
function updateTotalPurchaseAmount() {
    const rows = document.querySelectorAll('.item-list-row');
    let total = 0;
    
    rows.forEach(row => {
        const rowTotal = parseCurrency(row.querySelector('.item-total').value) || 0;
        total += rowTotal;
    });
    
    document.getElementById('totalPurchaseAmount').textContent = formatCurrency(total);
}

function showModalWithSaleForm(sale = null) {
    // ... existing code ... */
}

// Close search results when clicking outside
document.addEventListener('click', function(event) {
    // 외부 클릭 시 드롭다운 닫기 처리는 createModernSearchDropdown 내부에서 처리됨
});

// 매입 저장 함수
function savePurchase(purchaseId = null) {
    const purchaseDate = document.getElementById('purchaseDate').value;
    const partnerCode = document.getElementById('partnerCode').value;

    if (!purchaseDate || !partnerCode) {
        showToast('거래일자와 거래처를 입력해주세요.');
        return;
    }

    const items = [];
    const itemRows = document.querySelectorAll('.item-list-row');
    
    for (let row of itemRows) {
        const itemCode = row.querySelector('.item-code').value;
        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;

        if (!itemCode || !quantity || !price) {
            showToast('모든 품목의 품목, 수량, 단가를 입력해주세요.');
            return;
        }

        items.push({
            item: itemCode,
            quantity: quantity,
            price: price
        });
    }

    if (items.length === 0) {
        showToast('최소 하나의 품목을 입력해주세요.');
        return;
    }

    if (purchaseId) {
        // 수정
        const index = state.purchases.findIndex(p => p.id === purchaseId);
        if (index !== -1) {
            state.purchases[index] = {
                ...state.purchases[index],
                date: purchaseDate,
                partner: partnerCode,
                items: items,
                updatedAt: new Date().toISOString()
            };
            showToast('매입이 수정되었습니다.');
        }
    } else {
        // 신규 등록
        const newPurchase = {
            id: generateId(),
            date: purchaseDate,
            partner: partnerCode,
            items: items,
            createdAt: new Date().toISOString()
        };
        state.purchases.push(newPurchase);
        showToast('매입이 등록되었습니다.');
    }

    saveCompanyState();
    closeModal();
    
    // 매입 목록 새로고침
    if (typeof loadPurchasesTable === 'function') {
        loadPurchasesTable();
    }
}

// 통화 포맷 함수
function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '0';
    }
    return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
}

// 통화 파싱 함수
function parseCurrency(value) {
    if (!value) return 0;
    return parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
}

// ID 생성 함수
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Export additional functions for use in HTML
window.savePurchase = savePurchase;
window.formatCurrency = formatCurrency;
window.parseCurrency = parseCurrency;
window.generateId = generateId;
