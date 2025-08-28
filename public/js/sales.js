// 매출 관리 모듈
import { state, getCurrentCompanyBusinessNumber, saveCompanyData, isLoggedIn, navigateTo } from './main.js';
import { showLoading, hideLoading, showToast, showModal, createSearchableDropdown, formatCurrency, generateId, updateTotals, waitForMainContent, closeModal, createTransactionModalHTML, addTransactionRow, setupTransactionModal } from './ui.js';
import { logAccess } from './firestore-helper.js';

// 페이지네이션 상태
let currentSalesPage = 1;
const itemsPerSalesPage = 15;

export function loadSales() {
    if (!isLoggedIn()) {
        navigateTo('login');
        return;
    }
    
    // 데이터 조회 로그 기록
    try {
        logAccess('VIEW_DATA', { page: 'sales', action: 'loadSales' });
    } catch (error) {
        console.error('매출 조회 로그 기록 실패:', error);
    }
    
    showLoading('매출 목록을 불러오는 중...');
    
    // DOM이 준비될 때까지 안전하게 대기
    waitForMainContent()
        .then(mainContent => {
            const content = `
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">매출 관리</h5>
                        <div>
                            <button class="btn btn-success me-2" id="downloadSalesExcelBtn">
                                <i class='bx bx-download'></i> 엑셀 다운로드
                            </button>
                        <button class="btn btn-primary" onclick="showSalesModal()">
                            <i class='bx bx-plus'></i> 매출 등록
                        </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th style="width: 4%"><input type="checkbox" id="salesCheckAll"></th>
                                        <th style="width: 8%">거래일자</th>
                                        <th style="width: 18%">출고처</th>
                                        <th style="width: 6%">구분</th>
                                        <th style="width: 20%">품목명</th>
                                        <th style="width: 6%">수량</th>
                                        <th style="width: 8%">단가</th>
                                        <th style="width: 8%">공급가액</th>
                                        <th style="width: 8%">세액</th>
                                        <th style="width: 12%">관리</th>
                                    </tr>
                                </thead>
                                <tbody id="salesTableBody">
                                </tbody>
                            </table>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <div class="text-muted">
                                총 <span id="salesTotalCount">0</span>개 중 
                                <span id="salesCurrentRange">0-0</span> 표시
                            </div>
                            <nav aria-label="매출 페이지네이션">
                                <ul class="pagination pagination-sm mb-0" id="salesPagination">
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            `;
            
            mainContent.innerHTML = content;
            loadSalesTable();
            hideLoading();

            // 엑셀 다운로드 버튼 이벤트
            document.getElementById('downloadSalesExcelBtn').addEventListener('click', downloadSelectedSalesExcel);
            // 전체 선택 체크박스 이벤트
            document.getElementById('salesCheckAll').addEventListener('change', function() {
                document.querySelectorAll('.sales-check').forEach(cb => { cb.checked = this.checked; });
            });
        })
        .catch(error => {
            console.error('매출 관리 페이지 로드 실패:', error);
            hideLoading();
            showToast('페이지 로드 중 오류가 발생했습니다.', 'error');
        });
}

export function loadSalesTable(page = 1) {
    currentSalesPage = page;
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '';

    // 전체 매출 데이터
    const allSales = state.sales;
    const totalCount = allSales.length;
    
    // 페이지네이션 계산
    const totalPages = Math.ceil(totalCount / itemsPerSalesPage);
    const startIndex = (page - 1) * itemsPerSalesPage;
    const endIndex = Math.min(startIndex + itemsPerSalesPage, totalCount);
    
    // 현재 페이지의 매출만 표시
    const currentPageSales = allSales.slice(startIndex, endIndex);

    currentPageSales.forEach(sale => {
        const partner = state.partners.find(p => p.businessNumber === sale.partner);
        const item = state.items.find(i => i.code === sale.item);
        let taxType = sale.taxType;
        if (!taxType) taxType = 'taxable';
        const taxTypeText = taxType === 'taxable' ? '과세' : (taxType === 'taxFree' ? '면세' : '');
        
        // 공급가액과 세액 계산
        const supplyAmount = sale.supplyAmount || (sale.totalAmount ? sale.totalAmount / 1.1 : 0);
        const taxAmount = sale.taxAmount || (sale.totalAmount ? sale.totalAmount - supplyAmount : 0);
        
        const row = `
            <tr>
                <td><input type="checkbox" class="sales-check" value="${sale.id}"></td>
                <td title="${sale.date}">${sale.date}</td>
                <td title="${partner ? partner.name : 'Unknown'}">${partner ? partner.name : 'Unknown'}</td>
                <td title="${taxTypeText}">${taxTypeText}</td>
                <td title="${item ? item.name : 'Unknown'}">${item ? item.name : 'Unknown'}</td>
                <td title="${sale.quantity}">${sale.quantity}</td>
                <td title="${formatCurrency(sale.price)}">${formatCurrency(sale.price)}</td>
                <td title="${formatCurrency(supplyAmount)}">${formatCurrency(supplyAmount)}</td>
                <td title="${formatCurrency(taxAmount)}">${formatCurrency(taxAmount)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editSale('${sale.id}')">
                        <i class='bx bx-edit'></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteSale('${sale.id}')">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
    
    // 페이지네이션 정보 업데이트
    updateSalesPaginationInfo(totalCount, startIndex + 1, endIndex);
    
    // 페이지네이션 버튼 생성
    createSalesPagination(totalPages, page);
}

function updateSalesPaginationInfo(totalCount, start, end) {
    const totalCountEl = document.getElementById('salesTotalCount');
    const currentRangeEl = document.getElementById('salesCurrentRange');
    
    if (totalCountEl) totalCountEl.textContent = totalCount;
    if (currentRangeEl) currentRangeEl.textContent = `${start}-${end}`;
}

function createSalesPagination(totalPages, currentPage) {
    const paginationEl = document.getElementById('salesPagination');
    if (!paginationEl) return;
    
    paginationEl.innerHTML = '';
    
    // 이전 페이지 버튼
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="loadSalesPage(${currentPage - 1})">이전</a>`;
    paginationEl.appendChild(prevLi);
    
    // 페이지 번호 버튼들
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="loadSalesPage(${i})">${i}</a>`;
        paginationEl.appendChild(li);
    }
    
    // 다음 페이지 버튼
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="loadSalesPage(${currentPage + 1})">다음</a>`;
    paginationEl.appendChild(nextLi);
}

// 전역 함수로 등록
window.loadSalesPage = function(page) {
    if (page < 1) return;
    const totalPages = Math.ceil(state.sales.length / itemsPerSalesPage);
    if (page > totalPages) return;
    loadSalesTable(page);
};

export function downloadSelectedSalesExcel() {
    const checked = Array.from(document.querySelectorAll('.sales-check:checked')).map(cb => cb.value);
    if (checked.length === 0) {
        alert('다운로드할 거래를 선택하세요.');
        return;
    }

    const headers = [
        '출고일자', '구분', '거래처명', '사업자번호', '부가세구분', '프로젝트/현장', '창고', '품목월일',
        '품목코드', '품목명', '규격', '수량', '단위', '단가', '매출금액', '세액'
    ];

    const rows = checked.map(id => {
        const s = state.sales.find(x => x.id === id);
        if (!s) return Array(headers.length).fill('');
        const partner = state.partners.find(x => x.businessNumber === s.partner);
        const item = state.items.find(x => x.code === s.item);
        return [
            s.date || '', // 출고일자
            '', // 구분
            partner ? partner.name : '', // 거래처명
            partner ? partner.businessNumber : '', // 사업자번호
            s.taxType === 'taxable' ? '과세' : (s.taxType === 'taxFree' ? '면세' : ''), // 부가세구분
            '', // 프로젝트/현장
            '', // 창고
            s.date || '', // 품목월일
            item ? item.code : '', // 품목코드
            item ? item.name : '', // 품목명
            '', // 규격
            s.quantity || '', // 수량
            item ? item.unit : '', // 단위
            s.price || '', // 단가
            s.supplyAmount || '', // 매출금액
            s.taxAmount || '' // 세액
        ];
    });

    if (window.XLSX) {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '매출내역');
        XLSX.writeFile(wb, '매출내역.xlsx');
    } else {
        let csv = headers.join(',') + '\n';
        rows.forEach(r => { csv += r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',') + '\n'; });
        const blob = new Blob([csv], {type: 'text/csv'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '매출내역.csv';
        a.click();
    }
}

export function showSalesModal(saleToEdit = null) {
    // 현재 페이지 상태를 sales로 설정
    state.currentPage = 'sales';
    window.isSavingSales = false;
    
    // 1. 품목이 없으면 안내 메시지 표시 후 종료
    if (!state.items || state.items.length === 0) {
        showModal('매출 등록', `
            <div class="alert alert-warning text-center my-4">
                매출 등록을 위해 먼저 <b>품목</b>을 등록해 주세요.
            </div>
        `);
        // 등록/수정 버튼 숨기기
        const saveBtn = document.getElementById('modalSaveBtn');
        if(saveBtn) saveBtn.style.display = 'none';
        return;
    }

    const isEdit = saleToEdit !== null;
    const config = {
        isEdit,
        title: isEdit ? '매출 수정' : '매출 등록',
        partnerLabel: '출고처',
        data: saleToEdit
    };

    // 2. 공통 모달 HTML 생성
    const modalContent = createTransactionModalHTML(config);
    showModal(config.title, modalContent);
    
    // 3. 공통 모달 설정
    setupTransactionModal(config, updateSalesTotals, saveSales);
    
    window.editingSaleId = isEdit ? saleToEdit.id : null; // 호환성을 위해 유지
}

/**
 * 매출 모달의 실시간 계산 함수
 */
function updateSalesTotals() {
    const supplyAmountEl = document.getElementById('supplyAmount');
    const taxAmountEl = document.getElementById('taxAmount');
    const totalAmountEl = document.getElementById('totalAmount');
    
    if (!supplyAmountEl || !taxAmountEl || !totalAmountEl) return;
    
    let totalSupplyAmount = 0;
    let totalTaxAmount = 0;
    
    // 모든 품목 행을 순회하며 계산
    const itemRows = document.querySelectorAll('#salesItemsBody tr');
    itemRows.forEach(row => {
        const quantityInput = row.querySelector('.quantityInput');
        const priceInput = row.querySelector('.priceInput');
        const taxTypeSelect = row.querySelector('.taxTypeSelect');
        const rowSumEl = row.querySelector('.rowSum');
        
        if (quantityInput && priceInput && taxTypeSelect) {
            const quantity = parseFloat(quantityInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const taxType = taxTypeSelect.value;
            
            const rowSupplyAmount = quantity * price;
            totalSupplyAmount += rowSupplyAmount;
            
            // 행별 합계 업데이트
            if (rowSumEl) {
                rowSumEl.textContent = formatCurrency(rowSupplyAmount);
            }
            
            // 부가세 계산
            let taxRate = 0;
            if (taxType === 'taxable') {
                taxRate = 0.1; // 10% VAT
            }
            
            const rowTaxAmount = rowSupplyAmount * taxRate;
            totalTaxAmount += rowTaxAmount;
        }
    });
    
    const totalAmount = totalSupplyAmount + totalTaxAmount;
    
    // 요약 영역 업데이트
    if (totalSupplyAmount > 0) {
        supplyAmountEl.textContent = formatCurrency(totalSupplyAmount);
        taxAmountEl.textContent = formatCurrency(totalTaxAmount);
        totalAmountEl.textContent = formatCurrency(totalAmount);
    } else {
        supplyAmountEl.textContent = '-';
        taxAmountEl.textContent = '-';
        totalAmountEl.textContent = '-';
    }
}

export function deleteSale(id) {
    if (confirm('정말로 이 매출을 삭제하시겠습니까?')) {
        const saleToDelete = state.sales.find(s => s.id === id);
        if (!saleToDelete) {
            showToast('삭제할 매출을 찾을 수 없습니다.', 'error');
            return;
        }
        
        console.log('매출 삭제 시작:', { id, saleToDelete });
        
        // Firestore 삭제 (올바른 경로: companies/{companyId}/sales/{saleId})
        const businessNumber = getCurrentCompanyBusinessNumber();
        if (businessNumber) {
            try {
                // Firebase가 전역으로 로드되어 있는지 확인
                if (window.firebase && window.firebase.firestore) {
                    const db = window.firebase.firestore();
                    const docRef = db.collection('companies')
                        .doc(businessNumber)
                        .collection('sales')
                        .doc(id);
                    
                    console.log('Firestore 삭제 경로:', `companies/${businessNumber}/sales/${id}`);
                    
                    // 먼저 문서가 존재하는지 확인
                    docRef.get().then((doc) => {
                        if (doc.exists) {
                            console.log('삭제할 문서가 존재합니다:', doc.data());
                            
                            // 문서 삭제
                            return docRef.delete();
                        } else {
                            console.log('삭제할 문서가 존재하지 않습니다:', id);
                            // Firestore에 문서가 없어도 UI에서는 삭제 진행
                            console.log('Firestore에 문서가 없지만 UI에서 삭제를 진행합니다.');
                            return Promise.resolve();
                        }
                    }).then(() => {
                        console.log('매출 삭제 성공:', id);
                        
                        // UI 업데이트 (Firestore 성공 여부와 관계없이)
                        state.sales = state.sales.filter(s => s.id !== id);
                        saveCompanyData(businessNumber);
                        
                        // 페이지네이션 고려하여 테이블 다시 로드
                        const totalPages = Math.ceil(state.sales.length / itemsPerSalesPage);
                        if (currentSalesPage > totalPages && totalPages > 0) {
                            loadSalesTable(totalPages);
                        } else {
                            loadSalesTable(currentSalesPage);
                        }
                        
                        showToast('삭제되었습니다.');
                    }).catch(e => {
                        console.error('매출 삭제 오류:', e);
                        
                        // 오류가 발생해도 UI에서는 삭제 진행
                        state.sales = state.sales.filter(s => s.id !== id);
                        saveCompanyData(businessNumber);
                        
                        // 페이지네이션 고려하여 테이블 다시 로드
                        const totalPages = Math.ceil(state.sales.length / itemsPerSalesPage);
                        if (currentSalesPage > totalPages && totalPages > 0) {
                            loadSalesTable(totalPages);
                        } else {
                            loadSalesTable(currentSalesPage);
                        }
                        
                        showToast('삭제되었습니다. (Firestore 오류가 있었지만 UI에서는 제거됨)');
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

export function editSale(id) {
    const sale = state.sales.find(s => s.id === id);
    if (sale) {
        window.editingSaleId = id;
        showSalesModal(sale);
    }
}

// ✅ saveSales 함수를 통합된 버전으로 교체
export async function saveSales() {
    if (window.isSavingSales) return;
    window.isSavingSales = true;

    const saveButton = document.querySelector('#commonModal .btn-primary');
    if (saveButton) {
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> 처리 중...';
    }

    const editingId = window.editingSaleId;
    const businessNumber = getCurrentCompanyBusinessNumber();

    // --- 공통 데이터 추출 ---
    const dateInput = document.getElementById('transactionDate');
    const date = dateInput ? dateInput.value : '';
    const partner = window.selectedPartnerBusinessNumber;

    if (!date || !partner || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        alert('거래일자와 출고처를 올바르게 입력해주세요.');
        if(saveButton) { 
            saveButton.disabled = false; 
            saveButton.innerHTML = editingId ? '<i class="bx bx-edit"></i> 수정' : '<i class="bx bx-save"></i> 등록'; 
        }
        window.isSavingSales = false;
        return;
    }
    
    // --- 로직 분기: 수정(edit) vs 생성(new) ---
    if (editingId) {
        // --- 🖋️ 수정 로직 ---
        const index = state.sales.findIndex(s => s.id === editingId);
        if (index === -1) {
            alert('수정할 매출 항목을 찾을 수 없습니다.');
            if(saveButton) { 
                saveButton.disabled = false; 
                saveButton.innerHTML = '<i class="bx bx-edit"></i> 수정'; 
            }
            window.isSavingSales = false;
            return;
        }

        const tr = document.querySelector('#salesItemsBody tr');
        const quantity = Number(tr.querySelector('.quantityInput').value);
        const price = Number(tr.querySelector('.priceInput').value);
        const taxType = tr.querySelector('.taxTypeSelect').value;

        if (!quantity || price === undefined || price === null) {
            alert('수량과 단가를 올바르게 입력해주세요.');
            if(saveButton) { 
                saveButton.disabled = false; 
                saveButton.innerHTML = '<i class="bx bx-edit"></i> 수정'; 
            }
            window.isSavingSales = false;
            return;
        }

        const supplyAmount = quantity * price;
        const taxAmount = taxType === 'taxable' ? supplyAmount * 0.1 : 0;
        const totalAmount = supplyAmount + taxAmount;

        const updatedSale = {
            ...state.sales[index],
            date, partner, quantity, price, supplyAmount, taxAmount, totalAmount, taxType,
            updatedAt: new Date().toISOString()
        };

        // Firestore 업데이트
        if (window.firebase && window.firebase.firestore) {
            const db = window.firebase.firestore();
            const docRef = db.collection('companies')
                .doc(businessNumber)
                .collection('sales')
                .doc(editingId);
            
            docRef.update(updatedSale).then(() => {
                state.sales[index] = updatedSale;
                saveCompanyData(businessNumber);
                showToast('수정되었습니다.');
                closeModal();
                loadSalesTable(currentSalesPage);
            }).catch(e => {
                console.error('Firestore 수정 오류:', e);
                showToast('수정 중 오류가 발생했습니다.', 'error');
            }).finally(() => {
                window.editingSaleId = null;
                window.isSavingSales = false;
                if(saveButton) { 
                    saveButton.disabled = false; 
                    saveButton.innerHTML = '<i class="bx bx-edit"></i> 수정'; 
                }
            });
        } else {
            // Firebase가 없는 경우 localStorage만 저장
            state.sales[index] = updatedSale;
            saveCompanyData(businessNumber);
            showToast('수정되었습니다.');
            closeModal();
            loadSalesTable(currentSalesPage);
            window.editingSaleId = null;
            window.isSavingSales = false;
            if(saveButton) { 
                saveButton.disabled = false; 
                saveButton.innerHTML = '<i class="bx bx-edit"></i> 수정'; 
            }
        }

    } else {
        // --- ✨ 생성 로직 ---
        const items = [];
        let hasError = false;
        document.querySelectorAll('#salesItemsBody tr').forEach(tr => {
            const itemText = tr.querySelector('.itemSearch').value.trim();
            const codeMatch = itemText.match(/\(([^)]+)\)$/);
            const itemCode = codeMatch ? codeMatch[1] : '';
            const quantity = Number(tr.querySelector('.quantityInput').value);
            const price = Number(tr.querySelector('.priceInput').value);
            const taxType = tr.querySelector('.taxTypeSelect').value;
            
            if (!itemCode && !quantity && !price) return;
            if (!itemCode || !quantity || price === undefined || price === null) hasError = true;
            
            items.push({ item: itemCode, quantity, price, taxType });
        });

        if (hasError || items.length === 0) {
            alert('모든 품목의 품목, 수량, 단가를 올바르게 입력해주세요.');
            if(saveButton) { 
                saveButton.disabled = false; 
                saveButton.innerHTML = '<i class="bx bx-save"></i> 등록'; 
            }
            window.isSavingSales = false;
            return;
        }

        if (window.firebase && window.firebase.firestore) {
            const db = window.firebase.firestore();
            const batch = db.batch();
            const salesToAdd = items.map(({ item, quantity, price, taxType }) => {
                const supplyAmount = quantity * price;
                const taxAmount = taxType === 'taxable' ? supplyAmount * 0.1 : 0;
                const totalAmount = supplyAmount + taxAmount;
                const newSale = {
                    id: generateId(),
                    date, partner, item, quantity, price, supplyAmount, taxAmount, totalAmount, taxType,
                    createdAt: new Date().toISOString()
                };
                const docRef = db.collection('companies')
                    .doc(businessNumber)
                    .collection('sales')
                    .doc(newSale.id);
                batch.set(docRef, newSale);
                return newSale;
            });

            // Firestore에 일괄 저장
            batch.commit().then(async () => {
                state.sales.push(...salesToAdd);
                saveCompanyData(businessNumber);
                
                // 매출 생성 로그 기록
                try {
                    await logAccess('CREATE_DATA', {
                        page: 'sales',
                        action: 'createSales',
                        count: salesToAdd.length,
                        businessNumber: businessNumber
                    });
                } catch (error) {
                    console.error('매출 생성 로그 기록 실패:', error);
                }
                
                showToast(`${salesToAdd.length}건의 매출이 등록되었습니다.`);
                closeModal();
                loadSalesTable(1); // 새 데이터가 추가되었으므로 첫 페이지로 이동
            }).catch(e => {
                console.error('Firestore 저장 오류:', e);
                showToast('저장 중 오류가 발생했습니다.', 'error');
            }).finally(() => {
                window.isSavingSales = false;
                if(saveButton) { 
                    saveButton.disabled = false; 
                    saveButton.textContent = '등록'; 
                }
            });
        } else {
            // Firebase가 없는 경우 localStorage만 저장
            const salesToAdd = items.map(({ item, quantity, price, taxType }) => {
                const supplyAmount = quantity * price;
                const taxAmount = taxType === 'taxable' ? supplyAmount * 0.1 : 0;
                const totalAmount = supplyAmount + taxAmount;
                return {
                    id: generateId(),
                    date, partner, item, quantity, price, supplyAmount, taxAmount, totalAmount, taxType,
                    createdAt: new Date().toISOString()
                };
            });
            
            state.sales.push(...salesToAdd);
            saveCompanyData(businessNumber);
            
            // 매출 생성 로그 기록
            try {
                await logAccess('CREATE_DATA', {
                    page: 'sales',
                    action: 'createSales',
                    count: salesToAdd.length,
                    businessNumber: businessNumber
                });
            } catch (error) {
                console.error('매출 생성 로그 기록 실패:', error);
            }
            
            showToast(`${salesToAdd.length}건의 매출이 등록되었습니다.`);
            closeModal();
            loadSalesTable(1);
            window.isSavingSales = false;
            if(saveButton) { 
                saveButton.disabled = false; 
                saveButton.textContent = '등록'; 
            }
        }
    }
}

export function initSalesTab() {
    // 매출 탭 초기화 로직
    console.log('매출 탭이 초기화되었습니다.');
    
    // 전역 함수로 등록
    window.showSalesModal = showSalesModal;
    window.deleteSale = deleteSale;
    window.editSale = editSale;
    window.updateTotals = updateTotals;
    window.saveSales = saveSales;
} 