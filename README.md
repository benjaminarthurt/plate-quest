# Plate Quest

Plate Quest is a mobile-first, offline-first road-trip license plate collection game for families and preteen players.

Players start a trip, allow location access, and collect states, provinces, territories, and other jurisdictions as their license plates are spotted. Version 1 is entirely client-side and remains playable without a backend API or database.

## Version 1 principles

- Static frontend deployable through GitHub Pages
- Installable Progressive Web App
- Local-first saves
- No accounts or backend dependency
- Offline application shell
- Device geolocation when available
- One collection per jurisdiction per trip
- Local distance and score calculations
- JSON backup and restore

## Local development

Serve the repository with any static HTTP server. Service workers and geolocation generally require HTTPS or localhost.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## GitHub Pages

A GitHub Actions workflow is included at `.github/workflows/pages.yml`.

In the repository settings:

1. Open **Settings → Pages**.
2. Set the deployment source to **GitHub Actions**.
3. Push to `main` or manually run the workflow.

## Documentation

- [Product specification](docs/PRODUCT_SPEC.md)
- [Technical architecture](docs/TECHNICAL_ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Scoring](docs/SCORING.md)
- [Jurisdictions](docs/JURISDICTIONS.md)
- [Roadmap](docs/ROADMAP.md)
- [Deployment](docs/DEPLOYMENT.md)

## Current status

The included interface is an early functional prototype. It supports local trip creation, jurisdiction collection, browser geolocation capture, local scoring, offline caching, and JSON export. The complete North American map geometry, final plate illustrations, boundary-distance calculations, IndexedDB migration, and achievements remain planned work.
