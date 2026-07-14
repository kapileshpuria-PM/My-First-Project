const { entityRowFromDeal, ipRowFromDeal, readBody, sendJson, supabaseFetch } = require("../_shared");

async function saveDealSnapshot(deal) {
  if (!deal || !deal.id) throw new Error("Deal id is required");
  const entity = entityRowFromDeal(deal);
  const ips = (deal.ips || []).filter((ip) => ip && ip.series).map((ip) => ipRowFromDeal(deal, ip));

  await supabaseFetch("/rest/v1/repository_entities?on_conflict=entity_key", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: entity,
  });
  if (ips.length) {
    await supabaseFetch("/rest/v1/repository_ips?on_conflict=source_key", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: ips,
    });
  }
  await supabaseFetch("/rest/v1/deals?on_conflict=deal_id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: {
      deal_id: deal.id,
      entity_key: entity.entity_key,
      entity_name: deal.entityName || null,
      status: deal.status || null,
      payload: deal,
      updated_at: new Date().toISOString(),
    },
  });
  return { ok: true, entityKey: entity.entity_key, savedIps: ips.length };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "Method not allowed" });
  try {
    const payload = await readBody(req);
    const result = await saveDealSnapshot(payload.deal || payload);
    return sendJson(res, 200, result);
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message });
  }
};

module.exports.saveDealSnapshot = saveDealSnapshot;
