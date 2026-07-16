const { readBody, sendJson, supabaseFetch } = require("./_shared");
const { saveDealSnapshot } = require("./repository/snapshot");

async function listDeals() {
  const rows = await supabaseFetch("/rest/v1/deals?select=deal_id,status,payload,updated_at&order=updated_at.desc");
  return (rows || [])
    .map((row) => row && row.payload)
    .filter((deal) => deal && deal.id);
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const deals = await listDeals();
      return sendJson(res, 200, { ok: true, deals, count: deals.length });
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: error.message });
    }
  }
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "Method not allowed" });
  try {
    const payload = await readBody(req);
    const result = await saveDealSnapshot(payload.deal || payload);
    return sendJson(res, 200, result);
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message });
  }
};

module.exports.listDeals = listDeals;
