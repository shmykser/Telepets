/**
 * Сервис уведомлений - централизованная система для отображения уведомлений
 * Содержит все тексты уведомлений и стандартизированные функции показа
 */

// Типы уведомлений
const NOTIFICATION_TYPES = {
    INFO: 'info',
    WARNING: 'warning', 
    CRITICAL: 'critical',
    SUCCESS: 'success',
    STATE_CHANGE: 'state_change'
};

// Централизованные тексты уведомлений
const NOTIFICATION_MESSAGES = {
    // Температурные уведомления
    TEMPERATURE: {
        CRITICAL_LOW: "⚠️ КРИТИЧЕСКИ НИЗКАЯ ТЕМПЕРАТУРА! Трите яйцо!",
        CRITICAL_HIGH: "⚠️ КРИТИЧЕСКИ ВЫСОКАЯ ТЕМПЕРАТУРА!",
        LOW_TEMP: "🌡️ Температура низкая. Трите яйцо для нагрева.",
        OVERHEAT_DEATH: "Яйцо погибло от перегрева!",
        FREEZE_DEATH: "Яйцо погибло от холода!"
    },
    
    // Состояния яйца
    STATES: {
        DEAD: "💀 Яйцо погибло от экстремальной температуры!",
        INCUBATING: "🥚 Поддерживайте температуру свайпами!",
        HATCHING: "🐣 Кликайте по яйцу для вылупления!",
        HATCHED: "🎉 Питомец вылупился!"
    },
    
    // Переходы состояний
    STATE_TRANSITIONS: {
        START_HATCHING: "🥚➡️🐣 Яйцо начинает вылупляться!",
        HATCHED: "🎉 Питомец вылупился!",
        DIED: "💀 Яйцо погибло...",
        RESET: "🔄 Яйцо сброшено. Начните заново!"
    },
    
    // Действия
    ACTIONS: {
        WARMING_SUCCESS: "🔥 Яйцо нагрето!",
        WARMING_FAILED: "❌ Не удалось нагреть яйцо.",
        CLICK_SUCCESS: "👆 Клик засчитан!",
        RESET_SUCCESS: "✅ Яйцо успешно сброшено!"
    },
    
    // Ошибки
    ERRORS: {
        EGG_NOT_FOUND: "❌ Яйцо не найдено",
        LOADING_ERROR: "❌ Ошибка загрузки",
        ALREADY_DEAD: "💀 Яйцо уже погибло.",
        NETWORK_ERROR: "🌐 Ошибка сети. Попробуйте позже."
    }
};

// Конфигурация стилей для разных типов уведомлений
const NOTIFICATION_STYLES = {
    [NOTIFICATION_TYPES.INFO]: {
        background: 'color-mix(in srgb, var(--color-primary) 30%, transparent)',
        borderColor: 'var(--color-primary)',
        textShadow: '1px 1px 2px var(--color-primary)'
    },
    [NOTIFICATION_TYPES.WARNING]: {
        background: 'color-mix(in srgb, var(--color-warning) 30%, transparent)',
        borderColor: 'var(--color-warning)',
        textShadow: '1px 1px 2px var(--color-warning)'
    },
    [NOTIFICATION_TYPES.CRITICAL]: {
        background: 'color-mix(in srgb, var(--color-error) 30%, transparent)',
        borderColor: 'var(--color-error)',
        textShadow: '1px 1px 2px var(--color-error)',
        animation: 'pulse 1s infinite'
    },
    [NOTIFICATION_TYPES.SUCCESS]: {
        background: 'color-mix(in srgb, var(--color-success) 30%, transparent)',
        borderColor: 'var(--color-success)',
        textShadow: '1px 1px 2px var(--color-success)'
    },
    [NOTIFICATION_TYPES.STATE_CHANGE]: {
        background: 'color-mix(in srgb, var(--color-accent) 30%, transparent)',
        borderColor: 'var(--color-accent)',
        textShadow: '1px 1px 2px var(--color-accent)'
    }
};

/**
 * Класс для управления уведомлениями
 */
class NotificationService {
    constructor() {
        this.activeNotifications = new Map();
        this.notificationQueue = [];
        this.isProcessing = false;
        this.initializeStyles();
    }

    /**
     * Инициализация CSS стилей для уведомлений
     */
    initializeStyles() {
        if (document.getElementById('notification-system-styles')) return;

        const style = document.createElement('style');
        style.id = 'notification-system-styles';
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1000;
                pointer-events: none;
                width: 90%;
                max-width: 400px;
            }

            .notification-item {
                background: rgba(255, 255, 255, 0.1);
                color: #ffffff;
                padding: 12px 16px;
                margin-bottom: 8px;
                border-radius: 8px;
                border: 2px solid;
                backdrop-filter: blur(10px);
                text-align: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                font-size: 14px;
                font-weight: 500;
                line-height: 1.2;
                min-height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                word-break: break-word;
                hyphens: auto;
                transition: all 0.3s ease;
            }

            .notification-item.long-text {
                font-size: 12px;
                line-height: 1.1;
                padding: 10px 14px;
            }

            .notification-item.very-long-text {
                font-size: 11px;
                line-height: 1.0;
                padding: 8px 12px;
            }

            .notification-enter {
                opacity: 0;
                transform: translateY(-20px);
            }

            .notification-enter-active {
                opacity: 1;
                transform: translateY(0);
                transition: all 0.3s ease;
            }

            .notification-exit {
                opacity: 1;
                transform: translateY(0);
            }

            .notification-exit-active {
                opacity: 0;
                transform: translateY(-20px);
                transition: all 0.3s ease;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }

            @media (max-width: 480px) {
                .notification-item {
                    font-size: 13px;
                    padding: 10px 12px;
                    min-height: 40px;
                }
                
                .notification-item.long-text {
                    font-size: 11px;
                    padding: 8px 10px;
                }
                
                .notification-item.very-long-text {
                    font-size: 10px;
                    padding: 6px 8px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Создание контейнера для уведомлений
     */
    createNotificationContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Показать уведомление
     * @param {string} message - Текст уведомления
     * @param {string} type - Тип уведомления
     * @param {number} duration - Длительность показа в миллисекундах
     * @param {Object} options - Дополнительные опции
     */
    show(message, type = NOTIFICATION_TYPES.INFO, duration = 4000, options = {}) {
        const notification = {
            id: Date.now() + Math.random(),
            message,
            type,
            duration,
            options
        };

        this.notificationQueue.push(notification);
        this.processQueue();
    }

    /**
     * Обработка очереди уведомлений
     */
    async processQueue() {
        if (this.isProcessing || this.notificationQueue.length === 0) return;

        this.isProcessing = true;
        const notification = this.notificationQueue.shift();
        
        await this.displayNotification(notification);
        
        this.isProcessing = false;
        
        // Обрабатываем следующее уведомление если есть
        if (this.notificationQueue.length > 0) {
            setTimeout(() => this.processQueue(), 100);
        }
    }

    /**
     * Отображение уведомления
     */
    async displayNotification(notification) {
        const container = this.createNotificationContainer();
        const element = document.createElement('div');
        
        element.className = 'notification-item notification-enter';
        element.innerHTML = notification.message;
        
        // Определяем размер текста
        const textLength = notification.message.length;
        if (textLength > 80) {
            element.classList.add('very-long-text');
        } else if (textLength > 50) {
            element.classList.add('long-text');
        }
        
        // Применяем стили в зависимости от типа
        const styles = NOTIFICATION_STYLES[notification.type];
        if (styles) {
            Object.entries(styles).forEach(([key, value]) => {
                if (key === 'animation') {
                    element.style.animation = value;
                } else {
                    element.style[key] = value;
                }
            });
        }
        
        container.appendChild(element);
        
        // Анимация появления
        requestAnimationFrame(() => {
            element.classList.remove('notification-enter');
            element.classList.add('notification-enter-active');
        });
        
        // Сохраняем в активных уведомлениях
        this.activeNotifications.set(notification.id, { element, notification });
        
        // Автоматическое скрытие
        setTimeout(() => {
            this.hide(notification.id);
        }, notification.duration);
    }

    /**
     * Скрыть уведомление
     */
    hide(notificationId) {
        const activeNotification = this.activeNotifications.get(notificationId);
        if (!activeNotification) return;

        const { element } = activeNotification;
        
        element.classList.remove('notification-enter-active');
        element.classList.add('notification-exit');
        
        requestAnimationFrame(() => {
            element.classList.add('notification-exit-active');
        });
        
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.activeNotifications.delete(notificationId);
        }, 300);
    }

    /**
     * Очистить все уведомления
     */
    clear() {
        this.activeNotifications.forEach((_, id) => this.hide(id));
        this.notificationQueue = [];
    }

    /**
     * Уведомления для состояний яйца
     */
    showStateNotification(state, additionalInfo = null) {
        let message = '';
        let type = NOTIFICATION_TYPES.INFO;

        switch (state) {
            case 'dead':
                message = NOTIFICATION_MESSAGES.STATES.DEAD;
                type = NOTIFICATION_TYPES.CRITICAL;
                break;
            case 'incubating':
                message = NOTIFICATION_MESSAGES.STATES.INCUBATING;
                type = NOTIFICATION_TYPES.INFO;
                break;
            case 'hatching':
                message = NOTIFICATION_MESSAGES.STATES.HATCHING;
                type = NOTIFICATION_TYPES.INFO;
                break;
            case 'hatched':
                message = NOTIFICATION_MESSAGES.STATES.HATCHED;
                type = NOTIFICATION_TYPES.SUCCESS;
                break;
        }

        if (additionalInfo) {
            message += ` ${additionalInfo}`;
        }

        this.show(message, type);
    }

    /**
     * Уведомления о температуре
     */
    showTemperatureNotification(temperature, criticalLow, criticalHigh) {
        let message = '';
        let type = NOTIFICATION_TYPES.INFO;

        if (temperature < criticalLow) {
            message = NOTIFICATION_MESSAGES.TEMPERATURE.CRITICAL_LOW;
            type = NOTIFICATION_TYPES.CRITICAL;
        } else if (temperature > criticalHigh) {
            message = NOTIFICATION_MESSAGES.TEMPERATURE.CRITICAL_HIGH;
            type = NOTIFICATION_TYPES.CRITICAL;
        } else if (temperature <= 30) {
            message = NOTIFICATION_MESSAGES.TEMPERATURE.LOW_TEMP;
            type = NOTIFICATION_TYPES.WARNING;
        }

        if (message) {
            this.show(message, type);
        }
    }

    /**
     * Уведомления о переходах состояний
     */
    showStateTransition(fromState, toState) {
        let message = '';
        let type = NOTIFICATION_TYPES.STATE_CHANGE;

        if (toState === 'hatching') {
            message = NOTIFICATION_MESSAGES.STATE_TRANSITIONS.START_HATCHING;
        } else if (toState === 'hatched') {
            message = NOTIFICATION_MESSAGES.STATE_TRANSITIONS.HATCHED;
            type = NOTIFICATION_TYPES.SUCCESS;
        } else if (toState === 'dead') {
            message = NOTIFICATION_MESSAGES.STATE_TRANSITIONS.DIED;
            type = NOTIFICATION_TYPES.CRITICAL;
        } else if (toState === 'incubating' && fromState === 'dead') {
            message = NOTIFICATION_MESSAGES.STATE_TRANSITIONS.RESET;
            type = NOTIFICATION_TYPES.SUCCESS;
        }

        if (message) {
            this.show(message, type, 5000); // Показываем дольше для важных переходов
        }
    }

    /**
     * Уведомления об действиях
     */
    showActionNotification(action, success = true) {
        let message = '';
        let type = success ? NOTIFICATION_TYPES.SUCCESS : NOTIFICATION_TYPES.WARNING;

        switch (action) {
            case 'warm':
                message = success ? 
                    NOTIFICATION_MESSAGES.ACTIONS.WARMING_SUCCESS : 
                    NOTIFICATION_MESSAGES.ACTIONS.WARMING_FAILED;
                break;
            case 'click':
                message = NOTIFICATION_MESSAGES.ACTIONS.CLICK_SUCCESS;
                break;
            case 'reset':
                message = NOTIFICATION_MESSAGES.ACTIONS.RESET_SUCCESS;
                break;
        }

        if (message) {
            this.show(message, type, 2000); // Короткие уведомления для действий
        }
    }

    /**
     * Уведомления об ошибках
     */
    showErrorNotification(error) {
        let message = '';
        
        switch (error) {
            case 'not_found':
                message = NOTIFICATION_MESSAGES.ERRORS.EGG_NOT_FOUND;
                break;
            case 'loading':
                message = NOTIFICATION_MESSAGES.ERRORS.LOADING_ERROR;
                break;
            case 'already_dead':
                message = NOTIFICATION_MESSAGES.ERRORS.ALREADY_DEAD;
                break;
            case 'network':
                message = NOTIFICATION_MESSAGES.ERRORS.NETWORK_ERROR;
                break;
            default:
                message = typeof error === 'string' ? error : 'Неизвестная ошибка';
        }

        this.show(message, NOTIFICATION_TYPES.CRITICAL, 5000);
    }
}

// Создаем глобальный экземпляр сервиса
const notificationService = new NotificationService();

// Экспортируем в глобальную область для обратной совместимости
window.notificationService = notificationService;
window.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
window.NOTIFICATION_MESSAGES = NOTIFICATION_MESSAGES; 