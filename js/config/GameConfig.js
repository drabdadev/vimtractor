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
            { interval: 3000, name: 'Slow' },       // Lv.1 - 1 step ogni 3 secondi
            { interval: 2000, name: 'Normal' },     // Lv.2 - 1 step ogni 2 secondi
            { interval: 1000, name: 'Fast' },       // Lv.3 - 1 step ogni 1 secondo
            { interval: 500, name: 'Very Fast' },   // Lv.4 - 1 step ogni 0.5 secondi
            { interval: 250, name: 'Insane' }       // Lv.5 - 1 step ogni 0.25 secondi
        ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SPAWN RATES (probabilità per cella per riga, da 0.0 a 1.0)
    // ═══════════════════════════════════════════════════════════════════════
    spawn: {
        obstacle: 0.18,         // Rocce - probabilità base (0.18 = 18%)
        item: 0.15,             // Oggetti collezionabili (0.15 = 15%)
        powerup: 0.05,          // Gas cans (0.05 = 5%)
        life: 0.02,             // Vite extra / trattori (0.02 = 2%)
        maxObstacleRate: 0.45,  // Cap massimo ostacoli con difficoltà crescente

        // Gruppi di verdure (appaiono in sequenza sulla stessa riga)
        vegetableGroup: {
            chance: 0.4,        // Probabilità di spawno gruppo per riga (40%)
            minLength: 3,       // Minimo celle consecutive
            maxLength: 8        // Massimo celle consecutive
        },

        // Distribuzione tipo item (deve sommare a 1.0)
        itemDistribution: {
            vegetables: 0.6,    // 60% verdure
            coins: 0.3,         // 30% monete
            gems: 0.1           // 10% gemme (rare)
        }
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

        // Verdure - valore 2 punti
        tomato: 2,              // 🍅 Pomodoro
        lettuce: 2,             // 🥬 Lattuga
        zucchini: 2,            // 🥒 Zucchina
        potato: 2,              // 🥔 Patata
        carrot: 2,              // 🥕 Carota
        pepper: 2,              // 🫑 Peperone
        wheat: 2,               // 🌾 Grano
        corn: 2,                // 🌽 Mais

        // Verdure - valore 3 punti
        grapes: 3,              // 🍇 Uva
        asparagus: 3            // 🥦 Broccoli/Asparagi
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
    // COSTI POWERUP (gas cans richiesti)
    // ═══════════════════════════════════════════════════════════════════════
    powerupCosts: {
        dd: 2,                  // dd - Pulisci riga corrente
        dG: 10                  // dG - Pulisci intero schermo
    },

    // ═══════════════════════════════════════════════════════════════════════
    // DIFFICOLTÀ
    // ═══════════════════════════════════════════════════════════════════════
    difficulty: {
        scalingInterval: 60000, // ms - la difficoltà aumenta ogni 60 secondi
        safeZoneRows: 3,        // Righe iniziali senza ostacoli (zona sicura)
        initialBufferRows: 5    // Righe extra generate sopra area visibile
    },

    // ═══════════════════════════════════════════════════════════════════════
    // ANIMAZIONI (durate in millisecondi)
    // ═══════════════════════════════════════════════════════════════════════
    animation: {
        moveDuration: 100,          // Movimento trattore tra celle
        shakeDuration: 300,         // Durata shake schermo su collisione
        shakeIntensity: 8,          // Intensità shake (pixels)
        explosionDuration: 500,     // Durata animazione esplosione
        collectEffectDuration: 400, // Durata effetto raccolta item
        smokeEffectDuration: 600    // Durata effetto fumo (dd/dG)
    },

    // ═══════════════════════════════════════════════════════════════════════
    // UI E TIMING
    // ═══════════════════════════════════════════════════════════════════════
    ui: {
        gameOverDelay: 1500,        // ms prima di mostrare schermata game over
        messageDisplayTime: 2000,   // ms durata messaggi a schermo
        vimCountTimeout: 1500,      // ms prima che il contatore vim si resetti
        vimMaxCount: 99             // Massimo numero ripetizioni comando (es. 99j)
    }
};
