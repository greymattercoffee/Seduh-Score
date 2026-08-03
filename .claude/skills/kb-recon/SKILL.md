---
name: kb-recon
description: Auto-invoke on a CHANGELOG.md version bump, a POA item closing, or a business decision affecting a shared fact (pricing, tier scope, BNCC status). Runs the KB drift-audit procedure from KB-PROTOCOL.md so Code sessions don't need that document manually loaded. This skill is a summary of KB-PROTOCOL.md, not a fork — if the tier table or trigger matrix in KB-PROTOCOL.md changes, re-sync this file in the same session.
---

# KB recon

Packages `KB-PROTOCOL.md`'s drift-audit procedure as something that fires on
its own trigger conditions, instead of requiring the full document to be
loaded and read by hand every time. `KB-PROTOCOL.md` remains the authoritative
source — this skill summarizes Sections 1–6 for the Code-session case; read
`KB-PROTOCOL.md` directly for the full rationale, history, and Strategy/Design
session instructions.

## When this fires

| Trigger | Check |
|---|---|
| Every `CHANGELOG.md` bump | All Tier A docs' version-stamp line, plus `PLAN_OF_ACTION.md`'s "NEXT UP" line and any ✅/🔵/🟢 status markers touched by the shipped item |
| Minor or major version bump specifically | + `STRATEGY.md` version stamp, + `README.md` if public modules changed |
| A POA item closes | `PLAN_OF_ACTION.md` sequence log, + `ROADMAP.md` if that item was listed as an open phase deliverable |
| A business decision is made (pricing, tier scope, BNCC status) | `STRATEGY.md` (authoritative), + `ROADMAP.md` if it references the same fact |
| An initiative closes (a spec is fully built, an audit's findings resolved) | Move the relevant Tier C doc to `Superseded as of vX.Y` |

## Procedure

1. Read `CHANGELOG.md` first. Its most recent numbered header is the anchor version.
2. For each Tier A document (`KB-PROTOCOL.md`, `CLAUDE.md`, `CONVENTIONS.md`,
   `README.md` when public-facing, `PLAN_OF_ACTION.md`, `ROADMAP.md`): read the
   top-line `*State: vX.Y.Z — matches CHANGELOG.md as of [Month Year]*` stamp.
   Flag any mismatch against the anchor version. When correcting a stamp, scan
   that same document for any other version reference (footers, inline notes,
   tables) and reconcile them in the same edit — a corrected top-line stamp
   next to a still-stale footer is worse than the original drift.
3. **Artifact-existence check.** When any Tier A/B document asserts that a
   specific file, skill, or script was **built** — not just decided, but
   built — verify it against the repo (`git log --all -S"<name>"` or a
   direct file check) rather than taking the claim as read. A document can
   match CHANGELOG.md's version exactly and still assert a false thing
   about the repo (see KB-PROTOCOL.md, "Why this exists," fifth instance —
   this is exactly how the `kb-recon` skill itself was found to not exist
   for months before this file was written).
4. For `PLAN_OF_ACTION.md`: check the "NEXT UP" line and status markers
   against what's shipped since the last clean audit.
5. For `ROADMAP.md`: check the "Current State" table and the Master Version
   Timeline row for the anchor version.
6. For Tier B documents (`STRATEGY.md`): run the same check only if a
   minor/major bump happened since the last audit, or the session concerns a
   business fact.
7. For Tier C documents: confirm a closed initiative carries `Superseded as
   of vX.Y`. No other check needed.
8. Run `scripts/check-doc-versions.sh` from the repo root — it mechanically
   covers step 2 across all Tier A/B documents via stamp auto-discovery. It
   does not cover steps 3–7; those need the read-through above.
9. Report findings grouped by severity (below). **Do not silently auto-fix
   status drift or fact drift** — surface it and let the correction happen
   deliberately.

## Severity

- **Cosmetic** — stale stamp, nothing downstream depends on it. Fix opportunistically, not blocking.
- **Status drift** — an item marked active/next when it's actually shipped, or vice versa. **Blocking.**
- **Fact drift** — two documents state different values for the same fact (pricing, tier scope, an architecture claim). **Blocking, highest stakes.**

## Not covered by this skill

The KB-vs-repo check (Section 5, step 8 of `KB-PROTOCOL.md`) is Strategy-session-only —
it compares a KB upload snapshot against the live repo, which doesn't apply to
a Code session already working from local files. Load `KB-PROTOCOL.md`
directly for that check, and for the full Document Registry table (Section 1)
and Section 7's maintenance rules for adding/retiring documents.
