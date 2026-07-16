// QA demo closed deals for payments validation.
// demoPaymentSeed:true forces merge into existing browsers via ensureDemoSeedDeals.
window.SEED_DEALS = [
  {
    "id": "deal-ent-pub-09",
    "entityId": "ENT-PUB-09",
    "entityName": "H.Y. Hanna",
    "entityType": "Publisher",
    "publisher": "H.Y. Hanna",
    "author": "",
    "status": "Executed",
    "ips": [
      {
        "id": "ip-ent-pub-09-ip-01",
        "ipId": "ENT-PUB-09-IP-01",
        "series": "English Cottage Garden Mysteries",
        "totalBooks": 5,
        "titlesInScope": "All"
      },
      {
        "id": "ip-ent-pub-09-ip-02",
        "ipId": "ENT-PUB-09-IP-02",
        "series": "Oxford Tearoom Mysteries",
        "totalBooks": 5,
        "titlesInScope": "All"
      },
      {
        "id": "ip-ent-pub-09-ip-03",
        "ipId": "ENT-PUB-09-IP-03",
        "series": "Bewitched by Chocolate Cozy Fantasy Witch Mysteries",
        "totalBooks": 5,
        "titlesInScope": "All"
      }
    ],
    "rounds": [
      {
        "id": "r1",
        "label": "Executed",
        "date": "2026-01-15",
        "note": "Demo/QA seed",
        "terms": {
          "mgAmount": 2000,
          "mgCurrency": "EUR",
          "mgBasis": "Per IP",
          "mgRecoupable": true,
          "mgPaidOn": "Jan'26",
          "revSharePct": 20,
          "revShareBase": "Net",
          "deductions": [
            "Production",
            "Distribution",
            "Marketing"
          ],
          "capPct": 50
        }
      }
    ],
    "currentRoundId": "r1",
    "createdAt": "2026-01-15T00:00:00Z",
    "updatedAt": "2026-01-15T00:00:00Z",
    "changeLog": [],
    "demoPaymentSeed": true,
    "accountManager": "QA Demo",
    "reasonForSelection": "QA / demo closed deal for payments validation",
    "links": {
      "contract": "",
      "offer": "",
      "source": "qa-demo"
    },
    "comments": []
  },
  {
    "id": "deal-ent-pub-08",
    "entityId": "ENT-PUB-08",
    "entityName": "Juliane Maibach",
    "entityType": "Author",
    "publisher": "",
    "author": "Juliane Maibach",
    "status": "Executed",
    "ips": [
      {
        "id": "ip-ent-pub-08-ip-01",
        "ipId": "ENT-PUB-08-IP-01",
        "series": "Schicksalsreihe",
        "totalBooks": 5,
        "titlesInScope": "All",
        "paymentTermsMode": "custom",
        "paymentTerms": {
          "mgAmount": 5000
        }
      },
      {
        "id": "ip-ent-pub-08-ip-02",
        "ipId": "ENT-PUB-08-IP-02",
        "series": "Sündenreihe",
        "totalBooks": 5,
        "titlesInScope": "All",
        "paymentTermsMode": "custom",
        "paymentTerms": {
          "mgRecoupable": false
        }
      },
      {
        "id": "ip-ent-pub-08-ip-03",
        "ipId": "ENT-PUB-08-IP-03",
        "series": "Seelenlos",
        "totalBooks": 5,
        "titlesInScope": "All",
        "paymentTermsMode": "custom",
        "paymentTerms": {
          "mgPaidOn": "Mar'26"
        }
      }
    ],
    "rounds": [
      {
        "id": "r1",
        "label": "Executed",
        "date": "2026-01-15",
        "note": "Demo/QA seed",
        "terms": {
          "mgAmount": 2000,
          "mgCurrency": "EUR",
          "mgBasis": "Per IP",
          "mgRecoupable": true,
          "mgPaidOn": "Jan'26",
          "revSharePct": 20,
          "revShareBase": "Net",
          "deductions": [
            "Production",
            "Distribution",
            "Marketing"
          ],
          "capPct": 50
        }
      }
    ],
    "currentRoundId": "r1",
    "createdAt": "2026-01-15T00:00:00Z",
    "updatedAt": "2026-01-15T00:00:00Z",
    "changeLog": [],
    "demoPaymentSeed": true,
    "accountManager": "QA Demo",
    "reasonForSelection": "QA / demo closed deal for payments validation",
    "links": {
      "contract": "",
      "offer": "",
      "source": "qa-demo"
    },
    "comments": []
  },
  {
    "id": "deal-ent-auth-01",
    "entityId": "ENT-AUTH-01",
    "entityName": "Moa Graven",
    "entityType": "Author",
    "publisher": "",
    "author": "Moa Graven",
    "status": "Executed",
    "ips": [
      {
        "id": "ip-ent-auth-01-ip-01",
        "ipId": "ENT-AUTH-01-IP-01",
        "series": "Joachim Stein in Friesland",
        "totalBooks": 5,
        "titlesInScope": "All",
        "paymentTermsMode": "custom",
        "paymentTerms": {
          "revShareBase": "Gross"
        }
      },
      {
        "id": "ip-ent-auth-01-ip-02",
        "ipId": "ENT-AUTH-01-IP-02",
        "series": "Jan Krömer Krimi-Reihe",
        "totalBooks": 5,
        "titlesInScope": "All"
      },
      {
        "id": "ip-ent-auth-01-ip-03",
        "ipId": "ENT-AUTH-01-IP-03",
        "series": "Kommissar Guntram Krimi-Reihe",
        "totalBooks": 5,
        "titlesInScope": "All"
      },
      {
        "id": "ip-ent-auth-01-ip-04",
        "ipId": "ENT-AUTH-01-IP-04",
        "series": "Eva Sturm ermittelt",
        "totalBooks": 5,
        "titlesInScope": "All",
        "paymentTermsMode": "custom",
        "paymentTerms": {
          "deductions": []
        }
      }
    ],
    "rounds": [
      {
        "id": "r1",
        "label": "Executed",
        "date": "2026-01-15",
        "note": "Demo/QA seed",
        "terms": {
          "mgAmount": 2000,
          "mgCurrency": "EUR",
          "mgBasis": "Per IP",
          "mgRecoupable": true,
          "mgPaidOn": "Jan'26",
          "revSharePct": 20,
          "revShareBase": "Net",
          "deductions": [
            "Production",
            "Distribution",
            "Marketing"
          ],
          "capPct": 50
        }
      }
    ],
    "currentRoundId": "r1",
    "createdAt": "2026-01-15T00:00:00Z",
    "updatedAt": "2026-01-15T00:00:00Z",
    "changeLog": [],
    "demoPaymentSeed": true,
    "accountManager": "QA Demo",
    "reasonForSelection": "QA / demo closed deal for payments validation",
    "links": {
      "contract": "",
      "offer": "",
      "source": "qa-demo"
    },
    "comments": []
  },
  {
    "id": "deal-ent-agen-05",
    "entityId": "ENT-AGEN-05",
    "entityName": "Agent Peter Molden",
    "entityType": "Agent",
    "publisher": "",
    "author": "",
    "status": "Executed",
    "ips": [
      {
        "id": "ip-ent-agen-05-ip-01",
        "ipId": "ENT-AGEN-05-IP-01",
        "series": "Sarah Kincaid ermittelt",
        "totalBooks": 5,
        "titlesInScope": "All",
        "paymentTermsMode": "custom",
        "paymentTerms": {
          "capPct": null
        }
      }
    ],
    "rounds": [
      {
        "id": "r1",
        "label": "Executed",
        "date": "2026-01-15",
        "note": "Demo/QA seed",
        "terms": {
          "mgAmount": 2000,
          "mgCurrency": "EUR",
          "mgBasis": "Per IP",
          "mgRecoupable": true,
          "mgPaidOn": "Jan'26",
          "revSharePct": 20,
          "revShareBase": "Net",
          "deductions": [
            "Production",
            "Distribution",
            "Marketing"
          ],
          "capPct": 50
        }
      }
    ],
    "currentRoundId": "r1",
    "createdAt": "2026-01-15T00:00:00Z",
    "updatedAt": "2026-01-15T00:00:00Z",
    "changeLog": [],
    "demoPaymentSeed": true,
    "accountManager": "QA Demo",
    "reasonForSelection": "QA / demo closed deal for payments validation",
    "links": {
      "contract": "",
      "offer": "",
      "source": "qa-demo"
    },
    "comments": []
  },
  {
    "id": "deal-ent-auth-02",
    "entityId": "ENT-AUTH-02",
    "entityName": "Fakriro (André Milewski)",
    "entityType": "Author",
    "publisher": "",
    "author": "Fakriro (André Milewski)",
    "status": "Executed",
    "ips": [
      {
        "id": "ip-ent-auth-02-ip-01",
        "ipId": "ENT-AUTH-02-IP-01",
        "series": "Geheimakte",
        "totalBooks": 5,
        "titlesInScope": "All"
      }
    ],
    "rounds": [
      {
        "id": "r1",
        "label": "Executed",
        "date": "2026-01-15",
        "note": "Demo/QA seed",
        "terms": {
          "mgAmount": 2000,
          "mgCurrency": "EUR",
          "mgBasis": "Per IP",
          "mgRecoupable": true,
          "mgPaidOn": "Jan'26",
          "revSharePct": 20,
          "revShareBase": "Net",
          "deductions": [
            "Production",
            "Distribution",
            "Marketing"
          ],
          "capPct": 50
        }
      }
    ],
    "currentRoundId": "r1",
    "createdAt": "2026-01-15T00:00:00Z",
    "updatedAt": "2026-01-15T00:00:00Z",
    "changeLog": [],
    "demoPaymentSeed": true,
    "accountManager": "QA Demo",
    "reasonForSelection": "QA / demo closed deal for payments validation",
    "links": {
      "contract": "",
      "offer": "",
      "source": "qa-demo"
    },
    "comments": []
  },
  {
    "id": "deal-ent-pub-10",
    "entityId": "ENT-PUB-10",
    "entityName": "Ullstein",
    "entityType": "Publisher",
    "publisher": "Ullstein",
    "author": "",
    "status": "Executed",
    "ips": [
      {
        "id": "ip-ent-pub-10-ip-01",
        "ipId": "ENT-PUB-10-IP-01",
        "series": "Die Hafenärztin",
        "totalBooks": 5,
        "titlesInScope": "All"
      }
    ],
    "rounds": [
      {
        "id": "r1",
        "label": "Executed",
        "date": "2026-01-15",
        "note": "Demo/QA seed",
        "terms": {
          "mgAmount": 2000,
          "mgCurrency": "EUR",
          "mgBasis": "Per IP",
          "mgRecoupable": true,
          "mgPaidOn": "Jan'26",
          "revSharePct": 20,
          "revShareBase": "Net",
          "deductions": [
            "Production",
            "Distribution",
            "Marketing"
          ],
          "capPct": 50
        }
      }
    ],
    "currentRoundId": "r1",
    "createdAt": "2026-01-15T00:00:00Z",
    "updatedAt": "2026-01-15T00:00:00Z",
    "changeLog": [],
    "demoPaymentSeed": true,
    "accountManager": "QA Demo",
    "reasonForSelection": "QA / demo closed deal for payments validation",
    "links": {
      "contract": "",
      "offer": "",
      "source": "qa-demo"
    },
    "comments": []
  },
  {
    "id": "deal-ent-pub-03",
    "entityId": "ENT-PUB-03",
    "entityName": "Ambleside (Nancy Warren)",
    "entityType": "Publisher",
    "publisher": "Ambleside (Nancy Warren)",
    "author": "",
    "status": "Executed",
    "ips": [
      {
        "id": "ip-ent-pub-03-ip-01",
        "ipId": "ENT-PUB-03-IP-01",
        "series": "The Vampire Knitting Club",
        "totalBooks": 5,
        "titlesInScope": "All"
      }
    ],
    "rounds": [
      {
        "id": "r1",
        "label": "Executed",
        "date": "2026-01-15",
        "note": "Demo/QA seed",
        "terms": {
          "mgAmount": 2000,
          "mgCurrency": "EUR",
          "mgBasis": "Per IP",
          "mgRecoupable": true,
          "mgPaidOn": "Jan'26",
          "revSharePct": 20,
          "revShareBase": "Net",
          "deductions": [
            "Production",
            "Distribution",
            "Marketing"
          ],
          "capPct": 50
        }
      }
    ],
    "currentRoundId": "r1",
    "createdAt": "2026-01-15T00:00:00Z",
    "updatedAt": "2026-01-15T00:00:00Z",
    "changeLog": [],
    "demoPaymentSeed": true,
    "accountManager": "QA Demo",
    "reasonForSelection": "QA / demo closed deal for payments validation",
    "links": {
      "contract": "",
      "offer": "",
      "source": "qa-demo"
    },
    "comments": []
  },
  {
    "id": "deal-ent-pub-04",
    "entityId": "ENT-PUB-04",
    "entityName": "Apub",
    "entityType": "Publisher",
    "publisher": "Apub",
    "author": "",
    "status": "Executed",
    "ips": [
      {
        "id": "ip-ent-pub-04-ip-01",
        "ipId": "ENT-PUB-04-IP-01",
        "series": "Jack Daniels series",
        "totalBooks": 3,
        "titlesInScope": "All"
      },
      {
        "id": "ip-ent-pub-04-ip-02",
        "ipId": "ENT-PUB-04-IP-02",
        "series": "Afraid (Konrath)",
        "totalBooks": 7,
        "titlesInScope": "All"
      }
    ],
    "rounds": [
      {
        "id": "r1",
        "label": "Executed",
        "date": "2026-01-15",
        "note": "Demo/QA seed",
        "terms": {
          "mgAmount": 2000,
          "mgCurrency": "EUR",
          "mgBasis": "Per deal",
          "mgRecoupable": true,
          "mgPaidOn": "Jan'26",
          "revSharePct": 20,
          "revShareBase": "Net",
          "deductions": [
            "Production",
            "Distribution",
            "Marketing"
          ],
          "capPct": 50
        }
      }
    ],
    "currentRoundId": "r1",
    "createdAt": "2026-01-15T00:00:00Z",
    "updatedAt": "2026-01-15T00:00:00Z",
    "changeLog": [],
    "demoPaymentSeed": true,
    "accountManager": "QA Demo",
    "reasonForSelection": "QA / demo closed deal for payments validation",
    "links": {
      "contract": "",
      "offer": "",
      "source": "qa-demo"
    },
    "comments": []
  }
];
