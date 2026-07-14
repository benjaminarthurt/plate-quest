#!/usr/bin/env python3
"""Build a compact North America admin-1 GeoJSON file for Plate Quest."""

import json
import sys
from pathlib import Path

from shapely.geometry import shape, mapping

COUNTRIES = {"USA", "CAN", "MEX"}


def feature_country(properties):
    for key in ("adm0_a3", "ADM0_A3", "sr_adm0_a3", "SOV_A3"):
        value = properties.get(key)
        if value:
            return str(value).upper()
    return ""


def feature_id(properties):
    for key in ("iso_3166_2", "ISO_3166_2", "postal", "POSTAL", "adm1_code"):
        value = properties.get(key)
        if value:
            value = str(value).upper()
            if "-" in value:
                return value
    return None


def main(source_path, output_path):
    source = json.loads(Path(source_path).read_text(encoding="utf-8"))
    output = []

    for feature in source.get("features", []):
        props = feature.get("properties", {})
        if feature_country(props) not in COUNTRIES:
            continue

        jurisdiction_id = feature_id(props)
        if not jurisdiction_id:
            continue

        geom = shape(feature["geometry"])
        if not geom.is_valid:
            geom = geom.buffer(0)
        geom = geom.simplify(0.025, preserve_topology=True)

        output.append(
            {
                "type": "Feature",
                "properties": {
                    "id": jurisdiction_id,
                    "name": props.get("name") or props.get("name_en") or jurisdiction_id,
                },
                "geometry": mapping(geom),
            }
        )

    result = {"type": "FeatureCollection", "features": output}
    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(result, separators=(",", ":"), ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Wrote {len(output)} jurisdiction boundaries to {destination}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: build_map_data.py source.geojson output.geojson")
    main(sys.argv[1], sys.argv[2])
