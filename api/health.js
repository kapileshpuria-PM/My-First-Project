const { sendJson, supabaseFetch } = require("./_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "Method not allowed" });
  try {
    const [entities, ips, deals, runs] = await Promise.all([
      supabaseFetch("/rest/v1/repository_entities?select=id&limit=1", { headers: { Prefer: "count=exact" } }),
      supabaseFetch("/rest/v1/repository_ips?select=id&limit=1", { headers: { Prefer: "count=exact" } }),
      supabaseFetch("/rest/v1/deals?select=deal_id&limit=1", { headers: { Prefer: "count=exact" } }),
      supabaseFetch("/rest/v1/sheet_import_runs?select=*&order=started_at.desc&limit=1"),
    ]);
    return sendJson(res, 200, {
      ok: true,
      entities: Array.isArray(entities) ? entities.length : 0,
      ips: Array.isArray(ips) ? ips.length : 0,
      deals: Array.isArray(deals) ? deals.length : 0,
      lastSheetRun: Array.isArray(runs) ? runs[0] || null : null,
    });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message });
  }
};
