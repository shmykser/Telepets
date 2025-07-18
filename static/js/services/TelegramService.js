/**
 * Telegram WebApp Service - Updated to Bot API 6.1+
 * Modern wrapper for Telegram WebApp API with proper initialization
 */

class TelegramService {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.isReady = false;
        this.version = this.tg?.version || '6.0';
    }

    /**
     * Initialize Telegram WebApp - Modern approach
     * @returns {Promise<void>}
     */
    async initialize() {
        if (!this.tg) {
            throw new Error('Telegram WebApp not available');
        }

        // Modern initialization - Bot API 6.1+
        this.tg.ready();
        this.tg.expand();
        
        // Set colors if supported
        if (this.tg.isVersionAtLeast('6.1')) {
            this.tg.setHeaderColor('#667eea');
            this.tg.setBackgroundColor('#ffffff');
        }

        this.isReady = true;
        return Promise.resolve();
    }

    /**
     * Get user ID from Telegram
     * @returns {number} User ID
     */
    getUserId() {
        if (!this.isReady) {
            throw new Error('TelegramService not initialized');
        }
        
        const userId = this.tg.initDataUnsafe?.user?.id;
        
        if (!userId) {
            // Fallback for testing
            const testUserId = window.TEST_USER_ID || 273065571;
            if (window.location.hostname === 'localhost') {
                console.warn('Using test user ID:', testUserId);
            }
            return testUserId;
        }
        
        return userId;
    }

    /**
     * Show main button
     * @param {string} text Button text
     * @param {Function} callback Click handler
     */
    showMainButton(text, callback) {
        if (!this.tg.MainButton) return;
        
        this.tg.MainButton.text = text;
        this.tg.MainButton.show();
        this.tg.MainButton.onClick(callback);
    }

    /**
     * Hide main button
     */
    hideMainButton() {
        if (!this.tg.MainButton) return;
        this.tg.MainButton.hide();
    }

    /**
     * Show back button
     * @param {Function} callback Click handler
     */
    showBackButton(callback) {
        if (!this.tg.BackButton) return;
        
        this.tg.BackButton.show();
        this.tg.BackButton.onClick(callback);
    }

    /**
     * Send data to bot
     * @param {string} data Data to send
     */
    sendData(data) {
        if (this.tg.sendData) {
            this.tg.sendData(data);
        }
    }

    /**
     * Close webapp
     */
    close() {
        if (this.tg.close) {
            this.tg.close();
        }
    }

    /**
     * Get theme params
     * @returns {Object} Theme parameters
     */
    getThemeParams() {
        return this.tg.themeParams || {};
    }

    /**
     * Check if version is supported
     * @param {string} version Version to check
     * @returns {boolean}
     */
    isVersionAtLeast(version) {
        return this.tg.isVersionAtLeast ? this.tg.isVersionAtLeast(version) : false;
    }

    /**
     * Open link
     * @param {string} url URL to open
     */
    openLink(url) {
        if (this.tg.openLink) {
            this.tg.openLink(url);
        } else {
            window.open(url, '_blank');
        }
    }

    /**
     * Enable haptic feedback
     * @param {string} type Type of feedback
     */
    hapticFeedback(type = 'impact') {
        if (this.tg.HapticFeedback) {
            switch (type) {
                case 'impact':
                    this.tg.HapticFeedback.impactOccurred('medium');
                    break;
                case 'success':
                    this.tg.HapticFeedback.notificationOccurred('success');
                    break;
                case 'error':
                    this.tg.HapticFeedback.notificationOccurred('error');
                    break;
            }
        }
    }
}

// Создаем глобальный экземпляр класса
window.TelegramService = TelegramService;

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramService;
} 