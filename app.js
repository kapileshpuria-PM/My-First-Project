/* Pocket FM Deal Tracker - MVP app (no build step; React UMD + htm + Tailwind CDN) */
const html = htm.bind(React.createElement);
const { useState, useMemo, useEffect, useRef } = React;

/* ----------------------------- helpers ----------------------------- */
const CUR = { EUR: "\u20ac", USD: "$", GBP: "\u00a3" };
const uid = (p) => (p || "id") + "-" + Math.random().toString(36).slice(2, 9);
const cx = (...a) => a.filter(Boolean).join(" ");
const STATUSES = ["Aligned internally", "Offered", "Countered", "Agreed", "Executed"];
const STATUS_STYLE = {
  "Aligned internally": "bg-slate-500/15 text-slate-300 ring-slate-400/30",
  "Offered": "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  "Countered": "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  "Agreed": "bg-violet-500/15 text-violet-300 ring-violet-400/30",
  "Executed": "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
};
const TYPE_STYLE = { Publisher: "text-sky-300", Author: "text-emerald-300", Agent: "text-amber-300" };
const DEDUCTIONS = ["Production", "Distribution", "Marketing"];
const RIGHTS_OPTS = ["Exclusive serialised audio adaptation", "Audio drama adaptation", "Audiobook"];
const EXCL_OPTS = ["Exclusive (format)", "Exclusive (audio drama)", "Non-exclusive"];
const POCS = ["Elnas", "Vencislava", "Suzy", "Prateek", "Shlok"];
function entityNameOf(r) { return r.leadEntity || r.entityName || r.name || r.publisherAuthor || r.author || ""; }
function entityKeyOf(r) { return normName(entityNameOf(r)); }

/* ----- entity / IP identity + Live-Closed status (FEATURE-1 & FEATURE-2) ----- */
const TYPE_CODE = { Author: "AUTH", Publisher: "PUB", Agent: "AGEN" };
const TERMINAL_STATUSES = ["Executed", "Lost", "Dropped"];
function isClosedDeal(d) { return TERMINAL_STATUSES.includes(d.status); }
function isLiveDeal(d) { return !isClosedDeal(d); }
function normName(s) { return (s || "").trim().toLowerCase(); }
function pad2(n) { return String(n).padStart(2, "0"); }
function entitySerial(entityId) { const m = String(entityId || "").match(/(\d+)\s*$/); return m ? parseInt(m[1], 10) : 0; }
function ipNum(ipId) { const m = String(ipId || "").match(/IP-(\d+)\s*$/i); return m ? parseInt(m[1], 10) : 0; }
function nextSerialNum(deals) { let max = 0; deals.forEach((d) => { const n = entitySerial(d.entityId); if (n > max) max = n; }); return max + 1; }
function previewEntityId(type, deals) { return "ENT-" + (TYPE_CODE[type] || "ENT") + "-" + pad2(nextSerialNum(deals)); }
function findEntityIdByName(deals, name) { const k = normName(name); for (const d of deals) { if (normName(d.entityName) === k && d.entityId) return d.entityId; } return null; }
function maxIpNumForEntity(deals, entityId) { let max = 0; deals.forEach((d) => { if (d.entityId !== entityId) return; (d.ips || []).forEach((ip) => { const n = ipNum(ip.ipId); if (n > max) max = n; }); }); return max; }
function existingIpMap(deals, entityId) { const m = {}; deals.forEach((d) => { if (d.entityId !== entityId) return; (d.ips || []).forEach((ip) => { if (ip.ipId) m[normName(ip.series)] = ip.ipId; }); }); return m; }
// Resolve/mint Entity ID by name (reuse if the party already exists) and assign IP IDs (reuse on re-engagement, else next per-entity number).
function assignDealIds(raw, deals) {
  let entityId = findEntityIdByName(deals, raw.entityName);
  let type = raw.entityType;
  if (entityId) { const ex = deals.find((d) => d.entityId === entityId); if (ex) type = ex.entityType || type; }
  else { entityId = "ENT-" + (TYPE_CODE[type] || "ENT") + "-" + pad2(nextSerialNum(deals)); }
  let maxIp = maxIpNumForEntity(deals, entityId);
  const map = existingIpMap(deals, entityId);
  const ips = (raw.ips || []).map((ip) => {
    const k = normName(ip.series); let id = map[k];
    if (!id) { maxIp += 1; id = entityId + "-IP-" + pad2(maxIp); map[k] = id; }
    return Object.assign({ id: ip.id || uid("ip") }, ip, { ipId: id });
  });
  return Object.assign({}, raw, { entityId: entityId, entityType: type, ips: ips });
}
// Next IP ID for an IP added directly on the deal page (always a fresh number under the entity).
function mintIpIdFor(deals, deal, entityId) {
  const max = Math.max(maxIpNumForEntity(deals, entityId), (deal.ips || []).reduce((m, ip) => Math.max(m, ipNum(ip.ipId)), 0));
  return (entityId || deal.entityId || "ENT-UNK-00") + "-IP-" + pad2(max + 1);
}
// Distinct list of entities already in the app (for the New-deal resolver), ordered by serial.
function appEntityList(deals) {
  const m = {};
  deals.forEach((d) => { const k = normName(d.entityName); if (!k) return; if (!m[k]) m[k] = { entityId: d.entityId, name: d.entityName, type: d.entityType, key: k, deals: 0 }; m[k].deals += 1; });
  return Object.values(m).sort((a, b) => entitySerial(a.entityId) - entitySerial(b.entityId));
}

function fmtMoney(amount, cur) {
  if (amount == null || amount === "") return "\u2014";
  return (CUR[cur] || "") + Number(amount).toLocaleString();
}
function currentRound(d) { return d.rounds.find((r) => r.id === d.currentRoundId) || d.rounds[d.rounds.length - 1]; }
function alignedRound(d) { return d.rounds.find((r) => /align/i.test(r.label)); }
function booksInScope(ip) {
  if (!ip) return 0;
  const t = ip.titlesInScope;
  if (t == null || t === "" || /^all\b/i.test(String(t).trim())) return ip.totalBooks || 0;
  const nums = (String(t).match(/\d+/g) || []).map(Number);
  if (nums.length >= 2) { const a = Math.min(...nums), b = Math.max(...nums); return (b - a + 1); } // "Book 1-5" -> 5
  if (nums.length === 1) return nums[0]; // "5 books" -> 5
  return ip.totalBooks || 0;
}
function dealBooks(d) { return d.ips.reduce((s, ip) => s + booksInScope(ip), 0); }
function mgPerBook(d) { const t = currentRound(d).terms; const b = dealBooks(d); if (!t.mgAmount || !b) return null; return t.mgAmount / b; }
function savingPct(d) {
  const a = alignedRound(d); const c = currentRound(d);
  if (!a || !c || !a.terms.mgAmount || a.id === c.id) return null;
  return Math.round((1 - c.terms.mgAmount / a.terms.mgAmount) * 100);
}

/* MG Decision Template guardrail: max rev share by genre priority + sales tier (from the Lookup matrix). */
function genrePriority(g) { g = (g || "").toLowerCase(); if (/crime|thriller|myster|police|detective|noir|suspense/.test(g)) return "P0"; if (/fantasy|romantasy|romance|paranormal/.test(g)) return "P1"; return "P2"; }
function salesTier(n) { if (n == null) return null; if (n >= 10000) return "A"; if (n >= 1500) return "B"; return "C"; }
const REV_MAX = { "P0|A": 22, "P0|B": 20, "P0|C": 15, "P1|A": 20, "P1|B": 18, "P1|C": 15, "P2|A": 20, "P2|B": 15, "P2|C": 12 };
function ipRevMax(ip) { const t = salesTier(ip.numRatings); if (!t) return null; return REV_MAX[genrePriority(ip.genre) + "|" + t]; }
function dealRevMax(d) { const xs = (d.ips || []).map(ipRevMax).filter((x) => x != null); return xs.length ? Math.min(...xs) : null; }
function lengthKey(h) { return (h != null && h >= 80) ? "80" : "40"; }
const MG_MATRIX = {
  "P0|A|80": [5000, 12000], "P0|A|40": [3000, 9000], "P0|B|80": [2000, 5000], "P0|B|40": [1000, 3500], "P0|C|80": [0, 2500], "P0|C|40": [0, 2500],
  "P1|A|80": [3000, 9000], "P1|A|40": [2000, 5000], "P1|B|80": [1000, 2500], "P1|B|40": [0, 1500], "P1|C|80": [0, 1000], "P1|C|40": [0, 1000],
  "P2|A|80": [3000, 7500], "P2|A|40": [2000, 4000], "P2|B|80": [0, 1500], "P2|B|40": [0, 1000], "P2|C|80": [0, 0], "P2|C|40": [0, 0]
};
function ipMgRange(ip) { const t = salesTier(ip.numRatings); if (!t) return null; return MG_MATRIX[genrePriority(ip.genre) + "|" + t + "|" + lengthKey(ip.lengthHrs)] || null; }
// Suggested deal MG range = sum of per-IP matrix range scaled by (titles in scope / total titles).
function dealMgSuggestion(d) {
  let lo = 0, hi = 0, any = false;
  (d.ips || []).forEach((ip) => {
    const r = ipMgRange(ip); if (!r) return;
    const tot = ip.totalBooks || 0; const frac = tot ? Math.min(1, booksInScope(ip) / tot) : 1;
    lo += r[0] * frac; hi += r[1] * frac; any = true;
  });
  return any ? [Math.round(lo), Math.round(hi)] : null;
}

/* Payment calculation readiness: deal terms are the default, IP terms override only when needed. */
const PAYMENT_OVERRIDE_FIELDS = ["mgAmount", "mgCurrency", "mgBasis", "mgRecoupable", "mgPaidOn", "revSharePct", "revShareBase", "capPct", "deductions", "mgFutureTitles", "additionalConditions"];
function hasValue(v) { return v !== null && v !== undefined && v !== ""; }
function ipUsesCustomPaymentTerms(ip) {
  if (!ip) return false;
  if (ip.paymentTermsMode === "deal") return false;
  return ip.paymentTermsMode === "custom" || !!(ip.paymentTerms && Object.keys(ip.paymentTerms).length);
}
function clonePaymentTerms(terms) {
  const out = {};
  PAYMENT_OVERRIDE_FIELDS.forEach((k) => {
    if (terms && terms[k] !== undefined) out[k] = Array.isArray(terms[k]) ? terms[k].slice() : terms[k];
  });
  return out;
}
function effectivePaymentTerms(deal, ip) {
  const round = currentRound(deal);
  const base = round && round.terms || {};
  return ipUsesCustomPaymentTerms(ip) ? Object.assign({}, base, ip.paymentTerms || {}) : Object.assign({}, base);
}
function paymentTermsSource(ip) {
  return ipUsesCustomPaymentTerms(ip) ? "IP override" : "Deal default";
}
function paymentMissingFields(terms) {
  const missing = [];
  if (!hasValue(terms.mgAmount)) missing.push("MG");
  if (!hasValue(terms.mgCurrency)) missing.push("MG currency");
  if (!hasValue(terms.mgBasis)) missing.push("MG basis");
  if (!hasValue(terms.revSharePct)) missing.push("Rev share");
  if (!hasValue(terms.revShareBase)) missing.push("Rev share base");
  if (terms.mgRecoupable == null) missing.push("Recoupment");
  return missing;
}
function paymentReadinessForIp(deal, ip) {
  const terms = effectivePaymentTerms(deal, ip);
  const missing = paymentMissingFields(terms);
  if (!hasValue(ip && ip.ipId)) missing.push("IP ID");
  if (!hasValue(ip && ip.series)) missing.push("IP name");
  return { ready: missing.length === 0, missing, terms, source: paymentTermsSource(ip) };
}
function paymentReadinessForDeal(deal) {
  const ips = (deal.ips || []).filter((ip) => !ip.dropped);
  const results = ips.map((ip) => paymentReadinessForIp(deal, ip));
  const readyCount = results.filter((r) => r.ready).length;
  const customCount = ips.filter(ipUsesCustomPaymentTerms).length;
  const missing = [];
  results.forEach((r) => r.missing.forEach((m) => { if (!missing.includes(m)) missing.push(m); }));
  return {
    total: ips.length,
    readyCount,
    customCount,
    ready: ips.length > 0 && readyCount === ips.length,
    missing
  };
}

/* ----------------------------- store ----------------------------- */
const KEY = "pfm_deal_tracker_v1";
const SEED_VERSION = 5; // bump to push fresh seed data to already-loaded browsers
function freshSeed() { return JSON.parse(JSON.stringify(window.SEED_DEALS || [])); }
function ensureDemoSeedDeals(deals) {
  const existing = {};
  (deals || []).forEach((d) => { if (d && d.id) existing[d.id] = true; });
  const required = freshSeed().filter((d) => d.demoPaymentSeed && !existing[d.id]);
  return required.length ? deals.concat(required) : deals;
}
function load() {
  try {
    const r = localStorage.getItem(KEY);
    if (r) { const o = JSON.parse(r); if (o && o.version === SEED_VERSION && Array.isArray(o.deals)) return ensureDemoSeedDeals(o.deals); }
  } catch (e) {}
  return freshSeed();
}
function save(deals) { try { localStorage.setItem(KEY, JSON.stringify({ version: SEED_VERSION, deals: deals })); } catch (e) {} }
function resetData() { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); }
function persistDealSnapshot(deal) {
  const backend = window.PFMBackend;
  if (!backend || !backend.snapshotDeal) return;
  backend.snapshotDeal(deal).catch((e) => console.warn("Repository snapshot failed", e));
}

/* ----------------------------- icons (Lucide-style) ----------------------------- */
const ICON_BODY = {
  deals: html`<g><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></g>`,
  bench: html`<g><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="12.5" y="7" width="3" height="10" rx="1"/><rect x="18" y="13" width="3" height="4" rx="1"/></g>`,
  search: html`<g><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></g>`,
  back: html`<g><path d="M15 18l-6-6 6-6"/></g>`,
  plus: html`<g><path d="M12 5v14M5 12h14"/></g>`,
  calendar: html`<g><rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M8 2.5v4M16 2.5v4M3 9h18"/></g>`,
  link: html`<g><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></g>`,
  x: html`<g><path d="M18 6 6 18M6 6l12 12"/></g>`,
  star: html`<g><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9z"/></g>`,
  trash: html`<g><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13"/></g>`,
  check: html`<g><path d="M21.5 6.5l-11.5 11.5L4 12"/></g>`,
  pay: html`<g><circle cx="12" cy="12" r="9"/><path d="M12 7v10M14.5 9.2c0-1-1.1-1.7-2.5-1.7s-2.5.7-2.5 1.7 1.1 1.6 2.5 1.6 2.5.7 2.5 1.7-1.1 1.7-2.5 1.7-2.5-.7-2.5-1.7"/></g>`,
  wave: html`<g><path d="M4 12h2l2-6 3 14 3-18 2 10h4"/></g>`,
  sun: html`<g><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g>`,
  moon: html`<g><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></g>`
};
function Icon({ name, size, className }) {
  const s = size || 16;
  return html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class=${className}>${ICON_BODY[name] || ""}</svg>`;
}

/* ----------------------------- small UI ----------------------------- */
function Pill({ children, className }) {
  return html`<span class=${cx("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", className)}>${children}</span>`;
}
function StatusBadge({ status }) {
  const dotColor = { "Aligned internally": "bg-slate-400", "Offered": "bg-sky-400", "Countered": "bg-amber-400", "Agreed": "bg-violet-400", "Executed": "bg-emerald-400" }[status] || "bg-sky-400";
  return html`<${Pill} className=${STATUS_STYLE[status] || STATUS_STYLE["Offered"]}><span class=${cx("h-1.5 w-1.5 rounded-full", dotColor)}></span>${status}<//>`;
}
function Field({ label, children, hint }) {
  return html`<label class="block">
    <div class="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">${label}${hint && html`<span class="font-normal normal-case text-slate-500">${hint}</span>`}</div>
    ${children}
  </label>`;
}
const inputCls = "w-full rounded-xl border border-white/10 bg-ink-850/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-500 hover:border-white/15 focus:border-brand-500 focus:bg-ink-850 focus:ring-4 focus:ring-brand-500/15";

function TextInput(props) { return html`<input ...${props} class=${cx(inputCls, props.class)} />`; }
function NumInput({ value, onChange, placeholder, className, suffix }) {
  const [t, setT] = useState(value == null ? "" : String(value));
  useEffect(() => { setT(value == null ? "" : String(value)); }, [value]);
  const onInput = (e) => { const v = e.target.value.replace(/[^0-9.]/g, ""); setT(v); const n = v === "" ? null : parseFloat(v); onChange(Number.isNaN(n) ? null : n); };
  return html`<div class="relative">
    <input type="text" inputmode="decimal" value=${t} onInput=${onInput} placeholder=${placeholder} class=${cx(inputCls, suffix ? "pr-9" : "", className)} />
    ${suffix && html`<span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">${suffix}</span>`}
  </div>`;
}
function Select({ value, onChange, options, class: c }) {
  return html`<select value=${value} onChange=${(e) => onChange(e.target.value)} class=${cx(inputCls, "appearance-none cursor-pointer", c)}>
    ${options.map((o) => html`<option key=${o} value=${o}>${o}</option>`)}
  </select>`;
}
function LinkChip({ label, url }) {
  if (!url) return null;
  return html`<a href=${url} target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-ink-850 px-2.5 py-1 text-xs text-brand-400 transition hover:border-brand-500/50 hover:bg-brand-500/10">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>
    ${label}
  </a>`;
}
function IdChip({ id, title }) {
  if (!id) return null;
  return html`<span title=${title || "Identifier"} class="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-tight text-slate-400">${id}</span>`;
}

/* ----------------------------- SCOUT search-select ----------------------------- */
/* Entities are an aggregation over SCOUT rows (which are per-series). One entity = one
   row here, collapsing all its series, so the picker never shows the same entity twice. */
function buildEntities() {
  const map = {};
  (window.SCOUT_DATA || []).forEach((r) => {
    const name = r.leadEntity || r.publisherAuthor || r.author;
    if (!name) return;
    const key = entityKeyOf(r);
    if (!map[key]) map[key] = { key: key, leadEntity: name, publisherAuthor: r.publisherAuthor, author: r.author || "", groupType: r.groupType || "", group: r.group || "", seriesCount: 0, books: 0 };
    map[key].seriesCount += 1;
    map[key].books += (r.totalBooks || 0);
  });
  return Object.values(map).sort((a, b) => b.seriesCount - a.seriesCount);
}
const ENTITY_INDEX = buildEntities();

function ScoutSearch({ placeholder, onPick, mode, scope }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const data = window.SCOUT_DATA || [];
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (mode === "entity") {
      if (s.length < 2) return [];
      return ENTITY_INDEX.filter((e) => (e.leadEntity + " " + e.author).toLowerCase().includes(s)).slice(0, 8);
    }
    // IP mode. If scoped to an entity, show only that entity's series (even with empty query).
    if (scope) {
      return data.filter((r) => entityKeyOf(r) === scope && (r.series + " " + r.author).toLowerCase().includes(s)).slice(0, 40);
    }
    if (s.length < 2) return [];
    return data.filter((r) => (r.series + " " + r.author + " " + r.leadEntity).toLowerCase().includes(s)).slice(0, 8);
  }, [q, mode, scope]);
  return html`<div class="relative">
    <${TextInput} value=${q} placeholder=${placeholder}
      onInput=${(e) => { setQ(e.target.value); setOpen(true); }}
      onFocus=${() => setOpen(true)} />
    ${open && results.length > 0 && html`<div class="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-ink-800 shadow-2xl fade-in">
      ${results.map((r, idx) => html`<button key=${(r.id || r.leadEntity) + "-" + idx} type="button"
        onClick=${() => { onPick(r); setQ(""); setOpen(false); }}
        class="flex w-full items-start justify-between gap-3 border-b border-white/5 px-3 py-2 text-left transition hover:bg-brand-500/10">
        <div>
          <div class="text-sm font-medium text-slate-100">${mode === "entity" ? r.leadEntity : r.series}</div>
          <div class="text-xs text-slate-400">${mode === "entity" ? ((r.author || "\u2014") + (r.groupType ? " \u00b7 " + r.groupType : "")) : (r.author + " \u00b7 " + r.genre)}</div>
        </div>
        <div class="shrink-0 text-right text-xs text-slate-400">
          ${mode === "entity"
            ? html`<div>${r.seriesCount} ${r.seriesCount === 1 ? "series" : "series"}</div><div class="text-slate-500">${r.books} books</div>`
            : html`${r.rating ? html`<div>\u2605 ${r.rating} <span class="text-slate-500">(${(r.numRatings || 0).toLocaleString()})</span></div>` : ""}${r.totalBooks ? html`<div class="text-slate-500">${r.totalBooks} books</div>` : ""}`}
        </div>
      </button>`)}
    </div>`}
  </div>`;
}

/* ----------------------------- main App ----------------------------- */
const SECTIONS = ["live", "benchmarks", "closed", "payments"];
function viewFromHash() { const h = (location.hash || "").replace(/^#/, ""); if (/^deal\//.test(h)) return null; return SECTIONS.includes(h) ? h : "live"; }
function hashForView(v) { return v === "live" ? "" : "#" + v; }

function App() {
  const [deals, setDeals] = useState(load);
  const [view, setView] = useState(viewFromHash);
  const [selId, setSelId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [band, setBand] = useState(null);
  useEffect(() => { save(deals); }, [deals]);
  useEffect(() => {
    const fromHash = () => {
      const m = (location.hash || "").match(/deal\/(.+)$/);
      setSelId(m ? decodeURIComponent(m[1]) : null);
      if (!m) setView(viewFromHash());
    };
    fromHash(); window.addEventListener("hashchange", fromHash); return () => window.removeEventListener("hashchange", fromHash);
  }, []);
  const openDeal = (id) => { location.hash = "deal/" + encodeURIComponent(id); };
  const goList = () => { location.hash = hashForView(view); };
  const goSection = (v) => { setBand(null); location.hash = hashForView(v); };

  const selected = deals.find((d) => d.id === selId);
  const update = (id, fn) => setDeals((ds) => ds.map((d) => (d.id === id ? fn(d) : d)));
  const addDeal = (raw) => {
    const createdId = raw.id;
    setDeals((ds) => {
      const created = assignDealIds(raw, ds);
      persistDealSnapshot(created);
      return [created, ...ds];
    });
    setCreating(false);
    openDeal(createdId);
  };
  const removeDeal = (id) => { setDeals((ds) => ds.filter((d) => d.id !== id)); goList(); };
  const drillBand = (b) => { setBand(b); location.hash = hashForView("live"); };

  const liveDeals = deals.filter(isLiveDeal);
  const closedDeals = deals.filter(isClosedDeal);

  return html`<div class="flex h-screen w-full overflow-hidden">
    <${Sidebar} view=${view} setView=${goSection} liveCount=${liveDeals.length} closedCount=${closedDeals.length} />
    <main class=${cx("flex-1", view === "payments" && !selected ? "overflow-hidden" : "overflow-y-auto")}>
      ${view === "live" && !selected && html`<${DealsView} deals=${liveDeals} title="Live deals" subtitle=${liveDeals.length + " in negotiation"} onOpen=${openDeal} onNew=${() => setCreating(true)} band=${band} clearBand=${() => setBand(null)} showNew=${true} />`}
      ${view === "closed" && !selected && html`<${DealsView} deals=${closedDeals} title="Closed deals" subtitle=${closedDeals.length + " executed / closed"} onOpen=${openDeal} onNew=${() => setCreating(true)} band=${band} clearBand=${() => setBand(null)} showNew=${false} />`}
      ${view === "benchmarks" && !selected && html`<${Benchmarks} deals=${deals} onDrill=${drillBand} />`}
      ${view === "payments" && !selected && html`<${PaymentsView} deals=${closedDeals} />`}
      ${selected && html`<${DealDetail} deal=${selected} allDeals=${deals} onBack=${goList} update=${update} remove=${removeDeal} />`}
    </main>
    ${creating && html`<${NewDeal} deals=${deals} onClose=${() => setCreating(false)} onCreate=${addDeal} />`}
  </div>`;
}

function Sidebar({ view, setView, liveCount, closedCount }) {
  const Item = (id, label, ic, badge) => html`<button onClick=${() => setView(id)}
    class=${cx("group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all", view === id ? "bg-brand-500/12 text-white ring-1 ring-brand-500/30" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200")}>
    ${view === id && html`<span class="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand-500 shadow-[0_0_10px_rgba(229,31,79,.7)]"></span>`}
    <${Icon} name=${ic} size=${17} className=${view === id ? "text-brand-400" : "text-slate-500 group-hover:text-slate-300"} />
    <span class="flex-1 text-left">${label}</span>
    ${badge != null && html`<span class=${cx("tnum rounded-md px-1.5 py-0.5 text-[10px] font-semibold", view === id ? "bg-brand-500/20 text-brand-200" : "bg-white/[0.05] text-slate-500")}>${badge}</span>`}
  </button>`;
  return html`<aside class="flex w-[244px] shrink-0 flex-col border-r border-white/[0.06] bg-ink-950/60 px-3.5 py-5 glass">
    <div class="mb-8 flex items-center gap-2.5 px-1.5">
      <img src="./assets/logo-white.png" class="logo-dark h-8 w-auto" alt="Pocket FM" />
      <img src="./assets/logo-red.png" class="logo-light h-8 w-auto" alt="Pocket FM" />
      <span class="h-4 w-px bg-slate-400/30"></span>
      <span class="text-[12px] font-medium text-slate-400">Deal Tracker</span>
    </div>
    <div class="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">Workspace</div>
    <nav class="space-y-1">
      ${Item("live", "Live Deals", "deals", liveCount)}
      ${Item("benchmarks", "Benchmarks", "bench", null)}
      ${Item("closed", "Closed Deals", "check", closedCount)}
      ${Item("payments", "Payments Calculation", "pay", null)}
    </nav>
    <div class="mt-auto space-y-2 px-1">
      <${ThemeToggle} />
      <div class="flex items-center justify-between px-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
        <span>MVP \u00b7 local</span>
        <button onClick=${resetData} class="transition hover:text-slate-400">Reset data</button>
      </div>
    </div>
  </aside>`;
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "dark");
  const set = (v) => { setTheme(v); const el = document.documentElement; el.classList.add("theming"); el.dataset.theme = v; setTimeout(() => el.classList.remove("theming"), 450); try { localStorage.setItem("pfm_theme", v); } catch (e) {} };
  const Opt = (v, label, ic) => html`<button onClick=${() => set(v)}
    class=${cx("flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all", theme === v ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,.06)] ring-1 ring-white/10" : "text-slate-400 hover:text-slate-200")}>
    <${Icon} name=${ic} size=${14} />${label}</button>`;
  return html`<div class="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
    ${Opt("dark", "Dark", "moon")}${Opt("light", "Light", "sun")}
  </div>`;
}

window.__PFM = { App, html };
