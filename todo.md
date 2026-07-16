# Plate Quest 1.0 TODO

This checklist tracks the remaining work recommended before making Plate Quest broadly available to the public.

## Launch-critical

### Backup import and restore

- Add a JSON import control beside **Export JSON**.
- Validate the backup format and schema version before changing local data.
- Show a preview with trip and sighting counts.
- Support both **Merge** and **Replace all data**.
- Create a safety export before replacing existing data.
- Detect duplicate trip and sighting IDs.
- Display useful errors for corrupt or unsupported files.

### Offline and installation testing

Test from a clean device on Android and iOS:

1. Load the site for the first time.
2. Allow all core assets to finish caching.
3. Install or add the app to the home screen.
4. Enable airplane mode.
5. Fully close the browser or installed app.
6. Reopen Plate Quest.
7. Start a trip, locate the device, and collect plates.
8. Confirm the map, U.S. plate images, scoring, log, and export still work.

Also test upgrading from an older service-worker cache to the latest version.

### Stable production assets

- Commit a known-good generated North America GeoJSON file to the repository.
- Commit the selected primary U.S. plate artwork used by the release.
- Keep the map and plate scripts for intentional regeneration.
- Avoid making every production deployment depend on Natural Earth or Kaggle availability.
- Add a manual workflow or documented maintenance process for refreshing generated assets.

## Gameplay and trip management

### Trip summary

When a trip ends, show:

- Total plates collected
- Total points
- Combined estimated distance
- Farthest-away plate
- Countries represented
- Start and end times
- Final collection map

Provide actions for:

- Starting a new trip
- Returning to the completed trip
- Exporting that trip

### Past trips

Add a local trip-history screen that allows players to:

- View a completed trip
- Rename a trip
- Export one trip
- Delete one trip
- See its final collection map and totals

### Completion percentages

Replace or supplement the single overall percentage with:

- United States completion
- Canada completion
- Mexico completion
- Special entities completion
- Optional overall North America completion

Non-geographic special categories should not reduce the primary geographic completion percentage.

### Special entities rules

Document and enforce rules for:

- Temporary plates
- Government plates
- Diplomatic plates
- Tribal nation plates
- Historic or antique plates

For each category, define:

- Whether it can be collected once per trip
- Its fixed point value
- Whether it counts toward completion
- Whether it belongs under a country or under Special entities

## Privacy and safety

- Add a short privacy section to the welcome dialog and README.
- Explain that location and trip data remain on the device unless exported.
- Explain that Plate Quest does not collect plate numbers or plate photographs.
- Keep passenger-first safety wording prominent.

Suggested wording:

> Plate Quest uses your device location only to estimate distances and determine your current area. Trip and location data stay on this device unless you export them.

## Release engineering

- Update the README so it no longer describes the app as an early prototype.
- Correct the README feature-status list to reflect the real map and plate artwork pipeline.
- Add an application-code `LICENSE` file.
- Add `THIRD_PARTY_LICENSES.md` covering Natural Earth, the CC0 plate dataset, and other bundled assets.
- Add `CHANGELOG.md`.
- Display the application version under **Trip settings and data**.
- Tag the public release as `v1.0.0`.

## Automated tests

Add tests for:

- Point-in-polygon jurisdiction detection
- Nearest-boundary distance calculations
- Local finds producing zero distance
- Scoring calculations
- Duplicate sighting prevention
- Undo and log removal
- Local-storage state migration
- Backup import validation and merging

## Accessibility and browser testing

- Verify keyboard access for all controls and map regions.
- Verify visible focus states.
- Test screen-reader labels and announcement order.
- Confirm dialog focus trapping and dismissal behavior.
- Check text and control contrast.
- Test Chrome on Android.
- Test Safari on iPhone and iPad.
- Test Chrome and Edge on desktop.

## Post-1.0 candidates

These are intentionally outside the initial public-release scope:

- Achievements
- Competitive or individual-player modes
- Cloud synchronization
- Shared live trips across devices
- Complete Canadian and Mexican plate artwork
- Alternate and specialty plate browsing
- Historical plate collections
- Online leaderboards or rarity statistics
