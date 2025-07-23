/**
 * Сервис управления прогресс-барами - централизованная логика прогресса
 * Управляет отображением прогресса для разных состояний яйца
 */

/**
 * Класс для управления прогресс-барами яйца
 */
class ProgressService {
    constructor() {
        this.currentProgress = 0;
        this.currentState = null;
        this.progressElement = null;
        this.fillElement = null;
        this.textElement = null;
        this.progressInterval = null;
        this.currentEggData = null;
        this.startTime = null;
        this.totalTime = null;
        this.logger = {
            info: (msg) => console.log(`[ProgressService] ${msg}`),
            error: (msg) => console.error(`[ProgressService] ${msg}`),
            warn: (msg) => console.warn(`[ProgressService] ${msg}`)
        };
    }

    /**
     * Инициализация сервиса
     */
    initialize() {
        this.logger.info('ProgressService initialized');
    }

    /**
     * Получение человекочитаемого названия состояния
     * @param {string} state - Состояние яйца
     * @returns {string} Человекочитаемое название
     */
    getStateDisplayName(state) {
        const stateNames = {
            'incubating': 'Инкубация',
            'hatching': 'Вылупление',
            'hatched': 'Вылупилось',
            'dead': 'Игра окончена',
            'default': 'Ожидание'
        };
        
        return stateNames[state] || 'Неизвестно';
    }

    /**
     * Обновление прогресс-бара на основе данных яйца
     * @param {Object} data - Данные яйца
     * @param {Object} uiConfig - Конфигурация UI
     */
    updateProgress(data, uiConfig = {}) {
        try {
            this.logger.info('🔄 Updating progress with data:', data);
            
            // Проверяем, нужно ли показывать прогресс
            if (uiConfig.show_progress === false) {
                this.hideProgress();
                return;
            }

            // Получаем элементы прогресс-бара
            this.getProgressElements();
            
            if (!this.progressElement) {
                this.logger.warn('Progress elements not found');
                return;
            }

            // Сохраняем данные для автоматического обновления
            this.currentEggData = data;
            
            // Принудительно останавливаем автоматическое обновление для мертвого состояния
            if (data.state === 'dead') {
                this.stopAutoProgressUpdate();
                this.logger.info('💀 Мертвое состояние, остановка автоматического обновления прогресса');
            }
            
            // Рассчитываем прогресс в зависимости от состояния
            const progressData = this.calculateProgress(data);
            
            // Обновляем отображение
            this.updateProgressDisplay(progressData, data.state);
            
            this.currentProgress = progressData.percent;
            this.currentState = data.state;
            
            // Запускаем или останавливаем автоматическое обновление
            this.handleAutoProgressUpdate(data);
            
            this.logger.info(`✅ Progress updated: ${progressData.percent}% (${progressData.type})`);
            
        } catch (error) {
            this.logger.error('❌ Error updating progress:', error);
        }
    }

    /**
     * Получение элементов прогресс-бара
     */
    getProgressElements() {
        this.progressElement = document.querySelector('.progress-container');
        this.fillElement = document.querySelector('.progress-fill');
        this.textElement = document.querySelector('.progress-text');
    }

    /**
     * Расчет прогресса в зависимости от состояния
     * @param {Object} data - Данные яйца
     * @returns {Object} Данные прогресса
     */
    calculateProgress(data) {
        switch (data.state) {
            case 'incubating':
                return this.calculateIncubationProgress(data);
            case 'hatching':
                return this.calculateHatchingProgress(data);
            case 'dead':
                return this.calculateDeadProgress(data);
            default:
                return this.calculateDefaultProgress(data);
        }
    }

    /**
     * Расчет прогресса инкубации (по времени)
     * @param {Object} data - Данные яйца
     * @returns {Object} Данные прогресса
     */
    calculateIncubationProgress(data) {
        // Проверяем доступность настроек
        let totalTime;
        if (typeof FINAL_INCUBATION_TIME_SECONDS === 'undefined') {
            this.logger.warn('FINAL_INCUBATION_TIME_SECONDS не доступен, используем значение по умолчанию');
            totalTime = 60; // 60 секунд для тестирования
        } else {
            totalTime = FINAL_INCUBATION_TIME_SECONDS;
        }
        
        const timeRemaining = data.time_remaining || 0;
        const elapsed = totalTime - timeRemaining;
        const percent = Math.max(0, Math.min(100, (elapsed / totalTime) * 100));
        
        this.logger.info(`📊 Прогресс инкубации: ${elapsed}/${totalTime} сек = ${Math.round(percent)}%`);
        
        return {
            percent: Math.round(percent),
            type: 'incubation',
            current: elapsed,
            total: totalTime,
            description: 'Прогресс инкубации'
        };
    }

    /**
     * Расчет прогресса вылупления (по кликам)
     * @param {Object} data - Данные яйца
     * @returns {Object} Данные прогресса
     */
    calculateHatchingProgress(data) {
        const currentClicks = data.hatching_clicks || 0;
        const requiredClicks = data.required_clicks || HATCHING_CLICKS_REQUIRED || 10;
        const percent = Math.max(0, Math.min(100, (currentClicks / requiredClicks) * 100));
        
        this.logger.info(`📊 Прогресс вылупления: ${currentClicks}/${requiredClicks} кликов = ${Math.round(percent)}%`);
        
        return {
            percent: Math.round(percent),
            type: 'hatching',
            current: currentClicks,
            total: requiredClicks,
            description: 'Прогресс вылупления'
        };
    }

    /**
     * Расчет прогресса для мертвого состояния
     * @param {Object} data - Данные яйца
     * @returns {Object} Данные прогресса
     */
    calculateDeadProgress(data) {
        return {
            percent: 0,
            type: 'dead',
            current: 0,
            total: 1,
            description: 'Игра окончена'
        };
    }

    /**
     * Расчет прогресса по умолчанию (если есть data.progress)
     * @param {Object} data - Данные яйца
     * @returns {Object} Данные прогресса
     */
    calculateDefaultProgress(data) {
        const percent = (data.progress || 0) * 100;
        
        return {
            percent: Math.round(percent),
            type: 'default',
            current: data.progress || 0,
            total: 1,
            description: 'Общий прогресс'
        };
    }

    /**
     * Обновление отображения прогресс-бара
     * @param {Object} progressData - Данные прогресса
     */
    updateProgressDisplay(progressData, state) {
        if (!this.fillElement || !this.textElement) {
            this.logger.warn('Progress elements not found for display update');
            return;
        }

        // Обновляем заполнение
        this.fillElement.style.width = `${progressData.percent}%`;
        
        // Получаем человекочитаемое название состояния
        const stateDisplayName = this.getStateDisplayName(state);

        // Находим или создаем элемент для отображения состояния
        let stateElement = this.progressElement.querySelector('.progress-state');
        if (!stateElement) {
            stateElement = document.createElement('span');
            stateElement.className = 'progress-state';
            this.progressElement.appendChild(stateElement);
        }
        
        // Обновляем текст состояния
        stateElement.textContent = stateDisplayName;
        
        // Обновляем текст процентов с состоянием
        this.textElement.textContent = `${progressData.percent}%`;
        
        // Добавляем aria-атрибуты для accessibility
        this.progressElement.setAttribute('role', 'progressbar');
        this.progressElement.setAttribute('aria-valuenow', progressData.percent);
        this.progressElement.setAttribute('aria-valuemin', '0');
        this.progressElement.setAttribute('aria-valuemax', '100');
        this.progressElement.setAttribute('aria-label', progressData.description);
        
        // Добавляем классы в зависимости от типа прогресса
        this.progressElement.className = `progress-container progress-${progressData.type}`;
        
        // Анимация при изменении прогресса
        this.animateProgressChange(progressData.percent);
    }

    /**
     * Анимация изменения прогресса
     * @param {number} newPercent - Новый процент
     */
    animateProgressChange(newPercent) {
        if (this.fillElement) {
            // Добавляем класс для анимации
            this.fillElement.classList.add('progress-updating');
            
            // Убираем класс через время анимации
            setTimeout(() => {
                if (this.fillElement) {
                    this.fillElement.classList.remove('progress-updating');
                }
            }, 300);
        }
    }

    /**
     * Скрытие прогресс-бара
     */
    hideProgress() {
        const progressContainer = document.querySelector('.progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    /**
     * Показ прогресс-бара
     */
    showProgress() {
        const progressContainer = document.querySelector('.progress-container');
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
    }

    /**
     * Получение текущего прогресса
     * @returns {number} Текущий прогресс в процентах
     */
    getCurrentProgress() {
        return this.currentProgress;
    }

    /**
     * Получение типа текущего прогресса
     * @returns {string} Тип прогресса
     */
    getCurrentProgressType() {
        return this.currentState;
    }

    /**
     * Проверка, завершен ли прогресс
     * @param {Object} data - Данные яйца
     * @returns {boolean} Завершен ли прогресс
     */
    isProgressComplete(data) {
        const progressData = this.calculateProgress(data);
        return progressData.percent >= 100;
    }

    /**
     * Получение информации о прогрессе
     * @param {Object} data - Данные яйца
     * @returns {Object} Информация о прогрессе
     */
    getProgressInfo(data) {
        const progressData = this.calculateProgress(data);
        
        return {
            percent: progressData.percent,
            type: progressData.type,
            current: progressData.current,
            total: progressData.total,
            description: progressData.description,
            isComplete: progressData.percent >= 100,
            remaining: progressData.total - progressData.current
        };
    }

    /**
     * Обработка автоматического обновления прогресса
     * @param {Object} data - Данные яйца
     */
    handleAutoProgressUpdate(data) {
        // Останавливаем автоматическое обновление для мертвого состояния
        if (data.state === 'dead') {
            this.stopAutoProgressUpdate();
            return;
        }
        
        if (data.state === 'incubating' && data.time_remaining > 0) {
            this.startAutoProgressUpdate(data);
        } else {
            this.stopAutoProgressUpdate();
        }
    }

    /**
     * Запуск автоматического обновления прогресса
     * @param {Object} data - Данные яйца
     */
    startAutoProgressUpdate(data) {
        this.stopAutoProgressUpdate(); // Останавливаем предыдущий интервал
        
        this.currentEggData = data;
        this.totalTime = FINAL_INCUBATION_TIME_SECONDS || 60;
        this.startTime = Date.now() - ((this.totalTime - data.time_remaining) * 1000);
        
        this.logger.info(`📊 Запуск автоматического обновления прогресса: ${this.totalTime} сек`);
        
        // Обновляем прогресс каждую секунду
        this.progressInterval = setInterval(() => {
            this.updateProgressInRealTime();
        }, 1000);
    }

    /**
     * Остановка автоматического обновления прогресса
     */
    stopAutoProgressUpdate() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
            this.logger.info('📊 Автоматическое обновление прогресса остановлено');
        }
    }

    /**
     * Обновление прогресса в реальном времени
     */
    updateProgressInRealTime() {
        if (!this.currentEggData || this.currentEggData.state !== 'incubating') {
            return;
        }
        
        // Дополнительная проверка на мертвое состояние
        if (this.currentEggData.state === 'dead') {
            this.stopAutoProgressUpdate();
            return;
        }

        const now = Date.now();
        const elapsed = (now - this.startTime) / 1000;
        const timeRemaining = Math.max(0, this.totalTime - elapsed);
        const percent = Math.max(0, Math.min(100, (elapsed / this.totalTime) * 100));

        // Обновляем данные
        this.currentEggData.time_remaining = timeRemaining;
        
        // Обновляем отображение
        this.updateProgressDisplay({
            percent: Math.round(percent),
            type: 'incubation',
            current: elapsed,
            total: this.totalTime,
            description: 'Прогресс инкубации'
        }, 'incubating');

        this.logger.info(`📊 Прогресс в реальном времени: ${Math.round(percent)}% (${timeRemaining.toFixed(1)} сек)`);

        // Если время истекло, останавливаем обновление
        if (timeRemaining <= 0) {
            this.stopAutoProgressUpdate();
        }
    }

    /**
     * Сброс состояния сервиса
     */
    reset() {
        this.currentProgress = 0;
        this.currentState = null;
        this.progressElement = null;
        this.fillElement = null;
        this.textElement = null;
        this.stopAutoProgressUpdate();
        this.currentEggData = null;
        this.startTime = null;
        this.totalTime = null;
        this.logger.info('ProgressService reset');
    }

    /**
     * Получение статистики сервиса
     * @returns {Object} Статистика
     */
    getStats() {
        return {
            currentProgress: this.currentProgress,
            currentState: this.currentState,
            hasElements: !!(this.progressElement && this.fillElement && this.textElement),
            autoUpdateActive: this.progressInterval !== null
        };
    }
}

// Создаем глобальный экземпляр сервиса
window.progressService = new ProgressService();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressService;
} 