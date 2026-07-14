const { readBody, sendJson } = require("./_shared");
const { saveDealSnapshot } = require("./repository/snapshot");

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
