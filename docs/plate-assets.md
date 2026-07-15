# Plate Artwork Management

Plate Quest uses license plate images as visual clues during gameplay. The artwork helps families recognize where a plate came from, but it is not intended to show every design issued by a jurisdiction.

## Current asset source

The U.S. artwork is built from the Kaggle dataset:

- Dataset: `gpiosenka/us-license-plates-image-classification`
- License: CC0 1.0
- Build script: `scripts/build_plate_assets.py`
- Build workflow: `.github/workflows/pages.yml`

The GitHub Pages workflow downloads the dataset, selects representative images, converts them to WebP, writes a manifest, and includes the generated files in the deployed site.

## Generated files

Primary images use the jurisdiction ID as the filename:

```text
assets/plates/us/US-NY.webp
assets/plates/us/US-TX.webp
assets/plates/us/US-DC.webp
```

Alternate designs use numbered suffixes:

```text
assets/plates/us/US-NY-2.webp
assets/plates/us/US-NY-3.webp
```

The generated manifest is stored at:

```text
assets/plates/manifest.json
```

The application reads the `plates` object from this manifest for normal gameplay. Alternate images are retained in the manifest for future identification guides and specialty-plate features.

## Image format

Generated assets should follow these requirements:

- WebP format
- 320 × 200 pixel canvas
- Plate centered without stretching
- Original aspect ratio preserved
- White background
- Optimized for browser and offline use
- Primary image should represent a common passenger plate whenever possible

## Automatic primary-image selection

The build script does not simply choose the largest image. For each jurisdiction, it:

1. Finds matching dataset images.
2. Creates compact visual fingerprints.
3. Groups visually similar plates.
4. Selects the largest visual group as the most common design family.
5. Chooses the best-quality image from that group as the primary plate.
6. Saves representative images from other groups as alternates.

This reduces the chance that an uncommon charity, organization, or specialty plate becomes the default image.

## Checking generated selections

After a Pages build, review:

```text
assets/plates/manifest.json
```

Each jurisdiction entry includes selection details such as:

- Primary source image
- Number of candidates found
- Size of the dominant visual group
- Alternate image paths
- Alternate source images

Pay particular attention to states with many specialty plates, including New York, Florida, Texas, California, and Virginia.

## Replacing or overriding a plate

When automatic selection produces a poor result, the preferred long-term approach is to add a deterministic override to `scripts/build_plate_assets.py`.

An override should map the jurisdiction ID to a source path or a stable matching rule. Do not manually replace only the generated WebP in the Pages artifact, because the next build will overwrite it.

Example design:

```python
PRIMARY_OVERRIDES = {
    "US-NY": "train/new york/example.jpg",
}
```

Before committing an override:

1. Confirm the source belongs to the correct jurisdiction.
2. Prefer the standard passenger plate.
3. Confirm the image license permits inclusion.
4. Use a stable dataset-relative path where possible.
5. Rebuild and verify the generated manifest.

## Adding another country

Use a separate directory and manifest entries while keeping jurisdiction IDs consistent with `data/jurisdictions.json`.

Examples:

```text
assets/plates/ca/CA-ON.webp
assets/plates/mx/MX-JAL.webp
```

Recommended process:

1. Locate a public-domain or permissively licensed source.
2. Record its name, URL, and license in this document.
3. Add a dedicated build script or extend the existing script cleanly.
4. Normalize images to the same 320 × 200 format.
5. Add the generated paths to `assets/plates/manifest.json`.
6. Update Pages validation to require the expected jurisdiction count.
7. Confirm the service worker precaches the new primary images.

## Browser integration

The application loads:

```text
./assets/plates/manifest.json
```

If a jurisdiction has a primary image, it appears on:

- Plate collection buttons
- The collected-plates log

If no image is available, the application displays the jurisdiction abbreviation instead. Missing artwork must never prevent gameplay.

## Offline behavior

The service worker reads the plate manifest during installation and precaches primary plate images. Alternate images are not currently precached.

When primary artwork changes, increment the service-worker cache version so installed copies replace old images.

Use minor versions for small artwork or interface changes, for example:

```text
plate-quest-v9.2
```

Use a major version when the asset system or data structure changes substantially.

## Player-facing wording

The game should explain plate artwork in simple terms:

> Places can have lots of different plate designs. These pictures are examples to help your team recognize them, so the plate you spot may look a little different.

Avoid implying that one image represents every valid plate issued by that state, province, territory, or entity.
