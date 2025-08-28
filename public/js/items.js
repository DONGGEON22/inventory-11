// 품목 관리 모듈
import { state, getCurrentCompanyBusinessNumber, saveCompanyState } from './main.js';
import { showLoading, hideLoading, showToast, showModal, formatCurrency, generateId, renderPagination, waitForMainContent } from './ui.js';

export function loadItems() {
    // DOM이 준비될 때까지 안전하게 대기
    waitForMainContent()
        .then(mainContent => {
            const content = `
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">품목 관리</h5>
                        <div>
                            <button class="btn btn-excel me-2" onclick="showItemBulkUploadModal()">
                                <i class='bx bx-spreadsheet'></i> 엑셀 업로드
                            </button>
                            <button class="btn btn-primary" onclick="showItemModal()">
                                <i class='bx bx-plus'></i> 품목 등록
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="table-container">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead class="table-light sticky-top">
                                        <tr>
                                            <th style="width: 12%">품목코드</th>
                                            <th style="width: 35%">품목명</th>
                                            <th style="width: 8%">단위</th>
                                            <th style="width: 10%">과세유형</th>
                                            <th style="width: 12%">기준단가</th>
                                            <th style="width: 8%">활동여부</th>
                                            <th style="width: 15%">관리</th>
                                        </tr>
                                    </thead>
                                    <tbody id="itemsTableBody">
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div id="pagination-container" class="d-flex justify-content-center mt-3"></div>
                    </div>
                </div>
            `;

            mainContent.innerHTML = content;
            loadItemsTable();
            initItemsTab(); // 전역 함수 등록
            hideLoading();
        })
        .catch(error => {
            console.error('품목 관리 페이지 로드 실패:', error);
            hideLoading();
            showToast('페이지 로드 중 오류가 발생했습니다.', 'error');
        });
}

export function loadItemsTable() {
    const tbody = document.getElementById('itemsTableBody');
    if (!tbody) return;

    const page = state.itemsCurrentPage || 1;
    const itemsPerPage = 10;
    const totalItems = state.items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    console.log('loadItemsTable 호출됨:', {
        page,
        totalItems,
        totalPages,
        startIndex,
        endIndex,
        itemsPerPage
    });

    const pagedItems = state.items.slice(startIndex, endIndex);

    tbody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    pagedItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td title="${item.code || '-'}">${item.code || '-'}</td>
            <td title="${item.name}">${item.name}</td>
            <td title="${item.unit || '-'}">${item.unit || '-'}</td>
            <td title="${item.taxType || '-'}">${item.taxType || '-'}</td>
            <td title="${item.standardPrice ? formatCurrency(item.standardPrice) : '-'}">${item.standardPrice ? formatCurrency(item.standardPrice) : '-'}</td>
            <td title="${item.active === 'Y' ? '활성' : '비활성'}">${item.active === 'Y' ? '활성' : '비활성'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editItem('${item.id}')">
                    <i class='bx bx-edit'></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteItem('${item.id}')">
                    <i class='bx bx-trash'></i>
                </button>
            </td>
        `;
        fragment.appendChild(row);
    });

    tbody.appendChild(fragment);

    renderPagination('items', totalPages, page);
}

export function showItemModal(itemId = null) {
    // 현재 페이지 상태를 items로 설정
    state.currentPage = 'items';
    
    const item = itemId ? state.items.find(i => i.id === itemId) : null;
    const isEdit = !!item;
    
    const content = `
        <form id="itemForm">
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">품목코드</label>
                        <input type="text" class="form-control" name="code" value="${item ? item.code : ''}" placeholder="자동 생성">
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">품목명 <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" name="name" value="${item ? item.name : ''}" required>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">단위 <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" name="unit" value="${item ? item.unit : ''}" placeholder="예: 개, EA, kg, 박스, 세트 등" required>
                        <div class="form-text">자유롭게 단위를 입력하세요 (예: 개, EA, kg, 박스, 세트, 롤, 장, 벌, 켤레, 통, 병, 캔, 팩, 봉, 포 등)</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">과세유형 <span class="text-danger">*</span></label>
                        <select class="form-control" name="taxType" required>
                            <option value="">선택하세요</option>
                            <option value="과세" ${item && item.taxType === '과세' ? 'selected' : ''}>과세</option>
                            <option value="면세" ${item && item.taxType === '면세' ? 'selected' : ''}>면세</option>
                            <option value="영세" ${item && item.taxType === '영세' ? 'selected' : ''}>영세</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">기준단가</label>
                        <input type="number" class="form-control" name="standardPrice" value="${item ? (item.standardPrice || '') : ''}" placeholder="기준단가를 입력하세요" min="0" step="0.01">
                        <div class="form-text">매입/매출 등록 시 자동으로 표시되는 기준단가입니다.</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">활동여부 <span class="text-danger">*</span></label>
                        <select class="form-control" name="active" required>
                            <option value="Y" ${item && item.active === 'Y' ? 'selected' : ''}>활성</option>
                            <option value="N" ${item && item.active === 'N' ? 'selected' : ''}>비활성</option>
                        </select>
                    </div>
                </div>
            </div>
        </form>
    `;
    
    showModal(isEdit ? '품목 수정' : '품목 추가', content);
    
    // 모달 버튼 표시 및 텍스트 변경
    const saveBtn = document.getElementById('modalSaveBtn');
    if (saveBtn) {
        saveBtn.style.display = 'block';
        saveBtn.textContent = isEdit ? '수정' : '저장';
    }
    
    // 전역 함수로 설정 - itemId를 명시적으로 전달
    window.currentEditingItemId = itemId; // 전역 변수로 현재 편집 중인 itemId 저장
    
    // main.js의 모달 저장 버튼 이벤트와 호환되도록 설정
    window.saveItem = () => saveItem(window.currentEditingItemId);
}

export function saveItem(itemId = null) {
    // 현재 페이지가 items가 아닌 경우 실행하지 않음
    if (state.currentPage !== 'items') {
        console.log('saveItem 호출됨 but currentPage is:', state.currentPage);
        return;
    }
    
    const form = document.getElementById('itemForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const itemData = {
        name: formData.get('name'),
        code: formData.get('code') || generateId().substring(0, 8), // code 필드 추가
        unit: formData.get('unit'),
        taxType: formData.get('taxType'),
        standardPrice: parseFloat(formData.get('standardPrice')) || null,
        active: formData.get('active')
    };
    
    if (!itemData.name || !itemData.unit || !itemData.taxType || !itemData.active) {
        alert('품목명, 단위, 과세유형, 활동여부는 필수입니다.');
        return;
    }
    
    if (itemId) {
        // 수정
        const index = state.items.findIndex(i => i.id === itemId);
        if (index !== -1) {
            const originalItem = state.items[index];
            const updatedItem = { ...originalItem, ...itemData, updatedAt: new Date().toISOString() };
            
            // Firestore 수정 (올바른 경로: companies/{companyId}/items/{itemCode})
            let businessNumber;
            try {
                businessNumber = getCurrentCompanyBusinessNumber();
            } catch (error) {
                console.error('getCurrentCompanyBusinessNumber 함수 호출 오류:', error);
                // 대안: localStorage에서 직접 가져오기
                if (window.localStorage) {
                    businessNumber = window.localStorage.getItem('loginBusinessNumber') || 
                                   window.localStorage.getItem('adminViewingBusinessNumber');
                }
            }
            if (businessNumber) {
                try {
                    // Firebase가 전역으로 로드되어 있는지 확인
                    if (window.firebase && window.firebase.firestore) {
                        const db = window.firebase.firestore();
                        db.collection('companies')
                            .doc(businessNumber)
                            .collection('items')
                            .doc(itemData.code)
                            .set(updatedItem)
                            .then(() => {
                                console.log('Firestore 품목 수정 성공:', itemData.code);
                                // 성공 시에만 UI 업데이트
                                state.items[index] = updatedItem;
                                saveCompanyState();
                                
                                showToast('수정되었습니다.');
                                
                                // 모달 닫기
                                const modal = bootstrap.Modal.getInstance(document.getElementById('commonModal'));
                                if (modal) {
                                    modal.hide();
                                }
                                
                                // 테이블 새로고침
                                loadItemsTable();
                            })
                            .catch(e => {
                                console.error('Firestore 품목 수정 오류:', e);
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
        } else {
            console.error('수정할 아이템을 찾을 수 없음 - itemId:', itemId);
            showToast('수정할 품목을 찾을 수 없습니다.');
            return;
        }
    } else {
        // 추가
        itemData.id = generateId();
        itemData.createdAt = new Date().toISOString();
        
        // Firestore 추가 (올바른 경로: companies/{companyId}/items/{itemCode})
        let businessNumber;
        try {
            businessNumber = getCurrentCompanyBusinessNumber();
        } catch (error) {
            console.error('getCurrentCompanyBusinessNumber 함수 호출 오류:', error);
            // 대안: localStorage에서 직접 가져오기
            if (window.localStorage) {
                businessNumber = window.localStorage.getItem('loginBusinessNumber') || 
                               window.localStorage.getItem('adminViewingBusinessNumber');
            }
        }
        if (businessNumber) {
            try {
                // Firebase가 전역으로 로드되어 있는지 확인
                if (window.firebase && window.firebase.firestore) {
                    const db = window.firebase.firestore();
                    db.collection('companies')
                        .doc(businessNumber)
                        .collection('items')
                        .doc(itemData.code)
                        .set(itemData)
                        .then(() => {
                            console.log('Firestore 품목 추가 성공:', itemData.code);
                            // 성공 시에만 UI 업데이트
                            state.items.push(itemData);
                            saveCompanyState();
                            
                            showToast('등록되었습니다.');
                            
                            // 모달 닫기
                            const modal = bootstrap.Modal.getInstance(document.getElementById('commonModal'));
                            if (modal) {
                                modal.hide();
                            }
                            
                            // 테이블 새로고침
                            loadItemsTable();
                        })
                        .catch(e => {
                            console.error('Firestore 품목 추가 오류:', e);
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
}

export function editItem(itemId) {
    showItemModal(itemId);
}

export function deleteItem(itemId) {
    if (confirm('정말로 이 품목을 삭제하시겠습니까?')) {
        const itemToDelete = state.items.find(item => item.id === itemId);
        if (!itemToDelete) {
            showToast('삭제할 품목을 찾을 수 없습니다.', 'error');
            return;
        }
        
        // Firestore 삭제 (올바른 경로: companies/{companyId}/items/{itemCode})
        let businessNumber;
        try {
            businessNumber = getCurrentCompanyBusinessNumber();
        } catch (error) {
            console.error('getCurrentCompanyBusinessNumber 함수 호출 오류:', error);
            // 대안: localStorage에서 직접 가져오기
            if (window.localStorage) {
                businessNumber = window.localStorage.getItem('loginBusinessNumber') || 
                               window.localStorage.getItem('adminViewingBusinessNumber');
            }
        }
        if (businessNumber) {
            try {
                // Firebase가 전역으로 로드되어 있는지 확인
                if (window.firebase && window.firebase.firestore) {
                    const db = window.firebase.firestore();
                    db.collection('companies')
                        .doc(businessNumber)
                        .collection('items')
                        .doc(itemToDelete.code)
                        .delete()
                        .then(() => {
                            console.log('Firestore 품목 삭제 성공:', itemToDelete.code);
                            // 성공 시에만 UI 업데이트
                            state.items = state.items.filter(item => item.id !== itemId);
                            saveCompanyState();
                            loadItemsTable();
                            showToast('삭제되었습니다. 파이어베이스 DB에서도 삭제가 되어야하고 웹앱에서 삭제되었습니다.');
                        })
                        .catch(e => {
                            console.error('Firestore 품목 삭제 오류:', e);
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

export function filterItems() {
    const searchInput = document.getElementById('itemSearchInput');
    const searchTerm = searchInput.value.toLowerCase();
    
    const items = state.items || [];
    const filteredItems = items.filter(item => 
        (item.code && item.code.toLowerCase().includes(searchTerm)) ||
        (item.name && item.name.toLowerCase().includes(searchTerm))
    );
    
    // 검색 결과를 테이블에 표시
    const container = document.getElementById('itemsTableContainer');
    
    if (filteredItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class='bx bx-search'></i>
                </div>
                <h4>검색 결과가 없습니다</h4>
                <p class="text-muted">다른 검색어를 입력해보세요</p>
            </div>
        `;
    } else {
        const tableHTML = `
            <div class="table-responsive">
                <table class="table table-hover items-table">
                    <thead>
                        <tr>
                            <th class="table-header-cell">
                                <i class='bx bx-hash'></i> 품목코드
                            </th>
                            <th class="table-header-cell">
                                <i class='bx bx-box'></i> 품목명
                            </th>
                            <th class="table-header-cell">
                                <i class='bx bx-ruler'></i> 규격
                            </th>
                            <th class="table-header-cell">
                                <i class='bx bx-category'></i> 단위
                            </th>
                            <th class="table-header-cell">
                                <i class='bx bx-dollar-circle'></i> 기본단가
                            </th>
                            <th class="table-header-cell text-center">
                                <i class='bx bx-cog'></i> 관리
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredItems.map(item => `
                            <tr class="item-row">
                                <td>
                                    <span class="item-code">${item.code || '-'}</span>
                                </td>
                                <td>
                                    <div class="item-name">
                                        <strong>${item.name}</strong>
                                    </div>
                                </td>
                                <td>
                                    <span class="item-spec">${item.specification || '-'}</span>
                                </td>
                                <td>
                                    <span class="item-unit">${item.unit}</span>
                                </td>
                                <td>
                                    <span class="item-price">${formatCurrency(item.basePrice)}</span>
                                </td>
                                <td class="text-center">
                                    <div class="action-buttons">
                                        <button class="btn btn-sm btn-outline-primary action-btn" 
                                                onclick="editItem('${item.id}')" 
                                                title="수정">
                                            <i class='bx bx-edit'></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger action-btn" 
                                                onclick="deleteItem('${item.id}')" 
                                                title="삭제">
                                            <i class='bx bx-trash'></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = tableHTML;
    }
}

export function exportItems() {
    if (!state.items || state.items.length === 0) {
        showToast('내보낼 품목이 없습니다.');
        return;
    }
    
    // 엑셀 데이터 준비
    const excelData = state.items.map(item => ({
        '품목코드': item.code || '',
        '품목명': item.name || '',
        '규격': item.specification || '',
        '단위': item.unit || '',
        '기본단가': item.basePrice || 0
    }));
    
    // 워크시트 생성
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '품목목록');
    
    // 파일 다운로드
    const fileName = `품목목록_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
            showToast('품목 목록이 엑셀 파일로 다운로드되었습니다.');
}

export function downloadItemTemplate() {
    try {
        // XLSX 라이브러리 확인
        if (typeof XLSX === 'undefined') {
            alert('XLSX 라이브러리가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
            return;
        }
        
        // 헤더만 포함한 템플릿 데이터 (예시 데이터 제거)
        const templateData = [
            {
                '품목코드*': '',
                '품목명*': '',
                '별칭': '',
                '규격': '',
                '단위*': '',
                '과세유형*': '',
                '구매가': '',
                '판매가': '',
                '기타사항': '',
                '활성여부*': ''
            }
        ];
        
        // 워크시트 생성
        const ws = XLSX.utils.json_to_sheet(templateData);
        
        // 필수 컬럼과 선택 컬럼 정의
        const requiredColumns = ['품목코드*', '품목명*', '단위*', '과세유형*', '활성여부*'];
        const optionalColumns = ['별칭', '규격', '구매가', '판매가', '기타사항'];
        
        // 헤더 행 스타일 설정 (A1:J1)
        if (!ws['!cols']) ws['!cols'] = [];
        if (!ws['!rows']) ws['!rows'] = [];
        
        // 필수 컬럼에 스타일 적용 (배경색 + 굵은 글씨)
        requiredColumns.forEach((col, index) => {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
            if (!ws[cellRef]) {
                ws[cellRef] = { v: col, t: 's' };
            }
            
            // 필수 컬럼 스타일: 연한 빨간색 배경 + 굵은 글씨
            ws[cellRef].s = {
                font: {
                    color: { rgb: '000000' }, // 검은색 글씨
                    bold: true // 굵은 글씨
                },
                fill: {
                    fgColor: { rgb: 'FFE5E5' } // 연한 빨간색 배경
                }
            };
        });
        
        // 선택 컬럼에 기본 서식 적용
        optionalColumns.forEach((col, index) => {
            const actualIndex = index + requiredColumns.length; // 필수 컬럼 다음부터
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: actualIndex });
            if (!ws[cellRef]) {
                ws[cellRef] = { v: col, t: 's' };
            }
            
            // 기본 서식 적용 (선택 컬럼)
            ws[cellRef].s = {
                font: {
                    color: { rgb: '000000' }, // 검은색
                    bold: false // 기본 굵기
                },
                fill: {
                    fgColor: { rgb: 'FFFFFF' } // 흰색 배경
                }
            };
        });
        

        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '품목등록양식');
        
        // 입력예시 시트 생성
        const exampleData = [
            {
                '품목코드': 'A001',
                '품목명': '샘플품목',
                '별칭': '샘플',
                '규격': '100x200',
                '단위': 'EA',
                '과세유형': '과세',
                '구매가': '1000',
                '판매가': '1500',
                '기타사항': '참고사항',
                '활성여부': '여'
            }
        ];
        
        const wsExample = XLSX.utils.json_to_sheet(exampleData);
        
        // 입력예시 시트 스타일 설정
        const exampleColumns = ['품목코드', '품목명', '별칭', '규격', '단위', '과세유형', '구매가', '판매가', '기타사항', '활동여부'];
        
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
                        fgColor: { rgb: 'E8F4FD' } // 연한 파란색 배경
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
            { cell: 'A4', text: '• 과세유형: 과세, 면세 중 택 1' },
            { cell: 'A5', text: '• 활동여부: 활성, 비활성 중 택 1' },
            { cell: 'A6', text: '• 단위: 자유 입력 (예: EA, kg, 박스, 개, 세트 등)' },
            { cell: 'A7', text: '• 구매가/판매가: 숫자만 입력 (예: 1000, 1500)' },
            { cell: 'A8', text: '• 품목코드: 중복되지 않는 고유한 코드 입력' }
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
        const fileName = `품목등록양식_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showToast('품목 등록 양식이 다운로드되었습니다.');
        
    } catch (error) {
        console.error('양식 다운로드 오류:', error);
        alert('양식 다운로드 중 오류가 발생했습니다: ' + error.message);
    }
}

export function showItemBulkUploadModal() {
    const content = `
        <div class="bulk-upload-container">
            <div class="alert alert-info">
                <h6><i class='bx bx-info-circle'></i> 엑셀 일괄등록 안내</h6>
                <ul class="mb-0">
                    <li>엑셀 파일에는 <strong>품목등록양식</strong>과 <strong>입력예시</strong> 두 개의 시트가 포함됩니다.</li>
                    <li><strong>업로드 시 품목등록양식 시트만 처리됩니다.</strong></li>
                    <li><strong>필수 컬럼 (연한 빨간색 배경, 굵은 글씨, 빨간색 * 표시):</strong> 품목코드*, 품목명*, 단위*, 과세유형*, 활성여부*</li>
                    <li><strong>선택 컬럼 (기본 서식):</strong> 별칭, 규격, 구매가, 판매가, 기타사항</li>
                    <li>컬럼명과 순서를 반드시 양식과 동일하게 맞춰주세요.</li>
                    <li>품목코드가 중복되는 경우 등록되지 않습니다.</li>
                    <li><strong>품목등록양식 시트의 첫 번째 행은 헤더이므로 두 번째 행부터 데이터를 입력하세요.</strong></li>
                    <li><strong>입력예시 시트에서 입력 규칙을 확인한 후 품목등록양식 시트에 데이터를 입력하세요.</strong></li>
                </ul>
            </div>
            
            <div class="d-flex justify-content-end mb-3">
                <button class="btn btn-success btn-sm" onclick="downloadItemTemplate()">
                    <i class='bx bx-download'></i> 엑셀 양식 다운로드
                </button>
            </div>
            
            <div class="mb-3">
                <label class="form-label">엑셀 파일 선택</label>
                <input type="file" class="form-control" id="bulkUploadFile" accept=".xlsx,.xls" onchange="handleItemBulkUpload(event)">
                <div class="form-text">지원 형식: .xlsx, .xls</div>
            </div>
            
            <div id="uploadPreview" class="mt-3" style="display: none;">
                <h6>업로드 미리보기</h6>
                <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
                    <table class="table table-sm table-bordered">
                        <thead class="table-light sticky-top">
                            <tr>
                                <th>품목코드</th>
                                <th>품목명</th>
                                <th>별칭</th>
                                <th>규격</th>
                                <th>단위</th>
                                <th>과세유형</th>
                                <th>구매가</th>
                                <th>판매가</th>
                                <th>기타사항</th>
                                <th>활성여부</th>
                                <th>상태</th>
                            </tr>
                        </thead>
                        <tbody id="uploadPreviewBody"></tbody>
                    </table>
                </div>
                <div class="mt-3">
                    <button class="btn btn-primary" onclick="confirmItemBulkUpload()">
                        <i class='bx bx-check'></i> 일괄등록 실행
                    </button>
                    <button class="btn btn-secondary ms-2" onclick="cancelItemBulkUpload()">
                        <i class='bx bx-x'></i> 취소
                    </button>
                </div>
            </div>
        </div>
    `;
    
    showModal('품목 엑셀 일괄등록', content);
    
    // 모달 저장 버튼 숨기기 (일괄등록에서는 불필요)
    const saveBtn = document.getElementById('modalSaveBtn');
    if (saveBtn) {
        saveBtn.style.display = 'none';
    }
}

export function handleItemBulkUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // 품목등록양식 시트 찾기 (입력예시 시트는 무시)
            let worksheet = null;
            let sheetName = '';
            
            for (const sheetName of workbook.SheetNames) {
                if (sheetName === '품목등록양식') {
                    worksheet = workbook.Sheets[sheetName];
                    break;
                }
            }
            
            // 품목등록양식 시트가 없으면 첫 번째 시트 사용
            if (!worksheet) {
                worksheet = workbook.Sheets[workbook.SheetNames[0]];
                sheetName = workbook.SheetNames[0];
            } else {
                sheetName = '품목등록양식';
            }
            
            const json = XLSX.utils.sheet_to_json(worksheet);

            if (json.length === 0) {
                alert('엑셀 파일에 데이터가 없습니다.');
                return;
            }

            // 기존 품목 코드 목록 (중복 체크용)
            const existingItemCodes = new Set(
                state.items.map(item => item.code)
            );

            // 데이터 처리 및 미리보기 생성
            const processedData = [];
            let validCount = 0;
            let duplicateCount = 0;
            let invalidCount = 0;

            json.forEach((row, index) => {
                // * 표시가 포함된 컬럼명과 일반 컬럼명 모두 처리
                const itemCode = row['품목코드*'] || row['품목코드'] || '';
                const itemName = row['품목명*'] || row['품목명'] || '';
                const alias = row['별칭'] || '';
                const specification = row['규격'] || '';
                const unit = row['단위*'] || row['단위'] || '';
                const taxType = row['과세유형*'] || row['과세유형'] || '';
                const purchasePrice = row['구매가'] || 0;
                const salesPrice = row['판매가'] || 0;
                const etc = row['기타사항'] || '';
                const activeRaw = row['활성여부*'] || row['활성여부'] || row['활동여부*'] || row['활동여부'] || '여';
                // "여"는 활성, "부"는 비활성으로 변환
                const active = (activeRaw === '여' || activeRaw === 'Y' || activeRaw === '활성') ? 'Y' : 'N';

                let status = 'valid';
                let statusText = '등록 가능';
                let statusClass = 'text-success';

                // 유효성 검사
                if (!itemCode || !itemName || !unit) {
                    status = 'invalid';
                    statusText = '필수 정보 누락';
                    statusClass = 'text-danger';
                    invalidCount++;
                } else if (existingItemCodes.has(itemCode)) {
                    status = 'duplicate';
                    statusText = '중복 (기존 등록)';
                    statusClass = 'text-warning';
                    duplicateCount++;
                } else {
                    validCount++;
                    existingItemCodes.add(itemCode); // 중복 방지를 위해 추가
                }

                processedData.push({
                    itemCode,
                    itemName,
                    alias,
                    specification,
                    unit,
                    taxType,
                    purchasePrice,
                    salesPrice,
                    etc,
                    active,
                    status,
                    statusText,
                    statusClass
                });
            });

            // 미리보기 표시
            const previewBody = document.getElementById('uploadPreviewBody');
            previewBody.innerHTML = processedData.map(item => `
                <tr>
                    <td>${item.itemCode}</td>
                    <td>${item.itemName}</td>
                    <td>${item.alias}</td>
                    <td>${item.specification}</td>
                    <td>${item.unit}</td>
                    <td>${item.taxType}</td>
                    <td>${item.purchasePrice}</td>
                    <td>${item.salesPrice}</td>
                    <td>${item.etc}</td>
                    <td>${item.active === 'Y' ? '여' : '부'}</td>
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

export function confirmItemBulkUpload() {
    if (!window.bulkUploadData || window.bulkUploadData.length === 0) {
        alert('등록할 데이터가 없습니다.');
        return;
    }

    if (confirm(`총 ${window.bulkUploadData.length}개의 품목을 등록하시겠습니까?`)) {
        showLoading('품목을 등록하는 중...');
        
        // 비동기로 처리하여 UI 블로킹 방지
        setTimeout(() => {
            let addedCount = 0;
            
            window.bulkUploadData.forEach(item => {
                const newItem = {
                    id: generateId(),
                    code: item.itemCode,
                    name: item.itemName,
                    alias: item.alias,
                    specification: item.specification,
                    unit: item.unit,
                    taxType: item.taxType,
                    purchasePrice: parseFloat(item.purchasePrice) || 0,
                    salesPrice: parseFloat(item.salesPrice) || 0,
                    etc: item.etc,
                    active: item.active,
                    createdAt: new Date().toISOString()
                };
                
                state.items.push(newItem);
                addedCount++;
            });

            saveCompanyState();
            const commonModal = bootstrap.Modal.getInstance(document.getElementById('commonModal'));
            if (commonModal) {
                commonModal.hide();
            }
            
            loadItemsTable();
            
            hideLoading();
            showToast(`${addedCount}개 등록되었습니다.`);
            
            // 전역 변수 정리
            window.bulkUploadData = null;
        }, 100);
    }
}

export function cancelItemBulkUpload() {
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

export function importItems() {
    // 엑셀 파일 업로드 기능 (향후 구현)
    showToast('엑셀 업로드 기능은 준비 중입니다.');
}

export function changePage(key, page) {
    console.log('items changePage 호출됨:', key, page);
    
    if (key === 'items') {
        console.log('품목 페이지 변경:', state.itemsCurrentPage, '→', page);
        state.itemsCurrentPage = page;
        loadItemsTable();
        
        // 페이지 변경 시 상단으로 스크롤
        const container = document.querySelector('.container-fluid');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth' });
        }
    } else {
        console.log('items changePage에서 알 수 없는 키:', key);
    }
}

export function initItemsTab() {
    // 품목 탭 초기화 로직
    console.log('품목 탭이 초기화되었습니다.');
    
    // 전역 함수로 등록
    window.showItemModal = showItemModal;
    window.saveItem = saveItem;
    window.editItem = editItem;
    window.deleteItem = deleteItem;
    window.filterItems = filterItems;
    window.exportItems = exportItems;
    window.importItems = importItems;
    window.downloadItemTemplate = downloadItemTemplate;
    window.showItemBulkUploadModal = showItemBulkUploadModal;
    window.handleItemBulkUpload = handleItemBulkUpload;
    window.confirmItemBulkUpload = confirmItemBulkUpload;
    window.cancelItemBulkUpload = cancelItemBulkUpload;
    window.changePage = changePage;
    
    console.log('전역 함수 등록 완료:', {
        changePage: typeof window.changePage,
        showItemModal: typeof window.showItemModal
    });
} 