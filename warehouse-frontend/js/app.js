// app.js - Frontend (robust to various backend shapes)

// API Configuration
const API_URL = 'http://localhost:5000/api/products';
let currentTab = 'all';
let currentWorkspace = 'dashboard';
let currentUser = null;
const DASHBOARD_URL = 'http://localhost:5000/api/dashboard';


async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem('warehouseToken');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, { ...options, headers });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();

    const token = localStorage.getItem('warehouseToken');
    updateAuthView();

    if (token) {
        loadCurrentUser();
    }
});

// Setup event listeners
function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    document.getElementById('signupForm')
    ?.addEventListener('submit', handleSignup);

    document.getElementById('showSignup')
    ?.addEventListener('click', () => showAuthPanel('signup'));

    document.getElementById('showLogin')
    ?.addEventListener('click', () => showAuthPanel('login'));
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    const refreshBtn = document.getElementById('refreshDashboard');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadDashboard);
    }


    const addForm = document.getElementById('addProductForm');
    if (addForm) addForm.addEventListener('submit', handleAddProduct);

    document.addEventListener('inventory:refresh', () => {
        loadProducts();
        loadDashboard();
    });

    // Sidebar workspace navigation
    document.querySelectorAll('[data-workspace]').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            switchWorkspace(event.currentTarget.dataset.workspace);
        });
    });



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
    if (!product) return undefined;
    const sources = [product, product.raw, product.product, product.data]
        .filter(value => value && typeof value === 'object');
    for (const source of sources) {
        for (const key of keys) {
            if (source[key] !== undefined && source[key] !== null) return source[key];
        }
    }
    return undefined;
}


async function handleLogin(e) {
  e.preventDefault();

  const errorEl = document.getElementById('loginError');
  const button = e.currentTarget.querySelector('button[type="submit"]');

  errorEl.textContent = '';
  errorEl.classList.remove('auth-success');
  button.disabled = true;

  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        warehouseCode: document.getElementById('loginWarehouseCode').value.trim().toUpperCase(),
        email: document.getElementById('loginEmail').value.trim(),
        password: document.getElementById('loginPassword').value
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Login failed');
    }

    const token = data.token || data.accessToken || data.data?.token;

    if (!token) {
      throw new Error('Login response did not contain a token.');
    }

    localStorage.setItem('warehouseToken', token);

    // Reload the page so the app can initialize with the saved token.
    location.reload();

  } catch (error) {
    errorEl.textContent = error.message || 'Unable to sign in.';
  } finally {
    button.disabled = false;
  }
}


function updateAuthView() {
    const token = localStorage.getItem('warehouseToken');
    const loginSection = document.getElementById('loginSection');
    const signupSection = document.getElementById('signupSection');
    const inventoryApp = document.getElementById('inventoryApp');

    if (token) {
        if (loginSection) loginSection.hidden = true;
        if (signupSection) signupSection.hidden = true;
        if (inventoryApp) inventoryApp.hidden = false;
    } else {
        if (loginSection) loginSection.hidden = false;
        if (signupSection) signupSection.hidden = true;
        if (inventoryApp) inventoryApp.hidden = true;
    }
}

function showAuthPanel(panel) {
    const loginSection = document.getElementById('loginSection');
    const signupSection = document.getElementById('signupSection');

    if (loginSection) loginSection.hidden = panel !== 'login';
    if (signupSection) signupSection.hidden = panel !== 'signup';

    const loginError = document.getElementById('loginError');
    const signupError = document.getElementById('signupError');
    const signupSuccess = document.getElementById('signupSuccess');

    if (loginError) loginError.textContent = '';
    if (signupError) signupError.textContent = '';
    if (signupSuccess) signupSuccess.textContent = '';
}

async function handleSignup(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const errorEl = document.getElementById('signupError');
    const successEl = document.getElementById('signupSuccess');

    if (errorEl) errorEl.textContent = '';
    if (successEl) successEl.textContent = '';
    if (button) button.disabled = true;

    try {
        const payload = {
            name: document.getElementById('signupOwnerName').value.trim(),
            warehouseName: document.getElementById('signupWarehouseName').value.trim(),
            email: document.getElementById('signupEmail').value.trim().toLowerCase(),
            password: document.getElementById('signupPassword').value
        };

        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || data.message || `Registration failed (${response.status}).`);
        }

        const warehouseCode = data.warehouse?.warehouse_code;
        if (!warehouseCode) {
            throw new Error('Registration response did not include warehouse.warehouse_code.');
        }

        const loginCode = document.getElementById('loginWarehouseCode');
        const loginEmail = document.getElementById('loginEmail');
        if (loginCode) loginCode.value = warehouseCode;
        if (loginEmail) loginEmail.value = payload.email;

        form.reset();

        // Show the generated Warehouse ID on the login screen, where it remains visible.
        showAuthPanel('login');
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = `Warehouse created successfully. Your Warehouse ID is ${warehouseCode}. Save this ID for future logins.`;
            loginError.classList.add('auth-success');
        }
    } catch (error) {
        if (errorEl) errorEl.textContent = error.message || 'Unable to register warehouse.';
    } finally {
        if (button) button.disabled = false;
    }
}
async function loadCurrentUser() {
    try {
        const response = await apiFetch('http://localhost:5000/api/auth/me');

        if (!response.ok) {
            if (response.status === 401) handleLogout();
            throw new Error('Unable to load user profile.');
        }

        const data = await response.json();
        currentUser = data.user;
        document.body.dataset.role = currentUser.role || 'staff';

        const warehouseName =
            currentUser.warehouse_name ||
            currentUser.warehouseName ||
            currentUser.warehouse?.name ||
            currentUser.warehouse_code ||
            'Warehouse';
        const warehouseEl = document.getElementById('headerWarehouseName');
        const userEl = document.getElementById('headerUserName');
        if (warehouseEl) warehouseEl.textContent = warehouseName;
        if (userEl) {
            const ownerLabel = currentUser.is_owner ? 'Owner' : (currentUser.role || 'Employee');
            userEl.textContent = `${currentUser.name || currentUser.email || 'User'} · ${ownerLabel}`;
        }

        // Keep creation controls aligned with backend role permissions.
        const addProductPanel = document.getElementById('workspace-add-product');
        if (addProductPanel) addProductPanel.hidden = !['admin', 'manager'].includes(currentUser.role);
        document.querySelectorAll('.btn-delete').forEach(button => {
            button.hidden = currentUser.role !== 'admin';
        });

        // User Management and Audit Trail are available to admin/manager.
        document.querySelectorAll('[data-roles]').forEach(link => {
            const allowedRoles = link.dataset.roles.split(',');
            link.hidden = !currentUser || !allowedRoles.includes(currentUser.role);
        });

        switchWorkspace('dashboard');
    } catch (error) {
        console.error('Profile error:', error);
        if (localStorage.getItem('warehouseToken')) {
            showToast('Unable to load your account details.', 'error');
        }
    }
}

function switchWorkspace(workspace) {
    const dashboardSections = ['workspace-dashboard', 'workspace-add-product', 'workspace-inventory'];
    const standaloneSections = ['workspace-recent-activity', 'workspace-user-management', 'workspace-audit-trail'];
    const dashboardAliases = ['dashboard', 'add-product', 'inventory'];
    const isDashboard = dashboardAliases.includes(workspace);

    if (workspace === 'user-management' || workspace === 'audit-trail') {
        if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) {
            showToast('You do not have permission to access this workspace.', 'error');
            return;
        }
    }

    // The overview, add-product form and inventory list remain visible together on Dashboard.
    dashboardSections.forEach(id => {
        const section = document.getElementById(id);
        if (section) section.hidden = !isDashboard;
    });
    // Staff can view inventory but cannot create products.
    const addProductSection = document.getElementById('workspace-add-product');
    if (addProductSection && isDashboard) {
        addProductSection.hidden = !currentUser || !['admin', 'manager'].includes(currentUser.role);
    }
    standaloneSections.forEach(id => {
        const section = document.getElementById(id);
        if (section) section.hidden = isDashboard || id !== `workspace-${workspace}`;
    });

    document.querySelectorAll('[data-workspace]').forEach(link => {
        link.classList.toggle('active', link.dataset.workspace === workspace ||
            (isDashboard && workspace === 'dashboard' && link.dataset.workspace === 'dashboard'));
    });

    const titles = {
        dashboard: 'Dashboard', 'add-product': 'Dashboard', inventory: 'Dashboard',
        'recent-activity': 'Recent Activity', 'user-management': 'User Management',
        'audit-trail': 'Audit Trail'
    };
    const title = titles[workspace] || 'Dashboard';
    const titleEl = document.getElementById('pageTitle');
    const breadcrumbEl = document.getElementById('pageBreadcrumb');
    if (titleEl) titleEl.textContent = title;
    if (breadcrumbEl) breadcrumbEl.textContent = `Workspace / ${title}`;

    const refreshButton = document.getElementById('refreshDashboard');
    if (refreshButton) refreshButton.hidden = !isDashboard;

    currentWorkspace = isDashboard ? 'dashboard' : workspace;

    if (isDashboard) {
        loadDashboard();
        loadProducts();
        if (workspace === 'add-product') {
            document.getElementById('workspace-add-product')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (workspace === 'inventory') {
            document.getElementById('workspace-inventory')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } else if (workspace === 'recent-activity') {
        if (typeof window.loadRecentActivity === 'function') {
            window.loadRecentActivity();
        } else {
            console.error('Recent Activity module is not loaded. Check js/modules/recentActivity.js in index.html.');
            showToast('Recent Activity could not be loaded. Please refresh the page.', 'error');
        }
    } else if (workspace === 'user-management') {
        if (typeof window.loadEmployees === 'function') {
            window.loadEmployees();
        } else {
            console.error('Employee Management module is not loaded. Check js/modules/employees.js in index.html.');
            showToast('Employee Management could not be loaded. Please refresh the page.', 'error');
        }
    } else if (workspace === 'audit-trail') {
        if (typeof window.loadAuditLogs === 'function') {
            window.loadAuditLogs();
        } else {
            console.error('Audit Trail module is not loaded. Check js/modules/audit.js in index.html.');
            showToast('Audit Trail could not be loaded. Please refresh the page.', 'error');
        }
    }
}

// Read-only access for feature modules; backend remains responsible for authorization.
window.getWarehouseCurrentUser = () => currentUser;

function handleLogout() {
    localStorage.removeItem('warehouseToken');
    currentUser = null;
    currentWorkspace = 'dashboard';

    document.getElementById('loginForm').reset();
    document.getElementById('loginError').textContent = '';

    updateAuthView();
}



function renderDashboardSummary(summary = {}) {
    const value = (...keys) => {
        for (const key of keys) {
            if (summary[key] !== undefined && summary[key] !== null) return Number(summary[key]) || 0;
        }
        return 0;
    };

    const totalProducts = value('total_products', 'totalProducts', 'product_count');
    const totalStock = value('total_stock_units', 'total_stock', 'totalStock', 'in_stock_units');
    const lowStock = value('low_stock_items', 'low_stock_products', 'lowStock');
    const outOfStock = value('out_of_stock_items', 'out_of_stock_products', 'outOfStock');
    const inStock = value('in_stock_items', 'in_stock_products', 'inStock');

    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = Number(val).toLocaleString();
    };
    setText('totalProducts', totalProducts);
    setText('totalStock', totalStock);
    setText('lowStock', lowStock);
    setText('outOfStock', outOfStock);
    setText('inStockCount', inStock);
    setText('lowStockCount', lowStock);
    setText('outOfStockCount', outOfStock);

    const denominator = Math.max(totalProducts, 1);
    const setWidth = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.style.width = `${Math.max(0, Math.min(100, (val / denominator) * 100))}%`;
    };
    setWidth('inStockBar', inStock);
    setWidth('lowStockBar', lowStock);
    setWidth('outOfStockBar', outOfStock);

    const health = totalProducts ? Math.round((inStock / totalProducts) * 100) : 0;
    setText('stockHealth', `${health}%`);
    const healthText = document.getElementById('stockHealthText');
    if (healthText) {
        healthText.textContent = totalProducts
            ? `${inStock} of ${totalProducts} products are in stock.`
            : 'No products have been added yet.';
    }
}

//load Dashboard


async function loadDashboard() {
    try {
        const response = await apiFetch(`${DASHBOARD_URL}/summary`);

        if (response.status === 401) {
            handleLogout();
            showToast('Session expired. Please sign in again.', 'error');
            return;
        }

        if (!response.ok) {
            throw new Error('Unable to load dashboard data.');
        }

        const data = await response.json();
        renderDashboardSummary(data.summary);

    } catch (error) {
        console.error('Dashboard error:', error);
        showToast('Failed to load dashboard.', 'error');
    }
}

// Load products based on current tab
async function loadProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return console.warn('No productsContainer element found.');

    container.innerHTML = '<div class="loading">Loading products...</div>';

    try {
        const endpoint = currentTab === 'low' ? `${API_URL}/low-stock` : API_URL;
        const response = await apiFetch(endpoint);
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
        'name', 'product_name', 'productName', 'title', 'Name', 'NAME', 'PRODUCT_NAME'
    ) ?? 'Unnamed Product';

    const productCode = getField(product, 'product_code', 'productCode', 'sku') ?? '—';
    const description = getField(product,
        'description', 'product_description', 'productDescription', 'desc', 'DESCRIPTION', 'PRODUCT_DESCRIPTION'
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
            
            <div class="product-code">Code: ${escapeHtml(productCode)}</div>
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
                ${currentUser && ['admin', 'manager'].includes(currentUser.role) ? `<button class="btn btn-secondary btn-edit-product" data-id="${escapeHtml(id)}" type="button">✏️ Edit</button>` : ''}
                <button class="btn btn-info btn-history" data-id="${escapeHtml(id)}">📊 History</button>
                ${currentUser && currentUser.role === 'admin' ? `<button class="btn btn-danger btn-delete" data-id="${escapeHtml(id)}">🗑️ Delete</button>` : ''}
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
    const codeEl = document.getElementById('productCode');
    const stockEl = document.getElementById('stock');
    const thresholdEl = document.getElementById('threshold');

    const product = {
        name: nameEl ? nameEl.value.trim() : '',
        product_code: codeEl ? codeEl.value.trim() : '',
        description: descEl ? descEl.value.trim() : '',
        stock_quantity: stockEl ? parseInt(stockEl.value, 10) || 0 : 0,
        low_stock_threshold: thresholdEl ? parseInt(thresholdEl.value, 10) || 3 : 3
    };

    try {
        const response = await apiFetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });

        if (response.ok) {
            showToast('Product added successfully!', 'success');
            if (e.target && typeof e.target.reset === 'function') e.target.reset();
            if (thresholdEl) thresholdEl.value = 3;
            loadProducts();
            loadDashboard();
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
        const response = await apiFetch(`${API_URL}/${id}/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity })
        });

        if (response.ok) {
            showToast(`Stock ${type}d successfully!`, 'success');
            loadProducts();
            loadDashboard();
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
        const response = await apiFetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Product deleted successfully!', 'success');
            loadProducts();
            loadDashboard();
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
        const response = await apiFetch(`${API_URL}/${id}/history`);
        const history = await response.json();

        const productResponse = await apiFetch(`${API_URL}/${id}`);
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
