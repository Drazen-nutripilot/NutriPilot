# 🚀 Deploy NutriPilot online (test sa telefona)

Cilj: dobiti javni **https** link koji otvoriš na telefonu, sa pravim AI‑jem.
Aplikacija nema npm zavisnosti i čita `PORT` i `ANTHROPIC_API_KEY` iz okruženja — pa je deploy jednostavan.

> ⚠️ **Bitno:** API ključ NIKAD ne ide u kod. Uneseš ga kao „environment variable" na hostingu (ostaje tajan, samo na serveru).

---

## Šta ti treba (jednom)
1. **Anthropic API ključ** — https://console.anthropic.com → API Keys → Create Key (počinje sa `sk-ant-...`).
2. **GitHub nalog** (besplatno) — najlakši put je preko GitHub‑a.

---

## Put A — Render (preporuka, klik‑kroz, besplatno)

1. Napravi novi **GitHub repo** i ubaci **sve fajlove** iz `nutripilot/` foldera u njega (svi su „ravni", nema podfoldera).
   - Bez git‑a? Na GitHub‑u: „Add file → Upload files" pa **prevuci sve fajlove odjednom** (index.html, server.js, package.json, Dockerfile, itd.).
2. Idi na **https://render.com** → prijava (možeš preko GitHub‑a).
3. **New → Web Service** → izaberi svoj repo.
4. Podešavanja (Render obično sam prepozna iz `render.yaml`):
   - **Runtime:** Node
   - **Build Command:** *(prazno)*
   - **Start Command:** `node server.js`
   - **Instance type:** Free
5. **Environment → Add Environment Variable:**
   - `ANTHROPIC_API_KEY` = tvoj ključ `sk-ant-...`
   - `MODEL` = `claude-haiku-4-5` (ili `claude-sonnet-4-6` za veću tačnost)
6. **Create Web Service** → sačekaj 1–2 min.
7. Dobiješ link tipa `https://nutripilot-xxxx.onrender.com` → **otvori ga na telefonu**. 🎉

> Napomena: besplatni Render „zaspi" nakon neaktivnosti, pa prvi otvor zna da traje ~30 s. Za stalno budan servis treba plaćeni plan.

---

## Put B — Railway (najbrže bez GitHub‑a, preko terminala)

1. Instaliraj Railway CLI: `npm i -g @railway/cli`
2. U folderu `nutripilot/`:
   ```bash
   railway login
   railway init          # napravi novi projekat
   railway up            # deploy iz ovog foldera
   railway variables set ANTHROPIC_API_KEY=sk-ant-... MODEL=claude-haiku-4-5
   railway domain        # generiše javni https link
   ```
3. Otvori dobijeni link na telefonu.

---

## Put C — Docker (Fly.io ili bilo koji Docker host)

U projektu je `Dockerfile`, pa radi svuda gdje ide Docker:
```bash
# primjer za Fly.io
fly launch --no-deploy        # napravi app (izaberi region blizu tebe)
fly secrets set ANTHROPIC_API_KEY=sk-ant-... MODEL=claude-haiku-4-5
fly deploy
```

---

## Brzi test bez deploya (za 2 minuta, sa telefona)
Ako samo hoćeš da probaš odmah dok si za računarom:
1. Pokreni lokalno: `node server.js` (uz `.env` sa ključem)
2. U drugom terminalu napravi javni tunel:
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   ```
   Dobiješ privremeni `https://...trycloudflare.com` link → otvori na telefonu.

---

## Obavezne tajne za naplatu (bez njih se Pro NE aktivira)
Webhookovi za plaćanje su sada **zatvoreni** dok nije postavljen tajni ključ (ranije je bez ključa svako mogao sebi upisati Pro).
- `PADDLE_WEBHOOK_SECRET` — iz Paddle → Developer tools → Notifications → tvoja destinacija → *Secret key*
- `SUPABASE_SERVICE_KEY` — Supabase → Project Settings → API → `service_role` ključ
- `LS_WEBHOOK_SECRET` — samo ako koristiš Lemon Squeezy

Ako neki nedostaje, u logovima servera pri pokretanju piše upozorenje `⚠️ ... nije postavljen`.

## Zaštita AI troška (opciono podešavanje)
AI rute imaju ograničenja po IP adresi na dan, da niko ne može da troši Anthropic račun. Podrazumijevano:
`LIMIT_ESTIMATE=60`, `LIMIT_PLAN=25`, `LIMIT_RECIPE=40`, `LIMIT_COACH=40`, `LIMIT_PER_MINUTE=10`,
i ukupni dnevni plafon za sve korisnike `AI_DAILY_CAP=5000`. Svaki broj se može promijeniti env varijablom.
Dodatni dozvoljeni domeni za pozive iz pregledača: `EXTRA_ORIGINS=https://nesto.com,https://drugo.com`.

## Pro, proba i besplatni limit (provjerava server)
- **Pro** = aktivan red u `pro_users` · **proba** = prvih 3 dana od pravljenja naloga · **besplatno** = 1 AI procjena + 3 pitanja treneru dnevno; AI plan ishrane i recepti su Pro.
- Jednom pokreni **`supabase_setup.sql`** u Supabase → SQL Editor. On pravi brojač besplatnih poziva koji preživljava restart servera. Bez njega brojač radi u memoriji (resetuje se kad Render uspava server) i u logu piše upozorenje.
- Podesivo env varijablama: `TRIAL_DAYS=3`, `FREE_ESTIMATE_PER_DAY=1`, `FREE_COACH_PER_DAY=3`, `FREE_ANON_PER_IP=4`.
- Provjera: `TVOJ_LINK/api/me` bez prijave vraća `{"plan":"anon",...}`.

## Native aplikacija (Capacitor: iOS + Android)
Web (ajmo.fit) i dalje radi kao do sada — `server.js` nema npm zavisnosti; Capacitor paketi služe samo za pravljenje aplikacije.
- `index.html` je jedina stranica aplikacije. Poslije svake izmjene: `npm run cap:sync` (kopira je u `android/` i `ios/`).
- **Važno:** aplikacija nosi svoju kopiju `index.html`, pa izmjene na ajmo.fit stižu u aplikaciju tek sa novim buildom u prodavnici. AI, nalog i Pro idu preko `https://ajmo.fit` (server se mijenja bez novog builda).
- ID aplikacije: `ajmo.fit.app` (isti na iOS i Android). Nakon prvog slanja u prodavnice više se ne može mijenjati.

**Android (Windows):**
1. Otvori Android Studio jednom i prođi „Standard“ podešavanje (instalira Android SDK).
2. U folderu projekta: `npm install` (samo prvi put), pa `npm run cap:android` → otvara se Android Studio.
3. Sačekaj „Gradle sync“, uključi telefon sa USB debugging-om (ili emulator) i klikni ▶ Run.

**iOS (treba Mac sa Xcode-om):**
1. Na Mac-u: `npm install`, pa `npm run cap:ios` → otvara se Xcode.
2. App → Signing & Capabilities → izaberi Team (Apple Developer nalog) → ▶ Run na iPhone-u.

Ikonice i splash se prave iz `assets/logo.png`: `npx @capacitor/assets generate --android --ios --iconBackgroundColor '#FF5A3C' --splashBackgroundColor '#FF5A3C'`.

## Provjera da radi
- Otvori `TVOJ_LINK/api/health` → treba da vrati `{"ok":true,"model":"...","keySet":true}`.
- Ako je `keySet:false` → nisi dobro unio `ANTHROPIC_API_KEY` (provjeri env varijable pa restartuj servis).
- Kamera („📸 Slikaj obrok") radi samo preko **https** (Render/Railway/Fly svi daju https ✓).

Ako nešto zapne, pošalji mi poruku o grešci (ili šta piše u logovima hostinga) pa riješimo zajedno.
