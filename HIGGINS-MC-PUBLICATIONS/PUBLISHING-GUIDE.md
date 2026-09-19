# Higgins Mission Control Publication Guide

## Purpose

This guide defines how any authorised Sandbox can add an English-language publication to the central Higgins Mission Control library. The workflow is designed to preserve departmental ownership while keeping publication quality, traceability, and public sharing consistent.

## Required publication package

Each publication lives in:

```text
HIGGINS-MC-PUBLICATIONS/departments/<department-slug>/<year>/<publication-id>/
```

The folder must contain the final PDF, `publication.json`, and `README.md`. Supporting public diagrams or data may be included when they are necessary to understand or verify the publication. Draft notes, secrets, raw client files, private prompts, and internal-only evidence must not be published.

## Publication ID standard

Use the following format:

```text
<DEPARTMENT>-<CATEGORY>-<YEAR>-<SEQUENCE>
```

Examples include `JLC-SEC-2026-001`, `MOR-RSCH-2026-001`, and `ELON-ARCH-2026-001`. IDs are permanent and must never be reused. A revised publication keeps its ID and receives a higher semantic version unless the new work has a materially different scope.

## Naming standard

Use descriptive ASCII filenames with underscores. Include the department or subject, topic, language marker, and optional version where useful.

```text
Morgan_Prediction_Market_Microstructure_Report_EN_v1.0.pdf
Team_Elon_AI_Infrastructure_Architecture_EN_v1.0.pdf
```

All publication titles, metadata, summaries, release notes, and catalogue entries must be in English.

## Required review gates

Before publication, confirm that the document is final, readable, and complete. Verify that no privileged, confidential, personal, security-sensitive, or commercially restricted information is exposed. Confirm that all external claims are appropriately sourced and that generated charts and diagrams are accurate. Validate the PDF, calculate its SHA-256 checksum, and ensure the metadata matches the file exactly.

For legal, financial, medical, compliance, security, or other high-impact material, the qualified human reviewer named by the responsible department must approve the public version before it is merged into the default branch or released broadly.

## Cross-Sandbox workflow

An authorised Sandbox should clone or refresh `frankverkerk-maker/higgins-mc-app`, create a feature branch, copy the validated PDF into the correct department folder, create the required metadata and publication page, and add or update the corresponding entry in `HIGGINS-MC-PUBLICATIONS/catalog.json`. It must then run:

```bash
python3 HIGGINS-MC-PUBLICATIONS/tools/validate_publications.py
```

After validation, the Sandbox commits the publication, pushes the branch, and opens a pull request. The pull request is the review gate. Once merged, the repository path is stable and publicly accessible because the repository is public.

## GitHub Release workflow

For major or externally announced publications, create a GitHub Release after the pull request is merged. Use a stable tag such as:

```text
publication/JLC-SEC-2026-001/v1.0.0
```

Attach the same verified PDF to the release and include the publication ID, department, version, publication date, summary, checksum, and link to the repository publication page. A GitHub Release provides a clean external download page while the repository preserves the governed catalogue and metadata.

## Versioning and supersession

Use semantic versions. Patch releases correct formatting or immaterial errors. Minor releases add substantive content without replacing the publication's original purpose. Major releases represent a materially revised document. Never overwrite history silently. Update `supersedes` and `supersededBy` metadata where applicable, retain old versions, and label obsolete material clearly.

## Department onboarding

Create a department folder only when its first publication is being prepared or when the department needs an approved publication charter. Add a short English `README.md` describing the department's publication scope, publication-code prefix, and content restrictions. Register the department in `HIGGINS-MC-PUBLICATIONS/departments/README.md` and the root publication index.

## Direct links

A repository PDF link is suitable for browsing. For a direct raw download, use the file's raw GitHub URL. For externally distributed major reports, prefer a GitHub Release asset link because it is versioned, easy to cite, and independent of repository navigation.
