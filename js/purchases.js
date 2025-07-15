// Purchase Management
// ==================

// Load Purchases Page
function loadPurchases() {
    if (!isLoggedIn()) {
        navigateTo('login');
        return;
    }
    const content = `
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">매입 관리</h5>
                <div>
                    <button class="btn btn-success me-2" id="downloadPurchaseExcelBtn">
                        <i class='bx bx-download'></i> 엑셀 다운로드
                    </button>
                <button class="btn btn-primary" onclick="showPurchaseModal()">
                    <i class='bx bx-plus'></i> 매입 등록
                </button>
                </div>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th><input type="checkbox" id="purchaseCheckAll"></th>
                                <th>거래일자</th>
                                <th>거래처</th>
                                <th>부가세구분</th>
                                <th>품목명</th>
                                <th>수량</th>
                                <th>단가</th>
                                <th>공급가액</th>
                                <th>세액</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody id="purchasesTableBody">
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    mainContent.innerHTML = content;
    loadPurchasesTable();
    // 엑셀 다운로드 버튼 이벤트
    document.getElementById('downloadPurchaseExcelBtn').addEventListener('click', downloadSelectedPurchasesExcel);
    // 전체 선택 체크박스 이벤트
    document.getElementById('purchaseCheckAll').addEventListener('change', function() {
        document.querySelectorAll('.purchase-check').forEach(cb => { cb.checked = this.checked; });
    });
}

// Load Purchases Table
function loadPurchasesTable() {
    const tbody = document.getElementById('purchasesTableBody');
    tbody.innerHTML = '';
    state.purchases.forEach(purchase => {
        const partner = state.partners.find(p => p.businessNumber === purchase.partner);
        const item = state.items.find(i => i.code === purchase.item);
        // 부가세구분 값 보정: purchase.taxType이 없으면 taxable로 간주
        let taxType = purchase.taxType;
        if (!taxType) taxType = 'taxable';
        const taxTypeText = taxType === 'taxable' ? '과세' : (taxType === 'taxFree' ? '면세' : '');
        const row = `
            <tr>
                <td><input type="checkbox" class="purchase-check" value="${purchase.id}"></td>
                <td>${purchase.date}</td>
                <td>${partner ? partner.name : 'Unknown'}</td>
                <td>${taxTypeText}</td>
                <td>${item ? item.name : 'Unknown'}</td>
                <td>${purchase.quantity}</td>
                <td>${formatCurrency(purchase.price)}</td>
                <td>${formatCurrency(purchase.supplyAmount)}</td>
                <td>${formatCurrency(purchase.taxAmount)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editPurchase('${purchase.id}')">
                        <i class='bx bx-edit'></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deletePurchase('${purchase.id}')">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function downloadSelectedPurchasesExcel() {
    // 선택된 거래 id 수집
    const checked = Array.from(document.querySelectorAll('.purchase-check:checked')).map(cb => cb.value);
    if (checked.length === 0) {
        alert('다운로드할 거래를 선택하세요.');
        return;
    }
    // 헤더 순서 및 필수/공란 필드 정의
    const headers = [
        '입고일자','구분','거래처명','사업자번호','부가세구분','프로젝트/현장','창고','품목월일','품목코드','품목명','규격','수량','단위','단가','매입금액','세액'
    ];
    const required = ['입고일자','거래처명','사업자번호','부가세구분','품목월일','품목명','수량','단가'];
    // 데이터 변환
    const rows = checked.map(id => {
        const p = state.purchases.find(x => x.id === id);
        if (!p) return Array(headers.length).fill('');
        const partner = state.partners.find(x => x.businessNumber === p.partner);
        const item = state.items.find(x => x.code === p.item);
        return [
            p.date || '', // 입고일자
            '', // 구분
            partner ? partner.name : '', // 거래처명
            partner ? partner.businessNumber : '', // 사업자번호
            p.taxType === 'taxable' ? '과세' : (p.taxType === 'taxFree' ? '면세' : ''), // 부가세구분
            '', // 프로젝트/현장
            '', // 창고
            p.date || '', // 품목월일
            item ? item.code : '', // 품목코드
            item ? item.name : '', // 품목명
            '', // 규격
            p.quantity || '', // 수량
            item ? item.unit : '', // 단위
            p.price || '', // 단가
            p.supplyAmount || '', // 매입금액
            p.taxAmount || '' // 세액
        ];
    });
    // 엑셀(xlsx) 변환 (라이브러리 없으면 CSV로)
    if (window.XLSX) {
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '매입내역');
        XLSX.writeFile(wb, '매입내역.xlsx');
    } else {
        // CSV fallback
        let csv = headers.join(',') + '\n';
        rows.forEach(r => { csv += r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',') + '\n'; });
        const blob = new Blob([csv], {type:'text/csv'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '매입내역.csv';
        a.click();
    }
}

function deletePurchase(id) {
    if (confirm('정말로 이 매입을 삭제하시겠습니까?')) {
        state.purchases = state.purchases.filter(p => p.id !== id);
        saveCompanyState();
        loadPurchasesTable();
        showToast('매입이 삭제되었습니다.');
    }
}

function updatePurchase() {
    const form = document.getElementById('purchaseForm');
    const editingId = form.querySelector('input[name="purchaseId"]').value;

    if (!editingId) {
        alert('수정할 항목의 ID를 찾을 수 없습니다.');
        return;
    }

    const index = state.purchases.findIndex(p => p.id === editingId);
    if (index === -1) {
        alert('수정할 매입 항목을 찾을 수 없습니다.');
        return;
    }

    const year = document.getElementById('purchaseYear').value;
    const month = document.getElementById('purchaseMonth').value.padStart(2, '0');
    const day = document.getElementById('purchaseDay').value.padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    
    const partner = window.selectedPartnerBusinessNumber;

    if (!date || !partner) {
        alert('거래일자와 거래처를 입력해주세요.');
        return;
    }

    const tr = document.querySelector('#purchaseItemsBody tr');
    if (!tr) {
        alert('매입 품목 정보를 찾을 수 없습니다.');
        return;
    }

    const quantity = Number(tr.querySelector('.quantityInput').value);
    const price = Number(tr.querySelector('.priceInput').value);
    const taxType = tr.querySelector('.taxTypeSelect').value;
    
    if (!quantity || price === undefined || price === null) {
        alert('수량과 단가를 올바르게 입력해주세요.');
        return;
    }

    const supplyAmount = quantity * price;
    const taxAmount = taxType === 'taxable' ? supplyAmount * 0.1 : 0;
    const totalAmount = supplyAmount + taxAmount;

    const updatedPurchase = {
        ...state.purchases[index],
        date,
        partner,
        quantity,
        price,
        supplyAmount,
        taxAmount,
        totalAmount,
        taxType,
        updatedAt: new Date().toISOString()
    };
    
    state.purchases[index] = updatedPurchase;
    
    saveCompanyState();
    commonModal.hide();
    loadPurchasesTable();
    showToast('매입이 수정되었습니다.');

    window.editingPurchaseId = null;
    window.selectedPartnerBusinessNumber = null;
}

function editPurchase(id) {
    const purchase = state.purchases.find(p => p.id === id);
    if (purchase) {
        showPurchaseModal(purchase);
    }
}

function savePurchase() {
    const form = document.getElementById('purchaseForm');
    const year = document.getElementById('purchaseYear').value;
    const month = document.getElementById('purchaseMonth').value.padStart(2, '0');
    const day = document.getElementById('purchaseDay').value.padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    
    const partnerSearch = document.getElementById('partnerSearch');
    const partner = partnerSearch.dataset.businessNumber;

    if (!date || !partner) {
        alert('거래일자와 거래처를 입력해주세요.');
        return;
    }

    const rows = Array.from(document.querySelectorAll('#purchaseItemsBody tr')).map(row => {
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

        state.purchases.push(...rows);
        saveCompanyState();
        loadPurchasesTable();
        showToast('매입이 등록되었습니다.');
        const modal = bootstrap.Modal.getInstance(document.getElementById('commonModal'));
        modal.hide();
    } catch (error) {
        alert(error.message);
    }
}

// 매입 등록 모달 표시 (HTML에서 호출하는 함수명)
function showAddPurchaseModal() {
    showPurchaseModal();
}

// 매입 등록/수정 모달 표시
function showPurchaseModal(purchase = null) {
    const modalTitle = purchase ? '매입 수정' : '매입 등록';
    const modalContent = `
        <form id="purchaseForm" class="purchase-form">
            <input type="hidden" name="purchaseId" value="${purchase ? purchase.id : ''}">
            <div class="row mb-4">
                <div class="col-md-12">
                    <div class="d-flex align-items-stretch gap-4">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center date-input-group">
                                <label class="me-2 flex-shrink-0" style="width: 70px;">거래일자:</label>
                                <div class="d-flex align-items-center flex-grow-1">
                                    <input type="text" id="purchaseYear" class="form-control date-year me-1" placeholder="YYYY" maxlength="4" value="${purchase ? purchase.date.split('-')[0] : new Date().getFullYear()}">
                                    <span class="mx-1">년</span>
                                    <input type="text" id="purchaseMonth" class="form-control date-month me-1" placeholder="MM" maxlength="2" value="${purchase ? purchase.date.split('-')[1] : String(new Date().getMonth() + 1).padStart(2, '0')}">
                                    <span class="mx-1">월</span>
                                    <input type="text" id="purchaseDay" class="form-control date-day me-1" placeholder="DD" maxlength="2" value="${purchase ? purchase.date.split('-')[2] : String(new Date().getDate()).padStart(2, '0')}">
                                    <span>일</span>
                    </div>
                </div>
                </div>
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center partner-select-container">
                                <label class="me-2 flex-shrink-0" style="width: 70px;">거래처:</label>
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
                                    <tbody id="purchaseItemsBody">
                                    </tbody>
                                </table>
                <div class="text-center mt-3">
                    <button type="button" class="btn btn-outline-primary add-row-btn" onclick="addPurchaseRow()">
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
            text: purchase ? '수정' : '등록',
            class: 'btn-primary',
            handler: purchase ? 'onclick="updatePurchase()"' : 'onclick="savePurchase()"'
        }
    ]);

    // 모달이 표시된 후 초기화
    const modal = document.getElementById('commonModal');
    modal.addEventListener('shown.bs.modal', () => {
        setupPartnerSearch();
        // 첫 번째 품목 행 추가 및 포커스
        addPurchaseRow();
        
        if (purchase) {
            // 기존 데이터 로드
            loadPurchaseData(purchase);
        }
    });
}

function setupPurchaseFormEventListeners() {
    // 첫 번째 행 이벤트 리스너 설정
    const firstRow = document.querySelector('#purchaseItemsBody tr');
    if (firstRow) {
        setupRowEventListeners(firstRow);
    }

    // 날짜 입력 유효성 검사
    const dateInputs = ['purchaseYear', 'purchaseMonth', 'purchaseDay'];
    dateInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                validateDateInput(id, e.target.value);
            });
            
            // 포커스 이동 처리
            input.addEventListener('keyup', (e) => {
                if (e.key !== 'Tab' && input.value.length >= input.maxLength) {
                    const nextInput = {
                        'purchaseYear': 'purchaseMonth',
                        'purchaseMonth': 'purchaseDay'
                    }[id];
                    if (nextInput) {
                        document.getElementById(nextInput).focus();
                    }
                }
                    });
                }
            });
}

function setupRowEventListeners(row) {
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
                            calculateRowAmount(row);
                            updateTotals();
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
                calculateRowAmount(row);
                updateTotals();
            });
        });
    }

    if (taxTypeSelect) {
        taxTypeSelect.addEventListener('change', () => {
            calculateRowAmount(row);
            updateTotals();
        });
    }

    // 행 삭제 버튼
    const removeBtn = row.querySelector('.removeRowBtn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            const tbody = document.getElementById('purchaseItemsBody');
            if (tbody.rows.length > 1) {
                row.remove();
                updateTotals();
            } else {
                showToast('최소 1개의 품목은 필요합니다.', 'warning');
            }
        });
    }
}

function addPurchaseRow() {
    const tbody = document.getElementById('purchaseItemsBody');
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
    setupRowEventListeners(newRow);

    // 새로 추가된 행의 품목 검색 입력란에 포커스
    const itemSearch = newRow.querySelector('.itemSearch');
    if (itemSearch) {
        itemSearch.focus();
    }

    // 초기 계산
    calculateRowAmount(newRow);
    updateTotals();
}

function showDropdown(dropdown) {
    dropdown.style.display = 'block';
    const firstItem = dropdown.querySelector('.modern-search-item');
    if (firstItem) {
        firstItem.classList.add('active');
    }
}

function hideDropdown(dropdown) {
    dropdown.style.display = 'none';
}

function calculateRowAmount(row) {
    const quantity = Number(row.querySelector('.quantityInput').value) || 0;
    const price = Number(row.querySelector('.priceInput').value) || 0;
    const taxType = row.querySelector('.taxTypeSelect').value;

    const supplyAmount = quantity * price;
    const taxAmount = taxType === 'taxable' ? Math.round(supplyAmount * 0.1) : 0;

    row.querySelector('.supplyAmountInput').value = formatCurrency(supplyAmount);
    row.querySelector('.taxAmountInput').value = formatCurrency(taxAmount);
    return { supplyAmount, taxAmount };
}

function updateTotals() {
    let totalSupplyAmount = 0;
    let totalTaxAmount = 0;

    document.querySelectorAll('#purchaseItemsBody tr').forEach(row => {
        const { supplyAmount, taxAmount } = calculateRowAmount(row);
        totalSupplyAmount += supplyAmount;
        totalTaxAmount += taxAmount;
    });

    const totalAmount = totalSupplyAmount + totalTaxAmount;

    document.getElementById('totalSupplyAmount').textContent = formatCurrency(totalSupplyAmount);
    document.getElementById('totalTaxAmount').textContent = formatCurrency(totalTaxAmount);
    document.getElementById('totalAmount').textContent = formatCurrency(totalAmount);
}

function validateDateInput(id, value) {
    const input = document.getElementById(id);
    let max;

    switch (id) {
        case 'purchaseYear':
            max = 9999;
            break;
        case 'purchaseMonth':
            max = 12;
            break;
        case 'purchaseDay':
            const year = Number(document.getElementById('purchaseYear').value);
            const month = Number(document.getElementById('purchaseMonth').value);
            max = new Date(year, month, 0).getDate();
            break;
    }

    const num = Number(value);
    if (num > max) {
        input.value = String(max).padStart(2, '0');
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 숫자 포맷 함수
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function setupPartnerSearch() {
    const searchInput = document.getElementById('partnerSearch');
    
    setupSearchableDropdown(searchInput, {
        searchFunction: (searchTerm) => {
            return state.partners.filter(partner => 
                partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                partner.businessNumber.includes(searchTerm)
            );
        },
        renderItem: (partner, searchTerm) => `
            <div class="modern-search-item" data-business-number="${partner.businessNumber}">
                <div class="d-flex justify-content-between align-items-center">
                    <strong>${highlightMatch(partner.name, searchTerm)}</strong>
                    <small class="text-muted">${formatBusinessNumber(partner.businessNumber)}</small>
                </div>
                ${partner.ownerName ? `<small class="text-muted">대표자: ${partner.ownerName}</small>` : ''}
                ${partner.address ? `<small class="text-muted d-block text-truncate">주소: ${partner.address}</small>` : ''}
            </div>
        `,
        onSelect: (selectedPartner, element) => {
            if (selectedPartner && selectedPartner.businessNumber) {
                window.selectedPartnerBusinessNumber = selectedPartner.businessNumber;
                element.value = selectedPartner.name;
                element.dataset.businessNumber = selectedPartner.businessNumber;
                
                // 첫 번째 품목 입력란으로 포커스 이동
                const firstItemSearch = document.querySelector('.itemSearch');
                if (firstItemSearch) {
                    firstItemSearch.focus();
                }
            }
        },
        dropdownPosition: 'fixed'
    });
}

function setupSearchableDropdown(input, options) {
    if (!input) return;

    const dropdown = input.parentElement.querySelector('.searchable-select-dropdown');
    if (!dropdown) return;

    // 드롭다운 위치 조정 함수
    function adjustDropdownPosition() {
        const inputRect = input.getBoundingClientRect();
        
        if (options.dropdownPosition === 'fixed') {
            // fixed 포지션으로 설정하여 다른 요소들 위에 표시
            dropdown.style.position = 'fixed';
            dropdown.style.top = `${inputRect.bottom + window.scrollY}px`;
            dropdown.style.left = `${inputRect.left + window.scrollX}px`;
            dropdown.style.width = `${inputRect.width}px`;
            dropdown.style.zIndex = '10000'; // 더 높은 z-index 값 설정
        } else {
            // 기본 absolute 포지션
            dropdown.style.position = 'absolute';
            dropdown.style.top = '100%';
            dropdown.style.left = '0';
            dropdown.style.width = '100%';
            dropdown.style.zIndex = '9999';
        }
        
        // 최대 높이 설정 (화면 아래쪽 공간 고려)
        const maxHeight = window.innerHeight - inputRect.bottom - 10;
        dropdown.style.maxHeight = `${Math.min(320, maxHeight)}px`;
    }

    // 드롭다운 표시/숨김 함수
    function showDropdown() {
        dropdown.style.display = 'block';
        adjustDropdownPosition();
        filterItems(input.value);
    }

    function hideDropdown() {
        dropdown.style.display = 'none';
    }

    // 아이템 필터링 및 표시
    function filterItems(searchTerm) {
        const items = options.searchFunction(searchTerm);
        dropdown.innerHTML = items.map(item => options.renderItem(item, searchTerm)).join('');
        
        // 아이템 클릭 이벤트 설정
        dropdown.querySelectorAll('.modern-search-item').forEach(item => {
            item.addEventListener('click', () => {
                const businessNumber = item.dataset.businessNumber;
                if (businessNumber) {
                    const selectedPartner = state.partners.find(p => p.businessNumber === businessNumber);
                    if (selectedPartner) {
                        options.onSelect(selectedPartner, input);
                    }
                } else {
                    const selectedItem = {
                        code: item.dataset.code,
                        name: item.dataset.name
                    };
                    options.onSelect(selectedItem, input);
                }
                hideDropdown();
            });
        });

        if (items.length === 0) {
            dropdown.innerHTML = '<div class="no-results">검색 결과가 없습니다</div>';
        }
    }

    // 입력 이벤트
    input.addEventListener('focus', showDropdown);
    input.addEventListener('input', (e) => {
        if (dropdown.style.display !== 'block') {
            showDropdown();
        }
        filterItems(e.target.value);
    });

    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            hideDropdown();
        }
    });

    // 키보드 네비게이션
    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.modern-search-item');
        const activeItem = dropdown.querySelector('.modern-search-item.active');
        let activeIndex = Array.from(items).indexOf(activeItem);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (dropdown.style.display === 'none') {
                    showDropdown();
                } else {
                    activeIndex = (activeIndex + 1) % items.length;
                    updateActiveItem(items, activeIndex);
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (dropdown.style.display === 'none') {
                    showDropdown();
                } else {
                    activeIndex = (activeIndex - 1 + items.length) % items.length;
                    updateActiveItem(items, activeIndex);
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (activeItem && dropdown.style.display !== 'none') {
                    activeItem.click();
                }
                break;
            case 'Escape':
                e.preventDefault();
                hideDropdown();
                break;
        }
    });
}

function updateActiveItem(items, activeIndex) {
    items.forEach(item => item.classList.remove('active'));
    if (items[activeIndex]) {
        items[activeIndex].classList.add('active');
        items[activeIndex].scrollIntoView({ block: 'nearest' });
    }
}

function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function formatBusinessNumber(number) {
    if (!number) return '';
    return number.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');
}

