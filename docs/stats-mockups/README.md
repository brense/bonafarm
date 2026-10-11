# Statistiek-mockups voor de nieuwe voer app

Gemaakt 10 okt 2026 op basis van de productiedata (Firestore `kibo-voer-app`, alleen gelezen, 3.616 logregels nov 2022 – 6 okt 2026).

- `png/` – schermafbeeldingen, per pagina een mobiele (390px) en desktop (1280px) versie.
- `html/` – de statische mockups zelf. `build-*.mjs` genereert elke pagina uit `../analysis/*.json`, `render.sh` maakt de PNG's met headless Chromium.
- `analysis/` – `findings.md` (bevindingen), `summary.json` (aggregaten per voer/koker/stal), `advice.json` (bestel-advies), `analyze.mjs` en `advice.mjs` (de berekening), `fetch-firestore-readonly.mjs` (read-only dump via REST, gebruikt de firebase CLI-login; ruwe dump staat niet in de repo).

Pagina's: overzicht, bestellijst, voer-hooi, voer-geitenkorrel (koker-voer), stallen, kokers, controles, jaaroverzicht (teaser 2026 vs 2025 en 2024 in het huidige donkere blauw/roze thema), jaarvergelijking (in-app vergelijkingspagina: lopend jaar naast de twee jaren ervoor, jaren aan- en uitzetten, periode-toggle).
