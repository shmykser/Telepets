/**
 * Универсальный обработчик кликов для Telegram WebApp
 * Поддерживает различные элементы и конфигурации
 */

class ClickHandler {
    constructor() {
        this.handlers = new Map(); // Регистр обработчиков для разных элементов
        this.activeHandlers = new Set(); // Активные обработчики
        this.defaultConfig = {
            debounceTime: 300, // Защита от двойных кликов
            longPressTime: 500, // Время для длительного нажатия
            enableHaptic: true, // Вибрация на мобильных
            enableAnimation: true, // Анимация клика
            enableSound: false, // Звук клика
            preventDefault: true // Предотвращение стандартного поведения
        };
    }

    /**
     * Регистрация обработчика кликов для элемента
     * @param {string} elementId - ID элемента
     * @param {Object} config - Конфигурация
     * @param {Function} onClick - Callback при клике
     * @param {Function} onLongPress - Callback при длительном нажатии
     * @param {Function} onDoubleClick - Callback при двойном клике
     */
    register(elementId, config = {}, onClick = null, onLongPress = null, onDoubleClick = null) {
        const handler = {
            elementId,
            config: { ...this.defaultConfig, ...config },
            onClick,
            onLongPress,
            onDoubleClick,
            clickCount: 0,
            isPressed: false,
            pressStartTime: 0,
            lastClickTime: 0,
            longPressTimer: null,
            debounceTimer: null,
            doubleClickTimer: null
        };

        this.handlers.set(elementId, handler);
        this.setupElementHandlers(handler);
        
        console.log(`[ClickHandler] Зарегистрирован обработчик для ${elementId}`);
        return handler;
    }

    /**
     * Настройка обработчиков событий для элемента
     * @param {Object} handler - Обработчик
     */
    setupElementHandlers(handler) {
        const element = document.getElementById(handler.elementId);
        if (!element) {
            console.warn(`[ClickHandler] Элемент ${handler.elementId} не найден`);
            return;
        }

        // Touch события (мобильные устройства)
        element.addEventListener('touchstart', (e) => this.handleTouchStart(e, handler), false);
        element.addEventListener('touchend', (e) => this.handleTouchEnd(e, handler), false);
        element.addEventListener('touchcancel', (e) => this.handleTouchCancel(e, handler), false);

        // Mouse события (десктоп)
        element.addEventListener('mousedown', (e) => this.handleMouseDown(e, handler), false);
        element.addEventListener('mouseup', (e) => this.handleMouseUp(e, handler), false);
        element.addEventListener('mouseleave', (e) => this.handleMouseLeave(e, handler), false);

        this.activeHandlers.add(handler);
    }

    /**
     * Обработка начала касания
     * @param {Event} e - Событие
     * @param {Object} handler - Обработчик
     */
    handleTouchStart(e, handler) {
        if (this.shouldSkipClick(handler)) return;
        
        if (handler.config.preventDefault) {
            e.preventDefault();
        }
        
        handler.isPressed = true;
        handler.pressStartTime = Date.now();
        
        // Запускаем таймер длительного нажатия
        if (handler.onLongPress) {
            handler.longPressTimer = setTimeout(() => {
                this.handleLongPress(handler);
            }, handler.config.longPressTime);
        }
    }

    /**
     * Обработка окончания касания
     * @param {Event} e - Событие
     * @param {Object} handler - Обработчик
     */
    handleTouchEnd(e, handler) {
        if (!handler.isPressed) return;
        
        if (handler.config.preventDefault) {
            e.preventDefault();
        }
        
        const pressDuration = Date.now() - handler.pressStartTime;
        handler.isPressed = false;
        
        // Отменяем таймер длительного нажатия
        if (handler.longPressTimer) {
            clearTimeout(handler.longPressTimer);
            handler.longPressTimer = null;
        }
        
        // Если нажатие было коротким, обрабатываем как клик
        if (pressDuration < handler.config.longPressTime) {
            this.handleClick(handler);
        }
    }

    /**
     * Обработка отмены касания
     * @param {Event} e - Событие
     * @param {Object} handler - Обработчик
     */
    handleTouchCancel(e, handler) {
        handler.isPressed = false;
        if (handler.longPressTimer) {
            clearTimeout(handler.longPressTimer);
            handler.longPressTimer = null;
        }
    }

    /**
     * Обработка нажатия мыши
     * @param {Event} e - Событие
     * @param {Object} handler - Обработчик
     */
    handleMouseDown(e, handler) {
        if (this.shouldSkipClick(handler)) return;
        
        if (handler.config.preventDefault) {
            e.preventDefault();
        }
        
        handler.isPressed = true;
        handler.pressStartTime = Date.now();
        
        // Запускаем таймер длительного нажатия
        if (handler.onLongPress) {
            handler.longPressTimer = setTimeout(() => {
                this.handleLongPress(handler);
            }, handler.config.longPressTime);
        }
    }

    /**
     * Обработка отпускания мыши
     * @param {Event} e - Событие
     * @param {Object} handler - Обработчик
     */
    handleMouseUp(e, handler) {
        if (!handler.isPressed) return;
        
        if (handler.config.preventDefault) {
            e.preventDefault();
        }
        
        const pressDuration = Date.now() - handler.pressStartTime;
        handler.isPressed = false;
        
        // Отменяем таймер длительного нажатия
        if (handler.longPressTimer) {
            clearTimeout(handler.longPressTimer);
            handler.longPressTimer = null;
        }
        
        // Если нажатие было коротким, обрабатываем как клик
        if (pressDuration < handler.config.longPressTime) {
            this.handleClick(handler);
        }
    }

    /**
     * Обработка ухода мыши с элемента
     * @param {Event} e - Событие
     * @param {Object} handler - Обработчик
     */
    handleMouseLeave(e, handler) {
        handler.isPressed = false;
        if (handler.longPressTimer) {
            clearTimeout(handler.longPressTimer);
            handler.longPressTimer = null;
        }
    }

    /**
     * Обработка клика
     * @param {Object} handler - Обработчик
     */
    handleClick(handler) {
        const now = Date.now();
        
        // Проверяем дебаунс
        if (now - handler.lastClickTime < handler.config.debounceTime) {
            return;
        }
        
        handler.clickCount++;
        handler.lastClickTime = now;
        
        // Анимация клика
        if (handler.config.enableAnimation) {
            this.playClickAnimation(handler);
        }
        
        // Вибрация
        if (handler.config.enableHaptic && navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // Звук клика
        if (handler.config.enableSound) {
            this.playClickSound();
        }
        
        // Обработка двойного клика
        if (handler.onDoubleClick) {
            if (handler.doubleClickTimer) {
                clearTimeout(handler.doubleClickTimer);
                handler.doubleClickTimer = null;
                this.handleDoubleClick(handler);
                return;
            } else {
                handler.doubleClickTimer = setTimeout(() => {
                    handler.doubleClickTimer = null;
                    this.handleSingleClick(handler);
                }, 300);
                return;
            }
        }
        
        // Обычный клик
        this.handleSingleClick(handler);
    }

    /**
     * Обработка одинарного клика
     * @param {Object} handler - Обработчик
     */
    handleSingleClick(handler) {
        if (handler.onClick) {
            handler.onClick(handler.clickCount, handler);
        }
    }

    /**
     * Обработка двойного клика
     * @param {Object} handler - Обработчик
     */
    handleDoubleClick(handler) {
        if (handler.onDoubleClick) {
            handler.onDoubleClick(handler.clickCount, handler);
        }
    }

    /**
     * Обработка длительного нажатия
     * @param {Object} handler - Обработчик
     */
    handleLongPress(handler) {
        handler.isPressed = false;
        
        // Вибрация для длительного нажатия
        if (handler.config.enableHaptic && navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
        
        if (handler.onLongPress) {
            handler.onLongPress(handler.clickCount, handler);
        }
    }

    /**
     * Проверка, нужно ли пропустить клик
     * @param {Object} handler - Обработчик
     * @returns {boolean}
     */
    shouldSkipClick(handler) {
        // Проверка состояния яйца (для обратной совместимости)
        if (handler.elementId === 'egg' && window.currentEggData && 
            window.currentEggData.state === 'dead') {
            return true;
        }
        
        // Проверка на отключенные элементы
        const element = document.getElementById(handler.elementId);
        if (element && element.disabled) {
            return true;
        }
        
        // Дополнительные проверки можно добавить здесь
        return false;
    }

    /**
     * Воспроизведение анимации клика
     * @param {Object} handler - Обработчик
     */
    playClickAnimation(handler) {
        const element = document.getElementById(handler.elementId);
        if (!element) return;
        
        element.classList.add('clicked');
        setTimeout(() => {
            element.classList.remove('clicked');
        }, 200);
    }

    /**
     * Воспроизведение звука клика
     */
    playClickSound() {
        // Можно добавить Web Audio API для звуков
        console.log('[ClickHandler] Звук клика');
    }

    /**
     * Обработка клика
     * @param {Object} handler - Обработчик
     */
    handleClick(handler) {
        const now = Date.now();
        
        // Проверяем дебаунс
        if (now - handler.lastClickTime < handler.config.debounceTime) {
            return;
        }
        
        handler.clickCount++;
        handler.lastClickTime = now;
        
        // Анимация клика
        if (handler.config.enableAnimation) {
            this.playClickAnimation(handler);
        }
        
        // Вибрация
        if (handler.config.enableHaptic && navigator.vibrate) {
            navigator.vibrate(50);
        }
        
        // Звук клика
        if (handler.config.enableSound) {
            this.playClickSound();
        }
        
        // Обработка двойного клика
        if (handler.onDoubleClick) {
            if (handler.doubleClickTimer) {
                clearTimeout(handler.doubleClickTimer);
                handler.doubleClickTimer = null;
                this.handleDoubleClick(handler);
                return;
            } else {
                handler.doubleClickTimer = setTimeout(() => {
                    handler.doubleClickTimer = null;
                    this.handleSingleClick(handler);
                }, 300);
                return;
            }
        }
        
        // Обычный клик
        this.handleSingleClick(handler);
    }

    /**
     * Обработка одинарного клика
     * @param {Object} handler - Обработчик
     */
    handleSingleClick(handler) {
        if (handler.onClick) {
            handler.onClick(handler.clickCount, handler);
        }
    }

    /**
     * Обработка двойного клика
     * @param {Object} handler - Обработчик
     */
    handleDoubleClick(handler) {
        if (handler.onDoubleClick) {
            handler.onDoubleClick(handler.clickCount, handler);
        }
    }

    /**
     * Обработка длительного нажатия
     * @param {Object} handler - Обработчик
     */
    handleLongPress(handler) {
        handler.isPressed = false;
        
        // Вибрация для длительного нажатия
        if (handler.config.enableHaptic && navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
        
        if (handler.onLongPress) {
            handler.onLongPress(handler.clickCount, handler);
        }
    }

    /**
     * Проверка, нужно ли пропустить клик
     * @param {Object} handler - Обработчик
     * @returns {boolean}
     */
    shouldSkipClick(handler) {
        // Проверка состояния яйца (для обратной совместимости)
        if (handler.elementId === 'egg' && window.currentEggData && 
            window.currentEggData.state === 'dead') {
            return true;
        }
        
        // Проверка на отключенные элементы
        const element = document.getElementById(handler.elementId);
        if (element && element.disabled) {
            return true;
        }
        
        // Дополнительные проверки можно добавить здесь
        return false;
    }

    /**
     * Воспроизведение анимации клика
     * @param {Object} handler - Обработчик
     */
    playClickAnimation(handler) {
        const element = document.getElementById(handler.elementId);
        if (!element) return;
        
        element.classList.add('clicked');
        setTimeout(() => {
            element.classList.remove('clicked');
        }, 200);
    }

    /**
     * Воспроизведение звука клика
     */
    playClickSound() {
        // Можно добавить Web Audio API для звуков
        console.log('[ClickHandler] Звук клика');
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
            console.log(`[ClickHandler] Удален обработчик для ${elementId}`);
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
window.clickHandler = new ClickHandler();

// Функция для обратной совместимости с яйцом
function setupClickHandlers() {
    // Регистрируем обработчик для яйца
    window.clickHandler.register('egg', {
        enableHaptic: true,
        enableAnimation: true,
        debounceTime: 500
    }, 
    // onClick callback
    (clickCount, handler) => {
        console.log(`[ClickHandler] Клик по яйцу: ${clickCount}`);
        // Можно добавить логику для кликов по яйцу
    },
    // onLongPress callback
    (clickCount, handler) => {
        console.log(`[ClickHandler] Длительное нажатие на яйцо`);
        // Специальные действия при длительном нажатии
    });
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClickHandler;
}

// Примеры использования для разных элементов:

/**
 * Пример: Клик для открытия меню
 */
function setupMenuClick() {
    window.clickHandler.register('menu-button', {
        enableHaptic: true,
        enableAnimation: true,
        debounceTime: 200
    }, 
    (clickCount, handler) => {
        console.log(`[Menu] Открываем меню`);
        document.getElementById('menu').classList.toggle('open');
    });
}

/**
 * Пример: Клик для кнопки действия
 */
function setupActionButtonClick() {
    window.clickHandler.register('action-button', {
        enableHaptic: true,
        enableAnimation: true,
        debounceTime: 1000 // Длительный дебаунс для действий
    }, 
    (clickCount, handler) => {
        console.log(`[Action] Выполняем действие`);
        performAction();
    });
}

/**
 * Пример: Двойной клик для сброса
 */
function setupResetDoubleClick() {
    window.clickHandler.register('reset-button', {
        enableHaptic: true,
        enableAnimation: true
    }, 
    null, // onClick
    null, // onLongPress
    (clickCount, handler) => { // onDoubleClick
        console.log(`[Reset] Двойной клик - сброс!`);
        resetGame();
    });
}

/**
 * Пример: Длительное нажатие для контекстного меню
 */
function setupContextMenuLongPress() {
    window.clickHandler.register('context-area', {
        enableHaptic: true,
        longPressTime: 800
    }, 
    (clickCount, handler) => {
        console.log(`[Context] Обычный клик`);
        // Обычное действие
    },
    (clickCount, handler) => { // onLongPress
        console.log(`[Context] Длительное нажатие - контекстное меню`);
        showContextMenu();
    });
}

/**
 * Пример: Клик для переключения режимов
 */
function setupModeToggleClick() {
    window.clickHandler.register('mode-toggle', {
        enableHaptic: true,
        enableAnimation: true,
        debounceTime: 300
    }, 
    (clickCount, handler) => {
        console.log(`[Mode] Переключаем режим`);
        toggleGameMode();
    });
}

// Вспомогательные функции для примеров
function performAction() {
    console.log('Выполняем действие...');
    // Логика выполнения действия
}

function resetGame() {
    console.log('Сброс игры...');
    // Логика сброса
}

function showContextMenu() {
    console.log('Показываем контекстное меню...');
    // Логика контекстного меню
}

function toggleGameMode() {
    console.log('Переключаем режим игры...');
    // Логика переключения режима
} 