# Voerapp analysis (data 2022-11-03 to 2026-10-06, reference date 2026-10-06)

## Headline
- 3616 log rows: 3526 mutations (22 are zero-amount and ignored), the rest are koker emptying/emptied events.
- Consumption is dominated by bales: hooi (hay) is about 53% and stro (straw) about 13% of all units used in the last 12 months.
- Bags only (excluding hooi/stro) are about 250-325 per year (2023: 252, 2024: 326, 2025: 259; 2026 so far: 256).
- Hooi use per year: 481 (2023), 538 (2024), 434 (2025), 377 (2026 to Oct). Stro: 116, 162, 110, 95. Plausible for three stables.
- 2022 only has 2 months of data, so its numbers are partial.

## Top 5 feeds, last 12 months (units)
1. Hooi 478 (53%)  2. Stro 119 (13%)  3. Grasbrok 46  4. Geitenkorrel 42  5. Scharrelmix 32.5
(Then Varkensvoer 31.5, Legmeel scharrel 30, Parkiet zaad 17, Schapenkorrel 17, Konijnenkorrel 16.5.)

## Needs ordering (under 21 days at the 12-week rate)
- Stock is already 0 for: Geitenkorrel, Varkensvoer, Legmeel scharrel, Parkiet zaad, Kalveren JR-brok, Kalveren A-brok,
  Kalveren opfok-korrel, Eenden drijfvoer, Tropisch zaad. Scharrelmix: 0.5 left, about 8 days.
- Hooi: 19.5 bales left versus about 8.8 per week, so roughly 15 days. Stro: 6.5 left, about 27 days.
- Caution: stock 0 may just mean the count was never updated. See data quality below.
- Overstocked (more than 8 weeks): Cavia-muesli (about 44 weeks), Ei krachtvoer (about 19), Eenden korrel (about 12).
- No feed has stock but no activity for 180 days.

## Rules applied and how they behaved
- Move pairing (negative in a storage, positive elsewhere, same feed, within 10 min, equal or split amounts):
  299 moves paired out of 766 negatives in storage-type places = 39%.
  The other 467 (61%) are treated as bags used directly. This is not absurd: about half are in "Overige"
  (grasbrok 169, slobbervoer 40), which behaves like a pick-from-shelf store with no shute. But 61% is high,
  so some are probably moves whose destination was never logged. That would overstate consumption a little.
- Consumption events by rule: 506 shute fills, 1064 stable removals, 467 direct removals.
- Deleted storage ids: eendenkorrel, schapenkorrel, gemengdgraan treated as deleted shutes (only positives, id matches a feed,
  and they have emptying/emptied logs). kalveren also treated as a shute: only positives and two feeds link to it, but
  its id matches no feed, so it only partly fits the rule as written. overig has 2 positives and 2 negatives, so it is treated as a storage.
- Discontinued feeds (zangzaad, gemengdgraan, eivoer, papegaaienvoer, varkenskorrel) have tiny volumes (1-6 units each).
- No feed is flagged hidden in feeds.json, so the hidden flag is false everywhere.

## Delivery rhythm
- Hooi and stro are delivered on 131 and 130 separate days: median every 11 days, median size 17 hooi bales and 3 stro bales.
- Bagged feeds: typically every 2-6 weeks, 1-2 bags at a time. Rare feeds (kalveren JR-brok, pavo) every 5+ months.
- Hooi use is flat across the year (about 33-50 bales per month, peak April and October-November); no strong seasonality.
- Activity clusters on Tuesday (1515 rows) and Friday (1690 rows), mostly 09:00-13:00. These look like the two feeding rounds.

## Koker (shute) cycles
- Varkensvoer is emptied about every 112 days, Legmeel scharrel about 151, Eenden korrel about 119, Konijnenkorrel about 208,
  Tropische vogels about 306 (currently "emptying", unfinished), Geitenkorrel about 590 (only 2 cycles).
- Schapenkorrel (deleted) has 51 fills but only 3 cycles. Parkietzaad has 2 fills and no cycles.
- Shute "Scharrelmix" (scharrelmixnieuw) has zero logs of any kind: probably its fills were logged under the old "Legmeel scharrel" koker.

## Data quality
- Stock vs history: 14 storage/feed pairs where items disagree with the sum of mutations. Largest: geitenstal hooi
  (items 10 vs implied 16), paardenstal hooi (7.5 vs 2.5), overige legkorrel (0 vs 3), tonblauw varkensvoer (0 vs 2), overige grasbrok (4 vs 2).
  Stock was edited outside the mutation log, or some clicks were not logged.
- Running balance dipped below zero for 4 pairs (paardenstal hooi down to -5, overige grasbrok -2), and ends negative for 1 (tonroze kalverenmuesli, -1).
- 31 duplicate-looking mutation rows (same storage, feed, amount within 2 seconds); the app merges rapid clicks, so these may be real.
- 4 feeds link to storages missing from storages.json (abrok, kalverenmuesli -> kalveren; eendenkorrel; schapenkorrel).
  3 shutes have no feed linking to them: parkietzaad, scharrelmixnieuw, gemengdgraan (deleted).
- 117 log rows point to storage ids that no longer exist. 1 storage (scharrelmixnieuw) has zero logs.
- Many feeds show stock 0 while still being used, so "days until empty = 0" is likely partly a stale count.
