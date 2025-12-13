# VimTractor - Comandi di Raccolta

Guida completa ai comandi per raccogliere verdure nel gioco.

---

## Raccogliere SOTTO il cursore

| Comando | Azione |
|---------|--------|
| **`x`** | Raccoglie 1 cella |
| **`Nx`** | Raccoglie N celle verso destra (es. `5x` = 5 celle) |

```
Prima:   🍅🍅[🚜]🥕🥕🥕
x:       🍅🍅[🚜]__🥕🥕     (raccolto 1 🥕)
3x:      🍅🍅[🚜]__ __ __   (raccolti 3 🥕)
```

---

## Raccogliere DOPO il cursore (verso destra →)

| Comando | Azione |
|---------|--------|
| **`dw`** | Fino all'inizio della prossima parola |
| **`de`** | Fino alla fine della parola corrente |
| **`d$`** | Fino a fine riga |

```
Prima:   [🚜]🍅🍅🍅 __ 🥕🥕🥕 __ 🌽🌽

dw:      [🚜]__ __ __ __ 🥕🥕🥕 __ 🌽🌽   (raccolti 🍅 + spazio)
de:      [🚜]__ __ __ __ 🥕🥕🥕 __ 🌽🌽   (raccolti solo 🍅)
d$:      [🚜]__ __ __ __ __ __ __ __ __ __ (raccolta tutta la riga a destra)
```

### Differenza tra `dw` e `de`

- **`dw`** (delete word): raccoglie la parola corrente E lo spazio dopo
- **`de`** (delete to end): raccoglie solo fino alla fine della parola, senza lo spazio

```
Prima:   [🚜]🍅🍅🍅 __ 🥕🥕

dw:      [🚜]🥕🥕            (il cursore è ora su 🥕)
de:      [🚜] __ 🥕🥕        (lo spazio rimane)
```

---

## Raccogliere PRIMA del cursore (verso sinistra ←)

| Comando | Azione |
|---------|--------|
| **`db`** | All'indietro fino all'inizio della parola precedente |
| **`d0`** | Dall'inizio della riga fino al cursore |

```
Prima:   🍅🍅🍅 __ 🥕🥕[🚜]🌽🌽

db:      🍅🍅🍅 __ [🚜]🌽🌽              (raccolti i 🥕 a sinistra)
d0:      __ __ __ __ __ __[🚜]🌽🌽       (raccolta tutta la riga a sinistra)
```

### Esempio pratico `db`

```
Prima:   🍅🍅 __ 🥕🥕🥕 __ 🌽🌽[🚜]🫑

db:      🍅🍅 __ 🥕🥕🥕 __ [🚜]🫑        (raccolti solo i 🌽)
db db:   🍅🍅 __ [🚜]🫑                  (raccolti anche i 🥕)
```

---

## Raccogliere TUTTA la riga / schermo

| Comando | Costo | Azione |
|---------|-------|--------|
| **`dd`** | 2 ⛽ | Tutta la riga corrente |
| **`dG`** | 10 ⛽ | Tutto lo schermo (solo 20% dei punti!) |

```
Prima:   🍅🍅🍅[🚜]🥕🥕🥕

dd:      __ __ __[🚜]__ __ __   (tutta la riga pulita, -2 gas)
```

### Attenzione alle rocce!

I comandi di cancellazione raccolgono TUTTO nel range, **incluse le rocce**!
Se colpisci una roccia perdi una vita.

```
Prima:   🍅🍅🗿🍅[🚜]🥕🥕

d0:      💥 CRASH! Perdi una vita (hai colpito la roccia 🗿)
         __ __ __ __[🚜]🥕🥕   (il trattore resta in posizione)
```

### Movimento del trattore (come Vim)

Il comportamento segue le regole di Vim:

| Comando | Il trattore si sposta? |
|---------|------------------------|
| `dw`, `de`, `d$`, `d0` | **NO** - resta fermo |
| `db`, `cb` | **SÌ** - si sposta all'inizio dell'area cancellata |

```
Prima:   🍅🍅🍅 __ 🥕🥕[🚜]🌽

db:      🍅🍅🍅 __ [🚜]__ 🌽   (trattore spostato a sinistra)
de:      🍅🍅🍅 __ 🥕🥕[🚜]__   (trattore resta fermo)
```

---

## Raccogliere + Piantare Semi 🌱

I comandi `c` (change) raccolgono le verdure E piantano semi al loro posto.
I semi crescono in verdure random dopo **3 secondi**.

| Comando | Costo | Azione |
|---------|-------|--------|
| **`cw`** | free | Fino a prossima parola + pianta semi |
| **`ce`** | free | Fino a fine parola + pianta semi |
| **`cb`** | free | All'indietro + pianta semi |
| **`cc`** | 3 ⛽ | Tutta la riga + pianta semi |

```
Prima:   [🚜]🍅🍅🍅 __ 🥕🥕

cw:      [🚜]🌱🌱🌱 __ 🥕🥕   (🍅 raccolti, semi piantati)

         ...dopo 3 secondi...

         [🚜]🌽🌽🥦 __ 🥕🥕   (semi cresciuti in verdure random!)
```

### Strategia con i semi

1. Usa `cw`/`ce`/`cb` per raccogliere verdure di poco valore
2. I semi diventano verdure casuali (potrebbero valere di più!)
3. Torna dopo 3 secondi per raccoglierle con `x` o `dw`

---

## Navigazione (NON raccoglie)

Questi comandi muovono il trattore ma **non raccolgono** nulla:

| Comando | Azione |
|---------|--------|
| `h/j/k/l` | Muovi sinistra/giù/su/destra |
| `w` | Salta all'inizio della prossima parola |
| `b` | Salta all'inizio della parola precedente |
| `e` | Salta alla fine della parola corrente |
| `ge` | Salta alla fine della parola precedente |
| `0` | Vai a inizio riga |
| `$` | Vai a fine riga |
| `gg` | Vai in cima allo schermo |
| `G` | Vai in fondo allo schermo |

---

## Riepilogo Costi Gas ⛽

| Comando | Costo |
|---------|-------|
| `x`, `dw`, `de`, `db`, `d0`, `d$` | **Gratuito** |
| `cw`, `ce`, `cb` | **Gratuito** |
| `dd` | **2 gas** |
| `cc` | **3 gas** |
| `dG` | **10 gas** (e solo 20% punti!) |

---

## Tips & Tricks

1. **Usa `w` per navigare velocemente** tra le parole senza raccogliere
2. **Usa `dw` per raccogliere parole intere** - più efficiente di `x` ripetuto
3. **Attenzione alle rocce** prima di usare `dd` o `d0`
4. **I semi sono un investimento** - pianta con `c` e torna dopo per raccogliere
5. **`dG` è l'ultima risorsa** - costa molto e dà pochi punti
