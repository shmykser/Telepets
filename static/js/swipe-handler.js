/**
 * Универсальный обработчик свайпов для Telegram WebApp
 * Поддерживает различные элементы и конфигурации
 */

class SwipeHandler {
    constructor() {
        this.handlers = new Map(); // Регистр обработчиков для разных элементов
        this.activeHandlers = new Set(); // Активные обработчики
        this.defaultConfig = {
            threshold: 150, // SWIPE_THRESHOLD_PIXELS || 150,
            decayTime: 400, // PROGRESS_DECAY_TIME || 400,
            animationDuration: 300, // RUBBING_ANIMATION_DURATION || 300,
            enableProgress: true,
            enableDecay: true,
            enableAnimation: true
        };
    }

    /**
     * Регистрация обработчика свайпов для элемента
     * @param {string} elementId - ID элемента
     * @param {Object} config - Конфигурация
     * @param {Function} onSwipe - Callback при свайпе
     * @param {Function} onComplete - Callback при завершении
     */
    register(elementId, config = {}, onSwipe = null, onComplete = null) {
        const handler = {
            elementId,
            config: { ...this.defaultConfig, ...config },
            onSwipe,
            onComplete,
            swipeCount: 0,
            isSwiping: false,
            startX: 0,
            startY: 0,
            totalDistance: 0,
            lastX: 0,
            lastY: 0,
            progressDecayTimer: null
        };

        this.handlers.set(elementId, handler);
        this.setupElementHandlers(handler);
        
        console.log(`[SwipeHandler] Зарегистрирован обработчик для ${elementId}`);
        return handler;
    }

    /**
     * Настройка обработчиков событий для элемента
     * @param {Object} handler - Обработчик
     */
    setupElementHandlers(handler) {
        const element = document.getElementById(handler.elementId);
        if (!element) {
            console.warn(`[SwipeHandler] Элемент ${handler.elementId} не найден`);
            return;
        }

        // Touch события (мобильные устройства)
        element.addEventListener('touchstart', (e) => this.handleTouchStart(e, handler), false);
        element.addEventListener('touchmove', (e) => this.handleTouchMove(e, handler), false);
        element.addEventListener('touchend', (e) => this.handleTouchEnd(e, handler), false);

        // Mouse события (десктоп)
        element.addEventListener('mousedown', (e) => this.handleMouseDown(e, handler), false);
        element.addEventListener('mousemove', (e) => this.handleMouseMove(e, handler), false);
        element.addEventListener('mouseup', (e) => this.handleMouseUp(e, handler), false);

        this.activeHandlers.add(handler);
    }

    /**
     * Обработка начала касания
     * @param {Event} e - Событие
     * @param {Object} handler - Обработчик
     */
    handleTouchStart(e, handler) {
        if (this.shouldSkipSwipe(handler)) return;
        
    e.preventDefault();
    const touch = e.touches[0];
        handler.startX = touch.clientX;
        handler.startY = touch.clientY;
        handler.lastX = handler.startX;
        handler.lastY = handler.startY;
        handler.totalDistance = 0;
        handler.isSwiping = true;
        this.resetProgressDecayTimer(handler);
    }

    /**
     * Обработка движения пальца
     * @param {Event} e - Событие
     * @param {Object} handler - Обработчик
     */
    handleTouchMove(e, handler) {
        if (!handler.isSwiping || this.shouldSkipSwipe(handler)) return;
        
    e.preventDefault();
    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    
        this.processMovement(currentX, currentY, handler);
    }

    /**
     * Обработка окончания касания
     * @param {Event} e - Событие
     * @param {Object} handler - Обработчик
     */
    handleTouchEnd(e, handler) {
        handler.isSwiping = false;
        handler.totalDistance = 0;
        this.startProgressDecayTimer(handler);
    }

    /**
     * Обработка нажатия мыши
     * @param {Event} e - Событие
     * @param {Object} handler - Обработчик
     */
    handleMouseDown(e, handler) {
        if (this.shouldSkipSwipe(handler)) return;
        
        e.preventDefault();
        handler.startX = e.clientX;
        handler.startY = e.clientY;
        handler.lastX = handler.startX;
        handler.lastY = handler.startY;
        handler.totalDistance = 0;
        handler.isSwiping = true;
        this.resetProgressDecayTimer(handler);
    }

    /**
     * Обработка движения мыши
     * @param {Event} e - Событие
     * @param {Object} handler - Обработчик
     */
    handleMouseMove(e, handler) {
        if (!handler.isSwiping || this.shouldSkipSwipe(handler)) return;
        
        e.preventDefault();
        this.processMovement(e.clientX, e.clientY, handler);
    }

    /**
     * Обработка отпускания мыши
     * @param {Event} e - Событие
     * @param {Object} handler - Обработчик
     */
    handleMouseUp(e, handler) {
        handler.isSwiping = false;
        handler.totalDistance = 0;
        this.startProgressDecayTimer(handler);
    }

    /**
     * Обработка движения
     * @param {number} currentX - Текущая X координата
     * @param {number} currentY - Текущая Y координата
     * @param {Object} handler - Обработчик
     */
    processMovement(currentX, currentY, handler) {
        const deltaX = Math.abs(currentX - handler.lastX);
        const deltaY = Math.abs(currentY - handler.lastY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
        handler.totalDistance += distance;
        handler.lastX = currentX;
        handler.lastY = currentY;
        
        if (handler.totalDistance >= handler.config.threshold) {
            this.handleSwipe(handler);
            handler.totalDistance = 0;
        }
        
        this.resetProgressDecayTimer(handler);
    }

    /**
     * Обработка свайпа
     * @param {Object} handler - Обработчик
     */
    handleSwipe(handler) {
        handler.swipeCount++;
        
        // Обновляем прогресс если включен
        if (handler.config.enableProgress) {
            this.updateSwipeProgress(handler);
        }
        
        // Анимация если включена
        if (handler.config.enableAnimation) {
            this.playSwipeAnimation(handler);
        }
        
        // Вызываем callback
        if (handler.onSwipe) {
            handler.onSwipe(handler.swipeCount, handler);
        }
        
        // Проверяем завершение
        if (handler.onComplete && handler.config.completeThreshold && 
            handler.swipeCount >= handler.config.completeThreshold) {
            handler.onComplete(handler.swipeCount, handler);
            handler.swipeCount = 0;
            this.updateSwipeProgress(handler);
        }
    }

    /**
     * Проверка, нужно ли пропустить свайп
     * @param {Object} handler - Обработчик
     * @returns {boolean}
     */
    shouldSkipSwipe(handler) {
        // Проверка состояния яйца (для обратной совместимости)
        if (handler.elementId === 'egg' && window.currentEggData && 
            window.currentEggData.state === 'dead') {
            return true;
        }
        
        // Дополнительные проверки можно добавить здесь
        return false;
    }

    /**
     * Обновление прогресс-бара
     * @param {Object} handler - Обработчик
     */
    updateSwipeProgress(handler) {
        const element = document.getElementById(handler.elementId);
        if (!element) return;
        
        const progressElement = element.querySelector('.swipe-progress');
        const fillElement = element.querySelector('.swipe-fill');
        
        if (progressElement && fillElement && handler.config.completeThreshold) {
            const progressPercent = (handler.swipeCount / handler.config.completeThreshold) * 100;
            fillElement.style.width = `${progressPercent}%`;
        }
    }

    /**
     * Воспроизведение анимации свайпа
     * @param {Object} handler - Обработчик
     */
    playSwipeAnimation(handler) {
        const element = document.getElementById(handler.elementId);
        if (!element) return;
        
        element.classList.add('rubbing');
        setTimeout(() => {
            element.classList.remove('rubbing');
        }, handler.config.animationDuration);
    }

    /**
     * Сброс таймера затухания прогресса
     * @param {Object} handler - Обработчик
     */
    resetProgressDecayTimer(handler) {
        if (handler.progressDecayTimer) {
            clearTimeout(handler.progressDecayTimer);
            handler.progressDecayTimer = null;
        }
    }

    /**
     * Запуск таймера затухания прогресса
     * @param {Object} handler - Обработчик
     */
    startProgressDecayTimer(handler) {
        if (!handler.config.enableDecay) return;
        
        this.resetProgressDecayTimer(handler);
        handler.progressDecayTimer = setTimeout(() => {
            if (handler.swipeCount > 0) {
                handler.swipeCount = Math.max(0, handler.swipeCount - 1);
                this.updateSwipeProgress(handler);
                
                if (handler.swipeCount > 0) {
                    this.startProgressDecayTimer(handler);
                }
            }
        }, handler.config.decayTime);
    }

    /**
     * Удаление обработчика
     * @param {string} elementId - ID элемента
     */
    unregister(elementId) {
        const handler = this.handlers.get(elementId);
        if (handler) {
            this.activeHandlers.delete(handler);
            this.handlers.delete(elementId);
            console.log(`[SwipeHandler] Удален обработчик для ${elementId}`);
        }
    }

    /**
     * Получение статистики
     * @returns {Object}
     */
    getStats() {
        return {
            totalHandlers: this.handlers.size,
            activeHandlers: this.activeHandlers.size,
            handlers: Array.from(this.handlers.keys())
        };
    }
}

// Создаем глобальный экземпляр
window.swipeHandler = new SwipeHandler();

// Функция для обратной совместимости с яйцом
function setupSwipeHandlers() {
    // Регистрируем обработчик для яйца с игровой логикой
    window.swipeHandler.register('egg', {
        completeThreshold: SWIPES_PER_DEGREE,
        enableProgress: true,
        enableDecay: true,
        enableAnimation: true
    }, 
    // onSwipe callback
    (swipeCount, handler) => {
        console.log(`[SwipeHandler] Свайп по яйцу: ${swipeCount}`);
    },
    // onComplete callback
    (swipeCount, handler) => {
        console.log(`[SwipeHandler] Завершен нагрев яйца: ${swipeCount} свайпов`);
        // Используем TemperatureService для нагрева
        if (window.temperatureService && window.currentEggData && window.userId) {
            window.temperatureService.showTempIncrease();
            window.temperatureService.warmEgg(window.userId, window.currentEggData);
        }
    });
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SwipeHandler;
}

// Примеры использования для разных элементов:

/**
 * Пример: Свайп для открытия меню
 */
function setupMenuSwipe() {
    window.swipeHandler.register('menu-trigger', {
        threshold: 100,
        completeThreshold: 3,
        enableProgress: false,
        enableDecay: false,
        enableAnimation: true
    }, 
    (swipeCount, handler) => {
        console.log(`[Menu] Свайп ${swipeCount} для открытия меню`);
    },
    (swipeCount, handler) => {
        console.log(`[Menu] Открываем меню после ${swipeCount} свайпов`);
        // Логика открытия меню
        document.getElementById('menu').classList.add('open');
    });
}

/**
 * Пример: Свайп для переключения страниц
 */
function setupPageSwipe() {
    window.swipeHandler.register('page-container', {
        threshold: 200,
        completeThreshold: 1,
        enableProgress: true,
        enableDecay: true,
        enableAnimation: true
    }, 
    (swipeCount, handler) => {
        console.log(`[Page] Свайп ${swipeCount} для переключения`);
    },
    (swipeCount, handler) => {
        console.log(`[Page] Переключаем страницу`);
        // Логика переключения страниц
        switchPage();
    });
}

/**
 * Пример: Свайп для активации способности
 */
function setupAbilitySwipe() {
    window.swipeHandler.register('ability-button', {
        threshold: 150,
        completeThreshold: 5,
        enableProgress: true,
        enableDecay: true,
        enableAnimation: true
    }, 
    (swipeCount, handler) => {
        console.log(`[Ability] Зарядка способности: ${swipeCount}/5`);
        // Обновляем визуальный индикатор
        updateAbilityProgress(swipeCount);
    },
    (swipeCount, handler) => {
        console.log(`[Ability] Активируем способность!`);
        // Активация способности
        activateAbility();
    });
}

/**
 * Пример: Свайп для мини-игры
 */
function setupMinigameSwipe() {
    window.swipeHandler.register('minigame-area', {
        threshold: 50,
        completeThreshold: 10,
        enableProgress: true,
        enableDecay: false, // Не затухает в мини-игре
        enableAnimation: true
    }, 
    (swipeCount, handler) => {
        console.log(`[Minigame] Прогресс: ${swipeCount}/10`);
        // Обновляем счет в мини-игре
        updateMinigameScore(swipeCount);
    },
    (swipeCount, handler) => {
        console.log(`[Minigame] Завершено!`);
        // Завершение мини-игры
        completeMinigame();
    });
}

// Вспомогательные функции для примеров
function switchPage() {
    console.log('Переключение страницы...');
}

function updateAbilityProgress(count) {
    const progress = document.querySelector('.ability-progress');
    if (progress) {
        progress.style.width = `${(count / 5) * 100}%`;
    }
}

function activateAbility() {
    console.log('Способность активирована!');
    // Анимация активации
    document.querySelector('.ability-button').classList.add('activated');
}

function updateMinigameScore(count) {
    const scoreElement = document.querySelector('.minigame-score');
    if (scoreElement) {
        scoreElement.textContent = count;
    }
}

function completeMinigame() {
    console.log('Мини-игра завершена!');
    // Показываем результат
    showMinigameResult();
}

function showMinigameResult() {
    console.log('Показываем результат мини-игры');
} 