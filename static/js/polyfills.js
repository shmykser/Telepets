/**
 * Minimal Polyfills for Telepets WebApp
 * Only essential polyfills for very old devices
 */

// Console polyfill for very old browsers (Android 4.0 and below)
if (!window.console) {
    window.console = {
        log: function() {},
        error: function() {},
        warn: function() {},
        info: function() {}
    };
}

// Basic Object.assign polyfill for IE/old Android
if (!Object.assign) {
    Object.assign = function(target, ...sources) {
        if (target == null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }
        
        const to = Object(target);
        
        for (let index = 0; index < sources.length; index++) {
            const nextSource = sources[index];
            
            if (nextSource != null) {
                for (const nextKey in nextSource) {
                    if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
        }
        
        return to;
    };
}

// Simple Array.includes polyfill for old browsers
if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement, fromIndex) {
        return this.indexOf(searchElement, fromIndex) !== -1;
    };
}

// Crypto.randomUUID polyfill for older browsers
if (!crypto.randomUUID) {
    crypto.randomUUID = function() {
        // Generate a UUID v4 using crypto.getRandomValues
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        
        // Set version (4) and variant bits
        array[6] = (array[6] & 0x0f) | 0x40; // Version 4
        array[8] = (array[8] & 0x3f) | 0x80; // Variant 10
        
        // Convert to hex string
        const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        
        // Format as UUID
        return [
            hex.slice(0, 8),
            hex.slice(8, 12),
            hex.slice(12, 16),
            hex.slice(16, 20),
            hex.slice(20, 32)
        ].join('-');
    };
}

// Global error handler to catch crypto.randomUUID errors from external scripts
window.addEventListener('error', function(event) {
    if (event.error && event.error.message && event.error.message.includes('crypto.randomUUID')) {
        console.warn('[Polyfills] Caught crypto.randomUUID error from external script, continuing...');
        event.preventDefault();
        return false;
    }
});

// Only log in development (check for localhost)
if (window.location.hostname === 'localhost') {
    console.log('[Polyfills] Minimal polyfills loaded for compatibility');
} 