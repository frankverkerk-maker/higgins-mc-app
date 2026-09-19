#!/usr/bin/env python3
"""Validate the Higgins Mission Control publication library.

The validator intentionally uses only the Python standard library so it can run
in any authorised Sandbox and in GitHub Actions without extra dependencies.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

PUBLICATIONS_ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = PUBLICATIONS_ROOT / "catalog.json"
DEPARTMENTS_ROOT = PUBLICATIONS_ROOT / "departments"
ID_PATTERN = re.compile(r"^[A-Z][A-Z0-9]{1,7}-[A-Z][A-Z0-9]{1,9}-\d{4}-\d{3}$")
SEMVER_PATTERN = re.compile(r"^\d+\.\d+\.\d+$")
SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
REQUIRED_METADATA_FIELDS = {
    "schemaVersion",
    "id",
    "title",
    "shortTitle",
    "summary",
    "department",
    "departmentSlug",
    "higginsDomain",
    "documentType",
    "category",
    "language",
    "publicationDate",
    "referenceDate",
    "version",
    "status",
    "visibility",
    "file",
    "mediaType",
    "pageCount",
    "sizeBytes",
    "sha256",
    "topics",
    "rights",
    "disclaimer",
}
CATALOG_MATCH_FIELDS = {
    "id",
    "department",
    "departmentSlug",
    "title",
    "version",
    "publicationDate",
    "language",
    "status",
    "file",
    "sha256",
}


def read_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fail(f"Missing JSON file: {path.relative_to(PUBLICATIONS_ROOT)}")
    except json.JSONDecodeError as exc:
        fail(f"Invalid JSON in {path.relative_to(PUBLICATIONS_ROOT)}: {exc}")


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def validate_entry(entry: dict[str, Any], seen_ids: set[str]) -> None:
    publication_id = entry.get("id", "<missing-id>")
    require(publication_id not in seen_ids, f"Duplicate publication ID: {publication_id}")
    seen_ids.add(publication_id)
    require(bool(ID_PATTERN.fullmatch(publication_id)), f"Invalid publication ID: {publication_id}")
    require(entry.get("language") == "en", f"{publication_id}: language must be 'en'")
    require(bool(SEMVER_PATTERN.fullmatch(entry.get("version", ""))), f"{publication_id}: invalid semantic version")
    require(bool(DATE_PATTERN.fullmatch(entry.get("publicationDate", ""))), f"{publication_id}: invalid publication date")
    require(bool(SHA256_PATTERN.fullmatch(entry.get("sha256", ""))), f"{publication_id}: invalid SHA-256")

    relative_dir = Path(entry.get("path", ""))
    require(not relative_dir.is_absolute() and ".." not in relative_dir.parts, f"{publication_id}: unsafe catalogue path")
    publication_dir = PUBLICATIONS_ROOT / relative_dir
    require(publication_dir.is_dir(), f"{publication_id}: publication directory does not exist")
    require((publication_dir / "README.md").is_file(), f"{publication_id}: README.md is missing")

    metadata_path = publication_dir / "publication.json"
    metadata = read_json(metadata_path)
    missing = REQUIRED_METADATA_FIELDS - metadata.keys()
    require(not missing, f"{publication_id}: metadata missing fields: {sorted(missing)}")

    for field in CATALOG_MATCH_FIELDS:
        require(metadata.get(field) == entry.get(field), f"{publication_id}: catalogue and metadata disagree on '{field}'")

    require(metadata.get("visibility") == "public", f"{publication_id}: visibility must be public in this library")
    require(metadata.get("mediaType") == "application/pdf", f"{publication_id}: media type must be application/pdf")
    require(isinstance(metadata.get("pageCount"), int) and metadata["pageCount"] > 0, f"{publication_id}: invalid page count")
    require(isinstance(metadata.get("sizeBytes"), int) and metadata["sizeBytes"] > 0, f"{publication_id}: invalid byte size")
    require(isinstance(metadata.get("topics"), list) and metadata["topics"], f"{publication_id}: topics must be a non-empty list")

    filename = entry.get("file", "")
    require(Path(filename).name == filename and " " not in filename, f"{publication_id}: invalid filename")
    require(filename.lower().endswith(".pdf"), f"{publication_id}: publication file must be a PDF")
    pdf_path = publication_dir / filename
    require(pdf_path.is_file(), f"{publication_id}: PDF file is missing")
    require(pdf_path.read_bytes()[:5] == b"%PDF-", f"{publication_id}: file does not have a PDF signature")
    require(pdf_path.stat().st_size == metadata["sizeBytes"], f"{publication_id}: byte size does not match metadata")
    require(sha256(pdf_path) == metadata["sha256"], f"{publication_id}: SHA-256 does not match metadata")

    readme = (publication_dir / "README.md").read_text(encoding="utf-8")
    require(filename in readme, f"{publication_id}: README does not link to the PDF")
    require(publication_id in readme, f"{publication_id}: README does not show the publication ID")

    department_dir = DEPARTMENTS_ROOT / metadata["departmentSlug"]
    require(department_dir.is_dir(), f"{publication_id}: department directory is missing")
    require((department_dir / "README.md").is_file(), f"{publication_id}: department README is missing")


def main() -> None:
    catalog = read_json(CATALOG_PATH)
    require(catalog.get("schemaVersion") == 1, "Unsupported catalogue schema version")
    require(catalog.get("language") == "en", "Catalogue language must be English")
    publications = catalog.get("publications")
    require(isinstance(publications, list), "Catalogue publications must be an array")

    seen_ids: set[str] = set()
    for entry in publications:
        require(isinstance(entry, dict), "Each catalogue entry must be an object")
        validate_entry(entry, seen_ids)

    metadata_files = set(DEPARTMENTS_ROOT.glob("*/[0-9][0-9][0-9][0-9]/*/publication.json"))
    catalog_metadata_files = {PUBLICATIONS_ROOT / Path(entry["path"]) / "publication.json" for entry in publications}
    unlisted = metadata_files - catalog_metadata_files
    require(not unlisted, "Unlisted publication metadata: " + ", ".join(str(path.relative_to(PUBLICATIONS_ROOT)) for path in sorted(unlisted)))

    print(f"PASS: validated {len(publications)} Higgins MC publication(s) in English.")


if __name__ == "__main__":
    main()
