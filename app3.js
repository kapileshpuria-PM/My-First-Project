/* Pocket FM Deal Tracker - detail sections, new deal, render (loaded last) */

/* ------- IP links editor (shared by manual + SCOUT IPs; BUG-1) ------- */
function IPLinks({ ip, onPatch }) {
  const [edit, setEdit] = useState(false);
  const links = ip.links || [];
  const legacy = [];
  if (ip.amazon) legacy.push({ label: "Amazon", url: ip.amazon });
  if (ip.goodreads) legacy.push({ label: "Goodreads", url: ip.goodreads });
  const addLink = () => { onPatch({ links: links.concat([{ label: "Link", url: "" }]) }); setEdit(true); };
  const setLink = (i, patch) => onPatch({ links: links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });
  const delLink = (i) => onPatch({ links: links.filter((_, idx) => idx !== i) });
  return html`<div class="mt-3">
    <div class="flex flex-wrap items-center gap-2">
      ${legacy.map((l, i) => html`<${LinkChip} key=${"lg" + i} label=${l.label} url=${l.url} />`)}
      ${!edit && links.map((l, i) => html`<${LinkChip} key=${"ln" + i} label=${l.label || "Link"} url=${l.url} />`)}
      <button onClick=${addLink} class="inline-flex items-center gap-1 rounded-lg border border-dashed border-white/15 px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:border-brand-500/50 hover:text-brand-300"><${Icon} name="plus" size=${12} />Add link</button>
      ${(links.length > 0) && html`<button onClick=${() => setEdit(!edit)} class="text-xs font-medium text-slate-500 transition hover:text-slate-300">${edit ? "Done" : "Edit links"}</button>`}
    </div>
    ${edit && links.length > 0 && html`<div class="mt-2 space-y-2">
      ${links.map((l, i) => html`<div key=${"ed" + i} class="flex items-center gap-2">
        <input value=${l.label || ""} onInput=${(e) => setLink(i, { label: e.target.value })} placeholder="Label" class=${cx(inputCls, "w-28 !py-2")} />
        <input value=${l.url || ""} onInput=${(e) => setLink(i, { url: e.target.value })} placeholder="https://..." class=${cx(inputCls, "flex-1 !py-2")} />
        <button onClick=${() => delLink(i)} class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-rose-400"><${Icon} name="x" size=${14} /></button>
      </div>`)}
    </div>`}
  </div>`;
}

/* ------- IP section ------- */
function IPSection({ deal, allDeals, update }) {
  const addIP = (r) => update(deal.id, (d) => ({
    ...d, ips: d.ips.concat([{ id: uid("ip"), ipId: mintIpIdFor(allDeals || [d], d, d.entityId), series: r.series, asin: r.asin, genre: r.genre, launchDate: "", lengthHrs: r.durationHrs, totalBooks: r.totalBooks, rating: r.rating, numRatings: r.numRatings, amazon: r.amazon, goodreads: r.goodreads, links: [], titlesInScope: "All" }]),
    updatedAt: new Date().toISOString()
  }));
  const addManual = () => update(deal.id, (d) => ({ ...d, ips: d.ips.concat([{ id: uid("ip"), ipId: mintIpIdFor(allDeals || [d], d, d.entityId), series: "New IP", genre: "", totalBooks: null, links: [], titlesInScope: "All" }]), updatedAt: new Date().toISOString() }));
  const setIP = (i, patch) => update(deal.id, (d) => ({ ...d, ips: d.ips.map((ip, idx) => (idx === i ? { ...ip, ...patch } : ip)) }));
  const delIP = (i) => update(deal.id, (d) => ({ ...d, ips: d.ips.filter((_, idx) => idx !== i) }));

  return html`<${Panel} title=${"IPs / Series (" + deal.ips.length + ")"}
    action=${html`<${GhostBtn} onClick=${addManual}>+ Manual<//>`}>
    <div class="mb-4"><${ScoutSearch} mode="ip" scope=${deal.scoutEntityKey} placeholder=${deal.scoutEntityKey ? "Showing this entity's series \u2014 click to add" : "Search SCOUT to add an IP (series or author)"} onPick=${addIP} /></div>
    <div class="space-y-2">
      ${deal.ips.map((ip, i) => html`<div key=${ip.id || ip.ipId || i} class=${cx("rounded-xl border bg-ink-850 p-4", ip.dropped ? "border-rose-500/30 opacity-70" : "border-white/[0.06]")}>
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <input value=${ip.series || ""} onInput=${(e) => setIP(i, { series: e.target.value })} placeholder="IP / series name"
              class="w-full bg-transparent text-[15px] font-semibold tracking-tight text-slate-100 outline-none placeholder:text-slate-600" />
            <div class="mt-1 flex items-center gap-2">
              ${ip.ipId && html`<${IdChip} id=${ip.ipId} title="IP ID" />`}
              ${ip.dropped && html`<span class="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300 ring-1 ring-rose-400/30">Dropped</span>`}
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <button onClick=${() => setIP(i, { dropped: !ip.dropped })} title=${ip.dropped ? "Mark active" : "Mark dropped"} class=${cx("rounded-lg px-2 py-1 text-[11px] font-medium transition", ip.dropped ? "text-emerald-300 hover:bg-emerald-500/10" : "text-slate-500 hover:bg-white/5 hover:text-slate-300")}>${ip.dropped ? "Restore" : "Drop"}</button>
            <button onClick=${() => { if (confirm("Remove this IP from the deal?")) delIP(i); }} class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-rose-400"><${Icon} name="x" size=${14} /></button>
          </div>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <${Field} label="Genre"><input value=${ip.genre || ""} onInput=${(e) => setIP(i, { genre: e.target.value })} class=${inputCls} /></${Field}>
          <${Field} label="Rating"><${NumInput} value=${ip.rating} onChange=${(v) => setIP(i, { rating: v })} placeholder="0.0" /></${Field}>
          <${Field} label="No. of ratings"><${NumInput} value=${ip.numRatings} onChange=${(v) => setIP(i, { numRatings: v })} placeholder="0" /></${Field}>
          <${Field} label="Total books"><${NumInput} value=${ip.totalBooks} onChange=${(v) => setIP(i, { totalBooks: v })} placeholder="0" /></${Field}>
          <${Field} label="Length"><${NumInput} value=${ip.lengthHrs} onChange=${(v) => setIP(i, { lengthHrs: v })} suffix="hrs" /></${Field}>
          <${Field} label="Launch"><input value=${ip.launchDate || ""} onInput=${(e) => setIP(i, { launchDate: e.target.value })} class=${inputCls} placeholder="year" /></${Field}>
          <${Field} label="Titles in scope" hint="per IP"><input value=${ip.titlesInScope || "All"} onInput=${(e) => setIP(i, { titlesInScope: e.target.value })} class=${inputCls} /></${Field}>
        </div>
        <${IPLinks} ip=${ip} onPatch=${(patch) => setIP(i, patch)} />
      </div>`)}
      ${deal.ips.length === 0 && html`<div class="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">No IPs yet. Add one from SCOUT above or click <span class="text-slate-300">+ Manual</span>.</div>`}
    </div>
  <//>`;
}

/* ------- MG matrix guardrail / suggestion ------- */
function GuardrailCard({ deal }) {
  const mg = dealMgSuggestion(deal); const rev = dealRevMax(deal); const t = currentRound(deal).terms;
  const mgOver = mg && t.mgAmount != null && t.mgAmount > mg[1];
  const revOver = rev != null && t.revSharePct != null && t.revSharePct > rev;
  const Block = (label, value, warn) => html`<div>
    <div class="text-xs text-slate-400">${label}</div>
    <div class="tnum mt-0.5 text-lg font-semibold text-slate-100">${value}</div>
    ${warn && html`<div class="mt-0.5 text-[11px] font-medium text-rose-400">${warn}</div>`}
  </div>`;
  return html`<${Panel} title="MG matrix guardrail">
    <div class="space-y-3.5">
      ${Block("Suggested MG (scaled to scope)", mg ? "\u20ac" + mg[0].toLocaleString() + " \u2013 \u20ac" + mg[1].toLocaleString() : "\u2014", mgOver ? "Current MG above suggested max" : null)}
      ${Block("Max rev share", rev != null ? rev + "%" : "\u2014", revOver ? "Current rev share above max" : null)}
      <div class="text-[11px] leading-relaxed text-slate-500">Directional, from the MG Decision Template (genre priority x sales tier x length, scaled by titles in scope). Not autofilled. Confirm genre buckets.</div>
    </div>
  <//>`;
}

/* ------- Negotiation progression over time ------- */
function ProgressionPanel({ deal }) {
  const rounds = deal.rounds || [];
  const rowsDef = [
    ["MG", (r) => fmtMoney(r.terms.mgAmount, r.terms.mgCurrency) + (r.terms.mgRecoupable ? "" : " NR")],
    ["Basis", (r) => r.terms.mgBasis],
    ["Rev share", (r) => (r.terms.revSharePct != null ? r.terms.revSharePct + "% " + r.terms.revShareBase : "\u2014")],
    ["Cost cap", (r) => (r.terms.capPct != null ? r.terms.capPct + "% Gross" : "\u2014")],
    ["Term", (r) => (r.terms.minTermYears != null ? r.terms.minTermYears + "y" : "\u2014")],
    ["Exclusivity", (r) => r.terms.exclusivity]
  ];
  return html`<${Panel} title="Negotiation progression">
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead><tr>
          <th class="sticky left-0 z-10 bg-ink-900 px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">Term</th>
          ${rounds.map((r) => html`<th key=${r.id} class="min-w-[120px] px-3 py-2 text-left">
            <div class="text-xs font-semibold text-slate-200">${r.label}${r.id === deal.currentRoundId ? html`<span class="ml-1 text-[9px] text-emerald-400">\u25cf</span>` : ""}</div>
            <div class="text-[10px] text-slate-500">${r.date}</div>
          </th>`)}
        </tr></thead>
        <tbody>
          ${rowsDef.map(([label, fn]) => html`<tr key=${label} class="border-t border-white/[0.05]">
            <td class="sticky left-0 z-10 bg-ink-900 px-3 py-2 font-medium text-slate-400">${label}</td>
            ${rounds.map((r, i) => { const v = fn(r); const changed = i > 0 && v !== fn(rounds[i - 1]); return html`<td key=${r.id} class=${cx("px-3 py-2 tnum", changed ? "font-semibold text-brand-400" : "text-slate-200")}>${v}</td>`; })}
          </tr>`)}
        </tbody>
      </table>
    </div>
    <div class="mt-2.5 text-[11px] text-slate-500">Pink = changed from the previous round. The \u25cf marks the current round.</div>
  <//>`;
}

/* ------- Rounds ------- */
function isBaselineRound(r) { return /align/i.test(r.label || ""); }
function RoundsSection({ deal, roundId, setRoundId, update }) {
  const addRound = () => update(deal.id, (d) => {
    const base = d.rounds.find((r) => r.id === d.currentRoundId) || d.rounds[d.rounds.length - 1];
    const nr = { id: uid("r"), label: "New round", date: new Date().toISOString().slice(0, 10), note: "", terms: { ...base.terms } };
    return { ...d, rounds: d.rounds.concat([nr]), currentRoundId: nr.id, updatedAt: new Date().toISOString() };
  });
  const setCurrent = () => update(deal.id, (d) => ({ ...d, currentRoundId: roundId }));
  const renameRound = (v) => update(deal.id, (d) => ({ ...d, rounds: d.rounds.map((r) => (r.id === roundId ? { ...r, label: v } : r)) }));
  const delRound = (rid) => {
    const r = deal.rounds.find((x) => x.id === rid);
    if (!r) return;
    if (deal.rounds.length <= 1) { alert("Can't delete the only round."); return; }
    if (isBaselineRound(r)) { alert("The \u201cAligned internally\u201d baseline can't be deleted \u2014 the savings figure is measured against it."); return; }
    if (!confirm("Delete round \u201c" + r.label + "\u201d? This can't be undone.")) return;
    const remaining = deal.rounds.filter((x) => x.id !== rid);
    const newCurrent = deal.currentRoundId === rid ? remaining[remaining.length - 1].id : deal.currentRoundId;
    update(deal.id, (d) => ({
      ...d,
      rounds: d.rounds.filter((x) => x.id !== rid),
      currentRoundId: d.currentRoundId === rid ? remaining[remaining.length - 1].id : d.currentRoundId,
      changeLog: [{ ts: new Date().toISOString(), who: d.accountManager || "POC", field: "Round removed", from: r.label, to: "\u2014" }].concat(d.changeLog || []),
      updatedAt: new Date().toISOString()
    }));
    if (roundId === rid) setRoundId(newCurrent);
  };

  return html`<${Panel} title="Negotiation rounds"
    action=${html`<div class="flex gap-2">${deal.currentRoundId !== roundId && html`<${GhostBtn} onClick=${setCurrent}>Set as current<//>`}<${GhostBtn} onClick=${addRound}>+ Round<//></div>`}>
    <div class="flex flex-wrap gap-2">
      ${deal.rounds.map((r) => html`<div key=${r.id}
        class=${cx("group relative rounded-lg border px-3 py-2 pr-8 text-left transition", r.id === roundId ? "border-brand-500/60 bg-brand-500/10" : "border-white/10 bg-ink-850 hover:bg-white/5")}>
        <button onClick=${() => setRoundId(r.id)} class="block text-left">
          <div class="flex items-center gap-2 text-xs font-semibold text-slate-100">${r.label}${r.id === deal.currentRoundId && html`<span class="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">current</span>`}</div>
          <div class="text-[11px] text-slate-400">${r.date} \u00b7 ${fmtMoney(r.terms.mgAmount, r.terms.mgCurrency)}</div>
        </button>
        ${!isBaselineRound(r) && deal.rounds.length > 1 && html`<button onClick=${() => delRound(r.id)} title="Delete round"
          class="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded text-slate-500 opacity-60 transition hover:bg-rose-500/15 hover:text-rose-300 hover:opacity-100"><${Icon} name="x" size=${12} /></button>`}
      </div>`)}
    </div>
    <div class="mt-3 flex items-center gap-2">
      <input value=${(deal.rounds.find((r) => r.id === roundId) || {}).label || ""} onInput=${(e) => renameRound(e.target.value)}
        class=${cx(inputCls, "max-w-xs")} placeholder="Round label" />
    </div>
  <//>`;
}

/* ------- Terms editor ------- */
const MG_DATE_MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const MG_CAL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MG_CAL_WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
function mgPaidDateValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/);
  if (iso) return iso[1] + "-" + String(iso[2]).padStart(2, "0") + "-" + String(iso[3] || "1").padStart(2, "0");
  const short = raw.match(/^([A-Za-z]{3})'?(\d{2})$/);
  if (short && MG_DATE_MONTHS[short[1].toLowerCase()] != null) {
    return "20" + short[2] + "-" + String(MG_DATE_MONTHS[short[1].toLowerCase()] + 1).padStart(2, "0") + "-01";
  }
  return "";
}
function mgPaidDateObject(value) {
  const iso = mgPaidDateValue(value);
  if (!iso) return null;
  const parts = iso.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}
function mgDateIso(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}
function mgSameDay(a, b) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function mgDateLabel(value) {
  const d = mgPaidDateObject(value);
  if (d) return String(d.getDate()).padStart(2, "0") + " " + MG_CAL_MONTHS[d.getMonth()].slice(0, 3) + " " + d.getFullYear();
  return value || "Select date";
}
function mgPaidDisplay(value) {
  const parsed = typeof payPeriodInfo === "function" ? payPeriodInfo(value) : null;
  return parsed && parsed.label && parsed.label !== "\u2014" ? parsed.label : (value || "Round date");
}
function PaymentDatePicker({ value, onChange }) {
  const selected = mgPaidDateObject(value);
  const initial = selected || new Date();
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const [popup, setPopup] = useState({ left: 0, top: 0, width: 288 });
  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const positionPanel = () => {
    const trigger = wrapRef.current && wrapRef.current.querySelector('[data-mg-datepicker="trigger"]');
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const main = document.querySelector("main");
    const mainRect = main ? main.getBoundingClientRect() : null;
    const pad = 12;
    const minLeft = Math.max(pad, mainRect ? mainRect.left + pad : pad);
    const availableWidth = Math.max(180, window.innerWidth - minLeft - pad);
    const width = Math.min(288, availableWidth);
    const maxLeft = Math.max(minLeft, window.innerWidth - width - pad);
    const left = Math.min(Math.max(r.right - width, minLeft), maxLeft);
    const panelHeight = panelRef.current ? panelRef.current.offsetHeight : 365;
    let top = r.bottom + 8;
    if (top + panelHeight > window.innerHeight - pad && r.top - panelHeight - 8 > pad) top = r.top - panelHeight - 8;
    top = Math.max(pad, Math.min(top, window.innerHeight - panelHeight - pad));
    setPopup({ left, top, width });
  };
  useEffect(() => {
    if (!open) return;
    const d = mgPaidDateObject(value) || new Date();
    setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [open, value]);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    positionPanel();
    const raf = requestAnimationFrame(positionPanel);
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
    };
  }, [open, viewDate, value]);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const cells = Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - firstDay + i));
  const today = new Date();
  const moveMonth = (delta) => setViewDate(new Date(year, month + delta, 1));
  const chooseDate = (d) => { onChange(mgDateIso(d)); setOpen(false); };
  return html`<div ref=${wrapRef} class="relative">
    <button type="button" data-mg-datepicker="trigger" onClick=${() => setOpen(!open)} aria-haspopup="dialog" aria-expanded=${open}
      class=${cx(inputCls, "flex items-center justify-between gap-3 text-left cursor-pointer pr-3")}>
      <span class=${value ? "text-slate-100" : "text-slate-500"}>${value ? mgDateLabel(value) : "Round date"}</span>
      <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-brand-300 shadow-[0_0_18px_rgba(229,31,79,.18)]">
        <${Icon} name="calendar" size=${15} />
      </span>
    </button>
    ${open && html`<div ref=${panelRef} role="dialog" data-mg-datepicker="panel" style=${{ left: popup.left + "px", top: popup.top + "px", width: popup.width + "px" }} class="fixed z-[80] max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-2xl border border-white/10 bg-ink-900 p-3 text-slate-100 shadow-pop ring-1 ring-brand-500/15 fade-in">
      <div class="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/60 to-transparent"></div>
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          <div class="text-sm font-semibold text-white">${MG_CAL_MONTHS[month]} ${year}</div>
          <div class="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">MG recovery date</div>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" onClick=${() => moveMonth(-1)} class="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 transition hover:border-brand-500/40 hover:bg-brand-500/10 hover:text-brand-300"><${Icon} name="back" size=${15} /></button>
          <button type="button" onClick=${() => moveMonth(1)} class="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 transition hover:border-brand-500/40 hover:bg-brand-500/10 hover:text-brand-300"><${Icon} name="back" size=${15} className="rotate-180" /></button>
        </div>
      </div>
      <div class="grid grid-cols-7 gap-1">
        ${MG_CAL_WEEKDAYS.map((d, i) => html`<div key=${d + i} class="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">${d}</div>`)}
        ${cells.map((d) => {
          const inMonth = d.getMonth() === month;
          const isSelected = mgSameDay(d, selected);
          const isToday = mgSameDay(d, today);
          return html`<button key=${mgDateIso(d)} type="button" data-mg-date=${mgDateIso(d)} onClick=${() => chooseDate(d)}
            class=${cx("relative flex h-8 items-center justify-center rounded-lg text-sm font-semibold transition",
              isSelected ? "bg-brand-500 text-white shadow-[0_10px_26px_-12px_rgba(229,31,79,.9)] ring-1 ring-brand-300/60" :
              inMonth ? "text-slate-100 hover:bg-brand-500/12 hover:text-brand-300" : "text-slate-600 hover:bg-white/[0.04] hover:text-slate-400",
              isToday && !isSelected ? "ring-1 ring-brand-400/40" : "")}>
            ${d.getDate()}
          </button>`;
        })}
      </div>
      <div class="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <button type="button" onClick=${() => { onChange(""); setOpen(false); }} class="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-200">Clear</button>
        <button type="button" onClick=${() => chooseDate(new Date())} class="rounded-lg bg-brand-500/15 px-3 py-1.5 text-xs font-semibold text-brand-300 ring-1 ring-brand-500/30 transition hover:bg-brand-500/25 hover:text-brand-200">Today</button>
      </div>
    </div>`}
  </div>`;
}
function TermsEditor({ t, setTerm, round, deal }) {
  const toggleDed = (d) => { const has = (t.deductions || []).includes(d); setTerm("deductions", has ? t.deductions.filter((x) => x !== d) : (t.deductions || []).concat([d])); };
  const revMax = dealRevMax(deal);
  const revOver = revMax != null && t.revSharePct != null && t.revSharePct > revMax;
  return html`<${Panel} title=${"Commercial terms \u00b7 " + round.label}>
    <div class="grid grid-cols-2 gap-4 md:grid-cols-3">
      <${Field} label="Payable MG"><div class="flex gap-1.5">
        <div class="flex-1"><${NumInput} value=${t.mgAmount} onChange=${(v) => setTerm("mgAmount", v)} placeholder="0" /></div>
        <select value=${t.mgCurrency} onChange=${(e) => setTerm("mgCurrency", e.target.value)} class=${cx(inputCls, "w-20 cursor-pointer")}>${["EUR", "USD", "GBP"].map((c) => html`<option key=${c}>${c}</option>`)}</select>
      </div></${Field}>
      <${Field} label="Basis"><${Select} value=${t.mgBasis} onChange=${(v) => setTerm("mgBasis", v)} options=${["Per deal", "Per IP", "Per title"]} /></${Field}>
      <${Field} label="Recoupable"><${Select} value=${t.mgRecoupable ? "Yes" : "No"} onChange=${(v) => setTerm("mgRecoupable", v === "Yes")} options=${["Yes", "No"]} /></${Field}>
      <${Field} label="MG paid month" hint="blank = round date"><${PaymentDatePicker} value=${t.mgPaidOn || ""} onChange=${(v) => setTerm("mgPaidOn", v)} /></${Field}>

      <${Field} label="Rev share" hint=${revMax != null ? "matrix max " + revMax + "%" : ""}>
        <${NumInput} value=${t.revSharePct} onChange=${(v) => setTerm("revSharePct", v)} suffix="%" className=${revOver ? "!border-rose-500/70 focus:!ring-rose-500/20" : ""} />
        ${revOver && html`<div class="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-400">Exceeds matrix max of ${revMax}% \u2014 needs escalation</div>`}
      </${Field}>
      <${Field} label="Rev share base"><${Select} value=${t.revShareBase} onChange=${(v) => setTerm("revShareBase", v)} options=${["Net", "Gross"]} /></${Field}>
      <${Field} label="Cost cap" hint="of Gross, optional"><${NumInput} value=${t.capPct} onChange=${(v) => setTerm("capPct", v)} suffix="%" placeholder="none" /></${Field}>

      <${Field} label="Min term"><${NumInput} value=${t.minTermYears} onChange=${(v) => setTerm("minTermYears", v)} suffix="yrs" /></${Field}>
      <${Field} label="Territory"><input value=${t.territory} onChange=${(e) => setTerm("territory", e.target.value)} class=${inputCls} /></${Field}>
      <${Field} label="Languages" hint="comma"><input value=${(t.languages || []).join(", ")} onChange=${(e) => setTerm("languages", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} class=${inputCls} /></${Field}>

      <${Field} label="Rights"><${Select} value=${t.rights} onChange=${(v) => setTerm("rights", v)} options=${RIGHTS_OPTS} /></${Field}>
      <${Field} label="Exclusivity"><${Select} value=${t.exclusivity} onChange=${(v) => setTerm("exclusivity", v)} options=${EXCL_OPTS} /></${Field}>
      <${Field} label="Reservation of rights"><${Select} value=${t.reservationOfRights} onChange=${(v) => setTerm("reservationOfRights", v)} options=${["Yes", "No"]} /></${Field}>
    </div>

    <div class="mt-4">
      <div class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Allowed deductions / recoupment</div>
      <div class="flex flex-wrap gap-2">
        ${DEDUCTIONS.map((d) => { const on = (t.deductions || []).includes(d); return html`<button key=${d} onClick=${() => toggleDed(d)}
          class=${cx("rounded-lg border px-3 py-1.5 text-xs font-medium transition", on ? "border-brand-500/60 bg-brand-500/15 text-brand-400" : "border-white/10 bg-ink-850 text-slate-400 hover:text-slate-200")}>${on ? "\u2713 " : ""}${d}</button>`; })}
      </div>
    </div>
    <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      <${Field} label="MG for future titles"><${Select} value=${t.mgFutureTitles} onChange=${(v) => setTerm("mgFutureTitles", v)} options=${["Same as current per title", "To be decided later"]} /></${Field}>
      <${Field} label="Additional conditions"><input value=${t.additionalConditions} onChange=${(e) => setTerm("additionalConditions", e.target.value)} class=${inputCls} placeholder="free text" /></${Field}>
    </div>
  <//>`;
}

/* ------- Payment terms inheritance / overrides ------- */
function PaymentReadinessCard({ deal }) {
  const s = paymentReadinessForDeal(deal);
  const line = (label, value) => html`<div class="flex items-center justify-between border-b border-white/[0.04] py-2 text-sm last:border-0"><span class="text-slate-400">${label}</span><span class="tnum font-semibold text-slate-100">${value}</span></div>`;
  return html`<${Panel} title="Payment readiness">
    ${line("IP terms ready", s.readyCount + " / " + s.total)}
    ${line("Term structure", s.customCount ? "Deal default + " + s.customCount + " override" + (s.customCount === 1 ? "" : "s") : "Deal default")}
    ${line("Status", html`<span class=${s.ready ? "text-emerald-300" : "text-amber-300"}>${s.ready ? "Ready for Payments" : "Needs commercial terms"}</span>`)}
    ${!s.ready && html`<div class="mt-2 text-[11px] leading-relaxed text-amber-200/80">Missing: ${s.missing.join(", ")}</div>`}
  <//>`;
}

function patchIpPayment(update, deal, idx, patch) {
  update(deal.id, (d) => ({
    ...d,
    ips: d.ips.map((ip, i) => {
      if (i !== idx) return ip;
      const inherited = clonePaymentTerms(effectivePaymentTerms(d, ip));
      return { ...ip, paymentTermsMode: "custom", paymentTerms: { ...inherited, ...(ip.paymentTerms || {}), ...patch } };
    }),
    updatedAt: new Date().toISOString()
  }));
}
function setIpPaymentMode(update, deal, idx, mode) {
  update(deal.id, (d) => ({
    ...d,
    ips: d.ips.map((ip, i) => {
      if (i !== idx) return ip;
      if (mode === "deal") {
        const next = { ...ip, paymentTermsMode: "deal" };
        delete next.paymentTerms;
        return next;
      }
      return { ...ip, paymentTermsMode: "custom", paymentTerms: clonePaymentTerms(effectivePaymentTerms(d, ip)) };
    }),
    updatedAt: new Date().toISOString()
  }));
}
function PaymentTermsByIpPanel({ deal, update }) {
  const summary = paymentReadinessForDeal(deal);
  const activeIps = (deal.ips || []).filter((ip) => !ip.dropped);
  return html`<${Panel} title="Payment terms by IP"
    action=${html`<span class=${cx("rounded-lg border px-2 py-1 text-[11px] font-semibold", summary.ready ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300" : "border-amber-400/25 bg-amber-500/10 text-amber-300")}>${summary.ready ? "Payment ready" : "Needs terms"}</span>`}>
    <div class="mb-4 rounded-xl border border-white/[0.06] bg-ink-850 px-3 py-2 text-xs leading-relaxed text-slate-400">
      Default behavior: the current deal terms apply to every IP. Turn on <span class="font-semibold text-slate-200">Custom</span> only for an IP that negotiated different MG, rev share, cap, recoupment, or recovery month.
    </div>
    <div class="space-y-3">
      ${activeIps.map((ip, i) => {
        const realIdx = (deal.ips || []).indexOf(ip);
        const terms = effectivePaymentTerms(deal, ip);
        const ready = paymentReadinessForIp(deal, ip);
        const custom = ipUsesCustomPaymentTerms(ip);
        const toggleDed = (name) => {
          const deductions = terms.deductions || [];
          const has = deductions.includes(name);
          patchIpPayment(update, deal, realIdx, { deductions: has ? deductions.filter((d) => d !== name) : deductions.concat([name]) });
        };
        return html`<div key=${ip.id || ip.ipId || realIdx} class="rounded-xl border border-white/[0.07] bg-ink-850 p-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="truncate text-sm font-semibold text-slate-100">${ip.series || "Untitled IP"}</div>
              <div class="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                ${ip.ipId && html`<${IdChip} id=${ip.ipId} title="IP ID" />`}
                <span>${custom ? "Custom IP terms" : "Uses deal default"}</span>
                <span class=${ready.ready ? "text-emerald-300" : "text-amber-300"}>${ready.ready ? "ready" : "missing " + ready.missing.join(", ")}</span>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <button onClick=${() => setIpPaymentMode(update, deal, realIdx, "deal")} class=${cx("rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition", !custom ? "border-brand-500/50 bg-brand-500/15 text-brand-300" : "border-white/10 text-slate-400 hover:text-slate-200")}>Deal default</button>
              <button onClick=${() => setIpPaymentMode(update, deal, realIdx, "custom")} class=${cx("rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition", custom ? "border-brand-500/50 bg-brand-500/15 text-brand-300" : "border-white/10 text-slate-400 hover:text-slate-200")}>Custom</button>
            </div>
          </div>
          <div class="mt-3 grid gap-3 text-xs sm:grid-cols-3">
            <div class="rounded-lg border border-white/[0.05] bg-black/10 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wide text-slate-500">Effective MG</div>
              <div class="mt-1 font-semibold text-slate-200">${fmtMoney(terms.mgAmount, terms.mgCurrency)} · ${terms.mgBasis}${terms.mgRecoupable === false ? " · NR" : ""}</div>
            </div>
            <div class="rounded-lg border border-white/[0.05] bg-black/10 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wide text-slate-500">Rev share</div>
              <div class="mt-1 font-semibold text-slate-200">${terms.revSharePct || 0}% ${terms.revShareBase || "Net"}${terms.capPct != null && terms.capPct !== "" ? " · cap " + terms.capPct + "%" : ""}</div>
            </div>
            <div class="rounded-lg border border-white/[0.05] bg-black/10 px-3 py-2">
              <div class="text-[10px] uppercase tracking-wide text-slate-500">Recovery month</div>
              <div class="mt-1 font-semibold text-slate-200">${mgPaidDisplay(terms.mgPaidOn)}</div>
            </div>
          </div>
          ${custom && html`<div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <${Field} label="MG"><${NumInput} value=${terms.mgAmount} onChange=${(v) => patchIpPayment(update, deal, realIdx, { mgAmount: v })} /></${Field}>
            <${Field} label="Currency"><${Select} value=${terms.mgCurrency || "EUR"} onChange=${(v) => patchIpPayment(update, deal, realIdx, { mgCurrency: v })} options=${["EUR", "USD", "GBP"]} /></${Field}>
            <${Field} label="Basis"><${Select} value=${terms.mgBasis || "Per deal"} onChange=${(v) => patchIpPayment(update, deal, realIdx, { mgBasis: v })} options=${["Per deal", "Per IP", "Per title"]} /></${Field}>
            <${Field} label="Recoupable"><${Select} value=${terms.mgRecoupable ? "Yes" : "No"} onChange=${(v) => patchIpPayment(update, deal, realIdx, { mgRecoupable: v === "Yes" })} options=${["Yes", "No"]} /></${Field}>
            <${Field} label="Rev share"><${NumInput} value=${terms.revSharePct} onChange=${(v) => patchIpPayment(update, deal, realIdx, { revSharePct: v })} suffix="%" /></${Field}>
            <${Field} label="Rev base"><${Select} value=${terms.revShareBase || "Net"} onChange=${(v) => patchIpPayment(update, deal, realIdx, { revShareBase: v })} options=${["Net", "Gross"]} /></${Field}>
            <${Field} label="Cost cap"><${NumInput} value=${terms.capPct} onChange=${(v) => patchIpPayment(update, deal, realIdx, { capPct: v })} suffix="%" placeholder="none" /></${Field}>
            <${Field} label="MG paid month"><${PaymentDatePicker} value=${terms.mgPaidOn || ""} onChange=${(v) => patchIpPayment(update, deal, realIdx, { mgPaidOn: v })} /></${Field}>
            <div class="col-span-2 md:col-span-4">
              <div class="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Deductions</div>
              <div class="flex flex-wrap gap-2">${DEDUCTIONS.map((name) => {
                const on = (terms.deductions || []).includes(name);
                return html`<button key=${name} onClick=${() => toggleDed(name)} class=${cx("rounded-lg border px-2.5 py-1.5 text-xs font-medium", on ? "border-brand-500/50 bg-brand-500/15 text-brand-300" : "border-white/10 text-slate-400")}>${on ? "\u2713 " : ""}${name}</button>`;
              })}</div>
            </div>
          </div>`}
        </div>`;
      })}
      ${activeIps.length === 0 && html`<div class="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">Add active IPs before payment terms can be prepared.</div>`}
    </div>
  <//>`;
}

/* ------- Links / Comments / Change log ------- */
function LinksCard({ deal, update }) {
  const set = (k, v) => update(deal.id, (d) => ({ ...d, links: { ...d.links, [k]: v } }));
  const [edit, setEdit] = useState(false);
  return html`<${Panel} title="Documents" action=${html`<${GhostBtn} onClick=${() => setEdit(!edit)}>${edit ? "Done" : "Edit"}<//>`}>
    ${edit ? html`<div class="space-y-2">
      ${["contract", "offer", "source"].map((k) => html`<${Field} key=${k} label=${k}><input value=${(deal.links || {})[k] || ""} onChange=${(e) => set(k, e.target.value)} class=${inputCls} placeholder="paste link" /></${Field}>`)}
      <div class="text-xs text-slate-500">Executed contracts arrive from legal and are stored here as links.</div>
    </div>` : html`<div class="flex flex-wrap gap-2">
      <${LinkChip} label="Contract" url=${(deal.links || {}).contract} />
      <${LinkChip} label="Offer" url=${(deal.links || {}).offer} />
      <${LinkChip} label="Source" url=${(deal.links || {}).source} />
      ${!((deal.links || {}).contract || (deal.links || {}).offer || (deal.links || {}).source) && html`<span class="text-sm text-slate-500">No links yet.</span>`}
    </div>`}
  <//>`;
}

function CommentsCard({ deal, update }) {
  const [txt, setTxt] = useState("");
  const add = () => { if (!txt.trim()) return; update(deal.id, (d) => ({ ...d, comments: [{ id: uid("c"), author: d.accountManager || "AM", text: txt.trim(), ts: new Date().toISOString() }].concat(d.comments || []) })); setTxt(""); };
  return html`<${Panel} title="Comments / rationale">
    <div class="mb-3 flex gap-2">
      <input value=${txt} onInput=${(e) => setTxt(e.target.value)} onKeyDown=${(e) => e.key === "Enter" && add()} placeholder="Why this term? Add context" class=${inputCls} />
      <${GhostBtn} onClick=${add}>Post<//>
    </div>
    <div class="space-y-3">
      ${(deal.comments || []).map((c) => html`<div key=${c.id} class="rounded-lg bg-ink-850 p-3">
        <div class="mb-0.5 flex items-center gap-2 text-xs text-slate-400"><span class="font-semibold text-slate-300">${c.author}</span><span>${(c.ts || "").slice(0, 10)}</span></div>
        <div class="text-sm text-slate-200">${c.text}</div>
      </div>`)}
      ${(deal.comments || []).length === 0 && html`<div class="text-sm text-slate-500">No comments yet.</div>`}
    </div>
  <//>`;
}

function ChangeLogCard({ deal }) {
  const log = deal.changeLog || [];
  return html`<${Panel} title=${"Change log (" + log.length + ")"}>
    <div class="max-h-72 space-y-2 overflow-y-auto">
      ${log.slice(0, 40).map((l, i) => html`<div key=${i} class="border-b border-white/5 pb-2 text-xs">
        <div class="text-slate-300"><span class="font-semibold">${l.field}</span> ${l.round ? html`<span class="text-slate-500">\u00b7 ${l.round}</span>` : ""}</div>
        <div class="text-slate-400">${fmtAny(l.from)} <span class="text-slate-600">\u2192</span> <span class="text-slate-200">${fmtAny(l.to)}</span></div>
        <div class="text-slate-600">${l.who} \u00b7 ${(l.ts || "").slice(0, 16).replace("T", " ")}</div>
      </div>`)}
      ${log.length === 0 && html`<div class="text-sm text-slate-500">No changes recorded yet. Edit a term to see history.</div>`}
    </div>
  <//>`;
}
function fmtAny(v) { if (v == null || v === "") return "\u2014"; if (Array.isArray(v)) return v.join(", "); if (v === true) return "Yes"; if (v === false) return "No"; return String(v); }

/* ------- Existing-entity resolver (FEATURE-3) ------- */
function EntitySearch({ entities, onPick }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return entities.filter((e) => (e.name + " " + (e.entityId || "")).toLowerCase().includes(s)).slice(0, 8);
  }, [q, entities]);
  return html`<div class="relative">
    <${TextInput} value=${q} placeholder="Search your entities by name or ID (e.g. Moa, ENT-AUTH-01)"
      onInput=${(e) => { setQ(e.target.value); setOpen(true); }} onFocus=${() => setOpen(true)} />
    ${open && results.length > 0 && html`<div class="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-ink-800 shadow-2xl fade-in">
      ${results.map((e) => html`<button key=${e.entityId || e.key} type="button"
        onClick=${() => { onPick(e); setQ(""); setOpen(false); }}
        class="flex w-full items-center justify-between gap-3 border-b border-white/5 px-3 py-2 text-left transition hover:bg-brand-500/10">
        <div><div class="text-sm font-medium text-slate-100">${e.name}</div><div class=${cx("text-xs font-medium", TYPE_STYLE[e.type])}>${e.type}</div></div>
        <div class="text-right text-xs"><div class="font-mono text-slate-400">${e.entityId}</div><div class="text-slate-500">${e.deals} ${e.deals === 1 ? "deal" : "deals"}</div></div>
      </button>`)}
    </div>`}
  </div>`;
}

/* ------- Unified repository / sheet / manual search ------- */
function sourceLabel(source) {
  return ({ current: "Current", repository: "DB", sheet: "Sheet", manual: "New" })[source] || source || "Result";
}
function sourceClass(source) {
  return ({
    current: "border-sky-400/25 bg-sky-500/10 text-sky-300",
    repository: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
    sheet: "border-violet-400/25 bg-violet-500/10 text-violet-300",
    manual: "border-amber-400/25 bg-amber-500/10 text-amber-300"
  })[source] || "border-white/10 bg-white/[0.04] text-slate-300";
}
function resultEntityName(r) {
  return r.entityName || r.name || r.leadEntity || r.publisherAuthor || r.author || "";
}
function inferResultType(r) {
  if (r.entityType || r.type) return r.entityType || r.type;
  const g = String(r.groupType || "");
  if (/agent/i.test(g)) return "Agent";
  if (/author|self/i.test(g)) return "Author";
  return "Publisher";
}
function ipFromResult(r) {
  return {
    sourceKey: r.sourceKey || r.source_key || "",
    series: r.series || r.ip || r.name || "",
    asin: r.asin || "",
    genre: r.genre || "",
    lengthHrs: r.lengthHrs != null ? r.lengthHrs : r.durationHrs,
    totalBooks: r.totalBooks,
    rating: r.rating,
    numRatings: r.numRatings,
    amazon: r.amazon || "",
    goodreads: r.goodreads || "",
    links: r.links || [],
    titlesInScope: r.titlesInScope || "All",
    source: r.source || "sheet"
  };
}
function resultKey(r) {
  return [r.kind, r.source, r.entityId || r.entityKey || "", r.ipId || r.id || r.series || r.name || r.entityName || ""].join("|").toLowerCase();
}
function currentDealSearchResults(deals, query) {
  const s = query.trim().toLowerCase();
  if (s.length < 2) return [];
  const rows = [];
  appEntityList(deals || []).forEach((e) => {
    const hay = (e.name + " " + (e.entityId || "") + " " + (e.type || "")).toLowerCase();
    if (hay.includes(s)) rows.push({ kind: "entity", source: "current", entityName: e.name, name: e.name, entityType: e.type, entityId: e.entityId, seriesCount: e.deals });
  });
  (deals || []).forEach((d) => (d.ips || []).forEach((ip) => {
    const hay = ((ip.series || "") + " " + (ip.ipId || "") + " " + d.entityName + " " + (ip.genre || "")).toLowerCase();
    if (hay.includes(s)) rows.push({ ...ip, kind: "ip", source: "current", entityName: d.entityName, entityType: d.entityType, entityId: d.entityId, entityKey: d.scoutEntityKey, author: d.author, ipId: ip.ipId });
  }));
  return rows.slice(0, 8);
}
function currentEntitySearchResults(deals, query) {
  const s = query.trim().toLowerCase();
  if (s.length < 2) return [];
  return appEntityList(deals || []).filter((e) => {
    const hay = (e.name + " " + (e.entityId || "") + " " + (e.type || "")).toLowerCase();
    return hay.includes(s);
  }).map((e) => ({ kind: "entity", source: "current", entityName: e.name, name: e.name, entityType: e.type, entityId: e.entityId, seriesCount: e.deals })).slice(0, 8);
}
function sheetEntitySearchResults(query) {
  const s = query.trim().toLowerCase();
  if (s.length < 2) return [];
  const rows = typeof ENTITY_INDEX !== "undefined" ? ENTITY_INDEX : [];
  return rows.filter((e) => (e.leadEntity + " " + (e.author || "") + " " + (e.groupType || "")).toLowerCase().includes(s))
    .map((e) => ({ ...e, kind: "entity", source: "sheet", entityName: e.leadEntity, name: e.leadEntity, entityType: inferResultType(e), entityKey: e.key }))
    .slice(0, 8);
}
function entityMatchesSelection(r, entityName, entityKey) {
  const targetName = normName(entityName);
  const rowName = normName(resultEntityName(r));
  if (targetName && rowName && targetName === rowName) return true;
  if (entityKey && r.entityKey && normName(entityKey) === normName(r.entityKey)) return true;
  return false;
}
function ipPickerKey(r, entityName) {
  return [normName(resultEntityName(r) || entityName), normName(r.series || r.ip || r.name)].join("|");
}
function isClosedIpForEntity(deals, entityName, r) {
  const targetName = normName(entityName || resultEntityName(r));
  const series = normName(r.series || r.ip || r.name);
  const ipId = normName(r.ipId);
  if (!targetName || (!series && !ipId)) return false;
  return (deals || []).some((deal) => {
    if (!isClosedDeal(deal) || normName(deal.entityName) !== targetName) return false;
    return (deal.ips || []).some((ip) => (series && normName(ip.series) === series) || (ipId && normName(ip.ipId) === ipId));
  });
}
function isSelectedIp(selectedIps, r) {
  const series = normName(r.series || r.ip || r.name);
  return (selectedIps || []).some((ip) => normName(ip.series) === series);
}
function currentIpsForEntity(deals, entityName, query) {
  const s = query.trim().toLowerCase();
  const rows = [];
  (deals || []).forEach((deal) => {
    if (normName(deal.entityName) !== normName(entityName)) return;
    if (isClosedDeal(deal)) return;
    (deal.ips || []).forEach((ip) => {
      const hay = ((ip.series || "") + " " + (ip.ipId || "") + " " + (ip.genre || "")).toLowerCase();
      if (s && !hay.includes(s)) return;
      rows.push({ ...ip, kind: "ip", source: "current", entityName: deal.entityName, entityType: deal.entityType, entityId: deal.entityId, entityKey: deal.scoutEntityKey, author: deal.author, ipId: ip.ipId });
    });
  });
  return rows.slice(0, 20);
}
function sheetIpsForEntity(entityName, query) {
  const s = query.trim().toLowerCase();
  return (window.SCOUT_DATA || []).filter((r) => {
    if (normName(resultEntityName(r)) !== normName(entityName)) return false;
    const hay = ((r.series || "") + " " + (r.author || "") + " " + (r.genre || "")).toLowerCase();
    return !s || hay.includes(s);
  }).map((r) => ({ ...r, kind: "ip", source: "sheet", entityName: resultEntityName(r), entityType: inferResultType(r), entityKey: entityKeyOf(r) })).slice(0, 40);
}
function EntityDealSearch({ deals, onPick }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState([]);
  const [loading, setLoading] = useState(false);
  const local = useMemo(() => currentEntitySearchResults(deals, q), [deals, q]);
  useEffect(() => {
    const s = q.trim();
    let active = true;
    if (s.length < 2 || !window.PFMBackend) { setRemote([]); setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(() => {
      window.PFMBackend.search(s, { limit: 20, kind: "entity" })
        .then((rows) => { if (active) setRemote((rows || []).filter((r) => r.kind === "entity")); })
        .catch(() => { if (active) setRemote([]); })
        .finally(() => { if (active) setLoading(false); });
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [q]);
  const results = useMemo(() => {
    const seen = {};
    const out = [];
    local.concat(remote || []).forEach((r) => {
      const key = normName(resultEntityName(r));
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(r);
    });
    return out.slice(0, 12);
  }, [local, remote]);
  return html`<div class="relative">
    <div class="relative">
      <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><${Icon} name="search" size=${16} /></span>
      <input value=${q} onInput=${(e) => { setQ(e.target.value); setOpen(true); }} onFocus=${() => setOpen(true)}
        placeholder="Search publisher / entity"
        class=${cx(inputCls, "pl-10")} />
      ${loading && html`<span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-500">Checking...</span>`}
    </div>
    ${open && results.length > 0 && html`<div class="absolute z-40 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-white/10 bg-ink-800 shadow-2xl fade-in">
      ${results.map((r) => html`<button key=${"entity-" + normName(resultEntityName(r))} type="button"
        onClick=${() => { onPick(r); setQ(""); setOpen(false); }}
        class="flex w-full items-start justify-between gap-3 border-b border-white/5 px-3 py-2.5 text-left transition last:border-0 hover:bg-brand-500/10">
        <div class="min-w-0">
          <div class="truncate text-sm font-medium text-slate-100">${resultEntityName(r)}</div>
          <div class="mt-0.5 truncate text-xs text-slate-400">${inferResultType(r)}${r.entityId ? " · " + r.entityId : ""}${r.seriesCount ? " · " + r.seriesCount + " titles" : ""}</div>
        </div>
        <span class=${cx("shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", sourceClass(r.source))}>${sourceLabel(r.source)}</span>
      </button>`)}
    </div>`}
  </div>`;
}
function IPTitleSearch({ deals, entityName, entityKey, selectedIps, onPick }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState([]);
  const [loading, setLoading] = useState(false);
  const local = useMemo(() => {
    if (!entityName) return [];
    return currentIpsForEntity(deals, entityName, q);
  }, [deals, entityName, q]);
  useEffect(() => {
    let active = true;
    if (!entityName || !window.PFMBackend) { setRemote([]); setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(() => {
      window.PFMBackend.search(q.trim(), { limit: 40, kind: "ip", entityName, entityKey })
        .then((rows) => { if (active) setRemote((rows || []).filter((r) => r.kind === "ip")); })
        .catch(() => { if (active) setRemote([]); })
        .finally(() => { if (active) setLoading(false); });
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [q, entityName, entityKey]);
  const results = useMemo(() => {
    const seen = {};
    const out = [];
    local.concat(remote || []).forEach((r) => {
      if (!entityMatchesSelection(r, entityName, entityKey)) return;
      if (isClosedIpForEntity(deals, entityName, r) || isSelectedIp(selectedIps, r)) return;
      const key = ipPickerKey(r, entityName);
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(r);
    });
    const manual = q.trim();
    if (manual.length >= 2) {
      const manualRow = { kind: "manual-ip", source: "manual", series: manual, entityName };
      if (!seen[ipPickerKey(manualRow, entityName)] && !isClosedIpForEntity(deals, entityName, manualRow) && !isSelectedIp(selectedIps, manualRow)) out.push(manualRow);
    }
    return out.slice(0, 18);
  }, [local, remote, deals, entityName, entityKey, selectedIps, q]);
  if (!entityName) return html`<div class=${cx(inputCls, "flex items-center text-slate-500")}>Select a publisher / entity first</div>`;
  return html`<div class="relative">
    <div class="relative">
      <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><${Icon} name="search" size=${16} /></span>
      <input value=${q} onInput=${(e) => { setQ(e.target.value); setOpen(true); }} onFocus=${() => setOpen(true)}
        placeholder="Search title / IP under this entity"
        class=${cx(inputCls, "pl-10")} />
      ${loading && html`<span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-500">Checking...</span>`}
    </div>
    ${open && results.length > 0 && html`<div class="absolute z-40 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-white/10 bg-ink-800 shadow-2xl fade-in">
      ${results.map((r) => html`<button key=${ipPickerKey(r, entityName)} type="button"
        onClick=${() => { onPick(r); setQ(""); setOpen(false); }}
        class="flex w-full items-start justify-between gap-3 border-b border-white/5 px-3 py-2.5 text-left transition last:border-0 hover:bg-brand-500/10">
        <div class="min-w-0">
          <div class="truncate text-sm font-medium text-slate-100">${r.kind === "manual-ip" ? `Use "${r.series}" as a new IP` : r.series}</div>
          <div class="mt-0.5 truncate text-xs text-slate-400">${r.kind === "manual-ip" ? entityName : `${r.genre || "No genre"}${r.ipId ? " · " + r.ipId : ""}${r.rating ? " · " + r.rating + " rating" : ""}`}</div>
        </div>
        <span class=${cx("shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", sourceClass(r.source))}>${sourceLabel(r.source)}</span>
      </button>`)}
    </div>`}
    ${open && !loading && results.length === 0 && html`<div class="absolute z-40 mt-1 w-full rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-xs text-slate-500 shadow-2xl">No available titles found for this entity.</div>`}
  </div>`;
}
function UnifiedDealSearch({ deals, onPick }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState([]);
  const [loading, setLoading] = useState(false);
  const local = useMemo(() => currentDealSearchResults(deals, q), [deals, q]);
  useEffect(() => {
    const s = q.trim();
    let active = true;
    if (s.length < 2 || !window.PFMBackend) { setRemote([]); setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(() => {
      window.PFMBackend.search(s, { limit: 12 })
        .then((rows) => { if (active) setRemote(rows || []); })
        .catch(() => { if (active) setRemote([]); })
        .finally(() => { if (active) setLoading(false); });
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [q]);
  const results = useMemo(() => {
    const s = q.trim();
    const seen = {};
    const out = [];
    local.concat(remote || []).forEach((r) => {
      const key = resultKey(r);
      if (seen[key]) return;
      seen[key] = true;
      out.push(r);
    });
    if (s.length >= 2) out.push({ kind: "manual-ip", source: "manual", series: s, entityName: "", entityType: "Author" });
    return out.slice(0, 14);
  }, [local, remote, q]);
  const title = (r) => r.kind === "entity" ? resultEntityName(r) : (r.kind === "manual-ip" ? `Use "${r.series}" as a new IP` : r.series);
  const sub = (r) => {
    if (r.kind === "entity") return `${inferResultType(r)}${r.entityId ? " · " + r.entityId : ""}${r.seriesCount ? " · " + r.seriesCount + " series" : ""}`;
    if (r.kind === "manual-ip") return "Creates a new IP snapshot in the DB when the deal is created";
    return `${resultEntityName(r) || "Unknown entity"}${r.genre ? " · " + r.genre : ""}${r.ipId ? " · " + r.ipId : ""}`;
  };
  return html`<div class="relative">
    <div class="relative">
      <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><${Icon} name="search" size=${16} /></span>
      <input value=${q} onInput=${(e) => { setQ(e.target.value); setOpen(true); }} onFocus=${() => setOpen(true)}
        placeholder="Search existing entity/IP, saved DB repository, or type a new IP"
        class=${cx(inputCls, "pl-10")} />
      ${loading && html`<span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-500">Checking...</span>`}
    </div>
    ${open && results.length > 0 && html`<div class="absolute z-40 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-white/10 bg-ink-800 shadow-2xl fade-in">
      ${results.map((r) => html`<button key=${resultKey(r)} type="button"
        onClick=${() => { onPick(r); setQ(""); setOpen(false); }}
        class="flex w-full items-start justify-between gap-3 border-b border-white/5 px-3 py-2.5 text-left transition last:border-0 hover:bg-brand-500/10">
        <div class="min-w-0">
          <div class="truncate text-sm font-medium text-slate-100">${title(r)}</div>
          <div class="mt-0.5 truncate text-xs text-slate-400">${sub(r)}</div>
        </div>
        <span class=${cx("shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", sourceClass(r.source))}>${sourceLabel(r.source)}</span>
      </button>`)}
    </div>`}
  </div>`;
}

/* ------- New deal ------- */
function NewDeal({ deals, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Author");
  const [am, setAm] = useState("");
  const [ips, setIps] = useState([]);
  const [entityKey, setEntityKey] = useState(null);
  const [resolvedId, setResolvedId] = useState(null); // existing Entity ID when matched
  const [selectedSource, setSelectedSource] = useState(null);
  const entities = useMemo(() => appEntityList(deals || []), [deals]);

  const pickExisting = (e) => { setName(e.name); setType(e.type); setEntityKey(e.key || null); setResolvedId(e.entityId); setIps([]); setSelectedSource("current"); };
  const onName = (v) => { setName(v); setEntityKey(null); const m = entities.find((e) => normName(e.name) === normName(v)); setResolvedId(m ? m.entityId : null); };
  const pickEntity = (r) => {
    setSelectedSource(r.source || null);
    const pickedName = resultEntityName(r);
    setName(pickedName);
    setType(inferResultType(r));
    setEntityKey(r.entityKey || r.key || null);
    const m = entities.find((e) => normName(e.name) === normName(pickedName));
    setResolvedId(r.entityId || (m && m.entityId) || null);
    setIps([]);
  };
  const addSelectedIp = (r) => {
    const ip = ipFromResult(r);
    if (ip.series) setIps((x) => x.some((existing) => normName(existing.series) === normName(ip.series)) ? x : x.concat([ip]));
  };

  // Fuzzy duplicate suggestion: a close-but-not-exact existing entity match.
  const dupMatch = useMemo(() => {
    const n = normName(name);
    if (!n || resolvedId) return null;
    return entities.find((e) => { const en = normName(e.name); return en && (en.includes(n) || n.includes(en)); }) || null;
  }, [name, entities, resolvedId]);

  const willBeId = resolvedId || (name.trim() ? previewEntityId(type, deals || []) : null);

  const create = () => {
    if (!name.trim()) { alert("Entity name required"); return; }
    if (!ips.length) { alert("Select at least one IP/title for this entity"); return; }
    const r0 = { id: uid("r"), label: "Aligned internally", date: new Date().toISOString().slice(0, 10), note: "", terms: defaultTerms() };
    onCreate({ id: uid("deal"), entityName: name.trim(), entityType: type, scoutEntityKey: entityKey, sourceSnapshot: { source: selectedSource, savedToRepository: true }, author: type === "Author" ? name.trim() : "", publisher: type === "Publisher" ? name.trim() : "", agent: type === "Agent" ? name.trim() : "", accountManager: am, reasonForSelection: "", status: "Aligned internally", ips, rounds: [r0], currentRoundId: r0.id, links: { contract: "", offer: "", source: "" }, comments: [], changeLog: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  };

  return html`<div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-6 glass" onClick=${onClose}>
    <div class="mt-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 surface shadow-pop fade-in" onClick=${(e) => e.stopPropagation()}>
      <div class="flex items-center justify-between border-b border-white/[0.06] px-6 py-4"><h2 class="text-[17px] font-semibold tracking-tight text-white">New deal</h2><button onClick=${onClose} class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"><${Icon} name="x" size=${16} /></button></div>
      <div class="space-y-4 p-6">
        <${Field} label="Publisher / entity" hint="publisher name from current app, backend DB, and sheet"><${EntityDealSearch} deals=${deals} onPick=${pickEntity} /></${Field}>

        ${resolvedId && html`<div class="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200">
          <${Icon} name="check" size=${14} /><span>Linked to existing entity <span class="font-mono font-semibold">${resolvedId}</span>. Name and type are locked; this deal attaches to that entity.</span>
        </div>`}
        ${!resolvedId && dupMatch && html`<div class="flex items-center justify-between gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
          <span>Did you mean <span class="font-semibold">${dupMatch.name}</span> (<span class="font-mono">${dupMatch.entityId}</span>)?</span>
          <button onClick=${() => pickExisting(dupMatch)} class="shrink-0 rounded-lg bg-amber-400/20 px-2.5 py-1 font-semibold text-amber-100 transition hover:bg-amber-400/30">Use existing</button>
        </div>`}

        <div class="grid grid-cols-3 gap-3">
          <${Field} label="Entity name"><input value=${name} onInput=${(e) => onName(e.target.value)} disabled=${!!resolvedId} class=${cx(inputCls, resolvedId ? "opacity-60" : "")} /></${Field}>
          <${Field} label="Type"><${Select} value=${type} onChange=${(v) => !resolvedId && setType(v)} options=${["Author", "Publisher", "Agent"]} c=${resolvedId ? "pointer-events-none opacity-60" : ""} /></${Field}>
          <${Field} label="POC"><${Select} value=${am} onChange=${setAm} options=${["", ...POCS]} /></${Field}>
        </div>
        ${willBeId && html`<div class="flex items-center gap-2 text-xs text-slate-400"><span class="uppercase tracking-wide text-slate-500">Entity ID</span><${IdChip} id=${willBeId} /><span class="text-slate-500">${resolvedId ? "(existing)" : "(will be assigned on create)"}</span></div>`}
        ${resolvedId && html`<button onClick=${() => { setResolvedId(null); setName(""); setEntityKey(null); }} class="text-xs font-medium text-slate-500 transition hover:text-slate-300">\u2715 Clear \u2014 create a brand-new entity instead</button>`}

        <${Field} label="IP name / title" hint="filtered to this entity; closed-deal IPs are hidden"><${IPTitleSearch} deals=${deals} entityName=${name} entityKey=${entityKey} selectedIps=${ips} onPick=${addSelectedIp} /></${Field}>
        ${ips.length > 0 && html`<div class="flex flex-wrap gap-2">${ips.map((ip, i) => html`<span key=${i} class="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-ink-850 px-2.5 py-1 text-xs text-slate-200">${ip.series}${ip.source && html`<span class=${cx("rounded border px-1 py-0.5 text-[9px] font-bold uppercase", sourceClass(ip.source))}>${sourceLabel(ip.source)}</span>`}<button onClick=${() => setIps((x) => x.filter((_, idx) => idx !== i))} class="text-slate-500 hover:text-rose-400">\u2715</button></span>`)}</div>`}
        <div class="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5 text-xs leading-relaxed text-slate-500">
          On create, the selected entity and IP values are saved to the backend repository DB. That DB copy stays searchable even if the source sheet row disappears later.
        </div>
        <div class="text-xs text-slate-500">Defaults will pre-fill (term 5y, worldwide, 15% Net, EUR, recoupable). Review and adjust on the deal page. IP IDs are assigned per entity on create.</div>
      </div>
      <div class="flex justify-end gap-2 border-t border-white/5 px-6 py-4"><${GhostBtn} onClick=${onClose}>Cancel<//><${PrimaryBtn} onClick=${create}>Create deal<//></div>
    </div>
  </div>`;
}

/* ------- render ------- */
ReactDOM.createRoot(document.getElementById("root")).render(html`<${App} />`);
