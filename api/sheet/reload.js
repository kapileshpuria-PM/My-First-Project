const {
  entityKeyFromName,
  entityRowFromSheet,
  fetchSheetRows,
  ipRowFromSheet,
  sendJson,
  sheetSourceId,
  supabaseFetch,
} = require("../_shared");

async function markMissingRows(sourceSheetId, currentKeys) {
  const existing = await supabaseFetch(`/rest/v1/repository_ips?select=source_key&source_sheet_id=eq.${encodeURIComponent(sourceSheetId)}&active_in_sheet=eq.true&limit=10000`);
  const current = new Set(currentKeys);
  const missing = (existing || []).map((row) => row.source_key).filter((key) => key && !current.has(key));
  const now = new Date().toISOString();
  for (const key of missing) {
    await supabaseFetch(`/rest/v1/repository_ips?source_key=eq.${encodeURIComponent(key)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: { active_in_sheet: false, removed_from_sheet_at: now },
    });
  }
  return missing.length;
}

async function syncSheet() {
  const startedAt = new Date().toISOString();
  const { cfg, rows } = await fetchSheetRows();
  const sourceSheetId = sheetSourceId(cfg);
  const ipRows = rows.map((row) => ipRowFromSheet(row, cfg));
  const byEntity = new Map();
  rows.forEach((row) => {
    const entityName = row.leadEntity || row.publisherAuthor || row.author || "";
    const key = entityKeyFromName(entityName);
    if (!key) return;
    if (!byEntity.has(key)) byEntity.set(key, { entityName, rows: [] });
    byEntity.get(key).rows.push(row);
  });
  const entityRows = Array.from(byEntity.entries()).map(([key, item]) => entityRowFromSheet(key, item.entityName, item.rows, cfg));

  if (entityRows.length) {
    await supabaseFetch("/rest/v1/repository_entities?on_conflict=entity_key", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: entityRows,
    });
  }
  if (ipRows.length) {
    await supabaseFetch("/rest/v1/repository_ips?on_conflict=source_key", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: ipRows,
    });
  }
  const removed = await markMissingRows(sourceSheetId, ipRows.map((row) => row.source_key));
  await supabaseFetch("/rest/v1/sheet_import_runs", {
    method: "POST",
    prefer: "return=minimal",
    body: {
      source_sheet_id: sourceSheetId,
      spreadsheet_id: cfg.spreadsheetId || null,
      gid: cfg.gid || null,
      tab_name: cfg.tabName || null,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      rows_read: rows.length,
      rows_upserted: ipRows.length,
      rows_marked_removed: removed,
      status: "success",
    },
  });
  return { ok: true, sourceSheetId, rows: rows.length, upserted: ipRows.length, removed };
}

module.exports = async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return sendJson(res, 405, { ok: false, error: "Method not allowed" });
  try {
    const result = await syncSheet();
    return sendJson(res, 200, result);
  } catch (error) {
    try {
      await supabaseFetch("/rest/v1/sheet_import_runs", {
        method: "POST",
        prefer: "return=minimal",
        body: {
          source_sheet_id: "unknown",
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          status: "failed",
          error: error.message,
        },
      });
    } catch (e) {}
    return sendJson(res, 500, { ok: false, error: error.message });
  }
};

module.exports.syncSheet = syncSheet;
