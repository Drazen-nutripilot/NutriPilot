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

## Provjera da radi
- Otvori `TVOJ_LINK/api/health` → treba da vrati `{"ok":true,"model":"...","keySet":true}`.
- Ako je `keySet:false` → nisi dobro unio `ANTHROPIC_API_KEY` (provjeri env varijable pa restartuj servis).
- Kamera („📸 Slikaj obrok") radi samo preko **https** (Render/Railway/Fly svi daju https ✓).

Ako nešto zapne, pošalji mi poruku o grešci (ili šta piše u logovima hostinga) pa riješimo zajedno.
