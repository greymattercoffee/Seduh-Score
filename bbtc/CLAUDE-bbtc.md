# BBTC module — Claude Code notes
*Temporary file — remove after POA-05, POA-06, POA-09 complete*

Read the root `CLAUDE.md` and `CONVENTIONS.md` first.

## Known quirks in this file

**Local :root override (POA-05)**
bbtc/index.html has a local :root block that overrides platform
tokens with a divergent cool-grey palette. Do not remove this
unless the session is specifically scoped to POA-05. If you are
running POA-05, show the full :root block and wait for
confirmation before removing it.

**Header structure (POA-06)**
Uses .hdr class instead of .plat-hdr. The full header rewrite
happens in POA-06 — do not partially rewrite the header in any
other session.

**Audience overlay (POA-09)**
The audience overlay in this file is entirely self-contained and
does not use shared/audience.js. Do not attempt to refactor it
unless the session is scoped to POA-09.

**Display name (POA-10)**
"Brunei Barista Team Championship" → "Barista Team Championship"
in display strings only. Internal references (bbtc, BBTC) and
storage key (bbtc_v3) stay unchanged. Fix in POA-06 only.

## When these are fixed
Delete this file after POA-05, POA-06, and POA-09 are complete.
The root CLAUDE.md handles everything from that point forward.
