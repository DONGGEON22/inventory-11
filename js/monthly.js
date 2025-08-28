// 월별 관리 모듈
import { state, getCurrentCompanyBusinessNumber, isLoggedIn, navigateTo } from './main.js';
import { showLoading, hideLoading, showToast, showModal, formatCurrency, waitForMainContent } from './ui.js';

// 페이지네이션 상태
let currentPurchasePage = 1;
let currentSalesPage = 1;
const itemsPerPage = 20;

export function loadMonthlyView() {
    if (!isLoggedIn()) {
        navigateTo('login');
        return Promise.reject(new Error('로그인되지 않음'));
    }
    
    // DOM이 준비될 때까지 안전하게 대기
    return waitForMainContent()
        .then(mainContent => {
            const now = new Date();
            const thisYear = now.getFullYear();
            const thisMonth = (now.getMonth() + 1).toString().padStart(2, '0');
            const content = `
                <div class="card">
                    <div class="card-header d-flex flex-wrap align-items-center gap-2">
                        <h5 class="mb-0 me-3">월별 조회</h5>
                        <button class="btn btn-outline-secondary btn-sm" id="prevMonthBtn" title="이전 달">◀</button>
                        <input type="number" id="monthlyYear" class="form-control" style="width:100px;" min="2000" max="2100" step="1" value="${thisYear}">
                        <span class="mx-1">년</span>
                        <input type="text" id="monthlyMonth" class="form-control" style="width:90px;" pattern="^(0?[1-9]|1[0-2])$" value="${thisMonth}" inputmode="numeric" placeholder="MM">
                        <span class="mx-1">월</span>
                        <button class="btn btn-outline-secondary btn-sm" id="nextMonthBtn" title="다음 달">▶</button>
                        <button class="btn btn-outline-secondary ms-2" id="monthlyAllBtn">전체</button>
                        <div class="dropdown ms-2" style="width:auto; min-width:120px;">
                            <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="monthlyPartnerDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                거래처 전체
                            </button>
                            <ul class="dropdown-menu" id="monthlyPartnerDropdownMenu" style="max-height: 200px; overflow-y: auto;">
                                <li><input type="text" class="form-control form-control-sm mb-2" id="monthlyPartnerSearch" placeholder="거래처 검색..."></li>
                                <li><a class="dropdown-item" href="#" data-value="">거래처 전체</a></li>
                                ${state.partners.map(p => `<li><a class="dropdown-item" href="#" data-value="${p.businessNumber}">${p.name}</a></li>`).join('')}
                            </ul>
                        </div>
                        <div class="dropdown ms-2" style="width:auto; min-width:120px;">
                            <button class="btn btn-outline-secondary dropdown-toggle" type="button" id="monthlyItemDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                품목 전체
                            </button>
                            <ul class="dropdown-menu" id="monthlyItemDropdownMenu" style="max-height: 200px; overflow-y: auto;">
                                <li><input type="text" class="form-control form-control-sm mb-2" id="monthlyItemSearch" placeholder="품목 검색..."></li>
                                <li><a class="dropdown-item" href="#" data-value="">품목 전체</a></li>
                                ${state.items.map(i => `<li><a class="dropdown-item" href="#" data-value="${i.code}">${i.name}</a></li>`).join('')}
                            </ul>
                        </div>
                        <button class="btn btn-primary ms-2" id="monthlyApplyBtn">적용</button>
                    </div>
                    <div class="card-body">
                        <div id="monthlySummary" class="mb-4"></div>
                        <div class="row">
                            <div class="col-md-6">
                                <h6>매입 내역 <span id="purchaseCount" class="badge bg-secondary"></span></h6>
                                <div class="table-responsive">
                                    <table class="table table-sm monthly-table">
                                        <colgroup>
                                            <col style="width:16%">
                                            <col style="width:22%">
                                            <col style="width:22%">
                                            <col style="width:20%">
                                            <col style="width:20%">
                                        </colgroup>
                                        <thead><tr>
                                            <th>일자</th>
                                            <th>거래처</th>
                                            <th>품목</th>
                                            <th>공급가액</th>
                                            <th>세액</th>
                                        </tr></thead>
                                        <tbody id="monthlyPurchaseTable"></tbody>
                                    </table>
                                </div>
                                <div id="purchasePagination" class="d-flex justify-content-center mt-2"></div>
                            </div>
                            <div class="col-md-6">
                                <h6>매출 내역 <span id="salesCount" class="badge bg-secondary"></span></h6>
                                <div class="table-responsive">
                                    <table class="table table-sm monthly-table">
                                        <colgroup>
                                            <col style="width:16%">
                                            <col style="width:22%">
                                            <col style="width:22%">
                                            <col style="width:20%">
                                            <col style="width:20%">
                                        </colgroup>
                                        <thead><tr>
                                            <th>일자</th>
                                            <th>출고처</th>
                                            <th>품목</th>
                                            <th>공급가액</th>
                                            <th>세액</th>
                                        </tr></thead>
                                        <tbody id="monthlySalesTable"></tbody>
                                    </table>
                                </div>
                                <div id="salesPagination" class="d-flex justify-content-center mt-2"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            mainContent.innerHTML = content;
            
            // 이벤트 리스너 등록
            document.getElementById('monthlyYear').addEventListener('change', () => {
                currentPurchasePage = 1;
                currentSalesPage = 1;
                // 적용 버튼에서 렌더링
            });
            
            document.getElementById('monthlyMonth').addEventListener('change', () => {
                currentPurchasePage = 1;
                currentSalesPage = 1;
                // 적용 버튼에서 렌더링
            });
            
            document.getElementById('monthlyAllBtn').addEventListener('click', () => {
                currentPurchasePage = 1;
                currentSalesPage = 1;
                // 연/월 입력 초기화
                const y = document.getElementById('monthlyYear');
                const m = document.getElementById('monthlyMonth');
                if (y) y.value = '';
                if (m) m.value = '';
                // 드롭다운 초기화
                const partnerBtn = document.getElementById('monthlyPartnerDropdown');
                const itemBtn = document.getElementById('monthlyItemDropdown');
                if (partnerBtn) { partnerBtn.textContent = '거래처 전체'; partnerBtn.removeAttribute('data-selected'); }
                if (itemBtn) { itemBtn.textContent = '품목 전체'; itemBtn.removeAttribute('data-selected'); }
                renderMonthlyTables(true);
            });

            // 이전/다음 달 이동 (즉시 렌더링하지 않음)
            document.getElementById('prevMonthBtn').addEventListener('click', () => moveMonth(-1, false));
            document.getElementById('nextMonthBtn').addEventListener('click', () => moveMonth(1, false));
            
            // 검색형 드롭다운 이벤트 리스너
            setupSearchableDropdown('monthlyPartnerDropdown', 'monthlyPartnerSearch', 'monthlyPartnerDropdownMenu');
            setupSearchableDropdown('monthlyItemDropdown', 'monthlyItemSearch', 'monthlyItemDropdownMenu');
            
            // 적용 버튼으로 필터 반영
            document.getElementById('monthlyApplyBtn').addEventListener('click', () => {
                currentPurchasePage = 1;
                currentSalesPage = 1;
                renderMonthlyTables(false);
            });
            
            enableMonthlyInputs(true);
            renderMonthlyTables(false);
            
            // 최소 0.5초 로딩 표시
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve();
                }, 500);
            });
        })
        .catch(error => {
            console.error('월별 조회 페이지 로드 실패:', error);
            showToast('페이지 로드 중 오류가 발생했습니다.', 'error');
            throw error;
        });
}

// 검색형 드롭다운 설정 함수
function setupSearchableDropdown(dropdownId, searchId, menuId) {
    const dropdown = document.getElementById(dropdownId);
    const searchInput = document.getElementById(searchId);
    const menu = document.getElementById(menuId);
    
    if (!dropdown || !searchInput || !menu) return;
    
    // 검색 기능
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const items = menu.querySelectorAll('.dropdown-item');
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    });
    
    // 드롭다운 아이템 선택 (즉시 반영 대신 값만 저장)
    menu.addEventListener('click', (e) => {
        if (e.target.classList.contains('dropdown-item')) {
            e.preventDefault();
            const value = e.target.getAttribute('data-value');
            const text = e.target.textContent;
            
            // 버튼 텍스트 업데이트
            dropdown.textContent = text;
            
            // 선택된 값 저장
            if (value) dropdown.setAttribute('data-selected', value); else dropdown.removeAttribute('data-selected');
            
            // 즉시 렌더링하지 않고, 적용 버튼에서 반영
        }
    });
    
    // 검색 입력 필드 클릭 시 드롭다운 열기 방지
    searchInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

export function enableMonthlyInputs(enable) {
    // 년/월 입력 필드는 항상 활성화 상태로 유지
    // enable 매개변수는 "전체" 버튼 호환성을 위해 유지
}

export function renderMonthlyTables(showAll = false) {
    console.log('renderMonthlyTables 호출됨, showAll:', showAll);
    
    // 필터 조건 가져오기 (검색형 드롭다운에서)
    const partnerDropdown = document.getElementById('monthlyPartnerDropdown');
    const itemDropdown = document.getElementById('monthlyItemDropdown');
    const partnerVal = partnerDropdown?.getAttribute('data-selected') || '';
    const itemVal = itemDropdown?.getAttribute('data-selected') || '';
    
    // 데이터 필터링
    let purchases, sales;
    
    if (showAll) {
        // 전체 데이터
        purchases = [...state.purchases];
        sales = [...state.sales];
        console.log('전체 데이터 조회:', { purchases: purchases.length, sales: sales.length });
    } else {
        // 년/월 필터링
        const year = document.getElementById('monthlyYear')?.value;
        const month = document.getElementById('monthlyMonth')?.value?.padStart(2, '0');
        
        if (year && month) {
            const datePrefix = `${year}-${month}`;
            purchases = state.purchases.filter(p => p.date && p.date.startsWith(datePrefix));
            sales = state.sales.filter(s => s.date && s.date.startsWith(datePrefix));
            console.log(`${year}년 ${month}월 데이터 조회:`, { purchases: purchases.length, sales: sales.length });
        } else {
            purchases = [];
            sales = [];
            console.log('년/월이 입력되지 않아 빈 결과');
        }
    }
    
    // 거래처 필터
    if (partnerVal) {
        purchases = purchases.filter(p => p.partner === partnerVal);
        sales = sales.filter(s => s.partner === partnerVal);
        console.log('거래처 필터 적용:', partnerVal, { purchases: purchases.length, sales: sales.length });
    }
    
    // 품목 필터
    if (itemVal) {
        purchases = purchases.filter(p => p.item === itemVal);
        sales = sales.filter(s => s.item === itemVal);
        console.log('품목 필터 적용:', itemVal, { purchases: purchases.length, sales: sales.length });
    }
    
    // 데이터 정렬 (최신순)
    purchases.sort((a, b) => new Date(b.date) - new Date(a.date));
    sales.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 페이지네이션 적용
    const totalPurchasePages = Math.ceil(purchases.length / itemsPerPage);
    const totalSalesPages = Math.ceil(sales.length / itemsPerPage);
    
    const startPurchaseIndex = (currentPurchasePage - 1) * itemsPerPage;
    const endPurchaseIndex = startPurchaseIndex + itemsPerPage;
    const startSalesIndex = (currentSalesPage - 1) * itemsPerPage;
    const endSalesIndex = startSalesIndex + itemsPerPage;
    
    const pagedPurchases = purchases.slice(startPurchaseIndex, endPurchaseIndex);
    const pagedSales = sales.slice(startSalesIndex, endSalesIndex);
    
    // 매입 테이블 렌더링
    const purchaseTable = document.getElementById('monthlyPurchaseTable');
    if (purchaseTable) {
        purchaseTable.innerHTML = pagedPurchases.map(p => {
            const partner = state.partners.find(x => x.businessNumber === p.partner);
            const item = state.items.find(x => x.code === p.item);
            return `<tr>
                <td>${p.date}</td>
                <td>${partner ? partner.name : p.partner || 'Unknown'}</td>
                <td>${item ? item.name : p.item || 'Unknown'}</td>
                <td class="text-end">${formatCurrency(p.supplyAmount || 0)}</td>
                <td class="text-end">${formatCurrency(p.taxAmount || 0)}</td>
            </tr>`;
        }).join('');
    }
    
    // 매출 테이블 렌더링
    const salesTable = document.getElementById('monthlySalesTable');
    if (salesTable) {
        salesTable.innerHTML = pagedSales.map(s => {
            const partner = state.partners.find(x => x.businessNumber === s.partner);
            const item = state.items.find(x => x.code === s.item);
            return `<tr>
                <td>${s.date}</td>
                <td>${partner ? partner.name : s.partner || 'Unknown'}</td>
                <td>${item ? item.name : s.item || 'Unknown'}</td>
                <td class="text-end">${formatCurrency(s.supplyAmount || 0)}</td>
                <td class="text-end">${formatCurrency(s.taxAmount || 0)}</td>
            </tr>`;
        }).join('');
    }
    
    // 카운트 업데이트
    const purchaseCountEl = document.getElementById('purchaseCount');
    const salesCountEl = document.getElementById('salesCount');
    if (purchaseCountEl) purchaseCountEl.textContent = purchases.length;
    if (salesCountEl) salesCountEl.textContent = sales.length;
    
    // 페이지네이션 렌더링
    renderPurchasePagination(totalPurchasePages, currentPurchasePage);
    renderSalesPagination(totalSalesPages, currentSalesPage);
    
    // 요약 정보 업데이트
    updateMonthlySummary(purchases, sales);
}

function updateMonthlySummary(purchases, sales) {
    const summaryEl = document.getElementById('monthlySummary');
    if (!summaryEl) return;
    
    const totalPurchaseAmount = purchases.reduce((sum, p) => sum + (p.supplyAmount || 0), 0);
    const totalPurchaseTax = purchases.reduce((sum, p) => sum + (p.taxAmount || 0), 0);
    const totalSalesAmount = sales.reduce((sum, s) => sum + (s.supplyAmount || 0), 0);
    const totalSalesTax = sales.reduce((sum, s) => sum + (s.taxAmount || 0), 0);
    
    const profit = totalSalesAmount - totalPurchaseAmount;
    const profitTax = totalSalesTax - totalPurchaseTax;
    
    summaryEl.innerHTML = `
        <div class="summary-chips">
            <div class="summary-chip">
                <span class="label">총 매입</span>
                <span class="value text-danger">${formatCurrency(totalPurchaseAmount)}</span>
            </div>
            <div class="summary-chip">
                <span class="label">총 매출</span>
                <span class="value" style="color: var(--success-color);">${formatCurrency(totalSalesAmount)}</span>
            </div>
            <div class="summary-chip ${profit >= 0 ? 'positive' : 'negative'}">
                <span class="label">순이익</span>
                <span class="value">${formatCurrency(profit)}</span>
            </div>
            <div class="summary-chip ${profitTax >= 0 ? 'positive' : 'negative'}">
                <span class="label">세금 차액</span>
                <span class="value">${formatCurrency(profitTax)}</span>
            </div>
        </div>
    `;
}

function renderPurchasePagination(totalPages, currentPage) {
    const paginationEl = document.getElementById('purchasePagination');
    if (!paginationEl) return;
    
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<ul class="pagination pagination-sm">';
    
    // 이전 버튼
    if (currentPage > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePurchasePage(${currentPage - 1})">이전</a></li>`;
    }
    
    // 페이지 번호
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHTML += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
        } else {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePurchasePage(${i})">${i}</a></li>`;
        }
    }
    
    // 다음 버튼
    if (currentPage < totalPages) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePurchasePage(${currentPage + 1})">다음</a></li>`;
    }
    
    paginationHTML += '</ul>';
    paginationEl.innerHTML = paginationHTML;
}

function renderSalesPagination(totalPages, currentPage) {
    const paginationEl = document.getElementById('salesPagination');
    if (!paginationEl) return;
    
    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<ul class="pagination pagination-sm">';
    
    // 이전 버튼
    if (currentPage > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changeSalesPage(${currentPage - 1})">이전</a></li>`;
    }
    
    // 페이지 번호
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHTML += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
        } else {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changeSalesPage(${i})">${i}</a></li>`;
        }
    }
    
    // 다음 버튼
    if (currentPage < totalPages) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changeSalesPage(${currentPage + 1})">다음</a></li>`;
    }
    
    paginationHTML += '</ul>';
    paginationEl.innerHTML = paginationHTML;
}

export function changePurchasePage(page) {
    currentPurchasePage = page;
    renderMonthlyTables();
}

export function changeSalesPage(page) {
    currentSalesPage = page;
    renderMonthlyTables();
}

export function initMonthlyTab() {
    // 전역 함수 등록
    window.changePurchasePage = changePurchasePage;
    window.changeSalesPage = changeSalesPage;
} 

function moveMonth(delta, applyNow = true) {
    const y = document.getElementById('monthlyYear');
    const m = document.getElementById('monthlyMonth');
    if (!y || !m) return;
    let year = parseInt(y.value, 10) || new Date().getFullYear();
    let month = (parseInt(m.value, 10) || 1) + delta;
    if (month < 1) { month = 12; year -= 1; }
    if (month > 12) { month = 1; year += 1; }
    y.value = year;
    m.value = String(month).padStart(2, '0');
    currentPurchasePage = 1;
    currentSalesPage = 1;
    if (applyNow) renderMonthlyTables();
} 