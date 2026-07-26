# 🥑 NutriPilot — AI trener za ishranu (MVP sa pravom AI procjenom)

Web aplikacija koja prati ishranu bez muke: korisnik **slika ili opiše obrok**, a pravi AI model (Claude)
procijeni kalorije i makronutrijente. Uključuje i AI trenera za savjete.

## Šta je unutra

```
nutripilot/
├── server.js          # Node/Express backend — drži API ključ i zove Claude
├── package.json
├── .env.example       # kopiraj u .env i ubaci ključ
└── public/
    └── index.html     # frontend aplikacija (poziva backend)
```

Backend ima tri AI endpointa:
- `POST /api/estimate` — procjena kalorija/makroa iz **teksta ili slike** (strukturisan JSON preko tool-use).
- `POST /api/plan` — AI generiše **dnevni plan obroka** prema kalorijskom cilju (strukturisan JSON).
- `POST /api/coach` — kratki, personalizovani savjeti AI trenera.

Aplikacija (svijetla premium tema, sa light/dark prekidačem) ima:
- **Višekoračni onboarding** sa izračunom dnevnog cilja (Mifflin–St Jeor) i „aha" prikazom.
- **Danas** — sedmični pregled, kalorijski prsten, makroi, voda (**± bez granice**), streak, AI trener; obroci grupisani po **doručku/užini/ručku/večeri** sa **ciljem kalorija po obroku** i zbirom. Tap na obrok = **uređivanje količine ili brisanje**.
- **Koraci** — ručno podešavanje pređenih koraka i cilja, sa progresom.
- **Dodavanje obroka** — izbor obroka, AI sa slike, opis riječima, **skener barkoda sa lokalnim proizvodima** (Plazma, Bananica, Smoki, Nikšićko…), i **bogata baza namirnica** po kategorijama (Nedavno / Omiljeno / Moje / **🏠 Domaća jela** / Osnovno / Povrće / Voće / Meso-riba / Mliječno / Žitarice / Grickalice / Fast food / Piće / Alkohol) sa **količinom u gramima ili komadima**; prepoznavanje kucanog teksta (paradajz, sarma, gibanica…). **Sopstvene namirnice** se mogu dodati, urediti i obrisati.
- **Lokalizovano** — sve poruke, onboarding i AI trener na našem jeziku, sa fokusom na domaća jela (sarma, gibanica, karađorđeva, kačamak, pršut, kajmak, ajvar, baklava…).
- **Plan** — segment **Ishrana / Trening**. **Plan ishrane** po cilju sa **gramažom svakog sastojka** i **drugačiji je svaki put** (svaki obrok rotira svakim pritiskom kroz bazen jela, ~60 kombinacija — bez ponavljanja). **Plan treninga (Pro)** — smislen i **različit za svaki cilj** (mršavljenje: visoka ponavljanja + kardio/HIIT; mišići: Push/Pull/Legs hipertrofija/snaga bez kardija; održavanje: balans), **drugačiji svake sedmice** (jaka rotacija vježbi + rotacija šema + faze progresije Baza/Volumen/Intenzitet/Deload), sa navigacijom sedmica i **čekiranjem odrađenih treninga**.

Ishrana i treninzi su prilagođeni i kalorijski i sadržajno svakom cilju (mršavljenje = lakši, proteinski obroci uz kalorijski deficit; mišići = kalorijski gušći obroci uz suficit; održavanje = balans), sa **kratkim opisom „zašto ovako"** za svaki cilj.

**Prilagođeno polu:** za žene trening naglašava donji dio i gluteus, a ishrana se skalira na njihov (niži) kalorijski cilj; za muškarce naglasak na gornji dio/snagu uz veće porcije. Baza vježbi (13 po grupi) je toliko velika da se **isti dan ne ponavlja bar 3 mjeseca**.
- **Napredak** — težina sa **prekidačem 7/30 dana i trendom (Δ kg)**, **nedjeljni i mjesečni pregled kalorija**, statistika (koraci, treninzi, dana u cilju, streak) i Pro analiza.
- **Profil** — postignuća, cilj i podaci, tema (light/dark), podsjetnici, Pro status.
- **Gejmifikacija** — nivoi i XP, bedževi/postignuća sa proslavom (konfeti) pri otključavanju.

## Pokretanje (2 koraka)

> Bez `npm install` — projekat nema npm zavisnosti, koristi samo ugrađeni Node (treba **Node 18+**, preporuka 20+).

1. **Postavi API ključ**
   ```bash
   cd nutripilot
   cp .env.example .env
   # otvori .env i ubaci svoj ANTHROPIC_API_KEY (sa https://console.anthropic.com)
   ```

2. **Pokreni**
   ```bash
   node server.js
   ```
   Otvori **http://localhost:3000**

## Kako radi AI procjena

- **Tekst:** upišeš „2 jaja i tost, kafa" → server šalje Claude-u i vraća `{items, total, confidence}`.
- **Slika:** dugme „📸 Slikaj obrok" → slika se šalje kao base64 na server → Claude (vision) prepozna hranu.
- **Sigurnost:** API ključ je **samo na serveru**, nikad u browseru. Frontend zove `/api/...`, ne AI direktno.
- **Fallback:** ako server nije pokrenut, frontend koristi jednostavnu lokalnu procjenu (za demo).

## Izbor modela (cijena vs tačnost)

U `.env` promijeni `MODEL`:
- `claude-haiku-4-5` — najjeftiniji i brz (**preporuka za start i skalu**)
- `claude-sonnet-4-6` — tačniji, skuplji

## Sljedeći koraci za produkciju

- **Baza podataka** (korisnici, obroci, istorija) — npr. Postgres/SQLite; sada je stanje u memoriji browsera.
- **Autentifikacija** korisnika (email/Google).
- **Naplata** — Stripe/Paddle checkout za Pro pretplatu (7 dana probe → 39,99€/god).
- **Keširanje** čestih namirnica da se smanji trošak AI poziva na skali.
- **Rate-limit** i limiti na besplatnom planu.
- **Native app** (iOS/Android) radi kamere i dometa.

---
NutriPilot je radni naziv. MVP za validaciju — spreman za povezivanje naplate i baze.
