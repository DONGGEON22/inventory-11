// Core Utilities and State Management
// ======================================

import { db, getClientId } from './auth.js';
import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Global State
let state = {
    items: [],
    partners: [],
    purchases: [],
    sales: [],
    currentPage: 'dashboard',
    sidebarCollapsed: false,
    partnersCurrentPage: 1,
    itemsCurrentPage: 1,
    purchasesCurrentPage: 1,
    salesCurrentPage: 1,
    inventoryCurrentPage: 1
};

// Firestore CRUD Operations
// ======================================

// Create
export async function addItem(clientId, data) {
    try {
        const docRef = doc(db, `clients/${clientId}/items/${data.id}`);
        await setDoc(docRef, { ...data, updatedAt: Date.now() });
        return true;
    } catch (error) {
        console.error('Error adding item:', error);
        return false;
    }
}

export async function addPurchase(clientId, data) {
    try {
        const docRef = doc(db, `clients/${clientId}/purchases/${data.id}`);
        await setDoc(docRef, { ...data, updatedAt: Date.now() });
        return true;
    } catch (error) {
        console.error('Error adding purchase:', error);
        return false;
    }
}

export async function addSale(clientId, data) {
    try {
        const docRef = doc(db, `clients/${clientId}/sales/${data.id}`);
        await setDoc(docRef, { ...data, updatedAt: Date.now() });
        return true;
    } catch (error) {
        console.error('Error adding sale:', error);
        return false;
    }
}

// Read
export async function getItems(clientId) {
    try {
        const itemsRef = collection(db, `clients/${clientId}/items`);
        const q = query(itemsRef, orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error('Error getting items:', error);
        return [];
    }
}

export async function getPurchases(clientId) {
    try {
        const purchasesRef = collection(db, `clients/${clientId}/purchases`);
        const q = query(purchasesRef, orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error('Error getting purchases:', error);
        return [];
    }
}

export async function getSales(clientId) {
    try {
        const salesRef = collection(db, `clients/${clientId}/sales`);
        const q = query(salesRef, orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error('Error getting sales:', error);
        return [];
    }
}

// Update
export async function updateItem(clientId, itemId, data) {
    try {
        const docRef = doc(db, `clients/${clientId}/items/${itemId}`);
        await updateDoc(docRef, { ...data, updatedAt: Date.now() });
        return true;
    } catch (error) {
        console.error('Error updating item:', error);
        return false;
    }
}

export async function updatePurchase(clientId, purchaseId, data) {
    try {
        const docRef = doc(db, `clients/${clientId}/purchases/${purchaseId}`);
        await updateDoc(docRef, { ...data, updatedAt: Date.now() });
        return true;
    } catch (error) {
        console.error('Error updating purchase:', error);
        return false;
    }
}

export async function updateSale(clientId, saleId, data) {
    try {
        const docRef = doc(db, `clients/${clientId}/sales/${saleId}`);
        await updateDoc(docRef, { ...data, updatedAt: Date.now() });
        return true;
    } catch (error) {
        console.error('Error updating sale:', error);
        return false;
    }
}

// Delete
export async function deleteItem(clientId, itemId) {
    try {
        const docRef = doc(db, `clients/${clientId}/items/${itemId}`);
        await deleteDoc(docRef);
        return true;
    } catch (error) {
        console.error('Error deleting item:', error);
        return false;
    }
}

export async function deletePurchase(clientId, purchaseId) {
    try {
        const docRef = doc(db, `clients/${clientId}/purchases/${purchaseId}`);
        await deleteDoc(docRef);
        return true;
    } catch (error) {
        console.error('Error deleting purchase:', error);
        return false;
    }
}

export async function deleteSale(clientId, saleId) {
    try {
        const docRef = doc(db, `clients/${clientId}/sales/${saleId}`);
        await deleteDoc(docRef);
        return true;
    } catch (error) {
        console.error('Error deleting sale:', error);
        return false;
    }
}

// Company Data Management with Firestore Integration
// ======================================

function getCompanyKey(businessNumber) {
    return `company_${businessNumber.replace(/-/g, '')}`;
}

async function loadCompanyData(businessNumber) {
    if (!businessNumber) {
        state.items = [];
        state.partners = [];
        state.purchases = [];
        state.sales = [];
        return;
    }

    try {
        // Firestore에서 데이터 로드
        const [items, partners, purchases, sales] = await Promise.all([
            readCollection('items'),
            readCollection('partners'),
            readCollection('purchases'),
            readCollection('sales')
        ]);

        // state 업데이트
        state.items = items;
        state.partners = partners;
        state.purchases = purchases;
        state.sales = sales;

        // localStorage 동기화
        const companyKey = getCompanyKey(businessNumber);
        localStorage.setItem(companyKey, JSON.stringify({ items, partners, purchases, sales }));
    } catch (error) {
        console.error('Error loading company data:', error);
        // 오류 시 localStorage에서 복구
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

async function saveCompanyData(businessNumber) {
    const companyKey = getCompanyKey(businessNumber);
    const companyData = {
        items: state.items,
        partners: state.partners,
        purchases: state.purchases,
        sales: state.sales
    };

    // localStorage 저장
    localStorage.setItem(companyKey, JSON.stringify(companyData));

    // Firestore 저장
    try {
        await Promise.all([
            ...state.items.map(item => createDocument('items', item)),
            ...state.partners.map(partner => createDocument('partners', partner)),
            ...state.purchases.map(purchase => createDocument('purchases', purchase)),
            ...state.sales.map(sale => createDocument('sales', sale))
        ]);
    } catch (error) {
        console.error('Error saving to Firestore:', error);
    }
}

function getCurrentCompanyBusinessNumber() {
    if (isAdmin()) {
        return localStorage.getItem('adminViewingBusinessNumber');
    }
    return localStorage.getItem('loginBusinessNumber');
}

function saveCompanyState() {
    const businessNumber = getCurrentCompanyBusinessNumber();
    if (businessNumber) {
        saveCompanyData(businessNumber);
    }
}

function loadCompanyState() {
    const businessNumber = getCurrentCompanyBusinessNumber();
    if (businessNumber) {
        loadCompanyData(businessNumber);
    }
}

// Loading Management
function showLoading(message = '로딩 중...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = overlay.querySelector('.loading-text');
    loadingText.textContent = message;
    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = 'none';
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
    }).format(amount);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
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

// Business Number Formatting
function autoFormatBusinessNumber(inputElement) {
    if (!inputElement) return;
    inputElement.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^0-9]/g, '');
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

// Pagination Utility
function paginate(items, page = 1, itemsPerPage = 10) {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = items.slice(startIndex, endIndex);
    const totalPages = Math.ceil(items.length / itemsPerPage);
    
    return {
        paginatedItems,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
    };
}

// Virtual Scrolling for large datasets
class VirtualScroller {
    constructor(container, itemHeight, items, renderItem) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.items = items;
        this.renderItem = renderItem;
        this.visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
        this.scrollTop = 0;
        this.startIndex = 0;
        this.endIndex = this.visibleItems;
        
        this.init();
    }
    
    init() {
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';
        
        // Create spacer elements
        this.topSpacer = document.createElement('div');
        this.bottomSpacer = document.createElement('div');
        this.contentContainer = document.createElement('div');
        
        this.container.appendChild(this.topSpacer);
        this.container.appendChild(this.contentContainer);
        this.container.appendChild(this.bottomSpacer);
        
        this.container.addEventListener('scroll', this.handleScroll.bind(this));
        this.render();
    }
    
    handleScroll() {
        this.scrollTop = this.container.scrollTop;
        this.updateVisibleRange();
        this.render();
    }
    
    updateVisibleRange() {
        this.startIndex = Math.floor(this.scrollTop / this.itemHeight);
        this.endIndex = Math.min(this.startIndex + this.visibleItems, this.items.length);
    }
    
    render() {
        // Update spacers
        this.topSpacer.style.height = `${this.startIndex * this.itemHeight}px`;
        this.bottomSpacer.style.height = `${(this.items.length - this.endIndex) * this.itemHeight}px`;
        
        // Render visible items
        this.contentContainer.innerHTML = '';
        for (let i = this.startIndex; i < this.endIndex; i++) {
            const item = this.items[i];
            const element = this.renderItem(item, i);
            element.style.position = 'absolute';
            element.style.top = `${i * this.itemHeight}px`;
            element.style.width = '100%';
            this.contentContainer.appendChild(element);
        }
    }
    
    updateItems(newItems) {
        this.items = newItems;
        this.render();
    }
} 