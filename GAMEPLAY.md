# VimTractor - Gameplay Consolidato

## Panoramica
Browser game arcade 2D a scorrimento verticale per imparare i comandi Vim.
- **Stack**: Vanilla JS + HTML5 Canvas
- **Target**: 60 FPS, browser desktop

---

## Griglia e Canvas

| Parametro | Valore |
|-----------|--------|
| Colonne | 18 |
| Righe | 30 |
| Dimensione cella | 32px |
| Canvas | 576×960px |

---

## Elementi di Gioco

### Player
- **Emoji**: 🚜 (trattore)
- **Bordo**: Bianco (da implementare)
- **Posizione iniziale**: Centro-basso della griglia

### Vite
- **Iniziali**: 3
- **Display HUD**: 🚜🚜🚜 (emoji trattore)
- **Extra life**: Trattorini 🚜 che appaiono nella griglia
  - Spawn rate: 2%
  - Bordo: Glow verde per distinguerli dal player

### Ostacoli (Pericolosi)
| Emoji | Nome |
|-------|------|
| 🪨 | Roccia |
| 🗿 | Pila di pietre |

### Oggetti Raccoglibili (Punti)
| Emoji | Nome | Punti |
|-------|------|-------|
| 💰 | Moneta | 1 |
| 💎 | Gemma | 5 |
| 🍅 | Pomodoro | 2 |
| 🥬 | Lattuga | 2 |
| 🥒 | Zucchina | 2 |
| 🍇 | Uva | 3 |
| 🥔 | Patata | 2 |
| 🥕 | Carota | 2 |
| 🥦 | Asparagi | 3 |
| 🫑 | Peperone | 2 |
| 🌾 | Grano | 2 |
| 🌽 | Mais | 2 |

**Spawn verdure**: Appaiono in righe consecutive di 3-8 emoji dello stesso tipo (da implementare)

### Power-up
| Emoji | Nome | Effetto |
|-------|------|---------|
| ⛽ | Tanica benzina | Abilita comandi speciali |

---

## Sistema Power-up (Gas Can)

### Raccolta
- Raccogliendo ⛽ si accumula un contatore gas can
- Il contatore è visibile nell'HUD

### Utilizzo
| Comando | Gas Can Richiesti | Effetto |
|---------|-------------------|---------|
| `dd` | 1 | Pulisce la riga corrente, raccoglie tutti i punti |
| `dG` | 2 | Pulisce l'intero schermo, raccoglie tutti i punti |

---

## Comandi Vim

### Movimento Base
| Tasto | Azione |
|-------|--------|
| `h` | Sinistra |
| `j` | Giù |
| `k` | Su |
| `l` | Destra |

### Movimento Riga
| Tasto | Azione | Raccoglie verdure? |
|-------|--------|-------------------|
| `0` | Inizio riga | ❌ No (solo movimento) |
| `$` | Fine riga | ❌ No (solo movimento) |

### Movimento Word
| Tasto | Azione | Raccoglie verdure? |
|-------|--------|-------------------|
| `w` | Prossimo oggetto/ostacolo (si ferma prima) | ✅ Sì (solo celle vuote attraversate) |
| `b` | Oggetto/ostacolo precedente (si ferma dopo) | ✅ Sì (solo celle vuote attraversate) |
| `e` | Sul prossimo oggetto (non ostacolo) | ✅ Sì (solo celle vuote attraversate) |

### Delete Word (Comandi di Cancellazione)

**Concetto "Word"**: Una word = celle consecutive non vuote (verdure + rocce attaccate insieme)

| Tasto | Azione | Costo | Effetto |
|-------|--------|-------|---------|
| `dw` | Delete to next Word | Gratis | Cancella fino a inizio prossima word |
| `de` | Delete to End | Gratis | Cancella fino a fine word corrente |
| `db` | Delete Back | Gratis | Cancella all'indietro fino a dopo word precedente |
| `dB` | Delete Back (aggressivo) | Gratis | Come db ma include roccia al confine |

**Regole punti/vite:**
- Cancella verdura/item → **+punti** (valore dell'item)
- Cancella roccia → **-1 VITA**

**Strategia:**
- Word solo verdure (🍅🍅🍅) → usa `dw`/`de` per harvest massimo!
- Word con rocce (🥕🪨🥕) → meglio saltare con `w` per evitare danno

**Esempio:**
```
[T] [ ] [🥕] [🥕] [🥕] [🪨] [ ] [🍅] [🍅]
        └───── word A ─────┘   └─ B ─┘
```
- `w` da pos 0 → salta a pos 1, raccoglie 0 punti (SAFE)
- `dw` da pos 0 → cancella word A, +2+2+2 punti MA -1 vita (🪨)
- `de` da pos 7 → cancella word B, +2+2 = +4 punti, 0 vite perse ✅

### Movimento Schermo
| Tasto | Azione |
|-------|--------|
| `gg` | Riga sicura più in alto |
| `G` | Riga sicura più in basso |
| `Ctrl+f` | Mezza pagina giù |
| `Ctrl+b` | Mezza pagina su |

### Azioni Speciali
| Tasto | Azione | Requisito |
|-------|--------|-----------|
| `dd` | Pulisce riga + punti | 1 gas can |
| `dG` | Pulisce schermo + punti | 2 gas can |

### Comandi
| Input | Azione |
|-------|--------|
| `:q` / `:quit` | Termina partita |
| `:w` / `:wq` | Salva e termina |
| `:restart` / `:r` | Nuova partita |
| `:help` / `:h` / `:?` | Mostra aiuto |
| `Escape` | Chiude help/menu |
| `Tab` | Mostra leaderboard |

### Moltiplicatori
- Prefisso numerico: `3j` = muovi giù 3 celle
- Timeout: 1.5 secondi

---

## Velocità e Difficoltà

### Livelli di Velocità
| Livello | Intervallo Scroll | Nome |
|---------|-------------------|------|
| 1 | 3000ms | Slow |
| 2 | 2000ms | Normal |
| 3 | 1000ms | Fast |
| 4 | 500ms | Very Fast |
| 5 | 250ms | Insane |

- **Durata livello**: 60 secondi
- **Difficoltà ostacoli**: Aumenta nel tempo

---

## Sistema Punteggio

### Punti
- Raccolta oggetti: Valore specifico per tipo
- Sopravvivenza: +1 punto/secondo
- `dd`: Somma punti riga
- `dG`: Somma punti schermo

### Leaderboard
- Salvataggio locale + server
- Top 10 punteggi

---

## Effetti Visivi

### Collisione
- Screen shake (300ms, intensità decrescente)
- Esplosione 💥 (500ms, fade out)
- Perdita vita

### Animazione Trattore
- Transizione smooth tra celle (100ms)
- Posizione visuale vs logica separate

---

## Stati di Gioco

1. **NAME_INPUT**: Inserimento nome giocatore
2. **MENU**: Schermata iniziale
3. **PLAYING**: Partita in corso
4. **PAUSED**: Pausa (help aperto)
5. **GAME_OVER**: Fine partita
6. **LEADERBOARD**: Classifica

---

## Completato

- [x] Spawn verdure in righe consecutive (3-8)
- [x] Raccolta verdure con w/b/e
- [x] 0 e $ non raccolgono verdure (già implementato - solo movimento)
- [x] Bordo glow verde per life item nella griglia
- [x] Bordo bianco per player (invece di verde)
- [x] HUD vite con 🚜 (invece di 🧰)
