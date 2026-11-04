(() => {
  "use strict";
  const API = "http://localhost:5000/api/super-admin";
  const $ = (id) => document.getElementById(id);
  let warehouses = [],
    auditPage = 1,
    auditTotalPages = 1,
    toastTimer;
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const token = () => localStorage.getItem("superAdminToken");
  function notify(message) {
    const el = $("saToast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }
  function confirmOnScreen(message, title = "Please confirm") {
    const modal = $("saConfirmModal"),
      titleEl = $("saConfirmTitle"),
      messageEl = $("saConfirmMessage"),
      ok = $("saConfirmOk"),
      cancel = $("saConfirmCancel");
    if (!modal || !titleEl || !messageEl || !ok || !cancel)
      return Promise.resolve(false);
    titleEl.textContent = title;
    messageEl.textContent = message;
    ok.textContent = "Delete";
    ok.classList.add("danger");
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    return new Promise((resolve) => {
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
        ok.removeEventListener("click", yes);
        cancel.removeEventListener("click", no);
        modal.removeEventListener("click", backdrop);
        document.removeEventListener("keydown", keydown);
        resolve(value);
      };
      const yes = () => finish(true),
        no = () => finish(false);
      const backdrop = (event) => {
        if (event.target === modal) finish(false);
      };
      const keydown = (event) => {
        if (event.key === "Escape") finish(false);
      };
      ok.addEventListener("click", yes);
      cancel.addEventListener("click", no);
      modal.addEventListener("click", backdrop);
      document.addEventListener("keydown", keydown);
      cancel.focus();
    });
  }
  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (token()) headers.set("Authorization", `Bearer ${token()}`);
    if (options.body) headers.set("Content-Type", "application/json");
    const res = await fetch(`${API}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      logout(false);
      throw new Error(
        data.error || "Super Admin session expired. Please sign in again.",
      );
    }
    if (!res.ok)
      throw new Error(
        data.error || data.message || `Request failed (${res.status})`,
      );
    return data;
  }
  function showDashboard(show) {
    $("saLogin").hidden = show;
    $("saDashboard").hidden = !show;
  }
  function logout(showMessage = true) {
    localStorage.removeItem("superAdminToken");
    showDashboard(false);
    if (showMessage) notify("Signed out successfully.");
  }
  async function login(e) {
    e.preventDefault();
    const button = e.currentTarget.querySelector("button[type=submit]");
    $("saLoginError").textContent = "";
    button.disabled = true;
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: $("saEmail").value.trim(),
          password: $("saPassword").value,
        }),
      });
      localStorage.setItem("superAdminToken", data.token);
      $("saWelcome").textContent =
        `Signed in as ${data.superAdmin?.name || data.superAdmin?.email || "Super Admin"}`;
      showDashboard(true);
      await refreshAll();
    } catch (err) {
      $("saLoginError").textContent = err.message;
    } finally {
      button.disabled = false;
    }
  }
  function getStatus(w) {
    const value = String(
      w.status ??
        (w.is_active === false || w.is_active === 0 ? "inactive" : "active"),
    ).toLowerCase();
    return value === "active" || value === "1" ? "active" : "inactive";
  }
  function renderWarehouses() {
    const q = $("saWarehouseSearch").value.trim().toLowerCase();
    const filtered = warehouses.filter((w) =>
      [
        w.name,
        w.warehouse_name,
        w.warehouse_code,
        w.owner_name,
        w.owner_email,
        w.ownerName,
        w.ownerEmail,
      ].some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
    $("saWarehouseCount").textContent =
      `${filtered.length} of ${warehouses.length} warehouses`;
    const active = warehouses.filter((w) => getStatus(w) === "active").length;
    $("saTotal").textContent = warehouses.length;
    $("saActive").textContent = active;
    $("saInactive").textContent = warehouses.length - active;
    const body = $("saWarehouseBody");
    if (!filtered.length) {
      body.innerHTML =
        '<tr><td colspan="6" class="empty">No matching warehouses found.</td></tr>';
      return;
    }
    body.innerHTML = filtered
      .map((w) => {
        const id = w.id ?? w.warehouse_id;
        const name = w.name ?? w.warehouse_name ?? "Unnamed warehouse";
        const code = w.warehouse_code ?? w.code ?? "—";
        const owner =
          w.owner_name ?? w.ownerName ?? w.owner_email ?? w.ownerEmail ?? "—";
        const status = getStatus(w);
        const created = w.created_at
          ? new Date(w.created_at).toLocaleDateString("en-IN")
          : "—";
        return `<tr><td><strong>${esc(name)}</strong><span class="sub">ID: ${esc(id)}</span></td><td>${esc(code)}</td><td>${esc(owner)}</td><td><span class="status ${status}">${status === "active" ? "Active" : "Inactive"}</span></td><td>${esc(created)}</td><td><div class="actions"><button class="sa-btn secondary" data-action="status" data-id="${esc(id)}" data-status="${status === "active" ? "inactive" : "active"}">${status === "active" ? "Deactivate" : "Activate"}</button><button class="sa-btn danger-outline" data-action="delete" data-id="${esc(id)}">Delete</button></div></td></tr>`;
      })
      .join("");
  }
  async function loadWarehouses() {
    const data = await api("/warehouses");
    warehouses = Array.isArray(data.warehouses) ? data.warehouses : [];
    renderWarehouses();
  }
  async function createWarehouse(e) {
    e.preventDefault();
    const btn = e.currentTarget.querySelector("button[type=submit]");
    const msg = $("saCreateMessage");
    msg.textContent = "";
    btn.disabled = true;
    try {
      const data = await api("/warehouses", {
        method: "POST",
        body: JSON.stringify({
          warehouseName: $("saWarehouseName").value.trim(),
          ownerName: $("saOwnerName").value.trim(),
          ownerEmail: $("saOwnerEmail").value.trim(),
          password: $("saOwnerPassword").value,
        }),
      });
      e.currentTarget.reset();
      msg.textContent = data.message || "Warehouse created successfully.";
      await loadWarehouses();
      notify("Warehouse created successfully.");
    } catch (err) {
      msg.textContent = err.message;
      msg.style.color = "#b42318";
    } finally {
      btn.disabled = false;
    }
  }
  async function warehouseAction(e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id || id === "undefined") return;
    const action = btn.dataset.action;
    if (
      action === "delete" &&
      !(await confirmOnScreen(
        "Delete this warehouse? This is a soft delete and may prevent warehouse users from signing in.",
        "Delete warehouse?",
      ))
    )
      return;
    btn.disabled = true;
    try {
      if (action === "status") {
        await api(`/warehouses/${encodeURIComponent(id)}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: btn.dataset.status }),
        });
        notify(
          `Warehouse ${btn.dataset.status === "active" ? "activated" : "deactivated"}.`,
        );
      } else if (action === "delete") {
        await api(`/warehouses/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        notify("Warehouse deleted.");
      }
      await loadWarehouses();
    } catch (err) {
      notify(err.message);
    } finally {
      btn.disabled = false;
    }
  }

  function auditLabel(key) {
    return String(key)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  function auditValue(value) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value))
      return value.length ? value.map(auditValue).join(", ") : "None";
    if (typeof value === "object")
      return Object.entries(value)
        .map(([k, v]) => `${auditLabel(k)}: ${auditValue(v)}`)
        .join(" · ");
    return String(value);
  }
  function parseAuditDetails(value) {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch (_) {}
    }
    return value;
  }
  function renderAuditDetails(raw) {
    const details = parseAuditDetails(raw);
    if (details === null || details === undefined || details === "")
      return '<span class="audit-no-details">No additional details</span>';
    if (typeof details !== "object")
      return `<span class="audit-detail-text">${esc(details)}</span>`;
    const entries = Array.isArray(details)
      ? details.map((v, i) => [String(i + 1), v])
      : Object.entries(details);
    if (!entries.length)
      return '<span class="audit-no-details">No additional details</span>';
    return `<div class="sa-audit-details">${entries
      .map(([key, value]) => {
        const label = auditLabel(key);
        if (
          (key === "before" || key === "after") &&
          value &&
          typeof value === "object"
        ) {
          const nested = Object.entries(value);
          return `<div class="sa-audit-group"><span class="sa-audit-group-title">${esc(label)}</span><div class="sa-audit-fields">${nested.map(([k, v]) => `<div class="sa-audit-field"><span>${esc(auditLabel(k))}</span><strong>${esc(auditValue(v))}</strong></div>`).join("")}</div></div>`;
        }
        return `<div class="sa-audit-field"><span>${esc(label)}</span><strong>${esc(auditValue(value))}</strong></div>`;
      })
      .join("")}</div>`;
  }

  function auditDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? esc(value) : d.toLocaleString("en-IN");
  }
  async function loadAudit() {
    const data = await api(`/audit-logs?page=${auditPage}&limit=20`);
    const logs = Array.isArray(data.logs) ? data.logs : [];
    auditPage = Number(data.page) || auditPage;
    auditTotalPages = Math.max(1, Number(data.totalPages) || 1);
    $("saAuditPage").textContent =
      `Page ${auditPage} of ${auditTotalPages} · ${data.total ?? logs.length} records`;
    $("saAuditPrev").disabled = auditPage <= 1;
    $("saAuditNext").disabled = auditPage >= auditTotalPages;
    $("saAuditBody").innerHTML = logs.length
      ? logs
          .map(
            (log) =>
              `<tr><td><strong>${esc(String(log.action || "").replace(/_/g, " "))}</strong><span class="sub">${esc(log.entity_type || "")}</span></td><td>${esc(log.entity_label || log.warehouse_id || "Platform")}</td><td>${esc(log.super_admin_name || "Super Admin")}</td><td>${renderAuditDetails(log.details)}</td><td>${esc(auditDate(log.created_at))}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="5" class="empty">No platform audit records yet.</td></tr>';
  }
  async function refreshAll() {
    await Promise.all([loadWarehouses(), loadAudit()]);
  }
  document.addEventListener("DOMContentLoaded", () => {
    $("saLoginForm").addEventListener("submit", login);
    $("saCreateForm").addEventListener("submit", createWarehouse);
    $("saLogout").addEventListener("click", () => logout());
    $("saRefresh").addEventListener("click", () =>
      refreshAll().catch((e) => notify(e.message)),
    );
    $("saWarehouseSearch").addEventListener("input", renderWarehouses);
    $("saWarehouseBody").addEventListener("click", warehouseAction);
    $("saAuditPrev").addEventListener("click", () => {
      if (auditPage > 1) {
        auditPage--;
        loadAudit().catch((e) => notify(e.message));
      }
    });
    $("saAuditNext").addEventListener("click", () => {
      if (auditPage < auditTotalPages) {
        auditPage++;
        loadAudit().catch((e) => notify(e.message));
      }
    });
    if (token()) {
      showDashboard(true);
      api("/auth/me")
        .then((data) => {
          $("saWelcome").textContent =
            `Signed in as ${data.superAdmin?.name || data.superAdmin?.email || "Super Admin"}`;
          return refreshAll();
        })
        .catch((e) => notify(e.message));
    } else showDashboard(false);
  });
})();
