// 메인 애플리케이션 파일
import { showLoading, hideLoading, showToast, showModal, formatCurrency, generateId, renderPagination, showLoadingWithDelay, showProgressLoading, lazyLoad, createSkeletonLoader, createInfiniteScroll, logErrorToFirestore, showTopBarLoading, hideTopBarLoading, findOrCreateMainContent } from './ui.js';
import { loadInventory, initInventoryTab } from './inventory.js';
import { loadItems, initItemsTab, showItemModal, saveItem, editItem, deleteItem, filterItems, exportItems, importItems, downloadItemTemplate, showItemBulkUploadModal, handleItemBulkUpload, confirmItemBulkUpload, cancelItemBulkUpload } from './items.js';
import { loadSales, initSalesTab } from './sales.js';
import { loadPurchases, initPurchaseTab } from './purchase.js';
import { loadPartners, initPartnersTab } from './partners.js';
import { loadMonthlyView, initMonthlyTab } from './monthly.js';
import { initAdmin } from './admin.js';
import { 
    checkApprovedUser, 
    getCompanyByBusinessNumber, 
    loadCompanyData as loadCompanyDataFromFirestore,
    logAccess
} from './firestore-helper.js';

// DOM Elements (DOMContentLoaded에서 초기화)
let sidebar, sidebarCollapse, mainContent, commonModal;

// State Management
export let state = {
    items: JSON.parse(localStorage.getItem('items')) || [],
    partners: JSON.parse(localStorage.getItem('partners')) || [],
    purchases: JSON.parse(localStorage.getItem('purchases')) || [],
    sales: JSON.parse(localStorage.getItem('sales')) || [],
    currentPage: 'dashboard',
    sidebarCollapsed: false,
    partnersCurrentPage: 1,
    itemsCurrentPage: 1,
    purchasesCurrentPage: 1,
    salesCurrentPage: 1,
    inventoryCurrentPage: 1
};

// 전역에서 state 객체에 접근할 수 있도록 설정
window.state = state;

// 기업별 데이터 관리 함수들
export function getCompanyKey(businessNumber) {
    return `company_${businessNumber.replace(/-/g, '')}`;
}

export async function loadCompanyData(businessNumber) {
    if (!businessNumber) {
        state.items = [];
        state.partners = [];
        state.purchases = [];
        state.sales = [];
        return;
    }
    
    // Firestore가 있는 경우 새로운 구조 사용
    if (window.firestore) {
        try {
            const companyInfo = await getCompanyByBusinessNumber(businessNumber);
            if (companyInfo) {
                const companyData = await loadCompanyDataFromFirestore(companyInfo.id);
                state.items = companyData.items || [];
                state.partners = companyData.partners || [];
                state.purchases = companyData.purchases || [];
                state.sales = companyData.sales || [];
            } else {
                // 기업 정보가 없는 경우 빈 배열로 초기화
                state.items = [];
                state.partners = [];
                state.purchases = [];
                state.sales = [];
            }
        } catch (error) {
            console.error('Firestore에서 기업 데이터 로드 오류:', error);
            // 오류 발생 시 기존 방식으로 폴백
            const companyKey = getCompanyKey(businessNumber);
            const companyData = JSON.parse(localStorage.getItem(companyKey)) || {
                items: [],
                partners: [],
                purchases: [],
                sales: []
            };
            
            state.items = companyData.items || [];
            state.partners = companyData.partners || [];
            state.purchases = companyData.purchases || [];
            state.sales = companyData.sales || [];
        }
    } else {
        // Firestore가 없는 경우 기존 방식 사용
        const companyKey = getCompanyKey(businessNumber);
        const companyData = JSON.parse(localStorage.getItem(companyKey)) || {
            items: [],
            partners: [],
            purchases: [],
            sales: []
        };
        
        state.items = companyData.items || [];
        state.partners = companyData.partners || [];
        state.purchases = companyData.purchases || [];
        state.sales = companyData.sales || [];
    }
}

export async function saveCompanyData(businessNumber) {
    // Firestore가 있는 경우 새로운 구조 사용
    if (window.firestore) {
        try {
            const companyInfo = await getCompanyByBusinessNumber(businessNumber);
            if (companyInfo) {
                // 각 컬렉션별로 데이터 저장
                const { saveCompanyItem, saveCompanyPartner, saveCompanyPurchase, saveCompanySale } = await import('./firestore-helper.js');
                
                // 품목 데이터 저장
                for (const item of state.items) {
                    await saveCompanyItem(companyInfo.id, item);
                }
                
                // 거래처 데이터 저장
                for (const partner of state.partners) {
                    await saveCompanyPartner(companyInfo.id, partner);
                }
                
                // 매입 데이터 저장 (중복 방지)
                console.log('매입 데이터 저장 시작, 총 개수:', state.purchases.length);
                
                // 중복 제거: 동일한 ID의 매입은 한 번만 저장
                const uniquePurchases = [];
                const seenIds = new Set();
                
                for (const purchase of state.purchases) {
                    if (!seenIds.has(purchase.id)) {
                        seenIds.add(purchase.id);
                        uniquePurchases.push(purchase);
                    } else {
                        console.log('중복 매입 ID 건너뛰기:', purchase.id);
                    }
                }
                
                console.log('중복 제거 후 매입 개수:', uniquePurchases.length);
                
                for (const purchase of uniquePurchases) {
                    console.log('매입 저장 중:', purchase);
                    await saveCompanyPurchase(companyInfo.id, purchase);
                }
                
                // 매출 데이터 저장 (중복 방지)
                console.log('매출 데이터 저장 시작, 총 개수:', state.sales.length);
                
                // 중복 제거: 동일한 ID의 매출은 한 번만 저장
                const uniqueSales = [];
                const seenSaleIds = new Set();
                
                for (const sale of state.sales) {
                    if (!seenSaleIds.has(sale.id)) {
                        seenSaleIds.add(sale.id);
                        uniqueSales.push(sale);
                    } else {
                        console.log('중복 매출 ID 건너뛰기:', sale.id);
                    }
                }
                
                console.log('중복 제거 후 매출 개수:', uniqueSales.length);
                
                // 매출 저장은 sales.js에서 직접 처리하므로 여기서는 건너뛰기
                console.log('매출 저장은 sales.js에서 직접 처리됨 - 건너뛰기');
                
                console.log('Firestore에 기업 데이터 저장 완료:', companyInfo.id);
            }
        } catch (error) {
            console.error('Firestore에 기업 데이터 저장 오류:', error);
            // 오류 발생 시 기존 방식으로 폴백
            const companyKey = getCompanyKey(businessNumber);
            const companyData = {
                items: state.items,
                partners: state.partners,
                purchases: state.purchases,
                sales: state.sales
            };
            localStorage.setItem(companyKey, JSON.stringify(companyData));
        }
    } else {
        // Firestore가 없는 경우 기존 방식 사용
        const companyKey = getCompanyKey(businessNumber);
        const companyData = {
            items: state.items,
            partners: state.partners,
            purchases: state.purchases,
            sales: state.sales
        };
        localStorage.setItem(companyKey, JSON.stringify(companyData));
    }
}

/**
 * 사업자등록번호 자동 하이픈 포맷팅 함수
 * @param {string} value - 입력값
 * @returns {string} 포맷팅된 사업자등록번호
 */
function formatBusinessNumber(value) {
    // 숫자만 추출
    let numbers = value.replace(/[^0-9]/g, '');
    
    // 10자리까지만 유지
    if (numbers.length > 10) {
        numbers = numbers.slice(0, 10);
    }
    
    // 하이픈 추가
    if (numbers.length === 0) {
        return '';
    } else if (numbers.length <= 3) {
        return numbers;
    } else if (numbers.length <= 5) {
        return numbers.slice(0, 3) + '-' + numbers.slice(3);
    } else {
        return numbers.slice(0, 3) + '-' + numbers.slice(3, 5) + '-' + numbers.slice(5);
    }
}

/**
 * 사업자등록번호 입력 필드 설정 함수
 * @param {HTMLElement} inputElement - 입력 필드 요소
 * @param {string} context - 사용 컨텍스트 (로그인/회원가입)
 */
function setupBusinessNumberInput(inputElement, context = '') {
    if (!inputElement) return;
    
    // 기존 이벤트 리스너 제거 (중복 방지)
    const newInput = inputElement.cloneNode(true);
    inputElement.parentNode.replaceChild(newInput, inputElement);
    
    // 입력 이벤트 리스너 추가
    newInput.addEventListener('input', function(e) {
        const originalValue = e.target.value;
        const formattedValue = formatBusinessNumber(originalValue);
        
        // 값이 변경된 경우에만 업데이트 (커서 위치 유지)
        if (originalValue !== formattedValue) {
            const cursorPosition = e.target.selectionStart;
            const addedHyphens = (formattedValue.match(/-/g) || []).length - (originalValue.match(/-/g) || []).length;
            
            e.target.value = formattedValue;
            
            // 커서 위치 조정
            if (cursorPosition < formattedValue.length) {
                e.target.setSelectionRange(cursorPosition + addedHyphens, cursorPosition + addedHyphens);
            }
        }
    });
    
    // 포커스 시 전체 선택
    newInput.addEventListener('focus', function(e) {
        e.target.select();
    });
    
    // 키보드 이벤트 처리
    newInput.addEventListener('keydown', function(e) {
        // 숫자, 백스페이스, 삭제, 탭, 화살표 키만 허용
        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        const isNumber = /^[0-9]$/.test(e.key);
        const isAllowedKey = allowedKeys.includes(e.key);
        
        if (!isNumber && !isAllowedKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
        }
    });
    
    // 붙여넣기 이벤트 처리
    newInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const formattedValue = formatBusinessNumber(pastedText);
        e.target.value = formattedValue;
    });
    
    console.log(`${context} 사업자등록번호 입력 필드 설정 완료`);
}

export function getCurrentCompanyBusinessNumber() {
    if (isAdmin()) {
        return sessionStorage.getItem('adminViewingBusinessNumber');
    }
    return sessionStorage.getItem('loginBusinessNumber');
}

// saveCompanyState 함수 제거 - 개별 데이터 처리 함수로 대체됨

// 세션 관리 변수
let inactivityTimer = null;

// 로그인 관리 함수들
export function isLoggedIn() {
    return sessionStorage.getItem('isLoggedIn') === 'true';
}

export function isAdmin() {
    return sessionStorage.getItem('isAdmin') === 'true';
}

export function clearLoginData() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('loginUserId');
    sessionStorage.removeItem('loginBusinessNumber');
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('adminViewingBusinessNumber');
    
    // state 초기화
    state = {
        items: [],
        partners: [],
        purchases: [],
        sales: [],
        currentPage: 'dashboard',
        sidebarCollapsed: state.sidebarCollapsed,
        partnersCurrentPage: 1,
        itemsCurrentPage: 1,
        purchasesCurrentPage: 1,
        salesCurrentPage: 1,
        inventoryCurrentPage: 1
    };
}

// 세션 타임아웃 관리 함수들
export function resetInactivityTimer() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    
    inactivityTimer = setTimeout(() => {
        logoutForInactivity();
    }, 1800000); // 30분 (1800000 밀리초)
}

export function logoutForInactivity() {
    showToast('30분 동안 활동이 없어 안전을 위해 자동 로그아웃되었습니다.', 'warning');
    clearLoginData();
    navigateTo('login');
    updateActiveNavItem();
    updateMenuVisibility();
    loadPageContent('login');
    renderLogoutBtn();
}

// 사용자 활동 감지 이벤트 리스너 설정
export function setupInactivityMonitoring() {
    const events = ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, { passive: true });
    });
}

export function logout() {
    if (confirm('로그아웃하시겠습니까?')) {
        // 세션 타이머 정리
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
        
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('loginUserId');
        sessionStorage.removeItem('loginBusinessNumber');
        sessionStorage.removeItem('isAdmin');
        sessionStorage.removeItem('adminViewingBusinessNumber');

        // state 초기화
        state = {
            items: [],
            partners: [],
            purchases: [],
            sales: [],
            currentPage: 'login',
            sidebarCollapsed: state.sidebarCollapsed
        };
        
        showToast('로그아웃되었습니다.');
        
        // 로그인 페이지로 직접 이동
        state.currentPage = 'login';
        updateActiveNavItem();
        updateMenuVisibility();
        loadPageContent('login');
        renderLogoutBtn();
    }
}

// 로그인 페이지 로드
export function loadLogin() {
    if (isLoggedIn()) {
        navigateTo('dashboard');
        return;
    }
    const content = `
        <div class="login-container">
            <div class="login-card">
                <div class="card">
                    <div class="card-header text-center">
                        <h4>기업 로그인</h4>
                    </div>
                    <div class="card-body">
                        <form id="loginForm">
                            <div class="mb-3">
                                <label class="form-label">사업자등록번호 <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" name="businessNumber" id="businessNumberInput" required 
                                    placeholder="" maxlength="12" inputmode="numeric" pattern="[0-9-]*">
                                <div class="form-text">숫자만 입력하면 자동으로 하이픈이 추가됩니다.</div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">비밀번호 <span class="text-danger">*</span></label>
                                <input type="password" class="form-control" name="password" required>
                            </div>
                            <div class="d-grid gap-2">
                                <button type="submit" class="btn btn-primary">로그인</button>
                                <button type="button" class="btn btn-outline-secondary" onclick="showSignupModal()">회원가입</button>
                            </div>
                        </form>
                        <hr>
                        <div class="text-center">
                            <button type="button" class="btn btn-link text-secondary" onclick="showAdminLoginModal()">관리자 로그인</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    const mainContentEl = document.getElementById('main-content') || findOrCreateMainContent();
    if (mainContentEl) {
        mainContentEl.innerHTML = content;
    }
    
    // 사업자등록번호 자동 하이픈 기능 설정
    setTimeout(() => {
        const businessNumberInput = document.getElementById('businessNumberInput');
        if (businessNumberInput) {
            setupBusinessNumberAutoHyphen(businessNumberInput);
        }
    }, 100);
    
    // 로그인 폼 이벤트 리스너 (중복 방지)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const newLoginForm = loginForm.cloneNode(true);
        loginForm.parentNode.replaceChild(newLoginForm, loginForm);
        
        newLoginForm.addEventListener('submit', handleUserLogin);
    }
}

// 사용자 로그인 처리 함수
export async function handleUserLogin(e) {
    e.preventDefault();
    
    // 이미 로그인된 상태인지 확인
    if (isLoggedIn()) {
        showToast('이미 로그인된 상태입니다.');
        navigateTo('dashboard');
        return;
    }
    
    const formData = new FormData(e.target);
    const businessNumber = formData.get('businessNumber');
    const password = formData.get('password');
    
    if (businessNumber && password) {
        // 사업자등록번호 형식 검증
        const businessNumberPattern = /^[0-9]{3}-[0-9]{2}-[0-9]{5}$/;
        if (!businessNumberPattern.test(businessNumber)) {
            alert('사업자등록번호 형식이 올바르지 않습니다. (예: 000-00-00000)');
            return;
        }
        
        // 새로운 Firestore 구조로 사용자 정보 확인
        try {
            if (window.firestore && typeof window.firestore === 'object') {
                // 1. 승인된 사용자 확인
                const approvedUser = await checkApprovedUser(businessNumber, password);
                
                if (approvedUser) {
                    // 2. 기업 정보 조회
                    const companyInfo = await getCompanyByBusinessNumber(businessNumber);
                    
                    if (companyInfo) {
                        // 3. 기업별 데이터 로드
                        const companyData = await loadCompanyDataFromFirestore(companyInfo.id);
                        
                        // 로그인 성공
                        clearLoginData();
                        sessionStorage.setItem('loginBusinessNumber', businessNumber);
                        sessionStorage.setItem('isLoggedIn', 'true');
                        sessionStorage.setItem('loginCompanyName', companyInfo.companyName || '');
                        sessionStorage.setItem('loginCompanyId', companyInfo.id);
                        
                        // state에 데이터 설정
                        state.items = companyData.items || [];
                        state.partners = companyData.partners || [];
                        state.purchases = companyData.purchases || [];
                        state.sales = companyData.sales || [];
                        
                        // 세션 타이머 시작
                        resetInactivityTimer();
                        
                        // 로그인 로그 기록
                        try {
                            await logAccess('USER_LOGIN', { 
                                businessNumber, 
                                companyName: companyInfo.companyName 
                            });
                        } catch (error) {
                            console.error('로그인 로그 기록 실패:', error);
                        }
                        
                        showToast('로그인되었습니다.');
                        
                        // 로그인 성공 후 페이지 새로고침하여 깔끔하게 대시보드로 전환
                        setTimeout(() => {
                            window.location.reload();
                        }, 500);
                    } else {
                        alert('기업 정보를 찾을 수 없습니다. 관리자에게 문의하세요.');
                    }
                } else {
                    alert('사업자등록번호 또는 비밀번호를 확인해주세요.');
                }
            } else {
                // Firestore가 없는 경우 기존 방식으로 처리
                const approvedUsers = getApprovedUsers();
                const approvedUser = approvedUsers.find(user => 
                    user.businessNumber === businessNumber && 
                    user.password === password
                );
        
                if (!approvedUser) {
                    alert('사업자등록번호 또는 비밀번호를 확인해주세요.');
                    return;
                }
                
                // 기존 로그인 정보 정리 (중복 로그인 방지)
                clearLoginData();
                
                // 승인된 사용자 로그인 처리
                sessionStorage.setItem('loginBusinessNumber', businessNumber);
                sessionStorage.setItem('isLoggedIn', 'true');
                
                // 기업별 데이터 로드
                loadCompanyData(businessNumber);
                
                // 세션 타이머 시작
                resetInactivityTimer();
                
                // 로그인 로그 기록
                try {
                    await logAccess('USER_LOGIN', { 
                        businessNumber, 
                        method: 'localStorage' 
                    });
                } catch (error) {
                    console.error('로그인 로그 기록 실패:', error);
                }
                
                showToast('로그인되었습니다.');
                
                // 로그인 성공 후 페이지 새로고침하여 깔끔하게 대시보드로 전환
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        } catch (e) {
            console.error('로그인 처리 오류:', e);
            // 오류 로그 기록
            try {
                await logErrorToFirestore(e, { 
                    action: 'USER_LOGIN_ATTEMPT',
                    businessNumber: businessNumber 
                });
            } catch (logError) {
                console.error('오류 로그 기록 실패:', logError);
            }
            alert('로그인 중 오류가 발생했습니다.');
        }
    } else {
        alert('사업자등록번호와 비밀번호를 모두 입력해주세요.');
    }
}

// 대시보드 관련 함수들
export async function loadDashboard() {
    if (!isLoggedIn()) {
        navigateTo('login');
        return;
    }

    console.log('대시보드 로드 시작');
    showLoading('대시보드를 불러오는 중...');

    try {
        const businessNumber = getCurrentCompanyBusinessNumber();
        let welcomeMessage = '';
        const userId = localStorage.getItem('loginUserId');

        console.log('대시보드 로드 - 사업자번호:', businessNumber, '관리자 여부:', isAdmin());

        if (isAdmin()) {
            // 관리자도 일반 대시보드 표시 (기업 선택 기능 포함)
            let approvedUsers = [];
            try {
                if (window.firebase && window.firebase.firestore) {
                    const companiesSnapshot = await window.firebase.firestore()
                        .collection('companies')
                        .get();
                    
                    approvedUsers = [];
                    companiesSnapshot.forEach(doc => {
                        const data = doc.data();
                        approvedUsers.push({ 
                            businessNumber: data.businessNumber,
                            companyName: data.companyName,
                            approvedAt: data.approvedAt
                        });
                    });
                } else {
                    // Firestore가 없는 경우 localStorage 사용
                    approvedUsers = getApprovedUsers();
                }
            } catch (error) {
                console.error('승인된 사용자 로드 오류:', error);
                approvedUsers = getApprovedUsers();
            }
            
            const companyName = getCompanyNameFromBNo(businessNumber);
            
            // 관리자용 간단한 환영 메시지 (기업 선택 기능 포함)
            welcomeMessage = `
                <div class="admin-welcome-container">
                    <div class="row align-items-center">
                        <div class="col">
                            <h4 class="mb-1">관리자님, 환영합니다.</h4>
                            <p class="mb-0">${companyName ? `현재 <strong>${companyName}</strong>의 대시보드를 보고 있습니다.` : '관리할 기업을 선택해주세요.'}</p>
                    </div>
                        <div class="col-md-4 col-lg-3 col-12 ms-auto">
                            <div class="input-group">
                                <label class="input-group-text" for="companySwitchSelect"><i class='bx bx-buildings'></i></label>
                                <select class="form-select" id="companySwitchSelect">
                                    <option value="">-- 기업 선택 --</option>
                                    ${approvedUsers.map(user => `
                                        <option value="${user.businessNumber}" ${businessNumber === user.businessNumber ? 'selected' : ''}>
                                            ${user.companyName}
                                        </option>
                                    `).join('')}
                                </select>
                </div>
                        </div>
                    </div>
                </div>
            `;

        } else {
            // 일반 사용자는 별도 환영 메시지 없음 (welcome-box만 사용)
            welcomeMessage = '';
        }

        let mainContentElement = document.getElementById('main-content');
        if (!mainContentElement) {
            console.error('main-content 요소를 찾을 수 없습니다. content 요소를 확인합니다.');
            const contentElement = document.getElementById('content');
            if (contentElement) {
                let containerFluid = contentElement.querySelector('.container-fluid');
                if (!containerFluid) {
                    // container-fluid가 없으면 생성
                    containerFluid = document.createElement('div');
                    containerFluid.className = 'container-fluid';
                    contentElement.appendChild(containerFluid);
                    console.log('container-fluid 요소를 새로 생성했습니다.');
                }
                
                // main-content 생성
                const newMainContent = document.createElement('div');
                newMainContent.id = 'main-content';
                containerFluid.appendChild(newMainContent);
                console.log('main-content 요소를 새로 생성했습니다.');
                mainContentElement = newMainContent;
            } else {
                throw new Error('content 요소도 찾을 수 없습니다.');
            }
        }

        console.log('main-content 요소 찾음, HTML 구조 생성 시작');

        mainContentElement.innerHTML = `
            ${welcomeMessage}
            <div id="dashboard-container"></div>
        `;

        console.log('대시보드 HTML 구조 생성 완료');

        if (isAdmin()) {
            const companySwitchSelect = document.getElementById('companySwitchSelect');
            if (companySwitchSelect) {
                companySwitchSelect.addEventListener('change', async (e) => {
                    const selectedBusinessNumber = e.target.value;
                    console.log('관리자 기업 선택:', selectedBusinessNumber);
                    if (selectedBusinessNumber) {
                        sessionStorage.setItem('adminViewingBusinessNumber', selectedBusinessNumber);
                        console.log('sessionStorage에 저장됨:', selectedBusinessNumber);
                        try {
                            await loadCompanyData(selectedBusinessNumber);
                            console.log('기업 데이터 로딩 완료, 대시보드 업데이트 시작');
                            renderDashboardContent();
                            console.log('대시보드 업데이트 완료');
                        } catch (error) {
                            console.error('기업 데이터 로딩 오류:', error);
                            showToast('기업 데이터 로딩 중 오류가 발생했습니다.', 'error');
                        }
                    } else {
                        sessionStorage.removeItem('adminViewingBusinessNumber');
                        console.log('sessionStorage에서 제거됨');
                        state.items = []; state.partners = []; state.purchases = []; state.sales = [];
                        // Display "Select a company" message
                        const dashboardContainer = document.getElementById('dashboard-container');
                        if (dashboardContainer) {
                            dashboardContainer.innerHTML = `
                                <div class="alert alert-info text-center mt-4 p-5">
                                    <h4><i class='bx bx-info-circle me-2'></i>기업을 선택하세요</h4>
                                    <p class="lead">상단의 기업 전환 메뉴에서 관리할 기업을 선택하여 대시보드를 확인하세요.</p>
                                </div>
                            `;
                        }
                    }
                });
            }
        }

        const showData = businessNumber || !isAdmin();
        console.log('대시보드 데이터 표시 여부:', showData);
        
        if (showData) {
            console.log('renderDashboardContent 함수 호출 시작');
            renderDashboardContent();
            console.log('대시보드 콘텐츠 렌더링 완료');
        } else {
            const dashboardContainer = document.getElementById('dashboard-container');
            if (dashboardContainer) {
                dashboardContainer.innerHTML = `
                    <div class="alert alert-info text-center mt-4 p-5">
                        <h4><i class='bx bx-info-circle me-2'></i>기업을 선택하세요</h4>
                        <p class="lead">상단의 기업 전환 메뉴에서 관리할 기업을 선택하여 대시보드를 확인하세요.</p>
                    </div>
                `;
            }
        }
        
        console.log('hideLoading 호출 전');
        hideLoading();
        console.log('대시보드 로드 완료');
        
    } catch (error) {
        console.error('대시보드 로드 중 오류 발생:', error);
        hideLoading();
        
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="alert alert-danger text-center mt-5">
                    <h4><i class='bx bx-error-circle me-2'></i>대시보드 로드 오류</h4>
                    <p class="mb-3">대시보드를 불러오는 중 오류가 발생했습니다.</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class='bx bx-refresh me-2'></i>페이지 새로고침
                    </button>
                </div>
            `;
        }
        
        showToast('대시보드 로드 중 오류가 발생했습니다.', 'error');
    }
}

// Navigation
export function navigateTo(page) {
    console.log('navigateTo 호출됨:', page, '현재 페이지:', state.currentPage);
    
    // 로그인하지 않은 경우 로그인 페이지로만 이동
    if (!isLoggedIn()) {
        if (page !== 'login') {
            state.currentPage = 'login';
            updateActiveNavItem();
            loadPageContent('login');
            renderLogoutBtn();
        }
        return;
    }
    
    // 로그인된 상태에서 페이지 이동
    if (page === state.currentPage) {
        console.log('이미 같은 페이지입니다:', page);
        return; // 같은 페이지면 아무것도 하지 않음
    }
    
    console.log('페이지 변경:', state.currentPage, '→', page);
    state.currentPage = page;
    updateActiveNavItem();
    loadPageContent(page);
    renderLogoutBtn();
}

export function updateActiveNavItem() {
    console.log('updateActiveNavItem 호출됨, 현재 페이지:', state.currentPage);
    
    // 모든 사이드바 항목에서 active 클래스 제거
    document.querySelectorAll('#sidebar li').forEach(item => {
        item.classList.remove('active');
    });
    
    // 현재 페이지에 해당하는 링크 찾기
    const link = document.querySelector(`#sidebar a[data-page="${state.currentPage}"]`);
    if (link) {
        link.parentElement.classList.add('active');
        console.log('활성화된 탭:', state.currentPage);
    } else {
        console.warn('현재 페이지에 해당하는 사이드바 링크를 찾을 수 없습니다:', state.currentPage);
    }
}

// 메뉴 가시성 업데이트 함수
export function updateMenuVisibility() {
    console.log('updateMenuVisibility 호출됨, 로그인 상태:', isLoggedIn(), '관리자 여부:', isAdmin());
    
    // 로그인 상태에 따라 메뉴 표시/숨김 설정
    const loginMenu = document.querySelector('#sidebar a[data-page="login"]')?.parentElement;
    const protectedMenus = document.querySelectorAll('#sidebar a[data-page]:not([data-page="login"])');
    
    if (isLoggedIn()) {
        // 로그인된 경우: 로그인 메뉴 숨김, 다른 메뉴들 활성화
        if (loginMenu) {
            loginMenu.style.display = 'none';
        }
        protectedMenus.forEach(menu => {
            menu.style.opacity = '1';
            menu.style.pointerEvents = 'auto';
            menu.classList.remove('disabled');
        });
        console.log('로그인된 상태: 보호된 메뉴들 활성화됨');
    } else {
        // 로그인되지 않은 경우: 로그인 메뉴만 표시, 다른 메뉴들 비활성화
        if (loginMenu) {
            loginMenu.style.display = '';
        }
        protectedMenus.forEach(menu => {
            menu.style.opacity = '0.5';
            menu.style.pointerEvents = 'none';
            menu.classList.add('disabled');
        });
        console.log('로그인되지 않은 상태: 보호된 메뉴들 비활성화됨');
    }
    
    // 강제로 DOM 업데이트
    setTimeout(() => {
        console.log('메뉴 가시성 업데이트 완료');
    }, 100);
}

// Page Content Loading
export async function loadPageContent(page) {
    console.log('페이지 콘텐츠 로드 시작:', page);
    
    const topBar = showTopBarLoading();
    
    try {
        switch(page) {
            case 'dashboard':
                console.log('대시보드 로드 함수 호출');
                await loadDashboard();
                break;
            case 'items':
                console.log('품목 관리 로드 함수 호출');
                try {
                    const itemsResult = loadItems();
                    if (itemsResult && typeof itemsResult.finally === 'function') {
                        itemsResult.finally(() => topBar.complete());
                    } else {
                        setTimeout(() => topBar.complete(), 300);
                    }
                } catch (error) {
                    console.error('품목 관리 로드 오류:', error);
                    setTimeout(() => topBar.complete(), 300);
                }
                return; // 하단에서 complete 중복 방지
            case 'partners':
                console.log('거래처 관리 로드 함수 호출');
                try {
                    const partnersResult = loadPartners();
                    if (partnersResult && typeof partnersResult.finally === 'function') {
                        partnersResult.finally(() => topBar.complete());
                    } else {
                        setTimeout(() => topBar.complete(), 300);
                    }
                } catch (error) {
                    console.error('거래처 관리 로드 오류:', error);
                    setTimeout(() => topBar.complete(), 300);
                }
                return;
            case 'purchase':
                console.log('매입 관리 로드 함수 호출');
                try {
                    const purchaseResult = loadPurchases();
                    if (purchaseResult && typeof purchaseResult.finally === 'function') {
                        purchaseResult.finally(() => topBar.complete());
                    } else {
                        setTimeout(() => topBar.complete(), 300);
                    }
                } catch (error) {
                    console.error('매입 관리 로드 오류:', error);
                    setTimeout(() => topBar.complete(), 300);
                }
                return;
            case 'sales':
                console.log('매출 관리 로드 함수 호출');
                try {
                    const salesResult = loadSales();
                    if (salesResult && typeof salesResult.finally === 'function') {
                        salesResult.finally(() => topBar.complete());
                    } else {
                        setTimeout(() => topBar.complete(), 300);
                    }
                } catch (error) {
                    console.error('매출 관리 로드 오류:', error);
                    setTimeout(() => topBar.complete(), 300);
                }
                return;
            case 'inventory':
                console.log('재고현황 로드 함수 호출');
                try {
                    const inventoryResult = loadInventory();
                    if (inventoryResult && typeof inventoryResult.finally === 'function') {
                        inventoryResult.finally(() => topBar.complete());
                    } else {
                        setTimeout(() => topBar.complete(), 300);
                    }
                } catch (error) {
                    console.error('재고현황 로드 오류:', error);
                    setTimeout(() => topBar.complete(), 300);
                }
                return;
            case 'monthly':
                console.log('월별 조회 로드 함수 호출');
                try {
                    const monthlyResult = loadMonthlyView();
                    if (monthlyResult && typeof monthlyResult.finally === 'function') {
                        monthlyResult.finally(() => topBar.complete());
                    } else {
                        setTimeout(() => topBar.complete(), 300);
                    }
                } catch (error) {
                    console.error('월별 조회 로드 오류:', error);
                    setTimeout(() => topBar.complete(), 300);
                }
                return;
            case 'login':
                console.log('로그인 페이지 로드 함수 호출');
                loadLogin();
                setTimeout(() => topBar.complete(), 150);
                return;
            default:
                console.warn('알 수 없는 페이지:', page);
                loadDashboard();
                setTimeout(() => topBar.complete(), 300);
                return;
        }
        console.log('페이지 콘텐츠 로드 완료:', page);
    } catch (error) {
        console.error('페이지 콘텐츠 로드 중 오류 발생:', page, error);
    } finally {
        topBar.complete();
    }
}

// 로그아웃 버튼 렌더링
export function renderLogoutBtn() {
    // 기존 로그아웃 버튼 제거
    const existingLogout = document.querySelector('.logout-container');
    if (existingLogout) {
        existingLogout.remove();
    }
    
    // 로그인 상태일 때만 로그아웃 버튼 표시
    if (isLoggedIn()) {
        const logoutContainer = document.createElement('div');
        logoutContainer.className = 'logout-container';
        
        // 관리자인 경우 관리자 패널 버튼 추가
        if (isAdmin()) {
            const adminBtn = document.createElement('button');
            adminBtn.className = 'btn btn-outline-warning logout-btn mb-2';
            adminBtn.innerHTML = '<i class="bx bx-cog"></i> <span>관리자 패널</span>';
            adminBtn.onclick = async () => {
                const { showAdminPanel } = await import('./admin.js');
                showAdminPanel();
            };
            logoutContainer.appendChild(adminBtn);
        }
        
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn btn-outline-danger logout-btn';
        logoutBtn.innerHTML = '<i class="bx bx-log-out"></i> <span>로그아웃</span>';
        logoutBtn.onclick = logout;
        logoutContainer.appendChild(logoutBtn);
        
        // 사이드바 하단에 추가
        const sidebar = document.getElementById('sidebar');
        sidebar.appendChild(logoutContainer);
    }
}



// Event Listeners
let isInitialized = false; // 중복 초기화 방지

window.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) return; // 이미 초기화되었다면 중복 실행 방지
    isInitialized = true;
    
    console.log('애플리케이션 초기화 시작...');
    
    try {
        // 초기 로딩 표시
        showLoading('애플리케이션을 초기화하는 중...');
        
        // DOM 요소 초기화
        sidebar = document.getElementById('sidebar');
        sidebarCollapse = document.getElementById('sidebarCollapse');
        mainContent = document.getElementById('content');
        commonModal = document.getElementById('commonModal');

        // 필수 DOM 요소 확인
        if (!mainContent) {
            throw new Error('main-content 요소를 찾을 수 없습니다.');
        }

        console.log('DOM 요소 초기화 완료');

        // 사업자등록번호 자동 하이픈 기능 감시 시작
        setupBusinessNumberObserver();

        // Sidebar toggle
        if (sidebarCollapse) {
            sidebarCollapse.addEventListener('click', () => {
                state.sidebarCollapsed = !state.sidebarCollapsed;
                sidebar.classList.toggle('collapsed', state.sidebarCollapsed);
                mainContent.classList.toggle('collapsed', state.sidebarCollapsed);
            });
        }

        // 로그인 상태에 따라 메뉴 표시/숨김 설정
        updateMenuVisibility();

        console.log('로그인 상태 확인 완료:', isLoggedIn());

        // Navigation - 이벤트 리스너 중복 등록 방지
        const navLinks = document.querySelectorAll('#sidebar a[data-page]');
        navLinks.forEach(link => {
            // 기존 이벤트 리스너 제거
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
            
            // 새 이벤트 리스너 등록
            newLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const page = e.target.closest('a').dataset.page;
                console.log('네비게이션 클릭:', page);
                navigateTo(page);
            });
        });

        console.log('네비게이션 이벤트 리스너 등록 완료');

        // Modal Save Button (유일한 이벤트 핸들러)
        const modalSaveBtn = document.getElementById('modalSaveBtn');
        if (modalSaveBtn) {
            modalSaveBtn.addEventListener('click', () => {
                const currentPage = state.currentPage;
                switch(currentPage) {
                    case 'items':
                        if (window.saveItem) {
                            // window.currentEditingItemId를 사용하여 수정/추가 구분
                            const itemId = window.currentEditingItemId || null;
                            saveItem(itemId);
                        }
                        break;
                    case 'partners':
                        // 거래처 수정 모드인지 확인 (모달 버튼 텍스트로 판단)
                        const saveBtn = document.getElementById('modalSaveBtn');
                        if (saveBtn && saveBtn.textContent === '수정') {
                            if (window.updatePartner) updatePartner();
                        } else {
                            if (window.savePartner) savePartner();
                        }
                        break;
                    case 'purchase':
                        if (window.editingPurchaseId) {
                            if (window.updatePurchase) updatePurchase();
                        } else {
                            if (window.savePurchase) savePurchase();
                        }
                        break;
                    case 'sales':
                        if (window.editingSaleId) {
                            if (window.updateSale) updateSale();
                        } else {
                            if (window.saveSales) saveSales();
                        }
                        break;
                    case 'signup':
                        console.log('signup case 실행됨, saveSignup 함수 존재:', !!window.saveSignup);
                        if (window.saveSignup) {
                            console.log('saveSignup 함수 호출 시작');
                            saveSignup();
                        } else {
                            console.error('saveSignup 함수가 정의되지 않았습니다.');
                        }
                        break;
                    case 'adminLogin':
                        console.log('adminLogin case 실행됨');
                        if (window.adminLogin) {
                            console.log('adminLogin 함수 호출 시작');
                            adminLogin();
                        } else {
                            console.error('adminLogin 함수가 정의되지 않았습니다.');
                        }
                        break;
                }
            });
        }

        console.log('모달 이벤트 리스너 등록 완료');

        // 로그아웃 버튼 렌더
        renderLogoutBtn();

        console.log('로그아웃 버튼 렌더링 완료');

        // 초기 페이지 설정 (페이지 로드 시에만)
        if (isLoggedIn()) {
            const businessNumber = getCurrentCompanyBusinessNumber();
            console.log('로그인된 사용자 - 사업자번호:', businessNumber);
            
            if (isAdmin() || businessNumber) {
                // 비동기 데이터 로딩을 기다린 후 페이지 로드
                loadCompanyData(businessNumber).then(() => {
                    console.log('기업 데이터 로드 완료');
                    
                    // 현재 페이지가 설정되지 않은 경우에만 기본 페이지 설정
                    if (!state.currentPage || state.currentPage === 'login') {
                        state.currentPage = 'dashboard';
                        updateActiveNavItem();
                        loadPageContent('dashboard');
                        console.log('대시보드 페이지 로드 완료');
                    } else {
                        // 현재 페이지가 이미 설정되어 있으면 해당 페이지 로드
                        console.log('현재 페이지 로드:', state.currentPage);
                        updateActiveNavItem();
                        loadPageContent(state.currentPage);
                    }
                }).catch(error => {
                    console.error('기업 데이터 로드 실패:', error);
                    // 데이터 로드 실패 시 로그아웃
                    logout();
                });
            } else {
                // 데이터가 없는 경우 로그아웃
                console.log('사업자번호가 없어 로그아웃 처리');
                logout();
            }
        } else {
            // 로그인되지 않은 경우 로그인 페이지로
            console.log('로그인되지 않은 사용자 - 로그인 페이지로 이동');
            if (!state.currentPage || state.currentPage !== 'login') {
                state.currentPage = 'login';
                updateActiveNavItem();
                loadPageContent('login');
            }
        }
        
        console.log('초기 페이지 설정 완료');

        // 각 탭 초기화
        console.log('탭 초기화 시작...');
        initInventoryTab();
        initItemsTab();
        initSalesTab();
        initPurchaseTab();
        initPartnersTab();
        initMonthlyTab();
        initAdmin();
        console.log('탭 초기화 완료');
        
        // 메뉴 가시성 최종 업데이트
        updateMenuVisibility();
        
        // 세션 모니터링 설정 (로그인된 경우에만)
        if (isLoggedIn()) {
            setupInactivityMonitoring();
            resetInactivityTimer();
            console.log('세션 모니터링 설정 완료');
        }
        
        // 로딩 완료
        hideLoading();
        console.log('애플리케이션 초기화 완료');
        
    } catch (error) {
        console.error('애플리케이션 초기화 중 오류 발생:', error);
        hideLoading();
        
        // 오류 메시지 표시
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="alert alert-danger text-center mt-5">
                    <h4><i class='bx bx-error-circle me-2'></i>초기화 오류</h4>
                    <p class="mb-3">애플리케이션 초기화 중 오류가 발생했습니다.</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class='bx bx-refresh me-2'></i>페이지 새로고침
                    </button>
                </div>
            `;
        }
        
        showToast('애플리케이션 초기화 중 오류가 발생했습니다.', 'error');
    }
}); 



 

// 대시보드 렌더링 함수
export function renderDashboardContent() {
    console.log('renderDashboardContent 함수 시작');
    try {
        const container = document.getElementById('dashboard-container');
        if (!container) {
            console.error('dashboard-container 요소를 찾을 수 없습니다.');
            return;
        }
        
        console.log('dashboard-container 요소 찾음, 데이터 계산 시작');
    
    // 관리자와 일반 사용자 모두 일반 대시보드 표시
    const businessNumber = getCurrentCompanyBusinessNumber();
    const companyName = localStorage.getItem('loginCompanyName') || getCompanyNameFromBNo(businessNumber);
    
    // 통계 계산
    const totalItems = state.items.length;
    const totalPartners = state.partners.length;
    const totalPurchases = state.purchases.length;
    const totalSales = state.sales.length;
    
    // 금액 계산
    const totalPurchaseAmount = state.purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalSalesAmount = state.sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const profit = totalSalesAmount - totalPurchaseAmount;
    
    // 거래처명 매핑 함수
    function getPartnerName(businessNumber) {
        if (!businessNumber || !state.partners || !Array.isArray(state.partners)) {
            return '거래처명 없음';
        }
        
        const partner = state.partners.find(p => p && p.businessNumber === businessNumber);
        return partner ? partner.name : '거래처명 없음';
    }
    
    // 최근 거래 계산 (거래처명 매핑 포함)
    const recentPurchases = (state.purchases || []).slice(-5).reverse().map(purchase => {
        if (!purchase || !purchase.partner) {
            console.log('매입 데이터에 partner 정보 없음:', purchase);
            return {
                ...purchase,
                partnerName: '거래처명 없음'
            };
        }
        
        const partnerName = getPartnerName(purchase.partner);
        console.log('매입 거래처 매핑:', { 
            purchasePartner: purchase.partner, 
            foundPartner: partnerName,
            totalPartners: state.partners ? state.partners.length : 0
        });
        
        return {
            ...purchase,
            partnerName: partnerName
        };
    });
    
    const recentSales = (state.sales || []).slice(-5).reverse().map(sale => {
        if (!sale || !sale.partner) {
            console.log('매출 데이터에 partner 정보 없음:', sale);
            return {
                ...sale,
                partnerName: '거래처명 없음'
            };
        }
        
        const partnerName = getPartnerName(sale.partner);
        console.log('매출 거래처 매핑:', { 
            salePartner: sale.partner, 
            foundPartner: partnerName,
            totalPartners: state.partners ? state.partners.length : 0
        });
        
        return {
            ...sale,
            partnerName: partnerName
        };
    });
    
    // 월별 데이터 계산
    const currentYear = new Date().getFullYear();
    const monthlyData = calculateMonthlyData(currentYear);
    
    // 인기 품목 계산
    let popularItems = [];
    try {
        popularItems = calculatePopularItems();
    } catch (error) {
        console.error('인기 품목 계산 중 오류:', error);
        popularItems = [];
    }
    
    const content = `
        <!-- 통합 대시보드 컨테이너 -->
        <div class="dashboard-container mb-4">
            <!-- 헤더 섹션 -->
            <div class="dashboard-header-section">
                <div class="dashboard-header-content">
                    <div class="dashboard-title">
                        <h2>대시보드</h2>
                    </div>
                    <div class="dashboard-date">
                        ${new Date().toLocaleDateString('ko-KR', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            weekday: 'long'
                        })}
                    </div>
                </div>
                <div class="month-selector-container">
                    <button class="btn btn-sm btn-outline-secondary" id="prevMonth">
                        <i class='bx bx-chevron-left'></i>
                    </button>
                    <span class="current-month" id="currentMonth">${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}</span>
                    <button class="btn btn-sm btn-outline-secondary" id="nextMonth">
                        <i class='bx bx-chevron-right'></i>
                    </button>
                </div>
            </div>

            <!-- 요약 카드 섹션 -->
            <div class="summary-cards-section">
                <div class="summary-cards-grid">
                    <div class="summary-card">
                        <div class="summary-card-content">
                            <div class="summary-card-header">
                                <div class="summary-card-title">
                                    <i class='bx bx-cart-add summary-card-icon'></i>
                                    <span>월별 매입 금액</span>
                                </div>
                            </div>
                            <div class="summary-card-value-container">
                                <div class="summary-card-value" id="monthlyPurchaseAmount">
                                    <span class="loading-spinner"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-card-content">
                            <div class="summary-card-header">
                                <div class="summary-card-title">
                                    <i class='bx bx-cart summary-card-icon'></i>
                                    <span>월별 매출 금액</span>
                                </div>
                            </div>
                            <div class="summary-card-value-container">
                                <div class="summary-card-value" id="monthlySalesAmount">
                                    <span class="loading-spinner"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-card-content">
                            <div class="summary-card-header">
                                <div class="summary-card-title">
                                    <i class='bx bx-archive summary-card-icon'></i>
                                    <span>총 재고 금액</span>
                                </div>
                            </div>
                            <div class="summary-card-value-container">
                                <div class="summary-card-value" id="totalInventoryValue">
                                    <span class="loading-spinner"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-card-content">
                            <div class="summary-card-header">
                                <div class="summary-card-title">
                                    <i class='bx bx-trending-up summary-card-icon'></i>
                                    <span>평균 마진율</span>
                                </div>
                            </div>
                            <div class="summary-card-value-container">
                                <div class="summary-card-value" id="averageMarginRate">
                                    <span class="loading-spinner"></span>
                                </div>
                                <div class="summary-card-unit">% (전체 매출 기준)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>



        <!-- 차트 섹션 -->
        <div class="charts-section mb-4">
            <div class="row">
                <div class="col-lg-8">
                    <div class="chart-card">
                        <div class="chart-header">
                            <h5>월별 거래 현황</h5>
                        </div>
                        <div class="chart-body">
                            <canvas id="monthlyChart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="chart-card">
                        <div class="chart-header">
                            <h5>인기 품목 TOP 5</h5>
                        </div>
                        <div class="chart-body">
                            <canvas id="topItemsChart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 최근 거래 섹션 -->
        <div class="recent-transactions-section">
            <div class="row">
                <div class="col-lg-6">
                    <div class="transaction-card">
                        <div class="transaction-header">
                            <h5>최근 매입</h5>
                            <a href="#" onclick="navigateTo('purchase')" class="view-all-link">전체보기</a>
                        </div>
                        <div class="transaction-body">
                            ${recentPurchases.length > 0 ? `
                                <div class="transaction-list">
                                    ${recentPurchases.map(purchase => `
                                        <div class="transaction-item">
                                            <div class="transaction-content">
                                                <div class="transaction-title">${purchase.partnerName || '거래처명 없음'}</div>
                                                <div class="transaction-subtitle">${purchase.date}</div>
                                            </div>
                                            <div class="transaction-amount">
                                                ${formatCurrency(purchase.totalAmount || 0)}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <div class="empty-state">
                                    <p>최근 매입 내역이 없습니다.</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="transaction-card">
                        <div class="transaction-header">
                            <h5>최근 매출</h5>
                            <a href="#" onclick="navigateTo('sales')" class="view-all-link">전체보기</a>
                        </div>
                        <div class="transaction-body">
                            ${recentSales.length > 0 ? `
                                <div class="transaction-list">
                                    ${recentSales.map(sale => `
                                        <div class="transaction-item">
                                            <div class="transaction-content">
                                                <div class="transaction-title">${sale.partnerName || '거래처명 없음'}</div>
                                                <div class="transaction-subtitle">${sale.date}</div>
                                            </div>
                                            <div class="transaction-amount">
                                                ${formatCurrency(sale.totalAmount || 0)}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `
                                <div class="empty-state">
                                    <p>최근 매출 내역이 없습니다.</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    console.log('대시보드 HTML 콘텐츠 생성 완료, 컨테이너에 삽입');
    container.innerHTML = content;
    
    console.log('요약 카드 초기화 시작');
    // 요약 카드 초기화
    const summaryYear = new Date().getFullYear();
    const summaryMonth = new Date().getMonth() + 1;
    updateSummaryCards(summaryYear, summaryMonth);
    updateMonthDisplay(summaryYear, summaryMonth);
    setupMonthSelector();
    console.log('요약 카드 초기화 완료');
    
    console.log('차트 렌더링 시작');
    // 차트 렌더링
    setTimeout(() => {
        try {
            console.log('월별 차트 렌더링 시작');
            renderMonthlyChart(monthlyData);
            console.log('인기 품목 차트 렌더링 시작');
            renderTopItemsChart(popularItems);
            console.log('차트 렌더링 완료');
        } catch (error) {
            console.error('차트 렌더링 중 오류 발생:', error);
        }
    }, 100);
    
    } catch (error) {
        console.error('대시보드 콘텐츠 렌더링 중 오류 발생:', error);
        
        const container = document.getElementById('dashboard-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger text-center mt-4">
                    <h4><i class='bx bx-error-circle me-2'></i>대시보드 로드 오류</h4>
                    <p class="mb-3">대시보드를 불러오는 중 오류가 발생했습니다.</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class='bx bx-refresh me-2'></i>페이지 새로고침
                    </button>
                </div>
            `;
        }
        
        showToast('대시보드 로드 중 오류가 발생했습니다.', 'error');
    }
}

/**
 * 월별 매입 금액 계산
 */
function calculateMonthlyPurchaseAmount(year, month) {
    if (!state.purchases || !Array.isArray(state.purchases)) {
        return 0;
    }
    
    return state.purchases.reduce((total, purchase) => {
        if (!purchase || !purchase.date) return total;
        
        const purchaseDate = new Date(purchase.date);
        if (purchaseDate.getFullYear() === year && purchaseDate.getMonth() === month - 1) {
            return total + (purchase.totalAmount || 0);
        }
        return total;
    }, 0);
}

/**
 * 월별 매출 금액 계산
 */
function calculateMonthlySalesAmount(year, month) {
    if (!state.sales || !Array.isArray(state.sales)) {
        return 0;
    }
    
    return state.sales.reduce((total, sale) => {
        if (!sale || !sale.date) return total;
        
        const saleDate = new Date(sale.date);
        if (saleDate.getFullYear() === year && saleDate.getMonth() === month - 1) {
            return total + (sale.totalAmount || 0);
        }
        return total;
    }, 0);
}

/**
 * 총 재고 금액 계산 (활성 품목 기준, 평균 매입단가 사용)
 */
function calculateTotalInventoryValue() {
    if (!state.items || !Array.isArray(state.items)) {
        return 0;
    }
    
    // 활성 품목만 필터링
    const activeItems = state.items.filter(item => item && item.active === 'Y');
    
    return activeItems.reduce((total, item) => {
        if (!item) return total;
        
        // 현재 재고 수량 계산 (매입 - 매출)
        const totalPurchased = (state.purchases || []).reduce((sum, purchase) => {
            if (purchase && purchase.item === item.code) {
                return sum + (Number(purchase.quantity) || 0);
            }
            return sum;
        }, 0);
        
        const totalSold = (state.sales || []).reduce((sum, sale) => {
            if (sale && sale.item === item.code) {
                return sum + (Number(sale.quantity) || 0);
            }
            return sum;
        }, 0);
        
        const currentStock = Math.max(0, totalPurchased - totalSold);
        
        // 평균 매입단가 계산
        const totalPurchasedAmount = (state.purchases || []).reduce((sum, purchase) => {
            if (purchase && purchase.item === item.code) {
                const quantity = Number(purchase.quantity) || 0;
                const price = Number(purchase.price) || 0;
                return sum + (quantity * price);
            }
            return sum;
        }, 0);
        
        const avgPurchasePrice = totalPurchased > 0 ? totalPurchasedAmount / totalPurchased : 0;
        
        // 품목별 재고 금액 = 현재재고 × 평균 매입단가
        const itemInventoryValue = currentStock * avgPurchasePrice;
        
        return total + itemInventoryValue;
    }, 0);
}

/**
 * 재고 회전율 계산 (단순화된 공식)
 * 재고회전율 = 총매입수량 / 총매출수량
 */
function calculateInventoryTurnoverRate() {
    console.log('재고회전율 계산 시작');
    console.log('데이터 상태:', {
        salesCount: state.sales ? state.sales.length : 0,
        purchasesCount: state.purchases ? state.purchases.length : 0,
        itemsCount: state.items ? state.items.length : 0
    });
    
    if (!state.sales || !Array.isArray(state.sales) || !state.items || !Array.isArray(state.items) || !state.purchases || !Array.isArray(state.purchases)) {
        console.log('필수 데이터가 없어서 0 반환');
        return 0;
    }
    
    // 전체 매입수량과 매출수량 계산
    const totalPurchasedQuantity = (state.purchases || []).reduce((sum, purchase) => {
        return sum + (Number(purchase.quantity) || 0);
    }, 0);
    
    const totalSoldQuantity = (state.sales || []).reduce((sum, sale) => {
        return sum + (Number(sale.quantity) || 0);
    }, 0);
    
    console.log('재고회전율 계산 결과:', {
        totalPurchasedQuantity,
        totalSoldQuantity
    });
    
    if (totalSoldQuantity === 0) {
        console.log('총매출수량이 0이므로 회전율 계산 불가');
        return 0;
    }
    
    // 재고회전율 = 총매입수량 / 총매출수량
    const turnoverRate = totalPurchasedQuantity / totalSoldQuantity;
    
    console.log('최종 재고회전율:', turnoverRate);
    
    return turnoverRate;
}

/**
 * 요약 카드 데이터 업데이트
 */
function updateSummaryCards(year, month) {
    console.log('요약 카드 업데이트 시작:', year, month);
    
    // 월별 매입 금액
    const monthlyPurchaseAmount = calculateMonthlyPurchaseAmount(year, month);
    const purchaseElement = document.getElementById('monthlyPurchaseAmount');
    if (purchaseElement) {
        const amount = typeof monthlyPurchaseAmount === 'number' ? monthlyPurchaseAmount : 0;
        purchaseElement.innerHTML = formatCurrency(amount);
    }
    
    // 월별 매출 금액
    const monthlySalesAmount = calculateMonthlySalesAmount(year, month);
    const salesElement = document.getElementById('monthlySalesAmount');
    if (salesElement) {
        const amount = typeof monthlySalesAmount === 'number' ? monthlySalesAmount : 0;
        salesElement.innerHTML = formatCurrency(amount);
    }
    
    // 총 재고 금액
    const totalInventoryValue = calculateTotalInventoryValue();
    const inventoryElement = document.getElementById('totalInventoryValue');
    if (inventoryElement) {
        const amount = typeof totalInventoryValue === 'number' ? totalInventoryValue : 0;
        inventoryElement.innerHTML = formatCurrency(amount);
    }
    
    // 재고 회전율
    const turnoverRate = calculateInventoryTurnoverRate();
    const turnoverElement = document.getElementById('inventoryTurnoverRate');
    if (turnoverElement) {
        if (typeof turnoverRate === 'number' && !isNaN(turnoverRate)) {
            turnoverElement.innerHTML = turnoverRate.toFixed(1) + '회';
        } else {
            turnoverElement.innerHTML = '0.0회';
        }
    }
    
    // 평균 마진율
    const averageMarginRate = calculateAverageMarginRate();
    const averageMarginElement = document.getElementById('averageMarginRate');
    if (averageMarginElement) {
        if (typeof averageMarginRate === 'number' && !isNaN(averageMarginRate)) {
            averageMarginElement.innerHTML = averageMarginRate.toFixed(1) + '%';
        } else {
            averageMarginElement.innerHTML = '0.0%';
        }
    }
    
    console.log('요약 카드 업데이트 완료');
}

/**
 * 월 선택 이벤트 핸들러 - 통합된 월 선택
 */
function setupMonthSelector() {
    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth() + 1;
    
    // 공통 월 변경 함수
    function changeMonth(direction) {
        if (direction === 'prev') {
            currentMonth--;
            if (currentMonth < 1) {
                currentMonth = 12;
                currentYear--;
            }
        } else if (direction === 'next') {
            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
        }
        
        // 월 표시 업데이트
        updateMonthDisplay(currentYear, currentMonth);
        // 요약 카드 업데이트
        updateSummaryCards(currentYear, currentMonth);
    }
    
    // 통합된 월 선택기
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    
    if (prevMonthBtn && nextMonthBtn) {
        prevMonthBtn.addEventListener('click', () => changeMonth('prev'));
        nextMonthBtn.addEventListener('click', () => changeMonth('next'));
    }
}

/**
 * 월 표시 업데이트
 */
function updateMonthDisplay(year, month) {
    const currentMonthSpan = document.getElementById('currentMonth');
    if (currentMonthSpan) {
        currentMonthSpan.textContent = `${year}/${String(month).padStart(2, '0')}`;
    }
}

// 월별 데이터 계산
export function calculateMonthlyData(year) {
    const monthlyData = Array(12).fill(0).map(() => ({ purchases: 0, sales: 0 }));
    
    state.purchases.forEach(purchase => {
        const purchaseYear = new Date(purchase.date).getFullYear();
        if (purchaseYear === year) {
            const month = new Date(purchase.date).getMonth();
            monthlyData[month].purchases += purchase.totalAmount || 0;
        }
    });
    
    state.sales.forEach(sale => {
        const saleYear = new Date(sale.date).getFullYear();
        if (saleYear === year) {
            const month = new Date(sale.date).getMonth();
            monthlyData[month].sales += sale.totalAmount || 0;
        }
    });
    
    return monthlyData;
}

// 인기 품목 계산
export function calculatePopularItems() {
    const itemCounts = {};
    
    // 매입에서 품목별 수량 집계
    if (state.purchases && Array.isArray(state.purchases)) {
        state.purchases.forEach(purchase => {
            if (purchase.item && purchase.quantity) {
                // 품목 코드로 품목명 찾기
                const itemObj = state.items.find(i => i.code === purchase.item);
                const itemName = itemObj ? itemObj.name : purchase.item;
                
                if (!itemCounts[itemName]) {
                    itemCounts[itemName] = 0;
                }
                itemCounts[itemName] += purchase.quantity || 0;
            }
        });
    }
    
    // 매출에서 품목별 수량 집계
    if (state.sales && Array.isArray(state.sales)) {
        state.sales.forEach(sale => {
            if (sale.item && sale.quantity) {
                // 품목 코드로 품목명 찾기
                const itemObj = state.items.find(i => i.code === sale.item);
                const itemName = itemObj ? itemObj.name : sale.item;
                
                if (!itemCounts[itemName]) {
                    itemCounts[itemName] = 0;
                }
                itemCounts[itemName] += sale.quantity || 0;
            }
        });
    }
    
    // 상위 5개 품목 반환
    return Object.entries(itemCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
}

// 월별 차트 렌더링
export function renderMonthlyChart(monthlyData) {
    const ctx = document.getElementById('monthlyChart');
    if (!ctx) return;
    
    const labels = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    const purchaseData = monthlyData.map(d => d.purchases);
    const salesData = monthlyData.map(d => d.sales);
    
    if (window.dashboardMonthlyChartObj) {
        window.dashboardMonthlyChartObj.destroy();
    }
    
    window.dashboardMonthlyChartObj = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '매입',
                    data: purchaseData,
                    borderColor: '#21A366',
                    backgroundColor: 'rgba(33, 163, 102, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#21A366',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: '매출',
                    data: salesData,
                    borderColor: '#FF6B6B', // 연한 빨간색
                    backgroundColor: 'rgba(255, 107, 107, 0.1)', // Transparent 연한 빨간색
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#FF6B6B', // 연한 빨간색
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11,
                            weight: '500'
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            size: 11,
                            weight: '500'
                        },
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                point: {
                    hoverBackgroundColor: '#fff',
                    hoverBorderColor: '#4facfe',
                    hoverBorderWidth: 3
                }
            }
        }
    });
}

// 인기 품목 차트 렌더링
export function renderTopItemsChart(popularItems) {
    const ctx = document.getElementById('topItemsChart');
    if (!ctx) return;
    
    // popularItems가 유효하지 않은 경우 처리
    if (!popularItems || !Array.isArray(popularItems)) {
        console.warn('popularItems가 유효하지 않습니다:', popularItems);
        popularItems = [];
    }
    
    if (window.dashboardTopItemsChartObj) {
        window.dashboardTopItemsChartObj.destroy();
    }
    
    if (popularItems.length === 0) {
        ctx.style.display = 'none';
        return;
    }
    
    ctx.style.display = 'block';
    
    const labels = popularItems.map(item => item.name);
    const data = popularItems.map(item => item.count);
    
    // 그라데이션 색상 배열
    const gradients = [
        'linear-gradient(135deg, #667eea, #764ba2)',
        'linear-gradient(135deg, #f093fb, #f5576c)',
        'linear-gradient(135deg, #4facfe, #00f2fe)',
        'linear-gradient(135deg, #43e97b, #38f9d7)',
        'linear-gradient(135deg, #fa709a, #fee140)'
    ];
    
    window.dashboardTopItemsChartObj = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#667eea',
                    '#f093fb',
                    '#4facfe',
                    '#43e97b',
                    '#fa709a'
                ],
                borderColor: '#fff',
                borderWidth: 3,
                hoverBorderWidth: 4,
                hoverBackgroundColor: [
                    '#5a6fd8',
                    '#e085e8',
                    '#4595e8',
                    '#3dd86a',
                    '#e85f8a'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 11,
                            weight: '500'
                        },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const dataset = data.datasets[0];
                                    const value = dataset.data[i];
                                    const total = dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    
                                    return {
                                        text: `${label} (${percentage}%)`,
                                        fillStyle: dataset.backgroundColor[i],
                                        strokeStyle: dataset.borderColor,
                                        lineWidth: dataset.borderWidth,
                                        pointStyle: 'circle',
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${context.parsed.toLocaleString()}개 (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '60%',
            radius: '90%'
        }
    });
} 

// 관리자 관련 함수들
export function getPendingUsers() {
    return JSON.parse(localStorage.getItem('pendingUsers')) || [];
}

export function savePendingUsers(users) {
    localStorage.setItem('pendingUsers', JSON.stringify(users));
}

export function getApprovedUsers() {
    return JSON.parse(localStorage.getItem('approvedUsers')) || [];
}

export function saveApprovedUsers(users) {
    localStorage.setItem('approvedUsers', JSON.stringify(users));
}

export function getCompanyNameFromBNo(businessNumber) {
    if (!businessNumber) return '';
    const approvedUsers = getApprovedUsers();
    const user = approvedUsers.find(u => u.businessNumber === businessNumber);
    return user ? user.companyName : '';
}

export function showAdminLoginModal() {
    const content = `
        <form id="adminLoginForm">
            <div class="mb-3">
                <label class="form-label">관리자 ID</label>
                <input type="text" class="form-control" name="adminId" required>
            </div>
            <div class="mb-3">
                <label class="form-label">비밀번호</label>
                <input type="password" class="form-control" name="adminPassword" required>
            </div>
        </form>
    `;
    
    showModal('관리자 로그인', content);
    
    // 모달 버튼 텍스트 변경
    const saveBtn = document.getElementById('modalSaveBtn');
    if (saveBtn) {
        saveBtn.textContent = '로그인';
    }
    
    // 전역 함수로 설정
    window.adminLogin = () => handleAdminLogin();
}

export function handleAdminLogin() {
    const form = document.getElementById('adminLoginForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const adminId = formData.get('adminId');
    const adminPassword = formData.get('adminPassword');
    
    // 간단한 관리자 인증 (실제로는 더 안전한 방식 사용)
    if (adminId === 'admin' && adminPassword === 'admin123') {
        // sessionStorage 사용으로 변경
        sessionStorage.setItem('isAdmin', 'true');
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('loginUserId', 'admin');
        
        showToast('관리자로 로그인되었습니다.');
        
        // 모달 닫기
        const modal = bootstrap.Modal.getInstance(document.getElementById('commonModal'));
        if (modal) modal.hide();
        
        // 로그인 성공 후 대시보드로 이동
        setTimeout(() => {
            state.currentPage = 'dashboard';
            navigateTo('dashboard');
            updateActiveNavItem();
            updateMenuVisibility();
            loadPageContent('dashboard');
        }, 500);
    } else {
        alert('관리자 ID 또는 비밀번호가 올바르지 않습니다.');
    }
}

export function showSignupModal() {
    // 현재 페이지를 signup으로 설정
    state.currentPage = 'signup';
    
    const content = `
        <form id="signupForm" onsubmit="event.preventDefault();">
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">회사명 <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" name="companyName" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">사업자등록번호 <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" name="businessNumber" required 
                            placeholder="" maxlength="12">
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">비밀번호 <span class="text-danger">*</span></label>
                        <input type="password" class="form-control" name="password" required autocomplete="new-password">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">비밀번호 확인 <span class="text-danger">*</span></label>
                        <input type="password" class="form-control" name="confirmPassword" required autocomplete="new-password">
                    </div>
                </div>
            </div>
            <div class="mb-3">
                <label class="form-label">대표자명</label>
                <input type="text" class="form-control" name="representativeName">
            </div>
            <div class="mb-3">
                <label class="form-label">연락처</label>
                <input type="tel" class="form-control" name="phone" placeholder="010-0000-0000">
            </div>
            <div class="mb-3">
                <label class="form-label">이메일</label>
                <input type="email" class="form-control" name="email">
            </div>
            <div class="mb-3">
                <label class="form-label">주소</label>
                <input type="text" class="form-control" name="address">
            </div>
        </form>
    `;
    
    showModal('회원가입', content);
    
    // 모달 버튼 텍스트 변경
    const saveBtn = document.getElementById('modalSaveBtn');
    if (saveBtn) {
        saveBtn.textContent = '가입신청';
    }
    
    // 전역 함수로 설정
    window.saveSignup = async () => {
        console.log('saveSignup 함수 호출됨');
        await handleSignup();
    };
    
    // 사업자등록번호 자동 하이픈 추가 (개선된 버전)
    setTimeout(() => {
        const businessNumberInput = document.querySelector('input[name="businessNumber"]');
        if (businessNumberInput) {
            setupBusinessNumberAutoHyphen(businessNumberInput);
        } else {
            console.error('회원가입 모달 사업자등록번호 입력 필드를 찾을 수 없습니다.');
        }
    }, 100); // 100ms 후에 실행하여 DOM 렌더링 완료 보장
}

export async function handleSignup() {
    console.log('handleSignup 함수 호출됨');
    
    const form = document.getElementById('signupForm');
    if (!form) {
        console.error('signupForm을 찾을 수 없습니다.');
        return;
    }
    
    const formData = new FormData(form);
    const userData = {
        companyName: formData.get('companyName'),
        businessNumber: formData.get('businessNumber'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword'),
        representativeName: formData.get('representativeName'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        address: formData.get('address'),
        signupDate: new Date().toISOString()
    };
    
    // 필수 필드 검증
    if (!userData.companyName || !userData.businessNumber || !userData.password) {
        alert('회사명, 사업자등록번호, 비밀번호는 필수입니다.');
        return;
    }
    
    // 사업자등록번호 형식 검증
    const businessNumberPattern = /^[0-9]{3}-[0-9]{2}-[0-9]{5}$/;
    if (!businessNumberPattern.test(userData.businessNumber)) {
        alert('사업자등록번호 형식이 올바르지 않습니다. (예: 000-00-00000)');
        return;
    }
    
    // 비밀번호 확인
    if (userData.password !== userData.confirmPassword) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }
    
    try {
        console.log('Firebase 연결 상태 확인:', {
            firestore: !!window.firestore,
            firestoreType: typeof window.firestore,
            db: !!window.db
        });
        
        // Firestore에 저장 (있는 경우)
        if (window.firestore && typeof window.firestore === 'object') {
            console.log('Firestore를 사용하여 가입신청 처리 시작');
            
            // 새로운 Firestore 구조로 저장
            const { savePendingUser } = await import('./firestore-helper.js');
            
            // 추가 데이터 준비 (비밀번호 제외)
            const { password, confirmPassword, ...additionalData } = userData;
            
            console.log('Firestore에 저장할 데이터:', {
                businessNumber: userData.businessNumber,
                additionalData: additionalData
            });
            
            await savePendingUser(userData.businessNumber, userData.password, additionalData);
            
            showToast('가입신청이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.');
            
            // 모달 닫기
            const modal = bootstrap.Modal.getInstance(document.getElementById('commonModal'));
            if (modal) modal.hide();
        } else {
            console.log('로컬 스토리지를 사용하여 가입신청 처리');
            
            // 로컬 스토리지에 저장
            const pendingUsers = getPendingUsers();
            const approvedUsers = getApprovedUsers();
            
            const isDuplicate = [...pendingUsers, ...approvedUsers].some(user => 
                user.businessNumber === userData.businessNumber
            );
            
            if (isDuplicate) {
                alert('이미 가입된 사업자등록번호입니다.');
                return;
            }
            
            pendingUsers.push(userData);
            savePendingUsers(pendingUsers);
            
            showToast('가입신청이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.');
            
            // 모달 닫기
            const modal = bootstrap.Modal.getInstance(document.getElementById('commonModal'));
            if (modal) modal.hide();
        }
    } catch (error) {
        console.error('가입신청 처리 오류:', error);
        alert(`가입신청 중 오류가 발생했습니다: ${error.message}`);
    }
} 

// 전역 함수들 (모듈 간 호환성을 위해)
window.showItemModal = showItemModal;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.saveItem = saveItem;
window.filterItems = filterItems;
window.exportItems = exportItems;
window.importItems = importItems;
window.downloadItemTemplate = downloadItemTemplate;
window.showItemBulkUploadModal = showItemBulkUploadModal;
window.handleItemBulkUpload = handleItemBulkUpload;
window.confirmItemBulkUpload = confirmItemBulkUpload;
window.cancelItemBulkUpload = cancelItemBulkUpload;
window.showSignupModal = showSignupModal;
window.showAdminLoginModal = showAdminLoginModal;
window.logout = logout;
window.navigateTo = navigateTo;

// 페이지 제목 업데이트
export function updatePageTitle() {
    const businessNumber = getCurrentCompanyBusinessNumber();
    const companyName = sessionStorage.getItem('loginCompanyName') || getCompanyNameFromBNo(businessNumber);
    
    if (isAdmin()) {
        document.title = companyName ? `${companyName} - 재고관리 시스템` : '재고관리 시스템 (관리자)';
    } else {
        document.title = companyName ? `${companyName} - 재고관리 시스템` : '재고관리 시스템';
    }
} 

// 차트 새로고침 함수
export function refreshMonthlyChart() {
    const currentYear = new Date().getFullYear();
    const monthlyData = calculateMonthlyData(currentYear);
    renderMonthlyChart(monthlyData);
    showToast('차트가 새로고침되었습니다.');
}

// 업체 선택 함수
async function selectCompany(businessNumber) {
    try {
        sessionStorage.setItem('adminViewingBusinessNumber', businessNumber);
        
        // 선택된 업체의 데이터 로드
        await loadCompanyData(businessNumber);
        
        showToast(`${businessNumber} 업체를 선택했습니다.`);
        
        // 대시보드 새로고침
        renderDashboardContent();
        
    } catch (error) {
        console.error('업체 선택 오류:', error);
        showToast('업체 선택 중 오류가 발생했습니다.', 'error');
    }
}

// 업체 보기 함수
async function viewCompany(businessNumber) {
    try {
        sessionStorage.setItem('adminViewingBusinessNumber', businessNumber);
        
        // 선택된 업체의 데이터 로드
        await loadCompanyData(businessNumber);
        
        // 대시보드로 이동
        navigateTo('dashboard');
        
    } catch (error) {
        console.error('업체 보기 오류:', error);
        showToast('업체 정보 로드 중 오류가 발생했습니다.', 'error');
    }
}

// 승인된 업체 목록 가져오기
async function getApprovedCompanies() {
    try {
        if (window.firebase && window.firebase.firestore) {
            const db = window.firebase.firestore();
            const companiesSnapshot = await db.collection('companies').get();
            
            const companies = [];
            companiesSnapshot.forEach(doc => {
                companies.push({
                    businessNumber: doc.id,
                    companyName: doc.data().companyName || '업체명 없음',
                    ...doc.data()
                });
            });
            
            return companies;
        }
        return [];
    } catch (error) {
        console.error('승인된 업체 목록 가져오기 오류:', error);
        return [];
    }
}

// 가입신청 관리 함수
function showPendingUsers() {
    showToast('가입신청 관리 기능은 준비 중입니다.');
}

// 시스템 통계 함수
function showSystemStats() {
    showToast('시스템 통계 기능은 준비 중입니다.');
}

// 전역 함수로 등록
window.refreshMonthlyChart = refreshMonthlyChart; 

// 사업자등록번호 자동 하이픈 기능 설정 함수
function setupBusinessNumberAutoHyphen(inputElement) {
    if (!inputElement) return;
    
    console.log('사업자등록번호 자동 하이픈 기능 설정:', inputElement.id || inputElement.name);
    
    // 기존 이벤트 리스너 제거 (중복 방지)
    const newInput = inputElement.cloneNode(false);
    inputElement.parentNode.replaceChild(newInput, inputElement);
    
    // 속성 복사
    newInput.type = inputElement.type;
    newInput.name = inputElement.name;
    newInput.id = inputElement.id;
    newInput.className = inputElement.className;
    newInput.required = inputElement.required;
    newInput.maxLength = inputElement.maxLength;
    newInput.placeholder = '';
    
    // 포커스 시 전체 선택
    newInput.addEventListener('focus', function(e) {
        e.target.select();
    });
    
    // 자동 하이픈 추가 기능 및 실시간 유효성 검사
    newInput.addEventListener('input', function(e) {
        const input = e.target;
        let value = input.value.replace(/[^\d]/g, "");
        let formattedValue = "";

        if (value.length > 10) {
            value = value.substring(0, 10);
        }
        if (value.length > 5) {
            formattedValue = `${value.substring(0, 3)}-${value.substring(3, 5)}-${value.substring(5)}`;
        } else if (value.length > 3) {
            formattedValue = `${value.substring(0, 3)}-${value.substring(3, 5)}`;
        } else {
            formattedValue = value;
        }
        input.value = formattedValue;
        
        const isValid = /^[0-9]{3}-[0-9]{2}-[0-9]{5}$/.test(formattedValue);
        if (formattedValue.length > 0) {
            if (isValid) {
                input.classList.remove('is-invalid');
                input.classList.add('is-valid');
            } else {
                input.classList.remove('is-valid');
                input.classList.add('is-invalid');
            }
        } else {
            input.classList.remove('is-valid', 'is-invalid');
        }
    });
    
    // 키보드 이벤트 처리 (숫자만 허용)
    newInput.addEventListener('keydown', function(e) {
        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        const isNumber = /^[0-9]$/.test(e.key);
        const isAllowedKey = allowedKeys.includes(e.key);
        if (!isNumber && !isAllowedKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
        }
    });
    
    // 붙여넣기 이벤트 처리
    newInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const numbersOnly = pastedText.replace(/[^\d]/g, "");
        
        let formattedValue = "";
        if (numbersOnly.length > 10) {
            const value = numbersOnly.substring(0, 10);
            formattedValue = `${value.substring(0, 3)}-${value.substring(3, 5)}-${value.substring(5)}`;
        } else if (numbersOnly.length > 5) {
            formattedValue = `${numbersOnly.substring(0, 3)}-${numbersOnly.substring(3, 5)}-${numbersOnly.substring(5)}`;
        } else if (numbersOnly.length > 3) {
            formattedValue = `${numbersOnly.substring(0, 3)}-${numbersOnly.substring(3, 5)}`;
        } else {
            formattedValue = numbersOnly;
        }
        
        e.target.value = formattedValue;
    });
    
    console.log('사업자등록번호 자동 하이픈 기능 설정 완료');
    return newInput;
}

// DOM 변경 감지하여 사업자등록번호 입력 필드 자동 설정
function setupBusinessNumberObserver() {
    // MutationObserver로 DOM 변경 감지
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 로그인 페이지 사업자등록번호 입력 필드
                        const loginInput = node.querySelector('#businessNumberInput');
                        if (loginInput) {
                            setupBusinessNumberAutoHyphen(loginInput);
                        }
                        
                        // 회원가입 모달 사업자등록번호 입력 필드
                        const signupInput = node.querySelector('input[name="businessNumber"]');
                        if (signupInput && !signupInput.id) {
                            setupBusinessNumberAutoHyphen(signupInput);
                        }
                    }
                });
            }
        });
    });
    
    // 전체 문서 감시
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('사업자등록번호 입력 필드 감시 시작');
}

/**
 * 평균 마진율 계산 (재고현황 탭의 각 품목별 마진율 평균)
 */
function calculateAverageMarginRate() {
    console.log('평균 마진율 계산 시작');
    
    if (!state.sales || !Array.isArray(state.sales) || !state.items || !Array.isArray(state.items) || !state.purchases || !Array.isArray(state.purchases)) {
        console.log('필수 데이터가 없어서 0 반환');
        return 0;
    }
    
    // 재고현황과 동일한 방식으로 각 품목별 마진율 계산
    const inventoryData = new Map();
    
    // 매입 데이터 집계
    (state.purchases || []).forEach(purchase => {
        if (!purchase.item) return;
        
        if (!inventoryData.has(purchase.item)) {
            inventoryData.set(purchase.item, {
                itemCode: purchase.item,
                totalPurchasedQuantity: 0,
                totalPurchasedAmount: 0,
                totalSoldQuantity: 0,
                totalSalesAmount: 0
            });
        }
        
        const data = inventoryData.get(purchase.item);
        const quantity = Number(purchase.quantity) || 0;
        const price = Number(purchase.price) || 0;
        
        data.totalPurchasedQuantity += quantity;
        data.totalPurchasedAmount += quantity * price;
    });
    
    // 매출 데이터 집계
    (state.sales || []).forEach(sale => {
        if (!sale.item) return;
        
        if (!inventoryData.has(sale.item)) {
            inventoryData.set(sale.item, {
                itemCode: sale.item,
                totalPurchasedQuantity: 0,
                totalPurchasedAmount: 0,
                totalSoldQuantity: 0,
                totalSalesAmount: 0
            });
        }
        
        const data = inventoryData.get(sale.item);
        const quantity = Number(sale.quantity) || 0;
        const price = Number(sale.price) || 0;
        
        data.totalSoldQuantity += quantity;
        data.totalSalesAmount += quantity * price;
    });
    
    // 각 품목별 마진율 계산
    let totalMarginRate = 0;
    let validItemCount = 0;
    
    inventoryData.forEach(data => {
        if (data.totalSoldQuantity > 0 && data.totalSalesAmount > 0) {
            const avgPurchasePrice = data.totalPurchasedQuantity > 0 ? 
                data.totalPurchasedAmount / data.totalPurchasedQuantity : 0;
            
            if (avgPurchasePrice > 0) {
                const unitProfit = (data.totalSalesAmount / data.totalSoldQuantity) - avgPurchasePrice;
                const marginRate = data.totalSalesAmount > 0 ? (unitProfit * data.totalSoldQuantity / data.totalSalesAmount) * 100 : 0;
                
                totalMarginRate += marginRate;
                validItemCount++;
                
                console.log(`품목 ${data.itemCode} 마진율 계산:`, {
                    avgPurchasePrice,
                    avgSalesPrice: data.totalSalesAmount / data.totalSoldQuantity,
                    unitProfit,
                    marginRate
                });
            }
        }
    });
    
    const averageMarginRate = validItemCount > 0 ? totalMarginRate / validItemCount : 0;
    
    console.log('평균 마진율 계산 결과:', {
        totalMarginRate,
        validItemCount,
        averageMarginRate
    });
    
    return averageMarginRate;
}

