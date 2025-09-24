// Supabase Database Integration
class DatabaseManager {
    constructor() {
        this.supabase = null
        this.isOnline = navigator.onLine
        this.offlineQueue = []
        this.init()
    }

    async init() {
        try {
            // Initialize Supabase client
            if (typeof supabase !== 'undefined') {
                this.supabase = supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.key)
                console.log('✅ Supabase client initialized')
            } else {
                console.warn('⚠️ Supabase not loaded, using offline mode')
                this.isOnline = false
            }

            // Set up real-time subscriptions
            this.setupRealtimeSubscriptions()

            // Handle online/offline events
            window.addEventListener('online', () => {
                this.isOnline = true
                this.processOfflineQueue()
                console.log('📡 Connection restored')
            })

            window.addEventListener('offline', () => {
                this.isOnline = false
                console.log('📴 Working offline')
            })

        } catch (error) {
            console.error('❌ Database initialization failed:', error)
            this.isOnline = false
        }
    }

    // Real-time subscriptions for live updates
    setupRealtimeSubscriptions() {
        if (!this.supabase || !this.isOnline) return

        // Subscribe to sales changes
        this.supabase
            .channel('sales_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'sales' },
                (payload) => this.handleRealtimeUpdate('sales', payload)
            )
            .subscribe()

        // Subscribe to inventory changes
        this.supabase
            .channel('inventory_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'ingredients' },
                (payload) => this.handleRealtimeUpdate('inventory', payload)
            )
            .subscribe()
    }

    handleRealtimeUpdate(table, payload) {
        console.log(`🔄 Real-time update for ${table}:`, payload)

        // Emit custom events for UI updates
        const event = new CustomEvent('database_update', {
            detail: { table, payload }
        })
        document.dispatchEvent(event)
    }

    // CRUD Operations with offline support

    async create(table, data) {
        if (this.isOnline && this.supabase) {
            try {
                const { data: result, error } = await this.supabase
                    .from(table)
                    .insert(data)
                    .select()

                if (error) throw error
                return result[0]
            } catch (error) {
                console.error(`❌ Create failed for ${table}:`, error)
                // Add to offline queue
                this.offlineQueue.push({ operation: 'create', table, data })
                throw error
            }
        } else {
            // Store in offline queue
            const id = Date.now().toString()
            const record = { ...data, id, _offline: true }
            this.offlineQueue.push({ operation: 'create', table, data: record })
            return record
        }
    }

    async read(table, filters = {}) {
        if (this.isOnline && this.supabase) {
            try {
                let query = this.supabase.from(table).select('*')

                // Apply filters
                Object.entries(filters).forEach(([key, value]) => {
                    if (key === 'limit') {
                        query = query.limit(value)
                    } else if (key === 'order') {
                        query = query.order(value.column, { ascending: value.ascending })
                    } else if (typeof value === 'object' && value.operator) {
                        query = query.filter(key, value.operator, value.value)
                    } else {
                        query = query.eq(key, value)
                    }
                })

                const { data, error } = await query
                if (error) throw error

                return data || []
            } catch (error) {
                console.error(`❌ Read failed for ${table}:`, error)
                return this.getOfflineData(table, filters)
            }
        } else {
            return this.getOfflineData(table, filters)
        }
    }

    async update(table, id, updates) {
        if (this.isOnline && this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from(table)
                    .update(updates)
                    .eq('id', id)
                    .select()

                if (error) throw error
                return data[0]
            } catch (error) {
                console.error(`❌ Update failed for ${table}:`, error)
                this.offlineQueue.push({ operation: 'update', table, id, updates })
                throw error
            }
        } else {
            this.offlineQueue.push({ operation: 'update', table, id, updates })
            return { id, ...updates, _offline: true }
        }
    }

    async delete(table, id) {
        if (this.isOnline && this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from(table)
                    .delete()
                    .eq('id', id)
                    .select()

                if (error) throw error
                return data[0]
            } catch (error) {
                console.error(`❌ Delete failed for ${table}:`, error)
                this.offlineQueue.push({ operation: 'delete', table, id })
                throw error
            }
        } else {
            this.offlineQueue.push({ operation: 'delete', table, id })
            return { id, _deleted: true, _offline: true }
        }
    }

    // Offline data management
    getOfflineData(table, filters = {}) {
        const key = `offline_${table}`
        const data = JSON.parse(localStorage.getItem(key) || '[]')

        // Apply basic filtering for offline data
        let filteredData = data.filter(item => !item._deleted)

        if (filters.limit) {
            filteredData = filteredData.slice(0, filters.limit)
        }

        return filteredData
    }

    saveOfflineData(table, data) {
        const key = `offline_${table}`
        localStorage.setItem(key, JSON.stringify(data))
    }

    // Process offline operations when connection is restored
    async processOfflineQueue() {
        if (!this.supabase || this.offlineQueue.length === 0) return

        console.log(`🔄 Processing ${this.offlineQueue.length} offline operations...`)

        const failedOperations = []

        for (const operation of this.offlineQueue) {
            try {
                switch (operation.operation) {
                    case 'create':
                        await this.create(operation.table, operation.data)
                        break
                    case 'update':
                        await this.update(operation.table, operation.id, operation.updates)
                        break
                    case 'delete':
                        await this.delete(operation.table, operation.id)
                        break
                }
            } catch (error) {
                console.error('❌ Failed to sync offline operation:', operation, error)
                failedOperations.push(operation)
            }
        }

        // Keep failed operations in queue for retry
        this.offlineQueue = failedOperations

        if (failedOperations.length === 0) {
            console.log('✅ All offline operations synced successfully')
        } else {
            console.warn(`⚠️ ${failedOperations.length} operations failed to sync`)
        }
    }

    // Specialized methods for common operations

    async getSalesData(dateRange = {}) {
        const filters = {}

        if (dateRange.start && dateRange.end) {
            filters.date = {
                operator: 'gte',
                value: dateRange.start
            }
        }

        return await this.read('sales', filters)
    }

    async getInventoryItems() {
        return await this.read('ingredients', {
            order: { column: 'name', ascending: true }
        })
    }

    async getLowStockItems() {
        return await this.read('ingredients', {
            quantity: {
                operator: 'lte',
                value: CONFIG.business.stockThreshold
            }
        })
    }

    async getMenuItems() {
        return await this.read('menu_items', {
            order: { column: 'category', ascending: true }
        })
    }

    // Analytics queries
    async getDailySalesTotal(date = new Date().toISOString().split('T')[0]) {
        const sales = await this.read('sales', {
            date: date
        })

        return sales.reduce((total, sale) => total + sale.total, 0)
    }

    async getTopSellingItems(limit = 5) {
        if (this.isOnline && this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from('sale_items')
                    .select(`
                        quantity,
                        menu_items:menu_item_id (
                            name,
                            price
                        )
                    `)
                    .order('quantity', { ascending: false })
                    .limit(limit)

                if (error) throw error
                return data
            } catch (error) {
                console.error('❌ Failed to get top selling items:', error)
                return []
            }
        }
        return []
    }

    // Application-specific methods for the POS system

    async getDashboardData() {
        try {
            // Get recent sales data
            const { data: sales } = await this.supabase
                .from('sales')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100)

            // Get inventory status
            const { data: inventory } = await this.supabase
                .from('ingredients')
                .select('*')

            // Get menu items with profitability
            const { data: menu } = await this.supabase
                .from('menu_items')
                .select('*')

            // Calculate metrics
            const totalSales = sales?.reduce((sum, sale) => sum + parseFloat(sale.total), 0) || 0
            const lowStockItems = inventory?.filter(item => item.quantity <= item.minimum_stock) || []

            return {
                sales: sales || [],
                inventory: inventory || [],
                menu: menu || [],
                metrics: {
                    totalSales,
                    lowStockCount: lowStockItems.length,
                    menuItemCount: menu?.length || 0
                }
            }
        } catch (error) {
            console.error('❌ getDashboardData failed:', error)
            return {
                sales: [],
                inventory: [],
                menu: [],
                metrics: { totalSales: 0, lowStockCount: 0, menuItemCount: 0 }
            }
        }
    }

    async addSale(saleData) {
        try {
            const { data, error } = await this.supabase
                .from('sales')
                .insert({
                    total: saleData.total,
                    tax: saleData.tax || 0,
                    payment_method: saleData.paymentMethod || 'cash',
                    customer_name: saleData.customerName,
                    notes: saleData.notes
                })
                .select()

            if (error) throw error
            return data[0]
        } catch (error) {
            console.error('❌ addSale failed:', error)
            throw error
        }
    }

    async addExpense(expenseData) {
        try {
            const { data, error } = await this.supabase
                .from('expenses')
                .insert({
                    amount: expenseData.amount,
                    type: expenseData.type,
                    description: expenseData.description || expenseData.items,
                    category: expenseData.category,
                    supplier: expenseData.store,
                    is_recurring: expenseData.isRecurring || false
                })
                .select()

            if (error) throw error
            return data[0]
        } catch (error) {
            console.error('❌ addExpense failed:', error)
            throw error
        }
    }

    async updateInventory(inventoryData) {
        try {
            const { data, error } = await this.supabase
                .from('ingredients')
                .upsert(inventoryData)
                .select()

            if (error) throw error
            return data
        } catch (error) {
            console.error('❌ updateInventory failed:', error)
            throw error
        }
    }

    async getRecentSales(params = {}) {
        try {
            let query = this.supabase
                .from('sales')
                .select(`
                    *,
                    sale_items (
                        *,
                        menu_items (name, price)
                    )
                `)
                .order('created_at', { ascending: false })

            if (params.limit) {
                query = query.limit(params.limit)
            }

            if (params.startDate && params.endDate) {
                query = query
                    .gte('date', params.startDate)
                    .lte('date', params.endDate)
            }

            const { data, error } = await query
            if (error) throw error
            return data || []
        } catch (error) {
            console.error('❌ getRecentSales failed:', error)
            return []
        }
    }

    async getInventoryAlerts() {
        try {
            const { data, error } = await this.supabase
                .from('ingredients')
                .select('*')
                .lte('quantity', 'minimum_stock')

            if (error) throw error
            return (data || []).map(item => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                minimum_stock: item.minimum_stock,
                status: item.quantity <= 0 ? 'out_of_stock' : 'low_stock'
            }))
        } catch (error) {
            console.error('❌ getInventoryAlerts failed:', error)
            return []
        }
    }

    async addDailyOperation(operationData) {
        try {
            const { data, error } = await this.supabase
                .from('daily_operations')
                .upsert({
                    date: operationData.date,
                    opening_cash: operationData.openingCash,
                    closing_cash: operationData.closingCash,
                    total_sales: operationData.totalSales,
                    total_expenses: operationData.totalExpenses,
                    total_profit: operationData.totalProfit,
                    customer_count: operationData.customerCount,
                    notes: operationData.notes
                })
                .select()

            if (error) throw error
            return data[0]
        } catch (error) {
            console.error('❌ addDailyOperation failed:', error)
            throw error
        }
    }

    async generateReorderReport() {
        try {
            const { data, error } = await this.supabase
                .from('ingredients')
                .select('*')
                .lte('quantity', 'minimum_stock')

            if (error) throw error
            
            return (data || []).map(item => ({
                id: item.id,
                name: item.name,
                currentStock: item.quantity,
                minimumStock: item.minimum_stock,
                suggestedOrder: item.minimum_stock * 3,
                supplier: item.supplier,
                estimatedCost: item.cost_per_unit * (item.minimum_stock * 3)
            }))
        } catch (error) {
            console.error('❌ generateReorderReport failed:', error)
            return []
        }
    }

    // Health check
    async checkConnection() {
        if (!this.supabase) return false

        try {
            const { data, error } = await this.supabase
                .from('menu_items')
                .select('id')
                .limit(1)

            return !error
        } catch (error) {
            return false
        }
    }
}

// Initialize global database manager
const db = new DatabaseManager()
