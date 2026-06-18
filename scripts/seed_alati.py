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

DESC_ALATI_CANGLE = """Profesionalne cangle za precizno uklanjanje zanoktica i viška suve kože oko nokta. Zahvaljujući oštrim sečivima i ergonomskom obliku, omogućavaju čist rez, bolju kontrolu i sigurniji rad tokom manikira.

Izrađene su od nerđajućeg čelika, što ih čini dugotrajnim, otpornim i pogodnim za redovnu profesionalnu upotrebu, ali i za kućnu negu. Zakrivljena drška i lagani opružni mehanizam doprinose udobnijem rukovanju i preciznijem sečenju bez napora.

Ključne karakteristike:
• Precizna i oštra sečiva
• Namenjene za uklanjanje zanoktica i viška kože
• Nerđajući čelik / stainless steel
• Ergonomski oblik za stabilan hvat
• Opružni mehanizam za lakše rukovanje
• Pogodne za profesionalnu i kućnu upotrebu

Način upotrebe:
Pre upotrebe preporučuje se omekšati kožu oko noktiju i nežno potisnuti zanoktice. Canglama pažljivo ukloniti samo višak kože i zanoktica, bez preteranog pritiskanja ili povlačenja.

Održavanje:
Nakon upotrebe alat očistiti i dezinfikovati. Čuvati na suvom mestu kako bi se očuvala oštrina i higijenska ispravnost proizvoda."""

DESC_ALATI_MAKAZICE = """Makazice za zanoktice – zakrivljeni vrh

Profesionalne makazice za precizno uklanjanje zanoktica i viška kože oko nokta. Zahvaljujući tankom, blago zakrivljenom vrhu, omogućavaju precizan i kontrolisan rez čak i na teško dostupnim delovima oko nokatne ploče.

Izrađene su od nerđajućeg čelika, što ih čini izdržljivim, stabilnim i pogodnim za profesionalnu upotrebu u salonu, kao i za lični manikir kod kuće. Ergonomičan oblik omogućava lakše rukovanje i bolju kontrolu tokom rada.

Ključne karakteristike:
• Zakrivljen, tanak i precizan vrh
• Namenjene za sečenje zanoktica i viška suve kože
• Stainless steel / nerđajući čelik
• Oštre ivice za čist i precizan rez
• Pogodne za profesionalnu i kućnu upotrebu
• Lagan i stabilan hvat tokom rada

Način upotrebe:
Pre upotrebe nežno potisnuti zanoktice pusherom i omekšati kožu oko nokta. Makazicama pažljivo ukloniti samo višak zanoktica ili suve kože, bez povlačenja i kidanja kože.

Održavanje:
Nakon upotrebe očistiti i dezinfikovati alat. Čuvati na suvom mestu i zaštititi vrh od oštećenja kako bi makazice zadržale preciznost i oštrinu."""

DESC_ALATI_MIKRO = """Mikro makazice za zanoktice namenjene su preciznom i detaljnom uklanjanju viška kože oko nokta. Zahvaljujući tankim sečivima i opružnom mehanizmu, omogućavaju kontrolisan, lagan i precizan rad, posebno na manjim i teže dostupnim delovima oko nokatne ploče.

Izrađene su od nerđajućeg čelika, što ih čini izdržljivim, higijenskim i pogodnim za profesionalnu upotrebu u salonu, kao i za kućni manikir. Njihov lagan i praktičan oblik omogućava stabilan hvat, bolju kontrolu pokreta i preciznije uklanjanje zanoktica bez nepotrebnog pritiska.

Ključne karakteristike:
• Precizna mikro sečiva
• Opružni mehanizam za lakše rukovanje
• Namenjene za uklanjanje zanoktica i viška suve kože
• Nerđajući čelik / stainless steel
• Pogodne za detaljan i precizan rad
• Stabilan hvat i bolja kontrola tokom manikira
• Za profesionalnu i kućnu upotrebu

Način upotrebe:
Pre upotrebe omekšati kožu oko noktiju i nežno potisnuti zanoktice. Mikro makazicama pažljivo ukloniti samo višak suve kože i zanoktica, bez povlačenja ili preteranog pritiskanja.

Održavanje:
Nakon svake upotrebe alat očistiti i dezinfikovati. Čuvati na suvom mestu i zaštititi sečiva od oštećenja kako bi makazice zadržale preciznost i oštrinu."""

DESC_ALATI_PUSHER_01 = """Pogurivac 01 za zanoktice – dupli grip

Profesionalni metalni pogurivac namenjen za nežno potiskivanje zanoktica i pripremu nokatne ploče pre manikira. Dvostrani dizajn omogućava precizno guranje zanoktica jednim krajem, dok drugi kraj pomaže u uklanjanju ostataka suve kože i nečistoća sa površine nokta.

Zahvaljujući dvostrukom teksturisanom gripu, alat lepo leži u ruci i omogućava stabilnu kontrolu tokom rada. Izrađen je od nerđajućeg čelika, što ga čini pogodnim za profesionalnu i kućnu upotrebu.

Ključne karakteristike:
• Dvostrani pusher za zanoktice
• Dupli teksturisani grip za bolju kontrolu
• Namenjen za potiskivanje zanoktica i čišćenje nokatne ploče
• Nerđajući čelik / stainless steel
• Stabilan hvat tokom rada
• Pogodan za profesionalnu i kućnu upotrebu"""

DESC_ALATI_PUSHER_02 = """Pogurivac 02 za zanoktice – slim

Slim pogurivac za zanoktice namenjen je za precizno potiskivanje zanoktica i uklanjanje sitnih ostataka kože ili proizvoda sa nokatne ploče. Tanji oblik alata omogućava lako rukovanje i precizan rad, posebno kod detaljne pripreme nokta pre nanošenja baze, gela ili gel laka.

Teksturisani deo na sredini sprečava klizanje iz ruke i pruža bolju kontrolu tokom rada. Izrađen je od nerđajućeg čelika, zbog čega je praktičan, dugotrajan i jednostavan za održavanje.

Ključne karakteristike:
• Tanak i precizan oblik
• Dvostrani alat za pripremu nokta
• Namenjen za potiskivanje zanoktica i čišćenje nokatne ploče
• Teksturisani grip protiv klizanja
• Nerđajući čelik / stainless steel
• Pogodan za profesionalnu i kućnu upotrebu"""

PRODUCTS = [
    (
        "Profesionalne špatule za zanoktice",
        DESC_ALATI_CANGLE,
        "Alati za Manikir/Profesionalne cangle za zanoktice.png",
    ),
    (
        "Makazice za zanoktice – zakrivljeni vrh",
        DESC_ALATI_MAKAZICE,
        "Alati za Manikir/Makazice za zanoktice – zakrivljeni vrh.png",
    ),
    (
        "Mikro makazice",
        DESC_ALATI_MIKRO,
        "Alati za Manikir/Mikro_Makazice.png",
    ),
    (
        "Pogurivac za zanoktice",
        DESC_ALATI_PUSHER_01,
        "Alati za Manikir/Pogurivac_01.png",
    ),
    (
        "Pogurivac za zanoktice – model 2",
        DESC_ALATI_PUSHER_02,
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
            f"VALUES ('{sql_escape(name)}', '{sql_escape(desc)}', {PRICE}, '{sql_escape(url)}', {PT_ALATI}, {CAT_ALATI}, 50, NOW());"
        )
    stmts.append("COMMIT;")
    run_sql("\n".join(stmts))
    print(f"Added {len(PRODUCTS)} products at {PRICE} RSD.")


if __name__ == "__main__":
    main()
