const { DEFAULT_LIMIT, entityResult, ipResult, queryParam, sendJson, supabaseFetch, urlLike } = require("../_shared");

function buildOr(fields, q) {
  if (!q) return "";
  const like = urlLike(q);
  return "(" + fields.map((field) => `${field}.ilike.${like}`).join(",") + ")";
}

async function searchEntities(q, limit, entityName, entityKey) {
  const url = new URL("http://local/rest/v1/repository_entities");
  queryParam(url, "select", "id,entity_key,entity_id,entity_name,entity_type,author,publisher,group_type,series_count,books,active_in_sheet");
  queryParam(url, "order", "last_seen_at.desc");
  queryParam(url, "limit", String(limit));
  if (entityKey) queryParam(url, "entity_key", `eq.${entityKey}`);
  if (entityName) queryParam(url, "entity_name", `eq.${entityName}`);
  if (q) queryParam(url, "or", buildOr(["entity_name", "entity_id", "author", "publisher"], q));
  const rows = await supabaseFetch(url.pathname + url.search);
  return (rows || []).map(entityResult);
}

async function searchIps(q, limit, entityName, entityKey) {
  const url = new URL("http://local/rest/v1/repository_ips");
  queryParam(url, "select", "id,source_key,entity_key,entity_id,entity_name,entity_type,author,publisher,ip_id,series,asin,genre,length_hrs,total_books,rating,num_ratings,amazon,goodreads,active_in_sheet");
  queryParam(url, "order", "last_seen_at.desc");
  queryParam(url, "limit", String(limit));
  if (entityKey) queryParam(url, "entity_key", `eq.${entityKey}`);
  if (entityName) queryParam(url, "entity_name", `eq.${entityName}`);
  if (q) queryParam(url, "or", buildOr(["series", "ip_id", "entity_name", "author", "genre"], q));
  const rows = await supabaseFetch(url.pathname + url.search);
  return (rows || []).map(ipResult);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "Method not allowed" });
  try {
    const url = new URL(req.url, "http://local");
    const q = (url.searchParams.get("q") || "").trim();
    const kind = (url.searchParams.get("kind") || "").trim().toLowerCase();
    const entityName = (url.searchParams.get("entity") || "").trim();
    const entityKey = (url.searchParams.get("entityKey") || "").trim();
    const limit = Math.max(1, Math.min(DEFAULT_LIMIT, Number(url.searchParams.get("limit") || 12)));
    const allowEmpty = kind === "ip" && (entityName || entityKey);
    if (q.length < 2 && !allowEmpty) return sendJson(res, 200, { results: [] });

    const results = [];
    if (kind !== "ip") results.push(...await searchEntities(q, limit, entityName, entityKey));
    if (results.length < limit && kind !== "entity") results.push(...await searchIps(q, limit - results.length, entityName, entityKey));
    return sendJson(res, 200, { results });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message, results: [] });
  }
};
