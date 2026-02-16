# Deploy su Vercel – Guida passo passo

Segui questi passi per mettere online il **Registro presenze** su Vercel con un database PostgreSQL gratuito (Neon).

---

## 1. Crea un database PostgreSQL (Neon)

1. Vai su **https://neon.tech** e registrati (anche con GitHub).
2. Clicca **New Project**.
3. Nome progetto: es. `registro-presenze`. Region: scegli la più vicina (es. Europe).
4. Clicca **Create project**.
5. Nella dashboard, clicca **Connection string** (o **Connect**).
6. Copia la **connection string** (es. `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`).  
   Tienila a portata di mano per i prossimi passi.

---

## 2. Metti il codice su GitHub

1. Crea un nuovo repository su **https://github.com/new** (es. `registro-presenze`). Non inizializzarlo con README se il progetto esiste già in locale.
2. In locale, nella cartella del progetto:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TUO-USERNAME/registro-presenze.git
git push -u origin main
```

(Sostituisci `TUO-USERNAME` e `registro-presenze` con il tuo username e nome repo.)

---

## 3. Crea il progetto su Vercel

1. Vai su **https://vercel.com** e accedi (anche con GitHub).
2. Clicca **Add New…** → **Project**.
3. **Import** il repository GitHub del progetto (es. `registro-presenze`).
4. **Framework Preset**: Vercel dovrebbe rilevare **Next.js**. Non cambiare.
5. **Root Directory**: lascia vuoto (root del repo).
6. **Build Command**: lascia quello proposto (`npm run build` oppure `prisma generate && prisma db push && next build`).
7. **Output Directory**: lascia vuoto.

---

## 4. Variabili d’ambiente su Vercel

Nella stessa schermata (o dopo in **Settings → Environment Variables**):

1. **Name**: `DATABASE_URL`  
   **Value**: incolla la connection string di Neon (quella copiata al passo 1).  
   **Environment**: seleziona **Production** (e, se vuoi, anche Preview).
2. **Name**: `JWT_SECRET`  
   **Value**: una stringa lunga e casuale. In locale puoi generarla con:
   ```bash
   openssl rand -base64 32
   ```
   **Environment**: Production (e eventualmente Preview).

Poi clicca **Deploy** (o **Save** e poi **Redeploy**).

---

## 5. Attendi il deploy

- Vercel eseguirà `npm run build` (che include `prisma generate` e `prisma db push`), quindi creerà le tabelle sul database Neon.
- Quando il deploy è **Ready**, avrai un URL tipo `https://tuo-progetto.vercel.app`.

---

## 6. Crea l’account admin (seed)

Il database è vuoto. Per creare l’admin (es. Anna Lorusso) **da tuo computer**:

1. Crea un file **`.env`** nella root del progetto (solo in locale, non committarlo) con:

```env
DATABASE_URL="postgresql://..."   # la STESSA connection string usata su Vercel (o un altro DB Neon per prod)
JWT_SECRET="la-stessa-stringa-usata-su-vercel"
```

2. Esegui il seed una sola volta:

```bash
npm install
npx prisma generate
npm run db:seed
```

Usa la **stessa** `DATABASE_URL` del progetto Vercel (quella del DB Neon di produzione) così il seed crea l’admin nel DB usato dall’app online.

---

## 7. Controlli finali

- Apri **https://tuo-progetto.vercel.app**.
- Vai al login e accedi con **Nome**, **Cognome** e **Password** dell’admin che hai nel seed (es. Anna Lorusso / Cicci2023).
- Se qualcosa non funziona, in Vercel controlla **Deployments → Function Logs** e **Settings → Environment Variables** (nomi e valori corretti).

---

## Riepilogo variabili

| Variabile       | Dove              | Esempio / nota                                      |
|-----------------|-------------------|-----------------------------------------------------|
| `DATABASE_URL`  | Vercel + .env locale | Connection string Neon (postgresql://...)          |
| `JWT_SECRET`    | Vercel + .env locale | Stringa casuale (es. `openssl rand -base64 32`)    |

---

## Sviluppo in locale con PostgreSQL

Per lavorare in locale sullo stesso schema:

1. Crea un file **`.env`** con `DATABASE_URL` (puoi usare lo stesso DB Neon o un secondo progetto Neon per sviluppo).
2. Esegui:
   ```bash
   npx prisma db push
   npm run db:seed
   npm run dev
   ```

Se in futuro vorrai di nuovo SQLite solo in locale, si può introdurre uno schema condizionale o un secondo `schema.prisma`; per ora con Neon puoi usare un unico DB per sviluppo e produzione.
