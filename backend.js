/* Local backend adapter. Production can keep this interface and swap the API implementation. */
(function () {
  async function request(path, options) {
    const res = await fetch(path, Object.assign({ headers: { "Content-Type": "application/json" } }, options || {}));
    if (!res.ok) throw new Error("Backend request failed: " + res.status);
    return res.json();
  }

  window.PFMBackend = {
    async search(query, opts) {
      const params = new URLSearchParams();
      params.set("q", query || "");
      params.set("limit", String((opts && opts.limit) || 12));
      if (opts && opts.kind) params.set("kind", opts.kind);
      if (opts && opts.entityName) params.set("entity", opts.entityName);
      if (opts && opts.entityKey) params.set("entityKey", opts.entityKey);
      const data = await request("/api/repository/search?" + params.toString());
      return data.results || [];
    },
    async saveDeal(deal) {
      return request("/api/deals", { method: "POST", body: JSON.stringify({ deal }) });
    },
    async snapshotDeal(deal) {
      return request("/api/repository/snapshot", { method: "POST", body: JSON.stringify({ deal }) });
    },
    async health() {
      return request("/api/health");
    },
    async sheetStatus() {
      return request("/api/sheet/status");
    },
    async reloadSheet() {
      return request("/api/sheet/reload", { method: "POST", body: "{}" });
    }
  };
})();
