const DEFAULT_LIMIT = 40;

const HEADER_ALIASES = {
  market: ["market"],
  language: ["language", "lang"],
  status: ["status"],
  accountManager: ["outreachpoc", "outreach poc", "poc", "accountmanager"],
  series: ["title", "series", "ip", "ipseries", "ip/series", "seriesname", "ipname"],
  author: ["writer", "author"],
  leadEntity: ["publisher", "leadentity", "entity", "entityname", "rightsowner", "rightsholder"],
  publisherAuthor: ["publisher", "publisherauthor", "publishername", "publisher/author"],
  contact: ["contact"],
  closures: ["closures"],
  genre: ["genre"],
  subgenre: ["subgenre", "sub-genre", "sub genre"],
  rating: ["amazonseriesrating", "amazon series rating", "rating", "averagerating"],
  numRatings: ["amazonseriesreviews", "amazon series reviews", "numratings", "ratingscount", "reviews"],
  totalBooks: ["totalbooks", "total books", "books", "bookcount"],
  durationHrs: ["serieslengthmin50hrs", "series length min 50 hrs", "durationhrs", "durationhours", "lengthhrs", "hours"],
  amazon: ["amazonlinks", "amazon links", "amazon", "amazonlink", "amazonurl"],
  goodreads: ["goodreadslinks", "goodreads links", "goodreads", "goodreadslink", "goodreadsurl"],
  targetAudience: ["targetaudience", "target audience"],
  seriesSummary: ["seriessummary", "series summary"],
  reviewSummary: ["reviewsummary", "review summary"],
  contentReviewCheck: ["contentreviewcheck", "content review check"],
};

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function cleanHeader(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function norm(value) {
  return String(value || "").trim().toLowerCase();
}

function slugKey(value) {
  return norm(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseNumber(value) {
  if (value == null) return null;
  const text = String(value).trim().replace(/,/g, "").replace(/%/g, "").replace(/[€$]/g, "");
  if (!text || /^n\/?a$/i.test(text) || /^no data$/i.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function extractAsin(value) {
  const text = String(value || "");
  const match = text.match(/(?:\/dp\/|\/gp\/product\/)([A-Z0-9]{10})/i) || text.match(/\b([A-Z0-9]{10})\b/);
  return match ? match[1].toUpperCase() : "";
}

function entityNameFromRow(row) {
  return row.leadEntity || row.publisherAuthor || row.publisher || row.author || row.contact || "";
}

function entityKeyFromName(name) {
  return slugKey(name);
}

function inferEntityType(row) {
  const groupType = String(row.groupType || row.entityType || "");
  if (/agent/i.test(groupType)) return "Agent";
  if (/author|self/i.test(groupType)) return "Author";
  return "Publisher";
}

function sourceKeyForRow(row) {
  if (row.ipId) return "ip:" + slugKey(row.ipId);
  const asin = row.asin || extractAsin(row.amazon);
  if (asin) return "asin:" + asin.toLowerCase();
  return [
    "entity-title",
    slugKey(entityNameFromRow(row)),
    slugKey(row.series),
    slugKey(row.market),
    slugKey(row.language),
  ].filter(Boolean).join(":");
}

function stableHash(value) {
  const text = JSON.stringify(value || {});
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
  return (hash >>> 0).toString(16);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((r) => r.some((v) => String(v || "").trim()));
}

function normalizeSheetRow(raw, rowNumber) {
  const byClean = {};
  Object.keys(raw).forEach((key) => { byClean[cleanHeader(key)] = raw[key]; });
  const row = {};
  Object.entries(HEADER_ALIASES).forEach(([canonical, aliases]) => {
    for (const alias of aliases) {
      const key = cleanHeader(alias);
      if (byClean[key] != null && String(byClean[key]).trim() !== "") {
        row[canonical] = byClean[key];
        break;
      }
    }
  });
  row.leadEntity = row.leadEntity || row.publisherAuthor || row.contact || row.author || "";
  row.publisherAuthor = row.publisherAuthor || row.leadEntity || "";
  row.entityType = inferEntityType(row);
  row.asin = row.asin || extractAsin(row.amazon);
  row.rating = parseNumber(row.rating);
  row.numRatings = parseNumber(row.numRatings);
  row.totalBooks = parseNumber(row.totalBooks);
  row.durationHrs = parseNumber(row.durationHrs);
  row.sourceRowNumber = rowNumber;
  return row;
}

function parseSheetCsv(csvText, headerRow) {
  const rows = parseCsv(csvText);
  const headerIndex = Math.max(0, Number(headerRow || 1) - 1);
  const headers = rows[headerIndex] || [];
  return rows.slice(headerIndex + 1).map((values, idx) => {
    const raw = {};
    headers.forEach((header, pos) => { raw[header] = values[pos] || ""; });
    return normalizeSheetRow(raw, headerIndex + idx + 2);
  }).filter((row) => entityNameFromRow(row) && row.series);
}

function parseSheetConfig() {
  const cfg = {
    sheetUrl: process.env.GOOGLE_SHEET_URL || "",
    spreadsheetId: process.env.GOOGLE_SHEET_ID || "",
    gid: process.env.GOOGLE_SHEET_GID || "",
    tabName: process.env.GOOGLE_SHEET_TAB || "",
    csvUrl: process.env.GOOGLE_SHEET_CSV_URL || "",
    headerRow: process.env.GOOGLE_SHEET_HEADER_ROW || "2",
  };
  if (cfg.sheetUrl) {
    try {
      const url = new URL(cfg.sheetUrl);
      const match = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
      if (match && !cfg.spreadsheetId) cfg.spreadsheetId = match[1];
      if (url.searchParams.get("gid") && !cfg.gid) cfg.gid = url.searchParams.get("gid");
    } catch (e) {}
  }
  return cfg;
}

function sheetCsvUrl(cfg) {
  if (cfg.csvUrl) return cfg.csvUrl;
  if (!cfg.spreadsheetId) return "";
  if (cfg.gid) return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(cfg.spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(cfg.gid)}`;
  if (cfg.tabName) return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(cfg.spreadsheetId)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(cfg.tabName)}`;
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(cfg.spreadsheetId)}/export?format=csv`;
}

function sheetSourceId(cfg) {
  return [cfg.spreadsheetId || "sheet", cfg.gid || cfg.tabName || "default"].join(":");
}

async function fetchSheetRows() {
  const cfg = parseSheetConfig();
  const url = sheetCsvUrl(cfg);
  if (!url) throw new Error("Google Sheet is not configured. Set GOOGLE_SHEET_URL or GOOGLE_SHEET_ID.");
  const response = await fetch(url, { headers: { "User-Agent": "PFMDealTracker/1.0" } });
  if (!response.ok) throw new Error(`Google Sheet CSV export failed: ${response.status}`);
  const text = await response.text();
  if (/servicelogin|<html/i.test(text.slice(0, 2000))) {
    throw new Error("Google returned an HTML/login page instead of CSV. Make the sheet readable by link.");
  }
  return { cfg, rows: parseSheetCsv(text, cfg.headerRow) };
}

function supabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
}

function supabaseKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
}

function isLegacyJwt(key) {
  return String(key || "").split(".").length === 3;
}

function requireSupabase() {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) {
    throw new Error("Supabase server env is missing. Set SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel.");
  }
  return { url, key };
}

async function supabaseFetch(path, options = {}) {
  const { url, key } = requireSupabase();
  const headers = Object.assign({
    apikey: key,
    "Content-Type": "application/json",
  }, options.headers || {});
  if (isLegacyJwt(key)) headers.Authorization = `Bearer ${key}`;
  if (options.prefer) headers.Prefer = options.prefer;
  const response = await fetch(`${url}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body == null ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch (e) { payload = text; }
  }
  if (!response.ok) {
    const message = payload && payload.message ? payload.message : text || `Supabase request failed: ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") return resolve(req.body);
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function entityRowFromDeal(deal) {
  const entityName = deal.entityName || "";
  const entityKey = deal.scoutEntityKey || entityKeyFromName(entityName);
  const ips = deal.ips || [];
  return {
    entity_key: entityKey,
    entity_id: deal.entityId || null,
    entity_name: entityName,
    entity_type: deal.entityType || null,
    author: deal.author || null,
    publisher: deal.publisher || null,
    account_manager: deal.accountManager || null,
    source: "deal",
    series_count: ips.length,
    books: ips.reduce((sum, ip) => sum + (Number(ip.totalBooks) || 0), 0),
    last_seen_at: new Date().toISOString(),
    active_in_sheet: true,
  };
}

function ipSourceKey(entityKey, ip) {
  return ip.sourceKey || ip.source_key || (ip.asin ? `asin:${String(ip.asin).toLowerCase()}` : [
    "entity-title",
    slugKey(entityKey),
    slugKey(ip.series),
  ].filter(Boolean).join(":"));
}

function ipRowFromDeal(deal, ip) {
  const entityName = deal.entityName || "";
  const entityKey = deal.scoutEntityKey || entityKeyFromName(entityName);
  return {
    source_key: ipSourceKey(entityKey, ip),
    entity_key: entityKey,
    entity_id: deal.entityId || null,
    entity_name: entityName,
    entity_type: deal.entityType || null,
    author: deal.author || null,
    publisher: deal.publisher || null,
    account_manager: deal.accountManager || null,
    ip_id: ip.ipId || null,
    series: ip.series || "",
    asin: ip.asin || null,
    genre: ip.genre || null,
    length_hrs: parseNumber(ip.lengthHrs || ip.durationHrs),
    total_books: parseNumber(ip.totalBooks),
    rating: parseNumber(ip.rating),
    num_ratings: parseNumber(ip.numRatings),
    amazon: ip.amazon || null,
    goodreads: ip.goodreads || null,
    source: "deal",
    deal_id: deal.id || null,
    active_in_sheet: true,
    raw_row: ip,
    source_hash: stableHash(ip),
    last_seen_at: new Date().toISOString(),
  };
}

function entityRowFromSheet(entityKey, entityName, group, cfg) {
  const first = group[0] || {};
  return {
    entity_key: entityKey,
    entity_name: entityName,
    entity_type: first.entityType || inferEntityType(first),
    author: first.author || null,
    publisher: entityName,
    account_manager: first.accountManager || null,
    group_type: first.groupType || null,
    source: "sheet",
    source_sheet_id: sheetSourceId(cfg),
    series_count: group.length,
    books: group.reduce((sum, row) => sum + (Number(row.totalBooks) || 0), 0),
    last_seen_at: new Date().toISOString(),
    active_in_sheet: true,
    raw_row: first,
  };
}

function ipRowFromSheet(row, cfg) {
  const entityName = entityNameFromRow(row);
  const entityKey = entityKeyFromName(entityName);
  const raw = Object.assign({}, row);
  return {
    source_key: sourceKeyForRow(row),
    source_sheet_id: sheetSourceId(cfg),
    source_row_number: row.sourceRowNumber || null,
    source_hash: stableHash(raw),
    entity_key: entityKey,
    entity_name: entityName,
    entity_type: row.entityType || inferEntityType(row),
    author: row.author || null,
    publisher: entityName,
    contact: row.contact || null,
    account_manager: row.accountManager || null,
    status: row.status || null,
    closures: row.closures || null,
    series: row.series || "",
    asin: row.asin || extractAsin(row.amazon) || null,
    market: row.market || null,
    language: row.language || null,
    genre: row.genre || null,
    subgenre: row.subgenre || null,
    length_hrs: row.durationHrs,
    total_books: row.totalBooks,
    rating: row.rating,
    num_ratings: row.numRatings,
    amazon: row.amazon || null,
    goodreads: row.goodreads || null,
    source: "sheet",
    active_in_sheet: true,
    removed_from_sheet_at: null,
    raw_row: raw,
    last_seen_at: new Date().toISOString(),
  };
}

function entityResult(row) {
  return {
    kind: "entity",
    source: "repository",
    entityKey: row.entity_key,
    entityId: row.entity_id || "",
    name: row.entity_name || "",
    entityName: row.entity_name || "",
    leadEntity: row.entity_name || "",
    entityType: row.entity_type || "Publisher",
    author: row.author || "",
    groupType: row.group_type || "",
    seriesCount: row.series_count || 0,
    books: row.books || 0,
    activeInSheet: row.active_in_sheet !== false,
  };
}

function ipResult(row) {
  return {
    kind: "ip",
    source: "repository",
    id: row.id,
    sourceKey: row.source_key,
    entityKey: row.entity_key,
    entityId: row.entity_id || "",
    entityName: row.entity_name || "",
    leadEntity: row.entity_name || "",
    entityType: row.entity_type || "Publisher",
    author: row.author || "",
    publisherAuthor: row.publisher || row.entity_name || "",
    ipId: row.ip_id || "",
    series: row.series || "",
    asin: row.asin || "",
    genre: row.genre || "",
    lengthHrs: row.length_hrs,
    durationHrs: row.length_hrs,
    totalBooks: row.total_books,
    rating: row.rating,
    numRatings: row.num_ratings,
    amazon: row.amazon || "",
    goodreads: row.goodreads || "",
    activeInSheet: row.active_in_sheet !== false,
  };
}

function urlLike(value) {
  const text = String(value || "").replace(/[%*(),]/g, " ").trim();
  return `*${text}*`;
}

function queryParam(url, key, value) {
  if (value != null && value !== "") url.searchParams.set(key, value);
}

module.exports = {
  DEFAULT_LIMIT,
  sendJson,
  norm,
  entityKeyFromName,
  parseNumber,
  readBody,
  supabaseFetch,
  requireSupabase,
  fetchSheetRows,
  sheetSourceId,
  entityRowFromDeal,
  ipRowFromDeal,
  entityRowFromSheet,
  ipRowFromSheet,
  entityResult,
  ipResult,
  urlLike,
  queryParam,
};
