const { sendJson, supabaseFetch } = require("../_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { ok: false, error: "Method not allowed" });
  try {
    const rows = await supabaseFetch("/rest/v1/sheet_import_runs?select=*&order=started_at.desc&limit=1");
    return sendJson(res, 200, {
      configured: !!(process.env.GOOGLE_SHEET_URL || process.env.GOOGLE_SHEET_ID || process.env.GOOGLE_SHEET_CSV_URL),
      source: "supabase",
      lastRun: rows && rows[0] ? rows[0] : null,
    });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message });
  }
};
