# VimTractor: istruzioni di progetto

## Sviluppo e dati

- `npm run dev` avvia Vite e Express insieme. Il gioco di sviluppo è servito da Vite su 3110; le chiamate `/api` sono inoltrate a Express su 5110. Vedi `vite.config.js` e `server.js`; `PORT` può cambiare la porta di Express e richiede un proxy coerente. La vecchia indicazione 5003 non corrisponde al codice.
- `npm run build` esegue Vite e `scripts/generate-sw.js`: il Service Worker (script del browser che gestisce la cache) e `version.json` sono generati in `dist/`. Per cambiare il comportamento di cache modifica `scripts/service-worker.template.js`, poi rigenera la build; non modificare manualmente i file generati.
- La classifica è persistita in `data/leaderboard.json`: conserva dati e volume quando tocchi packaging o distribuzione. Verifica i contratti di lettura e invio della classifica in `server.js`.
- Per prova locale con container, `docker compose -f docker-compose.local.yml up --build` usa la porta 5110 e monta `./data`; può quindi scrivere nella classifica locale. Eseguilo solo per un compito che richiede tale prova.
- Il gioco adatta la viewport agli schermi piccoli; preserva il comportamento durante modifiche al rendering.
- Conserva il requisito di massimo 10 invii della classifica al minuto per indirizzo Internet Protocol (IP). Le vecchie istruzioni lo attribuiscono a nginx: verifica l'applicazione nel contratto privato prima di cambiare protezioni o descrivere il limite come attivo. Il server applicativo da solo non ne prova l'applicazione.

## Verifiche e confini

- Per modifiche applicative verifica `npm run build` e il comportamento interessato; il manifest non definisce comandi di test o lint. Il Dockerfile usa Node.js 20 e installa dal lockfile con `npm ci`.
- Il repository è pubblico: conserva qui soltanto informazioni di sviluppo condivisibili. Host interni, indirizzi di infrastruttura, percorsi operativi e credenziali appartengono alla documentazione privata.
- Il workflow `.github/workflows/deploy.yml` avvia il deploy sui push a `main`; una modifica soltanto documentale che deve evitarlo usa `[skip ci]` nella prima riga del messaggio di commit e verifica l'assenza di esecuzioni per quel commit.
- Per cambiamenti al Service Worker usa il generatore; per distribuzione e ripristino consulta il contratto operativo privato autorizzato. Le vecchie istruzioni di rebuild sul server non provano il percorso di distribuzione corrente.
