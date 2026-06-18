#!/usr/bin/env python3
"""One-time catalog seed: products, categories, images, prices, descriptions."""

import json
import os
import shutil
import subprocess
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "honey_baza_tmp"
IMAGES = ROOT / "backend" / "src" / "HoneyCosmetics.Api" / "images"
DOCKER = "honey_cosmetics-postgres-1"

# Product type IDs (stable after initial seed)
PT_GEL = 1
PT_BAZE = 2
PT_BUILDER = 3
PT_TOP = 4
PT_NEGA = 5
PT_ALATI = 6

# Category IDs (existing + new)
CAT_BIAB = 8
CAT_HARD = 9
CAT_JELLY = 10

_image_cache: dict[str, str] = {}


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


def run_sql(statements: str) -> None:
    proc = subprocess.run(
        ["docker", "exec", "-i", DOCKER, "psql", "-U", "postgres", "-d", "honey_cosmetics", "-v", "ON_ERROR_STOP=1"],
        input=statements,
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"SQL failed:\n{proc.stdout}\n{proc.stderr}")


def copy_image(rel_path: str) -> str:
    if rel_path in _image_cache:
        return _image_cache[rel_path]
    src = SRC / rel_path
    if not src.exists():
        raise FileNotFoundError(src)
    IMAGES.mkdir(parents=True, exist_ok=True)
    ext = src.suffix.lower()
    name = f"{uuid.uuid4()}{ext}"
    shutil.copy2(src, IMAGES / name)
    url = f"/images/{name}"
    _image_cache[rel_path] = url
    return url


# ── Descriptions ─────────────────────────────────────────────────────────────

DESC_BASE_COAT = """Adheziona podloga | HEMA & TPO FREE

HONEY BASE je profesionalna baza namenjena kao podloga za hard gel, builder sisteme i rubber baze. Obezbeđuje snažno prijanjanje uz očuvanje fleksibilnosti u tankom sloju.

Ključne karakteristike:
• HEMA & TPO FREE
• Snažna adhezija
• Fleksibilna u tankom sloju
• Srednje retka, samonivelirajuća

Nanosi se isključivo u tankom sloju.
Polimerizacija: 60 sekundi.
Pakovanje: 15 ml."""

DESC_RUBBER_COVER = """Rubber Cover Base kombinuje bazu i blagu kamuflažu u jednom proizvodu. Savršena je za baby boomer, french i nude manikir bez dodatnih slojeva boje. Samonivelirajuća tekstura omogućava brzo formiranje apex-a. Formula je HEMA & TPO free.

Prednosti:
Prirodni tonovi
Štedi vreme u salonu
Srednja gustina
Dugotrajnost do 4+ nedelje"""

DESC_CLEAR_RUBBER = """Clear Rubber Base je elastična, samonivelirajuća baza srednje gustine, savršena za jačanje prirodnih noktiju i blagu nadogradnju. Zahvaljujući fleksibilnoj strukturi, prati prirodno savijanje nokta i sprečava pucanje. Formula je HEMA & TPO free.

Idealna za:
Slabe i lomljive nokte
Izravnavanje neravnina
Mini nadogradnju i apex tehniku

Vreme sušenja: 60 sek LED"""

DESC_BIAB_CLEAR = """BIAB (Builder In A Bottle) Gel je ojačavajući builder gel u bočici, namenjen jačanju i nadogradnji prirodnih noktiju bez potrebe za klasičnim gel sistemom. Samonivelirajuća formula omogućava brzo formiranje strukture, dok HEMA & TPO free sastav smanjuje rizik od iritacija.

Idealan za:
Prirodno jačanje
Kratku i srednju nadogradnju
Klijente koji žele čvršći sistem od rubber baze"""

DESC_BIAB_COVER = """BIAB (Builder In A Bottle) Gel je ojačavajući builder gel u bočici, namenjen jačanju i nadogradnji prirodnih noktiju bez potrebe za klasičnim gel sistemom. Samonivelirajuća formula omogućava brzo formiranje strukture, dok HEMA & TPO free sastav smanjuje rizik od iritacija.

Idealan za:
Prirodno jačanje
Kratku i srednju nadogradnju
Klijente koji žele čvršći sistem od rubber baze"""

DESC_GEL_POLISH = """Profesionalni pigmentovani gel lak | HEMA & TPO FREE

HONEY GEL POLISH je profesionalni gel lak visoke pigmentacije, kreiran za precizan salonski rad i dugotrajnu postojanost. Zahvaljujući HEMA & TPO FREE formuli, omogućava sigurniji rad i smanjen rizik od iritacija u poređenju sa klasičnim formulama. Široka paleta pažljivo odabranih nijansi odgovara svakodnevnim salon potrebama i trendovima.

Ključne karakteristike:
• HEMA & TPO FREE
• Visoka pigmentacija
• Pokrivanje u 1–2 sloja
• Srednja gustina bez zadebljanja
• Ne razliva se i lako se nanosi uz kožicu
• Samonivelirajuća tekstura
• Ne bledi do 4 nedelje
• Otporan na pucanje i krunjenje

Zašto ga tehničari vole:
• Štedi vreme u radu
• Precizna kontrola četkice
• Stabilan tokom nanošenja
• Pouzdan rezultat bez mrlja

Način upotrebe:
1. Pripremiti nokat (manikir, matiranje, odmašćivanje).
2. Naneti dehydrator i primer po potrebi.
3. Naneti bazu i polimerizovati.
4. Naneti boju u 1–2 sloja i polimerizovati 60 sekundi po sloju.
5. Završiti top coat-om i polimerizovati 90 sekundi.

Isključivo za profesionalnu upotrebu."""

DESC_HARD_GEL = """Hard Gel je čvrsti gradivni gel namenjen produžavanju noktiju na šablone i tipse. Visoka čvrstoća pruža maksimalnu stabilnost čak i kod dužih formi. Formula je HEMA & TPO free, sa minimalnim peckanjem tokom polimerizacije.

Karakteristike:
Gusta struktura
Ne razliva se
Idealno za ekstremne forme
Dugotrajna postojanost"""

DESC_TOP_COAT = """No-wipe završni top sa UV zaštitom | HEMA & TPO FREE

HONEY ICONIC TOP pruža intenzivan, dugotrajan sjaj bez disperzionog sloja. Zahvaljujući UV zaštiti, čuva svetle nijanse od žućenja i produžava svežinu boje do 4 nedelje. Fleksibilna struktura sprečava pucanje i osigurava trajnost.

Ključne karakteristike:
• HEMA & TPO FREE
• Bez lepljivog sloja
• Intenzivan visoki sjaj
• UV zaštita za svetle tonove
• Fleksibilan i otporan
• Ne žuti i ne menja nijansu

Profesionalne napomene:
• Idealno za french i baby boomer
• Ne preporučuje se preko reljefnog nail art-a bez prethodne baze
• Moguće je blago zagrevanje tokom polimerizacije

Polimerizacija: 90–120 sekundi
Pakovanje: 15 ml"""

DESC_TOP_COAT_COLORED = """No-wipe završni top u boji | HEMA & TPO FREE

HONEY COLORED TOP COAT je završni sjaj sa nežnim toniranim efektom, idealan za sve koji žele suptilan dodatak boje uz visok sjaj i uredan salonski izgled. Njegova formula daje staklast, sjajan završetak bez disperzionog sloja, dok blaga pigmentacija noktima pruža svež, elegantan i nežno obojen efekat.

Može se koristiti preko gel laka, baze, BIABa ili builder gela, u zavisnosti od željenog izgleda. Savršen je za clean manicure, nude i pink tonove, baby boomer, french i sve stilove gde želiš da nokat izgleda negovano, sjajno i blago tonirano — bez efekta teške, pune boje.

Ključne karakteristike:
• HEMA & TPO FREE
• Bez lepljivog sloja
• Završni sjaj sa blagom bojom
• Staklast i elegantan efekat
• Idealan za clean, nude i soft manicure
• Može se nanositi preko baze, gel laka, BIAB-a ili builder gela
• Ne daje punu pokrivnost kao gel lak, već providan tonirani efekat

Profesionalne napomene:
• Idealan za french, baby boomer i prirodan izgled noktiju
• Za intenzivniju boju naneti tanak drugi sloj, ukoliko je potrebno
• Ne preporučuje se kao zamena za gel lak kada je potrebna puna pokrivnost
• Moguće je blago zagrevanje tokom polimerizacije

Polimerizacija: 90–120 sekundi
Pakovanje: 15 ml"""

DESC_JELLY_GEL = """Honey Jelly Gel je gradivni gel stabilne jelly teksture, namenjen za modelovanje, ojačavanje i produžavanje noktiju. Zahvaljujući svojoj gustoj, kontrolisanoj strukturi, gel se lako postavlja na nokat i ne razliva se brzo ka zanokticama, što omogućava precizniji rad i lepše oblikovanje apeksa.

Idealan je za salonski rad, korekcije, izlivanje, kao i za ojačavanje prirodne nokatne ploče. Formula je HEMA & TPO free, što ga čini odličnim izborom za profesionalce koji žele savremeniji i pažljivije formulisan sistem rada.

Nakon polimerizacije, Jelly Gel pruža čvrst, stabilan i dugotrajan rezultat, uz prirodan i uredan izgled nokta."""

DESC_CUTICLE_LAVENDER = """Honey Cuticle Oil Lavender je nežno suvo ulje za negu zanoktica i kože oko noktiju, sa prijatnim i umirujućim mirisom lavande. Njegova lagana formula brzo se upija, lepo prijanja na kožu i ne ostavlja neprijatan masan osećaj, zbog čega je idealno za svakodnevnu upotrebu — u salonu ili kod kuće.

Pomaže da zanoktice izgledaju mekše, urednije i negovanije, dok noktima daje lep, zdrav i svež izgled. Savršeno je kao završni korak nakon manikira, ali i kao deo svakodnevne rutine nege ruku."""

DESC_CUTICLE_ALOE = """Honey Cuticle Oil Aloe Vera je nežno suvo ulje za negu zanoktica i kože oko noktiju, obogaćeno blagim dejstvom aloe vere. Njegova lagana formula brzo se upija, lepo prijanja na kožu i ne ostavlja neprijatan masan osećaj, zbog čega je idealno za svakodnevnu upotrebu — u salonu ili kod kuće.

Pomaže da zanoktice izgledaju mekše, urednije i negovanije, dok noktima daje lep, zdrav i svež izgled. Savršeno je kao završni korak nakon manikira, ali i kao deo svakodnevne rutine nege ruku."""

DESC_CUTICLE_ORANGE = """Honey Cuticle Oil Orange je nežno suvo ulje za negu zanoktica i kože oko noktiju, sa prijatnim i osvežavajućim mirisom pomorandže. Njegova lagana formula brzo se upija, lepo prijanja na kožu i ne ostavlja neprijatan masan osećaj, zbog čega je idealno za svakodnevnu upotrebu — u salonu ili kod kuće.

Pomaže da zanoktice izgledaju mekše, urednije i negovanije, dok noktima daje lep, zdrav i svež izgled. Savršeno je kao završni korak nakon manikira, ali i kao deo svakodnevne rutine nege ruku."""


def update_product(product_id: int, name: str, price: float, description: str, image_rel: str | None, category_id: int | None = None, product_type_id: int | None = None) -> str:
    set_parts = [
        f'"Name" = \'{sql_escape(name)}\'',
        f'"Price" = {price}',
        f'"Description" = \'{sql_escape(description)}\'',
    ]
    if image_rel:
        url = copy_image(image_rel)
        set_parts.append(f'"ImageUrl" = \'{sql_escape(url)}\'')
    if category_id is not None:
        set_parts.append(f'"CategoryId" = {category_id if category_id else "NULL"}')
    if product_type_id is not None:
        set_parts.append(f'"ProductTypeId" = {product_type_id}')
    return f'UPDATE "Products" SET {", ".join(set_parts)} WHERE "Id" = {product_id};'


def insert_product(name: str, price: float, description: str, image_rel: str, product_type_id: int, category_id: int | None = None) -> str:
    url = copy_image(image_rel)
    cat = "NULL" if category_id is None else str(category_id)
    return (
        f'INSERT INTO "Products" ("Name", "Description", "Price", "ImageUrl", "ProductTypeId", "CategoryId", "StockQuantity", "CreatedAt") '
        f"VALUES ('{sql_escape(name)}', '{sql_escape(description)}', {price}, '{sql_escape(url)}', {product_type_id}, {cat}, 50, NOW());"
    )


def main() -> None:
    print("Copying images and building SQL...")
    stmts: list[str] = ["BEGIN;"]

    # ── Product types ────────────────────────────────────────────────────────
    stmts += [
        f"UPDATE \"ProductTypes\" SET \"Name\" = 'Gel Color Polish' WHERE \"Id\" = {PT_GEL};",
        f"UPDATE \"ProductTypes\" SET \"Name\" = 'Builder Gelovi' WHERE \"Id\" = {PT_BUILDER};",
        f"UPDATE \"ProductTypes\" SET \"Name\" = 'Alati za manikir' WHERE \"Id\" = {PT_ALATI};",
    ]

    # ── Categories ───────────────────────────────────────────────────────────
    top_img = copy_image("Bočice_slike/Top_Coat.png")
    nega_img = copy_image("Bočice_slike/Lavender.png")
    alati_img = copy_image("Alati za Manikir/Profesionalne cangle za zanoktice.png")
    biab_img = copy_image("Bočice_slike/Builder_Gel.png")
    hard_img = copy_image("Bočice_slike/Hard_Gel.png")
    jelly_img = copy_image("Bočice_slike/Jelly_Gel.png")

    stmts += [
        "DELETE FROM \"Categories\" WHERE \"Id\" IN (4, 5, 6, 7);",
        f"UPDATE \"Categories\" SET \"Name\" = 'BIAB', \"ImageUrl\" = '{sql_escape(biab_img)}' WHERE \"Id\" = {CAT_BIAB};",
        f"UPDATE \"Categories\" SET \"Name\" = 'Hard Gel', \"ImageUrl\" = '{sql_escape(hard_img)}' WHERE \"Id\" = {CAT_HARD};",
        f"UPDATE \"Categories\" SET \"Name\" = 'Jelly Gel', \"ImageUrl\" = '{sql_escape(jelly_img)}' WHERE \"Id\" = {CAT_JELLY};",
        f"INSERT INTO \"Categories\" (\"Name\", \"ImageUrl\", \"ProductTypeId\") VALUES ('Top Coat', '{sql_escape(top_img)}', {PT_TOP});",
        f"INSERT INTO \"Categories\" (\"Name\", \"ImageUrl\", \"ProductTypeId\") VALUES ('Ulja za zanoktice', '{sql_escape(nega_img)}', {PT_NEGA});",
        f"INSERT INTO \"Categories\" (\"Name\", \"ImageUrl\", \"ProductTypeId\") VALUES ('Alati za manikir', '{sql_escape(alati_img)}', {PT_ALATI});",
    ]

    # ── Price fixes: Gel Color Polish ──────────────────────────────────────────
    stmts += [
        "UPDATE \"Products\" SET \"Price\" = 1100 WHERE \"Name\" IN ('SUPER WHITE', 'SUPER BLACK') AND NOT \"IsDeleted\";",
    ]

    # ── Baze ───────────────────────────────────────────────────────────────────
    stmts.append(update_product(101, "Base Coat", 1300, DESC_BASE_COAT, "Baze/Base Coat/Base Coat.png"))
    stmts.append(update_product(109, "Clear Rubber Base", 1400, DESC_CLEAR_RUBBER, "Baze/Rubber Cover Base/Clear Rubber Base.png"))
    rubber_images = {
        102: "Baze/Rubber Cover Base/R1.png",
        103: "Baze/Rubber Cover Base/R2.png",
        104: "Baze/Rubber Cover Base/R3.png",
        105: "Baze/Rubber Cover Base/R4.png",
        106: "Baze/Rubber Cover Base/R5.png",
        107: "Baze/Rubber Cover Base/R6.png",
        108: "Baze/Rubber Cover Base/R7.png",
    }
    for pid, img in rubber_images.items():
        num = img.split("/")[-1].replace(".png", "")
        stmts.append(update_product(pid, f"Rubber Cover Base {num}", 1500, DESC_RUBBER_COVER, img))

    # ── Builder Gel: BIAB ──────────────────────────────────────────────────────
    biab_products = {
        110: ("BIAB B01", 1250, DESC_BIAB_CLEAR, "Builder/BIAB-Builder in a Bottle/B01.png"),
        111: ("BIAB B02", 1450, DESC_BIAB_COVER, "Builder/BIAB-Builder in a Bottle/B02.png"),
        112: ("BIAB B03", 1450, DESC_BIAB_COVER, "Builder/BIAB-Builder in a Bottle/B03.png"),
        113: ("BIAB B04", 1450, DESC_BIAB_COVER, "Builder/BIAB-Builder in a Bottle/B04.png"),
        114: ("BIAB B05", 1450, DESC_BIAB_COVER, "Builder/BIAB-Builder in a Bottle/B05.png"),
    }
    for pid, (name, price, desc, img) in biab_products.items():
        stmts.append(update_product(pid, name, price, desc, img, CAT_BIAB))
    stmts.append('UPDATE "Products" SET "IsDeleted" = true, "DeletedAt" = NOW() WHERE "Id" = 115;')

    # ── Builder Gel: Hard Gel ──────────────────────────────────────────────────
    stmts.append(update_product(116, "Clear Hard Gel", 1800, DESC_HARD_GEL, "Bočice_slike/Hard_Gel.png", CAT_HARD))
    hard_existing = {
        117: ("Hard Gel H02", "Builder/Hard Gel/H02.png"),
        118: ("Hard Gel H03", "Builder/Hard Gel/H03.png"),
        119: ("Hard Gel H04", "Builder/Hard Gel/H04.png"),
        120: ("Hard Gel H05", "Builder/Hard Gel/H05.png"),
        121: ("Hard Gel H06", "Builder/Hard Gel/H06.png"),
        122: ("Hard Gel H07", "Builder/Hard Gel/H07.png"),
        123: ("Hard Gel H08", "Builder/Hard Gel/H08.png"),
    }
    for pid, (name, img) in hard_existing.items():
        stmts.append(update_product(pid, name, 2100, DESC_HARD_GEL, img, CAT_HARD))
    stmts.append(insert_product("Hard Gel H01", 2100, DESC_HARD_GEL, "Builder/Hard Gel/H01.png", PT_BUILDER, CAT_HARD))

    # ── Builder Gel: Jelly Gel ─────────────────────────────────────────────────
    for code in ("J01", "J02", "J03"):
        stmts.append(
            insert_product(
                f"Jelly Gel {code}",
                2100,
                DESC_JELLY_GEL,
                f"Builder/Jelly Gel/{code}.png",
                PT_BUILDER,
                CAT_JELLY,
            )
        )

    # ── Top Coat ───────────────────────────────────────────────────────────────
    # Category id for Top Coat will be assigned after insert; use subquery
    stmts += [
        insert_product("Top Coat", 1450, DESC_TOP_COAT, "Top Coat/Top Coat.png", PT_TOP, None),
        insert_product("Top Coat Brilliant", 1550, DESC_TOP_COAT, "Top Coat/Top Coat Brilliant.png", PT_TOP, None),
        insert_product("Colored Top Coat T01", 1450, DESC_TOP_COAT_COLORED, "Top Coat/Top Coat Colored/T01.png", PT_TOP, None),
        insert_product("Colored Top Coat T02", 1450, DESC_TOP_COAT_COLORED, "Top Coat/Top Coat Colored/T02.png", PT_TOP, None),
        insert_product("Colored Top Coat T03", 1450, DESC_TOP_COAT_COLORED, "Top Coat/Top Coat Colored/T03.png", PT_TOP, None),
        f'UPDATE "Products" SET "CategoryId" = (SELECT "Id" FROM "Categories" WHERE "Name" = \'Top Coat\' AND "ProductTypeId" = {PT_TOP} LIMIT 1) '
        f'WHERE "Name" IN (\'Top Coat\', \'Top Coat Brilliant\', \'Colored Top Coat T01\', \'Colored Top Coat T02\', \'Colored Top Coat T03\') '
        f'AND "ProductTypeId" = {PT_TOP} AND NOT "IsDeleted";',
    ]

    # ── Nega kože ──────────────────────────────────────────────────────────────
    stmts += [
        insert_product("Cuticle Oil Lavender", 450, DESC_CUTICLE_LAVENDER, "Nega Koze/Ulje za zanoktice/Lavender.png", PT_NEGA, None),
        insert_product("Cuticle Oil Aloe Vera", 450, DESC_CUTICLE_ALOE, "Nega Koze/Ulje za zanoktice/Aloe Vera.png", PT_NEGA, None),
        insert_product("Cuticle Oil Orange", 450, DESC_CUTICLE_ORANGE, "Nega Koze/Ulje za zanoktice/Orange.png", PT_NEGA, None),
        f'UPDATE "Products" SET "CategoryId" = (SELECT "Id" FROM "Categories" WHERE "Name" = \'Ulja za zanoktice\' AND "ProductTypeId" = {PT_NEGA} LIMIT 1) '
        f'WHERE "Name" LIKE \'Cuticle Oil%\' AND "ProductTypeId" = {PT_NEGA} AND NOT "IsDeleted";',
    ]

    stmts.append("COMMIT;")

    sql = "\n".join(stmts)
    print(f"Running SQL ({len(stmts)} statements)...")
    run_sql(sql)
    print(f"Uploaded {len(_image_cache)} images.")
    print("Done. Start the API once to generate WebP thumbnails.")


if __name__ == "__main__":
    main()
