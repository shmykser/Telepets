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
        
        // Проверяем инициализацию
        setTimeout(() => {
            console.log('✅ TemperatureService инициализирован');
        }, 1000);
    }

    /**
     * Получение цвета яйца в зависимости от температуры
     * @param {number} temperature - Текущая температура
     * @returns {string} CSS градиент для яйца
     */
    getEggColorByTemperature(temperature) {
        // Нормальная температура (28-41°C) - золотистый
        if (temperature >= 28 && temperature <= 41) {
            return 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 50%, #e17055 100%)';
        }
        
        // Очень холодно (15-18°C) - синий/голубой
        if (temperature <= 18) {
            return 'linear-gradient(135deg, #74b9ff 0%, #0984e3 50%, #6c5ce7 100%)';
        }
        
        // Холодно (18-26°C) - от синего к золотистому
        if (temperature > 18 && temperature < 28) {
            const ratio = (temperature - 18) / (28 - 18); // 0-1
            return `linear-gradient(135deg, 
                ${this.interpolateColor('#74b9ff', '#ffeaa7', ratio)} 0%, 
                ${this.interpolateColor('#0984e3', '#fab1a0', ratio)} 50%, 
                ${this.interpolateColor('#6c5ce7', '#e17055', ratio)} 100%)`;
        }
        
        // Жарко (41-44°C) - от золотистого к оранжевому
        if (temperature > 41 && temperature <= 44) {
            const ratio = (temperature - 41) / (44 - 41); // 0-1
            return `linear-gradient(135deg, 
                ${this.interpolateColor('#ffeaa7', '#ff7675', ratio)} 0%, 
                ${this.interpolateColor('#fab1a0', '#fd79a8', ratio)} 50%, 
                ${this.interpolateColor('#e17055', '#e84393', ratio)} 100%)`;
        }
        
        // Очень жарко (44-50°C) - огненный красный
        if (temperature > 44) {
            return 'linear-gradient(135deg, #ff7675 0%, #fd79a8 50%, #e84393 100%)';
        }
        
        // По умолчанию - золотистый
        return 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 50%, #e17055 100%)';
    }

    /**
     * Интерполяция между двумя цветами
     * @param {string} color1 - Первый цвет в hex формате
     * @param {string} color2 - Второй цвет в hex формате
     * @param {number} ratio - Коэффициент интерполяции (0-1)
     * @returns {string} Интерполированный цвет
     */
    interpolateColor(color1, color2, ratio) {
        // Убираем # из начала
        const c1 = color1.replace('#', '');
        const c2 = color2.replace('#', '');
        
        // Разбиваем на RGB компоненты
        const r1 = parseInt(c1.substr(0, 2), 16);
        const g1 = parseInt(c1.substr(2, 2), 16);
        const b1 = parseInt(c1.substr(4, 2), 16);
        
        const r2 = parseInt(c2.substr(0, 2), 16);
        const g2 = parseInt(c2.substr(2, 2), 16);
        const b2 = parseInt(c2.substr(4, 2), 16);
        
        // Интерполируем каждый компонент
        const r = Math.round(r1 + (r2 - r1) * ratio);
        const g = Math.round(g1 + (g2 - g1) * ratio);
        const b = Math.round(b1 + (b2 - b1) * ratio);
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    /**
     * Обновление цвета яйца в зависимости от температуры
     * @param {number} temperature - Текущая температура
     */
    updateEggColor(temperature) {
        const egg = document.getElementById('egg');
        if (!egg) return;
        
        const newColor = this.getEggColorByTemperature(temperature);
        
        // Используем !important чтобы переопределить CSS правила
        egg.style.setProperty('background', newColor, 'important');
        
        // Также обновляем CSS переменную для совместимости
        document.documentElement.style.setProperty('--egg-background', newColor);
        
        console.log(`🎨 Обновлен цвет яйца для температуры ${temperature}°C: ${newColor}`);
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
                
                // Обновляем цвет яйца
                this.updateEggColor(result.temperature);
                
                // Проверяем на смерть от перегрева
                if (result.state === 'dead') {
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
                
                // ОБНОВЛЯЕМ lastTouchTime после охлаждения (как в бэкенде)
                this.lastTouchTime = now;
                
                // Обновляем отображение температуры в интерфейсе
                this.updateTemperatureDisplay(newTemperature);
                
                // Обновляем цвет яйца
                this.updateEggColor(newTemperature);
                
                console.log(`❄️ Охлаждение: ${this.currentEggData.temperature}°C → ${newTemperature}°C`);
                
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
