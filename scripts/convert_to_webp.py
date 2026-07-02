#!/usr/bin/env python3
"""
Pretvara PNG/JPEG u WebP (ista rezolucija, quality 92) i opciono briše originale.

Upotreba:
  python3 scripts/convert_to_webp.py --api-images
  python3 scripts/convert_to_webp.py --public
  python3 scripts/convert_to_webp.py --api-images --public --regenerate-variants

Za produkciju (na serveru, posle konverzije fajlova):
  python3 scripts/convert_to_webp.py --print-sql   # ispiše SQL za ažuriranje putanja u bazi
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Instaliraj Pillow: pip install Pillow", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_API_IMAGES = ROOT / "backend/src/HoneyCosmetics.Api/images"
PUBLIC_DIR = ROOT / "frontend/public"

RASTER_EXT = {".png", ".jpg", ".jpeg"}
SKIP_DIRS = {"thumbs", "medium"}
QUALITY = 92

SQL_UPDATES = """
-- Ažuriraj putanje slika u bazi posle konverzije PNG/JPEG → WebP
UPDATE "Products"
SET "ImageUrl" = regexp_replace("ImageUrl", '\\.(png|jpe?g)$', '.webp', 'i')
WHERE "ImageUrl" ~* '\\.(png|jpe?g)(\\?.*)?$';

UPDATE "ProductImages"
SET "ImageUrl" = regexp_replace("ImageUrl", '\\.(png|jpe?g)$', '.webp', 'i')
WHERE "ImageUrl" ~* '\\.(png|jpe?g)(\\?.*)?$';

UPDATE "Categories"
SET "ImageUrl" = regexp_replace("ImageUrl", '\\.(png|jpe?g)$', '.webp', 'i')
WHERE "ImageUrl" ~* '\\.(png|jpe?g)(\\?.*)?$';

UPDATE "HomeSlideshowSlides"
SET "ImageUrl" = regexp_replace("ImageUrl", '\\.(png|jpe?g)$', '.webp', 'i'),
    "MobileImageUrl" = regexp_replace("MobileImageUrl", '\\.(png|jpe?g)$', '.webp', 'i')
WHERE "ImageUrl" ~* '\\.(png|jpe?g)(\\?.*)?$'
   OR "MobileImageUrl" ~* '\\.(png|jpe?g)(\\?.*)?$';

UPDATE "SitePopups"
SET "ImageUrl" = regexp_replace("ImageUrl", '\\.(png|jpe?g)$', '.webp', 'i'),
    "MobileImageUrl" = regexp_replace("MobileImageUrl", '\\.(png|jpe?g)$', '.webp', 'i')
WHERE "ImageUrl" ~* '\\.(png|jpe?g)(\\?.*)?$'
   OR "MobileImageUrl" ~* '\\.(png|jpe?g)(\\?.*)?$';
"""


def convert_file(src: Path, quality: int, dry_run: bool) -> Path | None:
    dst = src.with_suffix(".webp")
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return None

    if dry_run:
        print(f"  [dry-run] {src.name} → {dst.name}")
        return dst

    with Image.open(src) as im:
        if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
            im = im.convert("RGBA")
        else:
            im = im.convert("RGB")
        im.save(dst, "WEBP", quality=quality, method=6)

    old_kb = src.stat().st_size / 1024
    new_kb = dst.stat().st_size / 1024
    saved = (1 - new_kb / old_kb) * 100 if old_kb else 0
    print(f"  ✓ {src.name} → {dst.name}  ({old_kb:.0f}KB → {new_kb:.0f}KB, −{saved:.0f}%)")
    return dst


def iter_api_originals(images_dir: Path):
    if not images_dir.is_dir():
        return
    for entry in sorted(images_dir.iterdir()):
        if entry.is_dir() and entry.name in SKIP_DIRS:
            continue
        if entry.is_file() and entry.suffix.lower() in RASTER_EXT:
            yield entry


def iter_public_rasters(public_dir: Path):
    if not public_dir.is_dir():
        return
    for path in sorted(public_dir.rglob("*")):
        if path.is_file() and path.suffix.lower() in RASTER_EXT:
            yield path


def convert_batch(files, quality: int, dry_run: bool, delete_originals: bool) -> list[Path]:
    converted: list[Path] = []
    for src in files:
        dst = convert_file(src, quality, dry_run)
        if dst is None:
            continue
        converted.append(dst)
        if delete_originals and not dry_run:
            src.unlink()
    return converted


def regenerate_variants(images_dir: Path, dry_run: bool):
    """Pozovi dotnet backfill preko restarta API-ja — ovde samo obriši stare medium/thumbs da se regenerišu."""
    for sub in ("thumbs", "medium"):
        folder = images_dir / sub
        if not folder.is_dir():
            continue
        count = 0
        for webp in folder.glob("*.webp"):
            if dry_run:
                count += 1
            else:
                webp.unlink()
                count += 1
        if count:
            action = "would delete" if dry_run else "deleted"
            print(f"  {action} {count} files in images/{sub}/ (regenerate on API restart)")


def main():
    parser = argparse.ArgumentParser(description="Convert PNG/JPEG images to WebP")
    parser.add_argument("--api-images", action="store_true", help="Convert backend API product images")
    parser.add_argument("--public", action="store_true", help="Convert frontend/public static assets")
    parser.add_argument("--quality", type=int, default=QUALITY)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-delete", action="store_true", help="Keep original PNG/JPEG files")
    parser.add_argument(
        "--regenerate-variants",
        action="store_true",
        help="Delete thumbs/medium WebP so API regenerates them from new originals on restart",
    )
    parser.add_argument("--images-dir", type=Path, help="Custom API images directory (e.g. /opt/honey-api/images on server)")
    args = parser.parse_args()

    if args.print_sql:
        print(SQL_UPDATES.strip())
        return

    if not args.api_images and not args.public:
        parser.error("Specify --api-images and/or --public")

    delete = not args.no_delete

    if args.api_images:
        images_dir = args.images_dir or DEFAULT_API_IMAGES
        print(f"\n=== API images: {images_dir} ===")
        files = list(iter_api_originals(images_dir))
        print(f"Found {len(files)} PNG/JPEG originals")
        convert_batch(files, args.quality, args.dry_run, delete)
        if args.regenerate_variants:
            print("Regenerating variant cache:")
            regenerate_variants(images_dir, args.dry_run)

    if args.public:
        print(f"\n=== Public assets: {PUBLIC_DIR} ===")
        files = list(iter_public_rasters(PUBLIC_DIR))
        print(f"Found {len(files)} PNG/JPEG files")
        convert_batch(files, args.quality, args.dry_run, delete)

    print("\nDone.")


if __name__ == "__main__":
    main()
