# ControlPlane.ai — Responsible AI Gateway

> A real-time AI response evaluation layer that detects bias, hallucination risk, and privacy leaks **before** responses reach users.

## Demo Video
<!-- Add Loom / YouTube link here after recording -->

---

## What Is ControlPlane.ai?

Enterprises run generative AI across customer-facing chatbots, internal copilots, and regulated decision-support workflows — each with a different risk profile. ControlPlane sits as a **middleware layer** between your AI model and your users, evaluating every response through a parallel checker pipeline and taking tiered action:

| Score | Action | Description |
|-------|--------|-------------|
| Low | **Allow** | Response is safe — delivered immediately |
| Medium-low | **Auto-Edit** | PII redacted automatically before delivery |
| Medium-high | **Human Review** | Response held for review before delivery |
| High | **Block** | Response must not reach the end user |

---

## Architecture

```
User Prompt ──► AI Model (via API) ──► ControlPlane Gateway
                                              │
                         ┌────────────────────┼────────────────────┐
                         ▼                    ▼                    ▼
                   PII Detector       Hallucination Checker   Bias Checker
                  (regex + NER)    (grounding vs source docs) (heuristics)
                         │                    │                    │
                         └────────────────────┴────────────────────┘
                                              │
                                    Decision Engine
                                  (weighted score + policy)
                                              │
                          ┌───────────────────┼──────────────────┐
                          ▼                   ▼                  ▼
                       Allow            Auto-Edit / Flag       Block
                          │                   │                  │
                          └───────────────────┴──────────────────┘
                                              │
                                        Audit Trail
                                    (every decision logged)
```

### Checker Pipeline (runs in parallel)

1. **PII / Privacy Detector** — regex patterns for SSNs, credit cards, emails, phone numbers, DOBs, employee IDs, salary data; heuristic name-in-context detection
2. **Hallucination / Grounding Checker** — extracts factual claims from the response, verifies each against provided source documents, detects temporal mismatches and semantic contradictions
3. **Bias & Fairness Checker** — pattern rules for gender, age, race/geographic proxy, socioeconomic, religious, and disability bias; detects adverse treatment linked to protected characteristics (ECOA-awareness)

### Decision Engine

- Applies **policy-configurable weights** to checker scores (e.g., PII is weighted higher for customer-facing use cases)
- Detects **overlapping risks** — when hallucination and PII trigger simultaneously (a fabricated detail about a person is both a hallucination and a privacy violation)
- Applies **overlap amplification** — co-occurring risks multiply the composite score by 15%
- Maps composite score to tiered action using **per-use-case thresholds**

### Policy Layer

Three preconfigured use cases with **fully configurable** risk parameters:

| Use Case | Latency Budget | Risk Tolerance | Primary Risk Weight |
|----------|---------------|----------------|---------------------|
| Customer Support AI | 300ms | Low | PII (50%) |
| Internal Knowledge Assistant | 1,500ms | Medium | Hallucination (40%) |
| Decision Support Tool | 5,000ms | Low (strict) | PII + Hallucination (35% each) |

All thresholds are editable via the Policy Configuration UI — no hard-coded rules.

---

## Simulated Use Cases & Samples

### 1. Customer Support AI (`customer-support`)
| Sample | Expected Action | Risk Type |
|--------|----------------|-----------|
| Refund policy summary | Allow | Clean |
| Order tracking with PII | **Block** | SSN + email + card number in response |
| Price-match hallucination | **Flag** | 120-day claim vs 30-day source |
| Senior citizen bias | **Edit** | Age stereotyping + discount omission |

### 2. Internal Knowledge Assistant (`internal-knowledge`)
| Sample | Expected Action | Risk Type |
|--------|----------------|-----------|
| Remote work policy | Allow | Clean |
| Sales leaderboard with salaries | **Flag** | Employee IDs + salary below access tier |
| Draft expense policy as fact | **Edit** | Effective date + amounts hallucinated |
| Gender bias in promotion | **Flag** | Explicit gender stereotyping |

### 3. Decision Support Tool (`decision-support`)
| Sample | Expected Action | Risk Type |
|--------|----------------|-----------|
| Compliant credit risk assessment | Allow | Clean |
| Zip-code redlining | **Block** | Racial/geographic proxy bias (ECOA violation) |
| Insurance PII + fabricated decline policy | **Block** | **Hallucination + PII overlap** |
| Outdated KYC regulatory reference | **Flag** | Regulatory hallucination (2019 vs 2024) |

---

## Key Design Principles Demonstrated

| Principle | Implementation |
|-----------|---------------|
| Different risk per use case | Three separate policy configs with different weights, thresholds, latency budgets |
| Overlapping risk categories | Decision engine detects and amplifies co-occurring PII + hallucination + bias |
| No ground truth | Grounding checker operates on input/output only (no model internals) |
| Alert fatigue tradeoff | Tiered actions (not binary) + per-use-case thresholds tunable via UI |
| Multi-turn risk | Audit trail enables agentic cascade analysis |
| Evolving regulation | Policy layer is configurable, not hard-coded |
| API-only model access | Works entirely at input/output layer |
| Configurable policy layer | All thresholds editable via Policy Config page |
| Feedback loop | Correct/incorrect feedback on every check; FP/FN rate tracked on dashboard |

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **UI**: Tailwind CSS v4, Recharts, Lucide icons
- **Checkers**: Pure TypeScript (regex, statistical heuristics, claim extraction)
- **Storage**: Server-side in-memory store (replace with PostgreSQL for production)
- **AI-as-judge**: Architecture ready — plug in any LLM via `/api/check` pipeline

---

## Getting Started

```bash
cd controlplane
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the dashboard.

**Quick demo walkthrough:**
1. Dashboard → click "Seed Demo Data" to populate with all 12 sample interactions
2. Simulator → select "Decision Support Tool" → "Insurance PII + fabricated decline policy" → Run Check
   - Observe: **Block** action, hallucination + PII overlap, overlapping risk banner
3. Simulator → select "Customer Support AI" → "Senior citizen bias" → Run Check
   - Observe: **Auto-Edit** action, auto-redacted response
4. Audit Log → expand any row for full trace
5. Policy Config → adjust thresholds and re-run a check to see different outcomes

---

## API Reference

### `POST /api/check`
Run the checker pipeline on a prompt/response pair.

```json
{
  "useCaseId": "decision-support",
  "prompt": "What medical conditions disqualify the applicant?",
  "response": "Patricia Williams (SSN: 987-65-4321)...",
  "sourceDocs": ["Insurance Underwriting Policy: ..."]
}
```

**Response:**
```json
{
  "action": "block",
  "compositeScore": 0.94,
  "actionReason": "...",
  "checkerResults": [...],
  "overlappingRisks": ["hallucination+privacy"],
  "pipelineLatencyMs": 12,
  "withinBudget": true
}
```

### `GET /api/audit?mode=stats`
Dashboard statistics (totals, FP/FN rates, trend data)

### `GET /api/audit`
Paginated audit log with filters (`action`, `useCaseId`)

### `POST /api/feedback`
Submit correct/incorrect feedback for an audit entry

### `GET /api/policy`
Get all policy configurations

### `PATCH /api/policy`
Update policy for a use case

### `POST /api/seed`
Seed demo data (runs all 12 samples through the pipeline)

---

## Assumptions Stated

1. **No external AI calls in prototype** — checkers use deterministic heuristics and regex. The architecture accommodates LLM-as-judge (secondary OpenAI call) in production.
2. **In-memory storage** — persists for the server session. Production deployment would use PostgreSQL or a similar database.
3. **Source docs are provided** — in production, these would come from your RAG retrieval layer.
4. **Latency budget comparison is informational** — the prototype doesn't throttle or short-circuit based on budget, but reports whether it was exceeded.

---

## Roadmap

**Phase 1 (Prototype — complete)**
- Core checker pipeline (PII, hallucination, bias)
- Tiered decision engine with configurable policy
- Audit trail and feedback loop
- Dashboard with real-time metrics

**Phase 2 (Production hardening)**
- LLM-as-judge secondary evaluation for ambiguous cases
- PostgreSQL persistent audit store
- Webhook/event streaming for real-time integration
- Geo-aware policy profiles (GDPR, CCPA, DPDPA)

**Phase 3 (Enterprise scale)**
- Custom checker plugin SDK
- SOC 2 audit export
- Multi-tenant policy isolation
- Regulatory change feed with automated policy update suggestions

---

*Built for the Accenture Innovation Challenge · Round 2*
