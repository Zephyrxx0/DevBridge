---
created: 2026-05-20T19:27:52.919Z
title: Investigate GitHub SameSite cookie warnings
area: auth
files:
  - web/src/app/signin/page.tsx:58
  - web/src/app/auth/callback/route.ts:11
  - api/core/secrets.py:47
---

## Problem

Browser console shows repeated GitHub cookie rejections (`_gh_sess`, `_octo`, `logged_in`) in cross-site context due to `SameSite=Lax/Strict`.
Need confirm if this affects production auth or repository ingestion flows, and document exact failure conditions.

## Solution

Trace full sign-in flow and verify app does not depend on GitHub site cookies.
Confirm OAuth code exchange and backend GitHub API access only use provider token (`Bearer`) and app session cookies.
Add a short troubleshooting note for when these warnings are safe to ignore vs when they indicate broken architecture.
