/**
 * Modern Logger utility with different log levels
 * Supports structured logging and performance tracking
 */

export class Logger {
    static LOG_LEVELS = {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3
    };

    constructor(context, level = Logger.LOG_LEVELS.INFO) {
        this.context = context;
        this.level = level;
        this.startTime = performance.now();
    }

    /**
     * Log error message
     * @param {string} message - Error message
     * @param {Error|Object} error - Error object or additional data
     */
    error(message, error = null) {
        if (this.level >= Logger.LOG_LEVELS.ERROR) {
            const logData = this.formatMessage('ERROR', message, error);
            console.error(`%c[${logData.timestamp}] ${logData.level} [${logData.context}]:`, 
                'color: #ff4444; font-weight: bold;', logData.message, logData.data);
        }
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {Object} data - Additional data
     */
    warn(message, data = null) {
        if (this.level >= Logger.LOG_LEVELS.WARN) {
            const logData = this.formatMessage('WARN', message, data);
            console.warn(`%c[${logData.timestamp}] ${logData.level} [${logData.context}]:`, 
                'color: #ff8800; font-weight: bold;', logData.message, logData.data);
        }
    }

    /**
     * Log info message
     * @param {string} message - Info message
     * @param {Object} data - Additional data
     */
    info(message, data = null) {
        if (this.level >= Logger.LOG_LEVELS.INFO) {
            const logData = this.formatMessage('INFO', message, data);
            console.log(`%c[${logData.timestamp}] ${logData.level} [${logData.context}]:`, 
                'color: #0088ff; font-weight: bold;', logData.message, logData.data);
        }
    }

    /**
     * Log debug message
     * @param {string} message - Debug message
     * @param {Object} data - Additional data
     */
    debug(message, data = null) {
        if (this.level >= Logger.LOG_LEVELS.DEBUG) {
            const logData = this.formatMessage('DEBUG', message, data);
            console.log(`%c[${logData.timestamp}] ${logData.level} [${logData.context}]:`, 
                'color: #888888;', logData.message, logData.data);
        }
    }

    /**
     * Time a function execution
     * @param {string} label - Timer label
     * @param {Function} fn - Function to time
     * @returns {*} Function result
     */
    async time(label, fn) {
        const start = performance.now();
        this.debug(`Starting ${label}...`);
        
        try {
            const result = await fn();
            const duration = performance.now() - start;
            this.info(`${label} completed in ${duration.toFixed(2)}ms`);
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.error(`${label} failed after ${duration.toFixed(2)}ms`, error);
            throw error;
        }
    }

    /**
     * Format log message with timestamp and context
     * @param {string} level - Log level
     * @param {string} message - Message
     * @param {*} data - Additional data
     * @returns {Object} Formatted log data
     */
    formatMessage(level, message, data) {
        return {
            timestamp: new Date().toISOString(),
            level,
            context: this.context,
            message,
            data: data || undefined,
            uptime: `${(performance.now() - this.startTime).toFixed(2)}ms`
        };
    }

    /**
     * Create a child logger with extended context
     * @param {string} childContext - Additional context
     * @returns {Logger} Child logger
     */
    child(childContext) {
        return new Logger(`${this.context}:${childContext}`, this.level);
    }

    /**
     * Set log level
     * @param {number} level - Log level
     */
    setLevel(level) {
        this.level = level;
    }

    /**
     * Group related log messages
     * @param {string} label - Group label
     * @param {Function} fn - Function to execute in group
     */
    async group(label, fn) {
        console.group(`%c${label}`, 'color: #0088ff; font-weight: bold;');
        try {
            return await fn();
        } finally {
            console.groupEnd();
        }
    }
} 