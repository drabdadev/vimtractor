# Correzione dipendenze — 25 ottobre 2026

Base: `d2b56e72347911c8a22bee3106b0b32f9cc814e7`.

Vite 7.3.7; aggiornamenti compatibili di Express e dipendenze indirette proxy-addr 2.0.8, body-parser 1.20.9, source-map-js 1.2.2 e shell-quote 1.12.0. Node.js 24.18.0 usato nelle prove e fissato nelle immagini di compilazione; npm 11.17.0 fissato in manifesto e Docker. Requisito Node.js allineato a Vite. Installazione congelata e compilazione con generazione service worker riuscite. Nessuna suite di test definita. Audit completo corrente: zero avvisi. Il rilascio automatico richiede prima la verifica del percorso operativo e la protezione della classifica persistente.

Questa verifica attesta sorgenti e prove locali, non un rilascio né una scansione del sistema operativo dell’immagine. I conteggi del registro npm descrivono gruppi di dipendenze, non attacchi dimostrati.

Fonti: registro npm e avvisi del 25 ottobre; [avviso source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), [avviso node-forge senza correzione pubblicata verificata](https://github.com/advisories/GHSA-86w9-cpqp-85rv).
