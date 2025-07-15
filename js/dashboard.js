// Dashboard Management - Advanced & Informative
// ================================================

function calculateDashboardSummary() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const currentMonthPrefix = `${year}-${(month + 1).toString().padStart(2, '0')}`;
    
    const monthlySales = state.sales.filter(s => s.date && s.date.startsWith(currentMonthPrefix));
    const monthlyPurchases = state.purchases.filter(p => p.date && p.date.startsWith(currentMonthPrefix));
    
    const monthlySalesTotal = monthlySales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
    const monthlyPurchaseTotal = monthlyPurchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);

    const inventoryWithStock = state.items.map(item => ({
        ...item,
        stock: (state.purchases.filter(p => p.item === item.code).reduce((sum, p) => sum + Number(p.quantity), 0)) -
               (state.sales.filter(s => s.item === item.code).reduce((sum, s) => sum + Number(s.quantity), 0)),
    }));
    
    const lowStockItems = inventoryWithStock.filter(item => item.stock <= (item.minStock || 0)).sort((a,b) => a.stock - b.stock);

    const salesByItem = monthlySales.reduce((acc, sale) => {
        const item = state.items.find(i => i.code === sale.item);
        if (item) {
            acc[sale.item] = acc[sale.item] || { name: item.name, amount: 0 };
            acc[sale.item].amount += Number(sale.totalAmount || 0);
        }
        return acc;
    }, {});
    const topSellingItems = Object.values(salesByItem).sort((a, b) => b.amount - a.amount).slice(0, 5);

    const prevMonthDate = new Date(year, month - 1, 1);
    const prevMonthPrefix = `${prevMonthDate.getFullYear()}-${(prevMonthDate.getMonth() + 1).toString().padStart(2, '0')}`;
    const prevMonthlySalesTotal = state.sales
        .filter(s => s.date && s.date.startsWith(prevMonthPrefix))
        .reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
    
    const salesGrowth = prevMonthlySalesTotal > 0 ? ((monthlySalesTotal - prevMonthlySalesTotal) / prevMonthlySalesTotal * 100) : (monthlySalesTotal > 0 ? 100 : 0);

    return { monthlyPurchaseTotal, monthlySalesTotal, totalItemCount: state.items.length, lowStockCount: lowStockItems.length, lowStockItems, topSellingItems, salesGrowth };
}

function renderDashboardCharts(summary) {
    ['dashboardMonthlyChartObj', 'dashboardTopItemsChartObj'].forEach(chartObj => {
        if (window[chartObj]) window[chartObj].destroy();
    });

    const monthlyCtx = document.getElementById('dashboardMonthlyChart')?.getContext('2d');
    if (monthlyCtx) {
        const nowYear = new Date().getFullYear();
        const monthlySalesData = Array(12).fill(0);
        const monthlyPurchaseData = Array(12).fill(0);
        state.sales.forEach(s => { if (s.date?.startsWith(nowYear)) monthlySalesData[new Date(s.date).getMonth()] += Number(s.totalAmount || 0); });
        state.purchases.forEach(p => { if (p.date?.startsWith(nowYear)) monthlyPurchaseData[new Date(p.date).getMonth()] += Number(p.totalAmount || 0); });

        // Check if there's any data
        const hasData = monthlySalesData.some(val => val > 0) || monthlyPurchaseData.some(val => val > 0);
        
        if (!hasData) {
            monthlyCtx.canvas.parentNode.innerHTML = `<div class="empty-state">
                <div class="empty-state-icon"><i class='bx bx-line-chart'></i></div>
                <h6 class="empty-state-title">매입/매출 데이터 없음</h6>
                <p class="empty-state-description">이번 연도의 매입/매출 데이터가 없습니다.</p>
            </div>`;
            return;
        }

        window.dashboardMonthlyChartObj = new Chart(monthlyCtx, {
            type: 'line',
            data: {
                labels: Array.from({length: 12}, (_, i) => `${i + 1}월`),
                datasets: [
                    {
                        label: '매출',
                        data: monthlySalesData,
                        borderColor: 'var(--danger-color)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: 'var(--danger-color)',
                        pointHoverRadius: 6
                    },
                    {
                        label: '매입',
                        data: monthlyPurchaseData,
                        borderColor: 'var(--primary-color)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: 'var(--primary-color)',
                        pointHoverRadius: 6
                    }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { 
                    legend: { 
                        position: 'top',
                        labels: { usePointStyle: true, padding: 20 }
                    },
                    tooltip: { 
                        callbacks: { 
                            label: c => `${c.dataset.label}: ${formatCurrency(c.raw)}` 
                        }
                    }
                },
                scales: { 
                    y: { 
                        beginAtZero: true,
                        ticks: { 
                            callback: (value) => formatCurrency(value) 
                        }
                    },
                    x: { 
                        grid: { display: false }
                    }
                }
            }
        });
    }

    const topItemsCtx = document.getElementById('dashboardTopItemsChart')?.getContext('2d');
    if (topItemsCtx && summary.topSellingItems.length > 0) {
        window.dashboardTopItemsChartObj = new Chart(topItemsCtx, {
            type: 'bar',
            data: {
                labels: summary.topSellingItems.map(i => i.name),
                datasets: [{
                    label: '매출액',
                    data: summary.topSellingItems.map(i => i.amount),
                    backgroundColor: [
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(139, 92, 246, 0.8)'
                    ],
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: c => `매출액: ${formatCurrency(c.raw)}`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    },
                    y: {
                        grid: { display: false }
                    }
                }
            }
        });
    } else if (topItemsCtx) {
        topItemsCtx.canvas.parentNode.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon"><i class='bx bx-bar-chart-alt-2'></i></div>
            <h6 class="empty-state-title">매출 데이터 없음</h6>
            <p class="empty-state-description">이번 달 매출 데이터가 없습니다.</p>
        </div>`;
    }
}

function renderInventoryAlerts(summary) {
    const container = document.getElementById('inventoryAlertsContainer');
    if (!container) return;
    if (summary.lowStockItems.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">
                <i class='bx bx-check-shield'></i>
            </div>
            <h6 class="empty-state-title">재고 상태 양호</h6>
            <p class="empty-state-description">재고 부족 품목이 없습니다.</p>
        </div>`;
        return;
    }
    container.innerHTML = `<div class="inventory-alerts-list">${summary.lowStockItems.slice(0, 5).map(item => {
        const status = item.stock <= 0 ? 'critical' : 'warning';
        return `<div class="inventory-alert-item ${status}">
            <div class="alert-item-info">
                <h6 class="alert-item-title">${item.name}</h6>
                <div class="alert-item-details">현재: <strong>${item.stock}</strong> (최소: ${item.minStock || 0})</div>
            </div>
            <div class="alert-item-status">${status === 'critical' ? '재고 없음' : '저재고'}</div>
        </div>`;
    }).join('')}</div>`;
}

function renderActivityFeed() {
    const container = document.getElementById('activityFeedContainer');
    if (!container) return;
    const activities = [
        ...state.purchases.map(p => ({ ...p, type: '매입', timestamp: p.createdAt || p.date, text: `${state.items.find(i => i.code === p.item)?.name || ''} ${p.quantity}개 입고` })),
        ...state.sales.map(s => ({ ...s, type: '매출', timestamp: s.createdAt || s.date, text: `${state.items.find(i => i.code === s.item)?.name || ''} ${s.quantity}개 출고` }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 7);

    if (activities.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">
                <i class='bx bx-time-five'></i>
            </div>
            <h6 class="empty-state-title">활동 내역 없음</h6>
            <p class="empty-state-description">최근 활동이 없습니다.</p>
        </div>`;
        return;
    }
    const iconMap = { '매입': 'bx-log-in', '매출': 'bx-log-out' };
    container.innerHTML = `<div class="activity-feed">${activities.map(item => `
        <div class="activity-item">
            <div class="activity-icon ${item.type.toLowerCase()}"><i class='bx ${iconMap[item.type]}'></i></div>
            <div class="activity-content">
                <p class="activity-text">${item.text}</p>
                <span class="activity-time">${formatRelativeTime(new Date(item.timestamp))}</span>
            </div>
        </div>`).join('')}</div>`;
}

function formatRelativeTime(date) {
    if (!date || isNaN(date)) return '';
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = { '년': 31536000, '달': 2592000, '일': 86400, '시간': 3600, '분': 60 };
    for (let unit in intervals) {
        const interval = Math.floor(seconds / intervals[unit]);
        if (interval > 1) return `${interval}${unit} 전`;
    }
    return '방금 전';
}

function renderDashboardContent(hasData = true, error = null) {
    return `
        <div class="dashboard-container">
            ${hasData ? `
                <div class="dashboard-grid summary-grid">
                    <div class="dashboard-card">
                        <div class="card-header">
                            <div class="card-title">이달의 매출</div>
                            <div class="card-icon"><i class='bx bx-trending-up'></i></div>
                        </div>
                        <div class="card-body">
                            <div class="card-value" id="monthlySalesTotal">0</div>
                            <div class="card-subtitle">지난달 기록 없음</div>
                            <div class="card-trend" id="salesTrend"></div>
                        </div>
                    </div>

                    <div class="dashboard-card">
                        <div class="card-header">
                            <div class="card-title">이달의 매입</div>
                            <div class="card-icon"><i class='bx bx-trending-down'></i></div>
                        </div>
                        <div class="card-body">
                            <div class="card-value" id="monthlyPurchaseTotal">0</div>
                            <div class="card-subtitle">지난달 기록 없음</div>
                        </div>
                    </div>

                    <div class="dashboard-card">
                        <div class="card-header">
                            <div class="card-title">총 품목 수</div>
                            <div class="card-icon"><i class='bx bx-box'></i></div>
                        </div>
                        <div class="card-body">
                            <div class="card-value" id="totalItemCount">0</div>
                            <div class="card-subtitle">전체 등록 품목</div>
                        </div>
                    </div>

                    <div class="dashboard-card">
                        <div class="card-header">
                            <div class="card-title">재고 부족</div>
                            <div class="card-icon"><i class='bx bx-error-circle'></i></div>
                        </div>
                        <div class="card-body">
                            <div class="card-value" id="lowStockCount">0</div>
                            <div class="card-subtitle">재고 부족 품목</div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-grid main-grid">
                    <div class="dashboard-card monthly-chart-card">
                        <div class="card-header">
                            <div class="card-title">월별 매입/매출 추이</div>
                            <a href="#" onclick="navigateTo('monthly')" class="card-link">자세히 보기 <i class='bx bx-chevron-right'></i></a>
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="dashboardMonthlyChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-grid bottom-grid">
                    <div class="dashboard-card">
                        <div class="card-header">
                            <div class="card-title">판매 TOP 5 품목</div>
                            <div class="card-icon"><i class='bx bx-bar-chart-alt-2'></i></div>
                        </div>
                        <div class="card-body">
                            <div class="chart-container">
                                <canvas id="dashboardTopItemsChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <div class="dashboard-card">
                        <div class="card-header">
                            <div class="card-title">재고 현황 알림</div>
                            <a href="#" onclick="navigateTo('inventory')" class="card-link">더보기 <i class='bx bx-chevron-right'></i></a>
                        </div>
                        <div class="card-body" id="inventoryAlertsContainer"></div>
                    </div>

                    <div class="dashboard-card">
                        <div class="card-header">
                            <div class="card-title">최근 활동</div>
                            <div class="card-icon"><i class='bx bx-history'></i></div>
                        </div>
                        <div class="card-body" id="activityFeedContainer"></div>
                    </div>
                </div>
            ` : renderEmptyState(null, error ? 'error' : 'noData')}
        </div>
    `;
}

function renderEmptyState(container, type = 'error') {
    const states = {
        error: {
            icon: 'bx-error-circle',
            title: '데이터 로드 실패',
            description: '대시보드를 불러오는 데 실패했습니다.',
            buttonText: '다시 시도'
        },
        noData: {
            icon: 'bx-info-circle',
            title: '데이터 없음',
            description: '표시할 데이터가 없습니다.',
            buttonText: '새로고침'
        }
    };

    const state = states[type];
    return `
        <div class="empty-state">
            <div class="empty-state-icon">
                <i class='bx ${state.icon}'></i>
            </div>
            <div class="empty-state-content">
                <h3 class="empty-state-title">${state.title}</h3>
                <p class="empty-state-description">${state.description}</p>
                <button class="btn btn-primary" onclick="loadDashboard()">
                    <i class='bx bx-refresh'></i>
                    ${state.buttonText}
                </button>
            </div>
        </div>
    `;
}

function loadDashboard() {
    if (!isLoggedIn()) {
        navigateTo('login');
        return;
    }

    // mainContent 요소 확인
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('main-content element not found');
        showToast('페이지 로드 중 오류가 발생했습니다.', 'danger');
        return;
    }

    showLoading('대시보드 데이터를 불러오는 중...');
    
    try {
        // 기본 UI 렌더링
        mainContent.innerHTML = renderDashboardContent(true);

        setTimeout(() => {
            try {
                const summary = calculateDashboardSummary();
                
                // 데이터가 없는 경우 체크
                const hasData = summary.monthlySalesTotal > 0 || 
                              summary.monthlyPurchaseTotal > 0 || 
                              summary.totalItemCount > 0;

                if (!hasData) {
                    mainContent.innerHTML = renderDashboardContent(false);
                    hideLoading();
                    return;
                }

                // 데이터가 있는 경우 UI 업데이트
                document.getElementById('monthlySalesTotal').textContent = formatCurrency(summary.monthlySalesTotal);
                const salesTrendEl = document.getElementById('salesTrend');
                if (salesTrendEl) {
                    if (summary.salesGrowth !== 0) {
                        const trendIcon = summary.salesGrowth >= 0 ? 'bx-up-arrow-alt' : 'bx-down-arrow-alt';
                        const trendColor = summary.salesGrowth >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
                        salesTrendEl.innerHTML = `<span style="color: ${trendColor};"><i class='bx ${trendIcon}'></i> ${Math.abs(summary.salesGrowth).toFixed(1)}%</span> vs 지난달`;
                    } else {
                        salesTrendEl.textContent = '지난달 기록 없음';
                    }
                }
                document.getElementById('monthlyPurchaseTotal').textContent = formatCurrency(summary.monthlyPurchaseTotal);
                document.getElementById('totalItemCount').textContent = `${summary.totalItemCount} 개`;
                document.getElementById('lowStockCount').textContent = `${summary.lowStockCount} 개`;
                
                renderDashboardCharts(summary);
                renderInventoryAlerts(summary);
                renderActivityFeed();
            } catch (error) {
                console.error('대시보드 데이터 처리 중 오류 발생:', error);
                showToast('대시보드 데이터를 처리하는 중 오류가 발생했습니다.', 'danger');
                mainContent.innerHTML = renderDashboardContent(false, error);
            } finally {
                hideLoading();
            }
        }, 50);
    } catch (error) {
        console.error('대시보드 초기화 중 오류 발생:', error);
        showToast('대시보드를 불러오는 데 실패했습니다.', 'danger');
        hideLoading();
        mainContent.innerHTML = renderDashboardContent(false, error);
    }
}

// Export functions for use in HTML
window.calculateDashboardSummary = calculateDashboardSummary;
window.renderDashboardCharts = renderDashboardCharts;
window.loadDashboard = loadDashboard;

// 대시보드 초기화
function initializeDashboard() {
    // 월별 매입/매출 추이 차트
    const monthlyChart = document.getElementById('monthlyChart');
    if (monthlyChart) {
        const ctx = monthlyChart.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: '매입',
                        data: [],
                        borderColor: '#4a90e2',
                        backgroundColor: 'rgba(74, 144, 226, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: '매출',
                        data: [],
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }

    // TOP 5 품목 섹션
    const topItemsSection = document.querySelector('.top-items-card');
    if (topItemsSection && !topItemsSection.querySelector('.card-content')) {
        topItemsSection.innerHTML = `
            <div class="empty-state">
                <i class='bx bx-line-chart'></i>
                <h3>매출 데이터 없음</h3>
                <p>이번 달 매출 데이터가 없습니다.</p>
            </div>
        `;
    }

    // 재고 현황 알림 섹션
    const inventoryAlertSection = document.querySelector('.inventory-alert-card');
    if (inventoryAlertSection && !inventoryAlertSection.querySelector('.card-content')) {
        inventoryAlertSection.innerHTML = `
            <div class="empty-state">
                <i class='bx bx-check-shield'></i>
                <h3>재고 상태 양호</h3>
                <p>재고 보충 품목이 없습니다.</p>
            </div>
        `;
    }
}

// 페이지 로드 시 대시보드 초기화
document.addEventListener('DOMContentLoaded', initializeDashboard);
