// Phase 5: Human-readable Warehouse Audit Trail.
(() => {
  const AUDIT_URL = 'http://localhost:5000/api/audit-logs';
  let auditRows = [];
  let initialized = false;
  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  async function requestAuditLogs() {
    const token = localStorage.getItem('warehouseToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(AUDIT_URL, { headers });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      if (typeof window.handleLogout === 'function') window.handleLogout();
      throw new Error('Your session has expired. Please log in again.');
    }
    if (!response.ok) throw new Error(data.error || data.message || `Unable to load audit logs (${response.status}).`);
    return Array.isArray(data.auditLogs) ? data.auditLogs : [];
  }

  const getDate = row => row.created_at || row.timestamp || row.createdAt || row.date || '';
  const getAction = row => String(row.action || row.event || 'UNKNOWN').toUpperCase();
  const getEntity = row => String(row.entity_type || row.entityType || 'record').toUpperCase();
  const getActor = row => row.employee_name || row.user_name || row.actor_name || row.name || 'Not available';
  const getRecord = row => row.entity_label || row.record_name || row.product_name || row.employee_record || '—';

  function parseJson(value) {
    if (value && typeof value === 'object') return value;
    if (typeof value !== 'string') return null;
    try { return JSON.parse(value); } catch (_) { return null; }
  }

  // Handles backend details stored either as an object or as text such as
  // 'after: {...} · before: {...}'. Extracts balanced JSON objects safely.
  function extractBeforeAfter(raw) {
    const parsed = parseJson(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        before: parsed.before ?? parsed.previous ?? parsed.old_values ?? parsed.oldValues,
        after: parsed.after ?? parsed.new_values ?? parsed.newValues,
        values: parsed
      };
    }
    const text = String(raw ?? '');
    const result = { before: null, after: null, values: null };
    for (const key of ['before', 'after']) {
      const match = new RegExp(`${key}\\s*:\\s*`, 'i').exec(text);
      if (!match) continue;
      const start = text.indexOf('{', match.index + match[0].length);
      if (start < 0) continue;
      let depth = 0, quoted = false, escaped = false, end = -1;
      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
          if (escaped) escaped = false;
          else if (ch === '\\') escaped = true;
          else if (ch === '"') quoted = false;
        } else if (ch === '"') quoted = true;
        else if (ch === '{') depth++;
        else if (ch === '}' && --depth === 0) { end = i + 1; break; }
      }
      if (end > start) result[key] = parseJson(text.slice(start, end));
    }
    return result;
  }

  const FIELD_LABELS = {
    name: 'Name', NAME: 'Name', description: 'Description', DESCRIPTION: 'Description',
    product_code: 'Product code', employee_code: 'Employee code', email: 'Email',
    role: 'Role', is_active: 'Account status', status: 'Status',
    stock_quantity: 'Stock quantity', low_stock_threshold: 'Low-stock threshold',
    quantity: 'Quantity', quantity_added: 'Quantity added', quantity_removed: 'Quantity removed',
    previous_stock: 'Previous stock', new_stock: 'New stock', password: 'Password'
  };
  const OMIT_FIELDS = new Set(['id', 'warehouse_id', 'created_at', 'updated_at', 'password', 'password_hash']);
  const normalizeKey = key => {
    if (key === 'NAME') return 'name';
    if (key === 'DESCRIPTION') return 'description';
    return key;
  };
  const displayValue = (key, value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (key === 'is_active') return value === true || value === 1 || value === '1' ? 'Active' : 'Inactive';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };
  const labelFor = key => FIELD_LABELS[key] || FIELD_LABELS[normalizeKey(key)] || String(key).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  function renderChanges(before, after) {
    if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return '';
    const oldMap = new Map(Object.entries(before).map(([k,v]) => [normalizeKey(k), v]));
    const newMap = new Map(Object.entries(after).map(([k,v]) => [normalizeKey(k), v]));
    const keys = [...new Set([...oldMap.keys(), ...newMap.keys()])].filter(k => !OMIT_FIELDS.has(k));
    const changed = keys.filter(k => JSON.stringify(oldMap.get(k)) !== JSON.stringify(newMap.get(k)));
    if (!changed.length) return '<div class="audit-no-change">No field values changed.</div>';
    return `<div class="audit-detail-list">${changed.map(key => `<div class="audit-change-item"><span class="audit-field-label">${esc(labelFor(key))}</span><span class="audit-change-values"><span class="audit-old-value">${esc(displayValue(key, oldMap.get(key)))}</span><span class="audit-arrow">→</span><span class="audit-new-value">${esc(displayValue(key, newMap.get(key)))}</span></span></div>`).join('')}</div>`;
  }

  function renderFlatDetails(values) {
    if (!values || typeof values !== 'object') return '';
    const entries = Object.entries(values).filter(([key]) => !OMIT_FIELDS.has(key));
    if (!entries.length) return '';
    return `<div class="audit-detail-list">${entries.map(([key, value]) => `<div class="audit-change-item"><span class="audit-field-label">${esc(labelFor(key))}</span><span class="audit-flat-value">${esc(displayValue(key, value))}</span></div>`).join('')}</div>`;
  }

  function detailsMarkup(row) {
    const raw = row.details ?? row.changes ?? row.metadata ?? row.description ?? '';
    const parsed = extractBeforeAfter(raw);
    if (parsed.before || parsed.after) {
      const changes = renderChanges(parsed.before, parsed.after);
      if (changes) return `<div class="audit-details-heading">Changed fields</div>${changes}`;
      const afterMarkup = renderFlatDetails(parsed.after);
      if (afterMarkup) return `<div class="audit-details-heading">Updated values</div>${afterMarkup}`;
    }
    const values = parsed.values || parseJson(raw);
    if (values && typeof values === 'object') {
      // Stock movements are easier to understand as a short sentence.
      const previous = values.previous_stock;
      const next = values.new_stock;
      const qty = values.quantity_added ?? values.quantity_removed ?? values.quantity;
      if (previous !== undefined && next !== undefined) {
        const direction = Number(next) >= Number(previous) ? 'increased' : 'decreased';
        return `<div class="audit-stock-summary">Stock ${direction} from <strong>${esc(previous)}</strong> to <strong>${esc(next)}</strong>.</div>${qty !== undefined ? `<div class="audit-stock-meta">Quantity ${direction === 'increased' ? 'added' : 'removed'}: <strong>${esc(qty)}</strong></div>` : ''}`;
      }
      return renderFlatDetails(values) || '<span class="audit-muted">No additional details</span>';
    }
    if (typeof raw === 'string' && raw.trim()) return `<span>${esc(raw)}</span>`;
    return '<span class="audit-muted">No additional details</span>';
  }

  function actionLabel(action) {
    return action.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  function actionClass(action) {
    if (action.includes('CREATE')) return 'create';
    if (action.includes('DELETE') || action.includes('DEACTIVATE')) return 'delete';
    if (action.includes('INCREASE')) return 'increase';
    if (action.includes('DECREASE')) return 'decrease';
    return 'update';
  }
  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? esc(value) : date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function setup() {
    if (initialized) return;
    initialized = true;
    ['auditSearch','auditAction','auditEntity','auditFrom','auditTo'].forEach(id => {
      const el = byId(id);
      el?.addEventListener('input', render);
      el?.addEventListener('change', render);
    });
    byId('clearAuditFilters')?.addEventListener('click', () => {
      ['auditSearch','auditAction','auditEntity','auditFrom','auditTo'].forEach(id => {
        if (byId(id)) byId(id).value = id === 'auditAction' || id === 'auditEntity' ? 'all' : '';
      });
      render();
    });
    byId('refreshAudit')?.addEventListener('click', loadAuditLogs);
  }

  function populateOptions(id, values) {
    const select = byId(id);
    if (!select || select.dataset.loaded === 'true') return;
    const unique = [...new Set(values.filter(v => v && v !== '—').map(String))].sort();
    select.innerHTML = `<option value="all">All ${id === 'auditAction' ? 'actions' : 'entities'}</option>` + unique.map(v => `<option value="${esc(v)}">${esc(actionLabel(v))}</option>`).join('');
    select.dataset.loaded = 'true';
  }

  function render() {
    const tbody = byId('auditBody');
    if (!tbody) return;
    const q = (byId('auditSearch')?.value || '').trim().toLowerCase();
    const action = byId('auditAction')?.value || 'all';
    const entity = byId('auditEntity')?.value || 'all';
    const from = byId('auditFrom')?.value || '';
    const to = byId('auditTo')?.value || '';
    const rows = auditRows.filter(row => {
      const date = getDate(row) ? new Date(getDate(row)) : null;
      const day = date && !Number.isNaN(date.getTime()) ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : '';
      const haystack = [getAction(row), getEntity(row), getActor(row), row.employee_code, getRecord(row), row.details, row.description].join(' ').toLowerCase();
      return (!q || haystack.includes(q)) && (action === 'all' || getAction(row) === action) && (entity === 'all' || getEntity(row) === entity) && (!from || (day && day >= from)) && (!to || (day && day <= to));
    });
    const count = byId('auditCount');
    if (count) count.textContent = `${rows.length} of ${auditRows.length} records`;
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="6" class="table-message">No audit records found.</td></tr>'; return; }
    tbody.innerHTML = rows.map(row => {
      const actionName = getAction(row);
      const entityName = getEntity(row);
      const actorName = getActor(row);
      const actorCode = row.employee_code || row.user_code || '';
      const actorRole = row.employee_role || row.user_role || row.role || '';
      const entityId = row.entity_id ?? row.entityId;
      return `<tr>
        <td><span class="audit-action-badge ${actionClass(actionName)}">${esc(actionLabel(actionName))}</span></td>
        <td><span class="audit-entity-label">${esc(entityName)}${entityId !== undefined && entityId !== null ? ` #${esc(entityId)}` : ''}</span></td>
        <td><div class="audit-actor-name">${esc(actorName)}</div><div class="audit-actor-meta">${actorCode ? `${esc(actorCode)} · ` : ''}${esc(actorRole || 'Role unavailable')}</div></td>
        <td><span class="audit-record-name">${esc(getRecord(row))}</span></td>
        <td class="audit-details-cell">${detailsMarkup(row)}</td>
        <td><span class="audit-date">${formatDate(getDate(row))}</span></td>
      </tr>`;
    }).join('');
  }

  async function loadAuditLogs() {
    setup();
    const tbody = byId('auditBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="table-message">Loading audit records...</td></tr>';
    try {
      auditRows = await requestAuditLogs();
      ['auditAction','auditEntity'].forEach(id => { const el = byId(id); if (el) el.dataset.loaded = 'false'; });
      populateOptions('auditAction', auditRows.map(getAction));
      populateOptions('auditEntity', auditRows.map(getEntity));
      render();
    } catch (error) {
      console.error('Audit trail loading error:', error);
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="table-message">${esc(error.message)}</td></tr>`;
      if (typeof window.showToast === 'function') window.showToast(error.message, 'error');
    }
  }

  window.loadAuditLogs = loadAuditLogs;
})();
