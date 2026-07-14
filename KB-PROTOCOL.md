# KB Consistency Protocol — Seduh Score

*State: v5.11.0 — matches CHANGELOG.md as of July 2026*

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

A second, independent instance surfaced during the July 2026 full-repo audit:
CLAUDE.md was found several versions behind CHANGELOG.md (missing architecture
entries for `admin/`, `audience/`, `cup-taster/`, `about/`, `coming-soon/`,
`booth/`, and five `shared/` files; a stale "Known quirks" section listing
already-resolved items), and CONVENTIONS.md was a full audit cycle behind as
well — same root cause as the MUA-07 case: no session between the last KB
pass and the next re-checked docs against CHANGELOG. This confirms the drift
mode is recurring, not a one-off, which is why POA-38 folded the check into
standing session discipline rather than treating it as a closed incident.

A third instance, same failure mode, surfaced right after the v5.11.0 build:
`shared/pdf.js` shipping (POA-55) and the follow-up KB-sync doc session
(commit `9fb7554`) both cascaded correctly to `CLAUDE.md` but not to
`CONVENTIONS.md`, `README.md`, `PLAN_OF_ACTION.md`, `ROADMAP.md`, or
`STRATEGY.md` — all five still stamped v5.10.3 until a dedicated
reconciliation pass caught it. Not a new drift mode; a version bump touching
some Tier A/B docs and not others, exactly as above.

A fourth instance is the most serious of the three, plainly stated: the
**verification tooling itself had a blind spot**. `scripts/check-doc-versions.sh`
never checked this document — `KB-PROTOCOL.md` — despite it being a
git-tracked doc central to the very audit it runs, and this document never
carried a version stamp for the script to check in the first place. Root
cause traced to this same "Document Registry" table (Section 1): this
document was never added as a row in its own registry, so the script (whose
`DOCS` array is meant to mirror that table) inherited the omission
mechanically, not by deliberate exclusion. This means every past "exits 0"
result — including the one that closed the July 2026 repo audit — only ever
certified five/six-doc coverage while appearing to certify all of it. A
clean run from a tool with a hole in its own coverage is worse than a
correctly-reported failure: it manufactures false confidence instead of
surfacing the drift it exists to catch.

**First patched, then structurally closed.** The immediate fix (same
session) was a version stamp on this document plus a manual entry in both
Section 1's table and the script's hardcoded `DOCS` array — verified against
a deliberate mismatch (`MISMATCH`, exit 1) and the corrected state (exit 0).
But that patch left the actual defect in place: two independent
hand-maintained lists (this table, the script's array) that could each drift
from reality and from each other exactly as they just had. A follow-up
session removed the dependency on any maintained list at all —
`scripts/check-doc-versions.sh` now auto-discovers Tier A/B docs directly
from the Section 2 stamp convention (see Section 6), so a document is
checked because it carries the stamp, not because someone remembered to
register it twice. Section 1's table is now explicitly downgraded to a
curated reference, not a coverage gate. This is the difference between
patching an instance and closing the class of bug — worth noting because
the first three instances in this section were all patched (the specific
stale doc fixed) without the underlying mechanism changing, and each
recurred in a new shape. This one shouldn't recur in the same shape again.

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
| `KB-PROTOCOL.md` | This drift-audit procedure and this registry table itself | **A** | No — was previously unregistered in this very table, the exact failure mode this section warns about; added retroactively when `check-doc-versions.sh`'s blind spot on this doc was closed |
| `CLAUDE.md` | Repo structure / architecture snapshot for Code sessions | **A** | Yes |
| `CONVENTIONS.md` | Build patterns, session discipline, this protocol's home reference | **A** (structural check every bump; full pass at major/minor) | Yes |
| `README.md` | Public-facing module state | **A**, only when a public-facing module changed | Yes |
| `PLAN_OF_ACTION.md` | POA item status, the "NEXT UP" line | **A** | No |
| `ROADMAP.md` | Version sequencing, phase status, Current State table | **A** | No |
| `STRATEGY.md` | Business model, pricing, tiers, BNCC status | **B** | No |
| `LIGA-SPEC.md`, `CUP-TASTER-SPEC.md`, `PLAN_OF_ACTION_MUA.md`, `AUDIT.md`, `THROWDOWN-ARCHIVE-SPEC.md`, and similar single-initiative documents | Historical record of a closed initiative | **C** | No |
| `FIREBASE-AUTH-SPEC.md` | Historical record — **partially superseded**: its "Org Management" section (manual find/set-claims panel, `setOrgClaims`/`getOrgByEmail`) was removed as of v5.10.1 (POA-57), flagged inline at that section rather than a whole-document stamp, since the document's Auth/Gates pillars are still current and load-bearing (real Firebase Auth login, `gates.js` custom claims). Do not apply a blanket `Superseded as of vX.Y` stamp to this one — check the inline flag at the Org Management section instead. Was previously unregistered in this table; added retroactively | **C** (partial) | No |

**Tier definitions:**
- **Ground truth** — CHANGELOG.md. Everything else is checked *against* it, never the reverse.
- **Tier A** — mandatory spot-check on *every* CHANGELOG.md bump, regardless of session type.
- **Tier B** — checked on minor/major bumps, or whenever a business-layer fact is in play (pricing, tiers, BNCC).
- **Tier C** — one-time documents tied to a specific initiative (a spec, an audit, a milestone-series plan). Once the initiative closes, they get a `Superseded as of vX.Y — see CHANGELOG.md` stamp and no further standing check. Their job is done; they become historical record, not living documents. Never let a session mistake one for current status.

**When a new document is added to the KB:** add it to this table before the
session closes — for its Tier, Authority, and Public-facing status, which
are curatorial facts nothing else derives automatically. An unregistered
document is a **documentation gap**, not a verification gap: as of the
auto-discovery rewrite (see Section 6), `scripts/check-doc-versions.sh` no
longer reads this table to decide what to check — it discovers Tier A/B
docs directly by the stamp convention in Section 2, so a doc missing from
this table still gets its version checked. It just won't have a curated
description here for a human/Strategy session to read. Do not assume a row
in this table is what makes a document "covered" going forward — that
assumption is exactly what let `KB-PROTOCOL.md` itself go unchecked for
months (see "Why this exists," fourth instance).

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
   re-uploaded rather than assume the KB snapshot is current. See
   `CLAUDE.md`'s `## KB sync architecture` section for which docs sync via
   the GitHub integration (manual-trigger "Sync now") vs. which stay on
   manual upload by necessity (gitignored docs).
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
directory. Compares the version stamp declared in every Tier A/B document
against CHANGELOG.md's latest numbered header.

**Coverage is by auto-discovery, not a maintained file list.** The script
scans every root-level `*.md` file (CHANGELOG.md itself excluded, since it's
the ground truth being compared against). Any file whose first matching line
is the Section 2 contract stamp —
```
*State: vX.Y.Z ...*
```
— is checked. Any file instead carrying the Tier C stamp —
```
*Superseded as of vX.Y ...*
```
— is explicitly skipped (retired, not stale — comparing it would be a false
positive by design). A file with neither line is silently ignored: it
hasn't opted into the convention, so the script has no opinion about it.

This means **a new Tier A/B document needs no registration step for
coverage** — add the Section 2 stamp line and the next run picks it up.
Likewise a Tier C retirement needs no script edit — swap the stamp line to
`Superseded as of` and the script stops comparing it on the next run. This
is what closed the fourth "why this exists" instance: `KB-PROTOCOL.md` had
gone unchecked because a hardcoded list and this document's own registry
table both depended on the other to flag an omission, and neither did.
Auto-discovery removes that dependency entirely — coverage now derives from
the same convention every document already has to follow to be Tier A/B in
the first place.

- Run from the repo root: `./scripts/check-doc-versions.sh`
- Exit code `0` — every discovered Tier A/B document matches. Exit code `1`
  — drift found in at least one. Exit code `2` — setup error (wrong
  directory, unparseable CHANGELOG, or zero Tier A/B documents discovered —
  the last case almost certainly means the stamp convention itself broke,
  not that the KB genuinely has no tracked documents).
- Covers **Section 2 (version stamp) drift only**. It cannot detect status
  drift or fact drift — those need the read-through in Section 5.
- Section 1's registry table is a **curated reference** (tier, authority,
  public-facing status) for humans and Strategy sessions to read — it is no
  longer what gates the script's coverage. Keep it up to date for that
  reason, not because the script depends on it.

---

## 7. Maintaining This Protocol

- **New document added to the KB** → give it the Section 2 stamp if it's
  Tier A/B (this alone gets it checked by `scripts/check-doc-versions.sh` —
  no script edit needed), and add it to Section 1's registry table for the
  curated tier/authority/public-facing record. The table is documentation
  now, not a coverage gate — see Section 6 — but skipping it is still a gap
  a future reader shouldn't have to rediscover.
- **Document retired or superseded** → move it to Tier C in Section 1 and
  swap its top line to the `Superseded as of vX.Y` stamp. No script edit
  needed — the stamp change alone removes it from active checking.
- **This document itself** now carries the standard Section 2 `*State:
  vX.Y.Z*` stamp (added when the `check-doc-versions.sh` blind spot on this
  document was closed — see "Why this exists," fourth instance) and is
  checked by the same auto-discovery pass as every other Tier A doc. It
  previously carried a date-only stamp on the theory that it tracks the
  platform's documents rather than being one of them — that reasoning no
  longer holds now that coverage is convention-based, not a hand-maintained
  list this document could sit outside of. The footer below (established
  date, last-updated narrative) remains as a second, longer note per the
  existing convention — it supplements the top-line stamp, it doesn't
  replace it.

---

*Protocol established: July 2026. Last updated: July 2026 — `MUA_mobile_audit.md`
removed from registry — file no longer exists on disk or in git history; local-only
working doc (consistent with the `.gitignore`-excluded `PLAN_OF_ACTION_MUA.md`
pattern), untraceable, not a supersession. Prior update: `THROWDOWN-ARCHIVE-SPEC.md`
registered as Tier C (POA-40 seed spec). Companion to CONVENTIONS.md — that document
covers how to build; this one covers whether the knowledge base describing
the build is telling the truth.*
