// Phase 3: Recent Activity and Filters
// This is a classic script (not an ES module) because it uses shared
// functions from app.js: apiFetch, DASHBOARD_URL, showToast, escapeHtml.

let recentActivityRows = [];

function initRecentActivity() {
    const filterIds = [
        'activitySearch',
        'activityMovement',
        'activityEmployee',
        'activityFrom',
        'activityTo'
    ];

    filterIds.forEach(id => {
        const control = document.getElementById(id);
        if (!control) return;

        control.addEventListener('input', applyActivityFilters);

        if (control.tagName === 'SELECT') {
            control.addEventListener('change', applyActivityFilters);
        }
    });

    document.getElementById('clearActivityFilters')
        ?.addEventListener('click', clearActivityFilters);
}

async function loadRecentActivity() {
    const tbody = document.getElementById('activityBody');

    if (tbody) {
        tbody.innerHTML =
            '<tr><td colspan="6" class="table-message">Loading recent activity...</td></tr>';
    }

    try {
        const response = await apiFetch(`${DASHBOARD_URL}/recent-activity`);

        if (response.status === 401) {
            handleLogout();
            showToast('Session expired. Please sign in again.', 'error');
            return;
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.error || data.message || 'Unable to load recent activity.'
            );
        }

        const rows = Array.isArray(data)
            ? data
            : (data.activities || data.data || []);

        recentActivityRows = Array.isArray(rows) ? rows : [];

        populateActivityEmployeeFilter(recentActivityRows);
        applyActivityFilters();
    } catch (error) {
        console.error('Recent activity error:', error);

        if (tbody) {
            tbody.innerHTML =
                '<tr><td colspan="6" class="table-message">Unable to load recent activity.</td></tr>';
        }

        showToast(error.message || 'Failed to load recent activity.', 'error');
    }
}

function activityEmployeeName(item) {
    return item.employee_name ||
        item.changed_by_name ||
        item.user_name ||
        item.actor_name ||
        item.changed_by?.name ||
        '';
}

function activityEmployeeCode(item) {
    return item.employee_code ||
        item.changed_by_employee_code ||
        item.user_employee_code ||
        item.actor_employee_code ||
        item.changed_by?.employee_code ||
        '';
}

function activityEmployeeKey(item) {
    const code = activityEmployeeCode(item);
    const name = activityEmployeeName(item);
    const id = item.changed_by ||
        item.user_id ||
        item.changed_by_id ||
        item.actor_id ||
        '';

    return String(code || id || name || 'unknown');
}

function populateActivityEmployeeFilter(rows) {
    const select = document.getElementById('activityEmployee');
    if (!select) return;

    const previousValue = select.value;
    const employees = new Map();

    rows.forEach(item => {
        const name = activityEmployeeName(item);
        const code = activityEmployeeCode(item);

        // Older stock-history records may not have employee details.
        if (!name && !code) return;

        const key = activityEmployeeKey(item);
        const label = `${name || 'Employee'}${code ? ` (${code})` : ''}`;
        employees.set(key, label);
    });

    select.innerHTML = '<option value="all">All employees</option>';

    [...employees.entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .forEach(([key, label]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = label;
            select.appendChild(option);
        });

    if ([...select.options].some(option => option.value === previousValue)) {
        select.value = previousValue;
    }
}

function getActivityDateOnly(value) {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    // Use the browser's local calendar date for date input comparisons.
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function applyActivityFilters() {
    const search = (
        document.getElementById('activitySearch')?.value || ''
    ).trim().toLowerCase();

    const movement =
        document.getElementById('activityMovement')?.value || 'all';

    const employee =
        document.getElementById('activityEmployee')?.value || 'all';

    const from =
        document.getElementById('activityFrom')?.value || '';

    const to =
        document.getElementById('activityTo')?.value || '';

    const filtered = recentActivityRows.filter(item => {
        const productName = String(
            item.product_name || item.name || ''
        ).toLowerCase();

        const productCode = String(item.product_code || '').toLowerCase();
        const type = String(
            item.change_type || item.movement || ''
        ).toLowerCase();

        const dateOnly = getActivityDateOnly(item.created_at);

        if (
            search &&
            !productName.includes(search) &&
            !productCode.includes(search)
        ) {
            return false;
        }

        if (movement !== 'all' && type !== movement) return false;

        if (
            employee !== 'all' &&
            activityEmployeeKey(item) !== employee
        ) {
            return false;
        }

        if (from && (!dateOnly || dateOnly < from)) return false;
        if (to && (!dateOnly || dateOnly > to)) return false;

        return true;
    });

    renderRecentActivity(filtered);
}

function clearActivityFilters() {
    ['activitySearch', 'activityFrom', 'activityTo'].forEach(id => {
        const input = document.getElementById(id);
        if (input) input.value = '';
    });

    const movement = document.getElementById('activityMovement');
    const employee = document.getElementById('activityEmployee');

    if (movement) movement.value = 'all';
    if (employee) employee.value = 'all';

    applyActivityFilters();
}

function renderRecentActivity(activities) {
    const tbody = document.getElementById('activityBody');
    if (!tbody) return;

    if (!Array.isArray(activities) || activities.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="6" class="table-message">No activities match these filters.</td></tr>';
        return;
    }

    tbody.innerHTML = activities.map(item => {
        const type = String(
            item.change_type || item.movement || ''
        ).toLowerCase();

        const safeType = ['increase', 'decrease'].includes(type)
            ? type
            : 'unknown';

        const sign = safeType === 'increase'
            ? '+'
            : safeType === 'decrease'
                ? '-'
                : '';

        const employeeName = activityEmployeeName(item);
        const employeeCode = activityEmployeeCode(item);

        const changedBy = employeeName || employeeCode
            ? `${employeeName || 'Employee'}${employeeCode ? ` (${employeeCode})` : ''}`
            : 'Not available';

        return `
            <tr>
                <td><strong>${escapeHtml(item.product_name || item.name || '—')}</strong></td>
                <td>${escapeHtml(item.product_code || '—')}</td>
                <td><span class="movement ${safeType}">${escapeHtml(type || 'Unknown')}</span></td>
                <td class="quantity-${safeType}">${sign}${escapeHtml(item.quantity ?? '—')}</td>
                <td>${escapeHtml(changedBy)}</td>
                <td>${formatActivityDate(item.created_at)}</td>
            </tr>
        `;
    }).join('');
}

function formatActivityDate(value) {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleString();
}

// Expose the loader explicitly so app.js can call it regardless of script scope.
window.loadRecentActivity = loadRecentActivity;

document.addEventListener('DOMContentLoaded', initRecentActivity);
