#!/usr/bin/env bash
# check-doc-versions.sh
# Seduh Score — KB Consistency Protocol companion script
#
# Purpose: mechanically compare the version stamp declared in each Tier A/B
# knowledge-base document against CHANGELOG.md's most recent shipped version.
# This checks ONLY the version-stamp axis of drift (see KB-PROTOCOL.md, Section 3).
# It does NOT check status markers (e.g. PLAN_OF_ACTION.md's done/active/backlog
# markers) or fact drift (pricing, tier definitions, architecture claims) —
# those still require a human/Claude read-through per KB-PROTOCOL.md, Section 5.
#
# Coverage is by AUTO-DISCOVERY, not a hardcoded file list. Every root-level
# *.md file (CHANGELOG.md itself excluded — it's the ground truth being
# compared against, not a document compared to itself) is scanned for the
# Tier A/B stamp line:
#   *State: vX.Y.Z ...*
# at the start of a line. Any file carrying that line is a Tier A/B doc for
# this script's purposes — full stop, no registration step required. This
# closes the gap where KB-PROTOCOL.md itself went unchecked for months: it
# was never added to a hardcoded DOCS array (and never added to its own
# Section 1 registry table either), so neither manually-maintained list ever
# flagged the other as incomplete. A new Tier A/B doc that adopts the same
# stamp convention is picked up automatically, with zero code changes here.
#
# Tier C docs (one-time initiative records — AUDIT.md, PLAN_OF_ACTION_MUA.md,
# etc.) use a deliberately different top-line stamp once their initiative
# closes:
#   *Superseded as of vX.Y ...*
# Any file carrying that line is explicitly skipped — it is retired, not
# stale, and comparing it to the current CHANGELOG version would be a false
# positive by design, not just an accident of the regex not matching.
#
# Files with neither stamp (LICENSE.md, FIREBASE-AUTH-SPEC.md, spec/handoff
# docs living outside the repo root, etc.) are silently ignored: this script
# only has an opinion about documents that opt into the stamp convention.
#
# Usage: run from the repo root
#   ./scripts/check-doc-versions.sh
#
# Exit code: 0 if every discovered Tier A/B doc matches CHANGELOG's latest
# version, 1 if any mismatch is found, 2 on a setup error (e.g. wrong
# directory, or CHANGELOG.md has no parseable version header).

set -uo pipefail

CHANGELOG="CHANGELOG.md"

if [[ ! -f "$CHANGELOG" ]]; then
  echo "ERROR: $CHANGELOG not found. Run this from the repo root." >&2
  exit 2
fi

# Find CHANGELOG's most recent numeric version header, e.g. "## [5.4.0] — ..."
# Skips non-version headers like "## [docs] — ...".
LATEST_VERSION=$(grep -m1 -oE '^## \[[0-9]+\.[0-9]+\.[0-9]+' "$CHANGELOG" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

if [[ -z "$LATEST_VERSION" ]]; then
  echo "ERROR: could not find a numeric version header in $CHANGELOG." >&2
  echo "Expected a line like '## [5.4.0] -- ...'" >&2
  exit 2
fi

echo "CHANGELOG.md latest shipped version: v$LATEST_VERSION"
echo ""
printf "%-20s %-15s %-15s\n" "DOCUMENT" "DECLARED" "STATUS"
printf "%-20s %-15s %-15s\n" "--------" "--------" "------"

MISMATCH=0
CHECKED=0

# Root-level only, non-recursive: confirmed (see KB-PROTOCOL.md Section 2)
# that every Tier A/B doc lives at the repo root and no file elsewhere in the
# tree (subfolders, .agents/ vendor skill docs, Handoff and Spec Files/)
# coincidentally matches the *State: stamp pattern.
for doc in *.md; do
  [[ -f "$doc" ]] || continue
  [[ "$doc" == "$CHANGELOG" ]] && continue

  # Tier C: retired initiative docs use a different top-line stamp and are
  # deliberately excluded — they are historical record, not living state,
  # and would always "mismatch" the current version by design.
  if grep -qE '^\*Superseded as of[[:space:]]*v[0-9]+\.[0-9]+\.[0-9]+' "$doc"; then
    printf "%-20s %-15s %-15s\n" "$doc" "-" "SKIP (Tier C)"
    continue
  fi

  DECLARED=$(grep -oE '^\*State:[[:space:]]*v[0-9]+\.[0-9]+\.[0-9]+' "$doc" | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

  # No stamp of either shape: this file hasn't opted into the KB Consistency
  # Protocol's version-tracking convention, so it's not this script's concern.
  [[ -z "$DECLARED" ]] && continue

  CHECKED=$((CHECKED + 1))
  if [[ "$DECLARED" == "$LATEST_VERSION" ]]; then
    printf "%-20s %-15s %-15s\n" "$doc" "v$DECLARED" "OK"
  else
    printf "%-20s %-15s %-15s\n" "$doc" "v$DECLARED" "MISMATCH"
    MISMATCH=1
  fi
done

echo ""
if [[ "$CHECKED" -eq 0 ]]; then
  echo "ERROR: no Tier A/B stamped documents were discovered at the repo root." >&2
  exit 2
fi

if [[ "$MISMATCH" -eq 0 ]]; then
  echo "All $CHECKED discovered Tier A/B document(s) match CHANGELOG.md (v$LATEST_VERSION)."
else
  echo "Drift detected. This is a version-stamp check only -- also run the"
  echo "full audit procedure in KB-PROTOCOL.md, Section 5, for status and fact drift."
fi

exit $MISMATCH
