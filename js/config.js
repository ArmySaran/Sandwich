// Configuration file for the Local Sandwich POS application
const CONFIG = {
    // Local Database configuration
    database: {
        name: 'SandwichPOS',
        version: 1,
        storageType: 'indexedDB' // Using IndexedDB for local storage
    },

    // Application settings
    app: {
        name: '🥪 ร้าน Sandwich ตัวกลม',
        version: '3.0.0',
        currency: 'THB',
        locale: 'th-TH',
        isLocal: true, // Running locally on device
        offlineFirst: true // Offline-first architecture
    },

    // Business settings
    business: {
        taxRate: 0.07, // 7% VAT
        profitMarginWarning: 30, // Warning when profit margin below 30%
        stockThreshold: 5, // Low stock alert level
        peakHours: ['11:00', '14:00'], // Peak business hours for notifications
        autoBackup: true, // Enable automatic data backup
        backupInterval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        dataRetention: 365 // Keep data for 1 year
    },

    // UI/UX settings
    ui: {
        theme: 'modern', // 'modern' or 'classic'
        animation: true, // Enable animations
        notifications: true, // Enable toast notifications
        chartRefreshInterval: 30000, // 30 seconds
        autoSaveInterval: 5000, // 5 seconds for local saves
        maxItemsPerPage: 50,
        touchOptimized: true // Optimized for mobile touch
    },

    // Feature flags
    features: {
        analytics: true,
        inventory: true,
        expenses: true,
        reports: true,
        notifications: true,
        backup: true,
        export: true,
        import: true,
        pwa: true,
        darkMode: true
    },

    // Local storage settings
    storage: {
        prefix: 'sandwich_pos_',
        compression: false, // Can enable for larger datasets
        encryption: false, // Can enable for sensitive data
        maxBackupFiles: 5
    }
}

// Environment detection
CONFIG.isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
CONFIG.isProduction = !CONFIG.isDevelopment

// Local storage utilities
CONFIG.getStorageKey = (key) => `${CONFIG.storage.prefix}${key}`

CONFIG.backup = {
    autoBackup: true,
    interval: CONFIG.business.backupInterval,
    location: 'downloads', // Browser downloads folder
    format: 'json',
    compression: false
}

// Debug mode
if (CONFIG.isDevelopment) {
    CONFIG.debug = true
    console.log('🔧 Development mode enabled')
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG
}
