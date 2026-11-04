(() => {
  "use strict";
  const API_URL = "http://localhost:5000/api";
  const number = (value) => Number(value || 0).toLocaleString();
  const escapeHtml = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const field = (item, ...keys) => {
    for (const key of keys)
      if (item && item[key] !== undefined && item[key] !== null)
        return item[key];
    return undefined;
  };
  async function request(path) {
    if (typeof window.apiFetch === "function")
      return window.apiFetch(`${API_URL}${path}`);
    const token = localStorage.getItem("warehouseToken");
    return fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
  function renderStockHealth(products) {
    const total = products.length;
    const low = products.filter(
      (p) =>
        Number(field(p, "stock_quantity", "stock", "quantity") || 0) > 0 &&
        Number(field(p, "stock_quantity", "stock", "quantity") || 0) <=
          Number(field(p, "low_stock_threshold", "threshold") ?? 3),
    ).length;
    const out = products.filter(
      (p) => Number(field(p, "stock_quantity", "stock", "quantity") || 0) === 0,
    ).length;
    const inStock = total - low - out;
    const groups = [
      { label: "In stock", value: inStock, cls: "in-stock" },
      { label: "Low stock", value: low, cls: "low-stock" },
      { label: "Out of stock", value: out, cls: "out-stock" },
    ];
    const root = document.getElementById("analyticsStockHealth");
    if (!root) return;
    root.innerHTML = total
      ? groups
          .map(
            (g) =>
              `<div class="analytics-bar-row"><span>${g.label}</span><div class="analytics-track"><div class="analytics-fill ${g.cls}" style="width:${Math.min(100, total ? (g.value / total) * 100 : 0)}%"></div></div><strong>${number(g.value)}</strong></div>`,
          )
          .join("")
      : '<p class="table-message">No products available yet.</p>';
    return { total, low, out, inStock };
  }
  function renderMovements(rows) {
    const root = document.getElementById("analyticsMovements");
    if (!root) return;
    const counts = { increase: 0, decrease: 0 };
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const type = String(
        field(row, "change_type", "movement") || "",
      ).toLowerCase();
      if (type.includes("increase")) counts.increase++;
      else if (type.includes("decrease")) counts.decrease++;
    });
    const total = counts.increase + counts.decrease;
    root.innerHTML = total
      ? `<div class="analytics-movement-row"><span class="analytics-movement-label">Stock increases</span><strong class="analytics-movement-value">${counts.increase} movements</strong></div><div class="analytics-movement-row"><span class="analytics-movement-label">Stock decreases</span><strong class="analytics-movement-value">${counts.decrease} movements</strong></div><div class="analytics-movement-row"><span class="analytics-movement-label">Records analysed</span><strong class="analytics-movement-value">${total}</strong></div>`
      : '<p class="table-message">No stock movements found.</p>';
  }
  function renderLowStock(products) {
    const rows = products
      .map((p) => ({
        p,
        qty: Number(field(p, "stock_quantity", "stock", "quantity") || 0),
        threshold: Number(field(p, "low_stock_threshold", "threshold") ?? 3),
      }))
      .filter((x) => x.qty <= x.threshold)
      .sort((a, b) => a.qty - b.qty);
    setText("analyticsAttentionCount", `${rows.length} products`);
    const body = document.getElementById("analyticsLowStockBody");
    if (!body) return;
    body.innerHTML = rows.length
      ? rows
          .map(({ p, qty, threshold }) => {
            const name =
              field(p, "name", "NAME", "product_name") || "Unnamed product";
            const code = field(p, "product_code", "productCode", "sku") || "—";
            const out = qty === 0;
            return `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(code)}</td><td>${number(qty)}</td><td>${number(threshold)}</td><td><span class="analytics-status ${out ? "out" : "low"}">${out ? "Out of stock" : "Low stock"}</span></td></tr>`;
          })
          .join("")
      : '<tr><td colspan="5" class="table-message">All products are above their low-stock thresholds.</td></tr>';
  }
  async function loadWarehouseAnalytics() {
    const body = document.getElementById("analyticsLowStockBody");
    if (body)
      body.innerHTML =
        '<tr><td colspan="5" class="table-message">Loading analytics...</td></tr>';
    try {
      const [productsResponse, activityResponse] = await Promise.all([
        request("/products"),
        request("/dashboard/recent-activity"),
      ]);
      if (productsResponse.status === 401 || activityResponse.status === 401) {
        if (typeof window.handleLogout === "function") window.handleLogout();
        throw new Error("Your session has expired. Please sign in again.");
      }
      if (!productsResponse.ok)
        throw new Error("Unable to load products for analytics.");
      const productsData = await productsResponse.json();
      const products = Array.isArray(productsData)
        ? productsData
        : productsData.products || productsData.data || [];
      const activityData = activityResponse.ok
        ? await activityResponse.json()
        : { activities: [] };
      const activities = activityData.activities || [];
      const stock = renderStockHealth(products);
      setText("analyticsProducts", number(products.length));
      setText(
        "analyticsUnits",
        number(
          products.reduce(
            (sum, p) =>
              sum +
              Number(field(p, "stock_quantity", "stock", "quantity") || 0),
            0,
          ),
        ),
      );
      setText("analyticsLow", number(stock?.low || 0));
      setText("analyticsOut", number(stock?.out || 0));
      renderMovements(activities);
      renderLowStock(products);
    } catch (error) {
      console.error("Warehouse analytics error:", error);
      if (body)
        body.innerHTML = `<tr><td colspan="5" class="table-message">${escapeHtml(error.message || "Unable to load analytics.")}</td></tr>`;
      if (typeof window.showToast === "function")
        window.showToast(error.message || "Unable to load analytics.", "error");
    }
  }
  window.loadWarehouseAnalytics = loadWarehouseAnalytics;
  document.addEventListener("DOMContentLoaded", () =>
    document
      .getElementById("refreshAnalytics")
      ?.addEventListener("click", loadWarehouseAnalytics),
  );
})();
