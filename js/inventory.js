// Inventory Management
// ===================

// Load Inventory Page
function loadInventory() {
    if (!isLoggedIn()) {
        navigateTo('login');
        return;
    }
    const content = `
        <div class="card">
            <div class="card-header d-flex flex-column align-items-start">
                <h5 class="mb-2">재고현황</h5>
                <div style="width: 300px;">
                    <input id="inventoryItemSearch" class="form-control" placeholder="품목코드 또는 품목명 검색..." autocomplete="off">
                    <div id="inventoryItemDropdown" class="modern-search-dropdown"></div>
                </div>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table inventory-table">
                        <thead>
                            <tr>
                                <th>품목코드</th>
                                <th>품목명</th>
                                <th>총매입수량</th>
                                <th>총매입금액</th>
                                <th>평균매입단가</th>
                                <th>총판매수량</th>
                                <th>총매출금액</th>
                                <th>단위당이익</th>
                                <th>총이익</th>
                                <th>마진율(%)</th>
                                <th>현재재고</th>
                            </tr>
                        </thead>
                        <tbody id="inventoryTableBody">
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    mainContent.innerHTML = content;
    setupInventoryItemSearch();
    loadInventoryTable();
}

let inventoryItemSearchValue = '';
function setupInventoryItemSearch() {
    const input = document.getElementById('inventoryItemSearch');
    const dropdown = document.getElementById('inventoryItemDropdown');
    
    // 검색 컨테이너에 relative 포지션 설정
    if (input) {
        input.parentNode.style.position = 'relative';
    }

    let filtered = [];
    let selectedIdx = -1;
    function renderDropdown() {
        dropdown.innerHTML = '';
        if (filtered.length === 0) {
            dropdown.style.display = 'none';
            return;
        }
        filtered.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'modern-search-item' + (idx === selectedIdx ? ' active' : '');
            div.textContent = `${item.code} - ${item.name}`;
            div.tabIndex = 0;
            div.onmouseenter = () => { selectedIdx = idx; updateActive(); };
            div.onclick = () => selectItem(idx);
            dropdown.appendChild(div);
        });
        dropdown.style.display = 'block';
    }
    function updateActive() {
        Array.from(dropdown.children).forEach((el, idx) => {
            el.classList.toggle('active', idx === selectedIdx);
        });
    }
    function selectItem(idx) {
        if (filtered[idx]) {
            input.value = `${filtered[idx].code} - ${filtered[idx].name}`;
            inventoryItemSearchValue = filtered[idx].code;
            dropdown.style.display = 'none';
            loadInventoryTable();
        }
    }
    function filterList() {
        const val = input.value.trim().toLowerCase();
        if (!val) {
            filtered = state.items.map(i => ({ code: i.code, name: i.name }));
        } else {
            filtered = state.items.filter(i =>
                i.code.toLowerCase().includes(val) ||
                i.name.toLowerCase().includes(val)
            ).map(i => ({ code: i.code, name: i.name }));
        }
        selectedIdx = filtered.length > 0 ? 0 : -1;
        renderDropdown();
    }
    input.addEventListener('input', filterList);
    input.addEventListener('focus', filterList);
    input.addEventListener('keydown', (e) => {
        if (dropdown.style.display !== 'block') return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (filtered.length > 0) {
                selectedIdx = (selectedIdx + 1) % filtered.length;
                updateActive();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filtered.length > 0) {
                selectedIdx = (selectedIdx - 1 + filtered.length) % filtered.length;
                updateActive();
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIdx >= 0) selectItem(selectedIdx);
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
        }
    });
    document.addEventListener('click', function docClick(e) {
        if (!input.parentNode.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
    // 전체 보기 초기화
    inventoryItemSearchValue = '';
    input.value = '';
}

function loadInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';
    // 품목코드 검색값 적용
    let itemsToShow = state.items;
    if (inventoryItemSearchValue) {
        itemsToShow = state.items.filter(i => i.code === inventoryItemSearchValue);
    }
    itemsToShow.forEach(item => {
        // 매입/매출 전체 집계
        const purchases = state.purchases.filter(p => p.item === item.code);
        const sales = state.sales.filter(s => s.item === item.code);
        let totalPurchasedQuantity = 0, totalPurchasedAmount = 0;
        purchases.forEach(p => {
            const quantity = Number(p.quantity);
            const price = Number(p.price);
            totalPurchasedQuantity += quantity;
            totalPurchasedAmount += quantity * price;
        });
        let totalSoldQuantity = 0, totalSalesAmount = 0;
        sales.forEach(s => {
            const quantity = Number(s.quantity);
            const price = Number(s.price);
            totalSoldQuantity += quantity;
            totalSalesAmount += quantity * price;
        });
        const avgPurchasePrice = totalPurchasedQuantity > 0 ? totalPurchasedAmount / totalPurchasedQuantity : 0;
        const avgSalesPrice = totalSoldQuantity > 0 ? totalSalesAmount / totalSoldQuantity : 0;
        // 단위당이익 = 매출단가 - 평균매입단가 (가중평균법 적용)
        const unitProfit = avgSalesPrice - avgPurchasePrice;
        // 총이익 = 단위당이익 × 총매출수량
        const totalProfit = unitProfit * totalSoldQuantity;
        const marginRate = totalSalesAmount > 0 ? (totalProfit / totalSalesAmount) * 100 : 0;
        let stock = 0;
        purchases.forEach(p => { stock += Number(p.quantity); });
        sales.forEach(s => { stock -= Number(s.quantity); });

        let unitProfitText = '-';
        let totalProfitText = formatCurrency(0);
        let marginRateText = '-';

        if (totalSoldQuantity > 0) {
            const avgSalesPrice = totalSalesAmount / totalSoldQuantity;
            const unitProfit = avgSalesPrice - avgPurchasePrice;
            const totalProfit = unitProfit * totalSoldQuantity;
            const marginRate = totalSalesAmount > 0 ? (totalProfit / totalSalesAmount) * 100 : 0;
            
            unitProfitText = formatCurrency(unitProfit);
            totalProfitText = formatCurrency(totalProfit);
            marginRateText = marginRate.toFixed(1);
        }

        const row = `
            <tr>
                <td>${item.code}</td>
                <td>${item.name}</td>
                <td>${totalPurchasedQuantity}</td>
                <td>${formatCurrency(totalPurchasedAmount)}</td>
                <td>${formatCurrency(avgPurchasePrice)}</td>
                <td>${totalSoldQuantity}</td>
                <td>${formatCurrency(totalSalesAmount)}</td>
                <td>${unitProfitText}</td>
                <td>${totalProfitText}</td>
                <td>${marginRateText}</td>
                <td>${stock}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// 재고 등록 함수
function saveInventory() {
    const itemCode = document.getElementById('selectedInventoryItemCode').value;
    const quantity = Number(document.getElementById('inventoryQuantity').value);
    const safetyStock = Number(document.getElementById('inventorySafetyStock').value) || 0;
    const location = document.getElementById('inventoryLocation').value;
    const note = document.getElementById('inventoryNote').value;

    if (!itemCode || quantity === undefined || quantity === null) {
        alert('품목과 현재고를 입력해주세요.');
        return;
    }

    // 이미 등록된 품목인지 확인
    const existingIndex = state.inventory.findIndex(inv => inv.itemCode === itemCode);
    if (existingIndex !== -1) {
        alert('이미 등록된 품목입니다. 수정 기능을 사용해주세요.');
        return;
    }

    const inventory = {
        id: generateId(),
        itemCode: itemCode,
        quantity: quantity,
        safetyStock: safetyStock,
        location: location,
        note: note
    };

    state.inventory.push(inventory);
    saveCompanyState();
    
    // 모달 닫기
    const modal = bootstrap.Modal.getInstance(document.querySelector('.modal'));
    if (modal) {
        modal.hide();
    }
    
    loadInventoryTable();
    showToast('재고가 등록되었습니다.');
}

// 재고 수정 함수
function updateInventory() {
    const form = document.getElementById('inventoryForm');
    const editingId = form.querySelector('input[name="inventoryId"]').value;

    if (!editingId) {
        alert('수정할 항목의 ID를 찾을 수 없습니다.');
        return;
    }

    const index = state.inventory.findIndex(inv => inv.id === editingId);
    if (index === -1) {
        alert('수정할 재고 항목을 찾을 수 없습니다.');
        return;
    }

    const quantity = Number(document.getElementById('inventoryQuantity').value);
    const safetyStock = Number(document.getElementById('inventorySafetyStock').value) || 0;
    const location = document.getElementById('inventoryLocation').value;
    const note = document.getElementById('inventoryNote').value;

    if (quantity === undefined || quantity === null) {
        alert('현재고를 입력해주세요.');
        return;
    }

    state.inventory[index] = {
        ...state.inventory[index],
        quantity: quantity,
        safetyStock: safetyStock,
        location: location,
        note: note
    };

    saveCompanyState();
    
    // 모달 닫기
    const modal = bootstrap.Modal.getInstance(document.querySelector('.modal'));
    if (modal) {
        modal.hide();
    }
    
    loadInventoryTable();
    showToast('재고가 수정되었습니다.');
}

// Export functions for use in HTML
window.loadInventory = loadInventory;
window.loadInventoryTable = loadInventoryTable;
window.setupInventoryItemSearch = setupInventoryItemSearch;
window.saveInventory = saveInventory;
window.updateInventory = updateInventory;

// 재고 등록 모달 표시 (HTML에서 호출하는 함수명)
function showAddInventoryModal() {
    showInventoryModal();
}

// 재고 등록/수정 모달 표시
function showInventoryModal(inventory = null) {
    const isEditing = inventory !== null;
    const modalTitle = isEditing ? '재고 수정' : '재고 등록';
    
    const modalContent = `
        <div class="modal-header">
            <h5 class="modal-title">${modalTitle}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            <form id="inventoryForm">
                <input type="hidden" name="inventoryId" value="${inventory ? inventory.id : ''}">
                
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="form-label">품목</label>
                        <input type="text" class="form-control" id="inventoryItemSearch" 
                               placeholder="품목명을 입력하세요" 
                               value="${inventory ? (state.items.find(i => i.code === inventory.itemCode)?.name || '') : ''}">
                        <input type="hidden" id="selectedInventoryItemCode" value="${inventory ? inventory.itemCode : ''}">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">현재고</label>
                        <input type="number" class="form-control" id="inventoryQuantity" 
                               value="${inventory ? inventory.quantity : ''}" min="0" step="0.01" required>
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="form-label">안전재고</label>
                        <input type="number" class="form-control" id="inventorySafetyStock" 
                               value="${inventory ? inventory.safetyStock : ''}" min="0" step="0.01">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">창고위치</label>
                        <input type="text" class="form-control" id="inventoryLocation" 
                               value="${inventory ? inventory.location : ''}" placeholder="예: A-1-1">
                    </div>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">비고</label>
                    <textarea class="form-control" id="inventoryNote" rows="3">${inventory ? inventory.note : ''}</textarea>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">취소</button>
            <button type="button" class="btn btn-primary" onclick="${isEditing ? 'updateInventory()' : 'saveInventory()'}">
                ${isEditing ? '수정' : '등록'}
            </button>
        </div>
    `;
    
    showModal(modalTitle, modalContent);
    
    // 모달이 표시된 후 이벤트 리스너 설정
    setTimeout(() => {
        setupInventoryModalEvents();
    }, 100);
}

// 재고 모달 이벤트 설정
function setupInventoryModalEvents() {
    // 품목 검색
    const itemSearch = document.getElementById('inventoryItemSearch');
    if (itemSearch) {
        createModernSearchDropdown(itemSearch,
            state.items.map(i => ({ text: i.name, value: i.code })),
            (selected) => {
                itemSearch.value = selected.text;
                document.getElementById('selectedInventoryItemCode').value = selected.value;
            }
        );
    }
} 