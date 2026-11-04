const API_BASE = 'http://localhost:5000/api';

function authHeaders(extra = {}) {
    const headers = new Headers(extra);
    const token = localStorage.getItem('warehouseToken');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
}

async function request(url, options = {}) {
    return fetch(url, {
        ...options,
        headers: authHeaders(options.headers || {})
    });
}

function escape(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function toast(message, type = 'success') {
    const el = document.getElementById('toast');
    if (!el) {
        console[type === 'error' ? 'error' : 'log'](message);
        return;
    }
    el.textContent = message;
    el.className = `toast ${type} show`;
    window.setTimeout(() => el.classList.remove('show'), 3000);
}

function getProduct(data) {
    if (data?.product && typeof data.product === 'object') return data.product;
    if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) return data.data;
    return data;
}

async function openEditForm(productId) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    if (!modal || !title || !body) {
        toast('Product modal is missing from the page.', 'error');
        return;
    }

    title.textContent = 'Edit product';
    body.innerHTML = '<p class="loading">Loading product details...</p>';
    modal.classList.add('active');

    try {
        const response = await request(`${API_BASE}/products/${encodeURIComponent(productId)}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || data.message || 'Unable to load product.');
        const product = getProduct(data);
        // console.log(
        //     "Complete product API response:",
        //     JSON.stringify(data, null, 2)
        // );

        const name =
            product.name ??
            product.product_name ??
            product.productName ??
            product.NAME ??
            '';

        const code =
            product.product_code ??
            product.productCode ??
            product.sku ??
            '';

        const description =
            product.description ??
            product.DESCRIPTION ??
            product.product_description ??
            product.productDescription ??
            product.desc ??
            '';

        const stock = Number(
            product.stock_quantity ?? product.stock ?? 0
        );

        const threshold = Number(
            product.low_stock_threshold ?? 3
        );

        body.innerHTML = `
            <form id="editProductForm" class="edit-product-form">
                <div class="form-group">
                    <label for="editProductName">Product name *</label>
                    <input id="editProductName" name="name" type="text" maxlength="100" required value="${escape(name)}">
                </div>
                <div class="form-group">
                    <label for="editProductCode">Product code *</label>
                    <input id="editProductCode" name="product_code" type="text" maxlength="64" required value="${escape(code)}">
                </div>
                <div class="form-group">
                    <label for="editProductDescription">Description</label>
                    <input id="editProductDescription" name="description" type="text" value="${escape(description)}">
                </div>
                <div class="form-group">
                    <label>Current stock</label>
                    <input type="number" value="${escape(stock)}" disabled>
                    <small>Use Increase/Decrease to change stock so stock history remains accurate.</small>
                </div>
                <div class="form-group">
                    <label for="editProductThreshold">Low stock threshold *</label>
                    <input id="editProductThreshold" name="low_stock_threshold" type="number" min="1" step="1" required value="${escape(threshold)}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" id="cancelEditProduct">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save changes</button>
                </div>
                <p id="editProductError" class="login-error" role="alert"></p>
            </form>
        `;

        document.getElementById('cancelEditProduct')?.addEventListener('click', closeEditModal);
        document.getElementById('editProductForm')?.addEventListener('submit', event => saveProduct(event, productId, stock));
    } catch (error) {
        body.innerHTML = `<p class="login-error">${escape(error.message)}</p>`;
    }
}

async function saveProduct(event, productId, currentStock) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const errorEl = document.getElementById('editProductError');
    if (submit) submit.disabled = true;
    if (errorEl) errorEl.textContent = '';

    const payload = {
        name: document.getElementById('editProductName').value.trim(),
        product_code: document.getElementById('editProductCode').value.trim(),
        description: document.getElementById('editProductDescription').value.trim(),
        stock_quantity: currentStock,
        low_stock_threshold: Number(document.getElementById('editProductThreshold').value)
    };

    try {
        if (!payload.name || !payload.product_code || !Number.isInteger(payload.low_stock_threshold) || payload.low_stock_threshold < 1) {
            throw new Error('Enter a valid product name, code and positive threshold.');
        }

        const response = await request(`${API_BASE}/products/${encodeURIComponent(productId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || data.message || `Update failed (${response.status}).`);

        closeEditModal();
        toast('Product updated successfully.', 'success');
        document.dispatchEvent(new CustomEvent('inventory:refresh'));
    } catch (error) {
        if (errorEl) errorEl.textContent = error.message || 'Unable to update product.';
        else toast(error.message || 'Unable to update product.', 'error');
    } finally {
        if (submit) submit.disabled = false;
    }
}

function closeEditModal() {
    document.getElementById('productModal')?.classList.remove('active');
}

function initProductEditing() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    container.addEventListener('click', event => {
        const button = event.target.closest('.btn-edit-product');
        if (!button) return;
        if (!['admin', 'manager'].includes(document.body.dataset.role)) {
            toast('You do not have permission to edit products.', 'error');
            return;
        }
        openEditForm(button.dataset.id);
    });

    document.getElementById('productModal')?.addEventListener('click', event => {
        if (event.target.id === 'productModal') closeEditModal();
    });
    document.querySelector('#productModal .close')?.addEventListener('click', closeEditModal);
}

document.addEventListener('DOMContentLoaded', initProductEditing);
