/**
 * Egg Service - управление рендерингом и состоянием яйца
 * Изолированный сервис для работы с яйцом в Telegram WebApp
 */

class EggService {
    constructor() {
        this.currentEggData = null;
        this.appElement = null;
        this.logger = {
            info: (msg) => console.log(`[EggService] ${msg}`),
            error: (msg) => console.error(`[EggService] ${msg}`),
            warn: (msg) => console.warn(`[EggService] ${msg}`)
        };
    }

    /**
     * Инициализация сервиса
     */
    initialize() {
        this.appElement = document.getElementById('app');
        if (!this.appElement) {
            this.logger.error('App element not found');
            throw new Error('App element not found');
        }
        
        this.logger.info('EggService initialized');
    }

    /**
     * Рендеринг яйца с данными
     * @param {Object} data - Данные яйца
     * @param {Object} uiConfig - Конфигурация UI
     */
    renderEgg(data, uiConfig = {}) {
        try {
            this.logger.info('🎨 Rendering egg with data:', data);
            
            if (!this.appElement) {
                this.logger.error('❌ App element not found');
                return;
            }
            
            this.logger.info('🔧 App element found, proceeding...');
            
            // Обновляем текущие данные
            this.currentEggData = data;
            window.currentEggData = data;
            
            this.logger.info('🔧 Data updated, creating HTML...');
            
            // Создаем HTML яйца
            const eggHtml = this.createEggHTML(data, uiConfig);
            this.logger.info('📝 Created HTML:', eggHtml.substring(0, 200) + '...');
            
            // Проверяем, что HTML создался корректно
            if (!eggHtml || typeof eggHtml !== 'string') {
                throw new Error('Failed to create egg HTML');
            }
            
            this.logger.info('🔧 Setting innerHTML...');
            this.appElement.innerHTML = eggHtml;
            
            this.logger.info('🔧 HTML set, setting up event handlers...');
            
            // Настраиваем обработчики событий
            this.setupEventHandlers(data, uiConfig);
            
            // Обновляем прогресс через ProgressService
            if (window.progressService) {
                window.progressService.updateProgress(data, uiConfig);
            }
            
            // Обрабатываем таймер через TimerService
            if (window.timerService) {
                window.timerService.updateTimerDisplay(data);
            }
            
            this.logger.info('✅ Egg rendered successfully');
        } catch (error) {
            this.logger.error('❌ Error in renderEgg:', error);
            this.logger.error('❌ Error stack:', error.stack);
            throw error;
        }
    }

    /**
     * Создание HTML для яйца
     * @param {Object} data - Данные яйца
     * @param {Object} uiConfig - Конфигурация UI
     * @returns {string} HTML строка
     */
    createEggHTML(data, uiConfig) {
        try {
            this.logger.info('🔧 Creating egg HTML with data:', data);
            
            const timerClass = data.state === 'dead' ? 'timer stopped' : 'timer';
            
            // Упрощенный HTML без сложных условий
            const html = `
                <div class="egg-container">
                    <div class="egg" id="egg" data-state="${data.state}">
                        <div class="egg-content"></div>
                    </div>
                    
                    <div class="temperature" id="temperature">
                        🌡️ ${data.temperature}°C
                    </div>
                    
                    <div class="${timerClass}" id="timer">
                        ⏰ ${window.timerService ? window.timerService.formatTime(data.time_remaining) : '0:00:00:00'}
                    </div>
                    
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <div class="progress-text">0%</div>
                    </div>
                    
                    ${data.state === 'dead' ? '<button id="resetEggBtn" class="reset-btn">⟳</button>' : ''}
                </div>
            `;
            
            this.logger.info('🔧 Created HTML successfully');
            return html;
        } catch (error) {
            this.logger.error('❌ Error in createEggHTML:', error);
            this.logger.error('❌ Error stack:', error.stack);
            throw error;
        }
    }

    /**
     * Получение контента яйца в зависимости от состояния
     * @param {Object} data - Данные яйца
     * @returns {string} HTML контент
     */
    getEggContent(data) {
        switch (data.state) {
            case 'incubating':
                return '<div class="egg-content">🥚</div>';
            case 'hatching':
                return `
                    <div class="egg-content hatching">
                        <div class="crack">🔄</div>
                        <div class="click-info">Кликов: ${data.hatching_clicks || 0}/${data.required_clicks || 1000}</div>
                    </div>
                `;
            case 'dead':
                return '<div class="egg-content dead">💀</div>';
            default:
                return '<div class="egg-content">🥚</div>';
        }
    }

    /**
     * Настройка обработчиков событий
     * @param {Object} data - Данные яйца
     * @param {Object} uiConfig - Конфигурация UI
     */
    setupEventHandlers(data, uiConfig) {
        // Кнопка сброса
        const resetBtn = document.getElementById('resetEggBtn');
        if (resetBtn) {
            resetBtn.onclick = () => this.handleReset();
        }
        
        // Клик по яйцу для вылупления
        const eggElement = document.getElementById('egg');
        if (eggElement && uiConfig.can_click && data.state === 'hatching') {
            eggElement.style.cursor = 'pointer';
            eggElement.onclick = () => this.handleClick();
        }
        
        // Обработчики свайпов удалены
    }

    /**
     * Обработка клика по яйцу
     */
    async handleClick() {
        try {
            this.logger.info('👆 Egg clicked');
            
            if (window.apiService) {
                const result = await window.apiService.clickEgg();
                if (result.success) {
                    // Обновляем данные и перерендериваем
                    await this.updateEggData();
                    
                    // Уведомления удалены
                }
            }
        } catch (error) {
            this.logger.error('❌ Error clicking egg:', error);
            // Уведомления удалены
        }
    }

    /**
     * Обработка сброса яйца
     */
    async handleReset() {
        try {
            this.logger.info('🔄 Resetting egg');
            
            if (window.apiService) {
                const result = await window.apiService.resetEgg();
                if (result.success) {
                    // Перезагружаем данные яйца
                    await this.updateEggData();
                    
                    // Запускаем таймер после сброса, если яйцо в состоянии инкубации
                    if (this.currentEggData && this.currentEggData.state === 'incubating') {
                        this.logger.info('⏰ Starting timer after reset...');
                        if (window.telepetsApp && window.telepetsApp.handleTimerForState) {
                            window.telepetsApp.handleTimerForState(this.currentEggData);
                        }
                    }
                    
                    // Уведомления удалены
                }
            }
        } catch (error) {
            this.logger.error('❌ Error resetting egg:', error);
            // Уведомления удалены
        }
    }

    /**
     * Обновление данных яйца
     */
    async updateEggData() {
        try {
            if (window.apiService) {
                const data = await window.apiService.getEggData();
                this.currentEggData = data;
                this.renderEgg(data, data.ui_config || {});
                
                // Обрабатываем таймер в зависимости от состояния
                if (window.telepetsApp && window.telepetsApp.handleTimerForState) {
                    window.telepetsApp.handleTimerForState(data);
                }
            }
        } catch (error) {
            this.logger.error('❌ Error updating egg data:', error);
        }
    }

    /**
     * Проверка состояния яйца
     * @param {string} state - Состояние для проверки
     * @returns {boolean}
     */
    isEggState(state) {
        return this.currentEggData && this.currentEggData.state === state;
    }

    /**
     * Получение текущих данных яйца
     * @returns {Object|null}
     */
    getCurrentEggData() {
        return this.currentEggData;
    }

    /**
     * Получение прогресса яйца
     * @returns {number}
     */
    getEggProgress() {
        return this.currentEggData ? (this.currentEggData.progress || 0) : 0;
    }

    /**
     * Получение температуры яйца
     * @returns {number}
     */
    getEggTemperature() {
        return this.currentEggData ? (this.currentEggData.temperature || 0) : 0;
    }

    /**
     * Получение оставшегося времени
     * @returns {number}
     */
    getEggTimeRemaining() {
        return this.currentEggData ? (this.currentEggData.time_remaining || 0) : 0;
    }

    /**
     * Проверка, мертво ли яйцо
     * @returns {boolean}
     */
    isEggDead() {
        return this.isEggState('dead');
    }

    /**
     * Проверка, вылупляется ли яйцо
     * @returns {boolean}
     */
    isEggHatching() {
        return this.isEggState('hatching');
    }

    /**
     * Проверка, инкубируется ли яйцо
     * @returns {boolean}
     */
    isEggIncubating() {
        return this.isEggState('incubating');
    }

    /**
     * Получение количества кликов для вылупления
     * @returns {Object}
     */
    getHatchingClicks() {
        if (!this.currentEggData) return { current: 0, required: 1000 };
        
        return {
            current: this.currentEggData.hatching_clicks || 0,
            required: this.currentEggData.required_clicks || 1000
        };
    }

    /**
     * Скрытие экрана загрузки
     */
    hideLoading() {
        const loading = document.querySelector('.loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    /**
     * Показ ошибки
     * @param {string} message - Сообщение об ошибке
     */
    showError(message) {
        if (this.appElement) {
            this.appElement.innerHTML = `
                <div class="error-container">
                    <h2>Ошибка</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()">Перезагрузить</button>
                </div>
            `;
        }
    }

    /**
     * Сброс состояния сервиса
     */
    reset() {
        this.currentEggData = null;
        this.logger.info('EggService reset');
    }

    /**
     * Получение статистики сервиса
     * @returns {Object}
     */
    getStats() {
        return {
            hasData: !!this.currentEggData,
            currentState: this.currentEggData ? this.currentEggData.state : null,
            progress: this.getEggProgress(),
            temperature: this.getEggTemperature(),
            timeRemaining: this.getEggTimeRemaining()
        };
    }
}

// Создаем глобальный экземпляр сервиса
window.eggService = new EggService();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EggService;
} 