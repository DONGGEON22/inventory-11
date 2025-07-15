// Partners Management
// =================

// Load Partners Page
function loadPartners() {
    console.log('=== loadPartners 함수 호출됨 ===');
    
    if (!isLoggedIn()) {
        console.log('로그인되지 않음, 로그인 페이지로 이동');
        navigateTo('login');
        return;
    }

    console.log('mainContent 요소:', mainContent);
    console.log('현재 state.partners:', state.partners);

    const content = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1 class="main-title">거래처 관리</h1>
            <div>
                <button class="btn btn-success me-2" onclick="showExcelUploadModal()">
                    <i class='bx bx-upload'></i> 엑셀 업로드
                </button>
                <button class="btn btn-primary" onclick="showPartnerModal()">
                    <i class='bx bx-plus'></i> 새 거래처 등록
                </button>
            </div>
        </div>
        
        <div class="card">
            <div class="card-body">
                <div class="row mb-3">
                    <div class="col-md-4">
                        <input type="text" id="partnerSearchInput" class="form-control" placeholder="거래처명, 사업자번호, 대표자명으로 검색">
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>거래처명</th>
                                <th>사업자번호</th>
                                <th>대표자명</th>
                                <th>전화번호</th>
                                <th>등록일</th>
                                <th>작업</th>
                            </tr>
                        </thead>
                        <tbody id="partners-table-body">
                            <!-- Partner data will be inserted here -->
                        </tbody>
                    </table>
                </div>
                <div id="pagination-container" class="d-flex justify-content-center"></div>
            </div>
        </div>
    `;

    console.log('HTML 콘텐츠 생성 완료');
    mainContent.innerHTML = content;
    console.log('innerHTML 설정 완료');
    
    displayPartners(state.partnersCurrentPage || 1);
    console.log('displayPartners 호출 완료');

    document.getElementById('partnerSearchInput').addEventListener('keyup', () => displayPartners(1, document.getElementById('partnerSearchInput').value));
    console.log('이벤트 리스너 설정 완료');
}

function displayPartners(page, searchTerm = '') {
    if (!page) page = state.partnersCurrentPage || 1;
    console.log('=== displayPartners 함수 호출됨 ===');
    console.log('page:', page, 'searchTerm:', searchTerm);
    
    const tableBody = document.getElementById('partners-table-body');
    console.log('tableBody 요소:', tableBody);
    
    if (!tableBody) {
        console.error('tableBody 요소를 찾을 수 없습니다!');
        return;
    }
    
    let filteredPartners = state.partners;
    console.log('원본 partners:', filteredPartners);
    
    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        filteredPartners = state.partners.filter(p =>
            p.name.toLowerCase().includes(lowercasedFilter) ||
            p.businessNumber.includes(lowercasedFilter) ||
            p.ownerName.toLowerCase().includes(lowercasedFilter)
        );
        console.log('필터링된 partners:', filteredPartners);
    }

    console.log('paginate 함수 호출 전');
    const { paginatedItems, totalPages } = paginate(filteredPartners.reverse(), page);
    console.log('paginate 결과:', { paginatedItems, totalPages });
    
    const tableHTML = paginatedItems.map(partner => `
        <tr>
            <td>${partner.name}</td>
            <td>${partner.businessNumber}</td>
            <td>${partner.ownerName}</td>
            <td>${partner.phone}</td>
            <td>${new Date(partner.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="showPartnerModal('${partner.id}')">수정</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deletePartner('${partner.id}')">삭제</button>
            </td>
        </tr>
    `).join('');
    
    console.log('생성된 테이블 HTML:', tableHTML);
    tableBody.innerHTML = tableHTML;
    console.log('테이블 내용 설정 완료');

    renderPagination('partners', totalPages, page);
    console.log('페이지네이션 렌더링 완료');
}

// Partner CRUD Operations
function savePartner(partnerId) {
    console.log('=== savePartner 함수 호출됨 ===');
    console.log('partnerId:', partnerId);
    
    // ID 유효성 검사 및 신규/수정 구분
    const isEditing = partnerId && partnerId !== '' && partnerId !== 'undefined' && partnerId !== 'null';
    console.log('isEditing:', isEditing);
    
    const partnerName = document.getElementById('partnerName')?.value?.trim();
    const businessNumber = document.getElementById('businessId')?.value?.trim();
    const ownerName = document.getElementById('ownerName')?.value?.trim();
    
    console.log('입력값:', { partnerName, businessNumber, ownerName });

    if (!partnerName || !businessNumber || !ownerName) {
        console.error('필수 입력값 누락:', { partnerName, businessNumber, ownerName });
        showToast('거래처명, 사업자번호, 대표자명은 필수 항목입니다.', 'danger');
        return;
    }

    try {
        // ID 생성 또는 기존 ID 사용
        const finalPartnerId = isEditing ? partnerId : `partner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const partnerData = {
            id: finalPartnerId,
            name: partnerName,
            businessNumber: businessNumber,
            ownerName: ownerName,
            phone: document.getElementById('phone')?.value?.trim() || '',
            address: document.getElementById('address')?.value?.trim() || '',
            businessType: document.querySelector('input[name="businessType"]')?.value?.trim() || '',
            sector: document.querySelector('input[name="sector"]')?.value?.trim() || '',
            email: document.querySelector('input[name="email"]')?.value?.trim() || '',
            note: document.querySelector('textarea[name="note"]')?.value?.trim() || '',
            createdAt: isEditing ? state.partners.find(p => p.id === partnerId)?.createdAt : new Date().toISOString()
        };
        
        console.log('저장할 데이터:', partnerData);

        if (isEditing) {
            const index = state.partners.findIndex(p => p.id === partnerId);
            if (index === -1) {
                throw new Error(`ID가 ${partnerId}인 거래처를 찾을 수 없습니다.`);
            }
            state.partners[index] = partnerData;
        } else {
            state.partners.push(partnerData);
        }

        saveCompanyState();
        closeModal();
        showToast(`거래처가 성공적으로 ${isEditing ? '수정' : '등록'}되었습니다.`);
        displayPartners();
        
        console.log('거래처 저장 완료');
    } catch (error) {
        console.error('거래처 저장 중 오류 발생:', error);
        showToast('거래처 저장 중 오류가 발생했습니다: ' + error.message, 'danger');
    }
}

function showPartnerModal(partnerId = null) {
    console.log('=== showPartnerModal 함수 호출됨 ===');
    console.log('partnerId:', partnerId);
    
    try {
        const isEditing = partnerId !== null && partnerId !== undefined && partnerId !== '';
        const partner = isEditing ? state.partners.find(p => p.id === partnerId) : {};
        
        if (isEditing && !partner) {
            throw new Error(`ID가 ${partnerId}인 거래처를 찾을 수 없습니다.`);
        }
        
        console.log('partner 데이터:', partner);

        const modalContent = `
            <div class="item-registration-form">
                <form id="partnerForm">
                    <div class="form-group">
                        <label class="form-label">거래처명<span class="required-mark">*</span></label>
                        <input type="text" class="form-control" id="partnerName" name="name" required value="${partner.name || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">사업자번호<span class="required-mark">*</span></label>
                        <input type="text" class="form-control business-number-input" id="businessId" name="businessNumber" placeholder="000-00-00000" required value="${partner.businessNumber || ''}" maxlength="12">
                    </div>
                    <div class="form-group">
                        <label class="form-label">대표자명<span class="required-mark">*</span></label>
                        <input type="text" class="form-control" id="ownerName" name="representative" required value="${partner.ownerName || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">업태</label>
                        <input type="text" class="form-control" name="businessType" value="${partner.businessType || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">종목</label>
                        <input type="text" class="form-control" name="sector" value="${partner.sector || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">연락처</label>
                        <input type="tel" class="form-control" id="phone" name="contact" placeholder="02-0000-0000" value="${partner.phone || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">이메일</label>
                        <input type="email" class="form-control" name="email" value="${partner.email || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">주소</label>
                        <input type="text" class="form-control" id="address" name="address" value="${partner.address || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">비고</label>
                        <textarea class="form-control" name="note" rows="3">${partner.note || ''}</textarea>
                    </div>
                </form>
            </div>
        `;
        
        const title = isEditing ? '거래처 수정' : '거래처 등록';
        const buttons = [
            {
                text: isEditing ? '저장' : '거래처 등록',
                class: 'btn-primary',
                handler: `onclick="savePartner('${isEditing ? partnerId : ''}')"`,
            },
            {
                text: '취소',
                class: 'btn-secondary',
                handler: 'onclick="closeModal()"',
            }
        ];
        
        console.log('모달 표시:', { title, isEditing, partnerId });
        showModal(title, modalContent, buttons);

        // 사업자등록번호 자동하이픈 기능 추가
        const businessIdInput = document.getElementById('businessId');
        if (businessIdInput) {
            businessIdInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/[^0-9]/g, '');
                if (value.length >= 3) {
                    value = value.substring(0, 3) + '-' + value.substring(3);
                }
                if (value.length >= 6) {
                    value = value.substring(0, 6) + '-' + value.substring(6);
                }
                e.target.value = value;
            });
        }
    } catch (error) {
        console.error('거래처 모달 표시 중 오류 발생:', error);
        showToast('거래처 정보를 불러오는 중 오류가 발생했습니다: ' + error.message, 'danger');
    }
}

function deletePartner(partnerId) {
    showConfirmation({
        title: '거래처 삭제',
        message: '정말로 이 거래처를 삭제하시겠습니까?',
        onConfirm: () => {
            state.partners = state.partners.filter(p => p.id !== partnerId);
            saveCompanyState();
            showToast('거래처가 삭제되었습니다.');
            displayPartners();
        }
    });
}

// 엑셀 업로드 모달 표시
function showExcelUploadModal() {
    const modalContent = `
        <div class="excel-upload-form">
            <div class="alert alert-info">
                <h6><i class='bx bx-info-circle'></i> 엑셀 업로드 가이드</h6>
                <ul class="mb-0">
                    <li>첫 번째 행은 헤더로 사용됩니다</li>
                    <li><strong>필수 컬럼:</strong> 사업자번호, 상호(법인명), 대표자명</li>
                    <li><strong>선택 컬럼:</strong> 거래처칭호, 거래처종류, 회사전화번호, 대표 휴대전화번호, FAX 번호, 적요, 은행코드, 거래처계좌번호, 담당자명, 담당자연락처, 담당자메일, 비고, 휴사업정보, 사업장 주소, 업태, 종목</li>
                    <li>사업자번호는 숫자만 입력하거나 000-00-00000 형식으로 입력 가능합니다</li>
                </ul>
            </div>
            <div class="mb-3">
                <button class="btn btn-outline-primary me-2" onclick="downloadExcelTemplate()">
                    <i class='bx bx-download'></i> 템플릿 다운로드
                </button>
            </div>
            <div class="excel-dropzone mb-3" id="excelDropzone">
                <div class="dropzone-inner">
                    <div class="dropzone-icon"><i class='bx bx-upload'></i></div>
                    <div class="dropzone-text">엑셀 파일을 이곳에 드래그하거나 업로드하세요</div>
                    <div class="dropzone-desc">.xlsx, .xls 파일만 업로드할 수 있습니다.</div>
                    <button type="button" class="btn btn-outline-primary mt-2" id="excelFileBtn">파일 선택</button>
                    <input type="file" id="excelFile" accept=".xlsx,.xls" style="display:none;" />
                </div>
            </div>
            <div id="excelPreview" style="display: none;">
                <h6><i class='bx bx-table'></i> 업로드 미리보기</h6>
                <div class="table-responsive">
                    <table class="table table-sm table-bordered" id="previewTable">
                        <thead id="previewTableHead"></thead>
                        <tbody id="previewTableBody"></tbody>
                    </table>
                </div>
                <div id="validationResults" class="mt-3"></div>
                <div class="upload-stats">
                    <div class="stat-item">
                        <span class="stat-badge valid" id="validCount">0</span>
                        <span class="stat-label">유효한 데이터</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-badge duplicate" id="duplicateCount">0</span>
                        <span class="stat-label">중복 데이터</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-badge error" id="errorCount">0</span>
                        <span class="stat-label">오류 데이터</span>
                    </div>
                    <div class="ms-auto">
                        <button class="btn btn-primary" id="uploadBtn" onclick="uploadExcelData()" disabled>
                            <i class='bx bx-upload'></i> 업로드
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const buttons = [
        {
            text: '닫기',
            class: 'btn-secondary',
            handler: 'onclick="closeModal()"'
        }
    ];

    showModal('엑셀 업로드', modalContent, buttons);

    // 드래그 앤 드롭 및 버튼 이벤트 바인딩
    const dropzone = document.getElementById('excelDropzone');
    const fileInput = document.getElementById('excelFile');
    const fileBtn = document.getElementById('excelFileBtn');
    if (fileBtn) {
        fileBtn.addEventListener('click', () => fileInput.click());
    }
    if (dropzone && fileInput) {
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
        });
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    fileInput.files = e.dataTransfer.files;
                    handleExcelFileSelect({ target: fileInput });
                } else {
                    showToast('엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.', 'danger');
                }
            }
        });
        fileInput.addEventListener('change', handleExcelFileSelect);
    }
}

// 엑셀 템플릿 다운로드 (첨부 양식 기준)
function downloadExcelTemplate() {
    const sampleData = [
        ['사업자번호','상호(법인명)','거래처칭호','거래처종류','회사전화번호','대표 휴대전화번호','FAX 번호','적요','은행코드','거래처계좌번호','담당자명','담당자연락처','담당자메일','비고','휴사업정보','대표자명','사업장 주소','업태','종목'],
        ['2098524246','세무법인정담트루원시청점','','매입,매출','02-0000-0000','010-0000-0000','','','003','16803127804011','담당자','','','','Y','이규상','경시 팔달구 권광로 175번길 83, 리츠','서비스','세무사업']
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    ws['!cols'] = [
        {wch:13},{wch:18},{wch:12},{wch:12},{wch:14},{wch:14},{wch:12},{wch:8},{wch:8},{wch:18},{wch:10},{wch:12},{wch:16},{wch:8},{wch:10},{wch:10},{wch:24},{wch:10},{wch:10}
    ];
    XLSX.utils.book_append_sheet(wb, ws, '거래처목록');
    XLSX.writeFile(wb, '거래처_업로드_템플릿.xlsx');
    showToast('템플릿 파일이 다운로드되었습니다.', 'success');
}

// 엑셀 파일 선택 처리
function handleExcelFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length < 2) {
                showToast('엑셀 파일에 데이터가 충분하지 않습니다.', 'danger');
                return;
            }
            
            displayExcelPreview(jsonData);
        } catch (error) {
            console.error('엑셀 파일 읽기 오류:', error);
            showToast('엑셀 파일을 읽는 중 오류가 발생했습니다.', 'danger');
        }
    };
    reader.readAsArrayBuffer(file);
}

// 엑셀 미리보기 표시
function displayExcelPreview(data) {
    const headers = data[0];
    const rows = data.slice(1);
    // 헤더 표시
    const headerRow = headers.map(header => `<th>${header}</th>`).join('');
    document.getElementById('previewTableHead').innerHTML = `<tr>${headerRow}</tr>`;
    // 데이터 표시 (최대 20행, 스크롤 가능)
    const previewRows = rows.slice(0, 20);
    const bodyRows = previewRows.map((row, index) => {
        const cells = row.map(cell => `<td>${cell || ''}</td>`).join('');
        return `<tr>${cells}</tr>`;
    }).join('');
    document.getElementById('previewTableBody').innerHTML = bodyRows;
    // 검증 결과 표시
    const validationResults = validateExcelData(headers, rows);
    displayValidationResults(validationResults);
    document.getElementById('excelPreview').style.display = 'block';
    // 오류가 있더라도 유효한 데이터가 1개 이상이면 업로드 버튼 활성화
    document.getElementById('uploadBtn').disabled = validationResults.validCount === 0;
    // 전역 변수에 데이터 저장
    window.excelUploadData = { headers, rows, validationResults };
}

// 엑셀 데이터 검증 (첨부 양식 기준)
function validateExcelData(headers, rows) {
    const requiredColumns = ['사업자번호', '상호(법인명)', '대표자명'];
    const results = {
        valid: [],
        duplicates: [],
        errors: [],
        errorCount: 0,
        duplicateCount: 0,
        validCount: 0
    };
    // 필수 컬럼 확인
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
        results.errors.push(`필수 컬럼이 누락되었습니다: ${missingColumns.join(', ')}`);
        results.errorCount++;
        return results;
    }
    const bizIdx = headers.indexOf('사업자번호');
    const nameIdx = headers.indexOf('상호(법인명)');
    const ownerIdx = headers.indexOf('대표자명');
    const upIdx = headers.indexOf('업태');
    const sectorIdx = headers.indexOf('종목');
    const phoneIdx = headers.indexOf('회사전화번호');
    const mobileIdx = headers.indexOf('대표 휴대전화번호');
    const addrIdx = headers.indexOf('사업장 주소');
    const noteIdx = headers.indexOf('비고');
    const existingBusinessNumbers = state.partners.map(p => p.businessNumber.replace(/-/g, ''));
    rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const businessNumber = row[bizIdx]?.toString().trim();
        const name = row[nameIdx]?.toString().trim();
        const ownerName = row[ownerIdx]?.toString().trim();
        // 필수 값 검증
        let missing = [];
        if (!businessNumber) missing.push(`사업자번호(빈값)`);
        if (!name) missing.push(`상호(법인명)(빈값)`);
        if (!ownerName) missing.push(`대표자명(빈값)`);
        if (missing.length > 0) {
            results.errors.push(`행 ${rowNumber}: ${missing.join(', ')} 누락`);
            results.errorCount++;
            return;
        }
        // 사업자번호 형식 검증
        const cleanBusinessNumber = businessNumber.replace(/-/g, '');
        if (!/^\d{10}$/.test(cleanBusinessNumber)) {
            results.errors.push(`행 ${rowNumber}: 사업자번호 형식 오류 (입력값: ${businessNumber})`);
            results.errorCount++;
            return;
        }
        // 중복 검사
        if (existingBusinessNumbers.includes(cleanBusinessNumber)) {
            results.duplicates.push({
                row: rowNumber,
                name,
                businessNumber: formatBusinessNumber(cleanBusinessNumber),
                reason: '이미 등록된 사업자번호'
            });
            results.duplicateCount++;
            return;
        }
        // 유효한 데이터
        results.valid.push({
            name,
            businessNumber: formatBusinessNumber(cleanBusinessNumber),
            ownerName,
            businessType: upIdx !== -1 ? row[upIdx] || '' : '',
            sector: sectorIdx !== -1 ? row[sectorIdx] || '' : '',
            phone: phoneIdx !== -1 ? (row[phoneIdx] || (mobileIdx !== -1 ? row[mobileIdx] || '' : '')) : '',
            address: addrIdx !== -1 ? row[addrIdx] || '' : '',
            note: noteIdx !== -1 ? row[noteIdx] || '' : ''
        });
        results.validCount++;
    });
    return results;
}

// 검증 결과 표시
function displayValidationResults(results) {
    const container = document.getElementById('validationResults');
    let html = '';
    if (results.errors.length > 0) {
        html += '<div class="alert alert-danger"><h6><i class="bx bx-error-circle"></i> 오류:</h6><ul>';
        results.errors.forEach(error => {
            html += `<li>${error}</li>`;
        });
        html += '</ul></div>';
    }
    if (results.duplicates.length > 0) {
        html += '<div class="alert alert-warning"><h6><i class="bx bx-warning"></i> 중복 데이터:</h6><ul>';
        results.duplicates.forEach(dup => {
            html += `<li>행 ${dup.row}: <strong>${dup.name}</strong> (${dup.businessNumber}) - ${dup.reason}</li>`;
        });
        html += '</ul></div>';
    }
    if (results.valid.length > 0) {
        html += '<div class="alert alert-success"><h6><i class="bx bx-check-circle"></i> 유효한 데이터:</h6>';
        html += `<p>총 <strong>${results.valid.length}개</strong>의 거래처가 등록될 예정입니다.</p>`;
        if (results.valid.length > 10) {
            html += '<p class="mb-0"><small>※ 미리보기에는 처음 10행만 표시됩니다.</small></p>';
        }
        html += '</div>';
    }
    // 안내문구 추가
    if (results.errors.length > 0) {
        html += '<div class="alert alert-info mt-2"><i class="bx bx-info-circle"></i> 오류가 있는 행은 업로드되지 않습니다. 정상 데이터만 등록됩니다.</div>';
    }
    container.innerHTML = html;
    // 카운터 업데이트
    document.getElementById('validCount').textContent = results.validCount;
    document.getElementById('duplicateCount').textContent = results.duplicateCount;
    document.getElementById('errorCount').textContent = results.errorCount;
}

// 사업자번호 형식 변환
function formatBusinessNumber(number) {
    if (number.length === 10) {
        return number.substring(0, 3) + '-' + number.substring(3, 5) + '-' + number.substring(5);
    }
    return number;
}

// 엑셀 데이터 업로드
function uploadExcelData() {
    if (!window.excelUploadData || !window.excelUploadData.validationResults) {
        showToast('업로드할 데이터가 없습니다.', 'danger');
        return;
    }
    
    const { valid } = window.excelUploadData.validationResults;
    
    if (valid.length === 0) {
        showToast('업로드할 유효한 데이터가 없습니다.', 'warning');
        return;
    }
    
    try {
        // 기존 거래처에 추가
        valid.forEach(partnerData => {
            const newPartner = {
                id: `partner_${new Date().getTime()}_${Math.random()}`,
                name: partnerData.name,
                businessNumber: partnerData.businessNumber,
                ownerName: partnerData.ownerName,
                businessType: partnerData.businessType,
                sector: partnerData.sector,
                phone: partnerData.phone,
                email: partnerData.email,
                address: partnerData.address,
                note: partnerData.note,
                createdAt: new Date().toISOString()
            };
            state.partners.push(newPartner);
        });
        
        saveCompanyState();
        closeModal();
        showToast(`${valid.length}개의 거래처가 성공적으로 등록되었습니다.`);
        displayPartners();
        
        // 전역 변수 정리
        delete window.excelUploadData;
        
    } catch (error) {
        console.error('엑셀 데이터 업로드 중 오류:', error);
        showToast('데이터 업로드 중 오류가 발생했습니다: ' + error.message, 'danger');
    }
}

// Export functions for use in HTML
// window.loadPartners = loadPartners;
window.displayPartners = displayPartners;
// window.showPartnerModal = showPartnerModal;
// window.savePartner = savePartner;
// window.deletePartner = deletePartner;
