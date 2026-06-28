# SEO Meta Keyword Expansion — Design

**Date:** 2026-06-28
**Branch:** `master`

## Summary

Expand the keyword coverage of the site's `<head>` metadata (and JSON-LD) in
`index.html`, driven by real Search Console queries (`fallout shelter save editor`,
`fallout shelter file editor`, `… apk android`, `… online`) plus high-volume sibling
terms. Metadata only — no new visible page content, no FAQ, no mobile-support claims
(the app stays desktop-only; copy must not claim Android support, only "no APK needed").

## Scope

`index.html` only. No component, route, or content changes.

## Changes

### Title
`Fallout Shelter Save & File Editor: Edit Vault.sav Online`

### Description (meta, og, twitter, JSON-LD — kept identical)
`Free online Fallout Shelter save editor and file editor for PC. Load your Vault.sav to edit dwellers, SPECIAL stats, outfits, weapons, pets, caps, lunchboxes, and legendary dwellers. No download, install, or APK needed - it runs entirely in your browser.`

(Feature-accurate. Uses a plain hyphen, not an em dash.)

### Keywords meta
`fallout shelter save editor, fallout shelter file editor, fallout shelter save game editor, fallout shelter save editor online, fallout shelter save editor pc, fallout shelter save editor android, fallout shelter save editor apk, fallout shelter save editor ios, fallout shelter save editor steam, fallout shelter save editor download, fallout shelter vault editor, fallout shelter dweller editor, fallout shelter special editor, fallout shelter legendary dwellers, fallout shelter caps editor, fallout shelter lunchboxes, fallout shelter pet editor, fallout shelter outfit editor, fallout shelter weapon editor, vault.sav editor, vault.sav file editor, fallout shelter sav editor, fallout shelter cheats, fallout shelter hack, fallout shelter mod, fallout shelter unlimited caps, fallout shelter unlimited lunchboxes`

### og:title / twitter:title
Match the new Title.

### JSON-LD (WebApplication)
- `description`: match the new Description.
- Add `"alternateName": ["Fallout Shelter File Editor", "Fallout Shelter Save Game Editor", "Vault.sav Editor Online"]`.
- Add `"featureList": ["Edit dwellers", "Edit SPECIAL stats", "Edit outfits and weapons", "Edit pets", "Edit caps and lunchboxes", "Add legendary dwellers"]`.
- Keep `operatingSystem: "Any (web browser)"` (no platform-specific claim).

### Not changed
`<noscript>` content, `robots.txt`, `sitemap.xml`, canonical URL, theme-color, favicon.

## Verification

- `index.html` still parses (build succeeds: `npm run build`).
- The JSON-LD block remains valid JSON.
- Visual/manual: view-source shows the new title, description, keywords, alternateName,
  featureList.

## Out of Scope

- Mobile/responsive support (separate larger effort).
- On-page content / FAQ sections.
- Backlinks, analytics, or off-site SEO.
