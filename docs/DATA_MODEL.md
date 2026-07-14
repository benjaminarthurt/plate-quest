# Data Model

## Trip

```javascript
{
  id,
  name,
  startedAt,
  endedAt,
  startingPosition,
  lastKnownPosition,
  enabledCollections,
  status,
  totalDistanceMiles,
  totalPoints,
  playerIds,
  createdAt,
  updatedAt
}
```

## Sighting

```javascript
{
  id,
  tripId,
  jurisdictionId,
  category,
  latitude,
  longitude,
  accuracyMeters,
  currentJurisdictionId,
  sightedAt,
  estimatedDistanceMiles,
  basePoints,
  bonusPoints,
  note,
  enteredByPlayerId,
  manuallyPositioned,
  calculationDataVersion,
  createdAt
}
```

A unique constraint on `tripId + jurisdictionId` enforces one sighting per jurisdiction per trip.

## Jurisdiction

```javascript
{
  id,
  countryCode,
  name,
  abbreviation,
  category,
  geometryId,
  plateImageId,
  rarityTier,
  isCore,
  scoringMethod,
  aliases
}
```

## Player

```javascript
{
  id,
  displayName,
  avatar,
  color,
  createdAt
}
```

## Backup envelope

```json
{
  "format": "plate-quest-backup",
  "version": 1,
  "exportedAt": "2026-07-13T21:30:00-04:00",
  "players": [],
  "trips": [],
  "sightings": [],
  "achievements": [],
  "preferences": {}
}
```
