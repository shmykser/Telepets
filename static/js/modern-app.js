/**
 * Modern Application Entry Point
 * Telepets - Telegram WebApp for egg incubation game
 * Fully modern version using APIService and TelegramService
 */

class TelepetsApp {
    constructor() {
        this.userId = null;
        this.isInitialized = false;
        this.currentEggData = null;
        this.logger = {
            info: (msg) => console.log(`[TelepetsApp] ${msg}`),
            error: (msg) => console.error(`[TelepetsApp] ${msg}`),
            warn: (msg) => console.warn(`[TelepetsApp] ${msg}`)
        };
    }

    async init() {
        try {
            this.logger.info('🚀 Initializing Telepets App...');
            
            // Принудительно делаем приложение видимым
            const app = document.getElementById('app');
            if (app) {
                app.classList.add('loaded');
                app.style.opacity = '1';
            }
            
            // Принудительно скрываем экран загрузки
            const loading = document.querySelector('.loading');
            if (loading) {
                loading.style.display = 'none';
            }
            
            // Initialize modern services
            if (window.initServices) {
                this.logger.info('🔧 Initializing services...');
                await window.initServices();
            }
            
            // Initialize click handlers (will be setup after egg rendering)
            this.clickHandlerInitialized = false;
            
            // Initialize Service Worker Manager
            if (window.serviceWorkerManager) {
                this.logger.info('🔧 Initializing Service Worker Manager...');
                await window.serviceWorkerManager.initialize();
            }
            
            // Get userId from TelegramService
            this.userId = window.telegramService.getUserId();
            this.logger.info(`👤 User ID: ${this.userId}`);
            
            // Set global userId for compatibility
            window.userId = this.userId;
            
            // Load egg data
            await this.loadEggData();
            
            // Инициализируем обработчики событий таймера
            this.setupTimerEventHandlers();
            
            // Start real-time updates
            this.startLongPolling();
            
            // Hide loading screen
            if (window.eggService) {
                window.eggService.hideLoading();
            } else {
                this.hideLoading();
            }
            
            this.isInitialized = true;
            this.logger.info('✅ Telepets App initialized successfully');
            
        } catch (error) {
            this.logger.error('❌ Failed to initialize app:', error);
            this.showError('Ошибка инициализации приложения');
        }
    }

    async loadEggData() {
        try {
            this.logger.info('📊 Loading egg data...');
            const data = await window.apiService.getEggData();
            
            this.logger.info('📊 Raw API response:', data);
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            this.currentEggData = data;
            window.currentEggData = data;
            
            this.logger.info('✅ Egg data loaded:', data);
            
            // Используем EggService для рендеринга
            if (window.eggService) {
                this.logger.info('🔧 Using EggService for rendering');
                window.eggService.renderEgg(data, data.ui_config || {});
            } else {
                this.logger.info('🔧 Using fallback rendering');
                this.renderEgg(data);
            }
            
            // Обрабатываем таймер в зависимости от состояния
            this.handleTimerForState(data);
            
            // Обновляем прогресс через ProgressService
            if (window.progressService) {
                window.progressService.updateProgress(data, data.ui_config || {});
            }
            
        } catch (error) {
            this.logger.error('❌ Error loading egg data:', error);
            this.logger.error('❌ Error stack:', error.stack);
            throw error;
        }
    }

    async warmEgg() {
        try {
            this.logger.info('🔥 Warming egg...');
            
            // Используем TemperatureService для нагрева
            if (window.temperatureService) {
                const result = await window.temperatureService.warmEgg(this.userId, this.currentEggData);
                
                if (result.success) {
                    // Обновляем данные
                    this.currentEggData.temperature = result.temperature;
                    this.currentEggData.state = result.state;
                    window.currentEggData = this.currentEggData;
                    
                    this.logger.info('✅ Egg warmed via TemperatureService:', result);
                    
                    // Используем EggService для рендеринга
                    if (window.eggService) {
                        window.eggService.renderEgg(this.currentEggData, this.currentEggData.ui_config || {});
                    } else {
                        this.renderEgg(this.currentEggData);
                    }
                    
                    // Обрабатываем таймер в зависимости от состояния
                    this.handleTimerForState(this.currentEggData);
                    
                    return;
                } else {
                    throw new Error(result.error || 'Ошибка нагрева');
                }
            }
            
            // Fallback к старому методу
            const data = await window.apiService.warmEgg();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            this.currentEggData = data;
            window.currentEggData = data;
            
            this.logger.info('✅ Egg warmed:', data);
            
            // Используем EggService для рендеринга
            if (window.eggService) {
                window.eggService.renderEgg(data, data.ui_config || {});
            } else {
                this.renderEgg(data);
            }
            
            // Обрабатываем таймер в зависимости от состояния
            this.handleTimerForState(data);
            
            // Show notification
            if (window.notificationService) {
                window.notificationService.showActionNotification('warm', true);
            }
            
        } catch (error) {
            this.logger.error('❌ Error warming egg:', error);
            if (window.notificationService) {
                window.notificationService.showErrorNotification('Ошибка нагрева: ' + error.message);
            }
        }
    }

    async clickEgg() {
        try {
            this.logger.info('👆 Clicking egg...');
            const data = await window.apiService.clickEgg();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            this.currentEggData = data;
            window.currentEggData = data;
            
            this.logger.info('✅ Egg clicked:', data);
            
            // Используем EggService для рендеринга
            if (window.eggService) {
                window.eggService.renderEgg(data, data.ui_config || {});
            } else {
                this.renderEgg(data);
            }
            
            // Обрабатываем таймер в зависимости от состояния
            this.handleTimerForState(data);
            
            // Show notification
            if (window.notificationService) {
                window.notificationService.showActionNotification('click', true);
            }
            
        } catch (error) {
            this.logger.error('❌ Error clicking egg:', error);
            if (window.notificationService) {
                window.notificationService.showErrorNotification('Ошибка клика: ' + error.message);
            }
        }
    }

    async resetEgg() {
        try {
            this.logger.info('🔄 Resetting egg...');
            const data = await window.apiService.resetEgg();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Reload egg data
            await this.loadEggData();
            
            // Запускаем таймер после сброса, если яйцо в состоянии инкубации
            if (this.currentEggData && this.currentEggData.state === 'incubating') {
                this.logger.info('⏰ Starting timer after reset...');
                this.handleTimerForState(this.currentEggData);
            }
            
            // Show notification
            if (window.notificationService) {
                window.notificationService.showActionNotification('reset', true);
            }
            
        } catch (error) {
            this.logger.error('❌ Error resetting egg:', error);
            if (window.notificationService) {
                window.notificationService.showErrorNotification('Ошибка сброса: ' + error.message);
            }
        }
    }

    startLongPolling() {
        this.logger.info('🔄 Starting long polling...');
        
        const onUpdate = (data) => {
            if (data.error) {
                this.logger.error('Long polling error:', data.error);
                return;
            }
            
            // Check state transition
            const currentState = this.currentEggData ? this.currentEggData.state : null;
            const newState = data.state;
            
            if (currentState && currentState !== newState) {
                this.logger.info(`🔄 State transition: ${currentState} → ${newState}`);
                
                if (window.notificationService) {
                    window.notificationService.showStateTransition(currentState, newState);
                }
            }
            
            this.currentEggData = data;
            window.currentEggData = data;
            
            // Обрабатываем таймер в зависимости от состояния
            this.handleTimerForState(data);
            
            // Используем EggService для рендеринга
            if (window.eggService) {
                window.eggService.renderEgg(data, data.ui_config || {});
            } else {
                this.renderEgg(data);
            }
        };
        
        const onError = (error) => {
            this.logger.error('Long polling error:', error);
            // Restart after 3 seconds
            setTimeout(() => {
                window.apiService.startLongPolling(onUpdate, onError);
            }, 3000);
        };
        
        window.apiService.startLongPolling(onUpdate, onError);
    }

    renderEgg(data) {
        try {
            this.logger.info('🎨 Rendering egg with data:', data);
            const app = document.getElementById('app');
            
            if (!app) {
                this.logger.error('❌ App element not found');
                return;
            }
            
            // Get UI configuration
            const uiConfig = data.ui_config || {};
            
            // Show notifications
            if (window.notificationService) {
                window.notificationService.showNotifications(data, uiConfig);
            }
            
            // Create egg HTML
            const eggHtml = this.createEggHTML(data, uiConfig);
            app.innerHTML = eggHtml;
            
            // Setup event handlers
            this.setupEventHandlers(data, uiConfig);
            
            // Make app visible after successful render
            app.classList.add('loaded');
            
            this.logger.info('✅ Egg rendered successfully');
            
        } catch (error) {
            this.logger.error('❌ Error in renderEgg:', error);
            throw error;
        }
    }

    createEggHTML(data, uiConfig) {
        const timerClass = data.state === 'dead' ? 'timer stopped' : 'timer';
        
        return `
            <div class="egg-container">
                <div class="egg" id="egg" data-state="${data.state}">
                    ${this.getEggContent(data)}
                </div>
                
                ${uiConfig.show_temperature !== false ? `
                    <div class="temperature" id="temperature">
                        ${window.temperatureService ? window.temperatureService.formatTemperature(data.temperature) : `🌡️ ${data.temperature > 0 ? '+' : ''}${data.temperature}°C`}
                    </div>
                ` : ''}
                
                ${uiConfig.show_timer !== false ? `
                    <div class="${timerClass}" id="timer">
                        ⏰ ${data.state === 'dead' ? '<span class="game-over">Игра окончена</span>' : (window.timerService ? window.timerService.formatTime(data.time_remaining) : '0:00:00:00')}
                    </div>
                ` : ''}
                
                ${uiConfig.show_progress !== false ? `
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <div class="progress-text">0%</div>
                    </div>
                ` : ''}
                
                ${data.state === 'dead' ? `
                    <button id="resetEggBtn" class="reset-btn">⟳</button>
                ` : ''}
            </div>
        `;
    }

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

    setupEventHandlers(data, uiConfig) {
        // Reset button
        const resetBtn = document.getElementById('resetEggBtn');
        if (resetBtn) {
            resetBtn.onclick = () => this.resetEgg();
        }
        
        // Egg click for hatching
        const eggElement = document.getElementById('egg');
        if (eggElement && uiConfig.can_click && data.state === 'hatching') {
            eggElement.style.cursor = 'pointer';
            eggElement.onclick = () => this.clickEgg();
        }
        
        // Swipe handlers
        if (window.swipeHandler) {
            window.setupSwipeHandlers();
        }
        
        // Setup click handlers after elements are rendered
        if (window.clickHandler && !this.clickHandlerInitialized) {
            this.logger.info('🔧 Setting up click handlers after rendering...');
            this.setupClickHandlers();
            this.clickHandlerInitialized = true;
        }
    }

    setupClickHandlers() {
        this.logger.info('🔧 Setting up click handlers...');
        
        // Регистрируем обработчик для яйца
        if (window.clickHandler) {
            window.clickHandler.register('egg', {
                enableHaptic: true,
                enableAnimation: true,
                debounceTime: 500
            }, 
            // onClick callback
            (clickCount, handler) => {
                this.logger.info(`👆 Egg clicked: ${clickCount}`);
                if (this.currentEggData && this.currentEggData.state === 'hatching') {
                    this.clickEgg();
                }
            },
            // onLongPress callback
            (clickCount, handler) => {
                this.logger.info('👆 Long press on egg');
                // Специальные действия при длительном нажатии на яйцо
                if (window.notificationService) {
                    window.notificationService.showInfoNotification('Длительное нажатие на яйцо');
                }
            },
            // onDoubleClick callback
            (clickCount, handler) => {
                this.logger.info('👆 Double click on egg');
                // Специальные действия при двойном клике
                if (window.notificationService) {
                    window.notificationService.showInfoNotification('Двойной клик по яйцу');
                }
            });
        }
        
        // Регистрируем обработчик для кнопки сброса
        if (window.clickHandler) {
            window.clickHandler.register('resetEggBtn', {
                enableHaptic: true,
                enableAnimation: true,
                debounceTime: 1000
            }, 
            (clickCount, handler) => {
                this.logger.info('🔄 Reset button clicked');
                this.resetEgg();
            });
        }
        
        this.logger.info('✅ Click handlers setup completed');
    }

    hideLoading() {
        const loading = document.querySelector('.loading');
        if (loading) {
            loading.style.display = 'none';
        }
        // Делаем #app видимым
        const app = document.getElementById('app');
        if (app) app.classList.add('loaded');
    }

    showError(message) {
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
                <div class="error-container">
                    <h2>Ошибка</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()">Перезагрузить</button>
                </div>
            `;
        }
    }

    // Public methods for external access
    getEggData() {
        return this.currentEggData;
    }

    getUserData() {
        return {
            userId: this.userId,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Настройка обработчиков событий таймера
     */
    setupTimerEventHandlers() {
        if (!window.timerService) {
            this.logger.warn('TimerService not available');
            return;
        }

        // Обработчик истечения времени
        window.timerService.on('expired', (data) => {
            this.logger.info('⏰ Timer expired:', data);
            
            // При истечении времени переходим к вылуплению
            if (data.state === 'incubating') {
                this.logger.info('🥚 Incubation completed, transitioning to hatching');
                
                // Показываем уведомление
                if (window.notificationService) {
                    window.notificationService.show('🥚 Инкубация завершена! Начинается вылупление!', 'success', 5000);
                }
            } else if (data.state === 'hatching') {
                this.logger.info('🥚 Hatching completed, transitioning to next stage');
                
                // Показываем уведомление
                if (window.notificationService) {
                    window.notificationService.show('🥚 Вылупление завершено!', 'success', 5000);
                }
            }
            
            // Всегда перезагружаем данные для обновления состояния
            this.loadEggData();
        });

        // Обработчик критического времени
        window.timerService.on('critical', (data) => {
            this.logger.info('⚠️ Critical time reached:', data);
            
            if (window.notificationService) {
                window.notificationService.show('⚠️ Критическое время! Осталось менее 10%!', 'warning', 3000);
            }
        });

        // Обработчик синхронизации
        window.timerService.on('sync', (data) => {
            this.logger.info('🔄 Timer synced:', data);
        });
    }

    /**
     * Обработка таймера в зависимости от состояния яйца
     * @param {Object} data - Данные яйца
     */
    handleTimerForState(data) {
        if (!window.timerService) {
            return;
        }

        const { state, time_remaining } = data;
        
        // Управление автоматическим охлаждением
        if (window.temperatureService) {
            if (state === 'incubating') {
                // Запускаем охлаждение только в состоянии инкубации
                window.temperatureService.startCooling(data);
            } else {
                // Останавливаем охлаждение в других состояниях
                window.temperatureService.stopCooling();
            }
        }
        
        // Останавливаем таймер если яйцо мертво
        if (state === 'dead') {
            window.timerService.stopTimer();
            window.timerService.updateTimerDisplay(data);
            return;
        }

        // Для всех активных состояний (кроме dead) запускаем таймер
        if (state !== 'dead' && time_remaining > 0) {
            // Если таймер не запущен или состояние изменилось, запускаем его
            if (!window.timerService.isRunning || window.timerService.currentState !== state) {
                window.timerService.startTimer(time_remaining, state, time_remaining);
            } else {
                // Синхронизируем с сервером только если разница большая
                const timeDiff = Math.abs(window.timerService.localTimeRemaining - time_remaining);
                if (timeDiff > 5) { // Синхронизируем только если разница больше 5 секунд
                    window.timerService.syncWithServer(time_remaining, state);
                }
            }
        }
        
        // Если время истекло (time_remaining <= 0), останавливаем таймер и обновляем отображение
        else if (time_remaining <= 0) {
            window.timerService.stopTimer();
            window.timerService.updateTimerDisplay(data);
            
            // Если это было состояние инкубации или вылупления, показываем уведомление
            if (state === 'incubating' || state === 'hatching') {
                if (window.notificationService) {
                    const message = state === 'incubating' ? 
                        '🥚 Инкубация завершена! Начинается вылупление!' : 
                        '🥚 Вылупление завершено!';
                    window.notificationService.show(message, 'success', 5000);
                }
            }
        }
        
        // Для других состояний обновляем отображение
        else {
            window.timerService.updateTimerDisplay(data);
        }
    }
}

// Export for use in template
window.TelepetsApp = TelepetsApp;

// Auto-initialize if this script is loaded directly
if (!window.telepetsApp) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.telepetsApp = new TelepetsApp();
            window.telepetsApp.init();
        });
    } else {
        window.telepetsApp = new TelepetsApp();
        window.telepetsApp.init();
    }
} 