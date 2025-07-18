/**
 * Сервис управления температурой - централизованная логика температуры яйца
 * Управляет нагревом, проверкой критических значений и анимациями
 */

/**
 * Класс для управления температурой яйца
 */
class TemperatureService {
    constructor() {
        this.lastTemperature = null;
        this.isWarming = false;
        this.coolingInterval = null;
        this.lastTouchTime = null;
        this.currentEggData = null;
    }

    /**
     * Нагрев яйца
     * @param {number} userId - ID пользователя
     * @param {Object} currentEggData - Текущие данные яйца
     * @returns {Promise<Object>} Результат нагрева
     */
    async warmEgg(userId, currentEggData) {
        if (!currentEggData || !userId || currentEggData.state === 'dead' || this.isWarming) {
            return { success: false, reason: 'invalid_state' };
        }
        
        this.isWarming = true;
        
        try {
            const response = await fetch(`/api/egg/${userId}/warm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Анимация нагрева
                this.playWarmingAnimation();
                
                // Обновляем локальные данные
                currentEggData.temperature = result.temperature;
                currentEggData.state = result.state || currentEggData.state;
                
                // Сбрасываем таймер охлаждения
                this.resetCoolingTimer();
                
                // Обновляем отображение температуры
                this.updateTemperatureDisplay(result.temperature);
                
                // Показываем уведомление об успешном нагреве
                if (window.notificationService) {
                    window.notificationService.showActionNotification('warm', true);
                }
                
                // Проверяем на смерть от перегрева
                if (result.state === 'dead') {
                    if (window.notificationService) {
                        window.notificationService.showStateTransition(currentEggData.state, 'dead');
                    }
                                    // Вызываем рендер через современное приложение
                if (window.telepetsApp && window.telepetsApp.renderEgg) {
                    window.telepetsApp.renderEgg(currentEggData);
                }
                }
                
                this.lastTemperature = result.temperature;
                return { success: true, temperature: result.temperature, state: result.state };
                
            } else {
                throw new Error(result.error || 'Ошибка нагрева');
            }
            
        } catch (error) {
            console.error('Ошибка нагрева яйца:', error);
            if (window.notificationService) {
                window.notificationService.showActionNotification('warm', false);
            }
            return { success: false, error: error.message };
        } finally {
            this.isWarming = false;
        }
    }

    /**
     * Проверка критических значений температуры
     * @param {number} temperature - Текущая температура
     * @returns {Object} Статус температуры
     */
    checkTemperatureStatus(temperature) {
        return {
            isDead: temperature <= DEAD_LOW_TEMP || temperature >= DEAD_HIGH_TEMP,
            isCritical: temperature <= CRITICAL_LOW_TEMP || temperature >= CRITICAL_HIGH_TEMP,
            isNormal: temperature >= NORMAL_TEMP_MIN && temperature <= NORMAL_TEMP_MAX,
            isTooLow: temperature < CRITICAL_LOW_TEMP,
            isTooHigh: temperature > CRITICAL_HIGH_TEMP,
            isDeadlyLow: temperature <= DEAD_LOW_TEMP,
            isDeadlyHigh: temperature >= DEAD_HIGH_TEMP
        };
    }

    /**
     * Проверка уведомлений о температуре
     * @param {number} temperature - Текущая температура
     */
    checkTemperatureNotifications(temperature) {
        if (!window.notificationService) return;
        
        const status = this.checkTemperatureStatus(temperature);
        
        // Показываем уведомления только при изменении температуры
        if (this.lastTemperature !== temperature) {
            if (status.isDeadlyLow) {
                window.notificationService.showTemperatureNotification('FREEZE_DEATH');
            } else if (status.isDeadlyHigh) {
                window.notificationService.showTemperatureNotification('OVERHEAT_DEATH');
            } else if (status.isTooLow) {
                window.notificationService.showTemperatureNotification('CRITICAL_LOW');
            } else if (status.isTooHigh) {
                window.notificationService.showTemperatureNotification('CRITICAL_HIGH');
            } else if (temperature < 30 && temperature >= CRITICAL_LOW_TEMP) {
                window.notificationService.showTemperatureNotification('LOW_TEMP');
            }
            
            this.lastTemperature = temperature;
        }
    }

    /**
     * Форматирование отображения температуры
     * @param {number} temperature - Температура
     * @returns {string} Отформатированная строка
     */
    formatTemperature(temperature) {
        const sign = temperature > 0 ? '+' : '';
        return `🌡️ ${sign}${temperature}°C`;
    }

    /**
     * Обновление отображения температуры в интерфейсе
     * @param {number} temperature - Новая температура
     */
    updateTemperatureDisplay(temperature) {
        // Обновляем все элементы с температурой на странице
        const tempElements = document.querySelectorAll('[id*="temperature"], [class*="temperature"]');
        
        tempElements.forEach(element => {
            if (element.textContent.includes('°C') || element.textContent.includes('🌡️')) {
                element.textContent = this.formatTemperature(temperature);
            }
        });
        
        // Также обновляем элементы в основном контейнере яйца
        const eggContainer = document.querySelector('.egg-container, #egg');
        if (eggContainer) {
            const tempInEgg = eggContainer.querySelector('[id*="temperature"], [class*="temperature"]');
            if (tempInEgg) {
                tempInEgg.textContent = this.formatTemperature(temperature);
            }
        }
        
        console.log(`🌡️ Обновлена температура в интерфейсе: ${this.formatTemperature(temperature)}`);
    }

    /**
     * Анимация нагрева яйца
     */
    playWarmingAnimation() {
        const egg = document.getElementById('egg');
        if (egg) {
            egg.classList.add('warming');
            setTimeout(() => {
                egg.classList.remove('warming');
            }, WARMING_ANIMATION_DURATION);
        }
    }

    /**
     * Анимация увеличения температуры (+1°C)
     */
    showTempIncrease() {
        const tempIncrease = document.createElement('div');
        tempIncrease.className = 'temp-increase';
        tempIncrease.innerHTML = '+1°C';
        document.body.appendChild(tempIncrease);
        
        setTimeout(() => {
            if (tempIncrease.parentNode) {
                tempIncrease.parentNode.removeChild(tempIncrease);
            }
        }, TEMP_INCREASE_ANIMATION_DURATION);
    }

    /**
     * Получение цвета температуры для индикации
     * @param {number} temperature - Температура
     * @returns {string} CSS цвет
     */
    getTemperatureColor(temperature) {
        const status = this.checkTemperatureStatus(temperature);
        
        if (status.isDead) {
            return '#f44336'; // Красный - смертельная
        } else if (status.isCritical) {
            return '#ff9800'; // Оранжевый - критическая
        } else if (status.isNormal) {
            return '#4caf50'; // Зеленый - нормальная
        } else {
            return '#ffffff'; // Белый - по умолчанию
        }
    }

    /**
     * Запуск автоматического охлаждения
     * @param {Object} eggData - Данные яйца
     */
    startCooling(eggData) {
        if (!eggData || eggData.state !== 'incubating') {
            this.stopCooling();
            return;
        }
        
        this.currentEggData = eggData;
        // Используем время из backend данных, если доступно
        this.lastTouchTime = eggData.last_touch_time ? 
            new Date(eggData.last_touch_time) : new Date();
        
        // Запускаем интервал охлаждения
        this.coolingInterval = setInterval(() => {
            this.applyCooling();
        }, COOLING_INTERVAL_SECONDS * 1000);
        
        console.log(`❄️ Запущено автоматическое охлаждение каждые ${COOLING_INTERVAL_SECONDS} секунд`);
    }
    
    /**
     * Остановка автоматического охлаждения
     */
    stopCooling() {
        if (this.coolingInterval) {
            clearInterval(this.coolingInterval);
            this.coolingInterval = null;
            console.log('❄️ Автоматическое охлаждение остановлено');
        }
    }
    
    /**
     * Применение охлаждения
     */
    applyCooling() {
        if (!this.currentEggData || this.currentEggData.state !== 'incubating') {
            return;
        }
        
        // Проверяем, прошло ли достаточно времени с последнего прикосновения
        const now = new Date();
        const timeSinceTouch = (now - this.lastTouchTime) / 1000; // в секундах
        
        if (timeSinceTouch >= COOLING_INTERVAL_SECONDS) {
            // Применяем охлаждение
            const newTemperature = Math.max(1, this.currentEggData.temperature - COOLING_DEGREES_PER_INTERVAL);
            
            if (newTemperature !== this.currentEggData.temperature) {
                this.currentEggData.temperature = newTemperature;
                
                // Обновляем отображение температуры в интерфейсе
                this.updateTemperatureDisplay(newTemperature);
                
                console.log(`❄️ Охлаждение: ${this.currentEggData.temperature + COOLING_DEGREES_PER_INTERVAL}°C → ${newTemperature}°C`);
                
                // Проверяем уведомления о температуре
                this.checkTemperatureNotifications(newTemperature);
                
                // Обновляем данные в основном приложении
                if (window.telepetsApp && window.telepetsApp.currentEggData) {
                    window.telepetsApp.currentEggData.temperature = newTemperature;
                }
                
                // Обновляем прогресс если есть ProgressService
                if (window.progressService && this.currentEggData) {
                    window.progressService.updateProgress(this.currentEggData, this.currentEggData.ui_config || {});
                }
            }
        }
    }
    
    /**
     * Сброс таймера охлаждения (при нагреве)
     */
    resetCoolingTimer() {
        this.lastTouchTime = new Date();
        console.log('🔥 Таймер охлаждения сброшен');
    }
    
    /**
     * Сброс состояния сервиса
     */
    reset() {
        this.lastTemperature = null;
        this.isWarming = false;
        this.stopCooling();
        this.currentEggData = null;
        this.lastTouchTime = null;
    }
}

// Создаем глобальный экземпляр сервиса
window.temperatureService = new TemperatureService();

// Экспорт для совместимости
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemperatureService;
} 