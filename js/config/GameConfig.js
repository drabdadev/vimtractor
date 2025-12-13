// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║                     VIMTRACTOR - CONFIGURAZIONE GIOCO                      ║
// ║                                                                             ║
// ║  Modifica questi valori per bilanciare il gameplay.                        ║
// ║  Non toccare gli altri file a meno che tu non sappia cosa stai facendo!    ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

export const GameConfig = {

    // ═══════════════════════════════════════════════════════════════════════
    // VELOCITÀ E PROGRESSIONE
    // ═══════════════════════════════════════════════════════════════════════
    speed: {
        levelDuration: 180000,        // ms per livello (180000 = 3 minuti)
        levels: [
            { interval: 8000, name: 'Very Slow' },  // Lv.1 - 1 step ogni 4 secondi
            { interval: 6500, name: 'Slow' },       // Lv.2 - 1 step ogni 2.5 secondi
            { interval: 4500, name: 'Normal' },     // Lv.3 - 1 step ogni 1.5 secondi
            { interval: 2500, name: 'Fast' },       // Lv.4 - 1 step ogni 1 secondo
            { interval: 1500, name: 'Very Fast' },   // Lv.5 - 1 step ogni 0.5 secondi
            { interval: 500, name: 'Insane' }       // Lv.6 - 1 step ogni 0.25 secondi
        ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SPAWN RATES (probabilità per cella per riga, da 0.0 a 1.0)
    // ═══════════════════════════════════════════════════════════════════════
    spawn: {
        obstacle: 0.18,         // Rocce - probabilità negli spazi vuoti (18%)
        item: 0.15,             // Oggetti collezionabili (0.15 = 15%)
        powerup: 0.05,          // Gas cans (0.05 = 5%)
        life: 0.02,             // Vite extra / trattori (0.02 = 2%)
        maxObstacleRate: 0.25,  // Cap massimo ostacoli con difficulty scaling

        // Word-based spawning - crea pattern testuali
        wordSpawning: {
            enabled: true,              // Usa pattern a parole
            wordsPerRow: { min: 1, max: 3 },  // Numero "parole" per riga (ridotto)
            wordLength: { min: 2, max: 5 },   // Celle per parola (ridotto)
            wordGapMin: 2,              // Celle vuote minime tra parole (aumentato)
            wordGapMax: 4               // Celle vuote massime tra parole (aumentato)
        },

        // Distribuzione tipo item (deve sommare a 1.0)
        itemDistribution: {
            vegetables: 0.6,    // 60% verdure
            coins: 0.3,         // 30% monete
            gems: 0.1           // 10% gemme (rare)
        }
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SEMI (piantati dai comandi 'c')
    // ═══════════════════════════════════════════════════════════════════════
    seeds: {
        growthTime: 3000,       // ms per crescere in verdura (3 secondi)
        emoji: '🌱',            // Emoji seme
        canBeCollected: false,  // I semi NON possono essere raccolti
        isPassable: true        // Si può camminare sopra i semi
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TRASMUTAZIONE ROCCE (comando 'r' + direzione)
    // ═══════════════════════════════════════════════════════════════════════
    rockTransmute: {
        duration: 2000,         // ms per completare la trasmutazione (2 secondi)
        results: ['snail', 'mushroom'],  // Possibili risultati dalla roccia normale
        successChance: 0.5,     // 50% probabilità di trovare qualcosa nella roccia normale
        points: 10,             // Punti per item trasmutato (snail/mushroom)
        moaiPenalty: -50        // Penalità punti per roccia speciale (moai 🗿)
    },

    // ═══════════════════════════════════════════════════════════════════════
    // PUNTEGGI PER ITEM
    // ═══════════════════════════════════════════════════════════════════════
    points: {
        // Sopravvivenza
        survivalPerSecond: 1,   // Punti guadagnati ogni secondo di gioco

        // Moltiplicatore dG (clear screen)
        dGMultiplier: 0.2,      // 0.2 = solo 20% dei punti (penalità per uso dG)

        // Monete e gemme
        coin: 1,                // 💰 Moneta
        gem: 5,                 // 💎 Gemma (rara)

        // Cereali - valore 1 punti
	wheat: 1,               // 🌾 Grano
        corn: 1,                // 🌽 Mais

        // Verdure - valore 2 punti
        tomato: 4,              // 🍅 Pomodoro
        lettuce: 3,             // 🥬 Lattuga
        zucchini: 3,            // 🥒 Zucchina
        potato: 2,              // 🥔 Patata
        carrot: 3,              // 🥕 Carota
        pepper: 3,              // 🫑 Peperone

        // Verdure premium - valore 8 punti
        grapes: 8,              // 🍇 Uva
        asparagus: 8,           // 🥦 Broccoli/Asparagi

        // Trasmutazione rocce - valore 10 punti
        snail: 10,              // 🐌 Lumaca (da roccia)
        mushroom: 10            // 🍄 Fungo (da roccia)
    },

    // ═══════════════════════════════════════════════════════════════════════
    // GIOCATORE
    // ═══════════════════════════════════════════════════════════════════════
    player: {
        startingLives: 3,       // Vite iniziali
        startingGasCans: 0,     // Gas cans iniziali
        respawnRowOffset: 5,    // Righe sopra posizione attuale dopo caduta
        maxLives: 99,           // Massimo vite accumulabili
        maxGasCans: 99          // Massimo gas cans accumulabili
    },

    // ═══════════════════════════════════════════════════════════════════════
    // NAVIGAZIONE VIM
    // ═══════════════════════════════════════════════════════════════════════
    navigation: {
        gCommandMargin: 2       // Righe di margine dal fondo per comando G (sicurezza)
    },

    // ═══════════════════════════════════════════════════════════════════════
    // COSTI POWERUP (gas cans richiesti)
    // ═══════════════════════════════════════════════════════════════════════
    powerupCosts: {
        dd: 2,                  // dd - Pulisci riga corrente
        dG: 10,                 // dG - Pulisci intero schermo
        cc: 3                   // cc - Change riga (raccogli + pianta semi)
    },

    // ═══════════════════════════════════════════════════════════════════════
    // DIFFICOLTÀ
    // ═══════════════════════════════════════════════════════════════════════
    difficulty: {
        scalingInterval: 90000, // ms - la difficoltà aumenta ogni 60 secondi
        safeZoneRows: 4,        // Righe iniziali senza ostacoli (zona sicura)
        initialBufferRows: 5    // Righe extra generate sopra area visibile
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ANIMAZIONI (durate in millisecondi)
    // ═══════════════════════════════════════════════════════════════════════
    animation: {
        moveDuration: 100,          // Movimento trattore tra celle
        shakeDuration: 300,         // Durata shake schermo su collisione
        shakeIntensity: 10,          // Intensità shake (pixels)
        explosionDuration: 500,     // Durata animazione esplosione
        collectEffectDuration: 400, // Durata effetto raccolta item
        smokeEffectDuration: 600    // Durata effetto fumo (dd/dG)
    },

    // ═══════════════════════════════════════════════════════════════════════
    // UI E TIMING
    // ═══════════════════════════════════════════════════════════════════════
    ui: {
        gameOverDelay: 2500,        // ms prima di mostrare schermata game over
        messageDisplayTime: 3000,   // ms durata messaggi a schermo
        vimCountTimeout: 1500,      // ms prima che il contatore vim si resetti
        vimMaxCount: 99             // Massimo numero ripetizioni comando (es. 99j)
    }
};
