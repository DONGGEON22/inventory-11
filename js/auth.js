// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQZ1xYkrkpyDHeuLxNIR-zZTG2FRLgDq0",
  authDomain: "inventory-596a8.firebaseapp.com",
  projectId: "inventory-596a8",
  storageBucket: "inventory-596a8.firebasestorage.app",
  messagingSenderId: "772769961896",
  appId: "1:772769961896:web:70dc22f74fd61a4187af9d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 클라이언트 ID 관리
function getClientId() {
    // URL 파라미터에서 clientId 확인
    const urlParams = new URLSearchParams(window.location.search);
    let clientId = urlParams.get('clientId');
    
    // URL에 없으면 localStorage에서 확인
    if (!clientId) {
        clientId = localStorage.getItem('clientId');
    }
    
    // 둘 다 없으면 새로 생성
    if (!clientId) {
        clientId = 'client_' + Date.now();
        localStorage.setItem('clientId', clientId);
    }
    
    return clientId;
}

export { db, getClientId };

// Authentication and User Management
// ======================================

// User Management Functions
function getPendingUsers() {
    return JSON.parse(localStorage.getItem('pendingUsers')) || [];
}

function savePendingUsers(users) {
    localStorage.setItem('pendingUsers', JSON.stringify(users));
}

function getApprovedUsers() {
    return JSON.parse(localStorage.getItem('approvedUsers')) || [];
}

function saveApprovedUsers(users) {
    localStorage.setItem('approvedUsers', JSON.stringify(users));
}

function isAdmin() {
    return localStorage.getItem('isAdmin') === 'true';
}

function isLoggedIn() {
    const loggedInUser = localStorage.getItem('loggedInUser');
    return loggedInUser !== null && localStorage.getItem('isLoggedIn') === 'true';
}

// Login Data Management
function clearLoginData() {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loginUserId');
    localStorage.removeItem('loginBusinessNumber');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminViewingBusinessNumber');
    localStorage.removeItem('userRole');
    
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

// Admin Functions
function showAdminLoginModal() {
    const adminLoginContent = `
        <form id="adminLoginForm">
            <div class="mb-4">
                <label for="adminId" class="form-label">관리자 아이디</label>
                <input type="text" id="adminId" name="adminId" class="form-control form-control-lg" placeholder="아이디" autocomplete="username" required value="admin">
            </div>
            <div class="mb-4">
                <label for="adminPassword" class="form-label">비밀번호</label>
                <input type="password" id="adminPassword" name="adminPassword" class="form-control form-control-lg" placeholder="비밀번호" autocomplete="current-password" required>
            </div>
        </form>
    `;
    const footer = `<button type="button" class="btn btn-primary btn-lg w-100" onclick="adminLogin()">로그인</button>`;
    showModal('관리자 로그인', adminLoginContent, footer, { modalSize: 'modal-lg' });
    setTimeout(() => { document.getElementById('adminPassword').focus(); }, 100);
}

function adminLogin() {
    const form = document.getElementById('adminLoginForm');
    if (!form) {
        return;
    }
    const formData = new FormData(form);
    const adminId = formData.get('adminId');
    const adminPassword = formData.get('adminPassword');
    
    if (adminId === 'wapeople' && adminPassword === 'rudckfcjd1!') {
        showLoading('관리자 로그인 중...');
        
        clearLoginData();
        
        // 관리자 로그인 정보 저장
        const loginInfo = {
            userId: 'admin',
            role: 'admin',
            loginTime: new Date().toISOString()
        };
        localStorage.setItem('loggedInUser', JSON.stringify(loginInfo));
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('loginUserId', 'admin');
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'admin');
        localStorage.removeItem('adminViewingBusinessNumber');

        closeModal();
        
        showLoading('관리자 패널로 이동 중...');
        
        setTimeout(() => {
            hideLoading();
            showToast('관리자로 로그인되었습니다.');
            
            // 사이드바 초기화 및 관리자 메뉴 표시
            initializeSidebar();
            
            state.currentPage = 'admin-panel';
            loadPageContent('admin-panel');
            renderLogoutBtn();
        }, 1000);
    } else {
        showToast('관리자 아이디 또는 비밀번호가 올바르지 않습니다.', 'danger');
    }
}

function showAdminPanel() {
    const pendingUsers = getPendingUsers();
    const approvedUsers = getApprovedUsers();
    
    const content = `
        <div class="admin-panel-container">
            <!-- 통계 요약 -->
            <div class="row mb-4">
                <div class="col-md-6 mb-3 mb-md-0">
                    <div class="card border-warning h-100">
                        <div class="card-header bg-warning text-dark">
                            <h6 class="mb-0"><i class='bx bx-time'></i> 승인 대기 중</h6>
                        </div>
                        <div class="card-body text-center d-flex flex-column justify-content-center align-items-center">
                            <div class="display-4 text-warning">${pendingUsers.length}</div>
                            <div class="text-muted">명의 사용자가 승인을 기다리고 있습니다</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card border-success h-100">
                        <div class="card-header bg-success text-white">
                            <h6 class="mb-0"><i class='bx bx-check-circle'></i> 승인된 사용자</h6>
                        </div>
                        <div class="card-body text-center d-flex flex-column justify-content-center align-items-center">
                            <div class="display-4 text-success">${approvedUsers.length}</div>
                            <div class="text-muted">명의 사용자가 승인되었습니다</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 사용자 관리 테이블 -->
            <div class="row">
                <div class="col-md-6 mb-3 mb-md-0">
                    <div class="card">
                        <div class="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
                            <h6 class="mb-0"><i class='bx bx-time'></i> 승인 대기 중인 사용자</h6>
                            <span class="badge bg-dark">${pendingUsers.length}명</span>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                                <table class="table table-hover mb-0">
                                    <thead class="table-light sticky-top">
                                        <tr>
                                            <th>사업자번호</th>
                                            <th>기업명</th>
                                            <th>아이디</th>
                                            <th>신청일</th>
                                            <th>관리</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${pendingUsers.length === 0 ? `
                                            <tr>
                                                <td colspan="5" class="text-center text-muted py-5">
                                                    <i class='bx bx-info-circle' style="font-size: 2rem; margin-bottom: 0.5rem;"></i><br>
                                                    승인 대기 중인 사용자가 없습니다
                                                </td>
                                            </tr>
                                        ` : pendingUsers.map(user => `
                                            <tr>
                                                <td><span class="badge bg-secondary">${user.businessNumber}</span></td>
                                                <td><strong>${user.companyName}</strong></td>
                                                <td><code>${user.userId}</code></td>
                                                <td><small>${new Date(user.createdAt).toLocaleDateString()}</small></td>
                                                <td>
                                                    <div class="btn-group btn-group-sm" role="group">
                                                        <button class="btn btn-success" onclick="approveUser('${user.businessNumber}', '${user.userId}')" title="승인">
                                                            <i class='bx bx-check'></i>
                                                        </button>
                                                        <button class="btn btn-danger" onclick="rejectUser('${user.businessNumber}', '${user.userId}')" title="거절">
                                                            <i class='bx bx-x'></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                            <h6 class="mb-0"><i class='bx bx-check-circle'></i> 승인된 사용자</h6>
                            <span class="badge bg-light text-dark">${approvedUsers.length}명</span>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                                <table class="table table-hover mb-0">
                                    <thead class="table-light sticky-top">
                                        <tr>
                                            <th>사업자번호</th>
                                            <th>기업명</th>
                                            <th>아이디</th>
                                            <th>승인일</th>
                                            <th>관리</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${approvedUsers.length === 0 ? `
                                            <tr>
                                                <td colspan="5" class="text-center text-muted py-5">
                                                    <i class='bx bx-info-circle' style="font-size: 2rem; margin-bottom: 0.5rem;"></i><br>
                                                    승인된 사용자가 없습니다
                                                </td>
                                            </tr>
                                        ` : approvedUsers.map(user => `
                                            <tr>
                                                <td><span class="badge bg-primary">${user.businessNumber}</span></td>
                                                <td><strong>${user.companyName}</strong></td>
                                                <td><code>${user.userId}</code></td>
                                                <td><small>${new Date(user.approvedAt).toLocaleDateString()}</small></td>
                                                <td>
                                                    <button class="btn btn-warning btn-sm" onclick="revokeUser('${user.businessNumber}', '${user.userId}')" title="승인취소">
                                                        <i class='bx bx-undo'></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 관리자 안내 -->
            <div class="row mt-4">
                <div class="col-12">
                    <div class="alert alert-info">
                        <h6><i class='bx bx-info-circle'></i> 관리자 안내</h6>
                        <ul class="mb-0">
                            <li><strong>승인:</strong> 사용자의 가입을 승인하여 로그인을 허용합니다.</li>
                            <li><strong>거절:</strong> 사용자의 가입을 거절하여 대기 목록에서 제거합니다.</li>
                            <li><strong>승인취소:</strong> 이미 승인된 사용자의 권한을 취소합니다.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 모달 크기를 크게 설정하고 닫기 버튼이 있는 footer 추가
    const modal = document.getElementById('commonModal');
    const modalDialog = modal.querySelector('.modal-dialog');
    modalDialog.className = 'modal-dialog modal-xl';
    
    const footer = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
    `;
    
    showModal('관리자 패널', content, footer);
    
    // 모달 저장 버튼 숨기기 (관리자 패널에서는 불필요)
    const saveBtn = document.getElementById('modalSaveBtn');
    if (saveBtn) {
        saveBtn.style.display = 'none';
    }
}

function approveUser(businessNumber, userId) {
    const pendingUsers = getPendingUsers();
    const approvedUsers = getApprovedUsers();
    
    const userIndex = pendingUsers.findIndex(user => 
        user.businessNumber === businessNumber && user.userId === userId
    );
    
    if (userIndex !== -1) {
        const user = pendingUsers[userIndex];
        user.status = 'approved';
        user.approvedAt = new Date().toISOString();
        
        approvedUsers.push(user);
        pendingUsers.splice(userIndex, 1);
        
        savePendingUsers(pendingUsers);
        saveApprovedUsers(approvedUsers);
        
        showToast('사용자가 승인되었습니다.');
        showAdminPanel(); // 패널 새로고침
    }
}

function rejectUser(businessNumber, userId) {
    if (confirm('정말로 이 사용자의 가입을 거절하시겠습니까?')) {
        const pendingUsers = getPendingUsers();
        const userIndex = pendingUsers.findIndex(user => 
            user.businessNumber === businessNumber && user.userId === userId
        );
        
        if (userIndex !== -1) {
            pendingUsers.splice(userIndex, 1);
            savePendingUsers(pendingUsers);
            showToast('사용자 가입이 거절되었습니다.');
            showAdminPanel(); // 패널 새로고침
        }
    }
}

function revokeUser(businessNumber, userId) {
    if (confirm('정말로 이 사용자의 승인을 취소하시겠습니까?')) {
        const approvedUsers = getApprovedUsers();
        const userIndex = approvedUsers.findIndex(user =>
            user.businessNumber === businessNumber && user.userId === userId
        );

        if (userIndex !== -1) {
            approvedUsers.splice(userIndex, 1);
            saveApprovedUsers(approvedUsers);
            showToast('사용자 승인이 취소되었습니다.');
            showAdminPanel(); // 패널 새로고침
        }
    }
}

function getCompanyNameFromBNo(businessNumber) {
    if (!businessNumber) return null;
    const approvedUsers = getApprovedUsers();
    const user = approvedUsers.find(u => u.businessNumber === businessNumber);
    return user ? user.companyName : null;
}

// Signup Functions
function showSignupModal() {
    state.currentPage = 'signup';
    const content = `
        <form id="signupForm">
            <div class="mb-4">
                <label class="form-label">사업자등록번호 <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-lg" name="businessNumber" id="signupBusinessNumberInput" required 
                    placeholder="000-00-00000" maxlength="12">
                <div class="form-text">형식: 000-00-00000</div>
            </div>
            <div class="mb-4">
                <label class="form-label">기업명 <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-lg" name="companyName" required>
            </div>
            <div class="mb-4">
                <label class="form-label">아이디 <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-lg" name="userId" required>
            </div>
            <div class="mb-4">
                <label class="form-label">비밀번호 <span class="text-danger">*</span></label>
                <input type="password" class="form-control form-control-lg" name="password" required>
            </div>
            <div class="mb-4">
                <label class="form-label">비밀번호 확인 <span class="text-danger">*</span></label>
                <input type="password" class="form-control form-control-lg" name="passwordConfirm" required>
            </div>
        </form>
    `;
    const footer = `<button type="button" class="btn btn-success btn-lg w-100" onclick="saveSignup()">회원가입</button>`;
    showModal('회원가입', content, footer, { modalSize: 'modal-lg' });
    
    // 사업자등록번호 자동 하이픈 추가
    const businessNumberInput = document.getElementById('signupBusinessNumberInput');
    autoFormatBusinessNumber(businessNumberInput);
}

function saveSignup() {
    const form = document.getElementById('signupForm');
    const formData = new FormData(form);
    const signupData = Object.fromEntries(formData.entries());
    // 필수 항목 검증
    if (!signupData.businessNumber || !signupData.companyName || !signupData.userId || !signupData.password || !signupData.passwordConfirm) {
        alert('모든 필수 항목을 입력해주세요.');
        return;
    }
    // 사업자등록번호 형식 검증
    const businessNumberPattern = /^[0-9]{3}-[0-9]{2}-[0-9]{5}$/;
    if (!businessNumberPattern.test(signupData.businessNumber)) {
        alert('사업자등록번호 형식이 올바르지 않습니다. (예: 000-00-00000)');
        return;
    }
    // 비밀번호 확인
    if (signupData.password !== signupData.passwordConfirm) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
    }
    // 이미 승인된 사용자인지 확인 (사업자번호/아이디 각각 체크)
    const approvedUsers = getApprovedUsers();
    if (approvedUsers.some(user => user.businessNumber === signupData.businessNumber)) {
        alert('이미 등록된 사업자등록번호입니다.');
        return;
    }
    if (approvedUsers.some(user => user.userId === signupData.userId)) {
        alert('이미 등록된 아이디입니다.');
        return;
    }
    // 대기 중인 사용자인지 확인 (사업자번호/아이디 각각 체크)
    const pendingUsers = getPendingUsers();
    if (pendingUsers.some(user => user.businessNumber === signupData.businessNumber)) {
        alert('이미 승인 대기 중인 사업자등록번호입니다.');
        return;
    }
    if (pendingUsers.some(user => user.userId === signupData.userId)) {
        alert('이미 승인 대기 중인 아이디입니다.');
        return;
    }
    // 대기 목록에 추가
    const newUser = {
        ...signupData,
        createdAt: new Date().toISOString(),
        status: 'pending'
    };
    pendingUsers.push(newUser);
    savePendingUsers(pendingUsers);
    closeModal();
    showToast('회원가입이 완료되었습니다. 관리자 승인 후 로그인이 가능합니다.');
}

// Login Functions
function loadLogin() {
    mainContent.innerHTML = `
        <div class="container-fluid d-flex justify-content-center align-items-center vh-100 bg-light">
            <div class="login-container card shadow-lg" style="max-width: 450px; width: 100%;">
                <div class="card-body p-4 p-md-5">
                    <h3 class="card-title text-center mb-4">로그인</h3>
                    <form id="loginForm">
                        <div class="form-floating mb-3">
                            <input type="text" class="form-control form-control-lg" id="loginUserId" name="loginUserId" placeholder="아이디" required style="height:56px; font-size:1.15rem; width:100%;">
                            <label for="loginUserId">아이디</label>
                        </div>
                        <div class="form-floating mb-3">
                            <input type="password" class="form-control form-control-lg" id="loginPassword" name="loginPassword" placeholder="비밀번호" required style="height:56px; font-size:1.15rem; width:100%;">
                            <label for="loginPassword">비밀번호</label>
                        </div>
                        <div class="d-grid">
                            <button class="btn btn-primary btn-lg" type="submit">로그인</button>
                        </div>
                    </form>
                    <hr class="my-4">
                    <div class="text-center">
                        <p class="mb-2">계정이 없으신가요?</p>
                        <button class="btn btn-outline-success mb-3 w-100" onclick="showSignupModal()">회원가입</button>
                        <button class="btn btn-link btn-sm" onclick="showAdminLoginModal()">관리자 로그인</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('loginForm').addEventListener('submit', handleUserLogin);
    // 사이드바와 헤더 숨기기
    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('header').style.display = 'none';
    document.body.classList.add('login-page');
}

function handleUserLogin(e) {
    e.preventDefault();
    if (isLoggedIn()) {
        showToast('이미 로그인된 상태입니다.');
        navigateTo('dashboard');
        return;
    }
    const formData = new FormData(e.target);
    const userId = formData.get('loginUserId');
    const password = formData.get('loginPassword');
    if (!userId || !password) {
        alert('아이디와 비밀번호를 모두 입력해주세요.');
        return;
    }

    showLoading('로그인 중...');

    const approvedUsers = getApprovedUsers();
    const user = approvedUsers.find(u => u.userId === userId && u.password === password);
    if (user) {
        clearLoginData();
        // 로그인 정보를 상세하게 저장
        const loginInfo = {
            userId: user.userId,
            companyName: user.companyName,
            businessNumber: user.businessNumber,
            role: 'user',
            loginTime: new Date().toISOString()
        };
        localStorage.setItem('loggedInUser', JSON.stringify(loginInfo));
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('loginUserId', userId);
        localStorage.setItem('loginBusinessNumber', user.businessNumber);
        localStorage.setItem('userRole', 'user');

        // 사이드바 초기화
        initializeSidebar();

        showLoading('대시보드로 이동 중...');
        
        setTimeout(() => {
            hideLoading();
            showToast(`${user.companyName}(으)로 로그인되었습니다.`);
            navigateTo('dashboard');
        }, 1000);
    } else {
        hideLoading();
        showToast('아이디 또는 비밀번호가 올바르지 않습니다.', 'danger');
    }
}

// Logout Functions
function logout() {
    const modal = document.getElementById('confirmationModal');
    const modalInstance = new bootstrap.Modal(modal);
    
    document.getElementById('confirmationModalLabel').textContent = '로그아웃 확인';
    document.getElementById('confirmationMessage').textContent = '정말 로그아웃하시겠습니까?';
    document.getElementById('confirmBtn').textContent = '로그아웃';
    document.getElementById('confirmBtn').onclick = () => {
        clearLoginData();
        hideAdminCompanySelector(); // 관리자 기업 선택 드롭다운 숨기기
        modalInstance.hide();
        showToast('로그아웃되었습니다.');
        navigateTo('login');
        
        // 헤더와 사이드바의 로그아웃 버튼 모두 숨기기
        const headerLogoutBtn = document.getElementById('logoutBtn');
        const sidebarLogoutContainer = document.getElementById('sidebar-logout-container');
        
        if (headerLogoutBtn) {
            headerLogoutBtn.style.display = 'none';
        }
        if (sidebarLogoutContainer) {
            sidebarLogoutContainer.style.display = 'none';
        }
    };
    
    modalInstance.show();
}

function renderLogoutBtn() {
    const headerLogoutBtn = document.getElementById('logoutBtn');
    const sidebarLogoutContainer = document.getElementById('sidebar-logout-container');
    
    // 헤더의 로그아웃 버튼은 숨김
    if (headerLogoutBtn) {
        headerLogoutBtn.style.display = 'none';
    }
    
    // 관리자인 경우 사이드바에 기업 선택 드롭다운과 로그아웃 버튼 표시
    if (isAdmin()) {
        showAdminCompanySelector();
    } else {
        hideAdminCompanySelector();
        
        // 일반 사용자의 경우 사이드바에 로그아웃 버튼만 표시
        if (sidebarLogoutContainer) {
            sidebarLogoutContainer.style.display = 'block';
        }
    }
}

// 관리자 기업 선택 드롭다운 표시
function showAdminCompanySelector() {
    const selector = document.getElementById('admin-company-selector');
    const dropdown = document.getElementById('companySelectDropdown');
    const logoutContainer = document.getElementById('sidebar-logout-container');
    
    if (selector && dropdown) {
        selector.style.display = 'block';
        if (logoutContainer) {
            logoutContainer.style.display = 'block';
        }
        // 승인된 사용자 목록에서 기업 정보 가져오기
        const approvedUsers = getApprovedUsers();
        // 드롭다운 옵션 초기화
        dropdown.innerHTML = '<option value="">기업을 선택하세요</option>';
        approvedUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user.businessNumber;
            option.textContent = `${user.businessNumber} - ${user.companyName}`;
            dropdown.appendChild(option);
        });
        // 이전에 선택된 기업이 있으면 선택값 유지
        const selectedBusinessNumber = localStorage.getItem('adminViewingBusinessNumber');
        if (selectedBusinessNumber) {
            dropdown.value = selectedBusinessNumber;
        } else {
            dropdown.value = '';
        }
        // change 이벤트 중복 등록 방지
        dropdown.onchange = function() {
            const selectedBusinessNumber = this.value;
            if (selectedBusinessNumber) {
                // 선택된 기업 정보 저장
                localStorage.setItem('adminViewingBusinessNumber', selectedBusinessNumber);
                
                // 기업 데이터 로드
                loadCompanyState();
                
                // 기업명 가져오기
                const companyName = getCompanyNameFromBNo(selectedBusinessNumber);
                showToast(`${companyName || selectedBusinessNumber} 기업 데이터를 불러왔습니다.`);
                
                // 현재 페이지가 admin-panel이면 대시보드로 이동
                if (state.currentPage === 'admin-panel') {
                    state.currentPage = 'dashboard';
                }
                
                // 대시보드 또는 현재 페이지로 이동
                navigateTo(state.currentPage);
            } else {
                // 기업 선택 해제
                localStorage.removeItem('adminViewingBusinessNumber');
                state.items = [];
                state.partners = [];
                state.purchases = [];
                state.sales = [];
                showToast('기업 선택이 해제되었습니다.');
                
                // 관리자 패널로 이동
                navigateTo('admin-panel');
            }
        };
    }
}

// 관리자 기업 선택 드롭다운 숨기기
function hideAdminCompanySelector() {
    const selector = document.getElementById('admin-company-selector');
    const logoutContainer = document.getElementById('sidebar-logout-container');
    
    if (selector) {
        selector.style.display = 'none';
    }
    
    if (logoutContainer) {
        logoutContainer.style.display = 'none';
    }
}

// 사이드바 가시성 업데이트 함수
function updateSidebarVisibility() {
    const userRole = localStorage.getItem('userRole');
    const adminPanelLink = document.getElementById('admin-panel-link');
    const adminCompanySelector = document.getElementById('admin-company-selector');
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    
    if (userRole === 'admin' || loggedInUser.role === 'admin') {
        // 관리자 메뉴 표시
        if (adminPanelLink) {
            adminPanelLink.style.display = 'block';
        }
        if (adminCompanySelector) {
            adminCompanySelector.style.display = 'block';
            showAdminCompanySelector(); // 기업 선택 드롭다운 초기화
        }
    } else {
        // 일반 사용자는 관리자 메뉴 숨김
        if (adminPanelLink) adminPanelLink.style.display = 'none';
        if (adminCompanySelector) adminCompanySelector.style.display = 'none';
    }
}

// 로그인 후 사이드바 초기화
function initializeSidebar() {
    const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    const userRole = localStorage.getItem('userRole');
    
    // 사이드바 표시
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.display = 'block';
    
    // 관리자 권한 체크 및 메뉴 초기화
    if (userRole === 'admin' || loggedInUser.role === 'admin') {
        localStorage.setItem('userRole', 'admin'); // role 동기화
        localStorage.setItem('isAdmin', 'true');
    }
    
    // 사이드바 가시성 업데이트
    updateSidebarVisibility();
}