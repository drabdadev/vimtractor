export class InputHandler {
    constructor(vimParser) {
        this.vimParser = vimParser;
        this.enabled = false;
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    }

    enable() {
        if (!this.enabled) {
            document.addEventListener('keydown', this.boundHandleKeyDown);
            this.enabled = true;
        }
    }

    disable() {
        if (this.enabled) {
            document.removeEventListener('keydown', this.boundHandleKeyDown);
            this.enabled = false;
        }
    }

    handleKeyDown(event) {
        // Skip Vim handling when typing in input fields
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            return false;
        }

        const key = event.key;
        const ctrlKey = event.ctrlKey || event.metaKey;
        const shiftKey = event.shiftKey;

        // Keys that should prevent default browser behavior
        const preventDefaultKeys = [
            'h', 'j', 'k', 'l',           // Movement
            '0', '$',                      // Line movement
            'w', 'b', 'e',                 // Word movement
            'g', 'G', 'd', 'x', 'u',       // Commands
            ':', 'Escape', 'Enter',        // Mode switching
            '1', '2', '3', '4', '5',       // Count digits
            '6', '7', '8', '9',
            ' '                            // Debug mode toggle
        ];

        // Ctrl+F and Ctrl+B should prevent default (browser find/back)
        if (ctrlKey && ['f', 'b', 'r'].includes(key.toLowerCase())) {
            event.preventDefault();
        }

        // Prevent default for vim keys
        if (preventDefaultKeys.includes(key) || preventDefaultKeys.includes(key.toLowerCase())) {
            event.preventDefault();
        }

        // Pass to vim parser
        const handled = this.vimParser.handleKeyPress(key, ctrlKey, shiftKey);

        return handled;
    }

    isEnabled() {
        return this.enabled;
    }
}
