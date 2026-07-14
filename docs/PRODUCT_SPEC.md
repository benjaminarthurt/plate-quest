# Plate Quest Product Specification

## Product summary

Plate Quest is a mobile-first browser game for families and preteen-aged players on road trips. Players identify license plates and collect each issuing jurisdiction once per trip. The app displays a map of North America, follows the player's location, estimates how far each observed plate is from its home jurisdiction, and awards points.

## Gameplay loop

1. Create a trip and optionally add local player profiles.
2. Grant location permission or choose a location manually.
3. The game identifies the current state, province, territory, district, or Mexican state.
4. A passenger spots a plate and selects its jurisdiction from the map, search, or plate gallery.
5. The app records the sighting location, current jurisdiction, time, distance estimate, spotter, and score.
6. Each jurisdiction can be collected once per trip.
7. The trip dashboard totals collected jurisdictions, estimated travel miles, achievements, and game points.

## Safety and privacy

- The interface is intended for passenger use.
- The app does not request or store plate numbers.
- Photographing plates is not required.
- Location and trip history remain on the device in Version 1.
- Route history is optional and disabled by default.

## Primary screens

### Trip dashboard

Shows the active trip, total plates, travel miles, points, recent sightings, and quick actions.

### Collection map

Shows North American jurisdiction outlines, the current player location, collected status, and selected jurisdiction details.

### Plate picker

Offers map selection, text search, country filters, alphabetical browsing, and a visual plate gallery.

### Collection book

Presents collected plates as a family-friendly digital sticker book grouped by country and category.

### Trip timeline

Lists border crossings, sightings, achievements, corrections, and trip milestones.

### Trip summary

Shows final score, total distance, farthest plate, rarest plate, achievements, player contributions, and an exportable summary.

## Map behavior

The map is centered on the player when location is available. A View All control zooms to North America. Jurisdiction polygons are bundled with the application so gameplay does not depend on online tiles.

Map states:

| State | Presentation |
|---|---|
| Uncollected | Neutral fill |
| Collected | Bright fill and check mark |
| Current jurisdiction | Emphasized border |
| Selected | Highlight and plate preview |
| Newly collected | Brief celebratory animation |
| Player location | Pulsing position marker |

## Family modes

### Cooperative

All players contribute to one trip score and shared collection.

### Competitive

The first player to correctly call a plate receives individual credit. The jurisdiction remains collected for the entire trip.

## Accessibility

- Large touch targets.
- High-contrast map states.
- Text labels that do not rely on color alone.
- Reduced-motion mode.
- Screen-reader labels for plate cards and map controls.
- Miles and kilometers.
