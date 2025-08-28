// 거래처 관리 모듈
import { state, getCurrentCompanyBusinessNumber, saveCompanyState, isLoggedIn, navigateTo } from './main.js';
import { showLoading, hideLoading, showToast, showModal, createSearchableDropdown, formatCurrency, generateId, renderPagination, waitForMainContent, closeModal } from './ui.js';

export function loadPartners() {
    if (!isLoggedIn()) {
        navigateTo('login');
        return;
    }
    
    showLoading('거래처 목록을 불러오는 중...');
    
    // DOM이 준비될 때까지 안전하게 대기
    waitForMainContent()
        .then(mainContent => {
            const content = `
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">거래처 관리</h5>
                        <div>
                            <button class="btn btn-success me-2" onclick="showBulkUploadModal()">
                                <i class='bx bx-upload'></i> 엑셀 일괄등록
                            </button>
                            <button class="btn btn-primary" onclick="showPartnerModal()">
                                <i class='bx bx-plus'></i> 거래처 등록
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="table-container">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead class="table-light sticky-top">
                                        <tr>
                                            <th>사업자등록번호</th>
                                            <th>상호명</th>
                                            <th>대표자</th>
                                            <th>업태</th>
                                            <th>종목</th>
                                            <th>관리</th>
                                        </tr>
                                    </thead>
                                    <tbody id="partnersTableBody">
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div id="pagination-container" class="d-flex justify-content-center mt-3"></div>
                    </div>
                </div>
            `;
            
            mainContent.innerHTML = content;
            loadPartnersTable();
            hideLoading();
        })
        .catch(error => {
            console.error('거래처 관리 페이지 로드 실패:', error);
            hideLoading();
            showToast('페이지 로드 중 오류가 발생했습니다.', 'error');
        });
}

export function loadPartnersTable() {
    const tbody = document.getElementById('partnersTableBody');
    if (!tbody) return;

    const page = state.partnersCurrentPage || 1;
    const itemsPerPage = 10;
    const totalItems = state.partners.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    const pagedPartners = state.partners.slice(startIndex, endIndex);

    tbody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    pagedPartners.forEach(partner => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td title="${partner.businessNumber}">${partner.businessNumber}</td>
            <td title="${partner.name}">${partner.name}</td>
            <td title="${partner.representative}">${partner.representative}</td>
            <td title="${partner.businessType || '-'}">${partner.businessType || '-'}</td>
            <td title="${partner.businessCategory || '-'}">${partner.businessCategory || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editPartner('${partner.businessNumber}')">
                    <i class='bx bx-edit'></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deletePartner('${partner.businessNumber}')">
                    <i class='bx bx-trash'></i>
                </button>
            </td>
        `;
        fragment.appendChild(row);
    });

    tbody.appendChild(fragment);

    // 직접 페이지네이션 생성
    createPartnersPagination(totalPages, page);
}

export function savePartner() {
    // 현재 페이지가 partners가 아닌 경우 실행하지 않음
    if (state.currentPage !== 'partners') {
        console.log('savePartner 호출됨 but currentPage is:', state.currentPage);
        return;
    }
    
    const form = document.getElementById('partnerForm');
    const formData = new FormData(form);
    const partnerData = Object.fromEntries(formData.entries());

    // Validate required fields
    if (!partnerData.businessNumber || !partnerData.name || !partnerData.representative) {
        alert('필수 항목을 모두 입력해주세요.');
        return;
    }

    // Validate business number format
    const businessNumberPattern = /^[0-9]{3}-[0-9]{2}-[0-9]{5}$/;
    if (!businessNumberPattern.test(partnerData.businessNumber)) {
        alert('사업자등록번호 형식이 올바르지 않습니다. (예: 000-00-00000)');
        return;
    }

    // 중복 체크 (사업자등록번호 기준)
    const cleanBusinessNumber = partnerData.businessNumber.replace(/-/g, '');
    const existingPartner = state.partners.find(
        partner => partner.businessNumber.replace(/-/g, '') === cleanBusinessNumber
    );

    if (existingPartner) {
        alert('이미 등록된 사업자등록번호입니다.');
        return;
    }

    // Add new partner
    const newPartner = {
        ...partnerData,
        createdAt: new Date().toISOString()
    };
    
    // Firestore 저장 (올바른 경로: companies/{companyId}/partners/{businessNumber})
            const businessNumber = getCurrentCompanyBusinessNumber();
            if (businessNumber) {
        try {
            // Firebase가 전역으로 로드되어 있는지 확인
            if (window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                db.collection('companies')
                    .doc(businessNumber)
                    .collection('partners')
                    .doc(partnerData.businessNumber)
                    .set(newPartner)
                    .then(() => {
                        console.log('Firestore 거래처 저장 성공:', partnerData.businessNumber);
                        // 성공 시에만 UI 업데이트
                        state.partners.push(newPartner);
    saveCompanyState();
    
    // 모달 닫기
    closeModal();
    
    // 마지막 페이지로 이동하여 새 거래처 확인
    state.partnersCurrentPage = Math.ceil(state.partners.length / 10);
    loadPartnersTable();
    showToast('등록되었습니다.');
                    })
                    .catch(e => {
                        console.error('Firestore 거래처 저장 오류:', e);
                        showToast('Firestore 저장 중 오류가 발생했습니다.', 'error');
                    });
            } else {
                console.warn('Firebase가 로드되지 않았습니다.');
                showToast('Firebase 연결을 확인해주세요.', 'warning');
            }
        } catch (e) {
            console.error('Firebase 설정 오류:', e);
            showToast('Firebase 설정 오류가 발생했습니다.', 'error');
        }
    } else {
        showToast('사업자번호를 찾을 수 없습니다.', 'error');
    }
}

export function editPartner(businessNumber) {
    state.currentPage = 'partners'; // 현재 페이지 상태를 partners로 설정
    const partner = state.partners.find(partner => partner.businessNumber === businessNumber);
    if (!partner) return;

    const content = `
        <form id="partnerForm">
            <div class="mb-3">
                <label class="form-label">사업자등록번호 <span class="text-danger">*</span></label>
                <input type="text" class="form-control" name="businessNumber" id="editPartnerBusinessNumberInput" value="${partner.businessNumber}" readonly>
            </div>
            <div class="mb-3">
                <label class="form-label">상호명 <span class="text-danger">*</span></label>
                <input type="text" class="form-control" name="name" value="${partner.name}" required>
            </div>
            <div class="mb-3">
                <label class="form-label">대표자명 <span class="text-danger">*</span></label>
                <input type="text" class="form-control" name="representative" value="${partner.representative}" required>
            </div>
            <div class="mb-3">
                <label class="form-label">업태</label>
                <input type="text" class="form-control" name="businessType" value="${partner.businessType || ''}">
            </div>
            <div class="mb-3">
                <label class="form-label">종목</label>
                <input type="text" class="form-control" name="businessCategory" value="${partner.businessCategory || ''}">
            </div>
            <div class="mb-3">
                <label class="form-label">연락처</label>
                <input type="tel" class="form-control" name="phone" value="${partner.phone || ''}"
                    placeholder="000-0000-0000" pattern="[0-9]{3}-[0-9]{4}-[0-9]{4}">
                <div class="form-text">형식: 000-0000-0000</div>
            </div>
            <div class="mb-3">
                <label class="form-label">이메일</label>
                <input type="email" class="form-control" name="email" value="${partner.email || ''}">
            </div>
            <div class="mb-3">
                <label class="form-label">주소</label>
                <input type="text" class="form-control" name="address" value="${partner.address || ''}">
            </div>
        </form>
    `;
    showModal('거래처 수정', content);
    
    const saveBtn = document.getElementById('modalSaveBtn');
    if (saveBtn) {
        saveBtn.style.display = 'block';
        saveBtn.textContent = '수정';
        // 수정 모드에서는 updatePartner 함수를 호출하도록 설정
        saveBtn.onclick = updatePartner;
    }
}

export function deletePartner(businessNumber) {
    if (confirm('정말로 이 거래처를 삭제하시겠습니까?')) {
        // Firestore 삭제 (올바른 경로: companies/{companyId}/partners/{businessNumber})
                const companyBusinessNumber = getCurrentCompanyBusinessNumber();
                if (companyBusinessNumber) {
            try {
                // Firebase가 전역으로 로드되어 있는지 확인
                if (window.firebase && window.firebase.firestore) {
                    const db = window.firebase.firestore();
                    db.collection('companies')
                        .doc(companyBusinessNumber)
                        .collection('partners')
                        .doc(businessNumber)
                        .delete()
                                    .then(() => {
                                        console.log('Firestore 거래처 삭제 성공:', businessNumber);
                            // 성공 시에만 UI 업데이트
                            state.partners = state.partners.filter(p => p.businessNumber !== businessNumber);
                            saveCompanyState();
                            loadPartnersTable();
                            showToast('삭제되었습니다. 파이어베이스 DB에서도 삭제가 되어야하고 웹앱에서 삭제되었습니다.');
                                    })
                                    .catch(e => {
                                        console.error('Firestore 거래처 삭제 오류:', e);
                            showToast('Firestore 삭제 중 오류가 발생했습니다.', 'error');
                            });
                } else {
                    console.warn('Firebase가 로드되지 않았습니다.');
                    showToast('Firebase 연결을 확인해주세요.', 'warning');
            }
        } catch (e) { 
                console.error('Firebase 설정 오류:', e);
                showToast('Firebase 설정 오류가 발생했습니다.', 'error');
            }
        } else {
            showToast('사업자번호를 찾을 수 없습니다.', 'error');
        }
    }
}

export function updatePartner() {
    // 현재 페이지가 partners가 아닌 경우 실행하지 않음
    if (state.currentPage !== 'partners') {
        console.log('updatePartner 호출됨 but currentPage is:', state.currentPage);
        return;
    }
    
    const form = document.getElementById('partnerForm');
    const formData = new FormData(form);
    const partnerData = Object.fromEntries(formData.entries());

    // Validate required fields
    if (!partnerData.businessNumber || !partnerData.name || !partnerData.representative) {
        alert('필수 항목을 모두 입력해주세요.');
        return;
    }

    // Find existing partner
    const existingPartnerIndex = state.partners.findIndex(
        partner => partner.businessNumber === partnerData.businessNumber
    );

    if (existingPartnerIndex === -1) {
        alert('수정할 거래처를 찾을 수 없습니다.');
        return;
    }

    // Update partner
    const updatedPartner = {
        ...state.partners[existingPartnerIndex],
        ...partnerData,
        updatedAt: new Date().toISOString()
    };
    
    // Firestore 수정 (올바른 경로: companies/{companyId}/partners/{businessNumber})
            const businessNumber = getCurrentCompanyBusinessNumber();
            if (businessNumber) {
        try {
            // Firebase가 전역으로 로드되어 있는지 확인
            if (window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                db.collection('companies')
                    .doc(businessNumber)
                    .collection('partners')
                    .doc(partnerData.businessNumber)
                    .update(updatedPartner)
                                .then(() => {
                                    console.log('Firestore 거래처 수정 성공:', partnerData.businessNumber);
                        // 성공 시에만 UI 업데이트
                        state.partners[existingPartnerIndex] = updatedPartner;
    saveCompanyState();
    
    // 모달 닫기
    closeModal();
    
    // 테이블 새로고침 및 성공 메시지 표시
    loadPartnersTable();
    showToast('수정되었습니다.');
                    })
                    .catch(e => {
                        console.error('Firestore 거래처 수정 오류:', e);
                        showToast('Firestore 수정 중 오류가 발생했습니다.', 'error');
                    });
            } else {
                console.warn('Firebase가 로드되지 않았습니다.');
                showToast('Firebase 연결을 확인해주세요.', 'warning');
            }
        } catch (e) {
            console.error('Firebase 설정 오류:', e);
            showToast('Firebase 설정 오류가 발생했습니다.', 'error');
        }
    } else {
        showToast('사업자번호를 찾을 수 없습니다.', 'error');
    }
}

export function showPartnerModal() {
    state.currentPage = 'partners'; // 현재 페이지 상태를 partners로 설정하여 저장 버튼이 savePartner를 호출하도록 함
    const content = `
        <form id="partnerForm">
            <div class="mb-3">
                <label class="form-label">사업자등록번호 <span class="text-danger">*</span></label>
                <input type="text" class="form-control" name="businessNumber" id="partnerBusinessNumberInput" required 
                    placeholder="000-00-00000" maxlength="12">
                <div class="form-text">형식: 000-00-00000</div>
            </div>
            <div class="mb-3">
                <label class="form-label">상호명 <span class="text-danger">*</span></label>
                <input type="text" class="form-control" name="name" required>
            </div>
            <div class="mb-3">
                <label class="form-label">대표자명 <span class="text-danger">*</span></label>
                <input type="text" class="form-control" name="representative" required>
            </div>
            <div class="mb-3">
                <label class="form-label">업태</label>
                <input type="text" class="form-control" name="businessType">
            </div>
            <div class="mb-3">
                <label class="form-label">종목</label>
                <input type="text" class="form-control" name="businessCategory">
            </div>
            <div class="mb-3">
                <label class="form-label">연락처</label>
                <input type="tel" class="form-control" name="phone" 
                    placeholder="000-0000-0000" pattern="[0-9]{3}-[0-9]{4}-[0-9]{4}">
                <div class="form-text">형식: 000-0000-0000</div>
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
    showModal('거래처 등록', content);
    
    // 사업자등록번호 자동 하이픈 추가
    const businessNumberInput = document.getElementById('partnerBusinessNumberInput');
    if (businessNumberInput) {
        businessNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/[^0-9]/g, ''); // 숫자만 남기기
            if (value.length > 0) {
                if (value.length <= 3) {
                    value = value;
                } else if (value.length <= 5) {
                    value = value.slice(0, 3) + '-' + value.slice(3);
                } else {
                    value = value.slice(0, 3) + '-' + value.slice(3, 5) + '-' + value.slice(5, 10);
                }
            }
            e.target.value = value;
        });
    }

    const saveBtn = document.getElementById('modalSaveBtn');
    if (saveBtn) {
        saveBtn.style.display = 'block';
        saveBtn.textContent = '등록';
        // 이벤트 핸들러 추가
        saveBtn.onclick = savePartner;
    }
}

export function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        let partners = loadPartners();
        const existingBusinessNumbers = new Set(partners.map(p => p.businessNumber.replace(/-/g, '')));

        let addedCount = 0;
        let skippedCount = 0;

        json.forEach(row => {
            const businessNumber = row['등록번호'] || row['사업자번호'];
            if (businessNumber) {
                const businessNumberClean = String(businessNumber).replace(/-/g, '');
                if (!existingBusinessNumbers.has(businessNumberClean)) {
                    const newPartner = {
                        businessNumber: String(businessNumber),
                        name: row['상호(법인명)'] || row['거래처명'] || '',
                        ceo: row['대표자명'] || '',
                        phone: '',
                        email: row['이메일'] || '',
                        address: row['주소'] || '',
                        // Add other fields with default values if necessary
                        id: generateId(),
                        group: '',
                        contactPerson: '',
                        contactPhone: '',
                        fax: '',
                        industry: '',
                        category: '',
                        notes: '',
                        manager: '',
                        memo: '',
                        lastModified: new Date().toISOString(),
                        registrationDate: new Date().toISOString(),
                        bankName: '',
                        accountNumber: '',
                        accountHolder: ''
                    };
                    partners.push(newPartner);
                    existingBusinessNumbers.add(businessNumberClean);
                    addedCount++;
                } else {
                    skippedCount++;
                }
            }
        });

        const companyKey = getCurrentCompanyBusinessNumber();
        if (companyKey) {
            localStorage.setItem(`partners_${companyKey}`, JSON.stringify(partners));
        }

        loadPartnersTable();
        showToast(`${addedCount}개의 신규 거래처를 추가했습니다. (중복 ${skippedCount}개 제외)`);
    };

    reader.readAsArrayBuffer(file);
    
    // Reset file input to allow re-uploading the same file
    event.target.value = '';
}

export function downloadPartnerTemplate() {
    try {
        // XLSX 라이브러리 확인
        if (typeof XLSX === 'undefined') {
            alert('XLSX 라이브러리가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
            return;
        }
        
        // 헤더만 포함한 템플릿 데이터
        const templateData = [
            {
                '상호(법인명)*': '',
                '회사명': '',
                '등록번호*': '',
                '대표자명*': '',
                '대표전화': '',
                '휴대폰번호': '',
                'FAX번호': '',
                '업태*': '',
                '종목*': '',
                '적요': '',
                '사업장주소*': '',
                '종사업장번호': '',
                '거래처그룹': '',
                '이름': '',
                '연락처': '',
                '메일': '',
                '비고': '',
                '계산서담당자': '',
                '메모칼라': '',
                '최종수정일': '',
                '거래처등록일': '',
                '주계좌은행': '',
                '주계좌 계좌번호': '',
                '예금주': '',
                '내 입금계좌': '',
                '내 출금계좌': ''
            }
        ];
        
        // 워크시트 생성
        const ws = XLSX.utils.json_to_sheet(templateData);
        
        // 필수 컬럼과 선택 컬럼 정의
        const requiredColumns = ['상호(법인명)*', '등록번호*', '대표자명*', '업태*', '종목*', '사업장주소*'];
        const optionalColumns = ['회사명', '대표전화', '휴대폰번호', 'FAX번호', '적요', '종사업장번호', '거래처그룹', '이름', '연락처', '메일', '비고', '계산서담당자', '메모칼라', '최종수정일', '거래처등록일', '주계좌은행', '주계좌 계좌번호', '예금주', '내 입금계좌', '내 출금계좌'];
        
        // 헤더 행 스타일 설정
        if (!ws['!cols']) ws['!cols'] = [];
        if (!ws['!rows']) ws['!rows'] = [];
        
        // 필수 컬럼에 스타일 적용 (배경색 + 굵은 글씨)
        requiredColumns.forEach((col, index) => {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
            if (!ws[cellRef]) {
                ws[cellRef] = { v: col, t: 's' };
            }
            
            // 필수 컬럼 스타일: 빨간색 글씨 + 굵은 글씨
            ws[cellRef].s = {
                font: {
                    color: { rgb: 'FF0000' },
                    bold: true
                },
                fill: {
                    fgColor: { rgb: 'FFFFFF' }
                }
            };
        });
        
        // 선택 컬럼에 기본 서식 적용
        optionalColumns.forEach((col, index) => {
            const actualIndex = index + requiredColumns.length;
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: actualIndex });
            if (!ws[cellRef]) {
                ws[cellRef] = { v: col, t: 's' };
            }
            
            // 기본 서식 적용 (선택 컬럼)
            ws[cellRef].s = {
                font: {
                    color: { rgb: '000000' },
                    bold: false
                },
                fill: {
                    fgColor: { rgb: 'FFFFFF' }
                }
            };
        });
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '거래처등록양식');
        
        // 입력예시 시트 생성
        const exampleData = [
            {
                '상호(법인명)': '샘플주식회사',
                '회사명': '샘플기업',
                '등록번호': '123-45-67890',
                '대표자명': '홍길동',
                '대표전화': '02-1234-5678',
                '휴대폰번호': '010-1234-5678',
                'FAX번호': '02-1234-5679',
                '업태': '제조업',
                '종목': '전자제품',
                '적요': '전자부품 제조',
                '사업장주소': '서울시 강남구 테헤란로 123',
                '종사업장번호': '123-45-67891',
                '거래처그룹': 'A그룹',
                '이름': '김담당',
                '연락처': '02-1234-5680',
                '메일': 'contact@sample.com',
                '비고': '우수거래처',
                '계산서담당자': '이회계',
                '메모칼라': '파랑',
                '최종수정일': '2024-01-15',
                '거래처등록일': '2024-01-01',
                '주계좌은행': '신한은행',
                '주계좌 계좌번호': '110-123456-789',
                '예금주': '샘플주식회사',
                '내 입금계좌': '110-123456-789',
                '내 출금계좌': '110-123456-790'
            }
        ];
        
        const wsExample = XLSX.utils.json_to_sheet(exampleData);
        
        // 입력예시 시트 스타일 설정
        const exampleColumns = ['상호(법인명)', '회사명', '등록번호', '대표자명', '대표전화', '휴대폰번호', 'FAX번호', '업태', '종목', '적요', '사업장주소', '종사업장번호', '거래처그룹', '이름', '연락처', '메일', '비고', '계산서담당자', '메모칼라', '최종수정일', '거래처등록일', '주계좌은행', '주계좌 계좌번호', '예금주', '내 입금계좌', '내 출금계좌'];
        
        // 헤더 스타일 (첫 번째 행)
        exampleColumns.forEach((col, index) => {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
            if (wsExample[cellRef]) {
                wsExample[cellRef].s = {
                    font: {
                        color: { rgb: '000000' },
                        bold: true
                    },
                    fill: {
                        fgColor: { rgb: 'E8F4FD' }
                    }
                };
            }
        });
        
        // 예시 데이터 스타일 (두 번째 행)
        exampleColumns.forEach((col, index) => {
            const cellRef = XLSX.utils.encode_cell({ r: 1, c: index });
            if (wsExample[cellRef]) {
                wsExample[cellRef].s = {
                    font: {
                        color: { rgb: '666666' },
                        italic: true
                    },
                    fill: {
                        fgColor: { rgb: 'F5F5F5' }
                    }
                };
            }
        });
        
        // 안내 텍스트 추가 (세 번째 행부터)
        const guideTexts = [
            { cell: 'A3', text: '입력 규칙 안내:' },
            { cell: 'A4', text: '• 필수 항목 (빨간색 * 표시): 상호(법인명), 등록번호, 대표자명, 업태, 종목, 사업장주소' },
            { cell: 'A5', text: '• 등록번호: 000-00-00000 형식으로 입력 (사업자등록번호)' },
            { cell: 'A6', text: '• 상호(법인명): 회사명 또는 법인명 입력' },
            { cell: 'A7', text: '• 대표자명: 대표자 성명 입력' },
            { cell: 'A8', text: '• 업태/종목: 사업자등록증에 기재된 업태와 종목 입력' },
            { cell: 'A9', text: '• 사업장주소: 실제 사업장 주소 입력' },
            { cell: 'A10', text: '• 연락처: 000-0000-0000 형식으로 입력' },
            { cell: 'A11', text: '• 이메일: 이메일 주소 형식으로 입력' }
        ];
        
        guideTexts.forEach(guide => {
            const cellRef = guide.cell;
            wsExample[cellRef] = { v: guide.text, t: 's' };
            wsExample[cellRef].s = {
                font: {
                    color: { rgb: '666666' },
                    size: 10
                }
            };
        });
        
        XLSX.utils.book_append_sheet(wb, wsExample, '입력예시');
        
        // 파일 다운로드
        const fileName = `거래처등록양식_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showToast('거래처 등록 양식이 다운로드되었습니다.');
        
    } catch (error) {
        console.error('양식 다운로드 오류:', error);
        alert('양식 다운로드 중 오류가 발생했습니다: ' + error.message);
    }
}

export function showBulkUploadModal() {
    const content = `
        <div class="bulk-upload-container">
            <div class="alert alert-info">
                <h6><i class='bx bx-info-circle'></i> 엑셀 일괄등록 안내</h6>
                <ul class="mb-0">
                    <li>엑셀 파일에는 <strong>거래처등록양식</strong>과 <strong>입력예시</strong> 두 개의 시트가 포함됩니다.</li>
                    <li><strong>업로드 시 거래처등록양식 시트만 처리됩니다.</strong></li>
                    <li><strong>필수 컬럼 (빨간색 * 표시):</strong> 상호(법인명)*, 등록번호*, 대표자명*, 업태*, 종목*, 사업장주소*</li>
                    <li><strong>선택 컬럼 (기본 서식):</strong> 회사명, 대표전화, 휴대폰번호, FAX번호, 적요, 종사업장번호, 거래처그룹, 이름, 연락처, 메일, 비고, 계산서담당자, 메모칼라, 최종수정일, 거래처등록일, 주계좌은행, 주계좌 계좌번호, 예금주, 내 입금계좌, 내 출금계좌</li>
                    <li>컬럼명과 순서를 반드시 양식과 동일하게 맞춰주세요.</li>
                    <li>사업자등록번호가 중복되는 경우 등록되지 않습니다.</li>
                    <li><strong>거래처등록양식 시트의 첫 번째 행은 헤더이므로 두 번째 행부터 데이터를 입력하세요.</strong></li>
                    <li><strong>입력예시 시트에서 입력 규칙을 확인한 후 거래처등록양식 시트에 데이터를 입력하세요.</strong></li>
                </ul>
            </div>
            
            <div class="d-flex justify-content-end mb-3">
                <button class="btn btn-success btn-sm" onclick="downloadPartnerTemplate()">
                    <i class='bx bx-download'></i> 엑셀 양식 다운로드
                </button>
            </div>
            
            <div class="mb-3">
                <label class="form-label">엑셀 파일 선택</label>
                <input type="file" class="form-control" id="bulkUploadFile" accept=".xlsx,.xls" onchange="handleBulkUpload(event)">
                <div class="form-text">지원 형식: .xlsx, .xls</div>
            </div>
            
            <div id="uploadPreview" class="mt-3" style="display: none;">
                <h6>업로드 미리보기</h6>
                <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
                    <table class="table table-sm table-bordered">
                        <thead class="table-light sticky-top">
                            <tr>
                                <th>상호(법인명)</th>
                                <th>등록번호</th>
                                <th>대표자명</th>
                                <th>업태</th>
                                <th>종목</th>
                                <th>사업장주소</th>
                                <th>연락처</th>
                                <th>메일</th>
                                <th>상태</th>
                            </tr>
                        </thead>
                        <tbody id="uploadPreviewBody"></tbody>
                    </table>
                </div>
                <div class="mt-3">
                    <button class="btn btn-primary" onclick="confirmBulkUpload()">
                        <i class='bx bx-check'></i> 일괄등록 실행
                    </button>
                    <button class="btn btn-secondary ms-2" onclick="cancelBulkUpload()">
                        <i class='bx bx-x'></i> 취소
                    </button>
                </div>
            </div>
        </div>
    `;
    
    showModal('거래처 엑셀 일괄등록', content);
    
    // 모달 저장 버튼 숨기기 (일괄등록에서는 불필요)
    const saveBtn = document.getElementById('modalSaveBtn');
    if (saveBtn) {
        saveBtn.style.display = 'none';
    }
}

export function handleBulkUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // 거래처등록양식 시트 찾기 (입력예시 시트는 무시)
            let worksheet = null;
            let sheetName = '';
            
            for (const sheetName of workbook.SheetNames) {
                if (sheetName === '거래처등록양식') {
                    worksheet = workbook.Sheets[sheetName];
                    break;
                }
            }
            
            // 거래처등록양식 시트가 없으면 첫 번째 시트 사용
            if (!worksheet) {
                worksheet = workbook.Sheets[workbook.SheetNames[0]];
                sheetName = workbook.SheetNames[0];
            } else {
                sheetName = '거래처등록양식';
            }
            
            const json = XLSX.utils.sheet_to_json(worksheet);

            if (json.length === 0) {
                alert('엑셀 파일에 데이터가 없습니다.');
                return;
            }

            // 기존 거래처 사업자등록번호 목록 (중복 체크용)
            const existingBusinessNumbers = new Set(
                state.partners.map(p => p.businessNumber.replace(/-/g, ''))
            );

            // 데이터 처리 및 미리보기 생성
            const processedData = [];
            let validCount = 0;
            let duplicateCount = 0;
            let invalidCount = 0;

            json.forEach((row, index) => {
                // * 표시가 포함된 컬럼명과 일반 컬럼명 모두 처리
                const companyName = row['상호(법인명)*'] || row['상호(법인명)'] || '';
                const businessNumber = row['등록번호*'] || row['등록번호'] || '';
                const representative = row['대표자명*'] || row['대표자명'] || '';
                const businessType = row['업태*'] || row['업태'] || '';
                const businessCategory = row['종목*'] || row['종목'] || '';
                const address = row['사업장주소*'] || row['사업장주소'] || '';
                const phone = row['연락처'] || '';
                const email = row['메일'] || '';

                // 사업자등록번호 정리 (하이픈 제거)
                const cleanBusinessNumber = String(businessNumber).replace(/-/g, '');

                let status = 'valid';
                let statusText = '등록 가능';
                let statusClass = 'text-success';

                // 유효성 검사
                if (!companyName || !cleanBusinessNumber || !representative || !businessType || !businessCategory || !address) {
                    status = 'invalid';
                    statusText = '필수 정보 누락';
                    statusClass = 'text-danger';
                    invalidCount++;
                } else if (existingBusinessNumbers.has(cleanBusinessNumber)) {
                    status = 'duplicate';
                    statusText = '중복 (기존 등록)';
                    statusClass = 'text-warning';
                    duplicateCount++;
                } else {
                    validCount++;
                    existingBusinessNumbers.add(cleanBusinessNumber); // 중복 방지를 위해 추가
                }

                processedData.push({
                    businessNumber: cleanBusinessNumber,
                    companyName,
                    representative,
                    businessType,
                    businessCategory,
                    phone,
                    email,
                    address,
                    status,
                    statusText,
                    statusClass
                });
            });

            // 미리보기 표시
            const previewBody = document.getElementById('uploadPreviewBody');
            previewBody.innerHTML = processedData.map(item => `
                <tr>
                    <td>${item.companyName}</td>
                    <td>${item.businessNumber}</td>
                    <td>${item.representative}</td>
                    <td>${item.businessType}</td>
                    <td>${item.businessCategory}</td>
                    <td>${item.address}</td>
                    <td>${item.phone}</td>
                    <td>${item.email}</td>
                    <td class="${item.statusClass}">${item.statusText}</td>
                </tr>
            `).join('');

            // 통계 표시
            const previewDiv = document.getElementById('uploadPreview');
            previewDiv.style.display = 'block';
            
            // 통계 정보 추가
            const statsHtml = `
                <div class="alert alert-info mb-3">
                    <div class="row text-center">
                        <div class="col-md-4">
                            <div class="text-success fw-bold">${validCount}</div>
                            <small>등록 가능</small>
                        </div>
                        <div class="col-md-4">
                            <div class="text-warning fw-bold">${duplicateCount}</div>
                            <small>중복 제외</small>
                        </div>
                        <div class="col-md-4">
                            <div class="text-danger fw-bold">${invalidCount}</div>
                            <small>오류</small>
                        </div>
                    </div>
                </div>
            `;
            previewDiv.insertAdjacentHTML('afterbegin', statsHtml);

            // 전역 변수에 처리된 데이터 저장
            window.bulkUploadData = processedData.filter(item => item.status === 'valid');

        } catch (error) {
            console.error('엑셀 파일 처리 오류:', error);
            alert('엑셀 파일을 처리하는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.');
        }
    };

    reader.readAsArrayBuffer(file);
}

export function confirmBulkUpload() {
    if (!window.bulkUploadData || window.bulkUploadData.length === 0) {
        alert('등록할 데이터가 없습니다.');
        return;
    }

    if (confirm(`총 ${window.bulkUploadData.length}개의 거래처를 등록하시겠습니까?`)) {
        showLoading('거래처를 등록하는 중...');
        
        // 비동기로 처리하여 UI 블로킹 방지
        setTimeout(() => {
            let addedCount = 0;
            
            // Firestore에 저장할 거래처 데이터 준비
            const businessNumber = getCurrentCompanyBusinessNumber();
            if (businessNumber) {
                try {
                    // Firebase가 전역으로 로드되어 있는지 확인
                    if (window.firebase && window.firebase.firestore) {
                        const db = window.firebase.firestore();
                        
                        // 각 거래처를 Firestore에 저장
                        const savePromises = window.bulkUploadData.map(item => {
                // 사업자등록번호에 하이픈 추가
                const formattedBusinessNumber = item.businessNumber.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');
                
                const newPartner = {
                    businessNumber: formattedBusinessNumber,
                    name: item.companyName,
                    representative: item.representative,
                    email: item.email,
                    address: item.address,
                    phone: item.phone || '',
                    businessType: item.businessType || '',
                    businessCategory: item.businessCategory || '',
                    createdAt: new Date().toISOString()
                };
                
                            // Firestore에 저장 (사업자등록번호를 문서 ID로 사용)
                            return db.collection('companies')
                                .doc(businessNumber)
                                .collection('partners')
                                .doc(formattedBusinessNumber)
                                .set(newPartner)
                                .then(() => {
                                    console.log('Firestore 거래처 저장 성공:', formattedBusinessNumber);
                                    state.partners.push(newPartner);
                                    addedCount++;
                                })
                                .catch(e => {
                                    console.error('Firestore 거래처 저장 오류:', formattedBusinessNumber, e);
                                    // 실패해도 UI에는 추가 (로컬 상태 유지)
                state.partners.push(newPartner);
                addedCount++;
                                });
            });

                        // 모든 저장 작업 완료 후 처리
                        Promise.all(savePromises).then(() => {
            saveCompanyState();
            
            // 모달 닫기
            closeModal();
            
            state.partnersCurrentPage = Math.ceil(state.partners.length / 10);
            loadPartnersTable();
            
            hideLoading();
            showToast(`${addedCount}개 등록되었습니다.`);
            
            // 전역 변수 정리
            window.bulkUploadData = null;
                        });
                    } else {
                        console.warn('Firebase가 로드되지 않았습니다.');
                        showToast('Firebase 연결을 확인해주세요.', 'warning');
                        
                        // Firebase가 없어도 로컬 저장
                        window.bulkUploadData.forEach(item => {
                            const formattedBusinessNumber = item.businessNumber.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');
                            
                            const newPartner = {
                                businessNumber: formattedBusinessNumber,
                                name: item.companyName,
                                representative: item.representative,
                                email: item.email,
                                address: item.address,
                                phone: item.phone || '',
                                businessType: item.businessType || '',
                                businessCategory: item.businessCategory || '',
                                createdAt: new Date().toISOString()
                            };
                            
                            state.partners.push(newPartner);
                            addedCount++;
                        });
                        
                        saveCompanyState();
                        
                        // 모달 닫기
                        closeModal();
                        
                        state.partnersCurrentPage = Math.ceil(state.partners.length / 10);
                        loadPartnersTable();
                        
                        hideLoading();
                        showToast(`${addedCount}개 등록되었습니다.`);
                        
                        // 전역 변수 정리
                        window.bulkUploadData = null;
                    }
                } catch (e) {
                    console.error('Firebase 설정 오류:', e);
                    showToast('Firebase 설정 오류가 발생했습니다.', 'error');
                    
                    // 오류 발생 시에도 로컬 저장
                    window.bulkUploadData.forEach(item => {
                        const formattedBusinessNumber = item.businessNumber.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');
                        
                        const newPartner = {
                            businessNumber: formattedBusinessNumber,
                            name: item.companyName,
                            representative: item.representative,
                            email: item.email,
                            address: item.address,
                            phone: '',
                            businessType: '',
                            businessCategory: '',
                            createdAt: new Date().toISOString()
                        };
                        
                        state.partners.push(newPartner);
                        addedCount++;
                    });
                    
                    saveCompanyState();
                    
                    // 모달 닫기
                    closeModal();
                    
                    state.partnersCurrentPage = Math.ceil(state.partners.length / 10);
                    loadPartnersTable();
                    
                    hideLoading();
                    showToast(`${addedCount}개 등록되었습니다.`);
                    
                    // 전역 변수 정리
                    window.bulkUploadData = null;
                }
            } else {
                showToast('사업자번호를 찾을 수 없습니다.', 'error');
                hideLoading();
            }
            
        }, 100);
    }
}

export function cancelBulkUpload() {
    // 파일 입력 초기화
    const fileInput = document.getElementById('bulkUploadFile');
    if (fileInput) {
        fileInput.value = '';
    }
    
    // 미리보기 숨기기
    const previewDiv = document.getElementById('uploadPreview');
    if (previewDiv) {
        previewDiv.style.display = 'none';
    }
    
    // 전역 변수 정리
    window.bulkUploadData = null;
}

function createPartnersPagination(totalPages, currentPage) {
    const container = document.getElementById('pagination-container');
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let paginationHTML = '<nav aria-label="페이지 네비게이션"><ul class="pagination">';

    // Previous button
    paginationHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="event.preventDefault(); changePartnersPage('partners', ${currentPage - 1})" aria-label="이전 페이지">
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
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="event.preventDefault(); changePartnersPage('partners', 1)">1</a></li>`;
        if (startPage > 2) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link" href="#" onclick="event.preventDefault(); changePartnersPage('partners', ${i})" aria-label="페이지 ${i}">${i}</a>
        </li>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="event.preventDefault(); changePartnersPage('partners', ${totalPages})">${totalPages}</a></li>`;
    }

    // Next button
    paginationHTML += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="event.preventDefault(); changePartnersPage('partners', ${currentPage + 1})" aria-label="다음 페이지">
            <i class='bx bx-chevron-right'></i>
        </a>
    </li>`;

    paginationHTML += '</ul></nav>';
    container.innerHTML = paginationHTML;
}

export function changePage(key, page) {
    console.log('partners changePage 호출됨:', key, page);
    
    if (key === 'partners') {
        const items = state.partners;
        if (!items) return;
        const totalPages = Math.ceil(items.length / 10);
        if (page < 1 || page > totalPages) return;

        state.partnersCurrentPage = page;
        loadPartnersTable();
        
        // 페이지 변경 시 상단으로 스크롤
        const container = document.querySelector('.container-fluid');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

export function initPartnersTab() {
    // 거래처 탭 초기화 로직
    console.log('거래처 탭이 초기화되었습니다.');
    
    // 전역 함수로 등록
    window.showPartnerModal = showPartnerModal;
    window.savePartner = savePartner;
    window.editPartner = editPartner;
    window.deletePartner = deletePartner;
    window.updatePartner = updatePartner;
    window.showBulkUploadModal = showBulkUploadModal;
    window.handleBulkUpload = handleBulkUpload;
    window.confirmBulkUpload = confirmBulkUpload;
    window.cancelBulkUpload = cancelBulkUpload;
    window.downloadPartnerTemplate = downloadPartnerTemplate;
    
    // changePage 함수를 전역으로 등록 (partners 전용)
    window.changePartnersPage = function(key, page) {
        console.log('partners changePage 호출됨:', key, page);
        
        if (key === 'partners') {
            const items = state.partners;
            if (!items) return;
            const totalPages = Math.ceil(items.length / 10);
            if (page < 1 || page > totalPages) return;

            state.partnersCurrentPage = page;
            loadPartnersTable();
            
            // 페이지 변경 시 상단으로 스크롤
            const container = document.querySelector('.container-fluid');
            if (container) {
                container.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };
} 