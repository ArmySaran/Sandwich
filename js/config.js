// Configuration file for the Sandwich POS application
const CONFIG = {
    // Supabase configuration - Complete and ready for production
    supabase: {
        url: 'https://gefvfsmbbohzsypzckjj.supabase.co', // ✅ Your project URL
        key: 'sb_publishable_adup3tGa4qTROArUeMG1cQ_xYwLfAC0' // ✅ Your publishable key
    },

    // Application settings
    app: {
        name: '🥪 ร้าน Sandwich ตัวกลม',
        version: '2.0.0',
        currency: 'THB',
        locale: 'th-TH'
    },

    // Business settings
    business: {
        taxRate: 0.07, // 7% VAT
        profitMarginWarning: 30, // Warning when profit margin below 30%
        stockThreshold: 5, // Low stock alert level
        peakHours: ['11:00', '14:00'], // Peak business hours for notifications
        autoBackup: true, // Enable automatic data backup
        offlineMode: true // Enable offline functionality
    },

    // UI/UX settings
    ui: {
        theme: 'modern', // 'modern' or 'classic'
        animation: true, // Enable animations
        notifications: true, // Enable toast notifications
        chartRefreshInterval: 30000, // 30 seconds
        autoSaveInterval: 60000 // 1 minute
    },

    // Feature flags
    features: {
        analytics: true,
        inventory: true,
        expenses: true,
        reports: true,
        notifications: true,
        offline: true,
        pwa: true
    }
}

// Environment detection
CONFIG.isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
CONFIG.isProduction = window.location.hostname.includes('.github.io')

// Debug mode
if (CONFIG.isDevelopment) {
    CONFIG.debug = true
    console.log('🔧 Development mode enabled')
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG
}
