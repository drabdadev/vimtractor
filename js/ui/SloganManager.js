// SloganManager - Typewriter effect for menu slogans
export class SloganManager {
    constructor(elementId) {
        this.element = document.getElementById(elementId);
        this.slogans = [];
        this.currentIndex = 0;
        this.isTyping = false;
        this.typeSpeed = 50;  // ms per character
        this.deleteSpeed = 25; // ms per character when deleting
        this.pauseDuration = 10000; // ms to show complete slogan (10 seconds)
        this.timeoutId = null;
    }

    async loadSlogans() {
        try {
            const response = await fetch('data/slogans.json');
            const data = await response.json();
            this.slogans = data.slogans;
            // Shuffle for variety
            this.shuffleSlogans();
        } catch (error) {
            console.warn('Could not load slogans, using defaults');
            this.slogans = [
                "The game for digital farmers!",
                "Rock and scroll!"
            ];
        }
    }

    shuffleSlogans() {
        for (let i = this.slogans.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.slogans[i], this.slogans[j]] = [this.slogans[j], this.slogans[i]];
        }
    }

    async start() {
        if (this.slogans.length === 0) {
            await this.loadSlogans();
        }
        this.typeNextSlogan();
    }

    stop() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.isTyping = false;
    }

    typeNextSlogan() {
        if (!this.element || this.slogans.length === 0) return;

        const slogan = this.slogans[this.currentIndex];
        this.element.classList.remove('done');
        this.typeText(slogan, 0);
    }

    typeText(text, charIndex) {
        if (!this.element) return;

        if (charIndex <= text.length) {
            this.element.textContent = text.substring(0, charIndex);
            this.timeoutId = setTimeout(() => {
                this.typeText(text, charIndex + 1);
            }, this.typeSpeed);
        } else {
            // Typing complete, pause then delete
            this.element.classList.add('done');
            this.timeoutId = setTimeout(() => {
                this.element.classList.remove('done');
                this.deleteText(text, text.length);
            }, this.pauseDuration);
        }
    }

    deleteText(text, charIndex) {
        if (!this.element) return;

        if (charIndex >= 0) {
            this.element.textContent = text.substring(0, charIndex);
            this.timeoutId = setTimeout(() => {
                this.deleteText(text, charIndex - 1);
            }, this.deleteSpeed);
        } else {
            // Deletion complete, move to next slogan
            this.currentIndex = (this.currentIndex + 1) % this.slogans.length;
            this.timeoutId = setTimeout(() => {
                this.typeNextSlogan();
            }, 500);
        }
    }
}
