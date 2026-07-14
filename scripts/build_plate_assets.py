#!/usr/bin/env python3
"""Build normalized Plate Quest plate images from the CC0 Kaggle dataset."""

import json
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

JURISDICTION_ALIASES = {
    "US-AL": ["alabama", "al"], "US-AK": ["alaska", "ak"],
    "US-AZ": ["arizona", "az"], "US-AR": ["arkansas", "ar"],
    "US-CA": ["california", "ca"], "US-CO": ["colorado", "co"],
    "US-CT": ["connecticut", "ct"], "US-DE": ["delaware", "de"],
    "US-FL": ["florida", "fl"], "US-GA": ["georgia", "ga"],
    "US-HI": ["hawaii", "hi"], "US-ID": ["idaho", "id"],
    "US-IL": ["illinois", "il"], "US-IN": ["indiana", "in"],
    "US-IA": ["iowa", "ia"], "US-KS": ["kansas", "ks"],
    "US-KY": ["kentucky", "ky"], "US-LA": ["louisiana", "la"],
    "US-ME": ["maine", "me"], "US-MD": ["maryland", "md"],
    "US-MA": ["massachusetts", "ma"], "US-MI": ["michigan", "mi"],
    "US-MN": ["minnesota", "mn"], "US-MS": ["mississippi", "ms"],
    "US-MO": ["missouri", "mo"], "US-MT": ["montana", "mt"],
    "US-NE": ["nebraska", "ne"], "US-NV": ["nevada", "nv"],
    "US-NH": ["newhampshire", "nh"], "US-NJ": ["newjersey", "nj"],
    "US-NM": ["newmexico", "nm"], "US-NY": ["newyork", "ny"],
    "US-NC": ["northcarolina", "nc"], "US-ND": ["northdakota", "nd"],
    "US-OH": ["ohio", "oh"], "US-OK": ["oklahoma", "ok"],
    "US-OR": ["oregon", "or"], "US-PA": ["pennsylvania", "pa"],
    "US-RI": ["rhodeisland", "ri"], "US-SC": ["southcarolina", "sc"],
    "US-SD": ["southdakota", "sd"], "US-TN": ["tennessee", "tn"],
    "US-TX": ["texas", "tx"], "US-UT": ["utah", "ut"],
    "US-VT": ["vermont", "vt"], "US-VA": ["virginia", "va"],
    "US-WA": ["washingtonstate", "washington", "wa"],
    "US-WV": ["westvirginia", "wv"], "US-WI": ["wisconsin", "wi"],
    "US-WY": ["wyoming", "wy"],
    "US-DC": ["districtofcolumbia", "washingtondc", "dc"],
    "US-PR": ["puertorico", "pr"], "US-GU": ["guam", "gu"],
    "US-VI": ["usvirginislands", "virginislands", "vi"],
    "US-AS": ["americansamoa", "as"],
    "US-MP": ["northernmarianaislands", "commonwealthofthenorthernmarianaislands", "mp"],
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def candidate_score(path: Path, aliases: list[str]) -> int:
    parts = [normalized(part) for part in path.parts]
    stem = normalized(path.stem)
    score = 0
    for alias in aliases:
        alias = normalized(alias)
        if alias in parts:
            score = max(score, 100)
        if any(part == alias for part in parts[-4:]):
            score = max(score, 140)
        if alias and alias in stem:
            score = max(score, 75)
    # Prefer validation/test examples, which are often cleaner representatives.
    joined = "/".join(parts)
    if "valid" in joined or "validation" in joined:
        score += 15
    elif "test" in joined:
        score += 10
    return score


def select_source(images: list[Path], aliases: list[str]) -> Path | None:
    ranked = []
    for path in images:
        score = candidate_score(path, aliases)
        if not score:
            continue
        try:
            with Image.open(path) as image:
                area = image.width * image.height
                ratio = image.width / max(image.height, 1)
        except Exception:
            continue
        # Favor wider plate-like images and larger source resolution.
        plate_bonus = 25 if 1.5 <= ratio <= 3.2 else 0
        ranked.append((score + plate_bonus, area, str(path), path))
    return max(ranked, default=(0, 0, "", None))[-1]


def normalize_image(source: Path, destination: Path) -> None:
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        # Keep the entire plate, fit within a consistent 320x200 canvas.
        image.thumbnail((304, 184), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (320, 200), "white")
        x = (320 - image.width) // 2
        y = (200 - image.height) // 2
        canvas.paste(image, (x, y))
        destination.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(destination, "WEBP", quality=84, method=6)


def main(source_dir: str, output_dir: str, manifest_path: str) -> None:
    root = Path(source_dir)
    output = Path(output_dir)
    images = [p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS]
    if not images:
        raise SystemExit(f"No images found beneath {root}")

    manifest = {}
    missing = []
    for jurisdiction_id, aliases in JURISDICTION_ALIASES.items():
        source = select_source(images, aliases)
        if source is None:
            missing.append(jurisdiction_id)
            continue
        destination = output / f"{jurisdiction_id}.webp"
        normalize_image(source, destination)
        manifest[jurisdiction_id] = f"assets/plates/us/{destination.name}"
        print(f"{jurisdiction_id}: {source}")

    manifest_file = Path(manifest_path)
    manifest_file.parent.mkdir(parents=True, exist_ok=True)
    manifest_file.write_text(
        json.dumps(
            {
                "version": 1,
                "source": "gpiosenka/us-license-plates-image-classification",
                "license": "CC0-1.0",
                "plates": manifest,
                "missing": missing,
            },
            indent=2,
            sort_keys=True,
        ),
        encoding="utf-8",
    )
    print(f"Generated {len(manifest)} plate assets; missing {len(missing)}: {missing}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("Usage: build_plate_assets.py SOURCE_DIR OUTPUT_DIR MANIFEST_PATH")
    main(sys.argv[1], sys.argv[2], sys.argv[3])
