/**
 * API Service for handling server communication
 * Modern async/await implementation with proper error handling
 */

class APIService {
    constructor(userId) {
        this.userId = userId;
        this.baseURL = '/api/egg';
        this.abortController = null;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }

    /**
     * Get egg data from server
     * @returns {Promise<Object>} Egg data
     */
    async getEggData() {
        const url = `${this.baseURL}/${this.userId}`;
        console.log(`🥚 Getting egg data from: ${url}`);
        console.log(`👤 User ID: ${this.userId}`);
        console.log(`🔗 Base URL: ${this.baseURL}`);
        return this.fetchWithRetry(url);
    }

    /**
     * Warm the egg (increase temperature)
     * @returns {Promise<Object>} Updated egg data
     */
    async warmEgg() {
        const url = `${this.baseURL}/${this.userId}/warm`;
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        return this.fetchWithRetry(url, options);
    }

    /**
     * Reset egg to initial state
     * @returns {Promise<Object>} Response data
     */
    async resetEgg() {
        const url = `${this.baseURL}/${this.userId}/fix_egg`;
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        return this.fetchWithRetry(url, options);
    }

    /**
     * Click the egg (for hatching)
     * @returns {Promise<Object>} Click result data
     */
    async clickEgg() {
        const url = `${this.baseURL}/${this.userId}/click`;
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        return this.fetchWithRetry(url, options);
    }

    /**
     * Start long polling for real-time updates
     * @param {Function} onUpdate - Callback for updates
     * @param {Function} onError - Callback for errors
     */
    async startLongPolling(onUpdate, onError) {
        const url = `${this.baseURL}/${this.userId}/updates`;
        
        try {
            this.abortController = new AbortController();
            
            const response = await fetch(url, {
                signal: this.abortController.signal,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Accept': 'text/event-stream',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Обрабатываем SSE поток
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonData = line.slice(6); // Убираем 'data: '
                            const data = JSON.parse(jsonData);
                            onUpdate(data);
                        } catch (parseError) {
                            console.warn('Failed to parse SSE data:', parseError);
                        }
                    }
                }
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                // Long polling was cancelled
                return;
            }
            
            onError(error);
            
            // Wait before retrying
            await this.delay(this.retryDelay);
            
            // Рекурсивно перезапускаем long polling
            setTimeout(() => {
                this.startLongPolling(onUpdate, onError);
            }, this.retryDelay);
        }
    }

    /**
     * Stop long polling
     */
    stopLongPolling() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    /**
     * Fetch with automatic retry logic
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} Response data
     */
    async fetchWithRetry(url, options = {}) {
        let lastError;

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                console.log(`🔗 Attempt ${attempt}: Fetching ${url}`);
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers,
                    }
                });

                console.log(`📡 Response status: ${response.status}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log(`✅ Fetch successful:`, data);
                return data;

            } catch (error) {
                console.error(`❌ Attempt ${attempt} failed:`, error);
                lastError = error;
                
                if (attempt < this.retryAttempts) {
                    console.log(`⏳ Waiting ${this.retryDelay * attempt}ms before retry...`);
                    await this.delay(this.retryDelay * attempt);
                }
            }
        }

        const finalError = `Failed after ${this.retryAttempts} attempts: ${lastError.message}`;
        console.error(`💥 All attempts failed:`, finalError);
        throw new Error(finalError);
    }

    /**
     * Utility method for delays
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if network is online
     * @returns {boolean} Network status
     */
    isOnline() {
        return navigator.onLine;
    }

    /**
     * Get network information if available
     * @returns {Object|null} Network info
     */
    getNetworkInfo() {
        if ('connection' in navigator) {
            const conn = navigator.connection;
            return {
                effectiveType: conn.effectiveType,
                downlink: conn.downlink,
                rtt: conn.rtt,
                saveData: conn.saveData
            };
        }
        return null;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopLongPolling();
    }
}

// Создаем глобальный экземпляр класса
window.APIService = APIService;

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIService;
} 