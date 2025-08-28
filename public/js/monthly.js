// 월별 관리 모듈
import { state, getCurrentCompanyBusinessNumber, saveCompanyState, isLoggedIn, navigateTo } from './main.js';
import { showLoading, hideLoading, showToast, showModal, formatCurrency, waitForMainContent } from './ui.js';

export function loadMonthlyView() {
    if (!isLoggedIn()) {
        navigateTo('login');
        return;
    }
    
    showLoading('월별 데이터를 불러오는 중...');
    
    // DOM이 준비될 때까지 안전하게 대기
    waitForMainContent()
        .then(mainContent => {
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
            hideLoading();
            
            // 년/월 입력 필드에 실시간 이벤트 추가
            document.getElementById('monthlyYear').addEventListener('input', () => renderMonthlyTables(false));
            document.getElementById('monthlyMonth').addEventListener('input', () => renderMonthlyTables(false));
            
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
        })
        .catch(error => {
            console.error('월별 관리 페이지 로드 실패:', error);
            hideLoading();
            showToast('페이지 로드 중 오류가 발생했습니다.', 'error');
        });
}

export function enableMonthlyInputs(enable) {
    // 년/월 입력 필드는 항상 활성화 상태로 유지
    // enable 매개변수는 "전체" 버튼 호환성을 위해 유지
}

export function renderMonthlyTables(showAll = false) {
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

export function initMonthlyTab() {
    // 월별 탭 초기화 로직
    console.log('월별 탭이 초기화되었습니다.');
} 