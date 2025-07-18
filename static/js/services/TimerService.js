/**
 * Сервис управления таймером - централизованная логика времени инкубации
 * Управляет отображением времени, локальным таймером и форматированием
 * Поддерживает систему событий для уведомления других сервисов
 */

/**
 * Класс для управления таймером яйца
 */
class TimerService {
    constructor() {
        this.localTimerInterval = null;
        this.localTimeRemaining = null;
        this.lastSyncTimestamp = null;
        this.isRunning = false;
        this.totalTime = null; // Общее время для расчета прогресса
        this.eventListeners = new Map(); // Система событий
        this.currentState = null; // Текущее состояние яйца
    }

    /**
     * Подписка на события таймера
     * @param {string} event - Тип события ('expired', 'critical', 'sync')
     * @param {Function} callback - Функция обратного вызова
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Отписка от событий таймера
     * @param {string} event - Тип события
     * @param {Function} callback - Функция обратного вызова
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Вызов события
     * @param {string} event - Тип события
     * @param {Object} data - Данные события
     */
    emit(event, data = {}) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in timer event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Форматирование времени в читаемый вид
     * @param {number} seconds - Количество секунд
     * @returns {string} Отформатированное время
     */
    formatTime(seconds) {
        if (seconds <= 0) {
            return "0:00:00:00";
        }
        
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Обновление отображения таймера в интерфейсе
     * @param {Object} data - Данные яйца
     */
    updateTimerDisplay(data) {
        const timerElement = document.getElementById('timer');
        if (!timerElement || !data.ui_config || data.ui_config.show_timer === false) {
            return;
        }

        if (data.state === 'dead') {
            timerElement.innerHTML = '⏰ <span class="game-over">Игра окончена</span>';
            timerElement.className = 'timer stopped';
        } else {
            // Всегда используем наше локальное форматирование с секундами
            const timeToShow = this.localTimeRemaining !== null ? this.localTimeRemaining : data.time_remaining;
            timerElement.innerHTML = `⏰ ${this.formatTime(timeToShow)}`;
            timerElement.className = 'timer';
        }
    }

    /**
     * Запуск таймера с любым значением времени
     * @param {number} timeRemaining - Оставшееся время в секундах
     * @param {string} state - Состояние яйца
     * @param {number} totalTime - Общее время (опционально)
     */
    startTimer(timeRemaining, state = null, totalTime = null) {
        this.stopTimer();
        
        this.localTimeRemaining = timeRemaining;
        this.totalTime = totalTime || timeRemaining;
        this.currentState = state;
        this.lastSyncTimestamp = Date.now();
        this.isRunning = true;
        
        console.log(`[TimerService] Starting timer: ${timeRemaining}s, state: ${state}, total: ${this.totalTime}s`);
        console.log(`[TimerService] Timer will expire in ${timeRemaining} seconds`);
        
        this.localTimerInterval = setInterval(() => {
            console.log(`[TimerService] Timer tick: ${this.localTimeRemaining}s remaining`);
            
            if (this.localTimeRemaining > 0) {
                this.localTimeRemaining--;
                this.updateLocalTimerDisplay();
                
                // Проверяем критическое время (менее 10% осталось)
                if (this.isCriticalTime(this.localTimeRemaining, this.totalTime)) {
                    this.emit('critical', {
                        timeRemaining: this.localTimeRemaining,
                        totalTime: this.totalTime,
                        state: this.currentState
                    });
                }
            } else {
                console.log('[TimerService] Timer reached zero, stopping...');
                this.stopTimer();
                this.onTimerExpired();
            }
        }, 1000);
    }

    /**
     * Остановка таймера
     */
    stopTimer() {
        if (this.localTimerInterval) {
            clearInterval(this.localTimerInterval);
            this.localTimerInterval = null;
        }
        this.isRunning = false;
    }

    /**
     * Обновление отображения локального таймера
     */
    updateLocalTimerDisplay() {
        const timerElement = document.getElementById('timer');
        if (timerElement && this.localTimeRemaining !== null) {
            // Проверяем состояние яйца
            const currentData = window.currentEggData;
            if (currentData && currentData.state === 'dead') {
                timerElement.innerHTML = '⏰ <span class="game-over">Игра окончена</span>';
                timerElement.className = 'timer stopped';
            } else if (this.localTimeRemaining <= 0) {
                // Если время истекло, показываем соответствующее сообщение
                if (this.currentState === 'incubating') {
                    timerElement.innerHTML = '⏰ <span class="completed">Инкубация завершена!</span>';
                    timerElement.className = 'timer completed';
                } else if (this.currentState === 'hatching') {
                    timerElement.innerHTML = '⏰ <span class="completed">Вылупление завершено!</span>';
                    timerElement.className = 'timer completed';
                } else {
                    timerElement.innerHTML = '⏰ <span class="completed">Время истекло!</span>';
                    timerElement.className = 'timer completed';
                }
            } else {
                const formattedTime = this.formatTime(this.localTimeRemaining);
                timerElement.innerHTML = `⏰ ${formattedTime}`;
                timerElement.className = 'timer';
            }
        }
    }

    /**
     * Синхронизация локального времени с сервером
     * @param {number} serverTimeRemaining - Время с сервера
     * @param {string} state - Состояние яйца
     */
    syncWithServer(serverTimeRemaining, state = null) {
        const now = Date.now();
        const timeDiff = Math.abs(this.localTimeRemaining - serverTimeRemaining);
        
        // Синхронизируем если разница больше 2 секунд или состояние изменилось
        if (timeDiff > 2 || !this.isRunning || state !== this.currentState) {
            this.localTimeRemaining = serverTimeRemaining;
            this.currentState = state;
            this.lastSyncTimestamp = now;
            
            console.log(`[TimerService] Syncing with server: ${serverTimeRemaining}s, state: ${state}`);
            
            // Уведомляем о синхронизации
            this.emit('sync', {
                serverTime: serverTimeRemaining,
                localTime: this.localTimeRemaining,
                state: state
            });
            
            // Не перезапускаем таймер, если он уже работает
            if (serverTimeRemaining <= 0) {
                this.stopTimer();
            }
        }
    }

    /**
     * Проверка истечения времени
     * @param {number} timeRemaining - Оставшееся время
     * @returns {boolean} Истекло ли время
     */
    isTimeExpired(timeRemaining) {
        return timeRemaining <= 0;
    }

    /**
     * Обработка истечения времени
     */
    onTimerExpired() {
        console.log('[TimerService] Timer expired!');
        
        // Уведомляем об истечении времени
        this.emit('expired', {
            state: this.currentState,
            totalTime: this.totalTime
        });
        
        // Уведомляем об истечении времени
        if (window.notificationService) {
            window.notificationService.show('⏰ Время истекло!', 'warning', 5000);
        }
        
        // Запускаем проверку состояния яйца через современное приложение
        if (window.telepetsApp && typeof window.telepetsApp.loadEggData === 'function') {
            window.telepetsApp.loadEggData();
        } else if (typeof window.loadEggData === 'function') {
            // Fallback для старой архитектуры
            window.loadEggData();
        }
    }

    /**
     * Получение статуса таймера
     * @returns {Object} Статус таймера
     */
    getTimerStatus() {
        return {
            isRunning: this.isRunning,
            timeRemaining: this.localTimeRemaining,
            totalTime: this.totalTime,
            currentState: this.currentState,
            lastSync: this.lastSyncTimestamp,
            formatted: this.localTimeRemaining ? this.formatTime(this.localTimeRemaining) : '0:00:00:00'
        };
    }

    /**
     * Расчет прогресса времени
     * @param {number} timeRemaining - Оставшееся время
     * @param {number} totalTime - Общее время
     * @returns {number} Прогресс в процентах (0-100)
     */
    calculateTimeProgress(timeRemaining, totalTime = null) {
        const total = totalTime || this.totalTime || timeRemaining;
        if (total <= 0) return 100;
        const elapsed = total - timeRemaining;
        return Math.max(0, Math.min(100, (elapsed / total) * 100));
    }

    /**
     * Проверка критического времени (менее 10% осталось)
     * @param {number} timeRemaining - Оставшееся время
     * @param {number} totalTime - Общее время
     * @returns {boolean} Критическое время или нет
     */
    isCriticalTime(timeRemaining, totalTime = null) {
        const total = totalTime || this.totalTime || timeRemaining;
        const progress = this.calculateTimeProgress(timeRemaining, total);
        return progress > 90; // Менее 10% времени осталось
    }

    /**
     * Получение времени до следующего этапа
     * @param {string} currentState - Текущее состояние
     * @param {number} timeRemaining - Оставшееся время
     * @returns {Object} Информация о следующем этапе
     */
    getNextStageInfo(currentState, timeRemaining) {
        switch (currentState) {
            case 'incubating':
                return {
                    nextStage: 'hatching',
                    timeToNext: timeRemaining,
                    description: 'До начала вылупления'
                };
            case 'hatching':
                return {
                    nextStage: 'hatched',
                    timeToNext: 0,
                    description: 'Кликайте для вылупления'
                };
            default:
                return {
                    nextStage: null,
                    timeToNext: 0,
                    description: 'Нет активных этапов'
                };
        }
    }

    /**
     * Сброс состояния таймера
     */
    reset() {
        this.stopTimer();
        this.localTimeRemaining = null;
        this.totalTime = null;
        this.currentState = null;
        this.lastSyncTimestamp = null;
        this.isRunning = false;
    }

    /**
     * Пауза таймера
     */
    pause() {
        this.stopTimer();
    }

    /**
     * Возобновление таймера
     * @param {number} timeRemaining - Время для продолжения
     */
    resume(timeRemaining) {
        if (timeRemaining > 0) {
            this.startTimer(timeRemaining, this.currentState, this.totalTime);
        }
    }
}

// Создаем глобальный экземпляр сервиса
window.timerService = new TimerService();

// Экспорт для совместимости
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimerService;
} 