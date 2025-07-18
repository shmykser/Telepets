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
        const tempElement = document.getElementById('temperature');
        if (tempElement) {
            tempElement.textContent = this.formatTemperature(temperature);
        }
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
     * Сброс состояния сервиса
     */
    reset() {
        this.lastTemperature = null;
        this.isWarming = false;
    }
}

// Создаем глобальный экземпляр сервиса
window.temperatureService = new TemperatureService();

// Экспорт для совместимости
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemperatureService;
} 