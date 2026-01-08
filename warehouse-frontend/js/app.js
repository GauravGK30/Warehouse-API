// app.js - Frontend (robust to various backend shapes)

// API Configuration
const API_URL = 'http://localhost:5000/api/products';

let currentTab = 'all';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    const addForm = document.getElementById('addProductForm');
    if (addForm) addForm.addEventListener('submit', handleAddProduct);

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentTab = e.currentTarget.dataset.tab;
            loadProducts();
        });
    });

    const closeBtn = document.querySelector('.close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    const productModal = document.getElementById('productModal');
    if (productModal) {
        productModal.addEventListener('click', (e) => {
            if (e.target.id === 'productModal') closeModal();
        });
    }
}

// Normalize product in frontend (defensive)
function getField(product, ...keys) {
    // If backend included a 'raw' shape, prefer it for fallback checks
    if (!product) return undefined;
    const source = product.raw ?? product;
    for (const k of keys) {
        if (source[k] !== undefined && source[k] !== null) return source[k];
    }
    return undefined;
}

// Load products based on current tab
async function loadProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return console.warn('No productsContainer element found.');

    container.innerHTML = '<div class="loading">Loading products...</div>';

    try {
        const endpoint = currentTab === 'low' ? `${API_URL}/low-stock` : API_URL;
        const response = await fetch(endpoint);
        const data = await response.json();

        // Normalize response shapes: array or object-wrapped
        let products = [];
        if (Array.isArray(data)) {
            products = data;
        } else if (Array.isArray(data.data)) {
            products = data.data;
        } else if (Array.isArray(data.products)) {
            products = data.products;
        } else if (data && typeof data === 'object' && (data.id || data._id || data.product_name || data.name || data.raw)) {
            // possibly single product object
            products = [data];
        } else {
            products = [];
        }

        console.log('Loaded products (frontend):', products);

        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>📦 No products found</h3>
                    <p>${currentTab === 'low' ? 'All products are well stocked!' : 'Add your first product to get started.'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = products.map(product => createProductCard(product)).join('');
        attachProductEventListeners();
    } catch (error) {
        console.error('loadProducts error:', error);
        container.innerHTML = '<div class="empty-state"><h3>❌ Error loading products</h3></div>';
        showToast('Failed to load products', 'error');
    }
}

// Create product card HTML (robust)
function createProductCard(product) {
    // Log so you can inspect the shape in the console
    console.log('product in createProductCard:', product);

    // Accept multiple variants and also support backend-provided `raw` object

    const name = getField(product,
        'name', 'product_name', 'productName', 'title', 'Name', 'NAME'
    ) ?? 'Unnamed Product';

    const description = getField(product,
        'description', 'product_description', 'productDescription', 'desc', 'DESCRIPTION'
    ) ?? 'No description';
    
    const stockQtyRaw = getField(product, 'stock_quantity', 'stock', 'qty', 'quantity');
    const stockQty = stockQtyRaw === undefined || stockQtyRaw === null ? 0 : Number(stockQtyRaw);

    const thresholdRaw = getField(product, 'low_stock_threshold', 'lowThreshold', 'threshold');
    const threshold = thresholdRaw === undefined || thresholdRaw === null ? 3 : Number(thresholdRaw);

    const isLowStock = Number(stockQty) < Number(threshold);
    const stockClass = isLowStock ? 'low' : 'ok';

    // Many backends use _id; also handle id or id inside raw
    const idRaw = getField(product, 'id', '_id', 'product_id');
    const id = (idRaw && typeof idRaw === 'object' && idRaw.toString) ? idRaw.toString() : (idRaw ?? '');

    return `
        <div class="product-card" data-id="${escapeHtml(id)}">
            <div class="product-header">
                <div>
                    <div class="product-name">${escapeHtml(name)}</div>
                    <span class="stock-badge ${stockClass}">${isLowStock ? '⚠️ Low Stock' : '✓ In Stock'}</span>
                </div>
            </div>
            
            <div class="product-description">${escapeHtml(description)}</div>
            
            <div class="stock-info">
                <div>
                    <div class="stock-label">Current Stock</div>
                    <div class="stock-value ${stockClass}">${escapeHtml(stockQty)}</div>
                </div>
                <div style="text-align: right;">
                    <div class="stock-label">Threshold</div>
                    <div style="font-size: 1.2em; font-weight: 600; color: #666;">${escapeHtml(threshold)}</div>
                </div>
            </div>
            
            <div class="stock-controls">
                <input type="number" class="stock-input" placeholder="Qty" min="1" value="1">
                <button class="btn btn-secondary btn-increase" data-id="${escapeHtml(id)}">+ Add</button>
                <button class="btn btn-danger btn-decrease" data-id="${escapeHtml(id)}">- Remove</button>
            </div>
            
            <div class="product-actions">
                <button class="btn btn-info btn-history" data-id="${escapeHtml(id)}">📊 History</button>
                <button class="btn btn-danger btn-delete" data-id="${escapeHtml(id)}">🗑️ Delete</button>
            </div>
        </div>
    `;
}

// Attach event listeners to product cards
function attachProductEventListeners() {
    document.querySelectorAll('.btn-increase').forEach(btn => {
        btn.removeEventListener('click', onIncreaseClick);
        btn.addEventListener('click', onIncreaseClick);
    });

    document.querySelectorAll('.btn-decrease').forEach(btn => {
        btn.removeEventListener('click', onDecreaseClick);
        btn.addEventListener('click', onDecreaseClick);
    });

    document.querySelectorAll('.btn-history').forEach(btn => {
        btn.removeEventListener('click', onHistoryClick);
        btn.addEventListener('click', onHistoryClick);
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.removeEventListener('click', onDeleteClick);
        btn.addEventListener('click', onDeleteClick);
    });
}

// event handlers
async function onIncreaseClick(e) {
    const btn = e.currentTarget;
    const card = btn.closest('.product-card');
    const id = btn.dataset.id;
    const input = card.querySelector('.stock-input');
    const quantity = parseInt(input.value, 10);

    if (!quantity || quantity <= 0) {
        showToast('Quantity must be greater than 0', 'error');
        return;
    }

    await updateStock(id, quantity, 'increase');
    input.value = 1;
}

async function onDecreaseClick(e) {
    const btn = e.currentTarget;
    const card = btn.closest('.product-card');
    const id = btn.dataset.id;
    const input = card.querySelector('.stock-input');
    const quantity = parseInt(input.value, 10);

    if (!quantity || quantity <= 0) {
        showToast('Quantity must be greater than 0', 'error');
        return;
    }

    await updateStock(id, quantity, 'decrease');
    input.value = 1;
}

function onHistoryClick(e) {
    const id = e.currentTarget.dataset.id;
    showHistory(id);
}

async function onDeleteClick(e) {
    const id = e.currentTarget.dataset.id;
    if (confirm('Are you sure you want to delete this product?')) {
        await deleteProduct(id);
    }
}

// Handle add product form submission
async function handleAddProduct(e) {
    e.preventDefault();

    const nameEl = document.getElementById('name');
    const descEl = document.getElementById('description');
    const stockEl = document.getElementById('stock');
    const thresholdEl = document.getElementById('threshold');

    const product = {
        name: nameEl ? nameEl.value.trim() : '',
        description: descEl ? descEl.value.trim() : '',
        stock_quantity: stockEl ? parseInt(stockEl.value, 10) || 0 : 0,
        low_stock_threshold: thresholdEl ? parseInt(thresholdEl.value, 10) || 3 : 3
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });

        if (response.ok) {
            showToast('Product added successfully!', 'success');
            if (e.target && typeof e.target.reset === 'function') e.target.reset();
            if (thresholdEl) thresholdEl.value = 3;
            loadProducts();
        } else {
            let errorText = 'Failed to add product';
            try {
                const error = await response.json();
                errorText = error.error || error.message || errorText;
            } catch (err) { /* ignore */ }
            showToast(errorText, 'error');
        }
    } catch (error) {
        console.error('handleAddProduct error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

// Update stock (increase or decrease)
async function updateStock(id, quantity, type) {
    if (!id) {
        showToast('Invalid product id', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity })
        });

        if (response.ok) {
            showToast(`Stock ${type}d successfully!`, 'success');
            loadProducts();
        } else {
            let errMsg = `Failed to ${type} stock`;
            try {
                const err = await response.json();
                errMsg = err.error || err.message || errMsg;
            } catch (err) { /* ignore */ }
            showToast(errMsg, 'error');
        }
    } catch (error) {
        console.error('updateStock error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

// Delete product
async function deleteProduct(id) {
    if (!id) {
        showToast('Invalid product id', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Product deleted successfully!', 'success');
            loadProducts();
        } else {
            showToast('Failed to delete product', 'error');
        }
    } catch (error) {
        console.error('deleteProduct error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

// Show stock history modal
async function showHistory(id) {
    if (!id) {
        showToast('Invalid product id', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}/history`);
        const history = await response.json();

        const productResponse = await fetch(`${API_URL}/${id}`);
        const product = await productResponse.json();

        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        const productName = getField(product, 'name', 'product_name') ?? 'Product';
        if (modalTitle) modalTitle.textContent = `📊 ${productName} - Stock History`;

        if (!modalBody) {
            showToast('Modal body element not found', 'error');
            return;
        }

        if (!history || history.length === 0) {
            modalBody.innerHTML = '<p style="text-align: center; color: #666;">No history available yet.</p>';
        } else {
            modalBody.innerHTML = history.map(item => `
                <div class="history-item ${escapeHtml(item.change_type || '')}">
                    <div class="history-type">${item.change_type === 'increase' ? '📈' : '📉'} ${escapeHtml(item.change_type || '')}</div>
                    <div class="history-quantity">${item.change_type === 'increase' ? '+' : '-'}${escapeHtml(item.quantity)}</div>
                    <div class="history-date">${new Date(item.created_at).toLocaleString()}</div>
                </div>
            `).join('');
        }

        const productModal = document.getElementById('productModal');
        if (productModal) productModal.classList.add('active');
    } catch (error) {
        console.error('showHistory error:', error);
        showToast('Failed to load history', 'error');
    }
}

// Close modal
function closeModal() {
    const productModal = document.getElementById('productModal');
    if (productModal) productModal.classList.remove('active');
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console[type === 'error' ? 'error' : 'log'](message);
        return;
    }

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// small helper to avoid injecting raw HTML from product fields
function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
