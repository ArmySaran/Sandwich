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
            // Get all ingredients and filter client-side for now
            const { data, error } = await this.supabase
                .from('ingredients')
                .select('*')

            if (error) throw error

            // Filter low stock items client-side
            const lowStockItems = (data || []).filter(item =>
                item.quantity <= item.minimum_stock
            );

            return lowStockItems.map(item => ({
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

    // Generate sales report with analytics
    async getSalesReport(params = {}) {
        try {
            const { startDate, endDate, groupBy = 'day' } = params;
            const today = new Date().toISOString().split('T')[0];
            const start = startDate || today;
            const end = endDate || today;

            if (this.isOnline && this.supabase) {
                const { data: sales, error } = await this.supabase
                    .from('sales')
                    .select(`
                        *,
                        sale_items (
                            quantity,
                            unit_price,
                            menu_items (name, category)
                        )
                    `)
                    .gte('date', start)
                    .lte('date', end)
                    .order('date', { ascending: true });

                if (error) throw error;

                // Process sales data for report
                const reportData = sales.map(sale => ({
                    date: sale.date,
                    total: sale.total,
                    items_count: sale.sale_items?.length || 0,
                    items: sale.sale_items || []
                }));

                return {
                    period: { start, end },
                    sales: reportData,
                    summary: {
                        totalSales: sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0),
                        totalOrders: sales.length,
                        averageOrder: sales.length > 0 ? sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0) / sales.length : 0
                    }
                };
            } else {
                // Fallback to local data
                return {
                    period: { start, end },
                    sales: [],
                    summary: {
                        totalSales: 0,
                        totalOrders: 0,
                        averageOrder: 0
                    }
                };
            }
        } catch (error) {
            console.error('❌ getSalesReport failed:', error)
            return {
                period: { start: today, end: today },
                sales: [],
                summary: { totalSales: 0, totalOrders: 0, averageOrder: 0 }
            }
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

// Mock Database Generator for Development and Demo
class MockDataGenerator {
    constructor() {
        this.mockData = {
            ingredients: [],
            menuItems: [],
            sales: [],
            expenses: [],
            dailyOperations: []
        };
        this.generateAllMockData();
    }

    generateAllMockData() {
        console.log('🎭 Generating comprehensive mock database...');
        this.generateIngredients();
        this.generateMenuItems();
        this.generateSalesData();
        this.generateExpenses();
        this.generateDailyOperations();
        console.log('✅ Mock database generated successfully');
    }

    generateIngredients() {
        const ingredients = [
            // Bread & Base
            { name: 'ขนมปังแซนวิช', category: 'bread', unit: 'แผ่น', current: 85, minimum: 50, cost: 2.50, supplier: 'เบเกอรี่พรีเมียม' },
            { name: 'ขนมปังโฮลวีต', category: 'bread', unit: 'แผ่น', current: 42, minimum: 30, cost: 3.00, supplier: 'เบเกอรี่พรีเมียม' },
            { name: 'ขนมปังบาเก็ต', category: 'bread', unit: 'ก้อน', current: 8, minimum: 15, cost: 15.00, supplier: 'เบเกอรี่ฝรั่งเศส' },

            // Meats & Proteins
            { name: 'แฮมหั่นบาง', category: 'protein', unit: 'กรัม', current: 1250, minimum: 800, cost: 0.08, supplier: 'มีท เซ็นเตอร์' },
            { name: 'เบคอนแผ่น', category: 'protein', unit: 'แผ่น', current: 65, minimum: 40, cost: 4.50, supplier: 'มีท เซ็นเตอร์' },
            { name: 'ไก่ย่างหั่น', category: 'protein', unit: 'กรัม', current: 850, minimum: 500, cost: 0.12, supplier: 'ฟาร์มไก่สด' },
            { name: 'ทูน่า', category: 'protein', unit: 'กระป๋อง', current: 12, minimum: 20, cost: 35.00, supplier: 'ซูเปอร์มาร์เก็ต' },

            // Dairy & Cheese
            { name: 'ชีสเชดดาร์', category: 'dairy', unit: 'แผ่น', current: 95, minimum: 60, cost: 3.20, supplier: 'แดรี่ฟาร์ม' },
            { name: 'ชีสมอสซาเรลลา', category: 'dairy', unit: 'กรัม', current: 450, minimum: 300, cost: 0.15, supplier: 'แดรี่ฟาร์ม' },
            { name: 'เนยสด', category: 'dairy', unit: 'กรัม', current: 180, minimum: 200, cost: 0.25, supplier: 'แดรี่ฟาร์ม' },

            // Vegetables
            { name: 'ผักกาดหอม', category: 'vegetable', unit: 'ใบ', current: 75, minimum: 50, cost: 1.50, supplier: 'ตลาดสด' },
            { name: 'มะเขือเทศ', category: 'vegetable', unit: 'ลูก', current: 28, minimum: 40, cost: 3.00, supplier: 'ตลาดสด' },
            { name: 'หอมใหญ่', category: 'vegetable', unit: 'หัว', current: 15, minimum: 25, cost: 8.00, supplier: 'ตลาดสด' },

            // Condiments & Sauces
            { name: 'มายองเนส', category: 'sauce', unit: 'กรัม', current: 380, minimum: 200, cost: 0.08, supplier: 'ซูเปอร์มาร์เก็ต' },
            { name: 'มัสตาร์ด', category: 'sauce', unit: 'กรัม', current: 250, minimum: 150, cost: 0.12, supplier: 'ซูเปอร์มาร์เก็ต' },
            { name: 'น้ำสลัดเซซาร์', category: 'sauce', unit: 'มล.', current: 320, minimum: 250, cost: 0.15, supplier: 'ซูเปอร์มาร์เก็ต' },

            // Beverages
            { name: 'เมล็ดกาแฟ', category: 'beverage', unit: 'กรัม', current: 1200, minimum: 1000, cost: 0.35, supplier: 'โรงคั่วกาแฟ' },
            { name: 'นมสดเย็น', category: 'beverage', unit: 'มล.', current: 2500, minimum: 2000, cost: 0.02, supplier: 'แดรี่ฟาร์ม' },
            { name: 'น้ำผลไม้', category: 'beverage', unit: 'มล.', current: 1800, minimum: 1500, cost: 0.03, supplier: 'บริษัทเครื่องดื่ม' }
        ];

        ingredients.forEach((ingredient, index) => {
            this.mockData.ingredients.push({
                id: `ing_${index + 1}`,
                ...ingredient,
                lastUpdated: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                lastOrder: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString()
            });
        });
    }

    generateMenuItems() {
        const menuItems = [
            // Hot Sandwiches
            { name: 'ดับเบิ้ลชีสโทสต์', category: 'hot_sandwich', price: 45, cost: 18, description: 'ขนมปังโทสต์ชีส 2 ชั้น หอม นุ่ม อร่อย' },
            { name: 'แฮมชีสโทสต์', category: 'hot_sandwich', price: 50, cost: 22, description: 'แฮมหั่นบาง + ชีสเชดดาร์ โทสต์กรอบ' },
            { name: 'เบคอนชีสเมลท์', category: 'hot_sandwich', price: 65, cost: 28, description: 'เบคอนกรอบ + ชีสละลาย + ขนมปังบาเก็ต' },
            { name: 'ไก่ย่างชีส', category: 'hot_sandwich', price: 55, cost: 25, description: 'ไก่ย่างหั่น + ชีสมอสซาเรลลา + ผักสด' },
            { name: 'ทูน่าเมลท์', category: 'hot_sandwich', price: 60, cost: 27, description: 'ทูน่าผสมมายอง + ชีสโทสต์' },
            { name: 'คลับแซนวิช', category: 'hot_sandwich', price: 75, cost: 32, description: 'แฮม + เบคอน + ไก่ + ชีส 3 ชั้น' },
            { name: 'เวจจี้เดไลท์', category: 'hot_sandwich', price: 40, cost: 16, description: 'ผักรวม + ชีส + น้ำสลัด' },

            // Cold Sandwiches
            { name: 'แฮมสลัด', category: 'cold_sandwich', price: 42, cost: 19, description: 'แฮม + ผักกาดหอม + มะเขือเทศ + มายองเนส' },
            { name: 'ทูน่าสลัด', category: 'cold_sandwich', price: 48, cost: 22, description: 'ทูน่าผสมมายองเนส + ผักสดกรอบ' },
            { name: 'ไก่เซซาร์', category: 'cold_sandwich', price: 52, cost: 24, description: 'ไก่ย่าง + น้ำสลัดเซซาร์ + ผักกาด' },
            { name: 'เฟรชเวจจี้', category: 'cold_sandwich', price: 35, cost: 15, description: 'ผักสดรวม + ชีส + น้ำสลัดบ้านๆ' },

            // Beverages
            { name: 'กาแฟร้อน', category: 'beverage', price: 25, cost: 8, description: 'กาแฟคั่วสด หอมกรุ่น' },
            { name: 'กาแฟเย็น', category: 'beverage', price: 30, cost: 10, description: 'กาแฟเย็น + นม + น้ำแข็ง' },
            { name: 'ช็อกโกแลตร้อน', category: 'beverage', price: 35, cost: 12, description: 'ช็อกโกแลตร้อน เข้มข้น' },
            { name: 'นมเย็น', category: 'beverage', price: 20, cost: 6, description: 'นมสดเย็น สดชื่น' },
            { name: 'น้ำผลไม้รวม', category: 'beverage', price: 28, cost: 9, description: 'น้ำผลไม้สดใหม่' },
            { name: 'น้ำเปล่า', category: 'beverage', price: 10, cost: 3, description: 'น้ำดื่มสะอาด' },

            // Sides & Extras
            { name: 'มันฝรั่งทอด', category: 'side', price: 25, cost: 8, description: 'มันฝรั่งทอดกรอบ' },
            { name: 'สลัดผัก', category: 'side', price: 30, cost: 12, description: 'ผักสดรวม + น้ำสลัด' },
            { name: 'ขนมปังกรอบ', category: 'side', price: 15, cost: 5, description: 'ขนมปังโทสต์กรอบ' }
        ];

        menuItems.forEach((item, index) => {
            this.mockData.menuItems.push({
                id: `menu_${index + 1}`,
                ...item,
                available: Math.random() > 0.1, // 90% available
                createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
            });
        });
    }

    generateSalesData() {
        const today = new Date();
        const sales = [];

        // Generate sales for the last 14 days
        for (let day = 13; day >= 0; day--) {
            const saleDate = new Date(today);
            saleDate.setDate(saleDate.getDate() - day);

            // Generate 8-25 sales per day with realistic patterns
            const isWeekend = saleDate.getDay() === 0 || saleDate.getDay() === 6;
            const minSales = isWeekend ? 12 : 8;
            const maxSales = isWeekend ? 25 : 18;
            const salesCount = Math.floor(Math.random() * (maxSales - minSales + 1)) + minSales;

            for (let sale = 0; sale < salesCount; sale++) {
                // Random time during business hours (8 AM - 8 PM)
                const saleTime = new Date(saleDate);
                const hour = Math.floor(Math.random() * 12) + 8; // 8-19
                const minute = Math.floor(Math.random() * 60);
                saleTime.setHours(hour, minute, 0, 0);

                // Generate 1-4 items per sale
                const itemCount = Math.floor(Math.random() * 4) + 1;
                const saleItems = [];
                let total = 0;

                for (let i = 0; i < itemCount; i++) {
                    const menuItem = this.mockData.menuItems[Math.floor(Math.random() * this.mockData.menuItems.length)];
                    const quantity = Math.floor(Math.random() * 2) + 1; // 1-2 quantity
                    const unitPrice = menuItem.price;
                    const itemTotal = unitPrice * quantity;

                    saleItems.push({
                        menuItemId: menuItem.id,
                        menuItemName: menuItem.name,
                        quantity,
                        unitPrice,
                        total: itemTotal
                    });

                    total += itemTotal;
                }

                sales.push({
                    id: `sale_${Date.now()}_${sale}`,
                    date: saleDate.toISOString().split('T')[0],
                    time: saleTime.toISOString(),
                    items: saleItems,
                    subtotal: total,
                    tax: Math.round(total * 0.07 * 100) / 100,
                    total: Math.round((total * 1.07) * 100) / 100,
                    paymentMethod: Math.random() > 0.3 ? 'cash' : 'card',
                    customerId: Math.random() > 0.7 ? `cust_${Math.floor(Math.random() * 100)}` : null
                });
            }
        }

        this.mockData.sales = sales;
    }

    generateExpenses() {
        const today = new Date();
        const expenseTypes = [
            { type: 'ingredient', description: 'ซื้อวัตถุดิบ', store: 'ตลาดสด' },
            { type: 'equipment', description: 'อุปกรณ์ครัว', store: 'ร้านอุปกรณ์' },
            { type: 'utility', description: 'ค่าไฟฟ้า', store: 'การไฟฟ้า' },
            { type: 'utility', description: 'ค่าน้ำ', store: 'การประปา' },
            { type: 'supply', description: 'ถุงใส่อาหาร', store: 'ร้านบรรจุภัณฑ์' },
            { type: 'supply', description: 'กระดาษทิชชู่', store: 'ร้านอุปกรณ์' },
            { type: 'maintenance', description: 'ซ่อมเครื่องกาแฟ', store: 'ช่างซ่อม' },
            { type: 'ingredient', description: 'นมสด', store: 'แดรี่ฟาร์ม' }
        ];

        const expenses = [];

        // Generate 2-5 expenses per week for the last 4 weeks
        for (let week = 3; week >= 0; week--) {
            const expenseCount = Math.floor(Math.random() * 4) + 2;

            for (let i = 0; i < expenseCount; i++) {
                const expenseDate = new Date(today);
                expenseDate.setDate(expenseDate.getDate() - (week * 7) - Math.floor(Math.random() * 7));

                const expense = expenseTypes[Math.floor(Math.random() * expenseTypes.length)];
                const amount = Math.floor(Math.random() * 2000) + 100; // 100-2100 THB

                expenses.push({
                    id: `exp_${Date.now()}_${i}`,
                    date: expenseDate.toISOString().split('T')[0],
                    type: expense.type,
                    description: expense.description,
                    amount: amount,
                    store: expense.store,
                    receiptId: Math.random() > 0.4 ? `receipt_${Date.now()}_${i}` : null,
                    notes: Math.random() > 0.6 ? 'รายจ่ายจำเป็นสำหรับการดำเนินงาน' : ''
                });
            }
        }

        this.mockData.expenses = expenses;
    }

    generateDailyOperations() {
        const today = new Date();
        const operations = [];

        // Generate daily operations for last 7 days
        for (let day = 6; day >= 0; day--) {
            const opDate = new Date(today);
            opDate.setDate(opDate.getDate() - day);

            const dailySales = this.mockData.sales
                .filter(sale => sale.date === opDate.toISOString().split('T')[0])
                .reduce((sum, sale) => sum + sale.total, 0);

            const dailyExpenses = this.mockData.expenses
                .filter(expense => expense.date === opDate.toISOString().split('T')[0])
                .reduce((sum, expense) => sum + expense.amount, 0);

            const openingCash = 500 + Math.floor(Math.random() * 500); // 500-1000
            const closingCash = openingCash + dailySales - dailyExpenses + Math.floor(Math.random() * 200) - 100;

            operations.push({
                id: `op_${opDate.getTime()}`,
                date: opDate.toISOString().split('T')[0],
                openingCash,
                closingCash: Math.max(0, closingCash),
                totalSales: dailySales,
                totalExpenses: dailyExpenses,
                profit: dailySales - dailyExpenses,
                notes: `ดำเนินการปกติ - ยอดขาย ${dailySales.toFixed(2)} บาท`
            });
        }

        this.mockData.dailyOperations = operations;
    }

    // Method to load mock data into the application
    loadMockDataIntoApp() {
        console.log('🔄 Loading mock data into application...');

        // Update global data objects if they exist
        if (typeof inventoryData !== 'undefined') {
            window.inventoryData = this.mockData.ingredients;
        }

        if (typeof menuData !== 'undefined') {
            window.menuData = this.mockData.menuItems;
        }

        // Store in localStorage for persistence
        localStorage.setItem('mockDatabase', JSON.stringify(this.mockData));
        localStorage.setItem('mockDataLoaded', 'true');
        localStorage.setItem('mockDataVersion', '1.0');

        console.log('✅ Mock data loaded successfully');
        console.log(`📊 Generated: ${this.mockData.ingredients.length} ingredients, ${this.mockData.menuItems.length} menu items, ${this.mockData.sales.length} sales, ${this.mockData.expenses.length} expenses`);

        return this.mockData;
    }

    // Get mock data for specific table
    getMockData(table) {
        return this.mockData[table] || [];
    }

    // Get analytics from mock data
    getAnalytics() {
        const totalSales = this.mockData.sales.reduce((sum, sale) => sum + sale.total, 0);
        const totalExpenses = this.mockData.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const profit = totalSales - totalExpenses;
        const avgOrderValue = this.mockData.sales.length > 0 ? totalSales / this.mockData.sales.length : 0;

        // Top selling items
        const itemSales = {};
        this.mockData.sales.forEach(sale => {
            sale.items.forEach(item => {
                if (!itemSales[item.menuItemName]) {
                    itemSales[item.menuItemName] = { count: 0, revenue: 0 };
                }
                itemSales[item.menuItemName].count += item.quantity;
                itemSales[item.menuItemName].revenue += item.total;
            });
        });

        const topProducts = Object.entries(itemSales)
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, 5)
            .map(([name, data]) => ({ name, ...data }));

        return {
            totalSales: Math.round(totalSales * 100) / 100,
            totalExpenses: Math.round(totalExpenses * 100) / 100,
            profit: Math.round(profit * 100) / 100,
            avgOrderValue: Math.round(avgOrderValue * 100) / 100,
            topProducts,
            lowStockItems: this.mockData.ingredients.filter(item => item.current <= item.minimum),
            salesCount: this.mockData.sales.length,
            expensesCount: this.mockData.expenses.length
        };
    }
}

// Initialize global database manager
const db = new DatabaseManager()

// Initialize mock data generator
const mockDB = new MockDataGenerator()

// Auto-load mock data for development
if (typeof window !== 'undefined' && !localStorage.getItem('mockDataLoaded')) {
    setTimeout(() => {
        mockDB.loadMockDataIntoApp();
        console.log('🎭 Mock database ready for demonstration!');

        // Trigger dashboard refresh if available
        if (typeof window.refreshDashboard === 'function') {
            window.refreshDashboard();
        }
    }, 1000);
}
