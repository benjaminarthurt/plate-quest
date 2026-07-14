# Scoring

## Displayed values

Plate Quest keeps two related totals:

- **Travel miles:** The estimated raw distance between the sighting and the nearest boundary of the issuing jurisdiction.
- **Game points:** A balanced score that prevents a few extremely distant plates from overwhelming the game.

## Base score

```text
Base points = round(20 × square-root(distance in miles))
```

A plate seen within its issuing jurisdiction receives 10 local-find points.

| Distance | Approximate base points |
|---:|---:|
| 0 miles | 10 |
| 25 miles | 100 |
| 100 miles | 200 |
| 500 miles | 447 |
| 1,000 miles | 632 |
| 3,000 miles | 1,095 |

## Suggested bonuses

| Bonus | Points |
|---|---:|
| First plate of trip | 50 |
| First jurisdiction from a new country | 100 |
| Territory | 250 |
| More than 1,000 miles away | 150 |
| Complete a region | 500 |
| Collect all jurisdictions bordering the current one | 300 |
| Current local jurisdiction | 25 |
| Rare or special plate | Configurable |

Scoring rules are data-driven and bundled in `data/scoring-rules.json` so balancing changes do not require rewriting gameplay logic.
