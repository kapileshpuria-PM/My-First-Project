// Seed deals - representative real deals, hand-structured from the legacy trackers.
// This is illustrative starter data; the real backfill of all ~100 tabs comes later.
// Entity IDs (ENT-<TYPE>-<NN>) are assigned first-come-first-served in creation order;
// IP IDs (<EntityID>-IP-<NN>) increment per entity. See agent-brief FEATURE-2.
(function () {
  function terms(o) {
    return Object.assign({
      mgAmount: null, mgCurrency: "EUR", mgBasis: "Per deal", mgRecoupable: true,
      revSharePct: 15, revShareBase: "Net",
      deductions: ["Production", "Marketing"], capPct: null, // cap is on Gross only
      minTermYears: 5, territory: "Worldwide", languages: ["All"],
      rights: "Exclusive serialised audio adaptation",
      exclusivity: "Exclusive (format)",
      reservationOfRights: "Yes", mgFutureTitles: "Same as current per title",
      additionalConditions: ""
    }, o);
  }

  const deals = [
    {
      id: "deal-moa-graven",
      entityId: "ENT-AUTH-01",
      entityName: "Moa Graven", entityType: "Author",
      author: "Moa Graven", publisher: "", agent: "",
      accountManager: "Suzy",
      reasonForSelection: "Huge volume, rating 1000+ on most titles, crime genre, good retention.",
      status: "Offered",
      ips: [
        { id: "ip-moa-1", ipId: "ENT-AUTH-01-IP-01", series: "Joachim Stein in Friesland", genre: "Police Procedural", launchDate: "2014", lengthHrs: 96, totalBooks: 18, rating: 4.26, numRatings: 973, links: [], titlesInScope: "All" },
        { id: "ip-moa-2", ipId: "ENT-AUTH-01-IP-02", series: "Jan Krömer Krimi-Reihe", genre: "Police Procedural", launchDate: "2015", lengthHrs: 132, totalBooks: 20, rating: 4.23, numRatings: 879, links: [], titlesInScope: "All" },
        { id: "ip-moa-3", ipId: "ENT-AUTH-01-IP-03", series: "Kommissar Guntram Krimi-Reihe", genre: "Crime", launchDate: "2015", lengthHrs: 181, totalBooks: 33, rating: 4.23, numRatings: 867, links: [], titlesInScope: "All" },
        { id: "ip-moa-4", ipId: "ENT-AUTH-01-IP-04", series: "Eva Sturm ermittelt", genre: "Crime", launchDate: "2016", lengthHrs: 90, totalBooks: 15, rating: 4.25, numRatings: 1169, links: [], titlesInScope: "All" }
      ],
      rounds: [
        { id: "r1", label: "Aligned internally", date: "2026-05-10", note: "Internal mandate, ceiling 7500.", terms: terms({ mgAmount: 7500, mgRecoupable: false, revShareBase: "Net", minTermYears: 7 }) },
        { id: "r2", label: "First Offer", date: "2026-05-22", note: "Sent first offer.", terms: terms({ mgAmount: 5000, mgRecoupable: false, revShareBase: "Gross", minTermYears: 5 }) },
        { id: "r3", label: "Second Offer", date: "2026-06-02", note: "Reduced after scope clarified to 54 titles.", terms: terms({ mgAmount: 3000, mgRecoupable: false, revShareBase: "Net", minTermYears: 5 }) }
      ],
      currentRoundId: "r3",
      links: { contract: "", offer: "", source: "260429 Deals Tracker_Self-Pub.xlsx" },
      comments: [{ id: "c1", author: "Suzy", text: "Non-recoupable was a concession to close; author has strong backlist.", ts: "2026-06-02T10:00:00Z" }]
    },
    {
      id: "deal-andre-fakriro",
      entityId: "ENT-AUTH-02",
      entityName: "Fakriro (André Milewski)", entityType: "Author",
      author: "André Milewski", publisher: "Fakriro", agent: "",
      accountManager: "Veni",
      reasonForSelection: "Good writer eval, desired genre, strong paranormal mystery backlist.",
      status: "Agreed",
      ips: [
        { id: "ip-andre-1", ipId: "ENT-AUTH-02-IP-01", series: "Geheimakte", genre: "Paranormal Mystery", launchDate: "2025", lengthHrs: 190, totalBooks: 20, rating: 4.1, numRatings: 1570, amazon: "https://www.amazon.de/-/en/dp/3987600411", goodreads: "", links: [], titlesInScope: "Book 1-5" }
      ],
      rounds: [
        { id: "r1", label: "Aligned internally", date: "2026-05-05", note: "", terms: terms({ mgAmount: 1500, mgRecoupable: true, revSharePct: 15, revShareBase: "Net", capPct: 50, deductions: ["Production", "Distribution", "Marketing"] }) },
        { id: "r2", label: "First Offer", date: "2026-05-07", note: "Sent.", terms: terms({ mgAmount: 1500, mgRecoupable: true, revSharePct: 15, revShareBase: "Net", capPct: 50, deductions: ["Production", "Distribution", "Marketing"] }) },
        { id: "r3", label: "Final Offer", date: "2026-05-07", note: "Agreed at 2000.", terms: terms({ mgAmount: 2000, mgRecoupable: true, revSharePct: 15, revShareBase: "Net", capPct: 50, deductions: ["Production", "Distribution", "Marketing"] }) }
      ],
      currentRoundId: "r3",
      links: { contract: "", offer: "", source: "260522 André Milewski (Geheimakte) EU Template Audio Adaptation.docx" },
      comments: [{ id: "c1", author: "Veni", text: "Cost corridor: recoupment capped at 50% of Gross. Author wanted Net protection.", ts: "2026-05-07T12:00:00Z" }]
    },
    {
      id: "deal-nancy-warren",
      entityId: "ENT-PUB-03",
      entityName: "Ambleside (Nancy Warren)", entityType: "Publisher",
      author: "Nancy Warren", publisher: "Ambleside", agent: "",
      accountManager: "Suzy",
      reasonForSelection: "66% activation, desired genre, strong cozy fantasy mystery.",
      status: "Offered",
      ips: [
        { id: "ip-nancy-1", ipId: "ENT-PUB-03-IP-01", series: "The Vampire Knitting Club", genre: "Fantasy Mystery", launchDate: "2018", lengthHrs: 130, totalBooks: 15, rating: 4.4, numRatings: 5000, links: [], titlesInScope: "5 books" }
      ],
      rounds: [
        { id: "r1", label: "Aligned internally", date: "2026-04-12", note: "", terms: terms({ mgAmount: 2000, mgCurrency: "USD", mgRecoupable: true, minTermYears: 7, languages: ["German", "English"] }) },
        { id: "r2", label: "First Offer", date: "2026-04-15", note: "Sent.", terms: terms({ mgAmount: 2000, mgCurrency: "USD", mgRecoupable: true, minTermYears: 7, languages: ["German", "English"] }) }
      ],
      currentRoundId: "r2",
      links: { contract: "", offer: "", source: "" },
      comments: []
    },
    {
      id: "deal-apub-jackdaniels",
      entityId: "ENT-PUB-04",
      entityName: "Apub", entityType: "Publisher",
      author: "J.A. Konrath, Blake Crouch", publisher: "Apub", agent: "",
      accountManager: "Veni",
      reasonForSelection: "Thriller, 50K ratings on Amazon, high-conviction backlist.",
      status: "Countered",
      ips: [
        { id: "ip-apub-1", ipId: "ENT-PUB-04-IP-01", series: "Jack Daniels series", genre: "Thriller", launchDate: "2004", lengthHrs: 210, totalBooks: 26, rating: 4.4, numRatings: 50000, links: [], titlesInScope: "4 upfront + 12" }
      ],
      rounds: [
        { id: "r1", label: "First Offer", date: "2026-03-17", note: "", terms: terms({ mgAmount: 13000, mgRecoupable: true, revSharePct: 20, revShareBase: "Net" }) },
        { id: "r2", label: "Second Offer", date: "2026-03-26", note: "", terms: terms({ mgAmount: 5000, mgRecoupable: true, revSharePct: 20, revShareBase: "Net" }) },
        { id: "r3", label: "Counter Received", date: "2026-04-20", note: "Author countered per-title.", terms: terms({ mgAmount: 24000, mgBasis: "Per title", mgRecoupable: false, revSharePct: 20, revShareBase: "Gross" }) },
        { id: "r4", label: "Fourth Offer", date: "2026-05-07", note: "", terms: terms({ mgAmount: 10000, mgRecoupable: true, revSharePct: 20, revShareBase: "Gross" }) }
      ],
      currentRoundId: "r4",
      links: { contract: "", offer: "", source: "Deals Tracker_Biggies.xlsx" },
      comments: [{ id: "c1", author: "Veni", text: "Gross-based rev share is a structural deviation - flagged for finance sign-off.", ts: "2026-05-07T09:00:00Z" }]
    },
    {
      id: "deal-peter-molden",
      entityId: "ENT-AGEN-05",
      entityName: "Agent Peter Molden", entityType: "Agent",
      author: "Michael Peinkofer", publisher: "", agent: "Peter Molden",
      accountManager: "Suzy",
      reasonForSelection: "High popularity author, historical crime.",
      status: "Agreed",
      ips: [
        { id: "ip-peter-1", ipId: "ENT-AGEN-05-IP-01", series: "Sarah Kincaid ermittelt", genre: "Historical Crime", launchDate: "2007", lengthHrs: 50, totalBooks: 4, rating: 4.2, numRatings: 800, links: [], titlesInScope: "All" }
      ],
      rounds: [
        { id: "r1", label: "First Offer", date: "2026-03-09", note: "", terms: terms({ mgAmount: 3000, mgRecoupable: true, revSharePct: 20, revShareBase: "Net" }) },
        { id: "r2", label: "Second Offer", date: "2026-03-20", note: "Aligned.", terms: terms({ mgAmount: 2000, mgRecoupable: true, revSharePct: 15, revShareBase: "Net" }) }
      ],
      currentRoundId: "r2",
      links: { contract: "", offer: "", source: "" },
      comments: []
    },
    {
      // Re-engagement: same entity as deal-moa-graven (ENT-AUTH-01), a later deal on one
      // already-known series (reuses its IP ID). Executed → shows under Closed Deals, while
      // Deal #1 above stays under Live Deals. Demonstrates FEATURE-1 + FEATURE-2.
      id: "deal-moa-graven-2",
      entityId: "ENT-AUTH-01",
      entityName: "Moa Graven", entityType: "Author",
      author: "Moa Graven", publisher: "", agent: "",
      accountManager: "Suzy",
      reasonForSelection: "Follow-on deal: extend rights on Eva Sturm after strong launch.",
      status: "Executed",
      ips: [
        { id: "ip-moa-4b", ipId: "ENT-AUTH-01-IP-04", series: "Eva Sturm ermittelt", genre: "Crime", launchDate: "2016", lengthHrs: 90, totalBooks: 15, rating: 4.25, numRatings: 1169, links: [], titlesInScope: "All" }
      ],
      rounds: [
        { id: "r1", label: "Aligned internally", date: "2026-02-01", note: "", terms: terms({ mgAmount: 2500, mgRecoupable: true, revSharePct: 15, revShareBase: "Net" }) },
        { id: "r2", label: "Final Offer", date: "2026-02-18", note: "Signed.", terms: terms({ mgAmount: 2000, mgRecoupable: true, revSharePct: 15, revShareBase: "Net" }) }
      ],
      currentRoundId: "r2",
      links: { contract: "", offer: "", source: "" },
      comments: [{ id: "c1", author: "Suzy", text: "Executed contract on file with legal.", ts: "2026-02-18T09:00:00Z" }]
    },
    {
      demoPaymentSeed: true,
      id: "deal-demo-payments-entity-1",
      entityId: "ENT-PUB-06",
      entityName: "Demo Entity 1",
      entityType: "Publisher",
      author: "",
      publisher: "Demo Entity 1",
      agent: "",
      accountManager: "Elnas",
      reasonForSelection: "Demo closed deal for payment upload flow. Entity 1 supplied two IPs from the sample mapping file.",
      status: "Executed",
      ips: [
        {
          id: "ip-demo-mvs",
          ipId: "ENT-PUB-06-IP-01",
          paymentIpId: "1",
          series: "My Vampire System",
          genre: "Fantasy / Sci-Fi",
          launchDate: "2025",
          lengthHrs: 120,
          totalBooks: 10,
          rating: 4.4,
          numRatings: 50000,
          links: [],
          titlesInScope: "All",
          paymentTerms: { mgAmount: 4000, mgCurrency: "USD", mgBasis: "Per IP", mgRecoupable: true, revSharePct: 20, revShareBase: "Net", capPct: 25, distributionPct: 15, deductions: ["Production", "Distribution", "Marketing"] }
        },
        {
          id: "ip-demo-saving-nora",
          ipId: "ENT-PUB-06-IP-02",
          paymentIpId: "2",
          paymentIpAliases: ["3"],
          series: "Saving Nora",
          genre: "Drama",
          launchDate: "2025",
          lengthHrs: 80,
          totalBooks: 6,
          rating: 4.2,
          numRatings: 15000,
          links: [],
          titlesInScope: "All",
          paymentTerms: { mgAmount: 3500, mgCurrency: "USD", mgBasis: "Per IP", mgRecoupable: true, revSharePct: 15, revShareBase: "Net", capPct: 28, distributionPct: 12, deductions: ["Production", "Distribution", "Marketing"] }
        }
      ],
      rounds: [
        { id: "r1", label: "Aligned internally", date: "2026-01-10", note: "Demo mandate for payment calculation.", terms: terms({ mgAmount: 7500, mgCurrency: "USD", mgBasis: "Per IP", mgRecoupable: true, revSharePct: 18, revShareBase: "Net", capPct: 30, deductions: ["Production", "Distribution", "Marketing"] }) },
        { id: "r2", label: "Final Offer", date: "2026-01-20", note: "Executed demo terms.", terms: terms({ mgAmount: 7500, mgCurrency: "USD", mgBasis: "Per IP", mgRecoupable: true, revSharePct: 18, revShareBase: "Net", capPct: 30, deductions: ["Production", "Distribution", "Marketing"] }) }
      ],
      currentRoundId: "r2",
      links: { contract: "", offer: "", source: "IP ID x Show ID x Show Type.csv" },
      comments: [{ id: "c1", author: "Elnas", text: "Demo: external payment IP IDs are stored on each IP for matching uploaded Show IDs.", ts: "2026-01-20T09:00:00Z" }]
    },
    {
      demoPaymentSeed: true,
      id: "deal-demo-payments-entity-2",
      entityId: "ENT-PUB-07",
      entityName: "Demo Entity 2",
      entityType: "Publisher",
      author: "",
      publisher: "Demo Entity 2",
      agent: "",
      accountManager: "Vencislava",
      reasonForSelection: "Demo closed deal for payment upload flow. Entity 2 supplied two IPs, one with uploaded show performance and one placeholder.",
      status: "Executed",
      ips: [
        {
          id: "ip-demo-alpha-bride",
          ipId: "ENT-PUB-07-IP-01",
          paymentIpId: "3",
          paymentIpAliases: ["2"],
          series: "The Alpha's Bride",
          genre: "Romance",
          launchDate: "2025",
          lengthHrs: 95,
          totalBooks: 8,
          rating: 4.3,
          numRatings: 22000,
          links: [],
          titlesInScope: "All",
          paymentTerms: { mgAmount: 3000, mgCurrency: "USD", mgBasis: "Per IP", mgRecoupable: true, revSharePct: 20, revShareBase: "Net", capPct: 30, distributionPct: 14, deductions: ["Production"] }
        },
        {
          id: "ip-demo-fourth",
          ipId: "ENT-PUB-07-IP-02",
          paymentIpId: "4",
          series: "The Duke's Masked Bride",
          genre: "Romance",
          launchDate: "2025",
          lengthHrs: 70,
          totalBooks: 5,
          rating: 4.1,
          numRatings: 12000,
          links: [],
          titlesInScope: "All",
          paymentTerms: { mgAmount: 2500, mgCurrency: "USD", mgBasis: "Per IP", mgRecoupable: true, revSharePct: 15, revShareBase: "Net", capPct: 28, distributionPct: 12, deductions: ["Production", "Marketing"] }
        }
      ],
      rounds: [
        { id: "r1", label: "Aligned internally", date: "2026-01-12", note: "Demo mandate for payment calculation.", terms: terms({ mgAmount: 5500, mgCurrency: "USD", mgBasis: "Per IP", mgRecoupable: true, revSharePct: 18, revShareBase: "Net", capPct: 30, deductions: ["Production", "Marketing"] }) },
        { id: "r2", label: "Final Offer", date: "2026-01-24", note: "Executed demo terms.", terms: terms({ mgAmount: 5500, mgCurrency: "USD", mgBasis: "Per IP", mgRecoupable: true, revSharePct: 18, revShareBase: "Net", capPct: 30, deductions: ["Production", "Marketing"] }) }
      ],
      currentRoundId: "r2",
      links: { contract: "", offer: "", source: "Query Data Dump.csv" },
      comments: [{ id: "c1", author: "Vencislava", text: "Demo: The Alpha's Bride is matched from uploaded show rows; the second IP is a placeholder for the two-IP entity example.", ts: "2026-01-24T09:00:00Z" }]
    }
  ];

  // attach createdAt/updatedAt
  deals.forEach(function (d) { d.createdAt = "2026-06-01T00:00:00Z"; d.updatedAt = d.rounds[d.rounds.length - 1].date + "T00:00:00Z"; d.changeLog = []; });
  window.SEED_DEALS = deals;
})();
