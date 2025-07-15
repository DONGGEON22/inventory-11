// Main Application Entry Point
// =============================

import { getClientId } from './auth.js';

// Initialize clientId
let clientId = getClientId();

// Global DOM Elements
let mainContent;

// Check login status and redirect if not logged in
function checkLoginStatus() {
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (!loggedInUser && state.currentPage !== 'login') {
        navigateTo('login');
        return false;
    }
    return true;
}

// Initialize login check and sidebar
document.addEventListener('DOMContentLoaded', function() {
    // 로그인 상태 체크 및 페이지 리디렉션
    const loggedInUser = localStorage.getItem('loggedInUser');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (isLoggedIn && loggedInUser) {
        const userInfo = JSON.parse(loggedInUser);
        const currentPath = window.location.pathname;
        
        // 로그인 페이지에 있을 경우 대시보드로 리디렉션
        if (currentPath.endsWith('index.html') || currentPath === '/') {
            const header = document.getElementById('header');
            if (header) header.style.display = 'flex';
            document.body.classList.remove('login-page');
            
            // 사이드바 초기화
            initializeSidebar();
            
            // 관리자인 경우 관리자 패널로 이동
            if (userInfo.role === 'admin') {
                state.currentPage = 'admin-panel';
                loadPageContent('admin-panel');
            } else {
                state.currentPage = 'dashboard';
                loadPageContent('dashboard');
            }
            
            renderLogoutBtn();
            showToast(`${userInfo.companyName || userInfo.userId}(으)로 로그인되었습니다.`);
        }
    } else {
        // 로그인되지 않은 상태에서 다른 페이지 접근 시 로그인 페이지로 리디렉션
        const currentPath = window.location.pathname;
        if (!currentPath.endsWith('index.html') && currentPath !== '/') {
            window.location.href = '/index.html';
        }
    }
    
    // DOM Elements - HTML이 완전히 로드된 후에 참조
    const sidebar = document.getElementById('sidebar');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    mainContent = document.getElementById('main-content');
    const commonModalElement = document.getElementById('commonModal');
    const commonModal = commonModalElement ? new bootstrap.Modal(commonModalElement) : null;
    const header = document.getElementById('header');

    // mainContent가 없으면 생성
    if (!mainContent) {
        console.error('main-content element not found, creating one');
        const mainDiv = document.createElement('div');
        mainDiv.id = 'main-content';
        document.querySelector('main').appendChild(mainDiv);
    }

    // 1. 모든 전역 함수를 먼저 등록합니다.
    console.log('전역 함수 등록 시작');
    registerGlobalFunctions();
    console.log('전역 함수 등록 완료');

    // 2. 핵심 상태를 불러옵니다.
    console.log('회사 상태 로드 시작');
    loadCompanyState();
    console.log('회사 상태 로드 완료');

    // 3. UI 이벤트 리스너들을 설정합니다.
    if (sidebarCollapse) {
        sidebarCollapse.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // 4. 초기 페이지를 로드합니다.
    console.log('초기 페이지 로드 시작');
    const initialPage = isLoggedIn ? (JSON.parse(loggedInUser).role === 'admin' ? 'admin-panel' : 'dashboard') : 'login';
    navigateTo(initialPage);
    console.log('초기화 완료');
});

// Navigation
function navigateTo(page) {
    console.log('navigateTo 호출됨:', page);
    state.currentPage = page;

    // 페이지 로드 전, 로그인 상태에 따라 UI를 먼저 조정
    const sidebar = document.getElementById('sidebar');
    const header = document.getElementById('header');
    
    if (page === 'login') {
        console.log('로그인 페이지 UI 설정');
        if (sidebar) sidebar.style.display = 'none';
        if (header) header.style.display = 'none';
        document.body.classList.add('login-page');
    } else {
        console.log('일반 페이지 UI 설정');
        if (sidebar) sidebar.style.display = 'block';
        
        // 로그인된 사용자에게만 헤더 표시
        if (header && isLoggedIn()) {
            header.style.display = 'block';
        }
        
        document.body.classList.remove('login-page');
        updateActiveNavItem();
        renderLogoutBtn();
        updateSidebarVisibility();
    }
    
    console.log('페이지 콘텐츠 로드 시작:', page);
    loadPageContent(page);
}

function updateActiveNavItem() {
    document.querySelectorAll('#sidebar li').forEach(item => {
        item.classList.remove('active');
    });
    const link = document.querySelector(`#sidebar a[data-page="${state.currentPage}"]`);
    if (link) {
      link.parentElement.classList.add('active');
    }
}

// Page Content Loading
function loadPageContent(page) {
    console.log('loadPageContent 호출됨:', page);
    
    switch(page) {
        case 'login':
            console.log('로그인 페이지 로드');
            loadLogin();
            break;
        case 'dashboard':
            console.log('대시보드 페이지 로드');
            loadDashboard();
            break;
        case 'items':
            loadItems();
            break;
        case 'partners':
            loadPartners();
            break;
        case 'purchases':
            loadPurchases();
            break;
        case 'sales':
            loadSales();
            break;
        case 'inventory':
            loadInventory();
            break;
        case 'monthly':
            loadMonthlyView();
            break;
        case 'admin-panel':
            showAdminPanel();
            break;
        default:
            navigateTo('dashboard');
    }
}

// Monthly View
function loadMonthlyView() {
    if (!isLoggedIn()) {
        navigateTo('login');
        return;
    }
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const content = `
        <div class="card">
            <div class="card-header d-flex flex-wrap align-items-center gap-2">
                <h5 class="mb-0 me-3">월별 매입/매출 조회</h5>
                <input type="number" id="monthlyYear" class="form-control" style="width:100px;" min="2000" max="2100" value="${thisYear}">
                <span class="mx-1">년</span>
                <input type="number" id="monthlyMonth" class="form-control" style="width:70px;" min="1" max="12" value="${thisMonth}">
                <span class="mx-1">월</span>
                <button class="btn btn-primary ms-2" id="monthlySearchBtn"><i class='bx bx-search'></i> 조회</button>
                <button class="btn btn-outline-secondary ms-2" id="monthlyAllBtn">전체</button>
                <select id="monthlyPartnerSelect" class="form-select ms-2" style="width:auto; min-width:120px;">
                    <option value="">거래처 전체</option>
                    ${state.partners.map(p => `<option value="${p.businessNumber}">${p.name}</option>`).join('')}
                </select>
                <select id="monthlyItemSelect" class="form-select ms-2" style="width:auto; min-width:120px;">
                    <option value="">품목 전체</option>
                    ${state.items.map(i => `<option value="${i.code}">${i.name}</option>`).join('')}
                </select>
            </div>
            <div class="card-body">
                <div id="monthlySummary" class="mb-4"></div>
        <div class="row">
                    <div class="col-md-6">
                        <h6>매입 내역</h6>
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
            </div>
                    <div class="col-md-6">
                        <h6>매출 내역</h6>
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
            </div>
                </div>
            </div>
                </div>
    `;
    mainContent.innerHTML = content;
    document.getElementById('monthlySearchBtn').addEventListener('click', () => {
        enableMonthlyInputs(true);
        renderMonthlyTables(false);
    });
    document.getElementById('monthlyAllBtn').addEventListener('click', () => {
        document.getElementById('monthlyYear').value = '';
        document.getElementById('monthlyMonth').value = '';
        enableMonthlyInputs(false);
        renderMonthlyTables(true);
    });
    document.getElementById('monthlyPartnerSelect').addEventListener('change', () => renderMonthlyTables());
    document.getElementById('monthlyItemSelect').addEventListener('change', () => renderMonthlyTables());
    enableMonthlyInputs(true);
    renderMonthlyTables(false);
}

function enableMonthlyInputs(enable) {
    document.getElementById('monthlyYear').disabled = !enable;
    document.getElementById('monthlyMonth').disabled = !enable;
}

function renderMonthlyTables(showAll = false) {
    let purchases, sales;
    const partnerVal = document.getElementById('monthlyPartnerSelect').value;
    const itemVal = document.getElementById('monthlyItemSelect').value;
    if (showAll) {
        purchases = state.purchases;
        sales = state.sales;
    } else {
        const year = document.getElementById('monthlyYear').value;
        const month = document.getElementById('monthlyMonth').value.padStart(2, '0');
        purchases = state.purchases.filter(p => p.date && p.date.startsWith(`${year}-${month}`));
        sales = state.sales.filter(s => s.date && s.date.startsWith(`${year}-${month}`));
    }
    // 거래처 필터
    if (partnerVal) {
        purchases = purchases.filter(p => p.partner === partnerVal);
        sales = sales.filter(s => s.partner === partnerVal);
    }
    // 품목 필터
    if (itemVal) {
        purchases = purchases.filter(p => p.item === itemVal);
        sales = sales.filter(s => s.item === itemVal);
    }
    // 매입 테이블
    document.getElementById('monthlyPurchaseTable').innerHTML = purchases.map(p => {
        const partner = state.partners.find(x => x.businessNumber === p.partner);
        const item = state.items.find(x => x.code === p.item);
        return `<tr><td>${p.date}</td><td>${partner ? partner.name : ''}</td><td>${item ? item.name : ''}</td><td>${formatCurrency(p.supplyAmount)}</td><td>${formatCurrency(p.taxAmount)}</td></tr>`;
    }).join('');
    // 매출 테이블
    document.getElementById('monthlySalesTable').innerHTML = sales.map(s => {
        const partner = state.partners.find(x => x.businessNumber === s.partner);
        const item = state.items.find(x => x.code === s.item);
        return `<tr><td>${s.date}</td><td>${partner ? partner.name : ''}</td><td>${item ? item.name : ''}</td><td>${formatCurrency(s.supplyAmount)}</td><td>${formatCurrency(s.taxAmount)}</td></tr>`;
    }).join('');
    // 요약
    const purchaseTotal = purchases.reduce((sum, p) => sum + Number(p.supplyAmount||0), 0);
    const purchaseTax = purchases.reduce((sum, p) => sum + Number(p.taxAmount||0), 0);
    const salesTotal = sales.reduce((sum, s) => sum + Number(s.supplyAmount||0), 0);
    const salesTax = sales.reduce((sum, s) => sum + Number(s.taxAmount||0), 0);
    document.getElementById('monthlySummary').innerHTML = `
        <div class="row text-center">
            <div class="col-md-3 mb-2"><div class="p-2 bg-light rounded">매입 합계<br><b>${formatCurrency(purchaseTotal)}</b></div></div>
            <div class="col-md-3 mb-2"><div class="p-2 bg-light rounded">매입 세액<br><b>${formatCurrency(purchaseTax)}</b></div></div>
            <div class="col-md-3 mb-2"><div class="p-2 bg-light rounded">매출 합계<br><b>${formatCurrency(salesTotal)}</b></div></div>
            <div class="col-md-3 mb-2"><div class="p-2 bg-light rounded">매출 세액<br><b>${formatCurrency(salesTax)}</b></div></div>
            </div>
    `;
}

// Event Listeners
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded 이벤트 발생');
    
    // DOM Elements - HTML이 완전히 로드된 후에 참조
    const sidebar = document.getElementById('sidebar');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    mainContent = document.getElementById('main-content'); // 전역 변수로 초기화
    const commonModalElement = document.getElementById('commonModal');
    const commonModal = commonModalElement ? new bootstrap.Modal(commonModalElement) : null;
    const header = document.getElementById('header');

    console.log('DOM 요소 참조 완료:', {
        sidebar: !!sidebar,
        sidebarCollapse: !!sidebarCollapse,
        mainContent: !!mainContent,
        commonModalElement: !!commonModalElement,
        header: !!header
    });

    // 1. 모든 전역 함수를 먼저 등록합니다.
    console.log('전역 함수 등록 시작');
    registerGlobalFunctions();
    console.log('전역 함수 등록 완료');

    // 2. 핵심 상태를 불러옵니다.
    console.log('회사 상태 로드 시작');
    loadCompanyState();
    console.log('회사 상태 로드 완료');

    // 3. UI 이벤트 리스너들을 설정합니다.
    if (sidebarCollapse) {
        sidebarCollapse.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // 4. 초기 페이지를 로드합니다.
    console.log('초기 페이지 로드 시작');
    const initialPage = isLoggedIn() ? 'dashboard' : 'login';
    navigateTo(initialPage);
    console.log('초기화 완료');
});

// =================================================================
// 애플리케이션 전역 함수 등록 (중앙 관리)
// =================================================================
function registerGlobalFunctions() {
    // core.js
    window.state = state;
    window.loadCompanyState = loadCompanyState;
    window.saveCompanyState = saveCompanyState;
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
    window.formatCurrency = formatCurrency;
    window.generateId = generateId;
    window.debounce = debounce;
    window.autoFormatBusinessNumber = autoFormatBusinessNumber;
    window.paginate = paginate;

    // auth.js
    window.isLoggedIn = isLoggedIn;
    window.isAdmin = isAdmin;
    window.showAdminLoginModal = showAdminLoginModal;
    window.adminLogin = adminLogin;
    window.approveUser = approveUser;
    window.rejectUser = rejectUser;
    window.revokeUser = revokeUser;
    window.showSignupModal = showSignupModal;
    window.saveSignup = saveSignup;
    window.handleUserLogin = handleUserLogin;
    window.logout = logout;
    window.renderLogoutBtn = renderLogoutBtn;
    window.showAdminPanel = showAdminPanel;
    window.showAdminCompanySelector = showAdminCompanySelector;
    window.hideAdminCompanySelector = hideAdminCompanySelector;

    // ui.js
    window.showModal = showModal;
    window.showToast = showToast;
    window.showConfirmation = showConfirmation;
    window.closeModal = closeModal;
    window.renderPagination = renderPagination;

    // 각 페이지 로드 함수
    window.loadDashboard = loadDashboard;
    window.loadItems = loadItems;
    window.loadPartners = loadPartners;
    window.loadPurchases = loadPurchases;
    window.loadSales = loadSales;
    window.loadInventory = loadInventory;
    window.loadMonthlyView = loadMonthlyView;
    window.loadLogin = loadLogin;
    window.navigateTo = navigateTo;

    // items.js
    window.editItem = editItem;
    window.deleteItem = deleteItem;
    window.saveItem = saveItem;
    window.updateItem = updateItem;

    // partners.js
    window.displayPartners = displayPartners;
    window.showPartnerModal = showPartnerModal;
    window.savePartner = savePartner;
    window.deletePartner = deletePartner;

    // purchases.js & sales.js
    window.editPurchase = editPurchase;
    window.deletePurchase = deletePurchase;
    window.savePurchase = savePurchase;
    window.updatePurchase = updatePurchase;
    window.addPurchaseRow = addPurchaseRow;
    window.editSale = editSale;
    window.deleteSale = deleteSale;
    window.saveSales = saveSales;
    window.updateSale = updateSale;
    window.addSaleRow = addSaleRow;
    window.removeSaleRow = removeSaleRow;

    // inventory.js
    window.updateInventory = updateInventory;
}
