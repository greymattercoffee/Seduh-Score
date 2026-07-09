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
# Usage: run from the repo root
#   ./scripts/check-doc-versions.sh
#
# Exit code: 0 if all tracked docs match CHANGELOG's latest version, 1 if any
# mismatch or missing stamp is found, 2 on a setup error (e.g. wrong directory).

set -uo pipefail

CHANGELOG="CHANGELOG.md"

# Tier A + Tier B docs tracked by the KB Consistency Protocol.
# Update this list when the registry in KB-PROTOCOL.md changes.
DOCS=(
  "CLAUDE.md"
  "CONVENTIONS.md"
  "README.md"
  "PLAN_OF_ACTION.md"
  "ROADMAP.md"
  "STRATEGY.md"
)

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
printf "%-20s %-15s %-10s\n" "DOCUMENT" "DECLARED" "STATUS"
printf "%-20s %-15s %-10s\n" "--------" "--------" "------"

MISMATCH=0

for doc in "${DOCS[@]}"; do
  if [[ ! -f "$doc" ]]; then
    printf "%-20s %-15s %-10s\n" "$doc" "-" "MISSING"
    MISMATCH=1
    continue
  fi

  # Preferred: the KB Consistency Protocol version-stamp contract —
  #   *State: vX.Y.Z ...*
  DECLARED=$(grep -oE '\*State:[[:space:]]*v[0-9]+\.[0-9]+\.[0-9]+' "$doc" | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

  # Fallback for docs not yet migrated to the contract: any v#.#.# on a line
  # mentioning "last updated" or "current".
  if [[ -z "$DECLARED" ]]; then
    DECLARED=$(grep -iE 'last updated|current' "$doc" | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | head -1 | tr -d 'v')
  fi

  if [[ -z "$DECLARED" ]]; then
    printf "%-20s %-15s %-10s\n" "$doc" "not found" "NO STAMP"
    MISMATCH=1
  elif [[ "$DECLARED" == "$LATEST_VERSION" ]]; then
    printf "%-20s %-15s %-10s\n" "$doc" "v$DECLARED" "OK"
  else
    printf "%-20s %-15s %-10s\n" "$doc" "v$DECLARED" "MISMATCH"
    MISMATCH=1
  fi
done

echo ""
if [[ "$MISMATCH" -eq 0 ]]; then
  echo "All tracked documents match CHANGELOG.md (v$LATEST_VERSION)."
else
  echo "Drift detected. This is a version-stamp check only -- also run the"
  echo "full audit procedure in KB-PROTOCOL.md, Section 5, for status and fact drift."
fi

exit $MISMATCH
