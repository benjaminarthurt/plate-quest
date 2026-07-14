# Version 1 Technical Architecture

## Non-negotiable requirement

Version 1 is a standalone static web application. No backend API, server-side database, user account, login, or active internet connection is required after the application has been loaded and cached.

## Hosting

The production front end is deployed to GitHub Pages. GitHub Pages only serves static assets and is not part of the game's runtime data layer.

## Client architecture

```text
Browser / Installed PWA
├── Static HTML, CSS, and JavaScript
├── Web app manifest
├── Service worker and application cache
├── Bundled jurisdiction metadata
├── Bundled simplified GeoJSON boundaries
├── Bundled plate illustrations
├── IndexedDB game database
├── localStorage preferences
└── JSON import/export
```

## Storage

### IndexedDB

Primary persistent storage for:

- Trips
- Sightings
- Players
- Scores
- Achievements
- Saved location samples
- Optional route history
- Data schema version

### localStorage

Small preferences only:

- Active trip ID
- Theme
- Sound and motion preferences
- Units
- Last selected player
- Tutorial completion
- Last map viewport

The prototype may temporarily use localStorage while the IndexedDB repository layer is implemented, but the public Version 1 release should use IndexedDB for structured game data.

## Offline behavior

The service worker precaches all files required for gameplay:

- Application shell
- JavaScript and CSS
- Fonts and icons
- Jurisdiction metadata
- Simplified boundaries
- Plate thumbnails
- Scoring rules
- Achievements

Every player action is saved locally before the UI reports success. Network availability must never block starting a trip, adding a sighting, calculating a score, viewing history, or exporting data.

## Geolocation

Use `navigator.geolocation.watchPosition()` while the game is open. Accept coordinates based on an accuracy threshold and retain only useful samples.

The current jurisdiction is determined locally with point-in-polygon tests against bundled boundary data. Manual correction must be available, particularly near borders.

A browser PWA must not promise continuous GPS tracking while suspended, closed, or locked. Precise location is captured whenever a plate is recorded.

## Distance calculation

For an ordinary geographic jurisdiction:

1. Check whether the sighting lies within the issuing jurisdiction.
2. If inside, distance is zero.
3. If outside, find the nearest point on the jurisdiction boundary.
4. Calculate geodesic distance between the sighting and nearest boundary point.
5. Store both the calculated distance and calculation-data version with the sighting.

All calculations occur on the device.

## Map implementation

Recommended implementation:

- Leaflet bundled locally for interaction.
- Turf.js bundled locally for geometric operations.
- Simplified GeoJSON distributed with the application.
- No required remote tile layer.
- Optional online tiles may be displayed as decoration but cannot be required for gameplay.

## Static asset structure

```text
assets/plates/us/
assets/plates/ca/
assets/plates/mx/
assets/plates/territories/
assets/plates/special/
data/jurisdictions.json
data/jurisdiction-boundaries.geojson
data/scoring-rules.json
data/achievements.json
```

## Backup and restore

Version 1 supports:

- Export all data as JSON.
- Export a single trip.
- Import by merge or replacement.
- Schema validation.
- Duplicate ID detection.
- Automatic safety export before destructive replacement.
