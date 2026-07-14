#!/usr/bin/env python3
"""Build normalized Plate Quest plate images from the CC0 Kaggle dataset.

The dataset contains standard and specialty designs. Candidates are grouped by visual
similarity; the dominant visual group is treated as the common passenger design.
Smaller visual groups are retained as alternates for future identification features.
"""

import json
import math
import re
import sys
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps, ImageStat

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
MAX_CANDIDATES = 80
MAX_ALTERNATES = 3
HASH_DISTANCE = 24
COLOR_DISTANCE = 72.0


@dataclass(frozen=True)
class Candidate:
    path: Path
    score: int
    area: int
    image_hash: int
    mean_color: tuple[float, float, float]


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
    joined = "/".join(parts)
    if "valid" in joined or "validation" in joined:
        score += 15
    elif "test" in joined:
        score += 10
    return score


def perceptual_hash(image: Image.Image) -> int:
    gray = ImageOps.grayscale(image).resize((16, 10), Image.Resampling.LANCZOS)
    pixels = list(gray.getdata())
    average = sum(pixels) / len(pixels)
    value = 0
    for pixel in pixels:
        value = (value << 1) | int(pixel >= average)
    return value


def inspect_candidate(path: Path, aliases: list[str]) -> Candidate | None:
    score = candidate_score(path, aliases)
    if not score:
        return None
    try:
        with Image.open(path) as raw:
            image = ImageOps.exif_transpose(raw).convert("RGB")
            area = image.width * image.height
            ratio = image.width / max(image.height, 1)
            if not 1.25 <= ratio <= 3.8:
                return None
            if 1.5 <= ratio <= 3.2:
                score += 25
            sample = ImageOps.fit(image, (64, 40), method=Image.Resampling.LANCZOS)
            mean = tuple(ImageStat.Stat(sample).mean[:3])
            return Candidate(path, score, area, perceptual_hash(sample), mean)
    except Exception:
        return None


def visual_distance(left: Candidate, right: Candidate) -> float:
    hash_distance = (left.image_hash ^ right.image_hash).bit_count()
    color_distance = math.sqrt(sum((a - b) ** 2 for a, b in zip(left.mean_color, right.mean_color)))
    return hash_distance + color_distance / 8.0


def visually_similar(left: Candidate, right: Candidate) -> bool:
    hash_distance = (left.image_hash ^ right.image_hash).bit_count()
    color_distance = math.sqrt(sum((a - b) ** 2 for a, b in zip(left.mean_color, right.mean_color)))
    return hash_distance <= HASH_DISTANCE and color_distance <= COLOR_DISTANCE


def collect_candidates(images: list[Path], aliases: list[str]) -> list[Candidate]:
    candidates = [candidate for path in images if (candidate := inspect_candidate(path, aliases))]
    candidates.sort(key=lambda item: (item.score, item.area, str(item.path)), reverse=True)
    return candidates[:MAX_CANDIDATES]


def cluster_candidates(candidates: list[Candidate]) -> list[list[Candidate]]:
    clusters: list[list[Candidate]] = []
    for candidate in candidates:
        best_cluster = None
        best_distance = float("inf")
        for cluster in clusters:
            distance = min(visual_distance(candidate, member) for member in cluster)
            if distance < best_distance and any(visually_similar(candidate, member) for member in cluster):
                best_cluster = cluster
                best_distance = distance
        if best_cluster is None:
            clusters.append([candidate])
        else:
            best_cluster.append(candidate)
    clusters.sort(
        key=lambda cluster: (
            len(cluster),
            sum(item.score for item in cluster),
            max(item.area for item in cluster),
        ),
        reverse=True,
    )
    return clusters


def representative(cluster: list[Candidate]) -> Candidate:
    return min(
        cluster,
        key=lambda candidate: (
            sum(visual_distance(candidate, other) for other in cluster),
            -candidate.score,
            -candidate.area,
            str(candidate.path),
        ),
    )


def normalize_image(source: Path, destination: Path) -> None:
    with Image.open(source) as raw:
        image = ImageOps.exif_transpose(raw).convert("RGB")
        image.thumbnail((304, 184), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (320, 200), "white")
        canvas.paste(image, ((320 - image.width) // 2, (200 - image.height) // 2))
        destination.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(destination, "WEBP", quality=84, method=6)


def main(source_dir: str, output_dir: str, manifest_path: str) -> None:
    root = Path(source_dir)
    output = Path(output_dir)
    images = [path for path in root.rglob("*") if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS]
    if not images:
        raise SystemExit(f"No images found beneath {root}")

    plates: dict[str, str] = {}
    variants: dict[str, list[str]] = {}
    selection: dict[str, dict] = {}
    missing: list[str] = []

    for jurisdiction_id, aliases in JURISDICTION_ALIASES.items():
        candidates = collect_candidates(images, aliases)
        if not candidates:
            missing.append(jurisdiction_id)
            continue

        clusters = cluster_candidates(candidates)
        primary = representative(clusters[0])
        primary_destination = output / f"{jurisdiction_id}.webp"
        normalize_image(primary.path, primary_destination)
        plates[jurisdiction_id] = f"assets/plates/us/{primary_destination.name}"

        alternate_paths = []
        alternate_sources = []
        for index, cluster in enumerate(clusters[1:MAX_ALTERNATES + 1], start=2):
            alternate = representative(cluster)
            destination = output / f"{jurisdiction_id}-{index}.webp"
            normalize_image(alternate.path, destination)
            alternate_paths.append(f"assets/plates/us/{destination.name}")
            alternate_sources.append(str(alternate.path.relative_to(root)))
        if alternate_paths:
            variants[jurisdiction_id] = alternate_paths

        selection[jurisdiction_id] = {
            "primarySource": str(primary.path.relative_to(root)),
            "primaryClusterSize": len(clusters[0]),
            "candidateCount": len(candidates),
            "alternateSources": alternate_sources,
        }
        print(
            f"{jurisdiction_id}: {primary.path} "
            f"(dominant cluster {len(clusters[0])}/{len(candidates)}, {len(alternate_paths)} alternates)"
        )

    manifest_file = Path(manifest_path)
    manifest_file.parent.mkdir(parents=True, exist_ok=True)
    manifest_file.write_text(
        json.dumps(
            {
                "version": 2,
                "source": "gpiosenka/us-license-plates-image-classification",
                "license": "CC0-1.0",
                "selectionMethod": "dominant-visual-cluster",
                "plates": plates,
                "variants": variants,
                "selection": selection,
                "missing": missing,
            },
            indent=2,
            sort_keys=True,
        ),
        encoding="utf-8",
    )
    print(f"Generated {len(plates)} primary assets and {sum(map(len, variants.values()))} alternates; missing {missing}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("Usage: build_plate_assets.py SOURCE_DIR OUTPUT_DIR MANIFEST_PATH")
    main(sys.argv[1], sys.argv[2], sys.argv[3])
