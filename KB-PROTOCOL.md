# KB Consistency Protocol — Seduh Score

*Load this document into any session — Strategy, Code, or Design — to run a
drift audit. It is the single reference point for checking whether the
internal knowledge base is internally consistent. It does not describe how to
build anything; CONVENTIONS.md still owns that.*

---

## Why this exists

Seduh Score's knowledge base is a small set of hand-maintained documents, each
with a different owner-fact and a different audience. As a 1+1 shop (one
developer, one AI collaborator, three specialised session types), the risk is
not that any one document is wrong — it's that two documents quietly disagree
and nobody notices until a decision gets made off the stale one.

This happened concretely in July 2026: CHANGELOG.md advanced to v5.4.0 (MUA-07
shipped) across two sessions, but ROADMAP.md, STRATEGY.md, and
PLAN_OF_ACTION.md all still declared v5.3.0 as current, and PLAN_OF_ACTION.md's
"NEXT UP" line named an already-shipped item as active. The root cause: the
existing session-close checklist only *mandatorily* re-checked CLAUDE.md and
CONVENTIONS.md on every version bump — the three strategy documents were only
checked under a conditional trigger ("after a significant decision in a
Strategy session") that a Code-session version bump never fires.

This protocol replaces that asymmetry with an explicit, enumerable registry
and a trigger matrix, plus a mechanical script for the part that doesn't need
human judgment.

There are **two independent axes of drift** to check, not one:

1. **Doc-vs-doc drift** — do the documents agree with each other and with
   CHANGELOG.md (the ground truth)?
2. **KB-vs-repo drift** — does the knowledge base snapshot I'm reading in this
   session match what's actually in the local repo? (Strategy sessions only
   ever see the KB upload, never the live files.)

---

## 1. Document Registry & Authority Tiers

Every document below has exactly one **authority** — the fact(s) it is the
source of truth for. When a fact needs to appear in more than one document,
every other mention must derive from the authoritative one, not be
independently maintained.

| Document | Authority (owns this fact) | Tier | Public? |
|---|---|---|---|
| `CHANGELOG.md` | What shipped, and when — the ground truth | **Ground truth** — every session, no exceptions | No |
| `CLAUDE.md` | Repo structure / architecture snapshot for Code sessions | **A** | Yes |
| `CONVENTIONS.md` | Build patterns, session discipline, this protocol's home reference | **A** (structural check every bump; full pass at major/minor) | Yes |
| `README.md` | Public-facing module state | **A**, only when a public-facing module changed | Yes |
| `PLAN_OF_ACTION.md` | POA item status, the "NEXT UP" line | **A** | No |
| `ROADMAP.md` | Version sequencing, phase status, Current State table | **A** | No |
| `STRATEGY.md` | Business model, pricing, tiers, BNCC status | **B** | No |
| `LIGA-SPEC.md`, `CUP-TASTER-SPEC.md`, `MUA_mobile_audit.md`, `PLAN_OF_ACTION_MUA.md`, `AUDIT.md`, and similar single-initiative documents | Historical record of a closed initiative | **C** | No |

**Tier definitions:**
- **Ground truth** — CHANGELOG.md. Everything else is checked *against* it, never the reverse.
- **Tier A** — mandatory spot-check on *every* CHANGELOG.md bump, regardless of session type.
- **Tier B** — checked on minor/major bumps, or whenever a business-layer fact is in play (pricing, tiers, BNCC).
- **Tier C** — one-time documents tied to a specific initiative (a spec, an audit, a milestone-series plan). Once the initiative closes, they get a `Superseded as of vX.Y — see CHANGELOG.md` stamp and no further standing check. Their job is done; they become historical record, not living documents. Never let a session mistake one for current status.

**When a new document is added to the KB:** add it to this table before the
session closes. An unregistered document is exactly the failure mode this
protocol exists to prevent.

---

## 2. Version Stamp Contract

Every Ground-truth, Tier A, and Tier B document carries **exactly one**
version claim, in a fixed, easy-to-scan location, using this exact format:

```
*State: vX.Y.Z — matches CHANGELOG.md as of [Month Year]*
```

Rules:
- Place it as the **first line of the document**, immediately after the title. (Not buried in a closing footer — the whole point is a fast visual scan across files.)
- The version number must be an **exact match** to CHANGELOG.md's most recent numbered `## [X.Y.Z]` header — not a rounded-off "v5.x", not a paraphrase.
- A document may carry a *second*, longer footer note with more narrative detail (existing convention) — but the top-line stamp is the one thing every audit checks first, and it must never contradict the footer.
- Tier C documents use `Superseded as of vX.Y` instead — they don't track "current," they track "when this stopped being current."

This is the single change that makes drift visible without careful reading:
six files, six top lines, one comparison against CHANGELOG.md.

---

## 3. Reconciliation Trigger Matrix

| Trigger | Documents to check |
|---|---|
| Every CHANGELOG.md bump (any session type) | All Tier A docs — version stamp line, plus PLAN_OF_ACTION.md's "NEXT UP" line and any ✅/🔵/🟢 status markers touched by the shipped item |
| Minor or major version bump specifically | + STRATEGY.md version stamp, + README.md if public modules changed |
| A POA item closes | PLAN_OF_ACTION.md sequence log, + ROADMAP.md if that item was listed as an open phase deliverable |
| A business decision is made in a Strategy session (pricing, tier scope, BNCC status) | STRATEGY.md (authoritative), + ROADMAP.md if it references the same fact |
| An initiative closes (a spec is fully built, an audit's findings are resolved) | Move the relevant Tier C doc to `Superseded as of vX.Y` |
| Quarterly, or every major version, whichever comes first | Full sweep — every Tier A/B document read top to bottom, not just the stamp line; confirm KB snapshot matches repo |

---

## 4. Severity Levels

Not all drift deserves the same response. Triaging by severity is what keeps
this a spot-check instead of turning into a second full-time job.

- **Cosmetic** — the version stamp is stale but nothing downstream depends on
  it (e.g. a footer narrative note lags by one patch version). Fix
  opportunistically, not blocking.
- **Status drift** — an item is marked active/next when it has actually
  shipped, or vice versa. **Blocking** — this is what causes a session to
  propose the wrong next task, which is exactly what happened in July 2026.
  Must be caught before any "what's next" discussion.
- **Fact drift** — two documents state different values for the same fact
  (pricing, tier scope, an architecture claim). **Blocking, highest stakes**
  — this is the one that could get a Code session building against a stale
  spec, or a business conversation happening on outdated numbers.

---

## 5. Audit Procedure

Run this whenever this document is loaded into a session for that purpose,
or automatically per the trigger matrix above.

1. Read `CHANGELOG.md` first. Its most recent numbered header is the anchor
   version for this audit.
2. For each **Tier A** document: read the top-line version stamp. Flag any
   mismatch against the anchor version. **When adding or correcting a
   document's version stamp, also scan that same document for any other
   version reference — footers, inline "current version" notes, tables —
   and reconcile them in the same edit.** A stamp that's correct while the
   rest of the document still contradicts it is worse than the staleness it
   replaced (this happened to README.md in the first application of this
   protocol: the new top-line stamp said v5.4.0 while the pre-existing
   footer still said v5.3.3, until a same-day follow-up fixed it).
3. For `PLAN_OF_ACTION.md` specifically: check the "NEXT UP" line and any
   status markers against what CHANGELOG.md says has shipped since the last
   clean audit — a version-stamp match doesn't guarantee status markers
   inside the document are also current.
4. For `ROADMAP.md` specifically: check the "Current State" table and the
   Master Version Timeline row for the anchor version.
5. For **Tier B** documents: run the same check if a minor/major bump has
   happened since the last audit, or if the session concerns a business
   fact.
6. For **Tier C** documents: confirm a closed initiative carries its
   `Superseded as of vX.Y` stamp. No other check needed.
7. **KB-vs-repo check** (Strategy sessions only): confirm the KB upload
   timestamps for any Tier A document match what's expected given the
   session history — if in doubt, ask for the local repo file to be
   re-uploaded rather than assume the KB snapshot is current.
8. If working in the local repo (Code session), run
   `scripts/check-doc-versions.sh` — it mechanically checks step 2 across
   all Tier A/B documents in one pass. It does not do steps 3–7; those still
   need a read-through.
9. Report findings grouped by severity (Section 4). **Do not silently
   auto-fix fact drift or status drift** — surface it and let the correction
   happen deliberately, the same way any other strategic decision gets
   locked in this chat before it's written back to the KB.

---

## 6. Companion Script

`scripts/check-doc-versions.sh` — lives in the repo root's `scripts/`
directory. Mechanically extracts the version-stamp line from every Tier A/B
document and compares it against CHANGELOG.md's latest numbered header.

- Run from the repo root: `./scripts/check-doc-versions.sh`
- Exit code `0` — all tracked documents match. Exit code `1` — drift found.
  Exit code `2` — setup error (wrong directory, unparseable CHANGELOG).
- Covers **Section 2 (version stamp) drift only**. It cannot detect status
  drift or fact drift — those need the read-through in Section 5.
- Until every Tier A/B document has adopted the Section 2 stamp format, the
  script falls back to a looser pattern match on "last updated" / "current"
  lines, which is less reliable — treat a fallback-detected mismatch as
  trustworthy, but a fallback-detected "OK" as provisional until the
  document is migrated to the explicit stamp.
- Update the `DOCS` array in the script whenever the registry in Section 1
  changes.

---

## 7. Maintaining This Protocol

- **New document added to the KB** → add it to Section 1's registry table
  before the session closes, and to `scripts/check-doc-versions.sh` if it's
  Tier A/B.
- **Document retired or superseded** → move it to Tier C in Section 1, apply
  the `Superseded as of vX.Y` stamp, remove it from the script's `DOCS`
  array.
- **This document itself** carries a date stamp, not a version number — it
  tracks the platform's documents, it isn't one of them in the same sense.
  Update the date below whenever Sections 1–4 change materially (adding a
  document, changing a tier, changing the severity framework). Routine
  audits using this protocol don't require updating this file.

---

*Protocol established: July 2026. Companion to CONVENTIONS.md — that document
covers how to build; this one covers whether the knowledge base describing
the build is telling the truth.*
