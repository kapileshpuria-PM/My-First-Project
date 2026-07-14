/* Pocket FM Deal Tracker - views (loaded after app.js) */

function defaultTerms() {
  return {
    mgAmount: null, mgCurrency: "EUR", mgBasis: "Per deal", mgRecoupable: true,
    mgPaidOn: "",
    revSharePct: 15, revShareBase: "Net", deductions: ["Production", "Marketing"],
    capPct: null, minTermYears: 5, territory: "Worldwide", languages: ["All"],
    rights: "Exclusive serialised audio adaptation", exclusivity: "Exclusive (format)",
    reservationOfRights: "Yes", mgFutureTitles: "Same as current per title", additionalConditions: ""
  };
}

/* ----------------------------- Deals snapshot ----------------------------- */
function DealsView({ deals, title, subtitle, onOpen, onNew, band, clearBand, showNew }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const statusOpts = useMemo(() => ["All", ...STATUSES.filter((s) => deals.some((d) => d.status === s)), ...TERMINAL_STATUSES.filter((s) => s !== "Executed" && deals.some((d) => d.status === s))], [deals]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return deals.filter((d) => {
      if (status !== "All" && d.status !== status) return false;
      if (band) { const n = d.ips[0] && d.ips[0].numRatings; if (n == null || n < band.min || n >= band.max) return false; }
      if (!s) return true;
      const hay = ((d.entityId || "") + " " + d.entityName + " " + d.author + " " + d.ips.map((i) => i.series + " " + i.genre).join(" ") + " " + d.accountManager).toLowerCase();
      return hay.includes(s);
    });
  }, [deals, q, status, band]);

  return html`<div class="fade-in">
    <${Header} title=${title || "Deals"} subtitle=${subtitle} action=${showNew ? html`<${PrimaryBtn} onClick=${onNew}><${Icon} name="plus" size=${15} />New deal<//>` : null} />
    <div class="px-8">
      <div class="mb-5 flex flex-wrap items-center gap-2.5">
        <div class="relative flex-1 min-w-[240px]">
          <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><${Icon} name="search" size=${16} /></span>
          <input value=${q} onInput=${(e) => setQ(e.target.value)} placeholder="Search entity, ID, author, IP, POC"
            class=${cx(inputCls, "pl-10")} />
        </div>
        <div class="flex items-center gap-0.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
          ${statusOpts.map((s) => html`<button key=${s} onClick=${() => setStatus(s)}
            class=${cx("rounded-lg px-3 py-1.5 text-xs font-medium transition-all", status === s ? "bg-brand-500/15 text-white ring-1 ring-brand-500/30" : "text-slate-400 hover:text-slate-200")}>${s}</button>`)}
        </div>
        ${band && html`<button onClick=${clearBand} class="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/15 px-3 py-1.5 text-xs font-medium text-brand-300 ring-1 ring-brand-500/30">Rating band ${band.label}<span class="opacity-70">\u2715</span></button>`}
      </div>

      <div class="overflow-x-auto rounded-2xl border border-white/[0.07] surface shadow-card">
        <table class="w-full min-w-[1100px] text-sm">
          <thead><tr class="border-b border-white/[0.07] text-left text-[10.5px] uppercase tracking-[0.08em] text-slate-500">
            ${["Entity", "IP / Series", "Genre", "Status", "MG (current)", "Rev share", "Payment", "Term", "POC", "Updated"].map((h) => html`<th key=${h} class="px-4 py-3.5 font-semibold">${h}</th>`)}
          </tr></thead>
          <tbody>
            ${rows.map((d) => {
              const t = currentRound(d).terms;
              return html`<tr key=${d.id} onClick=${() => onOpen(d.id)}
                class="rowline cursor-pointer border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.025]">
                <td class="px-4 py-3.5">
                  <div class="font-medium text-slate-100">${d.entityName}</div>
                  <div class="mt-0.5 flex items-center gap-1.5">
                    <span class=${cx("text-[11px] font-medium", TYPE_STYLE[d.entityType])}>${d.entityType}</span>
                    ${d.entityId && html`<span class="font-mono text-[10px] text-slate-500">${d.entityId}</span>`}
                  </div>
                </td>
                <td class="px-4 py-3.5 text-slate-300">
                  ${d.ips.slice(0, 2).map((i) => i.series).join(", ")}${d.ips.length > 2 ? html`<span class="text-slate-500"> +${d.ips.length - 2}</span>` : ""}
                </td>
                <td class="px-4 py-3.5 text-slate-400">${d.ips[0] && d.ips[0].genre}</td>
                <td class="px-4 py-3.5"><${StatusBadge} status=${d.status} /></td>
                <td class="px-4 py-3.5 tnum font-semibold text-slate-100">${fmtMoney(t.mgAmount, t.mgCurrency)}${!t.mgRecoupable ? html`<span class="ml-1.5 rounded bg-amber-400/10 px-1 py-0.5 text-[9px] font-bold tracking-wide text-amber-300 ring-1 ring-amber-400/20">NR</span>` : ""}</td>
                <td class="px-4 py-3.5 tnum text-slate-300">${t.revSharePct}% <span class="text-slate-500">${t.revShareBase}</span></td>
                <td class="px-4 py-3.5"><${PaymentReadyBadge} deal=${d} /></td>
                <td class="px-4 py-3.5 tnum text-slate-400">${t.minTermYears}y</td>
                <td class="px-4 py-3.5 text-slate-400">${d.accountManager || "\u2014"}</td>
                <td class="px-4 py-3.5 tnum text-slate-500">${(d.updatedAt || "").slice(0, 10)}</td>
              </tr>`;
            })}
          </tbody>
        </table>
        ${rows.length === 0 && html`<div class="px-4 py-14 text-center text-sm text-slate-500">No deals match your filters.</div>`}
      </div>
    </div>
  </div>`;
}

/* ----------------------------- Benchmarks ----------------------------- */
function Benchmarks({ deals, onDrill }) {
  const stats = useMemo(() => {
    const perBook = deals.map(mgPerBook).filter((x) => x != null);
    const avgPB = perBook.length ? perBook.reduce((a, b) => a + b, 0) / perBook.length : null;
    const rs = deals.map((d) => currentRound(d).terms.revSharePct).filter((x) => x != null);
    const capped = deals.filter((d) => currentRound(d).terms.capPct != null).length;
    const bands = [{ label: "< 1k", min: 0, max: 1000 }, { label: "1k-5k", min: 1000, max: 5000 }, { label: "5k-10k", min: 5000, max: 10000 }, { label: "10k+", min: 10000, max: 1e9 }];
    const byBand = bands.map((b) => {
      const ds = deals.filter((d) => { const r = d.ips[0] && d.ips[0].numRatings; return r != null && r >= b.min && r < b.max; });
      const pb = ds.map(mgPerBook).filter((x) => x != null);
      return { label: b.label, min: b.min, max: b.max, n: ds.length, avg: pb.length ? pb.reduce((a, c) => a + c, 0) / pb.length : null };
    });
    return { avgPB, rsMin: rs.length ? Math.min(...rs) : null, rsMax: rs.length ? Math.max(...rs) : null, capped, byBand };
  }, [deals]);
  const maxBand = Math.max(1, ...stats.byBand.map((b) => b.avg || 0));

  const Card = (label, value, sub) => html`<div class="rounded-2xl border border-white/[0.07] surface p-5 shadow-card">
    <div class="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">${label}</div>
    <div class="mt-1.5 tnum text-[28px] font-semibold tracking-tight text-white">${value}</div>
    ${sub && html`<div class="mt-1 text-xs text-slate-400">${sub}</div>`}
  </div>`;

  return html`<div class="fade-in">
    <${Header} title="Benchmarks" subtitle="Computed live across all deals" />
    <div class="px-8">
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        ${Card("Deals", deals.length, "adaptation")}
        ${Card("Avg MG / book", stats.avgPB ? "\u20ac" + Math.round(stats.avgPB).toLocaleString() : "\u2014", "current terms, in-scope books")}
        ${Card("Rev share range", stats.rsMin != null ? stats.rsMin + "%\u2013" + stats.rsMax + "%" : "\u2014", "across deals")}
        ${Card("With cost cap", stats.capped, "corridor on gross")}
      </div>
      <div class="mt-5 rounded-2xl border border-white/[0.07] surface p-6 shadow-card">
        <div class="mb-5 flex items-center justify-between"><span class="text-sm font-semibold text-slate-200">Avg MG per book by Amazon rating band</span><span class="text-[11px] text-slate-500">click a band to see those deals</span></div>
        <div class="space-y-2">
          ${stats.byBand.map((b) => html`<button key=${b.label} onClick=${() => b.n && onDrill && onDrill({ label: b.label, min: b.min, max: b.max })}
            class=${cx("flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition", b.n ? "cursor-pointer hover:bg-white/[0.04]" : "cursor-default opacity-60")}>
            <div class="w-16 text-xs font-medium text-slate-400">${b.label}</div>
            <div class="h-7 flex-1 overflow-hidden rounded-lg bg-white/[0.04] ring-1 ring-inset ring-white/[0.04]">
              <div class="h-full rounded-lg bg-gradient-to-r from-brand-600 to-brand-400 shadow-[0_0_20px_-4px_rgba(229,31,79,.7)] transition-all duration-500" style=${{ width: Math.max(b.avg ? 3 : 0, (b.avg || 0) / maxBand * 100) + "%" }}></div>
            </div>
            <div class="w-28 text-right text-xs"><span class="tnum font-semibold text-slate-200">${b.avg ? "\u20ac" + Math.round(b.avg).toLocaleString() : "\u2014"}</span> <span class="text-slate-500">(${b.n})</span></div>
          </button>`)}
        </div>
        <div class="mt-5 text-xs text-slate-500">Note: MG shown in deal currency, treated as EUR for this MVP. Multi-currency normalisation is on the backlog.</div>
      </div>
    </div>
  </div>`;
}

/* ----------------------------- shared chrome ----------------------------- */
function Header({ title, subtitle, action, left }) {
  return html`<div class="sticky top-0 z-30 mb-6 flex items-center justify-between border-b border-white/[0.08] bg-ink-950/95 px-8 py-5 glass">
    <div class="flex items-center gap-3">
      ${left}
      <div><h1 class="h-grad text-[22px] font-semibold tracking-tight">${title}</h1>${subtitle && html`<p class="mt-0.5 text-[13px] text-slate-400">${subtitle}</p>`}</div>
    </div>
    ${action}
  </div>`;
}
function PrimaryBtn({ onClick, children }) {
  return html`<button onClick=${onClick} class="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-glow ring-1 ring-inset ring-white/15 transition-all hover:-translate-y-px hover:brightness-[1.07] active:translate-y-0">${children}</button>`;
}
function StatusSelect({ value, onChange }) {
  const dot = { "Aligned internally": "bg-slate-400", "Offered": "bg-sky-400", "Countered": "bg-amber-400", "Agreed": "bg-violet-400", "Executed": "bg-emerald-400" }[value] || "bg-sky-400";
  return html`<div class=${cx("relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-inset", STATUS_STYLE[value] || STATUS_STYLE["Offered"])}>
    <span class=${cx("h-1.5 w-1.5 rounded-full", dot)}></span>
    <select value=${value} onChange=${(e) => onChange(e.target.value)} class="cursor-pointer appearance-none bg-transparent pr-5 outline-none [color:inherit]">
      ${STATUSES.map((s) => html`<option key=${s} value=${s} class="bg-ink-800 text-slate-100">${s}</option>`)}
    </select>
    <span class="pointer-events-none absolute right-2.5 text-[9px] opacity-70">\u25be</span>
  </div>`;
}
function GhostBtn({ onClick, children, className }) {
  return html`<button onClick=${onClick} class=${cx("inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-slate-300 transition-all hover:border-white/15 hover:bg-white/[0.06] hover:text-white", className)}>${children}</button>`;
}

/* ----------------------------- Deal detail ----------------------------- */
function DealDetail({ deal, allDeals, onBack, update, remove }) {
  const [roundId, setRoundId] = useState(currentRound(deal).id);
  const round = deal.rounds.find((r) => r.id === roundId) || currentRound(deal);
  const t = round.terms;

  function logAndSet(patch, logs) {
    update(deal.id, (d) => {
      const rounds = d.rounds.map((r) => (r.id === roundId ? { ...r, terms: { ...r.terms, ...patch } } : r));
      const changeLog = (logs || []).map((l) => ({ ts: new Date().toISOString(), who: d.accountManager || "AM", round: round.label, ...l })).concat(d.changeLog || []);
      return { ...d, rounds, changeLog, updatedAt: new Date().toISOString() };
    });
  }
  const setTerm = (field, value, labelFrom) => logAndSet({ [field]: value }, [{ field, from: labelFrom != null ? labelFrom : t[field], to: value }]);

  return html`<div class="fade-in pb-16">
    <${Header}
      left=${html`<button onClick=${onBack} class="mr-1 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition-all hover:border-white/15 hover:bg-white/[0.06] hover:text-white"><${Icon} name="back" size=${17} /></button>`}
      title=${deal.entityName}
      subtitle=${html`<span class="flex items-center gap-2">${deal.entityId && html`<${IdChip} id=${deal.entityId} title="Entity ID" />`}<span>${deal.entityType + " \u00b7 " + (deal.author || "") + " \u00b7 POC " + (deal.accountManager || "\u2014")}</span></span>`}
      action=${html`<div class="flex items-center gap-2">
        <${Select} value=${deal.accountManager || ""} onChange=${(v) => update(deal.id, (d) => ({ ...d, accountManager: v }))} options=${["", ...POCS]} class="w-36" />
        <${StatusSelect} value=${deal.status} onChange=${(v) => update(deal.id, (d) => ({ ...d, status: v, changeLog: [{ ts: new Date().toISOString(), who: d.accountManager || "POC", field: "Status", from: d.status, to: v }].concat(d.changeLog || []) }))} />
        <${GhostBtn} onClick=${() => { if (confirm("Delete this deal?")) remove(deal.id); }} className="text-rose-300 hover:!text-rose-200"><${Icon} name="trash" size=${15} />Delete<//>
      </div>`} />

    <div class="grid grid-cols-1 gap-5 px-8 lg:grid-cols-3">
      <div class="space-y-5 lg:col-span-2">
        <${IPSection} deal=${deal} allDeals=${allDeals} update=${update} />
        <${RoundsSection} deal=${deal} roundId=${roundId} setRoundId=${setRoundId} update=${update} />
        <${TermsEditor} t=${t} setTerm=${setTerm} round=${round} deal=${deal} />
        <${PaymentTermsByIpPanel} deal=${deal} update=${update} />
        <${ProgressionPanel} deal=${deal} />
      </div>
      <div class="space-y-5">
        <${DerivedCard} deal=${deal} />
        <${PaymentReadinessCard} deal=${deal} />
        <${GuardrailCard} deal=${deal} />
        <${LinksCard} deal=${deal} update=${update} />
        <${CommentsCard} deal=${deal} update=${update} />
        <${ChangeLogCard} deal=${deal} />
      </div>
    </div>
  </div>`;
}

function Panel({ title, action, children }) {
  return html`<section class="overflow-hidden rounded-2xl border border-white/[0.07] surface shadow-card">
    <div class="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
      <h2 class="text-[13px] font-semibold tracking-tight text-slate-200">${title}</h2>${action}
    </div>
    <div class="p-5">${children}</div>
  </section>`;
}

function DerivedCard({ deal }) {
  const t = currentRound(deal).terms;
  const pb = mgPerBook(deal); const sv = savingPct(deal); const books = dealBooks(deal);
  const Row = (k, v) => html`<div class="flex items-center justify-between border-b border-white/[0.04] py-2 text-sm last:border-0"><span class="text-slate-400">${k}</span><span class="tnum font-semibold text-slate-100">${v}</span></div>`;
  return html`<${Panel} title="At a glance">
    ${Row("Current MG", fmtMoney(t.mgAmount, t.mgCurrency) + (t.mgRecoupable ? " (recoup)" : " (non-recoup)"))}
    ${Row("Books in scope", books || "\u2014")}
    ${Row("MG / book", pb ? (CUR[t.mgCurrency] || "") + Math.round(pb).toLocaleString() : "\u2014")}
    ${Row("Rev share", t.revSharePct + "% of " + t.revShareBase)}
    ${Row("Cost cap", t.capPct != null ? t.capPct + "% of Gross" : "none")}
    ${Row("Term", t.minTermYears + " years")}
    ${sv != null && Row("Saving vs aligned", html`<span class=${sv >= 0 ? "text-emerald-300" : "text-rose-300"}>${sv}%</span>`)}
    ${sv != null && html`<div class="mt-2 text-[11px] leading-relaxed text-slate-500">Saving = (aligned MG \u2212 current MG) / aligned MG. Compares the "Aligned internally" round (${fmtMoney(alignedRound(deal).terms.mgAmount, alignedRound(deal).terms.mgCurrency)}) to the current round (${fmtMoney(currentRound(deal).terms.mgAmount, currentRound(deal).terms.mgCurrency)}).</div>`}
  <//>`;
}

function PaymentReadyBadge({ deal }) {
  const s = paymentReadinessForDeal(deal);
  if (!s.total) return html`<span class="inline-flex rounded-lg border border-rose-400/25 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-300">No IPs</span>`;
  return html`<span title=${s.ready ? "All IPs have payment-ready commercial terms." : "Missing: " + s.missing.join(", ")}
    class=${cx("inline-flex whitespace-nowrap rounded-lg border px-2 py-1 text-[11px] font-semibold", s.ready ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300" : "border-amber-400/25 bg-amber-500/10 text-amber-300")}>
    ${s.ready ? "Payment ready" : "Needs terms"}${s.customCount ? " · " + s.customCount + " custom" : ""}
  </span>`;
}

window.__PFM2 = true;
