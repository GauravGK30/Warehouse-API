// Employee Management module - classic script, loaded after app.js.
(() => {
  const USERS_URL = 'http://localhost:5000/api/users';
  let employeeRows = [];
  let initialized = false;

  const byId = (id) => document.getElementById(id);
  const currentUser = () => window.getWarehouseCurrentUser?.() || null;
  const notify = (message, type = 'success') => {
    if (typeof window.showToast === 'function') window.showToast(message, type);
    else console.warn(message);
  };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[char]);

  async function usersRequest(url, options = {}) {
    const token = localStorage.getItem('warehouseToken');
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(url, { ...options, headers });
    let data = {};
    try { data = await response.json(); } catch (_) { /* empty response */ }
    if (!response.ok) {
      if (response.status === 401) {
        notify('Your session has expired. Please log in again.', 'error');
      }
      throw new Error(data.error || data.message || `Request failed (${response.status}).`);
    }
    return data;
  }

  function allowedCreateRoles(user) {
    if (!user) return [];
    if (user.role === 'manager') return ['staff'];
    if (user.role === 'admin') return user.is_owner || user.isOwner
      ? ['admin', 'manager', 'staff'] : ['manager', 'staff'];
    return [];
  }

  function setup() {
    if (initialized) return;
    initialized = true;
    byId('openAddEmployee')?.addEventListener('click', () => {
      const panel = byId('addEmployeePanel');
      if (panel) panel.hidden = !panel.hidden;
    });
    byId('cancelAddEmployee')?.addEventListener('click', closeForm);
    byId('addEmployeeForm')?.addEventListener('submit', createEmployee);
    byId('employeeSearch')?.addEventListener('input', renderEmployees);
    byId('employeesBody')?.addEventListener('click', handleEmployeeAction);
    byId('employeesBody')?.addEventListener('change', handleRoleChange);
  }

  function closeForm() {
    byId('addEmployeePanel').hidden = true;
    byId('addEmployeeForm')?.reset();
  }

  function configureRoleOptions() {
    const user = currentUser();
    const roles = allowedCreateRoles(user);
    const roleSelect = byId('employeeRole');
    if (!roleSelect) return;
    roleSelect.innerHTML = roles.map(role => `<option value="${role}">${role[0].toUpperCase()}${role.slice(1)}</option>`).join('');
    byId('openAddEmployee').hidden = roles.length === 0;
  }

  async function loadEmployees() {
    setup();
    configureRoleOptions();
    const tbody = byId('employeesBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="table-message">Loading employees...</td></tr>';
    try {
      const data = await usersRequest(USERS_URL);
      employeeRows = Array.isArray(data.users) ? data.users : [];
      renderEmployees();
    } catch (error) {
      console.error('Employee loading error:', error);
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="table-message">${escapeHtml(error.message)}</td></tr>`;
      byId('employeeCount').textContent = 'Unable to load employees';
      notify(error.message, 'error');
    }
  }

  function renderEmployees() {
    const tbody = byId('employeesBody');
    if (!tbody) return;
    const user = currentUser();
    const query = (byId('employeeSearch')?.value || '').trim().toLowerCase();
    const filtered = employeeRows.filter(employee => {
      const searchable = [employee.employee_code, employee.name, employee.email, employee.role].join(' ').toLowerCase();
      return searchable.includes(query);
    });
    byId('employeeCount').textContent = `${filtered.length} employee${filtered.length === 1 ? '' : 's'}`;
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-message">No employees found.</td></tr>';
      return;
    }
    tbody.innerHTML = filtered.map(employee => {
      const isOwner = Boolean(employee.is_owner);
      const isSelf = Number(employee.id) === Number(user?.id);
      const canManageStatus = !isOwner && !isSelf && employee.role !== 'admin' &&
        (user?.role === 'admin' || (user?.role === 'manager' && employee.role === 'staff'));
      const canChangeRole = user?.role === 'admin' && !isOwner && !isSelf && employee.role !== 'admin';
      const status = Boolean(Number(employee.is_active));
      const roleControl = canChangeRole
        ? `<select class="employee-role-select" data-action="role" data-id="${escapeHtml(employee.id)}" aria-label="Change role for ${escapeHtml(employee.name)}"><option value="manager" ${employee.role === 'manager' ? 'selected' : ''}>Manager</option><option value="staff" ${employee.role === 'staff' ? 'selected' : ''}>Staff</option></select>`
        : '<span>—</span>';
      const statusButton = canManageStatus
        ? `<button class="btn ${status ? 'btn-outline' : 'btn-primary'}" data-action="status" data-id="${escapeHtml(employee.id)}" data-active="${status ? 'false' : 'true'}" type="button">${status ? 'Deactivate' : 'Activate'}</button>`
        : '<span>—</span>';
      return `<tr>
        <td>${escapeHtml(employee.employee_code || '—')}</td>
        <td>${escapeHtml(employee.name)}${isOwner ? ' <strong>(Owner)</strong>' : ''}${isSelf ? ' <span>(You)</span>' : ''}</td>
        <td>${escapeHtml(employee.email)}</td>
        <td>${escapeHtml(employee.role)}</td>
        <td><span class="employee-status ${status ? 'active' : 'inactive'}">${status ? 'Active' : 'Inactive'}</span></td>
        <td><div class="employee-actions">${roleControl}${statusButton}</div></td>
      </tr>`;
    }).join('');
  }

  async function createEmployee(event) {
    event.preventDefault();
    const user = currentUser();
    const form = byId('addEmployeeForm');
    const payload = {
      name: byId('employeeName').value.trim(),
      email: byId('employeeEmail').value.trim(),
      password: byId('employeePassword').value,
      role: byId('employeeRole').value
    };
    if (!allowedCreateRoles(user).includes(payload.role)) {
      notify('You are not allowed to create an account with this role.', 'error');
      return;
    }
    if (new TextEncoder().encode(payload.password).length > 72) {
      notify('Password must not exceed 72 UTF-8 bytes.', 'error');
      return;
    }
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const result = await usersRequest(USERS_URL, { method: 'POST', body: JSON.stringify(payload) });
      notify(result.message || 'Employee created successfully.');
      closeForm();
      await loadEmployees();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      submit.disabled = false;
    }
  }

  async function handleEmployeeAction(event) {
    const button = event.target.closest('button[data-action="status"]');
    if (!button) return;
    const id = button.dataset.id;
    const isActive = button.dataset.active === 'true';
    const label = isActive ? 'activate' : 'deactivate';
    const confirmed = await window.showConfirmDialog?.({ title: `${isActive ? 'Activate' : 'Deactivate'} employee?`, message: `Are you sure you want to ${label} this employee?`, confirmText: isActive ? 'Activate' : 'Deactivate', danger: !isActive });
    if (!confirmed) return;
    button.disabled = true;
    try {
      const result = await usersRequest(`${USERS_URL}/${encodeURIComponent(id)}/status`, {
        method: 'PATCH', body: JSON.stringify({ is_active: isActive })
      });
      notify(result.message || `Employee ${isActive ? 'activated' : 'deactivated'} successfully.`);
      await loadEmployees();
    } catch (error) {
      notify(error.message, 'error');
      button.disabled = false;
    }
  }

  async function handleRoleChange(event) {
    const select = event.target.closest('select[data-action="role"]');
    if (!select) return;
    const id = select.dataset.id;
    const role = select.value;
    const confirmed = await window.showConfirmDialog?.({ title: 'Change employee role?', message: `Change this employee's role to ${role}?`, confirmText: 'Change role' });
    if (!confirmed) {
      await loadEmployees();
      return;
    }
    select.disabled = true;
    try {
      const result = await usersRequest(`${USERS_URL}/${encodeURIComponent(id)}/role`, {
        method: 'PATCH', body: JSON.stringify({ role })
      });
      notify(result.message || 'Employee role updated.');
      await loadEmployees();
    } catch (error) {
      notify(error.message, 'error');
      await loadEmployees();
    }
  }

  window.loadEmployees = loadEmployees;
})();
