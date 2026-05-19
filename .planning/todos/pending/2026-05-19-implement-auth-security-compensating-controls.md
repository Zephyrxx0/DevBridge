---
created: 2026-05-19T19:05:29.474Z
title: Implement auth security compensating controls
area: auth
files:
  - supabase
---

## Problem

Supabase free tier does not provide leaked password protection, so the project needs compensating controls to reduce account takeover and weak credential risk. We need a tracked task to harden authentication behavior before more feature work expands auth surface area.

## Solution

Implement and verify the following controls:

1. Enforce strong password rules in app UX (length + complexity).
2. Keep email verification on.
3. Keep short session/JWT lifetime for sensitive routes.
4. Add basic login anomaly monitoring + rate limits.
5. Encourage OAuth/SSO where possible.

Capture implementation decisions in phase planning and map each control to a concrete config or code change with tests/checks where applicable.
