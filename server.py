#!/usr/bin/env python3
"""Local preview server with a tiny JSON-backed repository API."""

from __future__ import annotations

import json
import mimetypes
import csv
import io
import os
import re
import ssl
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote, urlparse
from urllib.request import Request, urlopen


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "backend" / "db.json"
SHEET_CONFIG_PATH = BASE_DIR / "backend" / "sheet_config.json"
SHEET_CACHE = {"rows": None, "loaded_at": 0, "source": "bundled", "error": None}
DEFAULT_SHEET_CACHE_SECONDS = 60


HEADER_ALIASES = {
    "market": ["market"],
    "language": ["language", "lang"],
    "publisherAuthor": ["publisherauthor", "publisher", "publishername", "publisherauthorname", "publisher/author", "contact"],
    "leadEntity": ["leadentity", "entity", "entityname", "lead", "rightsowner", "rightsholder", "party", "publisher"],
    "author": ["author", "writer"],
    "series": ["series", "ip", "ipseries", "ip/series", "title", "seriesname", "ipname"],
    "asin": ["asin"],
    "amazon": ["amazon", "amazonlink", "amazonurl", "amazonlinks"],
    "goodreads": ["goodreads", "goodreadslink", "goodreadsurl", "goodreadslinks"],
    "rating": ["rating", "averagerating", "avg rating", "amazonseriesrating"],
    "numRatings": ["numratings", "numberofratings", "ratingcount", "ratingscount", "noofratings", "no.ratings", "amazonseriesreviews", "amazonreviews"],
    "totalBooks": ["totalbooks", "books", "bookcount", "numberofbooks", "noofbooks"],
    "printLength": ["printlength", "pages", "pagecount"],
    "durationHrs": ["durationhrs", "durationhours", "lengthhrs", "lengthhours", "audiohours", "hours", "serieslengthmin50hrs", "serieslength"],
    "nationality": ["nationality", "country"],
    "group": ["group", "imprint", "parent"],
    "groupType": ["grouptype", "entitytype", "publisher type", "type"],
    "genre": ["genre"],
    "subgenre": ["subgenre", "sub genre"],
    "trope": ["trope", "tropes"],
    "status": ["status"],
    "accountManager": ["outreachpoc", "poc", "accountmanager"],
}


def norm(value):
    return str(value or "").strip().lower()


def entity_key(row):
    name = row_entity_name(row)
    return norm(name)


def row_entity_name(row):
    return row.get("entityName") or row.get("leadEntity") or row.get("name") or row.get("publisherAuthor") or row.get("author") or ""


def ip_key(entity, series):
    return norm(entity) + "|" + norm(series)


def clean_header(value):
    return re.sub(r"[^a-z0-9]+", "", str(value or "").lower())


def parse_number(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    text = text.replace(",", "").replace("%", "")
    try:
        n = float(text)
    except ValueError:
        return None
    return int(n) if n.is_integer() else n


def json_response(handler, status, payload):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def default_db():
    return {"entities": {}, "ips": {}, "deals": {}}


def load_db():
    if not DB_PATH.exists():
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        save_db(default_db())
    try:
        with DB_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        data = default_db()
    data.setdefault("entities", {})
    data.setdefault("ips", {})
    data.setdefault("deals", {})
    return data


def save_db(data):
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = DB_PATH.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
    tmp.replace(DB_PATH)


def read_sheet_config():
    cfg = {}
    if SHEET_CONFIG_PATH.exists():
        try:
            with SHEET_CONFIG_PATH.open("r", encoding="utf-8") as f:
                cfg.update(json.load(f))
        except Exception as exc:
            cfg["config_error"] = str(exc)
    env_map = {
        "sheet_url": "GOOGLE_SHEET_URL",
        "spreadsheet_id": "GOOGLE_SHEET_ID",
        "gid": "GOOGLE_SHEET_GID",
        "tab_name": "GOOGLE_SHEET_TAB",
        "csv_url": "GOOGLE_SHEET_CSV_URL",
        "cache_seconds": "GOOGLE_SHEET_CACHE_SECONDS",
        "header_row": "GOOGLE_SHEET_HEADER_ROW",
    }
    for key, env_name in env_map.items():
        if os.environ.get(env_name):
            cfg[key] = os.environ[env_name]
    if cfg.get("sheet_url"):
        parsed = urlparse(cfg["sheet_url"])
        match = re.search(r"/spreadsheets/d/([^/]+)", parsed.path)
        if match and not cfg.get("spreadsheet_id"):
            cfg["spreadsheet_id"] = match.group(1)
        query = parse_qs(parsed.query)
        if query.get("gid") and not cfg.get("gid"):
            cfg["gid"] = query["gid"][0]
    return cfg


def sheet_csv_url(cfg):
    if cfg.get("csv_url"):
        return cfg["csv_url"]
    sid = cfg.get("spreadsheet_id")
    if not sid:
        return None
    if cfg.get("gid"):
        return f"https://docs.google.com/spreadsheets/d/{sid}/export?format=csv&gid={quote(str(cfg['gid']))}"
    if cfg.get("tab_name"):
        return f"https://docs.google.com/spreadsheets/d/{sid}/gviz/tq?tqx=out:csv&sheet={quote(str(cfg['tab_name']))}"
    return None


def normalize_sheet_row(raw, idx):
    by_clean = {clean_header(k): v for k, v in raw.items()}
    row = {}
    for canonical, aliases in HEADER_ALIASES.items():
        for alias in aliases:
            key = clean_header(alias)
            if key in by_clean and str(by_clean[key]).strip() != "":
                row[canonical] = by_clean[key]
                break
    row.setdefault("id", "sheet-" + str(idx))
    row["rating"] = parse_number(row.get("rating"))
    row["numRatings"] = parse_number(row.get("numRatings"))
    row["totalBooks"] = parse_number(row.get("totalBooks"))
    row["printLength"] = parse_number(row.get("printLength"))
    row["durationHrs"] = parse_number(row.get("durationHrs"))
    if not row.get("leadEntity"):
        row["leadEntity"] = row.get("publisherAuthor") or row.get("author") or ""
    if not row.get("publisherAuthor"):
        row["publisherAuthor"] = row.get("leadEntity") or row.get("author") or ""
    row.setdefault("author", "")
    row.setdefault("series", "")
    row.setdefault("genre", "")
    return row


def parse_sheet_csv(csv_text, cfg):
    try:
        header_index = max(0, int(cfg.get("header_row") or 1) - 1)
    except (TypeError, ValueError):
        header_index = 0
    raw_rows = list(csv.reader(io.StringIO(csv_text)))
    if len(raw_rows) <= header_index:
        return []
    headers = raw_rows[header_index]
    parsed = []
    for idx, values in enumerate(raw_rows[header_index + 1:]):
        if not any(str(value or "").strip() for value in values):
            continue
        row = {header: values[pos] if pos < len(values) else "" for pos, header in enumerate(headers)}
        parsed.append(normalize_sheet_row(row, idx))
    return parsed


def fetch_live_sheet_rows(cfg):
    url = sheet_csv_url(cfg)
    if not url:
        return None, "No Google Sheet URL, spreadsheet_id/gid, tab_name, or csv_url configured"
    req = Request(url, headers={"User-Agent": "PFMDealTrackerPreview/1.0"})
    context = None
    if cfg.get("verify_tls") is False or str(cfg.get("verify_tls")).lower() == "false":
        context = ssl._create_unverified_context()
    with urlopen(req, timeout=20, context=context) as res:
        csv_text = res.read().decode("utf-8-sig")
    if "<html" in csv_text[:500].lower() or "servicelogin" in csv_text[:2000].lower():
        return None, "Google returned an HTML/login page instead of CSV. The Sheet is not anonymously readable by this local backend."
    rows = parse_sheet_csv(csv_text, cfg)
    rows = [row for row in rows if row.get("series") or row.get("leadEntity") or row.get("publisherAuthor") or row.get("author")]
    if not rows:
        return None, "Google CSV export returned no usable rows. Check the gid/tab and header row."
    return rows, None


def load_bundled_sheet_rows():
    text = (BASE_DIR / "data.js").read_text(encoding="utf-8")
    prefix = "window.SCOUT_DATA = "
    start = text.find(prefix)
    if start < 0:
        return []
    raw = text[start + len(prefix):].strip()
    if raw.endswith(";"):
        raw = raw[:-1]
    return json.loads(raw)


def load_sheet_rows(force=False):
    cfg = read_sheet_config()
    try:
        ttl = int(cfg.get("cache_seconds") or DEFAULT_SHEET_CACHE_SECONDS)
    except ValueError:
        ttl = DEFAULT_SHEET_CACHE_SECONDS
    now = time.time()
    if not force and SHEET_CACHE["rows"] is not None and now - SHEET_CACHE["loaded_at"] < ttl:
        return SHEET_CACHE["rows"]
    try:
        rows, error = fetch_live_sheet_rows(cfg)
    except (HTTPError, URLError, TimeoutError, OSError, UnicodeDecodeError, csv.Error) as exc:
        rows, error = None, str(exc)
    if rows is not None:
        SHEET_CACHE.update({"rows": rows, "loaded_at": now, "source": "live_google_sheet", "error": None})
        return rows
    rows = load_bundled_sheet_rows()
    SHEET_CACHE.update({"rows": rows, "loaded_at": now, "source": "bundled_fallback", "error": error})
    return rows


def sheet_status():
    cfg = read_sheet_config()
    return {
        "configured": bool(sheet_csv_url(cfg)),
        "source": SHEET_CACHE["source"],
        "rows": len(SHEET_CACHE["rows"] or []),
        "loadedAt": SHEET_CACHE["loaded_at"],
        "error": SHEET_CACHE["error"],
        "spreadsheetId": cfg.get("spreadsheet_id"),
        "gid": cfg.get("gid"),
        "tabName": cfg.get("tab_name"),
        "headerRow": cfg.get("header_row"),
    }


def match_row(q, row, keys):
    hay = " ".join(str(row.get(k) or "") for k in keys).lower()
    return q in hay


def matches_query(q, row, keys):
    return not q or match_row(q, row, keys)


def matches_entity_filter(row, entity_filter="", entity_key_filter=""):
    if not entity_filter and not entity_key_filter:
        return True
    row_name = norm(row_entity_name(row))
    row_key = norm(row.get("entityKey") or entity_key(row))
    if entity_filter and row_name == entity_filter:
        return True
    if entity_key_filter and row_key == entity_key_filter:
        return True
    return False


def infer_entity_type(row):
    group_type = str(row.get("groupType") or row.get("entityType") or row.get("type") or "")
    if "agent" in group_type.lower():
        return "Agent"
    if "author" in group_type.lower() or "self" in group_type.lower():
        return "Author"
    return row.get("entityType") or row.get("type") or "Publisher"


def sheet_entity_result(key, rows):
    first = rows[0]
    name = first.get("leadEntity") or first.get("publisherAuthor") or first.get("author") or ""
    books = sum((r.get("totalBooks") or 0) for r in rows)
    return {
        "kind": "entity",
        "source": "sheet",
        "entityKey": key,
        "name": name,
        "entityName": name,
        "leadEntity": name,
        "author": first.get("author") or "",
        "groupType": first.get("groupType") or "",
        "entityType": infer_entity_type(first),
        "seriesCount": len(rows),
        "books": books,
    }


def sheet_ip_result(row):
    name = row.get("leadEntity") or row.get("publisherAuthor") or row.get("author") or ""
    return {
        "kind": "ip",
        "source": "sheet",
        "id": row.get("id"),
        "entityKey": entity_key(row),
        "entityName": name,
        "leadEntity": name,
        "entityType": infer_entity_type(row),
        "author": row.get("author") or "",
        "publisherAuthor": row.get("publisherAuthor") or "",
        "series": row.get("series") or "",
        "asin": row.get("asin") or "",
        "genre": row.get("genre") or "",
        "lengthHrs": row.get("durationHrs"),
        "durationHrs": row.get("durationHrs"),
        "totalBooks": row.get("totalBooks"),
        "rating": row.get("rating"),
        "numRatings": row.get("numRatings"),
        "amazon": row.get("amazon") or "",
        "goodreads": row.get("goodreads") or "",
    }


def repository_search(q, limit, kind="", entity_filter="", entity_key_filter=""):
    db = load_db()
    results = []

    if kind != "ip":
        for entity in db["entities"].values():
            if not matches_entity_filter(entity, entity_filter, entity_key_filter):
                continue
            if not matches_query(q, entity, ["name", "entityName", "entityId", "author", "entityType"]):
                continue
            results.append(dict(entity, kind="entity", source="repository"))
            if len(results) >= limit:
                return results

    if kind != "entity":
        for ip in db["ips"].values():
            if not matches_entity_filter(ip, entity_filter, entity_key_filter):
                continue
            if not matches_query(q, ip, ["series", "ipId", "entityName", "author", "genre"]):
                continue
            results.append(dict(ip, kind="ip", source="repository"))
            if len(results) >= limit:
                return results

    return results


def sheet_search(q, remaining, kind="", entity_filter="", entity_key_filter=""):
    if remaining <= 0:
        return []
    rows = load_sheet_rows()
    results = []
    if kind != "ip":
        grouped = {}
        for row in rows:
            if not matches_entity_filter(row, entity_filter, entity_key_filter):
                continue
            if matches_query(q, row, ["leadEntity", "publisherAuthor", "author"]):
                grouped.setdefault(entity_key(row), []).append(row)
        for key, group in list(grouped.items())[: max(2, remaining // 2)]:
            results.append(sheet_entity_result(key, group))
            if len(results) >= remaining:
                return results

    seen_ips = set()
    if kind != "entity":
        for row in rows:
            if not matches_entity_filter(row, entity_filter, entity_key_filter):
                continue
            if not matches_query(q, row, ["series", "author", "leadEntity", "publisherAuthor", "genre"]):
                continue
            key = ip_key(entity_key(row), row.get("series"))
            if key in seen_ips:
                continue
            seen_ips.add(key)
            results.append(sheet_ip_result(row))
            if len(results) >= remaining:
                return results
    return results


def search_payload(params):
    q = norm(params.get("q", [""])[0])
    entity_filter = norm(params.get("entity", [""])[0])
    entity_key_filter = norm(params.get("entityKey", [""])[0])
    kind = norm(params.get("kind", [""])[0])
    try:
        limit = max(1, min(40, int(params.get("limit", ["12"])[0])))
    except ValueError:
        limit = 12
    allow_empty = kind == "ip" and (entity_filter or entity_key_filter)
    if len(q) < 2 and not allow_empty:
        return {"results": [], "repositoryCount": len(load_db()["ips"])}
    repo = repository_search(q, limit, kind=kind, entity_filter=entity_filter, entity_key_filter=entity_key_filter)
    sheet = sheet_search(q, limit - len(repo), kind=kind, entity_filter=entity_filter, entity_key_filter=entity_key_filter)
    return {"results": repo + sheet, "repositoryCount": len(load_db()["ips"])}


def read_json_body(handler):
    length = int(handler.headers.get("Content-Length", "0") or 0)
    raw = handler.rfile.read(length) if length else b"{}"
    return json.loads(raw.decode("utf-8") or "{}")


def save_snapshot(deal):
    db = load_db()
    entity_name = deal.get("entityName") or ""
    ekey = deal.get("scoutEntityKey") or ip_key(entity_name, deal.get("author") or "")
    now = deal.get("updatedAt") or deal.get("createdAt") or ""
    ips = deal.get("ips") or []
    entity = {
        "kind": "entity",
        "source": "repository",
        "entityKey": ekey,
        "name": entity_name,
        "entityName": entity_name,
        "entityId": deal.get("entityId"),
        "entityType": deal.get("entityType"),
        "author": deal.get("author") or "",
        "seriesCount": len(ips),
        "books": sum((ip.get("totalBooks") or 0) for ip in ips),
        "savedAt": now,
    }
    db["entities"][ekey] = {**db["entities"].get(ekey, {}), **entity}

    saved_ips = 0
    for ip in ips:
        series = ip.get("series") or ""
        if not series:
            continue
        key = ip_key(ekey, series)
        db["ips"][key] = {
            **db["ips"].get(key, {}),
            "kind": "ip",
            "source": "repository",
            "entityKey": ekey,
            "entityName": entity_name,
            "entityId": deal.get("entityId"),
            "entityType": deal.get("entityType"),
            "author": deal.get("author") or "",
            "ipId": ip.get("ipId"),
            "series": series,
            "asin": ip.get("asin") or "",
            "genre": ip.get("genre") or "",
            "lengthHrs": ip.get("lengthHrs"),
            "durationHrs": ip.get("durationHrs") or ip.get("lengthHrs"),
            "totalBooks": ip.get("totalBooks"),
            "rating": ip.get("rating"),
            "numRatings": ip.get("numRatings"),
            "amazon": ip.get("amazon") or "",
            "goodreads": ip.get("goodreads") or "",
            "links": ip.get("links") or [],
            "titlesInScope": ip.get("titlesInScope") or "All",
            "savedAt": now,
        }
        saved_ips += 1

    if deal.get("id"):
        db["deals"][deal["id"]] = deal
    save_db(db)
    return {"ok": True, "entityKey": ekey, "savedIps": saved_ips, "repositoryIps": len(db["ips"])}


class PreviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            db = load_db()
            load_sheet_rows()
            return json_response(self, 200, {"ok": True, "entities": len(db["entities"]), "ips": len(db["ips"]), "deals": len(db["deals"]), "sheet": sheet_status()})
        if parsed.path == "/api/repository/search":
            return json_response(self, 200, search_payload(parse_qs(parsed.query)))
        if parsed.path == "/api/repository":
            db = load_db()
            return json_response(self, 200, {"entities": list(db["entities"].values()), "ips": list(db["ips"].values()), "deals": list(db["deals"].values())})
        if parsed.path == "/api/sheet/status":
            load_sheet_rows()
            return json_response(self, 200, sheet_status())
        if parsed.path == "/api/deals":
            db = load_db()
            deals = list(db["deals"].values())
            return json_response(self, 200, {"ok": True, "deals": deals, "count": len(deals)})
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/repository/snapshot":
            try:
                payload = read_json_body(self)
                deal = payload.get("deal") or payload
                return json_response(self, 200, save_snapshot(deal))
            except Exception as exc:
                return json_response(self, 500, {"ok": False, "error": str(exc)})
        if parsed.path == "/api/deals":
            try:
                payload = read_json_body(self)
                deal = payload.get("deal") or payload
                return json_response(self, 200, save_snapshot(deal))
            except Exception as exc:
                return json_response(self, 500, {"ok": False, "error": str(exc)})
        if parsed.path == "/api/sheet/reload":
            try:
                rows = load_sheet_rows(force=True)
                return json_response(self, 200, {"ok": True, "rows": len(rows), "sheet": sheet_status()})
            except Exception as exc:
                return json_response(self, 500, {"ok": False, "error": str(exc)})
        return json_response(self, 404, {"ok": False, "error": "Not found"})


def main():
    mimetypes.add_type("application/javascript", ".js")
    port = int(os.environ.get("PORT") or 5173)
    server = ThreadingHTTPServer(("127.0.0.1", port), PreviewHandler)
    print(f"Serving preview with repository API on http://127.0.0.1:{port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
