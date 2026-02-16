# Registro presenze con GPS

Applicazione per il registro presenze (entrata/uscita) con registrazione della posizione GPS.

## Funzionalità

1. **Login dipendente** – Accesso con email e password
2. **Pulsanti Entrata / Uscita** – Registrazione del tipo di presenza
3. **Lettura GPS** – Coordinate acquisite al momento del click (richiesta autorizzazione posizione nel browser)
4. **Salvataggio su database** – SQLite con Prisma (presenze con lat, lng, data/ora)
5. **Esportazione Excel mensile** – Download presenze in .xlsx per il mese selezionato (scelta mese/anno in dashboard)
6. **Pagina Admin** – Per utenti con ruolo Admin: gestione dipendenti (elenco, crea, modifica, elimina)

## Avvio rapido

```bash
cd timbratura-app
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Poi apri [http://localhost:3000](http://localhost:3000).

**Account di test (dopo il seed):**
- Nome: `Mario`, Cognome: `Rossi`
- Password: `password123`
- Ruolo: **Admin** (vedi link "Admin" in dashboard per gestire i dipendenti)

## Note

- Per il GPS in produzione usa **HTTPS** (la geolocalizzazione è consentita solo su contesti sicuri).
- Su mobile, apri l’app dal browser per usare la posizione reale.
- Il file del database SQLite è `prisma/dev.db` (puoi sostituirlo con PostgreSQL modificando `schema.prisma` e la variabile `datasource`).
# Registro-Presenze
# Registro-Presenze
# Registro-Presenze
