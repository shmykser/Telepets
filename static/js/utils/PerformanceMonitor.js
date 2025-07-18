/**
 * Performance Monitor using modern Web APIs
 * Tracks Core Web Vitals, resource loading, and user interactions
 */

export class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = [];
        this.isTracking = false;
        this.vitals = {
            CLS: 0,
            FID: null,
            LCP: null,
            FCP: null,
            TTFB: null
        };
    }

    /**
     * Start performance tracking
     */
    startTracking() {
        if (this.isTracking) return;
        
        this.isTracking = true;
        this.setupObservers();
        this.trackNavigationTiming();
        this.trackResourceTiming();
        this.trackWebVitals();
        
        console.log('📊 Performance monitoring started');
    }

    /**
     * Setup performance observers
     */
    setupObservers() {
        // Largest Contentful Paint (LCP)
        if ('PerformanceObserver' in window) {
            try {
                const lcpObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    this.vitals.LCP = lastEntry.startTime;
                    this.logMetric('LCP', lastEntry.startTime, 'ms');
                });
                
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                this.observers.push(lcpObserver);
            } catch (e) {
                console.warn('LCP observer not supported');
            }

            // First Contentful Paint (FCP)
            try {
                const fcpObserver = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    for (const entry of entries) {
                        if (entry.name === 'first-contentful-paint') {
                            this.vitals.FCP = entry.startTime;
                            this.logMetric('FCP', entry.startTime, 'ms');
                        }
                    }
                });
                
                fcpObserver.observe({ entryTypes: ['paint'] });
                this.observers.push(fcpObserver);
            } catch (e) {
                console.warn('FCP observer not supported');
            }

            // Cumulative Layout Shift (CLS)
            try {
                const clsObserver = new PerformanceObserver((entryList) => {
                    for (const entry of entryList.getEntries()) {
                        if (!entry.hadRecentInput) {
                            this.vitals.CLS += entry.value;
                        }
                    }
                    this.logMetric('CLS', this.vitals.CLS);
                });
                
                clsObserver.observe({ entryTypes: ['layout-shift'] });
                this.observers.push(clsObserver);
            } catch (e) {
                console.warn('CLS observer not supported');
            }

            // First Input Delay (FID)
            try {
                const fidObserver = new PerformanceObserver((entryList) => {
                    for (const entry of entryList.getEntries()) {
                        this.vitals.FID = entry.processingStart - entry.startTime;
                        this.logMetric('FID', this.vitals.FID, 'ms');
                    }
                });
                
                fidObserver.observe({ entryTypes: ['first-input'] });
                this.observers.push(fidObserver);
            } catch (e) {
                console.warn('FID observer not supported');
            }

            // Long Tasks
            try {
                const longTaskObserver = new PerformanceObserver((entryList) => {
                    for (const entry of entryList.getEntries()) {
                        this.logMetric('Long Task', entry.duration, 'ms', 'warn');
                    }
                });
                
                longTaskObserver.observe({ entryTypes: ['longtask'] });
                this.observers.push(longTaskObserver);
            } catch (e) {
                console.warn('Long task observer not supported');
            }
        }
    }

    /**
     * Track navigation timing
     */
    trackNavigationTiming() {
        if ('performance' in window && 'getEntriesByType' in performance) {
            const navigation = performance.getEntriesByType('navigation')[0];
            
            if (navigation) {
                const metrics = {
                    'DNS Lookup': navigation.domainLookupEnd - navigation.domainLookupStart,
                    'TCP Connection': navigation.connectEnd - navigation.connectStart,
                    'TLS Negotiation': navigation.secureConnectionStart > 0 ? 
                        navigation.connectEnd - navigation.secureConnectionStart : 0,
                    'Request': navigation.responseStart - navigation.requestStart,
                    'Response': navigation.responseEnd - navigation.responseStart,
                    'DOM Processing': navigation.domComplete - navigation.domLoading,
                    'Load Event': navigation.loadEventEnd - navigation.loadEventStart
                };

                this.vitals.TTFB = navigation.responseStart - navigation.requestStart;

                Object.entries(metrics).forEach(([name, value]) => {
                    if (value > 0) {
                        this.metrics.set(name, value);
                        this.logMetric(name, value, 'ms');
                    }
                });
            }
        }
    }

    /**
     * Track resource timing
     */
    trackResourceTiming() {
        if ('performance' in window && 'getEntriesByType' in performance) {
            const resources = performance.getEntriesByType('resource');
            
            const resourceStats = {
                scripts: [],
                stylesheets: [],
                images: [],
                other: []
            };

            resources.forEach(resource => {
                const duration = resource.responseEnd - resource.startTime;
                const size = resource.transferSize || 0;
                
                const resourceInfo = {
                    name: resource.name,
                    duration,
                    size,
                    type: this.getResourceType(resource.name)
                };

                if (resource.name.includes('.js')) {
                    resourceStats.scripts.push(resourceInfo);
                } else if (resource.name.includes('.css')) {
                    resourceStats.stylesheets.push(resourceInfo);
                } else if (this.isImageResource(resource.name)) {
                    resourceStats.images.push(resourceInfo);
                } else {
                    resourceStats.other.push(resourceInfo);
                }
            });

            this.metrics.set('Resource Stats', resourceStats);
            this.logResourceStats(resourceStats);
        }
    }

    /**
     * Track Web Vitals using modern APIs
     */
    trackWebVitals() {
        // Memory usage
        if ('memory' in performance) {
            const memory = performance.memory;
            this.logMetric('Memory Used', Math.round(memory.usedJSHeapSize / 1024 / 1024), 'MB');
            this.logMetric('Memory Limit', Math.round(memory.jsHeapSizeLimit / 1024 / 1024), 'MB');
        }

        // Connection information
        if ('connection' in navigator) {
            const conn = navigator.connection;
            this.logMetric('Connection Type', conn.effectiveType);
            this.logMetric('Downlink', conn.downlink, 'Mbps');
            this.logMetric('RTT', conn.rtt, 'ms');
            if (conn.saveData) {
                this.logMetric('Data Saver', 'Enabled');
            }
        }
    }

    /**
     * Measure function execution time
     * @param {string} name - Measurement name
     * @param {Function} fn - Function to measure
     * @returns {Promise<*>} Function result
     */
    async measure(name, fn) {
        const startMark = `${name}-start`;
        const endMark = `${name}-end`;
        const measureName = `${name}-duration`;

        performance.mark(startMark);
        
        try {
            const result = await fn();
            performance.mark(endMark);
            performance.measure(measureName, startMark, endMark);
            
            const measure = performance.getEntriesByName(measureName)[0];
            this.logMetric(name, measure.duration, 'ms');
            
            return result;
        } catch (error) {
            performance.mark(endMark);
            performance.measure(measureName, startMark, endMark);
            
            const measure = performance.getEntriesByName(measureName)[0];
            this.logMetric(`${name} (failed)`, measure.duration, 'ms', 'error');
            
            throw error;
        }
    }

    /**
     * Log performance metric
     * @param {string} name - Metric name
     * @param {number|string} value - Metric value
     * @param {string} unit - Unit of measurement
     * @param {string} level - Log level
     */
    logMetric(name, value, unit = '', level = 'info') {
        const message = `📊 ${name}: ${value}${unit}`;
        
        switch (level) {
            case 'warn':
                console.warn(message);
                break;
            case 'error':
                console.error(message);
                break;
            default:
                console.log(message);
        }

        this.metrics.set(name, { value, unit, timestamp: Date.now() });
    }

    /**
     * Log resource statistics
     * @param {Object} stats - Resource statistics
     */
    logResourceStats(stats) {
        console.group('📦 Resource Loading Stats');
        
        Object.entries(stats).forEach(([type, resources]) => {
            if (resources.length > 0) {
                const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
                const avgDuration = resources.reduce((sum, r) => sum + r.duration, 0) / resources.length;
                
                console.log(`${type}: ${resources.length} files, ${Math.round(totalSize / 1024)}KB, ${Math.round(avgDuration)}ms avg`);
            }
        });
        
        console.groupEnd();
    }

    /**
     * Get resource type from URL
     * @param {string} url - Resource URL
     * @returns {string} Resource type
     */
    getResourceType(url) {
        if (url.includes('.js')) return 'script';
        if (url.includes('.css')) return 'stylesheet';
        if (this.isImageResource(url)) return 'image';
        return 'other';
    }

    /**
     * Check if resource is an image
     * @param {string} url - Resource URL
     * @returns {boolean} Is image resource
     */
    isImageResource(url) {
        return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url);
    }

    /**
     * Get performance report
     * @returns {Object} Performance report
     */
    getReport() {
        return {
            vitals: this.vitals,
            metrics: Object.fromEntries(this.metrics),
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            connection: 'connection' in navigator ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt,
                saveData: navigator.connection.saveData
            } : null
        };
    }

    /**
     * Pause monitoring
     */
    pause() {
        this.isTracking = false;
    }

    /**
     * Resume monitoring
     */
    resume() {
        this.isTracking = true;
    }

    /**
     * Stop monitoring and cleanup
     */
    stop() {
        this.isTracking = false;
        
        this.observers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (e) {
                // Ignore errors during cleanup
            }
        });
        
        this.observers = [];
        
        console.log('📊 Performance monitoring stopped');
        console.log('Final report:', this.getReport());
    }
} 