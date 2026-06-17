#!/usr/bin/env python3
"""Update product descriptions in the database."""

from seed_catalog import (
    DESC_BASE_COAT,
    DESC_BIAB_CLEAR,
    DESC_BIAB_COVER,
    DESC_CLEAR_RUBBER,
    DESC_CUTICLE_ALOE,
    DESC_CUTICLE_LAVENDER,
    DESC_CUTICLE_ORANGE,
    DESC_GEL_POLISH,
    DESC_HARD_GEL,
    DESC_JELLY_GEL,
    DESC_RUBBER_COVER,
    DESC_TOP_COAT,
    DESC_TOP_COAT_COLORED,
    sql_escape,
    run_sql,
)

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


def set_description(name: str, description: str) -> str:
    return (
        f"UPDATE \"Products\" SET \"Description\" = '{sql_escape(description)}' "
        f"WHERE \"Name\" = '{sql_escape(name)}' AND NOT \"IsDeleted\";"
    )


def set_description_like(pattern: str, description: str) -> str:
    return (
        f"UPDATE \"Products\" SET \"Description\" = '{sql_escape(description)}' "
        f"WHERE \"Name\" LIKE '{sql_escape(pattern)}' AND NOT \"IsDeleted\";"
    )


def set_description_product_type(product_type_id: int, description: str) -> str:
    return (
        f"UPDATE \"Products\" SET \"Description\" = '{sql_escape(description)}' "
        f"WHERE \"ProductTypeId\" = {product_type_id} AND NOT \"IsDeleted\";"
    )


def main() -> None:
    stmts = ["BEGIN;"]

    stmts.append(set_description("Base Coat", DESC_BASE_COAT))
    stmts.append(set_description("Clear Rubber Base", DESC_CLEAR_RUBBER))
    stmts.append(set_description_like("Rubber Cover Base %", DESC_RUBBER_COVER))

    stmts.append(set_description("BIAB B01", DESC_BIAB_CLEAR))
    for code in ("B02", "B03", "B04", "B05"):
        stmts.append(set_description(f"BIAB {code}", DESC_BIAB_COVER))

    stmts.append(set_description("Clear Hard Gel", DESC_HARD_GEL))
    stmts.append(set_description_like("Hard Gel H%", DESC_HARD_GEL))

    stmts.append(set_description_like("Jelly Gel %", DESC_JELLY_GEL))

    stmts.append(set_description("Top Coat", DESC_TOP_COAT))
    stmts.append(set_description("Top Coat Brilliant", DESC_TOP_COAT))
    stmts.append(set_description_like("Colored Top Coat %", DESC_TOP_COAT_COLORED))

    stmts.append(set_description("Cuticle Oil Lavender", DESC_CUTICLE_LAVENDER))
    stmts.append(set_description("Cuticle Oil Aloe Vera", DESC_CUTICLE_ALOE))
    stmts.append(set_description("Cuticle Oil Orange", DESC_CUTICLE_ORANGE))

    stmts.append(set_description_product_type(1, DESC_GEL_POLISH))

    stmts.append(set_description("Profesionalne špatule za zanoktice", DESC_ALATI_CANGLE))
    stmts.append(set_description("Makazice za zanoktice – zakrivljeni vrh", DESC_ALATI_MAKAZICE))
    stmts.append(set_description("Mikro makazice", DESC_ALATI_MIKRO))
    stmts.append(set_description("Pogurivac za zanoktice", DESC_ALATI_PUSHER_01))
    stmts.append(set_description("Pogurivac za zanoktice – model 2", DESC_ALATI_PUSHER_02))

    stmts.append("COMMIT;")
    run_sql("\n".join(stmts))
    print("Product descriptions updated.")


if __name__ == "__main__":
    main()
