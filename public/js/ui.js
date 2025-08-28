// 공통 UI 함수들
import { state, getCurrentCompanyBusinessNumber } from './main.js';

// Loading Management
export function showLoading(message = '로딩 중...', duration = 0) {
    console.log('showLoading 호출:', message);
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        console.error('loadingOverlay 요소를 찾을 수 없습니다.');
        return;
    }
    
    const loadingText = overlay.querySelector('.loading-text');
    if (loadingText) {
        loadingText.textContent = message;
    }
    
    // 프로그레스 바 초기화
    const progressFill = overlay.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = '0%';
    }
    
    overlay.style.display = 'flex';
    console.log('로딩 오버레이 표시됨');
    
    // 지연 로딩을 위한 최소 표시 시간
    if (duration > 0) {
        setTimeout(() => {
            hideLoading();
        }, duration);
    }
}

export function hideLoading() {
    console.log('hideLoading 호출');
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        console.error('loadingOverlay 요소를 찾을 수 없습니다.');
        return;
    }
    overlay.style.display = 'none';
    console.log('로딩 오버레이 숨김됨');
}

// 지연 로딩을 위한 함수
export function showLoadingWithDelay(message = '로딩 중...', minDuration = 500) {
    const startTime = Date.now();
    
    showLoading(message);
    
    return {
        hide: () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, minDuration - elapsed);
            
            setTimeout(() => {
                hideLoading();
            }, remaining);
        }
    };
}

// 프로그레스 로딩 함수
export function showProgressLoading(message = '처리 중...', steps = []) {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    
    const loadingText = overlay.querySelector('.loading-text');
    const progressFill = overlay.querySelector('.progress-fill');
    
    let currentStep = 0;
    
    const updateProgress = (stepMessage, progress) => {
        if (loadingText) loadingText.textContent = stepMessage;
        if (progressFill) progressFill.style.width = `${progress}%`;
    };
    
    const nextStep = () => {
        if (currentStep < steps.length) {
            const step = steps[currentStep];
            const progress = ((currentStep + 1) / steps.length) * 100;
            updateProgress(step.message, progress);
            currentStep++;
        }
    };
    
    showLoading(message);
    nextStep();
    
    return {
        next: nextStep,
        complete: () => {
            updateProgress('완료!', 100);
            setTimeout(hideLoading, 500);
        }
    };
}

// Debounce utility function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 지연로딩을 위한 유틸리티 함수들
export function lazyLoad(loader, options = {}) {
    const {
        minDelay = 300,
        showLoading = true,
        loadingMessage = '로딩 중...'
    } = options;
    
    return async (...args) => {
        const startTime = Date.now();
        let loadingController = null;
        
        if (showLoading) {
            loadingController = showLoadingWithDelay(loadingMessage, minDelay);
        }
        
        try {
            const result = await loader(...args);
            return result;
        } finally {
            if (loadingController) {
                loadingController.hide();
            }
        }
    };
}

// 스켈레톤 로딩을 위한 함수
export function createSkeletonLoader(container, itemCount = 5) {
    const skeletonHTML = `
        <div class="skeleton-item" style="
            height: 60px;
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: skeleton-loading 1.5s infinite;
            border-radius: 8px;
            margin-bottom: 12px;
        "></div>
    `;
    
    container.innerHTML = skeletonHTML.repeat(itemCount);
    
    // 스켈레톤 애니메이션 CSS 추가
    if (!document.querySelector('#skeleton-styles')) {
        const style = document.createElement('style');
        style.id = 'skeleton-styles';
        style.textContent = `
            @keyframes skeleton-loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// 무한 스크롤을 위한 Intersection Observer
export function createInfiniteScroll(container, loader, options = {}) {
    const {
        threshold = 0.1,
        rootMargin = '100px'
    } = options;
    
    let isLoading = false;
    let hasMore = true;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoading && hasMore) {
                isLoading = true;
                loader().then(() => {
                    isLoading = false;
                }).catch(() => {
                    isLoading = false;
                });
            }
        });
    }, { threshold, rootMargin });
    
    // 감시할 요소 추가
    const observeElement = () => {
        const lastItem = container.lastElementChild;
        if (lastItem) {
            observer.observe(lastItem);
        }
    };
    
    // 초기 감시 시작
    observeElement();
    
    return {
        observe: observeElement,
        disconnect: () => observer.disconnect(),
        setHasMore: (value) => { hasMore = value; }
    };
}

// Virtual scrolling for large datasets
export class VirtualScroller {
    constructor(container, itemHeight, items, renderItem) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.items = items;
        this.renderItem = renderItem;
        this.visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
        this.scrollTop = 0;
        this.startIndex = 0;
        this.endIndex = this.visibleItems;
        
        this.init();
    }
    
    init() {
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';
        
        // Create spacer elements
        this.topSpacer = document.createElement('div');
        this.bottomSpacer = document.createElement('div');
        this.contentContainer = document.createElement('div');
        
        this.container.appendChild(this.topSpacer);
        this.container.appendChild(this.contentContainer);
        this.container.appendChild(this.bottomSpacer);
        
        this.container.addEventListener('scroll', this.handleScroll.bind(this));
        this.render();
    }
    
    handleScroll() {
        this.scrollTop = this.container.scrollTop;
        this.updateVisibleRange();
        this.render();
    }
    
    updateVisibleRange() {
        this.startIndex = Math.floor(this.scrollTop / this.itemHeight);
        this.endIndex = Math.min(this.startIndex + this.visibleItems, this.items.length);
    }
    
    render() {
        // Update spacers
        this.topSpacer.style.height = `${this.startIndex * this.itemHeight}px`;
        this.bottomSpacer.style.height = `${(this.items.length - this.endIndex) * this.itemHeight}px`;
        
        // Render visible items
        this.contentContainer.innerHTML = '';
        for (let i = this.startIndex; i < this.endIndex; i++) {
            const item = this.items[i];
            const element = this.renderItem(item, i);
            element.style.position = 'absolute';
            element.style.top = `${i * this.itemHeight}px`;
            element.style.width = '100%';
            this.contentContainer.appendChild(element);
        }
    }
    
    updateItems(newItems) {
        this.items = newItems;
        this.render();
    }
}

// Toast Notification
export function showToast(message, type = 'info') {
    // 기존 토스트가 있으면 제거
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // 애니메이션 시작
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // 3초 후 자동 제거
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Modal Management
export function showModal(title, content) {
    const modalTitle = document.querySelector('#commonModal .modal-title');
    const modalBody = document.querySelector('#commonModal .modal-body');
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    
    // 기존 모달 인스턴스가 있으면 제거
    const existingModal = bootstrap.Modal.getInstance(document.getElementById('commonModal'));
    if (existingModal) {
        existingModal.dispose();
    }
    
    const commonModal = new bootstrap.Modal(document.getElementById('commonModal'));
    commonModal.show();
}

/**
 * 새로운 검색형 드롭다운을 생성하고 제어하는 함수 (포털 방식)
 * @param {HTMLInputElement} inputElement - 드롭다운을 적용할 입력 필드
 * @param {Array<Object>} data - 검색할 데이터 배열 (e.g., [{value: 'code1', text: '품목1'}, ...])
 * @param {Function} onSelect - 항목을 선택했을 때 실행될 콜백 함수
 */
export function createSearchableDropdown(inputElement, data, onSelect) {
    console.log('createSearchableDropdown 호출됨:', inputElement, data.length, '개 항목');
    
    // 1. 포털 드롭다운 생성 (body에 직접 추가)
    const dropdownPortal = document.createElement('div');
    dropdownPortal.className = 'search-dropdown-portal';
    dropdownPortal.style.display = 'none';
    document.body.appendChild(dropdownPortal);

    // 2. 입력 이벤트 핸들러: 사용자가 입력할 때마다 목록 필터링
    inputElement.addEventListener('input', () => {
        const query = inputElement.value.toLowerCase();
        const filteredData = data.filter(item => item.text.toLowerCase().includes(query));
        renderDropdownItems(filteredData, query);
        showDropdown();
    });

    // 3. 포커스/블러 이벤트 핸들러: 드롭다운 보이기/숨기기
    inputElement.addEventListener('focus', () => {
        const query = inputElement.value.toLowerCase();
        const filteredData = data.filter(item => item.text.toLowerCase().includes(query));
        renderDropdownItems(filteredData, query);
        showDropdown();
    });
    
    document.addEventListener('click', (e) => {
        if (!inputElement.contains(e.target) && !dropdownPortal.contains(e.target)) {
            hideDropdown();
        }
    });

    // 4. 드롭다운 표시 함수
    function showDropdown() {
        const rect = inputElement.getBoundingClientRect();
        const modalContent = document.querySelector('.modal-content');
        const modalRect = modalContent ? modalContent.getBoundingClientRect() : null;
        
        dropdownPortal.style.position = 'fixed';
        dropdownPortal.style.zIndex = '9999';
        dropdownPortal.style.display = 'block';
        
        // 모달 내부에서 자연스럽게 보이도록 위치 조정
        if (modalRect) {
            // 모달 내부의 상대적 위치 계산
            const relativeTop = rect.top - modalRect.top;
            const relativeLeft = rect.left - modalRect.left;
            
            dropdownPortal.style.top = `${modalRect.top + relativeTop + rect.height + 4}px`;
            dropdownPortal.style.left = `${modalRect.left + relativeLeft}px`;
            dropdownPortal.style.width = `${rect.width}px`;
        } else {
            // 모달이 없는 경우 기본 위치
            dropdownPortal.style.top = `${rect.bottom + window.scrollY + 4}px`;
            dropdownPortal.style.left = `${rect.left}px`;
            dropdownPortal.style.width = `${rect.width}px`;
        }
        
        // 화면 밖으로 나가지 않도록 조정
        const portalRect = dropdownPortal.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        if (portalRect.right > windowWidth) {
            dropdownPortal.style.left = `${windowWidth - portalRect.width - 10}px`;
        }
        
        if (portalRect.bottom > windowHeight) {
            // 위쪽으로 표시
            dropdownPortal.style.top = `${rect.top + window.scrollY - portalRect.height - 4}px`;
        }
    }

    // 5. 드롭다운 숨김 함수
    function hideDropdown() {
        dropdownPortal.style.display = 'none';
    }

    // 6. 드롭다운 목록 렌더링 함수
    function renderDropdownItems(items, query) {
        dropdownPortal.innerHTML = '';
        if (items.length === 0) {
            dropdownPortal.innerHTML = '<div class="search-dropdown-item disabled">검색 결과가 없습니다.</div>';
            return;
        }
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'search-dropdown-item';
            // 검색어 하이라이팅
            div.innerHTML = item.text.replace(new RegExp(query, 'gi'), (match) => `<span class="highlight">${match}</span>`);
            
            div.addEventListener('click', () => {
                inputElement.value = item.text;
                hideDropdown();
                onSelect(item); // 선택 시 콜백 함수 실행
            });
            dropdownPortal.appendChild(div);
        });
    }
}

// Utility Functions
export function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '₩0';
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
    }).format(amount);
}

export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function updateTotals() {
    const totalAmountInput = document.getElementById('totalAmount');
    const totalTaxInput = document.getElementById('totalTax');
    const totalWithTaxInput = document.getElementById('totalWithTax');
    
    if (!totalAmountInput || !totalTaxInput || !totalWithTaxInput) return;
    
    let totalAmount = 0;
    let totalTax = 0;
    
    // 모든 품목 행을 순회하며 계산
    const itemRows = document.querySelectorAll('.item-row');
    itemRows.forEach(row => {
        const quantityInput = row.querySelector('.quantityInput');
        const priceInput = row.querySelector('.priceInput');
        const taxTypeSelect = row.querySelector('.taxTypeSelect');
        
        if (quantityInput && priceInput && taxTypeSelect) {
            const quantity = parseFloat(quantityInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const taxType = taxTypeSelect.value;
            
            const itemTotal = quantity * price;
            totalAmount += itemTotal;
            
            // 세금 계산
            let taxRate = 0;
            switch(taxType) {
                case '과세':
                    taxRate = 0.1; // 10% VAT
                    break;
                case '면세':
                    taxRate = 0;
                    break;
                case '영세':
                    taxRate = 0;
                    break;
            }
            
            totalTax += itemTotal * taxRate;
        }
    });
    
    const totalWithTax = totalAmount + totalTax;
    
    totalAmountInput.value = totalAmount.toFixed(0);
    totalTaxInput.value = totalTax.toFixed(0);
    totalWithTaxInput.value = totalWithTax.toFixed(0);
}

// Pagination
export function renderPagination(key, totalPages, currentPage) {
    console.log('renderPagination 호출됨:', { key, totalPages, currentPage });
    
    const container = document.getElementById('pagination-container');
    if (!container) {
        console.error('pagination-container를 찾을 수 없습니다.');
        return;
    }

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let paginationHTML = '<nav aria-label="페이지 네비게이션"><ul class="pagination">';

    // Previous button
    paginationHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="event.preventDefault(); changePage('${key}', ${currentPage - 1})" aria-label="이전 페이지">
            <i class='bx bx-chevron-left'></i>
        </a>
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
            <a class="page-link" href="#" onclick="event.preventDefault(); console.log('페이지 클릭:', ${i}); changePage('${key}', ${i})" aria-label="페이지 ${i}">${i}</a>
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
        <a class="page-link" href="#" onclick="event.preventDefault(); changePage('${key}', ${currentPage + 1})" aria-label="다음 페이지">
            <i class='bx bx-chevron-right'></i>
        </a>
    </li>`;

    paginationHTML += '</ul></nav>';
    console.log('생성된 페이지네이션 HTML:', paginationHTML);
    container.innerHTML = paginationHTML;
}

// Chart Initialization
export function initializeCharts() {
    // Sales Chart
    const salesCtx = document.getElementById('salesChart')?.getContext('2d');
    if (salesCtx) {
        new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
                datasets: [{
                    label: '매출액',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#3498db',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    // Inventory Chart
    const inventoryCtx = document.getElementById('inventoryChart')?.getContext('2d');
    if (inventoryCtx) {
        new Chart(inventoryCtx, {
            type: 'doughnut',
            data: {
                labels: ['정상', '저재고', '부족'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
} 

/**
 * DOM 요소가 준비될 때까지 대기하는 유틸리티 함수
 * @param {string} selector - 찾을 DOM 요소의 선택자
 * @param {number} maxAttempts - 최대 재시도 횟수 (기본값: 50)
 * @param {number} interval - 재시도 간격 (기본값: 100ms)
 * @returns {Promise<Element>} 준비된 DOM 요소
 */
export function waitForElement(selector, maxAttempts = 50, interval = 100) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        
        const checkElement = () => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }
            
            attempts++;
            if (attempts >= maxAttempts) {
                reject(new Error(`Element ${selector} not found after ${maxAttempts} attempts`));
                return;
            }
            
            setTimeout(checkElement, interval);
        };
        
        checkElement();
    });
}

/**
 * main-content 요소가 준비될 때까지 대기하는 특화 함수
 * @returns {Promise<Element>} 준비된 main-content 요소
 */
export function waitForMainContent() {
    return waitForElement('#main-content', 50, 100);
}

/**
 * main-content 요소를 안전하게 찾거나 생성하는 함수
 * @returns {Element|null} main-content 요소
 */
export function findOrCreateMainContent() {
    let mainContent = document.getElementById('main-content');
    
    // main-content가 없으면 content 요소를 찾아서 생성
    if (!mainContent) {
        const contentDiv = document.getElementById('content');
        if (contentDiv) {
            const containerFluid = contentDiv.querySelector('.container-fluid');
            if (containerFluid) {
                mainContent = document.createElement('div');
                mainContent.id = 'main-content';
                containerFluid.appendChild(mainContent);
            }
        }
    }
    
    return mainContent;
}

/**
 * main-content 요소가 준비될 때까지 안전하게 대기하는 함수
 * @param {number} maxAttempts - 최대 재시도 횟수 (기본값: 50)
 * @returns {Promise<Element>} 준비된 main-content 요소
 */
export function waitForMainContentSafe(maxAttempts = 50) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        
        const checkElement = () => {
            const mainContent = findOrCreateMainContent();
            if (mainContent) {
                resolve(mainContent);
                return;
            }
            
            attempts++;
            if (attempts >= maxAttempts) {
                reject(new Error('main-content 요소를 찾을 수 없습니다.'));
                return;
            }
            
            setTimeout(checkElement, 100);
        };
        
        checkElement();
    });
} 

/**
 * 모달을 안전하게 닫는 유틸리티 함수
 * @param {string} modalId - 모달 요소의 ID (기본값: 'commonModal')
 */
export function closeModal(modalId = 'commonModal') {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        } else {
            // 인스턴스가 없으면 새로 생성하여 닫기
            const newModal = new bootstrap.Modal(modalElement);
            newModal.hide();
        }
    }
} 

/**
 * 매입/매출 모달의 HTML을 동적으로 생성하는 공통 함수
 * @param {Object} config - 모달 설정 객체
 * @param {boolean} config.isEdit - 수정 모드 여부
 * @param {string} config.title - 모달 제목
 * @param {string} config.partnerLabel - 거래처 라벨 (예: '거래처', '출고처')
 * @param {Object} config.data - 수정할 데이터 (수정 모드일 때)
 * @returns {string} 모달 HTML
 */
export function createTransactionModalHTML(config) {
    const { isEdit, title, partnerLabel, data } = config;
    const modalId = isEdit ? 'edit' : 'new';
    
    return `
        <form id="transactionForm" autocomplete="off">
            <input type="hidden" name="transactionId" value="${isEdit ? data.id : ''}">
            <div class="row mb-3">
                <div class="col-md-6">
                    <label class="form-label">거래일자*</label>
                    <input type="date" class="form-control" id="transactionDate" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">${partnerLabel}*</label>
                    <input type="text" class="form-control" name="partnerSearch" placeholder="거래처명 또는 사업자번호 검색" autocomplete="off" required>
                    <div class="searchable-select-dropdown" id="partnerDropdown"></div>
                </div>
            </div>
            <div class="mb-3">
                <label class="form-label">품목 상세*</label>
                <div class="table-responsive">
                    <table class="table table-sm items-table">
                        <thead>
                            <tr class="text-center">
                                <th style="width:30%;">품목 (검색)</th>
                                <th style="width:12%;">수량</th>
                                <th style="width:15%;">단가</th>
                                <th style="width:15%;">부가세</th>
                                <th style="width:15%;">합계</th>
                                <th style="width:13%;"><button type="button" class="btn btn-sm btn-outline-primary" id="addRowBtn"><i class='bx bx-plus'></i></button></th>
                            </tr>
                        </thead>
                        <tbody id="transactionItemsBody"></tbody>
                    </table>
                </div>
            </div>
            <div class="row mt-3 pt-3 justify-content-end text-end transaction-summary">
                <div class="col-auto">
                    <div class="text-muted small">공급가액</div>
                    <div class="fw-bold" id="supplyAmount">-</div>
                </div>
                <div class="col-auto">
                    <div class="text-muted small">부가세</div>
                    <div class="fw-bold" id="taxAmount">-</div>
                </div>
                <div class="col-auto ms-4">
                    <div class="text-muted small">총액</div>
                    <div class="fw-bold fs-5" id="totalAmount">-</div>
                </div>
            </div>
        </form>
    `;
}

/**
 * 거래 모달에 품목 행을 추가하는 공통 함수
 * @param {HTMLElement} tbody - 테이블 본문 요소
 * @param {Array} allItems - 모든 품목 데이터
 * @param {Object} rowData - 행 데이터 (기본값: {})
 * @param {boolean} isEdit - 수정 모드 여부
 * @param {Function} updateTotalsFunction - 합계 업데이트 함수
 * @returns {HTMLElement} 생성된 행 요소
 */
export function addTransactionRow(tbody, allItems, rowData = {}, isEdit = false, updateTotalsFunction) {
    const tr = document.createElement('tr');
    tr.style.background = '#fff';
    
    const rowIdx = tbody.children.length;
    const { itemCode = '', quantity = '', price = '', taxType = 'taxable' } = rowData;
    
    let itemDisplayText = '';
    const item = allItems.find(i => i.code === itemCode);
    if (item) {
        itemDisplayText = `${item.name} (${item.code})`;
    }

    tr.innerHTML = `
        <td>
            <input type="text" class="form-control item-search" data-idx="${rowIdx}" 
                   placeholder="품목명 또는 코드 검색" autocomplete="off" 
                   value="${itemDisplayText}" ${isEdit ? 'readonly' : ''}>
            <div class="searchable-select-dropdown"></div>
        </td>
        <td>
            <input type="number" class="form-control quantity-input" data-idx="${rowIdx}" 
                   min="1" placeholder="수량" value="${quantity}">
        </td>
        <td>
            <input type="number" class="form-control price-input" data-idx="${rowIdx}" 
                   min="0" placeholder="단가" value="${price}">
        </td>
        <td>
            <select class="form-select tax-type-select" data-idx="${rowIdx}">
                <option value="taxable" ${taxType === 'taxable' ? 'selected' : ''}>과세</option>
                <option value="taxFree" ${taxType === 'taxFree' ? 'selected' : ''}>면세</option>
            </select>
        </td>
        <td class="row-sum text-end" data-idx="${rowIdx}">₩0</td>
        <td style="text-align:center;">
            <button type="button" class="btn btn-outline-danger btn-sm remove-row-btn" 
                    title="행 삭제" ${isEdit ? 'disabled' : ''}>
                <i class='bx bx-minus'></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(tr);

    // 이벤트 리스너 추가
    const quantityInput = tr.querySelector('.quantity-input');
    const priceInput = tr.querySelector('.price-input');
    const taxTypeSelect = tr.querySelector('.tax-type-select');
    const itemSearchInput = tr.querySelector('.item-search');

    // 행별 계산 함수
    function calculateRowTotal(row) {
        const quantity = parseFloat(row.querySelector('.quantity-input').value) || 0;
        const price = parseFloat(row.querySelector('.price-input').value) || 0;
        const taxType = row.querySelector('.tax-type-select').value;
        
        const supplyAmount = quantity * price;
        const vat = taxType === 'taxFree' ? 0 : supplyAmount * 0.1;
        const total = supplyAmount + vat;
        
        // 결과 표시
        row.querySelector('.supply-amount').textContent = formatCurrency(supplyAmount);
        row.querySelector('.vat-amount').textContent = formatCurrency(vat);
        row.querySelector('.total-amount').textContent = formatCurrency(total);
        
        console.log('행 계산 완료:', { quantity, price, supplyAmount, vat, total });
    }
    
    quantityInput.addEventListener('input', () => {
        calculateRowTotal(tr);
        updateTotalsFunction();
    });
    
    priceInput.addEventListener('input', () => {
        calculateRowTotal(tr);
        updateTotalsFunction();
    });
    
    taxTypeSelect.addEventListener('change', () => {
        calculateRowTotal(tr);
        updateTotalsFunction();
    });

    if (!isEdit) {
        // 품목 검색 드롭다운 즉시 적용
        console.log('품목 드롭다운 설정 시작:', allItems.length, '개 품목');
        console.log('allItems:', allItems);
        
        // 활성 품목만 필터링
        const activeItems = allItems.filter(i => i.active === 'Y');
        console.log('활성 품목:', activeItems.length, '개');
        console.log('활성 품목 목록:', activeItems);
        
        // 품목 입력 필드 확인
        console.log('품목 입력 필드:', itemSearchInput);
        console.log('품목 입력 필드 부모:', itemSearchInput.parentNode);
        
        if (activeItems.length > 0) {
            createSearchableDropdown(
                itemSearchInput,
                activeItems.map(i => ({ value: i.code, text: `${i.name} (${i.code})` })),
                (selectedItem) => {
                    console.log('품목 선택됨:', selectedItem);
                    const itemData = allItems.find(i => i.code === selectedItem.value);
                    if (itemData) {
                        itemSearchInput.value = selectedItem.text;
                        
                        // 기준단가 자동 설정
                        if (itemData.standardPrice) {
                            priceInput.value = itemData.standardPrice;
                        }
                        
                        // 면세 품목인 경우 자동으로 면세로 설정
                        if (itemData.taxType === '면세') {
                            taxTypeSelect.value = 'taxFree';
                        } else {
                            taxTypeSelect.value = 'taxable';
                        }
                    }
                    
                    updateTotalsFunction();
                }
            );
        } else {
            console.log('활성 품목이 없습니다!');
        }

        itemSearchInput.addEventListener('input', updateTotalsFunction);
    }

    return tr;
}

/**
 * 거래 모달의 공통 설정을 처리하는 함수
 * @param {Object} config - 모달 설정 객체
 * @param {Function} updateTotalsFunction - 합계 업데이트 함수
 * @param {Function} saveFunction - 저장 함수
 */
export function setupTransactionModal(config, updateTotalsFunction, saveFunction) {
    const { isEdit, partnerLabel, data } = config;
    
    // 모달 버튼 설정
    const saveBtn = document.getElementById('modalSaveBtn');
    if (saveBtn) {
        saveBtn.style.display = 'block';
        saveBtn.textContent = isEdit ? '수정' : '등록';
        saveBtn.onclick = saveFunction;
    }

    // 거래처 검색 드롭다운 설정
    const partnerInput = document.querySelector('input[name="partnerSearch"]');
    if (partnerInput) {
        // 전역 state 객체에서 partners 가져오기
        const partners = window.state ? window.state.partners : [];
        console.log('거래처 목록:', partners);
        
        if (partners.length > 0) {
            createSearchableDropdown(
                partnerInput,
                partners.map(p => ({ value: p.businessNumber, text: `${p.name} (${p.businessNumber})` })),
                (item) => {
                    window.selectedPartnerBusinessNumber = item.value;
                    partnerInput.value = item.text;
                }
            );
        }
    }

    // 날짜 입력 필드 설정
    const dateInput = document.getElementById('transactionDate');
    
    if (isEdit && data.date) {
        dateInput.value = data.date;
        const partnerObj = state.partners.find(p => p.businessNumber === data.partner);
        if (partnerObj) {
            partnerInput.value = `${partnerObj.name} (${partnerObj.businessNumber})`;
            window.selectedPartnerBusinessNumber = partnerObj.businessNumber;
        }
    } else {
        // 오늘 날짜를 YYYY-MM-DD 형식으로 설정
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        dateInput.value = today;
    }

    // 행 추가 버튼 설정
    const addRowBtn = document.getElementById('addRowBtn');
    const tbody = document.getElementById('transactionItemsBody');
    
    if (!isEdit && addRowBtn && tbody) {
        addRowBtn.onclick = () => addTransactionRow(tbody, state.items, {}, isEdit, updateTotalsFunction);
        
        // 행 삭제 이벤트
        tbody.onclick = function(e) {
            if (e.target.closest('.remove-row-btn')) {
                e.target.closest('tr')?.remove();
                updateTotalsFunction();
            }
        };
    }

    // 초기 행 추가 (지연 실행으로 DOM 준비 보장)
    if (tbody) {
        setTimeout(() => {
            addTransactionRow(tbody, state.items, {}, isEdit, updateTotalsFunction);
        }, 200);
    }
} 