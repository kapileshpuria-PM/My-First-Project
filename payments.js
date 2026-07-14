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
  const amount = payParseNumber(terms.mgAmount);
  if (!amount) return 0;
  const basis = String(terms.mgBasis || "Per deal").toLowerCase();
  if (/per ip/.test(basis)) return amount;
  if (/per title/.test(basis)) return amount * Math.max(1, payBooksForAllocation(ip) || 1);
  const ips = deal.ips || [];
  if (ips.length <= 1) return amount;
  const totalBooks = ips.reduce((sum, row) => sum + (payBooksForAllocation(row) || 0), 0);
  if (totalBooks) return amount * ((payBooksForAllocation(ip) || 0) / totalBooks);
  return amount / ips.length;
}
function payTermRecordsFromClosedDeals(deals) {
  const records = [];
  (deals || []).forEach((deal) => {
    if (typeof isClosedDeal === "function" && !isClosedDeal(deal)) return;
    const round = typeof currentRound === "function" ? currentRound(deal) : (deal.rounds || [])[0];
    const baseTerms = round && round.terms || {};
    (deal.ips || []).forEach((ip) => {
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
    return { ip, rows, gross: sum("gross"), production: sum("production"), marketing: sum("marketing"), revShare: sum("revShare"), advRecoup: sum("advRecoup"), finalPayout: sum("finalPayout"), advPending: rows.length ? rows[rows.length - 1].advPending : 0 };
  });
}

window.PFM_PAYMENTS_DEBUG = {
  csvRows: payCsvRows,
  normalizeMapping: payNormalizeMapping,
  normalizeDump: payNormalizeDump,
  buildModel: payBuildModel
};

/* ----------------------------- Payments Calculation view ----------------------------- */
function PaymentsView({ deals }) {
  const [mappingFile, setMappingFile] = useState(() => payInitialUpload("mapping"));
  const [dumpFile, setDumpFile] = useState(() => payInitialUpload("dump"));
  const [view, setView] = useState("month");
  const [selectedPublisherKey, setSelectedPublisherKey] = useState("");
  const [selectedIpKey, setSelectedIpKey] = useState("");
  const [quarter, setQuarter] = useState("");

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
  const ipOptions = useMemo(() => filteredIps.map(payIpOption), [filteredIps]);
  const filteredIpKeys = filteredIps.map((ip) => ip.key).join("|");
  const quarterOptions = useMemo(() => model.quarters.map((q) => ({ key: q, label: q, search: q })), [model.quarters.join("|")]);
  useEffect(() => {
    if (!publisherOptions.length && selectedPublisherKey) setSelectedPublisherKey("");
    if (publisherOptions.length && (!selectedPublisherKey || !publisherOptions.some((row) => row.key === selectedPublisherKey))) setSelectedPublisherKey(publisherOptions[0].key);
  }, [publisherKeys, selectedPublisherKey]);
  useEffect(() => {
    if (!filteredIps.length && selectedIpKey) setSelectedIpKey("");
    if (filteredIps.length && (!selectedIpKey || !filteredIps.some((ip) => ip.key === selectedIpKey))) setSelectedIpKey(filteredIps[0].key);
  }, [filteredIpKeys, selectedIpKey]);
  useEffect(() => {
    if (!quarter && model.quarters.length) setQuarter(model.quarters[model.quarters.length - 1]);
    if (quarter && model.quarters.length && !model.quarters.includes(quarter)) setQuarter(model.quarters[model.quarters.length - 1]);
    if (!model.quarters.length) setQuarter("");
  }, [model.quarters.join("|"), quarter]);

  const selectedIp = filteredIps.find((ip) => ip.key === selectedIpKey) || filteredIps[0] || model.ips[0];
  const selectedTermChips = paySelectedTermChips(selectedIp, cfg);
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

      ${hasUploads && html`<${PayWarnings} warnings=${model.warnings} />`}

      <div class="mt-2 shrink-0 rounded-xl border border-white/[0.08] surface p-2 shadow-card">
        <div class="flex flex-wrap items-end gap-3">
          <div class="inline-flex shrink-0 self-end rounded-xl border border-white/[0.08] bg-ink-850 p-1">
            ${Toggle("month", "Monthly (MoM)")}${Toggle("quarter", "Quarterly")}
          </div>
          ${view === "month" ? html`
            <div class="min-w-[118px] flex-[1_1_210px] max-w-[250px]">
              <label class="mb-0.5 hidden text-[9.5px] font-bold uppercase tracking-wide text-slate-300 xl:block">Publisher</label>
              <${PayComboSelect} value=${selectedPublisherKey} options=${publisherOptions} onChange=${setSelectedPublisherKey} placeholder="Search or select publisher" emptyLabel="No matching publisher" />
            </div>
            <div class="min-w-[128px] flex-[1_1_250px] max-w-[300px]">
              <label class="mb-0.5 hidden text-[9.5px] font-bold uppercase tracking-wide text-slate-300 xl:block">IP / Series</label>
              <${PayComboSelect} value=${selectedIpKey} options=${ipOptions} onChange=${setSelectedIpKey} placeholder="Search or select IP / series" emptyLabel="No matching IP" />
            </div>
            ${selectedIp && html`<div class="min-w-[300px] flex-[2] pb-0.5">
              <div class="flex min-w-0 flex-wrap items-end gap-1.5">
                ${selectedTermChips.map((chip) => html`<${PayChip} key=${chip.text} warn=${chip.warn}>${chip.text}<//>`)}
              </div>
            </div>`}
          ` : html`
            <div class="min-w-[140px] max-w-[260px] flex-1">
              <label class="mb-0.5 hidden text-[9.5px] font-bold uppercase tracking-wide text-slate-300 xl:block">Quarter</label>
              <${PayComboSelect} value=${quarter} options=${quarterOptions} onChange=${setQuarter} placeholder="Search or select quarter" emptyLabel="No matching quarter" />
            </div>
          `}
        </div>
      </div>

      <div class="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] surface shadow-card">
        <div class="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-3">
          <h2 class="text-[15px] font-semibold tracking-tight text-slate-100">${view === "month" ? "Monthly payout" + (selectedIp ? " - " + selectedIp.ipName : "") : "Quarterly payout - " + (quarter || "\u2014")}</h2>
          ${ready && html`<span class="text-xs text-slate-500">${model.rawRows.length} joined show-month rows</span>`}
        </div>
        <div class="min-h-0 flex-1 overflow-auto">
          ${!ready ? html`<${PayEmptyState} />` : view === "month" ? html`<${PayMonthlyTable} ip=${selectedIp} cfg=${cfg} />` : html`<${PayQuarterlyTable} model=${model} quarter=${quarter} />`}
        </div>
      </div>
    </div>
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
const PAY_TH_FIRST = "sticky left-0 top-0 z-30 whitespace-nowrap border-b border-r border-white/[0.07] bg-ink-850 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500";
const PAY_TD_FIRST = "sticky left-0 z-10 whitespace-nowrap border-r border-white/[0.07] bg-ink-850 px-4 py-2.5 text-left";
function payCell(v, opts) {
  opts = opts || {};
  if (opts.hours) return html`<td class="tnum whitespace-nowrap px-4 py-2.5 text-right text-slate-300">${payNum(v)}</td>`;
  if (opts.neg) {
    const show = v ? "(" + payFmt(v) + ")" : payFmt(v);
    return html`<td class="tnum whitespace-nowrap px-4 py-2.5 text-right text-brand-400">${show}</td>`;
  }
  return html`<td class=${cx("tnum whitespace-nowrap px-4 py-2.5 text-right", opts.payout ? "font-semibold text-emerald-400" : opts.strong ? "font-semibold text-slate-100" : "text-slate-300")}>${payFmt(v)}</td>`;
}
function PayMonthlyTable({ ip }) {
  if (!ip) return html`<div class="px-5 py-10 text-center text-sm text-slate-500">No joined IP data yet.</div>`;
  const rows = ip.rows || [];
  const line = (label, key, opts) => html`<tr key=${label} class=${opts && opts.payout ? "bg-emerald-500/[0.05]" : ""}>
    <th class=${cx(PAY_TD_FIRST, opts && opts.sub ? "pl-8 text-[12px] font-normal text-slate-500" : "font-medium", opts && opts.strong ? "text-slate-100" : opts && opts.payout ? "font-semibold text-emerald-400" : opts && opts.sub ? "" : "text-slate-300")}>${label}</th>
    ${rows.map((r) => html`<${React.Fragment} key=${r.periodKey}>${payCell(r[key], opts || {})}<//>`)}
  </tr>`;
  const headRow = (label) => html`<tr key=${label}><th class=${cx(PAY_TD_FIRST, "!bg-ink-800 text-[10px] font-bold uppercase tracking-wide text-slate-500")}>${label}</th>${rows.map((r) => html`<td key=${r.periodKey} class="border-b border-white/[0.04] bg-ink-800/60"></td>`)}</tr>`;
  return html`<table class="w-full border-separate" style=${{ borderSpacing: 0 }}>
    <thead><tr><th class=${PAY_TH_FIRST}>Line item</th>${rows.map((r) => html`<th key=${r.periodKey} class=${PAY_TH}>${r.period}</th>`)}</tr></thead>
    <tbody>
      ${line("Gross IAP Revenue", "gross", { strong: true })}
      ${line("- VAT", "vat", { sub: true, neg: true })}
      ${line("- Distribution", "distribution", { sub: true, neg: true })}
      ${line("Gross (ex VAT & ex Dist)", "grossExVatDist", { strong: true })}
      ${line("Final Mastered Hrs (column J)", "hrs", { hours: true })}
      ${headRow("Deductions")}
      ${line("Production Cost", "production", { sub: true })}
      ${line("Marketing Cost", "marketing", { sub: true })}
      ${line("Total Deductions (current cycle)", "totalDeductCurrent", { strong: true })}
      ${line("Net Total Applicable Deductions", "netApplic", {})}
      ${line("Deductions recouped", "recouped", {})}
      ${line("Deductions Carry Forward", "carryFwd", {})}
      ${headRow("Payout")}
      ${line("Net Rev for Rev Share", "netRevForShare", {})}
      ${line("Rev Share", "revShare", { strong: true })}
      ${line("Advance / MG recouped", "advRecoup", {})}
      ${line("Advance / MG pending", "advPending", {})}
      ${line("Final Payout", "finalPayout", { payout: true })}
    </tbody>
  </table>`;
}
function PayQuarterlyTable({ model, quarter }) {
  const rows = payQuarterRows(model, quarter);
  return html`<table class="w-full border-separate" style=${{ borderSpacing: 0 }}>
    <thead><tr>
      <th class=${PAY_TH_FIRST}>IP / Series</th>
      ${["Revenue", "Production", "Marketing", "Rev Share", "MG Recouped", "MG Pending", "Final Payout"].map((h) => html`<th key=${h} class=${PAY_TH}>${h}</th>`)}
    </tr></thead>
    <tbody>
      ${rows.map((r) => html`<tr key=${r.ip.key}>
        <th class=${PAY_TD_FIRST}>
          <span class="font-semibold text-slate-100">${r.ip.ipName}</span>
          <span class="block text-[11px] font-normal text-slate-500">${r.ip.ipId || "\u2014"} · ${r.ip.publisher || "\u2014"} · Rev share ${payPct(r.ip.terms.revShare || 0)} · MG ${payFmt(r.ip.terms.advance || 0)}</span>
        </th>
        ${payCell(r.gross, { strong: true })}
        ${payCell(r.production, {})}
        ${payCell(r.marketing, {})}
        ${payCell(r.revShare, {})}
        ${payCell(r.advRecoup, {})}
        ${payCell(r.advPending, {})}
        ${payCell(r.finalPayout, { payout: true })}
      </tr>`)}
    </tbody>
  </table>`;
}
