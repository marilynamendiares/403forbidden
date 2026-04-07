# 403Forbidden — Smoke Matrix v1

**Date:** 2026-04-05  
**Status:** active smoke matrix  
**Purpose:** определить минимальный набор сценариев, которые нужно регулярно прогонять при крупных изменениях, чтобы проект не терял работоспособность в главных пользовательских потоках.

---

## 1. Auth / Gate

- signup -> verify email -> login
- login existing user
- restricted user opens shell and can read allowed content
- approved player can enter player-only flows

## 2. Forum

- open forum index
- open category
- open thread
- send reply
- load older replies
- delete own reply

## 3. Arcs / Chapters

- open arcs discovery
- open arc page
- open chapter page
- send chapter post
- delete own chapter post
- publish/open/close chapter where allowed

## 4. Profile / Notifications / Presence

- open profile/settings
- update profile basics
- unread count updates correctly
- notifications page opens and marks state correctly
- presence ping does not fail for authenticated user

## 5. Shell

- shell opens without broken geometry
- top navigation changes screen without visual breakage
- sticky elements on `arcs` and `chapter` still behave correctly

## 6. Operational Rule

Эта матрица пока не является автоматизированным тест-раннером.

На первом этапе это каноничный список smoke-проверок, который должен использоваться:

- перед большими рефакторингами;
- после changes on hot paths;
- перед будущими публичными milestone-сборками.
