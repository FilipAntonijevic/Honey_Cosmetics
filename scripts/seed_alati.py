#!/usr/bin/env python3
"""Dodaje alate za manikir u kategoriju Alati za manikir."""

import subprocess
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "honey_baza_tmp"
IMAGES = ROOT / "backend" / "src" / "HoneyCosmetics.Api" / "images"
DOCKER = "honey_cosmetics-postgres-1"

PT_ALATI = 6
CAT_ALATI = 16
PRICE = 2000

PRODUCTS = [
    (
        "Profesionalne špatule za zanoktice",
        "Profesionalne metalne špatule za negu zanoktica i pripremu nokta. Precizan rad u salonu i kod kuće.",
        "Alati za Manikir/Profesionalne cangle za zanoktice.png",
    ),
    (
        "Makazice za zanoktice – zakrivljeni vrh",
        "Profesionalne makazice sa zakrivljenim vrhom za precizno uklanjanje zanoktica i čišćenje oko nokta.",
        "Alati za Manikir/Makazice za zanoktice – zakrivljeni vrh.png",
    ),
    (
        "Mikro makazice",
        "Mikro makazice za detaljan rad, precizno trimovanje zanoktica i nail art tehnike.",
        "Alati za Manikir/Mikro_Makazice.png",
    ),
    (
        "Pogurivac za zanoktice",
        "Pogurivac za zanoktice za nežno guranje i pripremu zanoktičnog rožnja pre manikira.",
        "Alati za Manikir/Pogurivac_01.png",
    ),
    (
        "Pogurivac za zanoktice – model 2",
        "Pogurivac za zanoktice, alternativni model za preciznu pripremu nokta i zanoktica.",
        "Alati za Manikir/Pogurivac_02.png",
    ),
]


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


def copy_image(rel_path: str) -> str:
    import shutil

    src = SRC / rel_path
    if not src.exists():
        raise FileNotFoundError(src)
    IMAGES.mkdir(parents=True, exist_ok=True)
    ext = src.suffix.lower()
    name = f"{uuid.uuid4()}{ext}"
    shutil.copy2(src, IMAGES / name)
    return f"/images/{name}"


def run_sql(statements: str) -> None:
    proc = subprocess.run(
        ["docker", "exec", "-i", DOCKER, "psql", "-U", "postgres", "-d", "honey_cosmetics", "-v", "ON_ERROR_STOP=1"],
        input=statements,
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"SQL failed:\n{proc.stdout}\n{proc.stderr}")


def main() -> None:
    stmts = ["BEGIN;"]
    for name, desc, img_rel in PRODUCTS:
        url = copy_image(img_rel)
        stmts.append(
            f"INSERT INTO \"Products\" (\"Name\", \"Description\", \"Price\", \"ImageUrl\", \"ProductTypeId\", \"CategoryId\", \"StockQuantity\", \"CreatedAt\") "
            f"VALUES ('{sql_escape(name)}', '{sql_escape(desc)}', {PRICE}, '{sql_escape(url)}', {PT_ALATI}, {CAT_ALATI}, 0, NOW());"
        )
    stmts.append("COMMIT;")
    run_sql("\n".join(stmts))
    print(f"Added {len(PRODUCTS)} products at {PRICE} RSD.")


if __name__ == "__main__":
    main()
