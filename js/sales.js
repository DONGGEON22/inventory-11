// Sales Management
// ===============

// Load Sales Page
function loadSales() {
    if (!isLoggedIn()) {
        navigateTo('login');
        return;
    }
    const content = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">매출 관리</h5>
                <div>
                    <button class="btn btn-success me-2" id="downloadSalesExcelBtn">
                        <i class='bx bx-download'></i> 엑셀 다운로드
                    </button>
                    <button class="btn btn-primary" onclick="showAddSaleModal()">
                        <i class='bx bx-plus'></i> 매출 등록
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th><input type="checkbox" id="salesCheckAll"></th>
                                <th>거래일자</th>
                                <th>출고처</th>
                                <th>부가세구분</th>
                                <th>품목명</th>
                                <th>수량</th>
                                <th>단가</th>
                                <th>총액</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody id="salesTableBody">
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    mainContent.innerHTML = content;
    loadSalesTable();

    // 엑셀 다운로드 버튼 이벤트
    document.getElementById('downloadSalesExcelBtn').addEventListener('click', downloadSelectedSalesExcel);
    // 전체 선택 체크박스 이벤트
    document.getElementById('salesCheckAll').addEventListener('change', function() {
        document.querySelectorAll('.sales-check').forEach(cb => { cb.checked = this.checked; });
    });
}

// Load Sales Table
function loadSalesTable() {
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '';

    state.sales.forEach(sale => {
        const partner = state.partners.find(p => p.businessNumber === sale.partner);
        const item = state.items.find(i => i.code === sale.item);
        let taxType = sale.taxType;
        if (!taxType) taxType = 'taxable';
        const taxTypeText = taxType === 'taxable' ? '과세' : (taxType === 'taxFree' ? '면세' : '');
        const row = `
            <tr>
                <td><input type="checkbox" class="sales-check" value="${sale.id}"></td>
                <td>${sale.date}</td>
                <td>${partner ? partner.name : 'Unknown'}</td>
                <td>${taxTypeText}</td>
                <td>${item ? item.name : 'Unknown'}</td>
                <td>${sale.quantity}</td>
                <td>${formatCurrency(sale.price)}</td>
                <td>${formatCurrency(sale.totalAmount)}</td>
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
}

function downloadSelectedSalesExcel() {
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

function editSale(id) {
    const sale = state.sales.find(s => s.id === id);
    if (sale) {
        showSaleModal(sale);
    }
}

function deleteSale(id) {
    if (confirm('정말로 이 매출을 삭제하시겠습니까?')) {
        state.sales = state.sales.filter(s => s.id !== id);
        saveCompanyState();
        loadSalesTable();
        showToast('매출이 삭제되었습니다.');
    }
}

function showSaleModal(sale = null) {
    const modalTitle = sale ? '매출 수정' : '매출 등록';
    const modalContent = `
        <form id="saleForm" class="purchase-form">
            <input type="hidden" name="saleId" value="${sale ? sale.id : ''}">
            <div class="row mb-4">
                <div class="col-md-12">
                    <div class="d-flex align-items-stretch gap-4">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center date-input-group">
                                <label class="me-2 flex-shrink-0" style="width: 70px;">거래일자:</label>
                                <div class="d-flex align-items-center flex-grow-1">
                                    <input type="text" id="salesYear" class="form-control date-year me-1" placeholder="YYYY" maxlength="4" value="${sale ? sale.date.split('-')[0] : new Date().getFullYear()}">
                                    <span class="mx-1">년</span>
                                    <input type="text" id="salesMonth" class="form-control date-month me-1" placeholder="MM" maxlength="2" value="${sale ? sale.date.split('-')[1] : String(new Date().getMonth() + 1).padStart(2, '0')}">
                                    <span class="mx-1">월</span>
                                    <input type="text" id="salesDay" class="form-control date-day me-1" placeholder="DD" maxlength="2" value="${sale ? sale.date.split('-')[2] : String(new Date().getDate()).padStart(2, '0')}">
                                    <span>일</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center partner-select-container">
                                <label class="me-2 flex-shrink-0" style="width: 70px;">출고처:</label>
                                <div class="flex-grow-1 position-relative">
                                    <input type="text" id="partnerSearch" class="form-control" placeholder="거래처명 또는 사업자번호로 검색" autocomplete="off">
                                    <div id="partnerSearchDropdown" class="searchable-select-dropdown shadow-sm" style="display: none;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="table-responsive mb-4">
                <table class="table items-table">
                    <thead>
                        <tr>
                            <th style="width: 35%">품목</th>
                            <th style="width: 10%">수량</th>
                            <th style="width: 15%">단가</th>
                            <th style="width: 10%">부가세</th>
                            <th style="width: 15%">공급가액</th>
                            <th style="width: 10%">세액</th>
                            <th style="width: 5%">관리</th>
                        </tr>
                    </thead>
                    <tbody id="salesItemsBody"></tbody>
                </table>
                <div class="text-center mt-3">
                    <button type="button" class="btn btn-outline-primary add-row-btn" onclick="addSaleRow()">
                        <i class="bx bx-plus me-1"></i>품목 추가
                    </button>
                </div>
            </div>
            <div class="d-flex justify-content-end">
                <div class="totals-container">
                    <div class="total-row">
                        <span class="total-label">합계 금액:</span>
                        <span class="total-value" id="totalAmount">0원</span>
                    </div>
                    <div class="total-row">
                        <span class="total-label">공급가액:</span>
                        <span class="total-value" id="totalSupplyAmount">0원</span>
                    </div>
                    <div class="total-row">
                        <span class="total-label">부가세:</span>
                        <span class="total-value" id="totalTaxAmount">0원</span>
                    </div>
                </div>
            </div>
        </form>
    `;

    showModal(modalTitle, modalContent, [
        {
            text: '취소',
            class: 'btn-secondary',
            handler: 'data-bs-dismiss="modal"'
        },
        {
            text: sale ? '수정' : '등록',
            class: 'btn-primary',
            handler: sale ? 'onclick="updateSale()"' : 'onclick="saveSales()"'
        }
    ]);

    // 모달이 표시된 후 초기화
    const modal = document.getElementById('commonModal');
    modal.addEventListener('shown.bs.modal', () => {
        setupPartnerSearch();
        addSaleRow();
        if (sale) {
            loadSaleData(sale);
        }
    });
}

function addSaleRow() {
    const tbody = document.getElementById('salesItemsBody');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>
            <div class="item-search-container position-relative">
                <input type="text" class="form-control itemSearch" placeholder="품목명으로 검색" autocomplete="off">
                <div class="searchable-select-dropdown shadow-sm" style="display: none;"></div>
            </div>
        </td>
        <td><input type="number" class="form-control quantityInput text-end" value="1" min="1"></td>
        <td><input type="number" class="form-control priceInput text-end" value="0" min="0"></td>
        <td>
            <select class="form-select taxTypeSelect">
                <option value="taxable">과세</option>
                <option value="taxFree">면세</option>
            </select>
        </td>
        <td><input type="text" class="form-control supplyAmountInput text-end" readonly></td>
        <td><input type="text" class="form-control taxAmountInput text-end" readonly></td>
        <td>
            <button type="button" class="btn btn-outline-danger btn-sm removeRowBtn">
                <i class="bx bx-trash"></i>
            </button>
        </td>
    `;
    tbody.appendChild(newRow);
    setupSaleRowEventListeners(newRow);
    // 새로 추가된 행의 품목 검색 입력란에 포커스
    const itemSearch = newRow.querySelector('.itemSearch');
    if (itemSearch) {
        itemSearch.focus();
    }
    // 초기 계산
    calculateSaleRowAmount(newRow);
    updateSaleTotals();
}

function setupSaleRowEventListeners(row) {
    if (!row) return;
    // 품목 검색
    const itemSearch = row.querySelector('.itemSearch');
    if (itemSearch) {
        setupSearchableDropdown(itemSearch, {
            searchFunction: (searchTerm) => {
                return state.items.filter(item => 
                    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.code.toLowerCase().includes(searchTerm.toLowerCase())
                );
            },
            renderItem: (item) => `
                <div class="modern-search-item" data-code="${item.code}" data-name="${item.name}">
                    <strong>${item.name}</strong>
                </div>
            `,
            onSelect: (selectedItem, element) => {
                if (selectedItem && selectedItem.name) {
                    element.value = selectedItem.name;
                    element.dataset.code = selectedItem.code;
                    const priceInput = row.querySelector('.priceInput');
                    if (priceInput) {
                        const item = state.items.find(i => i.code === selectedItem.code);
                        if (item) {
                            priceInput.value = item.price || 0;
                            calculateSaleRowAmount(row);
                            updateSaleTotals();
                        }
                    }
                    // 선택 후 수량 입력란으로 포커스 이동
                    const quantityInput = row.querySelector('.quantityInput');
                    if (quantityInput) {
                        quantityInput.focus();
                        quantityInput.select();
                    }
                }
            },
            dropdownPosition: 'fixed'
        });
    }
    // 수량과 단가 입력
    const quantityInput = row.querySelector('.quantityInput');
    const priceInput = row.querySelector('.priceInput');
    const taxTypeSelect = row.querySelector('.taxTypeSelect');
    if (quantityInput && priceInput) {
        [quantityInput, priceInput].forEach(input => {
            input.addEventListener('input', () => {
                calculateSaleRowAmount(row);
                updateSaleTotals();
            });
        });
    }
    if (taxTypeSelect) {
        taxTypeSelect.addEventListener('change', () => {
            calculateSaleRowAmount(row);
            updateSaleTotals();
        });
    }
    // 행 삭제 버튼
    const removeBtn = row.querySelector('.removeRowBtn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            const tbody = document.getElementById('salesItemsBody');
            if (tbody.rows.length > 1) {
                row.remove();
                updateSaleTotals();
            } else {
                showToast('최소 1개의 품목은 필요합니다.', 'warning');
            }
        });
    }
}

function calculateSaleRowAmount(row) {
    const quantity = Number(row.querySelector('.quantityInput').value) || 0;
    const price = Number(row.querySelector('.priceInput').value) || 0;
    const taxType = row.querySelector('.taxTypeSelect').value;
    const supplyAmount = quantity * price;
    const taxAmount = taxType === 'taxable' ? Math.round(supplyAmount * 0.1) : 0;
    row.querySelector('.supplyAmountInput').value = formatCurrency(supplyAmount);
    row.querySelector('.taxAmountInput').value = formatCurrency(taxAmount);
    return { supplyAmount, taxAmount };
}

function updateSaleTotals() {
    let totalSupplyAmount = 0;
    let totalTaxAmount = 0;
    document.querySelectorAll('#salesItemsBody tr').forEach(row => {
        const { supplyAmount, taxAmount } = calculateSaleRowAmount(row);
        totalSupplyAmount += supplyAmount;
        totalTaxAmount += taxAmount;
    });
    const totalAmount = totalSupplyAmount + totalTaxAmount;
    document.getElementById('totalSupplyAmount').textContent = formatCurrency(totalSupplyAmount);
    document.getElementById('totalTaxAmount').textContent = formatCurrency(totalTaxAmount);
    document.getElementById('totalAmount').textContent = formatCurrency(totalAmount);
}

function saveSales() {
    const form = document.getElementById('saleForm');
    const year = document.getElementById('salesYear').value;
    const month = document.getElementById('salesMonth').value.padStart(2, '0');
    const day = document.getElementById('salesDay').value.padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    const partnerSearch = document.getElementById('partnerSearch');
    const partner = partnerSearch.dataset.businessNumber;
    const rows = Array.from(document.querySelectorAll('#salesItemsBody tr')).map(row => {
        const itemInput = row.querySelector('.itemSearch');
        const itemCode = itemInput.dataset.code;
        const quantity = Number(row.querySelector('.quantityInput').value) || 0;
        const price = Number(row.querySelector('.priceInput').value) || 0;
        const taxType = row.querySelector('.taxTypeSelect').value;
        const supplyAmount = quantity * price;
        const taxAmount = taxType === 'taxable' ? Math.round(supplyAmount * 0.1) : 0;
        if (!itemCode || !quantity || !price) {
            throw new Error('모든 품목 정보를 올바르게 입력해주세요.');
        }
        return {
            date,
            partner,
            item: itemCode,
            quantity,
            price,
            taxType,
            supplyAmount,
            taxAmount,
            totalAmount: supplyAmount + taxAmount,
            id: generateId(),
            createdAt: new Date().toISOString()
        };
    });
    try {
        if (!rows.length) {
            throw new Error('최소 하나의 품목을 입력해주세요.');
        }
        state.sales.push(...rows);
        saveCompanyState();
        loadSalesTable();
        showToast('매출이 등록되었습니다.');
        const modal = bootstrap.Modal.getInstance(document.getElementById('commonModal'));
        modal.hide();
    } catch (error) {
        alert(error.message);
    }
}

function updateSale() {
    const editingId = document.querySelector('input[name="saleId"]').value;
    if (!editingId) {
        alert('수정할 매출 정보를 찾을 수 없습니다.');
        return;
    }

    const year = document.getElementById('salesYear').value;
    const month = document.getElementById('salesMonth').value.padStart(2, '0');
    const day = document.getElementById('salesDay').value.padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    const partner = document.getElementById('selectedPartnerBusinessNumber').value;
    
    if (!date || !partner) {
        alert('거래일자와 출고처를 입력해주세요.');
        return;
    }

    const index = state.sales.findIndex(s => s.id === editingId);
    if (index === -1) {
        alert('수정할 매출 정보를 찾을 수 없습니다.');
        return;
    }

    const row = document.querySelector('#salesItemsBody tr');
    const selectedItemCode = row.querySelector('.selectedItemCode').value;
    const quantity = Number(row.querySelector('.quantityInput').value);
    const price = Number(row.querySelector('.priceInput').value);
    const taxType = row.querySelector('.taxTypeSelect').value;

    if (!selectedItemCode || !quantity || price === undefined || price === null) {
        alert('품목, 수량, 단가를 올바르게 입력해주세요.');
        return;
    }

    const supplyAmount = quantity * price;
    const taxAmount = taxType === 'taxable' ? Math.round(supplyAmount * 0.1) : 0;
    const totalAmount = supplyAmount + taxAmount;

    const updatedSale = {
        ...state.sales[index],
        date,
        partner,
        item: selectedItemCode,
        quantity,
        price,
        supplyAmount,
        taxAmount,
        totalAmount,
        taxType,
        updatedAt: new Date().toISOString()
    };

    state.sales[index] = updatedSale;
    
    saveCompanyState();
    commonModal.hide();
    loadSalesTable();
    showToast('매출이 수정되었습니다.');
}

// Export functions for use in HTML
window.loadSales = loadSales;
window.loadSalesTable = loadSalesTable;
window.downloadSelectedSalesExcel = downloadSelectedSalesExcel;
window.editSale = editSale;
window.deleteSale = deleteSale;
window.saveSales = saveSales;
window.updateSale = updateSale;
window.showAddSaleModal = showAddSaleModal;
window.removeSaleRow = removeSaleRow;
window.addSaleRow = addSaleRow;

function setupSalesDateInputs(sale = null) {
    const yearInput = document.getElementById('salesYear');
    const monthInput = document.getElementById('salesMonth');
    const dayInput = document.getElementById('salesDay');

    // 현재 날짜로 초기화
    const today = new Date();
    let currentYear = today.getFullYear();
    let currentMonth = today.getMonth() + 1;
    let currentDay = today.getDate();

    // 수정 시 기존 값으로 초기화
    if (sale && sale.date) {
        const saleDate = new Date(sale.date);
        currentYear = saleDate.getFullYear();
        currentMonth = saleDate.getMonth() + 1;
        currentDay = saleDate.getDate();
    }

    // 초기값 설정
    yearInput.value = currentYear;
    monthInput.value = String(currentMonth).padStart(2, '0');
    dayInput.value = String(currentDay).padStart(2, '0');

    // 연도 입력 처리
    yearInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 4) value = value.slice(0, 4);
        e.target.value = value;
        
        // 4자리 입력 완료시 자동으로 월 입력으로 포커스 이동
        if (value.length === 4) {
            const yearValue = parseInt(value);
            if (yearValue >= 1900 && yearValue <= 2100) {
                monthInput.focus();
            }
        }
    });

    // 월 입력 처리
    monthInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 2) value = value.slice(0, 2);
        if (value > 12) value = '12';
        e.target.value = value;
        
        // 2자리 입력 완료시 자동으로 일 입력으로 포커스 이동
        if (value.length === 2 && parseInt(value) >= 1 && parseInt(value) <= 12) {
            dayInput.focus();
        }
    });

    // 일 입력 처리
    dayInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 2) value = value.slice(0, 2);
        
        const year = parseInt(yearInput.value);
        const month = parseInt(monthInput.value);
        const maxDays = new Date(year, month, 0).getDate();
        
        if (parseInt(value) > maxDays) value = String(maxDays);
        e.target.value = value;
    });

    // 백스페이스로 이전 입력으로 이동
    monthInput.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && e.target.value === '') {
            yearInput.focus();
        }
    });

    dayInput.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' && e.target.value === '') {
            monthInput.focus();
        }
    });
}

// 매출 등록 모달 표시 함수 추가
function showAddSaleModal() {
    showSaleModal(); // 새로운 매출 등록을 위해 null을 전달
} 