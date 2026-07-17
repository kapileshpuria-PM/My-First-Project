/* Pocket FM Deal Tracker - Payments Calculation.
 *
 * Demo upload flow:
 * 1. IP ID x Show ID x Show Type mapping
 * 2. Monthly show performance dump
 *
 * Commercial terms are matched from Closed Deals first. A tiny demo fallback is kept only so the
 * supplied sample files can produce visible calculations before matching Closed Deals are created.
 */
(function () {
  window.PAY_INTERNAL_ALLOC = 0.15;
  window.PAY_FIXED_RATES = { vat: 0.1597, distPct: 0.13, aiCph: 100, pgcCph: 1300, otherCph: 0 };
  if (window.PAY_SHOW_VALIDATION_WARNINGS == null) window.PAY_SHOW_VALIDATION_WARNINGS = false;
  window.PAY_DEMO_TERMS = [
    { ip: "My Vampire System", publisher: "Bastei", deductable: 0.25, revShare: 0.20, advance: 4000, mgPaidOn: "Jan'26", distPct: 0.15, dist: true, prod: true, mkt: true },
    { ip: "Saving Nora", publisher: "Demo terms", deductable: 0.28, revShare: 0.15, advance: 3500, mgPaidOn: "Jan'26", distPct: 0.12, dist: true, prod: true, mkt: true },
    { ip: "The Alpha's Bride", publisher: "dTV", deductable: 0.30, revShare: 0.20, advance: 3000, mgPaidOn: "Jan'26", distPct: 0.14, dist: false, prod: true, mkt: false }
  ];
})();

/* ----------------------------- parsing helpers ----------------------------- */
const PAY_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PAY_MONTH_INDEX = PAY_MONTHS.reduce((m, name, i) => { m[name.toLowerCase()] = i; return m; }, {});

function payNormHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function payNormText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function payParseNumber(value) {
  if (value == null || value === "") return 0;
  let text = String(value).trim();
  if (!text) return 0;
  const neg = /^\(.*\)$/.test(text);
  text = text.replace(/[,$%\s]/g, "").replace(/[()]/g, "");
  const n = parseFloat(text);
  if (!isFinite(n)) return 0;
  return neg ? -n : n;
}
function payPct(n) {
  const v = n * 100;
  return (Math.abs(v % 1) > 0.001 ? v.toFixed(2) : v.toFixed(0)) + "%";
}
function payFmt(n) {
  if (n == null || isNaN(n)) return "\u2014";
  return (n < 0 ? "-" : "") + "$" + Math.round(Math.abs(n)).toLocaleString("en-US");
}
function payNum(n) {
  if (n == null || isNaN(n)) return "\u2014";
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
}
function payCsvRows(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i], n = text[i + 1];
    if (quoted) {
      if (c === '"' && n === '"') { cell += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => String(v || "").trim() !== ""));
}
function payRowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((h, i) => ({ raw: h, key: payNormHeader(h), idx: i }));
  return rows.slice(1).map((cells, rowIdx) => {
    const obj = { __rowNum: rowIdx + 2, __cells: cells };
    headers.forEach((h) => { obj[h.key] = cells[h.idx] == null ? "" : cells[h.idx]; });
    return obj;
  });
}
function payPick(row, aliases) {
  for (const alias of aliases) {
    const key = payNormHeader(alias);
    if (row[key] != null && String(row[key]).trim() !== "") return row[key];
  }
  return "";
}
function payPeriodInfo(value) {
  const raw = String(value || "").trim();
  const iso = raw.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?/);
  if (iso) return payPeriodFromParts(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, raw);
  const parts = raw.split(/[^A-Za-z0-9]+/).filter(Boolean);
  let month = -1, year = null;
  parts.forEach((p) => {
    const low = p.slice(0, 3).toLowerCase();
    if (PAY_MONTH_INDEX[low] != null) month = PAY_MONTH_INDEX[low];
    if (/^\d{4}$/.test(p)) year = parseInt(p, 10);
    if (/^\d{2}$/.test(p) && year == null && parseInt(p, 10) > 24) year = 2000 + parseInt(p, 10);
  });
  if (month >= 0 && year) return payPeriodFromParts(year, month, raw);
  const short = raw.match(/^([A-Za-z]{3})'?(\d{2})$/);
  if (short && PAY_MONTH_INDEX[short[1].toLowerCase()] != null) {
    return payPeriodFromParts(2000 + parseInt(short[2], 10), PAY_MONTH_INDEX[short[1].toLowerCase()], raw);
  }
  return { key: raw, label: raw || "\u2014", quarter: "\u2014", sort: 999999 };
}
function payPeriodFromParts(year, month, raw) {
  const label = PAY_MONTHS[month] + "'" + String(year).slice(-2);
  const quarterNum = Math.floor(month / 3) + 1;
  return {
    key: year + "-" + String(month + 1).padStart(2, "0"),
    label,
    quarter: "Q" + quarterNum + " " + year,
    quarterSort: year * 4 + quarterNum,
    sort: year * 12 + month,
    raw
  };
}
function payPeriodFromDate(value) {
  if (!value) return null;
  return payPeriodInfo(String(value).slice(0, 10));
}
function paySortPeriods(a, b) {
  return (a.sort || 0) - (b.sort || 0);
}
async function payReadTabularFile(file) {
  const name = (file && file.name || "").toLowerCase();
  if (/\.(xlsx|xls)$/i.test(name)) {
    if (!window.XLSX) throw new Error("XLSX parser is not loaded yet. Use CSV or refresh once the page has loaded.");
    const buffer = await file.arrayBuffer();
    const wb = window.XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
  }
  const text = await file.text();
  return payCsvRows(text);
}

function payNormalizeMapping(rawRows) {
  return payRowsToObjects(rawRows).map((row) => ({
    rowNum: row.__rowNum,
    ipId: String(payPick(row, ["IP ID", "ip_id", "ipid"])).trim(),
    ipName: String(payPick(row, ["IP Name", "ip_name", "ipname", "IP"])).trim(),
    showId: String(payPick(row, ["Show ID", "show_id", "showid"])).trim(),
    showName: String(payPick(row, ["Show Name", "show_name", "showname"])).trim(),
    showType: String(payPick(row, ["Show Type", "show_type", "showtype", "Type"])).trim().toUpperCase()
  })).filter((r) => r.ipId || r.ipName || r.showId);
}
function payNormalizeDump(rawRows) {
  return payRowsToObjects(rawRows).map((row) => {
    const p = payPeriodInfo(payPick(row, ["period", "month", "date"]));
    return {
      rowNum: row.__rowNum,
      showId: String(payPick(row, ["show_id", "Show ID", "showid"])).trim(),
      showName: String(payPick(row, ["show_name", "Show Name", "showname"])).trim(),
      language: String(payPick(row, ["show_language", "language"])).trim(),
      periodRaw: String(payPick(row, ["period", "month", "date"])).trim(),
      period: p,
      revenue: payParseNumber(payPick(row, ["revenue", "gross_revenue", "iap_revenue"])),
      scaling: payParseNumber(payPick(row, ["scaling_spends", "scaling spends", "growth", "scaling"])),
      testing: payParseNumber(payPick(row, ["testing_spends", "testing spends", "test", "testing"])),
      // User instruction: for this demo, use column J as Final Mastered Hrs.
      finalMasterHrs: payParseNumber(row.__cells && row.__cells.length > 9 ? row.__cells[9] : payPick(row, ["final_master_hrs", "final mastered hrs", "ep_duration_final_master"])),
      finalMasterSource: "Column J"
    };
  }).filter((r) => r.showId && r.period.key);
}

/* ----------------------------- term + calculation model ----------------------------- */
function payHasDeduction(terms, name) {
  return (terms.deductions || []).map(String).some((d) => d.toLowerCase() === name.toLowerCase());
}
function payBooksForAllocation(ip) {
  if (typeof booksInScope === "function") return booksInScope(ip);
  return ip.totalBooks || 0;
}
function payAdvanceForIp(deal, ip, terms) {
  if (typeof allocatedMgForIp === "function") return allocatedMgForIp(deal, ip, terms);
  const amount = payParseNumber(terms.mgAmount);
  if (!amount) return 0;
  if (terms && terms.mgAmountOverride === true) return amount;
  const activeIps = (deal.ips || []).filter((row) => !row.dropped);
  return activeIps.length ? amount / activeIps.length : amount;
}
function payTermRecordsFromClosedDeals(deals) {
  const records = [];
  (deals || []).forEach((deal) => {
    if (typeof isClosedDeal === "function" && !isClosedDeal(deal)) return;
    const round = typeof currentRound === "function" ? currentRound(deal) : (deal.rounds || [])[0];
    const baseTerms = round && round.terms || {};
    (deal.ips || []).filter((ip) => !ip.dropped).forEach((ip) => {
      const scope = typeof paymentTermsSource === "function" ? paymentTermsSource(ip) : (ip.paymentTerms ? "IP override" : "Deal default");
      const terms = typeof effectivePaymentTerms === "function" ? effectivePaymentTerms(deal, ip) : Object.assign({}, baseTerms, ip.paymentTerms || {});
      const mgPeriod = terms.mgPaidOn ? payPeriodInfo(terms.mgPaidOn) : payPeriodFromDate(round && round.date || deal.updatedAt || deal.createdAt);
      records.push({
        source: "Closed Deal",
        termScope: scope,
        dealId: deal.id,
        entityId: deal.entityId,
        entityName: deal.entityName,
        publisher: deal.publisher || deal.entityName,
        ipId: ip.ipId || "",
        paymentIpId: ip.paymentIpId || ip.externalIpId || "",
        paymentIpAliases: ip.paymentIpAliases || [],
        ip: ip.series || "",
        revShare: (payParseNumber(terms.revSharePct) || 0) / 100,
        revShareBase: terms.revShareBase || "Net",
        advance: payAdvanceForIp(deal, ip, terms),
        mgRecoupable: terms.mgRecoupable !== false,
        mgPaidOnKey: mgPeriod && mgPeriod.key,
        mgPaidOnLabel: mgPeriod && mgPeriod.label || "\u2014",
        deductable: terms.capPct != null && terms.capPct !== "" ? payParseNumber(terms.capPct) / 100 : 1,
        dist: payHasDeduction(terms, "Distribution"),
        distPct: terms.distributionPct != null ? payParseNumber(terms.distributionPct) / 100 : null,
        prod: payHasDeduction(terms, "Production"),
        mkt: payHasDeduction(terms, "Marketing"),
        terms
      });
    });
  });
  return records;
}
function payDemoTermRecord(ipName) {
  const found = (window.PAY_DEMO_TERMS || []).find((t) => payNormText(t.ip) === payNormText(ipName));
  if (!found) return null;
  const p = payPeriodInfo(found.mgPaidOn);
  return Object.assign({}, found, {
    source: "Demo fallback",
    ipId: "",
    paymentIpId: "",
    ip: found.ip,
    revShareBase: "Net",
    mgRecoupable: true,
    mgPaidOnKey: p.key,
    mgPaidOnLabel: p.label,
    terms: {}
  });
}
function payIndexTerms(records) {
  const byIpId = {}, byName = {}, byPair = {};
  records.forEach((r) => {
    const aliases = [r.ipId, r.paymentIpId].concat(r.paymentIpAliases || []).filter(Boolean).map(String);
    aliases.forEach((id) => {
      if (!byIpId[id]) byIpId[id] = [];
      byIpId[id].push(r);
      if (r.ip) byPair[id + "|" + payNormText(r.ip)] = r;
    });
    if (r.ip) byName[payNormText(r.ip)] = r;
  });
  return { byIpId, byName, byPair };
}
function payFindTerms(mapping, indexed) {
  const id = String(mapping.ipId || "");
  const name = payNormText(mapping.ipName);
  const exact = indexed.byPair[id + "|" + name];
  if (exact) return exact;
  const idMatches = indexed.byIpId[id] || [];
  const idMatch = idMatches.length === 1 ? idMatches[0] : idMatches[0];
  const nameMatch = indexed.byName[name];
  if (idMatch && nameMatch && idMatch !== nameMatch) return nameMatch;
  return idMatch || nameMatch || payDemoTermRecord(mapping.ipName);
}
function payIsClosedTerm(terms) {
  return /^Closed Deal/.test(String(terms && terms.source || ""));
}
function payCanonicalIpId(mapping, terms) {
  if (payIsClosedTerm(terms)) return terms.ipId || terms.paymentIpId || mapping.ipId || "";
  return mapping.ipId || terms.ipId || terms.paymentIpId || "";
}
function payCanonicalIpName(mapping, terms) {
  if (payIsClosedTerm(terms)) return terms.ip || mapping.ipName || "";
  return mapping.ipName || terms.ip || "";
}
function payTermMismatchWarning(mapping, terms) {
  if (!payIsClosedTerm(terms)) return null;
  const idMismatch = mapping.ipId && terms.ipId && String(mapping.ipId) !== String(terms.ipId);
  const nameMismatch = mapping.ipName && terms.ip && payNormText(mapping.ipName) !== payNormText(terms.ip);
  if (!idMismatch && !nameMismatch) return null;
  return {
    type: "Mapping",
    text: "Row " + mapping.rowNum + " says " + (mapping.ipId || "\u2014") + " - " + (mapping.ipName || "\u2014") + ", but Closed Deals resolves it to " + (terms.ipId || "\u2014") + " - " + (terms.ip || "\u2014") + ". Using Closed Deal IP for payout."
  };
}
function payEmptyTerms(mapping) {
  return {
    source: "Missing terms",
    ipId: mapping.ipId,
    ip: mapping.ipName,
    publisher: "\u2014",
    revShare: 0,
    revShareBase: "Net",
    advance: 0,
    mgRecoupable: true,
    mgPaidOnKey: null,
    mgPaidOnLabel: "\u2014",
    deductable: 0,
    dist: false,
    distPct: null,
    prod: false,
    mkt: false,
    missing: true,
    terms: {}
  };
}
function payShowTypeCph(showType, cfg) {
  const key = String(showType || "").toUpperCase();
  if (key === "AI") return cfg.aiCph;
  if (key === "PGC") return cfg.pgcCph;
  return cfg.otherCph;
}
function payShowTypeLabel(showType) {
  const key = String(showType || "").trim().toUpperCase();
  if (key === "AI") return "AI";
  if (key === "PGC") return "PGC";
  if (key === "UGC") return "UGC";
  return key || "Other";
}
function payIpPublisher(ip) {
  return ip && (ip.publisher || ip.terms && ip.terms.publisher) || "Unknown publisher";
}
function payPublisherOptions(ips) {
  const map = {};
  (ips || []).forEach((ip) => {
    const label = payIpPublisher(ip);
    if (!map[label]) map[label] = { key: label, label, count: 0, search: label };
    map[label].count += 1;
  });
  return Object.values(map)
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((row) => Object.assign({}, row, { meta: row.count + " IP" + (row.count === 1 ? "" : "s") }));
}
function payIpOption(ip) {
  return {
    key: ip.key,
    label: ip.ipName || "Untitled IP",
    meta: ip.ipId || "",
    search: [ip.ipName, ip.ipId, ip.publisher].filter(Boolean).join(" ")
  };
}
function paySelectedTermChips(ip, cfg) {
  if (!ip) return [];
  const terms = ip.terms || {};
  const chips = [
    { text: "Rev share " + payPct(terms.revShare || 0) + " " + (terms.revShareBase || "Net") },
    { text: "MG " + payFmt(terms.advance || 0) + (terms.mgRecoupable === false ? " NR" : "") }
  ];
  if (terms.deductable != null && Math.abs(terms.deductable - 1) > 0.001) chips.push({ text: "Cost cap " + payPct(terms.deductable) });
  if (terms.prod) chips.push({ text: "Production recoup" });
  if (terms.dist) chips.push({ text: "Distribution " + payPct(cfg.distPct || 0) });
  if (terms.mkt) chips.push({ text: "Marketing recoup" });
  const seenTypes = {};
  (ip.showsList || []).forEach((show) => {
    const label = payShowTypeLabel(show.showType);
    if (!seenTypes[label]) {
      seenTypes[label] = true;
      chips.push({ text: label + " CPH " + payFmt(payShowTypeCph(label, cfg)) + "/hr" });
    }
  });
  if (terms.missing) chips.push({ text: "Missing Closed Deal terms", warn: true });
  return chips;
}
function PayComboSelect({ value, options, onChange, placeholder, emptyLabel }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = options.find((row) => row.key === value);
  const filtered = useMemo(() => {
    const s = payNormText(q);
    if (!s) return options;
    return options.filter((row) => payNormText([row.label, row.meta, row.search].filter(Boolean).join(" ")).includes(s));
  }, [options, q]);
  const shownValue = open ? q : (selected ? selected.label : "");
  return html`<div class="relative">
    <div class="relative">
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><${Icon} name="search" size=${14} /></span>
      <input value=${shownValue}
        onFocus=${() => { setOpen(true); setQ(""); }}
        onInput=${(e) => { setQ(e.target.value); setOpen(true); }}
        onBlur=${() => setTimeout(() => { setOpen(false); setQ(""); }, 120)}
        placeholder=${placeholder || "Search or select IP"}
        class="w-full rounded-lg border border-white/12 bg-ink-850 py-1 pl-8 pr-8 text-[12px] font-medium text-slate-100 outline-none placeholder:text-slate-500 focus:border-brand-500" />
      <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">\u25be</span>
    </div>
    ${open && html`<div class="absolute z-40 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-white/10 bg-ink-800 p-1 shadow-2xl">
      ${filtered.length ? filtered.map((option) => html`<button key=${option.key} type="button"
        onMouseDown=${(e) => e.preventDefault()}
        onClick=${() => { onChange(option.key); setOpen(false); setQ(""); }}
        class=${cx("flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] leading-snug transition hover:bg-brand-500/10", option.key === value ? "text-slate-100" : "text-slate-300")}>
        <span class="w-3 shrink-0 text-[11px] text-slate-300">${option.key === value ? "\u2713" : ""}</span>
        <span class="min-w-0 flex-1 truncate">${option.label}</span>
        ${option.meta && html`<span class="shrink-0 truncate text-[10px] text-slate-500">${option.meta}</span>`}
      </button>`) : html`<div class="px-3 py-2 text-[12px] text-slate-500">${emptyLabel || "No matching option"}</div>`}
    </div>`}
  </div>`;
}
function PayExportButton({ label, title, icon, onClick, disabled, primary }) {
  return html`<button
    type="button"
    title=${title}
    disabled=${disabled}
    onClick=${onClick}
    class=${cx(
      "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-35",
      primary
        ? "border-brand-500/45 bg-brand-500 text-white shadow-glow hover:bg-brand-400"
        : "border-white/10 bg-ink-850 text-slate-300 hover:border-brand-500/35 hover:text-brand-200"
    )}
  >
    <${Icon} name=${icon} size=${13} />
    <span>${label}</span>
  </button>`;
}
function PayQuarterExcelModal({ groups, quarter, cfg, onClose }) {
  const [query, setQuery] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(() => (groups || []).map((group) => group.key));
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys.join("|")]);
  const visibleGroups = useMemo(() => {
    const normalized = payNormText(query);
    if (!normalized) return groups || [];
    return (groups || []).filter((group) => payNormText(group.label).includes(normalized));
  }, [groups, query]);
  const selectedGroups = (groups || []).filter((group) => selectedSet.has(group.key));
  const toggle = (key) => setSelectedKeys((current) => current.includes(key) ? current.filter((value) => value !== key) : current.concat([key]));
  const download = async () => {
    setDownloading(true);
    const success = await payDownloadQuarterEntityWorkbook(selectedGroups, quarter, cfg);
    setDownloading(false);
    if (success) onClose();
  };
  const closeOnBackdrop = (event) => { if (event.target === event.currentTarget) onClose(); };
  return html`<div
    role="dialog"
    aria-modal="true"
    aria-label="Download quarterly Excel report"
    class="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/75 p-4 glass"
    onClick=${closeOnBackdrop}
  >
    <div class="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-pop fade-in">
      <div class="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
        <div>
          <h2 class="text-[17px] font-semibold tracking-tight text-slate-100">Download quarterly Excel</h2>
          <p class="mt-0.5 text-[11px] text-slate-500">Choose entities for ${quarter}. Each entity becomes a separate worksheet.</p>
        </div>
        <button type="button" title="Close" onClick=${onClose} class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"><${Icon} name="x" size=${16} /></button>
      </div>
      <div class="space-y-3 p-5">
        <div class="relative">
          <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><${Icon} name="search" size=${14} /></span>
          <input value=${query} onInput=${(event) => setQuery(event.target.value)} placeholder="Search entities" class="h-9 w-full rounded-lg border border-white/12 bg-ink-850 pl-9 pr-3 text-[12px] text-slate-100 outline-none placeholder:text-slate-500 focus:border-brand-500" />
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-[11px] text-slate-500">${selectedKeys.length} of ${(groups || []).length} selected</span>
          <div class="flex items-center gap-2">
            <button type="button" onClick=${() => setSelectedKeys((groups || []).map((group) => group.key))} class="text-[11px] font-semibold text-brand-300 transition hover:text-brand-200">Select all</button>
            <span class="text-slate-700">|</span>
            <button type="button" onClick=${() => setSelectedKeys([])} class="text-[11px] font-semibold text-slate-400 transition hover:text-slate-200">Clear</button>
          </div>
        </div>
        <div class="max-h-[360px] space-y-1 overflow-y-auto rounded-xl border border-white/[0.07] bg-black/[0.08] p-1.5">
          ${visibleGroups.length ? visibleGroups.map((group) => {
            const checked = selectedSet.has(group.key);
            return html`<label key=${group.key} class=${cx("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition", checked ? "border-brand-500/25 bg-brand-500/[0.07]" : "border-transparent hover:bg-white/[0.035]")}>
              <input type="checkbox" class="sr-only" checked=${checked} onChange=${() => toggle(group.key)} />
              <span class=${cx("flex h-5 w-5 shrink-0 items-center justify-center rounded border transition", checked ? "border-brand-400 bg-brand-500 text-white" : "border-white/15 bg-ink-850 text-transparent")}><${Icon} name="check" size=${12} /></span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[12px] font-semibold text-slate-200">${group.label}</span>
                <span class="mt-0.5 block text-[10px] text-slate-500">${group.ips.length} IP${group.ips.length === 1 ? "" : "s"} · one worksheet</span>
              </span>
              <span class="tnum shrink-0 text-[12px] font-semibold text-emerald-400">${payFmt(group.finalPayout)}</span>
            </label>`;
          }) : html`<div class="px-3 py-8 text-center text-[12px] text-slate-500">No matching entity</div>`}
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 border-t border-white/[0.07] px-5 py-4">
        <button type="button" onClick=${onClose} class="h-9 rounded-lg border border-white/10 px-4 text-[12px] font-semibold text-slate-300 transition hover:bg-white/5">Cancel</button>
        <button type="button" disabled=${!selectedGroups.length || downloading} onClick=${download} class="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-500 px-4 text-[12px] font-semibold text-white shadow-glow transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40">
          <${Icon} name="download" size=${14} />${downloading ? "Preparing workbook..." : selectedGroups.length ? "Download " + selectedGroups.length + " worksheet" + (selectedGroups.length === 1 ? "" : "s") : "Select entities"}
        </button>
      </div>
    </div>
  </div>`;
}
function PayInvoiceModal({ groups, quarter, onClose }) {
  const options = useMemo(() => (groups || []).map((group) => ({
    key: group.key,
    label: group.label,
    meta: group.ips.length + " IP" + (group.ips.length === 1 ? "" : "s"),
    search: group.label
  })), [groups]);
  const [entityKey, setEntityKey] = useState(() => options[0] && options[0].key || "");
  const selected = (groups || []).find((group) => group.key === entityKey) || groups[0];
  const closeOnBackdrop = (event) => { if (event.target === event.currentTarget) onClose(); };
  const download = () => {
    if (payDownloadInvoicePdf(selected, quarter)) onClose();
  };
  return html`<div
    role="dialog"
    aria-modal="true"
    aria-label="Generate quarterly invoice"
    class="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/75 p-4 glass"
    onClick=${closeOnBackdrop}
  >
    <div class="w-full max-w-2xl overflow-visible rounded-2xl border border-white/10 bg-ink-900 shadow-pop fade-in">
      <div class="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
        <div>
          <h2 class="text-[17px] font-semibold tracking-tight text-slate-100">Generate quarterly invoice</h2>
          <p class="mt-0.5 text-[11px] text-slate-500">One entity invoice for ${quarter}</p>
        </div>
        <button type="button" title="Close" onClick=${onClose} class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"><${Icon} name="x" size=${16} /></button>
      </div>
      <div class="space-y-4 p-5">
        <div>
          <label class="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Payment recipient / entity</label>
          <${PayComboSelect} value=${selected && selected.key || ""} options=${options} onChange=${setEntityKey} placeholder="Search or select entity" emptyLabel="No entity has payment data" />
        </div>
        ${selected && html`<div class="grid gap-2 sm:grid-cols-2">
          <div class="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-3">
            <div class="text-[9.5px] font-bold uppercase tracking-[0.08em] text-slate-500">Invoice scope</div>
            <div class="mt-1 text-sm font-semibold text-slate-100">${selected.ips.length} IP${selected.ips.length === 1 ? "" : "s"} · ${quarter}</div>
          </div>
          <div class="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] px-3.5 py-3">
            <div class="text-[9.5px] font-bold uppercase tracking-[0.08em] text-emerald-300/70">Final payout</div>
            <div class="mt-1 tnum text-lg font-semibold text-emerald-300">${payEuroAmount(selected.finalPayout)}</div>
          </div>
        </div>`}
        ${selected && html`<div class="max-h-44 overflow-y-auto rounded-xl border border-white/[0.07] bg-black/[0.08] p-2">
          ${selected.ips.map((entry) => html`<div key=${entry.ip.key} class="flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-[12px] odd:bg-white/[0.025]">
            <span class="min-w-0 truncate text-slate-300">${entry.ip.ipName || "Untitled IP"}</span>
            <span class="tnum shrink-0 font-semibold text-slate-100">${payEuroAmount(entry.finalPayout)}</span>
          </div>`)}
        </div>`}
        <div class="rounded-xl border border-amber-400/20 bg-amber-500/[0.05] px-3.5 py-2.5 text-[11px] leading-relaxed text-amber-100/80">
          Recipient address, tax information and bank details are not yet stored in the app, so the invoice marks them as “Not provided”. The Bill To address remains fixed from the supplied template.
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 border-t border-white/[0.07] px-5 py-4">
        <button type="button" onClick=${onClose} class="h-9 rounded-lg border border-white/10 px-4 text-[12px] font-semibold text-slate-300 transition hover:bg-white/5">Cancel</button>
        <button type="button" disabled=${!selected} onClick=${download} class="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-500 px-4 text-[12px] font-semibold text-white shadow-glow transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40">
          <${Icon} name="download" size=${14} />Download PDF
        </button>
      </div>
    </div>
  </div>`;
}
function payBuildModel(mappingRows, dumpRows, closedDeals, cfg) {
  const warnings = [];
  const closedTerms = payTermRecordsFromClosedDeals(closedDeals);
  const indexedTerms = payIndexTerms(closedTerms);
  const dumpByShow = {};
  dumpRows.forEach((r) => { (dumpByShow[r.showId] || (dumpByShow[r.showId] = [])).push(r); });

  mappingRows.forEach((m) => {
    if (!m.ipId) warnings.push({ type: "Mapping", text: "Row " + m.rowNum + " is missing IP ID." });
    if (!m.showId) warnings.push({ type: "Mapping", text: "Row " + m.rowNum + " is missing Show ID." });
    if (m.showId && !dumpByShow[m.showId]) warnings.push({ type: "Join", text: "Show ID " + m.showId + " from mapping file has no performance rows." });
  });

  const showIdsInMapping = {};
  mappingRows.forEach((m) => { if (m.showId) showIdsInMapping[m.showId] = true; });
  dumpRows.forEach((r) => { if (!showIdsInMapping[r.showId]) warnings.push({ type: "Join", text: "Performance row " + r.rowNum + " has Show ID " + r.showId + " with no mapping row." }); });

  const rawRows = [];
  mappingRows.forEach((mapping) => {
    const perfRows = dumpByShow[mapping.showId] || [];
    const terms = payFindTerms(mapping, indexedTerms) || payEmptyTerms(mapping);
    const mismatchWarning = payTermMismatchWarning(mapping, terms);
    if (mismatchWarning) warnings.push(mismatchWarning);
    if (terms.source === "Demo fallback") warnings.push({ type: "Terms", text: mapping.ipName + " is using demo fallback commercial terms because no Closed Deal matched." });
    if (terms.missing) warnings.push({ type: "Terms", text: mapping.ipName || mapping.ipId || "Unknown IP" + " has no matching Closed Deal terms." });
    perfRows.forEach((perf) => {
      rawRows.push({ mapping, perf, terms });
    });
  });

  const ipBuckets = {};
  rawRows.forEach((r) => {
    const map = r.mapping, terms = r.terms, perf = r.perf;
    const canonicalIpId = payCanonicalIpId(map, terms);
    const canonicalIpName = payCanonicalIpName(map, terms);
    const ipKey = payIsClosedTerm(terms)
      ? (terms.dealId || "") + "|" + (canonicalIpId || canonicalIpName)
      : (canonicalIpId || canonicalIpName) + "|" + payNormText(canonicalIpName);
    const bucket = ipBuckets[ipKey] || (ipBuckets[ipKey] = {
      key: ipKey,
      ipId: canonicalIpId,
      ipName: canonicalIpName,
      publisher: terms.publisher || "\u2014",
      terms,
      termSource: terms.source,
      shows: {},
      periods: {}
    });
    bucket.shows[map.showId] = {
      showId: map.showId,
      showName: map.showName || perf.showName,
      showType: map.showType || "UNKNOWN"
    };
    const pkey = perf.period.key;
    const period = bucket.periods[pkey] || (bucket.periods[pkey] = {
      key: pkey,
      label: perf.period.label,
      quarter: perf.period.quarter,
      quarterSort: perf.period.quarterSort,
      sort: perf.period.sort,
      rev: 0,
      scaling: 0,
      testing: 0,
      hrs: 0,
      productionCost: 0
    });
    const cph = payShowTypeCph(map.showType, cfg);
    period.rev += perf.revenue;
    period.scaling += perf.scaling;
    period.testing += perf.testing;
    period.hrs += perf.finalMasterHrs;
    period.productionCost += perf.finalMasterHrs * cph;
  });

  const ips = Object.values(ipBuckets).map((ip) => {
    const periods = Object.values(ip.periods).sort(paySortPeriods);
    const rows = payRunSeries(ip.terms, periods, cfg);
    return Object.assign({}, ip, {
      periods,
      rows,
      showsList: Object.values(ip.shows),
      totals: rows.reduce((acc, row) => {
        ["gross", "production", "marketing", "revShare", "advRecoup", "finalPayout", "advPending"].forEach((k) => { acc[k] = (acc[k] || 0) + (row[k] || 0); });
        acc.advPending = row.advPending || 0;
        return acc;
      }, {})
    });
  }).sort((a, b) => String(a.ipName).localeCompare(String(b.ipName)));

  const quarterKeys = {};
  ips.forEach((ip) => ip.rows.forEach((r) => {
    if (!quarterKeys[r.quarter]) quarterKeys[r.quarter] = { label: r.quarter, sort: r.quarterSort || 0 };
  }));
  return {
    closedTerms,
    rawRows,
    ips,
    quarters: Object.values(quarterKeys).sort((a, b) => a.sort - b.sort).map((q) => q.label),
    warnings: payUniqueWarnings(warnings)
  };
}
function payUniqueWarnings(warnings) {
  const seen = {};
  return warnings.filter((w) => {
    const key = w.type + "|" + w.text;
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}
function payRunSeries(meta, periods, cfg) {
  let dedCarry = 0;
  let advOut = 0;
  const injIdx = Math.max(0, periods.findIndex((p) => meta.mgPaidOnKey && p.key >= meta.mgPaidOnKey));
  return periods.map((inp, i) => {
    if (i === injIdx) advOut += meta.mgRecoupable === false ? 0 : (meta.advance || 0);
    const vat = inp.rev * cfg.vat;
    const distribution = meta.dist ? inp.rev * cfg.distPct : 0;
    const grossExVatDist = inp.rev - vat - distribution;
    const deductableRev = grossExVatDist * (meta.deductable == null ? 1 : meta.deductable);
    const passOn = grossExVatDist - deductableRev;
    const production = meta.prod ? inp.productionCost : 0;
    const internalAlloc = meta.mkt ? inp.scaling * window.PAY_INTERNAL_ALLOC : 0;
    const marketing = meta.mkt ? (inp.scaling + inp.testing + internalAlloc) : 0;
    const totalDeductCurrent = production + marketing;
    const netApplic = dedCarry + totalDeductCurrent;
    const recouped = Math.min(deductableRev, netApplic);
    const carryFwd = netApplic - recouped;
    dedCarry = carryFwd;
    const netRevForShare = grossExVatDist - recouped;
    const revBase = String(meta.revShareBase || "Net").toLowerCase() === "gross" ? grossExVatDist : netRevForShare;
    const revShare = revBase * (meta.revShare || 0);
    const advRecoup = Math.min(advOut, revShare);
    advOut -= advRecoup;
    return {
      period: inp.label,
      periodKey: inp.key,
      quarter: inp.quarter,
      quarterSort: inp.quarterSort,
      gross: inp.rev,
      vat,
      distribution,
      grossExVatDist,
      passOn,
      deductableRev,
      production,
      marketing,
      internalAlloc,
      totalDeductCurrent,
      netApplic,
      recouped,
      carryFwd,
      netRevForShare,
      revShare,
      advRecoup,
      advPending: advOut,
      finalPayout: revShare - advRecoup,
      hrs: inp.hrs,
      scaling: inp.scaling,
      testing: inp.testing
    };
  });
}
function payQuarterRows(model, quarter) {
  return model.ips.map((ip) => {
    const rows = ip.rows.filter((r) => r.quarter === quarter);
    const sum = (k) => rows.reduce((acc, row) => acc + (row[k] || 0), 0);
    if (!rows.length) return null;
    const first = rows[0];
    const last = rows[rows.length - 1];
    const openingCarry = Math.max(0, (first.netApplic || 0) - (first.totalDeductCurrent || 0));
    return {
      ip,
      rows,
      gross: sum("gross"),
      vat: sum("vat"),
      distribution: sum("distribution"),
      grossExVatDist: sum("grossExVatDist"),
      hrs: sum("hrs"),
      production: sum("production"),
      scaling: sum("scaling"),
      testing: sum("testing"),
      internalAlloc: sum("internalAlloc"),
      marketing: sum("marketing"),
      totalDeductCurrent: sum("totalDeductCurrent"),
      netApplic: openingCarry + sum("totalDeductCurrent"),
      recouped: sum("recouped"),
      carryFwd: last.carryFwd || 0,
      netRevForShare: sum("netRevForShare"),
      revShare: sum("revShare"),
      advRecoup: sum("advRecoup"),
      advPending: last.advPending || 0,
      finalPayout: sum("finalPayout")
    };
  }).filter(Boolean);
}
function payQuarterEntityGroups(model, quarter) {
  const groups = {};
  payQuarterRows(model, quarter).forEach((entry) => {
    const label = payIpPublisher(entry.ip);
    const group = groups[label] || (groups[label] = { key: label, label, ips: [], finalPayout: 0 });
    group.ips.push(entry);
    group.finalPayout += entry.finalPayout || 0;
  });
  return Object.values(groups).sort((a, b) => a.label.localeCompare(b.label));
}

/* ----------------------------- report + invoice downloads ----------------------------- */
function paySafeFilePart(value) {
  return String(value || "report")
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "report";
}
function payMonthlyReportPeriods(ips) {
  const byKey = {};
  (ips || []).forEach((ip) => (ip.rows || []).forEach((row) => {
    if (!byKey[row.periodKey]) byKey[row.periodKey] = {
      key: row.periodKey,
      label: row.period,
      sort: payPeriodInfo(row.periodKey).sort
    };
  }));
  return Object.values(byKey).sort((a, b) => a.sort - b.sort);
}
function payReportAmount(value, opts) {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  if (!isFinite(numeric)) return null;
  return opts && opts.neg ? -Math.abs(numeric) : numeric;
}
function payReportTermLine(ip, cfg) {
  return paySelectedTermChips(ip, cfg).map((chip) => chip.text).join(" | ");
}
function payAppendReportIp(rows, ip, columns, valueFor, cfg, hierarchy) {
  const ipLevel = hierarchy.ipLevel || 0;
  const detailLevel = ipLevel + 1;
  const childLevel = detailLevel + 1;
  rows.push({
    kind: "ip",
    label: "IP - " + (ip.ipName || "Untitled IP") + (ip.ipId ? " (" + ip.ipId + ")" : ""),
    values: columns.map((column) => payReportAmount(valueFor(column, "finalPayout"))),
    format: "currency",
    semantic: "ip-payout",
    indent: 1,
    level: ipLevel,
    hidden: !!hierarchy.ipHidden
  });
  rows.push({
    kind: "terms",
    label: "Terms - " + payReportTermLine(ip, cfg),
    values: columns.map(() => null),
    indent: 2,
    level: detailLevel,
    hidden: true
  });
  payBreakdownGroups(ip).forEach((group) => {
    rows.push({
      kind: "group",
      label: group.label,
      values: columns.map((column) => payReportAmount(valueFor(column, group.key), group.opts)),
      format: group.opts && group.opts.hours ? "number" : "currency",
      semantic: group.id,
      negative: !!(group.opts && group.opts.neg),
      indent: 2,
      level: detailLevel,
      hidden: true
    });
    group.children.forEach((child) => rows.push({
      kind: "component",
      label: child.label,
      values: columns.map((column) => payReportAmount(valueFor(column, child.key), child.opts)),
      format: child.opts && child.opts.hours ? "number" : "currency",
      semantic: group.id + ":" + child.key,
      parent: group.id,
      negative: !!(child.opts && child.opts.neg),
      indent: 3,
      level: childLevel,
      hidden: true
    }));
  });
}
function payBuildReport(view, model, entity, quarter, cfg) {
  const rows = [];
  if (view === "month") {
    const ips = (model.ips || []).filter((ip) => !entity || payIpPublisher(ip) === entity);
    const columns = payMonthlyReportPeriods(ips);
    rows.push({ kind: "entity", label: "ENTITY - " + (entity || "All entities"), values: columns.map(() => null), indent: 0, level: 0, hidden: false });
    ips.forEach((ip) => {
      const byPeriod = {};
      (ip.rows || []).forEach((row) => { byPeriod[row.periodKey] = row; });
      payAppendReportIp(rows, ip, columns, (column, key) => byPeriod[column.key] && byPeriod[column.key][key], cfg, { ipLevel: 0, ipHidden: false });
      rows.push({ kind: "blank", label: "", values: columns.map(() => null), level: 0, hidden: false });
    });
    return {
      view,
      title: "Monthly payment calculation - " + (entity || "All entities"),
      subtitle: "Entity > IP > calculation group > component. Expand Excel row groups to inspect detail.",
      columns,
      rows,
      filename: "payment-report-mom-" + paySafeFilePart(entity || "all-entities")
    };
  }

  const columns = [{ key: quarter, label: quarter || "Quarter" }];
  payQuarterEntityGroups(model, quarter).forEach((group) => {
    rows.push({
      kind: "entity",
      label: "ENTITY - " + group.label,
      values: [group.finalPayout || 0],
      format: "currency",
      semantic: "entity-payout",
      indent: 0,
      level: 0,
      hidden: false
    });
    group.ips.forEach((entry, index) => {
      if (index) rows.push({ kind: "blank", label: "", values: [null], level: 1, hidden: true });
      payAppendReportIp(
        rows,
        entry.ip,
        columns,
        (column, key) => entry[key],
        cfg,
        { ipLevel: 1, ipHidden: true }
      );
    });
    rows.push({ kind: "blank", label: "", values: [null], level: 0, hidden: false });
  });
  return {
    view,
    title: "Quarterly payment calculation - " + (quarter || "Quarter"),
    subtitle: "Entity > IP > calculation group > component. Expand Excel row groups to inspect detail.",
    columns,
    rows,
    filename: "payment-report-quarterly-" + paySafeFilePart(quarter || "quarter")
  };
}
function payBuildQuarterEntityReport(group, quarter, cfg) {
  const columns = [{ key: quarter, label: quarter || "Quarter" }];
  const rows = [{
    kind: "entity",
    label: "ENTITY - " + group.label,
    values: [group.finalPayout || 0],
    format: "currency",
    semantic: "entity-payout",
    indent: 0,
    level: 0,
    hidden: false
  }];
  group.ips.forEach((entry, index) => {
    if (index) rows.push({ kind: "blank", label: "", values: [null], level: 1, hidden: true });
    payAppendReportIp(
      rows,
      entry.ip,
      columns,
      (column, key) => entry[key],
      cfg,
      { ipLevel: 1, ipHidden: true }
    );
  });
  return {
    view: "quarter",
    title: "Quarterly payment calculation - " + group.label + " - " + (quarter || "Quarter"),
    subtitle: "Entity > IP > calculation group > component. Expand Excel row groups to inspect detail.",
    columns,
    rows,
    filename: "payment-report-quarterly-" + paySafeFilePart(quarter || "quarter") + "-" + paySafeFilePart(group.label)
  };
}
function payExcelFill(argb) {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}
function payExcelBorder(color, style) {
  return { bottom: { style: style || "hair", color: { argb: color || "FFE5E7EB" } } };
}
function payAddStyledReportWorksheet(workbook, report, sheetName) {
  if (!window.ExcelJS) throw new Error("Styled Excel export library is not loaded. Refresh the page and try again.");
  const columnCount = report.columns.length + 1;
  const maxOutline = report.rows.reduce((max, row) => Math.max(max, row.level || 0), 0);
  const worksheet = workbook.addWorksheet(sheetName, {
    properties: { tabColor: { argb: "FFE73F66" }, outlineLevelRow: maxOutline, defaultRowHeight: 20 },
    views: [{ state: "frozen", xSplit: 1, ySplit: 4, showGridLines: false, activeCell: "B5" }],
    pageSetup: { paperSize: 9, orientation: report.columns.length > 4 ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });
  worksheet.properties.outlineLevelRow = maxOutline;
  worksheet.properties.outlineProperties = { summaryBelow: false, summaryRight: false };
  worksheet.getColumn(1).width = 64;
  report.columns.forEach((column, index) => { worksheet.getColumn(index + 2).width = 16; });

  worksheet.mergeCells(1, 1, 1, columnCount);
  const titleRow = worksheet.getRow(1);
  titleRow.height = 31;
  const titleCell = titleRow.getCell(1);
  titleCell.value = report.title;
  titleCell.fill = payExcelFill("FFE73F66");
  titleCell.font = { name: "Aptos Display", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };

  worksheet.mergeCells(2, 1, 2, columnCount);
  const subtitleRow = worksheet.getRow(2);
  subtitleRow.height = 23;
  const subtitleCell = subtitleRow.getCell(1);
  subtitleCell.value = report.subtitle;
  subtitleCell.font = { name: "Aptos", size: 10, italic: true, color: { argb: "FF6B7280" } };
  subtitleCell.alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getRow(3).height = 8;

  const headerRow = worksheet.getRow(4);
  headerRow.values = ["Hierarchy / calculation component"].concat(report.columns.map((column) => column.label));
  headerRow.height = 24;
  for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
    const cell = headerRow.getCell(columnIndex);
    cell.fill = payExcelFill("FF2D313D");
    cell.font = { name: "Aptos", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: columnIndex === 1 ? "left" : "right" };
    cell.border = payExcelBorder("FF1F2937", "thin");
  }

  report.rows.forEach((meta, rowIndex) => {
    const row = worksheet.getRow(rowIndex + 5);
    row.values = [meta.label].concat(meta.values);
    row.outlineLevel = Math.min(7, meta.level || 0);
    row.hidden = !!meta.hidden;
    row.height = meta.kind === "blank" ? 15 : meta.kind === "terms" ? 30 : meta.kind === "entity" ? 23 : 21;
    for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
      const cell = row.getCell(columnIndex);
      const isNumber = columnIndex > 1 && typeof cell.value === "number";
      cell.font = { name: "Aptos", size: meta.kind === "terms" ? 9.5 : 10.5, color: { argb: "FF303642" } };
      cell.alignment = {
        vertical: "middle",
        horizontal: columnIndex === 1 ? "left" : "right",
        indent: columnIndex === 1 ? (meta.indent || 0) : 0,
        wrapText: meta.kind === "terms"
      };
      if (meta.kind !== "blank") cell.border = payExcelBorder("FFE5E7EB");
      if (isNumber) cell.numFmt = meta.format === "number" ? "#,##0.00" : "$#,##0;[Red]($#,##0);-";
    }

    if (meta.kind === "entity") {
      for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) row.getCell(columnIndex).fill = payExcelFill("FFFFE8EF");
      row.font = { name: "Aptos", size: 11.5, bold: true, color: { argb: "FF3A2430" } };
      for (let columnIndex = 2; columnIndex <= columnCount; columnIndex += 1) {
        if (typeof row.getCell(columnIndex).value === "number") row.getCell(columnIndex).font = { name: "Aptos", size: 11.5, bold: true, color: { argb: "FF16805A" } };
      }
    } else if (meta.kind === "ip") {
      for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) row.getCell(columnIndex).fill = payExcelFill("FFF3F4F7");
      row.font = { name: "Aptos", size: 10.5, bold: true, color: { argb: "FF27303D" } };
      for (let columnIndex = 2; columnIndex <= columnCount; columnIndex += 1) {
        if (typeof row.getCell(columnIndex).value === "number") row.getCell(columnIndex).font = { name: "Aptos", size: 10.5, bold: true, color: { argb: "FF16805A" } };
      }
    } else if (meta.kind === "terms") {
      row.font = { name: "Aptos", size: 9.5, italic: true, color: { argb: "FF6B7280" } };
    } else if (meta.kind === "group") {
      for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) row.getCell(columnIndex).fill = payExcelFill(meta.semantic === "payout" ? "FFE8F7EF" : "FFF8F9FB");
      row.font = { name: "Aptos", size: 10.5, bold: true, color: { argb: meta.semantic === "payout" ? "FF16805A" : "FF27303D" } };
    }
    if (meta.negative) {
      for (let columnIndex = 2; columnIndex <= columnCount; columnIndex += 1) {
        if (typeof row.getCell(columnIndex).value === "number") row.getCell(columnIndex).font = { name: "Aptos", size: 10.5, color: { argb: "FFD92D4B" } };
      }
    }
  });
  return worksheet;
}
async function paySaveExcelWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function payExcelSheetName(value, used) {
  const cleaned = String(value || "Entity").replace(/[\\/?*\[\]:]/g, " ").replace(/\s+/g, " ").trim() || "Entity";
  let suffix = "";
  let index = 1;
  let candidate = cleaned.slice(0, 31);
  while (used[candidate.toLowerCase()]) {
    index += 1;
    suffix = " (" + index + ")";
    candidate = cleaned.slice(0, 31 - suffix.length) + suffix;
  }
  used[candidate.toLowerCase()] = true;
  return candidate;
}
async function payDownloadMonthlyReport(model, entity, cfg) {
  try {
    const report = payBuildReport("month", model, entity, "", cfg);
    if (!report.rows.some((row) => row.kind === "ip")) throw new Error("There is no payment data to export for this selection.");
    if (!window.ExcelJS) throw new Error("Styled Excel export library is not loaded. Refresh the page and try again.");
    const workbook = new window.ExcelJS.Workbook();
    workbook.creator = "Pocket FM Deal Tracker";
    workbook.company = "Pocket FM";
    workbook.created = new Date();
    payAddStyledReportWorksheet(workbook, report, "Monthly report");
    await paySaveExcelWorkbook(workbook, report.filename + ".xlsx");
    return true;
  } catch (error) {
    alert(error && error.message || String(error));
    return false;
  }
}
async function payDownloadQuarterEntityWorkbook(groups, quarter, cfg) {
  try {
    if (!groups || !groups.length) throw new Error("Select at least one entity to include in the Excel report.");
    if (!window.ExcelJS) throw new Error("Styled Excel export library is not loaded. Refresh the page and try again.");
    const workbook = new window.ExcelJS.Workbook();
    workbook.creator = "Pocket FM Deal Tracker";
    workbook.company = "Pocket FM";
    workbook.created = new Date();
    const usedSheetNames = {};
    groups.forEach((group) => {
      const report = payBuildQuarterEntityReport(group, quarter, cfg);
      payAddStyledReportWorksheet(workbook, report, payExcelSheetName(group.label, usedSheetNames));
    });
    const scope = groups.length === 1 ? paySafeFilePart(groups[0].label) : groups.length + "-entities";
    await paySaveExcelWorkbook(workbook, "payment-report-quarterly-" + paySafeFilePart(quarter || "quarter") + "-" + scope + ".xlsx");
    return true;
  } catch (error) {
    alert(error && error.message || String(error));
    return false;
  }
}
function payRandomInvoiceToken() {
  if (window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint32Array(1);
    window.crypto.getRandomValues(bytes);
    return bytes[0].toString(36).toUpperCase().padStart(6, "0").slice(-6);
  }
  return Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "0");
}
function payBuildInvoiceModel(group, quarter, now, token) {
  const date = now instanceof Date ? now : new Date();
  const dateKey = date.getFullYear() + String(date.getMonth() + 1).padStart(2, "0") + String(date.getDate()).padStart(2, "0");
  const lineItems = (group && group.ips || []).map((entry) => ({
    ipName: entry.ip.ipName || "Untitled IP",
    description: "Quarterly payment for " + quarter,
    amount: entry.finalPayout || 0
  }));
  return {
    invoiceNumber: "EU-" + dateKey + "-" + (token || payRandomInvoiceToken()) + " (42069 IQ)",
    invoiceDate: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    entity: group && group.label || "Payment recipient",
    quarter,
    lineItems,
    total: lineItems.reduce((sum, item) => sum + item.amount, 0)
  };
}
function payEuroAmount(value) {
  return "EUR " + Number(value || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function payInvoiceLogoDataUrl(image) {
  if (!image || !image.complete || !image.naturalWidth || !image.naturalHeight) return "";
  const maxWidth = 1200;
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}
function payDownloadInvoicePdf(group, quarter) {
  try {
    if (!group || !group.ips || !group.ips.length) throw new Error("Select an entity with quarterly payment data first.");
    const JsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JsPDF) throw new Error("Invoice PDF library is not loaded. Refresh the page and try again.");
    const invoice = payBuildInvoiceModel(group, quarter);
    const doc = new JsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    const brand = [231, 65, 102];
    const charcoal = [52, 55, 65];
    doc.setProperties({ title: "Invoice " + invoice.invoiceNumber, subject: invoice.quarter + " payment invoice", author: "Pocket FM Deal Tracker" });

    doc.setFillColor(brand[0], brand[1], brand[2]);
    doc.roundedRect(margin, 14, contentWidth, 29, 2, 2, "F");
    const invoiceLogo = document.getElementById("pfm-invoice-logo");
    try {
      const invoiceLogoData = window.PFM_INVOICE_LOGO_DATA_URI || payInvoiceLogoDataUrl(invoiceLogo);
      if (invoiceLogoData) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin + 6, 17, 50, 14, 1.5, 1.5, "F");
        doc.addImage(invoiceLogoData, "PNG", margin + 8, 19, 46, 10.5, "pfm-logo", "FAST");
      }
    } catch (logoError) {
      console.warn("Pocket FM invoice logo could not be embedded.", logoError);
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18.5);
    doc.text("INVOICE", margin + 7, 39);
    doc.setFontSize(8.5);
    doc.text("Invoice Number", pageWidth - margin - 70, 23);
    doc.text("Date", pageWidth - margin - 70, 32);
    doc.setFontSize(7.5);
    const invoiceSuffix = " (42069 IQ)";
    const invoiceBase = invoice.invoiceNumber.slice(0, -invoiceSuffix.length);
    doc.setFont("helvetica", "normal");
    const invoiceBaseWidth = doc.getTextWidth(invoiceBase);
    doc.setFont("helvetica", "bold");
    const invoiceSuffixWidth = doc.getTextWidth(invoiceSuffix);
    const invoiceNumberX = pageWidth - margin - 6 - invoiceBaseWidth - invoiceSuffixWidth;
    doc.setFont("helvetica", "normal");
    doc.text(invoiceBase, invoiceNumberX, 23);
    doc.setFont("helvetica", "bold");
    doc.text(invoiceSuffix, invoiceNumberX + invoiceBaseWidth, 23);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(invoice.invoiceDate, pageWidth - margin - 6, 32, { align: "right" });

    const blockTop = 51;
    const gap = 4;
    const blockWidth = (contentWidth - gap) / 2;
    doc.setFillColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.rect(margin, blockTop, blockWidth, 8, "F");
    doc.rect(margin + blockWidth + gap, blockTop, blockWidth, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("BILL TO", margin + 4, blockTop + 5.5);
    doc.text("PAYMENT RECIPIENT", margin + blockWidth + gap + 4, blockTop + 5.5);
    doc.setTextColor(35, 38, 46);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.2);
    doc.text([
      "Pocket Entertainment Services LLC",
      "13 W Main Street, PO Box 953",
      "Felton, Delaware 19943",
      "Country of Kent"
    ], margin + 4, blockTop + 14, { lineHeightFactor: 1.45 });
    doc.setFont("helvetica", "bold");
    doc.text(doc.splitTextToSize(invoice.entity, blockWidth - 8), margin + blockWidth + gap + 4, blockTop + 14);
    doc.setFont("helvetica", "normal");
    doc.text("Recipient address and tax details: Not provided", margin + blockWidth + gap + 4, blockTop + 25);

    const tableOptions = {
      startY: 84,
      margin: { left: margin, right: margin },
      theme: "grid",
      head: [["IP Name", "Description of Service", "Amount (EUR)"]],
      body: invoice.lineItems.map((item) => [item.ipName, item.description, payEuroAmount(item.amount)]),
      foot: [["", "TOTAL (in Euros)", payEuroAmount(invoice.total)]],
      styles: { font: "helvetica", fontSize: 9, cellPadding: 3.5, lineColor: [218, 220, 226], lineWidth: 0.25, textColor: [40, 42, 50] },
      headStyles: { fillColor: charcoal, textColor: [255, 255, 255], fontStyle: "bold" },
      footStyles: { fillColor: [244, 244, 246], textColor: [35, 38, 46], fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 58 }, 1: { cellWidth: 84 }, 2: { cellWidth: 40, halign: "right" } }
    };
    if (typeof doc.autoTable === "function") doc.autoTable(tableOptions);
    else if (window.jspdfAutoTable && typeof window.jspdfAutoTable.autoTable === "function") window.jspdfAutoTable.autoTable(doc, tableOptions);
    else throw new Error("Invoice table library is not loaded. Refresh the page and try again.");

    let y = doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY + 8 : 130;
    if (y > pageHeight - 69) { doc.addPage(); y = 20; }
    doc.setTextColor(85, 88, 98);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.text("*Service not subject to domestic taxes", margin, y);
    y += 10;
    doc.setFillColor(charcoal[0], charcoal[1], charcoal[2]);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("BANK DETAILS", margin + 4, y + 5.5);
    y += 14;
    doc.setTextColor(40, 42, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.2);
    [
      "Account Holder Name as Per Bank: Not provided",
      "Bank Name: Not provided",
      "IBAN: Not provided",
      "BIC/SWIFT: Not provided"
    ].forEach((line, index) => doc.text(line, margin + 4, y + index * 6));
    y += 35;
    doc.setDrawColor(120, 123, 132);
    doc.line(margin, y, margin + 62, y);
    doc.setFontSize(8.5);
    doc.setTextColor(85, 88, 98);
    doc.text("Signature of recipient", margin, y + 5);
    doc.setFontSize(8);
    doc.text("Generated by Pocket FM Deal Tracker", pageWidth - margin, pageHeight - 8, { align: "right" });
    doc.save("invoice-" + paySafeFilePart(invoice.entity) + "-" + paySafeFilePart(invoice.quarter) + "-" + paySafeFilePart(invoice.invoiceNumber) + ".pdf");
    return invoice;
  } catch (error) {
    alert(error && error.message || String(error));
    return null;
  }
}

window.PFM_PAYMENTS_DEBUG = {
  csvRows: payCsvRows,
  normalizeMapping: payNormalizeMapping,
  normalizeDump: payNormalizeDump,
  buildModel: payBuildModel,
  buildReport: payBuildReport,
  buildQuarterEntityReport: payBuildQuarterEntityReport,
  buildInvoiceModel: payBuildInvoiceModel
};

/* ----------------------------- Payments Calculation view ----------------------------- */
function PaymentsView({ deals }) {
  const [mappingFile, setMappingFile] = useState(() => payInitialUpload("mapping"));
  const [dumpFile, setDumpFile] = useState(() => payInitialUpload("dump"));
  const [view, setView] = useState("month");
  const [selectedPublisherKey, setSelectedPublisherKey] = useState("");
  const [quarter, setQuarter] = useState("");
  const [quarterExcelOpen, setQuarterExcelOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const cfg = {
    vat: window.PAY_FIXED_RATES.vat,
    distPct: window.PAY_FIXED_RATES.distPct,
    aiCph: window.PAY_FIXED_RATES.aiCph,
    pgcCph: window.PAY_FIXED_RATES.pgcCph,
    otherCph: window.PAY_FIXED_RATES.otherCph
  };
  const mappingRows = useMemo(() => payNormalizeMapping(mappingFile.rows), [mappingFile.rows]);
  const dumpRows = useMemo(() => payNormalizeDump(dumpFile.rows), [dumpFile.rows]);
  const model = useMemo(() => payBuildModel(mappingRows, dumpRows, deals || [], cfg), [mappingRows, dumpRows, deals]);
  const publisherOptions = useMemo(() => payPublisherOptions(model.ips), [model.ips]);
  const publisherKeys = publisherOptions.map((row) => row.key).join("|");
  const filteredIps = useMemo(() => {
    if (!selectedPublisherKey) return model.ips;
    return model.ips.filter((ip) => payIpPublisher(ip) === selectedPublisherKey);
  }, [model.ips, selectedPublisherKey]);
  const quarterEntityGroups = useMemo(() => payQuarterEntityGroups(model, quarter), [model, quarter]);
  const quarterOptions = useMemo(() => model.quarters.map((q) => ({ key: q, label: q, search: q })), [model.quarters.join("|")]);
  useEffect(() => {
    if (!publisherOptions.length && selectedPublisherKey) setSelectedPublisherKey("");
    if (publisherOptions.length && (!selectedPublisherKey || !publisherOptions.some((row) => row.key === selectedPublisherKey))) setSelectedPublisherKey(publisherOptions[0].key);
  }, [publisherKeys, selectedPublisherKey]);
  useEffect(() => {
    if (!quarter && model.quarters.length) setQuarter(model.quarters[model.quarters.length - 1]);
    if (quarter && model.quarters.length && !model.quarters.includes(quarter)) setQuarter(model.quarters[model.quarters.length - 1]);
    if (!model.quarters.length) setQuarter("");
  }, [model.quarters.join("|"), quarter]);

  const hasUploads = mappingRows.length > 0 || dumpRows.length > 0;
  const ready = mappingRows.length > 0 && dumpRows.length > 0;
  const Toggle = (id, label) => html`<button onClick=${() => setView(id)}
    class=${cx("rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all", view === id ? "bg-brand-500 text-white shadow-glow" : "text-slate-300 hover:text-white")}>${label}</button>`;
  return html`<div class="fade-in flex h-full min-h-0 flex-col overflow-hidden">
    <div class="shrink-0 border-b border-white/[0.08] bg-ink-950/95 px-6 py-2">
      <h1 class="h-grad text-[18px] font-semibold tracking-tight">Payments Calculation</h1>
      <p class="mt-0.5 hidden text-[11px] text-slate-400 sm:block">Upload show mapping and monthly performance, then calculate payouts from Closed Deal terms</p>
    </div>
    <div class="flex min-h-0 flex-1 flex-col px-6 py-2">
      <div class="grid shrink-0 grid-cols-2 gap-2">
        <${PayUploadCard}
          title="1. Upload IP ID x Show ID x Show Type"
          hint="Expected: IP ID, IP Name, Show ID, Show Name, Show Type"
          state=${mappingFile}
          onFile=${async (file) => setMappingFile(payStoreUpload("mapping", await payHandleFile(file)))}
          onClear=${() => setMappingFile(payStoreUpload("mapping", payEmptyUploadState()))}
        />
        <${PayUploadCard}
          title="2. Upload Data Dump for Payment Calculations"
          hint="Expected: show_id, period, revenue, scaling_spends, testing_spends. Final mastered hrs uses column J."
          state=${dumpFile}
          onFile=${async (file) => setDumpFile(payStoreUpload("dump", await payHandleFile(file)))}
          onClear=${() => setDumpFile(payStoreUpload("dump", payEmptyUploadState()))}
        />
      </div>

      ${window.PAY_SHOW_VALIDATION_WARNINGS && hasUploads && html`<${PayWarnings} warnings=${model.warnings} />`}

      <div class="mt-2 shrink-0 rounded-xl border border-white/[0.08] surface p-2 shadow-card">
        <div class="flex flex-wrap items-end gap-3">
          <div class="inline-flex shrink-0 self-end rounded-xl border border-white/[0.08] bg-ink-850 p-1">
            ${Toggle("month", "Monthly (MoM)")}${Toggle("quarter", "Quarterly")}
          </div>
          ${view === "month" ? html`
            <div class="min-w-[220px] flex-[1_1_300px] max-w-[420px]">
              <label class="mb-0.5 hidden text-[9.5px] font-bold uppercase tracking-wide text-slate-300 xl:block">Entity</label>
              <${PayComboSelect} value=${selectedPublisherKey} options=${publisherOptions} onChange=${setSelectedPublisherKey} placeholder="Search or select entity" emptyLabel="No matching entity" />
            </div>
          ` : html`
            <div class="min-w-[140px] max-w-[260px] flex-1">
              <label class="mb-0.5 hidden text-[9.5px] font-bold uppercase tracking-wide text-slate-300 xl:block">Quarter</label>
              <${PayComboSelect} value=${quarter} options=${quarterOptions} onChange=${setQuarter} placeholder="Search or select quarter" emptyLabel="No matching quarter" />
            </div>
          `}
          <div class="ml-auto flex shrink-0 items-center gap-1.5">
            <${PayExportButton}
              label="Excel"
              title=${view === "month" ? "Download this entity as a grouped monthly Excel report" : "Choose one or more entities for a multi-sheet quarterly Excel report"}
              icon="download"
              disabled=${!ready || (view === "quarter" && !quarterEntityGroups.length)}
              onClick=${() => view === "month" ? payDownloadMonthlyReport(model, selectedPublisherKey, cfg) : setQuarterExcelOpen(true)}
            />
            ${view === "quarter" && html`<${PayExportButton}
              label="Invoice"
              title="Generate a quarterly invoice for one entity"
              icon="file"
              primary=${true}
              disabled=${!ready || !quarterEntityGroups.length}
              onClick=${() => setInvoiceOpen(true)}
            />`}
          </div>
        </div>
      </div>

      <div class="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] surface shadow-card">
        <div class="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-3">
          <h2 class="text-[15px] font-semibold tracking-tight text-slate-100">${view === "month" ? "Monthly payout" + (selectedPublisherKey ? " - " + selectedPublisherKey : "") : "Quarterly payout - " + (quarter || "\u2014")}</h2>
          ${ready && html`<span class="text-xs text-slate-500">${model.rawRows.length} joined show-month rows</span>`}
        </div>
        <div class="min-h-0 flex-1 overflow-auto">
          ${!ready ? html`<${PayEmptyState} />` : view === "month" ? html`<${PayMonthlyEntity} ips=${filteredIps} entity=${selectedPublisherKey} cfg=${cfg} />` : html`<${PayQuarterlyHierarchy} model=${model} quarter=${quarter} cfg=${cfg} />`}
        </div>
      </div>
    </div>
    ${quarterExcelOpen && html`<${PayQuarterExcelModal} groups=${quarterEntityGroups} quarter=${quarter} cfg=${cfg} onClose=${() => setQuarterExcelOpen(false)} />`}
    ${invoiceOpen && html`<${PayInvoiceModal} groups=${quarterEntityGroups} quarter=${quarter} onClose=${() => setInvoiceOpen(false)} />`}
  </div>`;
}

async function payHandleFile(file) {
  if (!file) return { name: "", rows: [], error: "" };
  try {
    const rows = await payReadTabularFile(file);
    return { name: file.name, rows, error: "" };
  } catch (err) {
    return { name: file.name, rows: [], error: err && err.message || String(err) };
  }
}
function payEmptyUploadState() {
  return { name: "", rows: [], error: "" };
}
function payUploadCache() {
  if (!window.PAY_UPLOAD_CACHE) {
    window.PAY_UPLOAD_CACHE = {
      mapping: payEmptyUploadState(),
      dump: payEmptyUploadState()
    };
  }
  return window.PAY_UPLOAD_CACHE;
}
function payInitialUpload(slot) {
  return payUploadCache()[slot] || payEmptyUploadState();
}
function payStoreUpload(slot, state) {
  const next = state || payEmptyUploadState();
  payUploadCache()[slot] = next;
  return next;
}
function PayUploadCard({ title, hint, state, onFile, onClear }) {
  const hasFile = !!(state.name || state.rows.length || state.error);
  const compactTitle = title.indexOf("IP ID") >= 0 ? "1. Mapping file" : "2. Data dump";
  return html`<section class="min-w-0 rounded-xl border border-white/[0.08] surface p-2 shadow-card">
    <div class="flex min-w-0 items-center gap-2">
      <label title=${title + " - " + hint} class="flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.025] px-2 text-left transition hover:border-brand-500/50 hover:bg-brand-500/[0.04]">
        <input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="hidden" onChange=${(e) => { const file = e.target.files && e.target.files[0]; onFile(file); e.target.value = ""; }} />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[11.5px] font-semibold leading-tight text-slate-200">${state.name || compactTitle}</span>
          <span class="block truncate text-[10px] text-slate-500">${state.rows.length ? (state.rows.length - 1) + " rows parsed" : "Choose CSV/XLSX"}</span>
        </span>
        <span class="hidden shrink-0 rounded-md bg-brand-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-brand-300 sm:inline">Browse</span>
      </label>
      <div class="flex shrink-0 items-center gap-1.5">
        ${hasFile && html`<button type="button" onClick=${onClear} class="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 transition hover:border-rose-400/40 hover:text-rose-300">Remove</button>`}
        ${hasFile && html`<span class=${cx("rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide", state.rows.length ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/[0.04] text-slate-400")}>${state.rows.length ? "Loaded" : "CSV/XLSX"}</span>`}
      </div>
    </div>
    ${state.error && html`<div class="mt-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300">${state.error}</div>`}
  </section>`;
}
function PayMetric({ label, value, sub, title }) {
  return html`<div title=${title || ""} class="min-w-[145px] flex-1 rounded-xl border border-white/[0.07] surface p-2.5 shadow-card">
    <div class="truncate text-[9.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">${label}</div>
    <div class="mt-1 tnum text-xl font-semibold tracking-tight text-white">${value}</div>
    <div class="mt-0.5 truncate text-[11px] text-slate-500">${sub}</div>
  </div>`;
}
function PayWarnings({ warnings }) {
  if (!warnings.length) return null;
  return html`<div class="mt-2 shrink-0 rounded-xl border border-amber-400/25 bg-amber-500/[0.06] p-3">
    <div class="mb-2 text-sm font-semibold text-amber-200">Validation warnings</div>
    <div class="grid gap-2 lg:grid-cols-2">
      ${warnings.slice(0, 8).map((w, i) => html`<div key=${i} class="rounded-lg border border-amber-400/15 bg-black/10 px-3 py-2 text-xs text-amber-100"><span class="font-semibold">${w.type}:</span> ${w.text}</div>`)}
    </div>
    ${warnings.length > 8 && html`<div class="mt-2 text-xs text-amber-200/70">+${warnings.length - 8} more warnings</div>`}
  </div>`;
}
function PayChip({ children, warn }) {
  return html`<span class=${cx("rounded-lg border px-2 py-1 text-[11px] font-semibold", warn ? "border-amber-400/40 bg-amber-500/[0.06] text-amber-300" : "border-white/[0.08] bg-ink-850 text-slate-300")}>${children}</span>`;
}
function PayEmptyState() {
  return html`<div class="flex h-full min-h-[360px] items-center justify-center px-5 text-center">
    <div>
      <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-300"><${Icon} name="pay" size=${22} /></div>
      <div class="text-sm font-semibold text-slate-200">Upload both files to calculate payouts</div>
      <div class="mt-1 max-w-md text-xs leading-relaxed text-slate-500">The first file maps IP IDs to Show IDs and Show Type. The second file supplies monthly revenue, spend and column J final-master hours by Show ID.</div>
    </div>
  </div>`;
}

const PAY_TH = "sticky top-0 z-20 whitespace-nowrap border-b border-white/[0.07] bg-ink-850 px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500";
const PAY_TH_FIRST = "sticky left-0 top-0 z-30 w-[280px] min-w-[280px] whitespace-nowrap border-b border-r border-white/[0.07] bg-ink-850 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500";
const PAY_TD_FIRST = "sticky left-0 z-10 w-[280px] min-w-[280px] whitespace-nowrap border-r border-white/[0.07] bg-ink-850 px-4 py-2.5 text-left";
function payCell(v, opts) {
  opts = opts || {};
  if (opts.hours) return html`<td class="tnum whitespace-nowrap px-4 py-2.5 text-right text-slate-300">${payNum(v)}</td>`;
  if (opts.neg) {
    const show = v ? "(" + payFmt(v) + ")" : payFmt(v);
    return html`<td class="tnum whitespace-nowrap px-4 py-2.5 text-right text-brand-400">${show}</td>`;
  }
  return html`<td class=${cx("tnum whitespace-nowrap px-4 py-2.5 text-right", opts.payout ? "font-semibold text-emerald-400" : opts.strong ? "font-semibold text-slate-100" : "text-slate-300")}>${payFmt(v)}</td>`;
}
function payBreakdownGroups(ip) {
  const terms = ip && ip.terms || {};
  const groups = [{
    id: "revenue",
    label: "Gross IAP Revenue",
    key: "gross",
    opts: { strong: true },
    children: [
      { label: "VAT", key: "vat", opts: { neg: true } },
      ...(terms.dist ? [{ label: "Distribution", key: "distribution", opts: { neg: true } }] : []),
      { label: "Gross (ex VAT & ex Dist)", key: "grossExVatDist", opts: { strong: true } }
    ]
  }];
  if (terms.prod) groups.push({
    id: "production",
    label: "Production Cost",
    key: "production",
    opts: { strong: true },
    children: [{ label: "Final Mastered Hrs (column J)", key: "hrs", opts: { hours: true } }]
  });
  if (terms.mkt) groups.push({
    id: "marketing",
    label: "Marketing Cost",
    key: "marketing",
    opts: { strong: true },
    children: [
      { label: "Scaling Spends", key: "scaling" },
      { label: "Testing Spends", key: "testing" },
      { label: "Internal Allocation (15%)", key: "internalAlloc" }
    ]
  });
  groups.push({
    id: "deductions",
    label: "Total Deductions (current cycle)",
    key: "totalDeductCurrent",
    opts: { strong: true },
    children: [
      { label: "Net Total Applicable Deductions", key: "netApplic" },
      { label: "Deductions Recouped", key: "recouped" },
      { label: "Deductions Carry Forward", key: "carryFwd" }
    ]
  });
  groups.push({
    id: "payout",
    label: "Final Payout",
    key: "finalPayout",
    opts: { payout: true },
    children: [
      { label: "Net Revenue for Rev Share", key: "netRevForShare" },
      { label: "Rev Share", key: "revShare", opts: { strong: true } },
      { label: "Advance / MG Recouped", key: "advRecoup" },
      { label: "Advance / MG Pending", key: "advPending" }
    ]
  });
  return groups;
}
function PayDisclosureIcon({ open, size }) {
  const large = size === "large";
  return html`<span class=${cx(
    "flex shrink-0 items-center justify-center rounded-full border border-brand-500/30 bg-brand-500/[0.09] text-brand-300 shadow-[0_0_18px_-8px_rgba(229,31,79,.9)] transition-all duration-200 group-hover:border-brand-400/55 group-hover:bg-brand-500/[0.16] group-hover:text-brand-200",
    large ? "h-8 w-8" : "h-6 w-6"
  )}>
    <${Icon} name="back" size=${large ? 16 : 13} className=${cx("transition-transform duration-200", open ? "-rotate-90" : "rotate-180")} />
  </span>`;
}
function PayBreakdownTable({ ip, columns }) {
  const [openGroups, setOpenGroups] = useState({});
  const groups = payBreakdownGroups(ip);
  const toggle = (id) => setOpenGroups((current) => ({ ...current, [id]: !current[id] }));
  const valueCells = (key, opts) => columns.map((column) => html`<${React.Fragment} key=${column.key}>${payCell(column.data[key], opts || {})}<//>`);
  const childRow = (group, row) => html`<tr key=${group.id + "-" + row.key} class="border-b border-white/[0.025]">
    <th class=${cx(PAY_TD_FIRST, "!pl-11 text-[12px] font-normal text-slate-500")}>
      <span class="flex items-center gap-2.5"><span class="h-px w-4 shrink-0 bg-brand-500/30"></span><span>${row.label}</span></span>
    </th>
    ${valueCells(row.key, row.opts)}
  </tr>`;
  return html`<table class="w-full min-w-[640px] border-separate" style=${{ borderSpacing: 0 }}>
    <thead><tr><th class=${PAY_TH_FIRST}>Calculation component</th>${columns.map((column) => html`<th key=${column.key} class=${PAY_TH}>${column.label}</th>`)}</tr></thead>
    <tbody>
      ${groups.map((group) => html`<${React.Fragment} key=${group.id}>
        <tr class=${group.opts && group.opts.payout ? "bg-emerald-500/[0.05]" : "bg-white/[0.018]"}>
          <th class=${cx(PAY_TD_FIRST, "!bg-ink-800 font-semibold", group.opts && group.opts.payout ? "text-emerald-400" : "text-slate-100")}>
            <button type="button" onClick=${() => toggle(group.id)} aria-expanded=${!!openGroups[group.id]} class="group flex w-full items-center gap-2.5 py-0.5 text-left">
              <${PayDisclosureIcon} open=${!!openGroups[group.id]} />
              <span>${group.label}</span>
            </button>
          </th>
          ${valueCells(group.key, group.opts)}
        </tr>
        ${openGroups[group.id] && group.children.map((row) => childRow(group, row))}
      <//>`)}
    </tbody>
  </table>`;
}
function PayIpBreakdownCard({ ip, columns, cfg, periodLabel }) {
  const [open, setOpen] = useState(false);
  const chips = paySelectedTermChips(ip, cfg);
  const finalPayout = columns.reduce((sum, column) => sum + payParseNumber(column.data && column.data.finalPayout), 0);
  return html`<section class=${cx("overflow-hidden rounded-xl border bg-ink-850/55 transition-colors", open ? "border-brand-500/20" : "border-white/[0.08] hover:border-white/[0.14]")}>
    <div class="flex min-w-0 items-center gap-3 px-3.5 py-3">
      <button type="button" onClick=${() => setOpen(!open)} aria-expanded=${open} class="group flex min-w-0 flex-1 items-center gap-3 text-left">
        <${PayDisclosureIcon} open=${open} />
        <span class="min-w-0">
          <span class="block truncate text-sm font-semibold text-slate-100">${ip.ipName || "Untitled IP"}</span>
          <span class="mt-0.5 block truncate text-[10.5px] text-slate-500">${ip.ipId || "No IP ID"} · ${ip.showsList.length} show${ip.showsList.length === 1 ? "" : "s"} · ${periodLabel}</span>
        </span>
      </button>
      <span class="tnum shrink-0 text-sm font-semibold text-emerald-400">${payFmt(finalPayout)}</span>
      <span class="shrink-0 text-[10.5px] font-medium text-slate-500">${open ? "Collapse IP" : "Expand IP"}</span>
    </div>
    ${open && html`<div class="ml-5 border-l border-brand-500/20 py-2 pl-3 pr-3">
      <div class="flex flex-wrap gap-1.5 pb-2">${chips.map((chip) => html`<${PayChip} key=${chip.text} warn=${chip.warn}>${chip.text}<//>`)}</div>
      <div class="overflow-x-auto rounded-lg border border-white/[0.06]"><${PayBreakdownTable} ip=${ip} columns=${columns} /></div>
    </div>`}
  </section>`;
}
function PayMonthlyEntity({ ips, entity, cfg }) {
  if (!ips.length) return html`<div class="px-5 py-10 text-center text-sm text-slate-500">No joined IP data for this entity.</div>`;
  return html`<div class="space-y-3 p-3">
    <div class="flex items-center justify-between rounded-lg bg-white/[0.025] px-3 py-2">
      <div><div class="text-[9.5px] font-bold uppercase tracking-[0.1em] text-brand-300">Entity</div><div class="mt-0.5 text-sm font-semibold text-slate-100">${entity || "Entity"}</div></div>
      <div class="text-[11px] text-slate-500">${ips.length} IP${ips.length === 1 ? "" : "s"}</div>
    </div>
    <div class="ml-4 space-y-3 border-l border-brand-500/25 pl-5">
      ${ips.map((ip) => html`<${PayIpBreakdownCard}
        key=${ip.key}
        ip=${ip}
        columns=${ip.rows.map((row) => ({ key: row.periodKey, label: row.period, data: row }))}
        cfg=${cfg}
        periodLabel=${ip.rows.length + " month" + (ip.rows.length === 1 ? "" : "s")}
      />`)}
    </div>
  </div>`;
}
function PayQuarterEntitySection({ group, quarter, cfg }) {
  const [open, setOpen] = useState(false);
  return html`<section class="border-b border-white/[0.07] last:border-0">
    <button type="button" onClick=${() => setOpen(!open)} aria-expanded=${open} class="group flex w-full items-center gap-3 bg-white/[0.018] px-5 py-3.5 text-left transition hover:bg-white/[0.04]">
      <${PayDisclosureIcon} open=${open} size="large" />
      <span class="min-w-0 flex-1">
        <span class="block text-[9.5px] font-bold uppercase tracking-[0.1em] text-brand-300">Entity</span>
        <span class="mt-0.5 block truncate text-sm font-semibold text-slate-100">${group.label}</span>
        <span class="mt-0.5 block text-[10.5px] text-slate-500">${group.ips.length} IP${group.ips.length === 1 ? "" : "s"} in ${quarter}</span>
      </span>
      <span class="tnum shrink-0 text-sm font-semibold text-emerald-400">${payFmt(group.finalPayout)}</span>
    </button>
    ${open && html`<div class="ml-8 space-y-3 border-l border-brand-500/25 bg-black/[0.06] py-4 pl-5 pr-4">
      ${group.ips.map((entry) => html`<${PayIpBreakdownCard}
        key=${quarter + "|" + entry.ip.key}
        ip=${entry.ip}
        columns=${[{ key: quarter, label: quarter, data: entry }]}
        cfg=${cfg}
        periodLabel=${quarter}
      />`)}
    </div>`}
  </section>`;
}
function PayQuarterlyHierarchy({ model, quarter, cfg }) {
  const groups = useMemo(() => payQuarterEntityGroups(model, quarter), [model, quarter]);
  if (!groups.length) return html`<div class="px-5 py-10 text-center text-sm text-slate-500">No joined data for ${quarter || "this quarter"}.</div>`;
  return html`<div>
    ${groups.map((group) => html`<${PayQuarterEntitySection} key=${quarter + "|" + group.key} group=${group} quarter=${quarter} cfg=${cfg} />`)}
  </div>`;
}
