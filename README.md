# TechSystem Premium Site

Sito vetrina premium con area admin protetta lato server.

## Funzioni incluse
- Home premium responsive per PC e cellulare
- Testi raffinati, senza esempi demo e senza sezione prezzi
- Modulo contatti salvato nel database SQLite
- Area admin protetta con login server-side
- Cookie `httpOnly`, `sameSite=strict` e token firmato
- Rate limit sui tentativi di login
- Header di sicurezza con Helmet
- Editor contenuti per titolo, sottotitolo, sezioni e contatti
- Statistiche base: visite totali, visualizzazioni pagina, messaggi ricevuti

## Avvio locale
1. Installa Node.js LTS.
2. Copia `.env.example` in `.env`.
3. Nel terminale esegui:
   ```bash
   npm install
   npm start
   ```
4. Apri `http://localhost:3000`.

## Variabili da impostare
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `SITE_URL`

## Pubblicazione su Render
1. Carica il progetto su GitHub.
2. Su Render crea un nuovo **Web Service** collegato al repository GitHub. Render supporta la pubblicazione di app Express/Node.js e l'auto-deploy dal repository. citeturn898199search1turn898199search13
3. Imposta in Render le variabili `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`, `SITE_URL` e `NODE_ENV=production`.
4. Build command: `npm install`
5. Start command: `npm start`
6. Dopo il deploy, apri l'URL assegnato e accedi a `/admin`.

## Nota sicurezza
Per produzione vera conviene usare:
- password diversa da quella di esempio
- `JWT_SECRET` lungo e casuale
- dominio personalizzato con HTTPS
- backup del file SQLite o migrazione a Postgres
