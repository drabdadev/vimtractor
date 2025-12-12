import { GameConfig } from '../config/GameConfig.js';

// Vim command types
export const COMMAND_TYPES = {
    MOVE: 'move',
    ACTION: 'action',
    COMMAND_LINE: 'command_line'
};

export class VimParser {
    constructor() {
        this.mode = 'normal'; // 'normal' or 'command'
        this.count = 0;
        this.countTimeout = null;
        this.pendingKey = null; // For sequences like 'gg', 'dd'
        this.commandBuffer = '';
        this.onCommand = null; // Callback for parsed commands
    }

    setCommandHandler(handler) {
        this.onCommand = handler;
    }

    resetCount() {
        this.count = 0;
        if (this.countTimeout) {
            clearTimeout(this.countTimeout);
            this.countTimeout = null;
        }
    }

    startCountTimeout() {
        if (this.countTimeout) {
            clearTimeout(this.countTimeout);
        }
        // Timeout only resets the count prefix, NOT the pending key
        // In Vim, operators like 'd' wait indefinitely for the motion
        this.countTimeout = setTimeout(() => {
            this.resetCount();
            // pendingKey is NOT reset - Vim behavior
        }, GameConfig.ui.vimCountTimeout);
    }

    getEffectiveCount() {
        return this.count > 0 ? this.count : 1;
    }

    handleKeyPress(key, ctrlKey = false, shiftKey = false) {
        // Handle command mode
        if (this.mode === 'command') {
            return this.handleCommandMode(key);
        }

        // Handle normal mode
        return this.handleNormalMode(key, ctrlKey, shiftKey);
    }

    handleNormalMode(key, ctrlKey, shiftKey) {
        // Ignore modifier-only key events (Shift, Control, Alt, Meta)
        // These come as separate events before the actual key
        if (['Shift', 'Control', 'Alt', 'Meta'].includes(key)) {
            return false;
        }

        // Check for Ctrl combinations first
        if (ctrlKey) {
            return this.handleCtrlKey(key);
        }

        // Enter command mode
        if (key === ':') {
            this.mode = 'command';
            this.commandBuffer = '';
            this.emitCommand({ type: 'mode', mode: 'command' });
            return true;
        }


        // Escape closes help
        if (key === 'Escape') {
            this.emitCommand({ type: 'help', action: 'close' });
            return true;
        }

        // Enter key - for restart on game over
        if (key === 'Enter') {
            this.emitCommand({ type: 'enter' });
            return true;
        }

        // Space key - toggle debug mode
        if (key === ' ') {
            this.emitCommand({ type: 'debug_toggle' });
            return true;
        }

        // Tab key - for leaderboard
        if (key === 'Tab') {
            this.emitCommand({ type: 'leaderboard' });
            return true;
        }

        // Handle pending key sequences (gg, dd)
        if (this.pendingKey) {
            return this.handlePendingSequence(key);
        }

        // Digit handling for count
        if (/^[0-9]$/.test(key)) {
            // '0' at start is a command, not count
            if (key === '0' && this.count === 0) {
                this.emitMove('line_start');
                return true;
            }
            this.count = Math.min(this.count * 10 + parseInt(key), GameConfig.ui.vimMaxCount);
            this.startCountTimeout();
            this.emitCommand({ type: 'count', count: this.count });
            return true;
        }

        // Movement keys
        switch (key.toLowerCase()) {
            case 'h':
                this.emitMove('left');
                return true;
            case 'j':
                this.emitMove('down');
                return true;
            case 'k':
                this.emitMove('up');
                return true;
            case 'l':
                this.emitMove('right');
                return true;
            case '$':
                this.emitMove('line_end');
                return true;
            case 'w':
                this.emitMove('word_next');
                return true;
            case 'b':
                this.emitMove('word_prev');
                return true;
            case 'e':
                this.emitMove('word_end');
                return true;
            case 'g':
                this.pendingKey = 'g';
                this.startCountTimeout();
                return true;
            case 'd':
                this.pendingKey = 'd';
                this.startCountTimeout();
                return true;
            case 'x':
                this.emitAction('delete_char');
                return true;
            case 'u':
                this.emitAction('undo');
                return true;
        }

        // G (capital) - go to bottom
        if (key === 'G') {
            this.emitMove('file_end');
            return true;
        }

        return false;
    }

    handlePendingSequence(key) {
        const pendingKey = this.pendingKey;
        const sequence = pendingKey + key;
        this.pendingKey = null;

        switch (sequence) {
            case 'gg':
                this.emitMove('file_start');
                return true;
            case 'ge':
                // ge - go to end of previous word
                this.emitMove('word_end_prev');
                return true;
            case 'dd':
                this.emitAction('delete_line');
                return true;
            case 'dG':
                this.emitAction('delete_all');
                return true;
            case 'dw':
                this.emitAction('delete_word');
                return true;
            case 'de':
                this.emitAction('delete_word_end');
                return true;
            case 'db':
                this.emitAction('delete_back');
                return true;
            case 'dB':
                this.emitAction('delete_back_aggressive');
                return true;
        }

        // Invalid sequence, reset
        this.resetCount();
        return false;
    }

    handleCtrlKey(key) {
        switch (key.toLowerCase()) {
            case 'f':
                this.emitMove('page_down');
                return true;
            case 'b':
                this.emitMove('page_up');
                return true;
            case 'r':
                this.emitAction('redo');
                return true;
        }
        return false;
    }

    handleCommandMode(key) {
        if (key === 'Escape') {
            this.mode = 'normal';
            this.commandBuffer = '';
            this.emitCommand({ type: 'mode', mode: 'normal' });
            return true;
        }

        if (key === 'Enter') {
            const cmd = this.commandBuffer.trim();
            this.mode = 'normal';
            this.commandBuffer = '';
            this.emitCommand({ type: 'mode', mode: 'normal' });

            if (cmd) {
                this.executeCommandLine(cmd);
            }
            return true;
        }

        if (key === 'Backspace') {
            this.commandBuffer = this.commandBuffer.slice(0, -1);
            this.emitCommand({ type: 'command_buffer', buffer: this.commandBuffer });
            return true;
        }

        // Add character to buffer
        if (key.length === 1) {
            this.commandBuffer += key;
            this.emitCommand({ type: 'command_buffer', buffer: this.commandBuffer });
            return true;
        }

        return false;
    }

    executeCommandLine(cmd) {
        switch (cmd) {
            case 'q':
            case 'quit':
                this.emitCommand({ type: COMMAND_TYPES.COMMAND_LINE, command: 'quit' });
                break;
            case 'w':
            case 'wq':
            case 'write':
                this.emitCommand({ type: COMMAND_TYPES.COMMAND_LINE, command: 'save_quit' });
                break;
            case 'restart':
            case 'r':
                this.emitCommand({ type: COMMAND_TYPES.COMMAND_LINE, command: 'restart' });
                break;
            case 'help':
            case 'h':
            case '?':
                this.emitCommand({ type: 'help', action: 'toggle' });
                break;
            case 'drabda':
                this.emitCommand({ type: COMMAND_TYPES.COMMAND_LINE, command: 'drabda' });
                break;
            default:
                // Unknown command
                this.emitCommand({ type: COMMAND_TYPES.COMMAND_LINE, command: 'unknown', raw: cmd });
        }
    }

    emitMove(direction, extra = {}) {
        const count = this.getEffectiveCount();
        this.resetCount();
        if (this.onCommand) {
            this.onCommand({
                type: COMMAND_TYPES.MOVE,
                direction,
                count,
                ...extra
            });
        }
    }

    emitAction(action) {
        const count = this.getEffectiveCount();
        this.resetCount();
        if (this.onCommand) {
            this.onCommand({
                type: COMMAND_TYPES.ACTION,
                action,
                count
            });
        }
    }

    emitCommand(data) {
        if (this.onCommand) {
            this.onCommand(data);
        }
    }

    getMode() {
        return this.mode;
    }

    getCount() {
        return this.count;
    }

    getPendingSequence() {
        return this.pendingKey;
    }

    reset() {
        this.mode = 'normal';
        this.count = 0;
        this.pendingKey = null;
        this.commandBuffer = '';
        if (this.countTimeout) {
            clearTimeout(this.countTimeout);
            this.countTimeout = null;
        }
    }
}
