// Local IndexedDB Database Manager for Phone Storage
class LocalDatabaseManager {
    constructor() {
        this.dbName = 'SandwichPOS'
        this.dbVersion = 1
        this.db = null
        this.isReady = false
        this.eventListeners = {}
        this.init()
    }

    async init() {
        try {
            console.log('🔄 Initializing local database...')
            await this.openDatabase()
            await this.seedDefaultData()
            this.isReady = true
            console.log('✅ Local database ready')
            this.emit('ready')
        } catch (error) {
            console.error('❌ Database initialization failed:', error)
            throw error
        }
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion)

            request.onerror = () => reject(request.error)
            request.onsuccess = () => {
                this.db = request.result
                resolve(this.db)
            }

            request.onupgradeneeded = (event) => {
                const db = event.target.result
                console.log('📦 Setting up database schema...')

                // Menu Categories
                if (!db.objectStoreNames.contains('menu_categories')) {
                    const categoriesStore = db.createObjectStore('menu_categories', { keyPath: 'id' })
                    categoriesStore.createIndex('name', 'name', { unique: true })
                    categoriesStore.createIndex('display_order', 'display_order')
                }

                // Menu Items
                if (!db.objectStoreNames.contains('menu_items')) {
                    const menuStore = db.createObjectStore('menu_items', { keyPath: 'id' })
                    menuStore.createIndex('name', 'name')
                    menuStore.createIndex('category', 'category')
                    menuStore.createIndex('price', 'price')
                    menuStore.createIndex('is_available', 'is_available')
                }

                // Ingredients
                if (!db.objectStoreNames.contains('ingredients')) {
                    const ingredientsStore = db.createObjectStore('ingredients', { keyPath: 'id' })
                    ingredientsStore.createIndex('name', 'name', { unique: true })
                    ingredientsStore.createIndex('quantity', 'quantity')
                    ingredientsStore.createIndex('category', 'category')
                }

                // Recipes (Menu Item -> Ingredients mapping)
                if (!db.objectStoreNames.contains('recipes')) {
                    const recipesStore = db.createObjectStore('recipes', { keyPath: 'id' })
                    recipesStore.createIndex('menu_item_id', 'menu_item_id')
                    recipesStore.createIndex('ingredient_id', 'ingredient_id')
                }

                // Ingredient Usage Tracking
                if (!db.objectStoreNames.contains('ingredient_usage')) {
                    const usageStore = db.createObjectStore('ingredient_usage', { keyPath: 'id' })
                    usageStore.createIndex('ingredient_id', 'ingredient_id')
                    usageStore.createIndex('date', 'date')
                    usageStore.createIndex('type', 'type')
                }

                // Sales
                if (!db.objectStoreNames.contains('sales')) {
                    const salesStore = db.createObjectStore('sales', { keyPath: 'id' })
                    salesStore.createIndex('date', 'created_at')
                    salesStore.createIndex('total', 'total')
                    salesStore.createIndex('payment_method', 'payment_method')
                }

                // Sale Items
                if (!db.objectStoreNames.contains('sale_items')) {
                    const saleItemsStore = db.createObjectStore('sale_items', { keyPath: 'id' })
                    saleItemsStore.createIndex('sale_id', 'sale_id')
                    saleItemsStore.createIndex('menu_item_id', 'menu_item_id')
                }

                // Expenses
                if (!db.objectStoreNames.contains('expenses')) {
                    const expensesStore = db.createObjectStore('expenses', { keyPath: 'id' })
                    expensesStore.createIndex('date', 'date')
                    expensesStore.createIndex('type', 'type')
                    expensesStore.createIndex('amount', 'amount')
                }

                // Customers
                if (!db.objectStoreNames.contains('customers')) {
                    const customersStore = db.createObjectStore('customers', { keyPath: 'id' })
                    customersStore.createIndex('name', 'name')
                    customersStore.createIndex('phone', 'phone', { unique: true })
                    customersStore.createIndex('email', 'email')
                }

                // Daily Operations
                if (!db.objectStoreNames.contains('daily_operations')) {
                    const dailyOpsStore = db.createObjectStore('daily_operations', { keyPath: 'date' })
                    dailyOpsStore.createIndex('revenue', 'total_revenue')
                    dailyOpsStore.createIndex('profit', 'net_profit')
                }

                // Settings
                if (!db.objectStoreNames.contains('settings')) {
                    const settingsStore = db.createObjectStore('settings', { keyPath: 'key' })
                }
            }
        })
    }

    // Seed default data for first-time setup
    async seedDefaultData() {
        try {
            // Check if data already exists
            const existingCategories = await this.getAll('menu_categories')
            if (existingCategories.length > 0) {
                console.log('📋 Database already contains data')
                return
            }

            console.log('🌱 Seeding default data...')

            // Default menu categories
            const categories = [
                {
                    id: 'cat_sandwich',
                    name: 'แซนด์วิช',
                    description: 'เมนูแซนด์วิชหลัก',
                    color: '#0c8ce9',
                    icon: '🥪',
                    display_order: 1,
                    is_active: true,
                    created_at: new Date().toISOString()
                },
                {
                    id: 'cat_beverage',
                    name: 'เครื่องดื่ม',
                    description: 'เครื่องดื่มและน้ำผลไม้',
                    color: '#22c55e',
                    icon: '🥤',
                    display_order: 2,
                    is_active: true,
                    created_at: new Date().toISOString()
                },
                {
                    id: 'cat_side',
                    name: 'เครื่องเคียง',
                    description: 'เครื่องเคียงและของทานเล่น',
                    color: '#f59e0b',
                    icon: '🍟',
                    display_order: 3,
                    is_active: true,
                    created_at: new Date().toISOString()
                },
                {
                    id: 'cat_dessert',
                    name: 'ของหวาน',
                    description: 'ของหวานและขนม',
                    color: '#ec4899',
                    icon: '🍰',
                    display_order: 4,
                    is_active: true,
                    created_at: new Date().toISOString()
                }
            ]

            // Default ingredients
            const ingredients = [
                {
                    id: 'ing_bread_white',
                    name: 'ขนมปังขาว',
                    unit: 'แผ่น',
                    cost_per_unit: 2.00,
                    quantity: 100,
                    minimum_stock: 10,
                    supplier: 'เบเกอรี่ใกล้บ้าน',
                    category: 'ขนมปัง',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'ing_ham',
                    name: 'แฮม',
                    unit: 'แผ่น',
                    cost_per_unit: 5.00,
                    quantity: 50,
                    minimum_stock: 5,
                    supplier: 'ผู้จำหน่ายเนื้อ',
                    category: 'เนื้อสัตว์',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'ing_cheese',
                    name: 'ชีส',
                    unit: 'แผ่น',
                    cost_per_unit: 3.00,
                    quantity: 40,
                    minimum_stock: 8,
                    supplier: 'บริษัทนม',
                    category: 'นม',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'ing_lettuce',
                    name: 'ผักกาดหอม',
                    unit: 'ใบ',
                    cost_per_unit: 1.00,
                    quantity: 30,
                    minimum_stock: 5,
                    supplier: 'ฟาร์มสด',
                    category: 'ผัก',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'ing_tomato',
                    name: 'มะเขือเทศ',
                    unit: 'แผ่น',
                    cost_per_unit: 1.50,
                    quantity: 25,
                    minimum_stock: 5,
                    supplier: 'ฟาร์มสด',
                    category: 'ผัก',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'ing_bread_whole_wheat',
                    name: 'ขนมปังโฮลวีท',
                    unit: 'แผ่น',
                    cost_per_unit: 2.50,
                    quantity: 50,
                    minimum_stock: 10,
                    supplier: 'เบเกอรี่ใกล้บ้าน',
                    category: 'ขนมปัง',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'ing_chicken',
                    name: 'ไก่ย่าง',
                    unit: 'แผ่น',
                    cost_per_unit: 8.00,
                    quantity: 30,
                    minimum_stock: 5,
                    supplier: 'ผู้จำหน่ายเนื้อ',
                    category: 'เนื้อสัตว์',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'ing_tuna',
                    name: 'ทูน่า',
                    unit: 'ช้อนโต๊ะ',
                    cost_per_unit: 6.00,
                    quantity: 20,
                    minimum_stock: 3,
                    supplier: 'ผู้จำหน่ายอาหารทะเล',
                    category: 'เนื้อสัตว์',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'ing_egg',
                    name: 'ไข่ดาว',
                    unit: 'ฟอง',
                    cost_per_unit: 4.00,
                    quantity: 40,
                    minimum_stock: 10,
                    supplier: 'ฟาร์มไข่',
                    category: 'เนื้อสัตว์',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'ing_cucumber',
                    name: 'แตงกวา',
                    unit: 'แผ่น',
                    cost_per_unit: 0.50,
                    quantity: 50,
                    minimum_stock: 10,
                    supplier: 'ฟาร์มสด',
                    category: 'ผัก',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'ing_onion',
                    name: 'หอมใหญ่',
                    unit: 'แผ่น',
                    cost_per_unit: 0.75,
                    quantity: 40,
                    minimum_stock: 8,
                    supplier: 'ฟาร์มสด',
                    category: 'ผัก',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'ing_mayo',
                    name: 'มายองเนส',
                    unit: 'ช้อนชา',
                    cost_per_unit: 0.25,
                    quantity: 100,
                    minimum_stock: 20,
                    supplier: 'ร้านขายปลีก',
                    category: 'เครื่องปรุง',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'ing_mustard',
                    name: 'มัสตาร์ด',
                    unit: 'ช้อนชา',
                    cost_per_unit: 0.30,
                    quantity: 80,
                    minimum_stock: 15,
                    supplier: 'ร้านขายปลีก',
                    category: 'เครื่องปรุง',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'ing_butter',
                    name: 'เนย',
                    unit: 'ช้อนชา',
                    cost_per_unit: 0.50,
                    quantity: 60,
                    minimum_stock: 12,
                    supplier: 'บริษัทนม',
                    category: 'นม',
                    created_at: new Date().toISOString()
                }
            ]

            // Default menu items
            const menuItems = [
                {
                    id: 'menu_ham_cheese',
                    name: 'แฮมชีส',
                    price: 45.00,
                    cost: 12.00,
                    category: 'cat_sandwich',
                    description: 'แซนด์วิชแฮมชีสคลาสสิก',
                    is_available: true,
                    is_featured: true,
                    prep_time: 5,
                    created_at: new Date().toISOString()
                },
                {
                    id: 'menu_grilled_cheese',
                    name: 'กริลล์ชีส',
                    price: 35.00,
                    cost: 8.00,
                    category: 'cat_sandwich',
                    description: 'แซนด์วิชชีสย่างสุดอร่อย',
                    is_available: true,
                    is_featured: false,
                    prep_time: 7,
                    created_at: new Date().toISOString()
                }
            ]

            // Default recipes (Menu Item -> Ingredients mapping)
            const recipes = [
                // Ham & Cheese Sandwich Recipe
                {
                    id: 'recipe_ham_cheese_bread',
                    menu_item_id: 'menu_ham_cheese',
                    ingredient_id: 'ing_bread_white',
                    quantity: 2, // 2 slices of bread
                    created_at: new Date().toISOString()
                },
                {
                    id: 'recipe_ham_cheese_ham',
                    menu_item_id: 'menu_ham_cheese',
                    ingredient_id: 'ing_ham',
                    quantity: 2, // 2 slices of ham
                    created_at: new Date().toISOString()
                },
                {
                    id: 'recipe_ham_cheese_cheese',
                    menu_item_id: 'menu_ham_cheese',
                    ingredient_id: 'ing_cheese',
                    quantity: 1, // 1 slice of cheese
                    created_at: new Date().toISOString()
                },
                {
                    id: 'recipe_ham_cheese_lettuce',
                    menu_item_id: 'menu_ham_cheese',
                    ingredient_id: 'ing_lettuce',
                    quantity: 2, // 2 leaves of lettuce
                    created_at: new Date().toISOString()
                },
                {
                    id: 'recipe_ham_cheese_tomato',
                    menu_item_id: 'menu_ham_cheese',
                    ingredient_id: 'ing_tomato',
                    quantity: 2, // 2 slices of tomato
                    created_at: new Date().toISOString()
                },
                {
                    id: 'recipe_ham_cheese_mayo',
                    menu_item_id: 'menu_ham_cheese',
                    ingredient_id: 'ing_mayo',
                    quantity: 1, // 1 tsp of mayo
                    created_at: new Date().toISOString()
                },

                // Grilled Cheese Sandwich Recipe
                {
                    id: 'recipe_grilled_cheese_bread',
                    menu_item_id: 'menu_grilled_cheese',
                    ingredient_id: 'ing_bread_white',
                    quantity: 2, // 2 slices of bread
                    created_at: new Date().toISOString()
                },
                {
                    id: 'recipe_grilled_cheese_cheese',
                    menu_item_id: 'menu_grilled_cheese',
                    ingredient_id: 'ing_cheese',
                    quantity: 2, // 2 slices of cheese
                    created_at: new Date().toISOString()
                },
                {
                    id: 'recipe_grilled_cheese_butter',
                    menu_item_id: 'menu_grilled_cheese',
                    ingredient_id: 'ing_butter',
                    quantity: 2, // 2 tsp of butter for grilling
                    created_at: new Date().toISOString()
                }
            ]

            // Default settings
            const settings = [
                { key: 'business_name', value: 'ร้าน Sandwich ตัวกลม' },
                { key: 'tax_rate', value: 0.07 },
                { key: 'currency', value: 'THB' },
                { key: 'timezone', value: 'Asia/Bangkok' }
            ]

            // Insert all default data
            for (const category of categories) {
                await this.create('menu_categories', category)
            }
            for (const ingredient of ingredients) {
                await this.create('ingredients', ingredient)
            }
            for (const item of menuItems) {
                await this.create('menu_items', item)
            }
            for (const recipe of recipes) {
                await this.create('recipes', recipe)
            }
            for (const setting of settings) {
                await this.create('settings', setting)
            }

            console.log('✅ Default data seeded successfully')

        } catch (error) {
            console.error('❌ Error seeding default data:', error)
        }
    }

    // CRUD Operations for IndexedDB
    async create(table, data) {
        if (!this.db) throw new Error('Database not initialized')

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([table], 'readwrite')
            const store = transaction.objectStore(table)

            // Generate ID if not provided
            if (!data.id) {
                data.id = this.generateId()
            }

            // Add timestamps
            data.created_at = data.created_at || new Date().toISOString()
            data.updated_at = new Date().toISOString()

            const request = store.add(data)

            request.onsuccess = () => {
                console.log(`✅ Created record in ${table}:`, data.id)
                this.emit('dataChange', { table, operation: 'create', data })
                resolve(data)
            }

            request.onerror = () => {
                console.error(`❌ Failed to create record in ${table}:`, request.error)
                reject(request.error)
            }
        })
    }

    async read(table, id) {
        if (!this.db) throw new Error('Database not initialized')

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([table], 'readonly')
            const store = transaction.objectStore(table)
            const request = store.get(id)

            request.onsuccess = () => resolve(request.result || null)
            request.onerror = () => reject(request.error)
        })
    }

    // Alias for read method for compatibility
    async findById(table, id) {
        return await this.read(table, id)
    }

    async getAll(table, filters = {}) {
        if (!this.db) throw new Error('Database not initialized')

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([table], 'readonly')
            const store = transaction.objectStore(table)
            const request = store.getAll()

            request.onsuccess = () => {
                let results = request.result || []

                // Apply filters
                if (filters.where) {
                    results = results.filter(item => {
                        return Object.entries(filters.where).every(([key, value]) => {
                            if (typeof value === 'object' && value.operator) {
                                switch (value.operator) {
                                    case 'gte': return item[key] >= value.value
                                    case 'lte': return item[key] <= value.value
                                    case 'like': return item[key] && item[key].toLowerCase().includes(value.value.toLowerCase())
                                    default: return item[key] === value.value
                                }
                            }
                            return item[key] === value
                        })
                    })
                }

                // Apply ordering
                if (filters.orderBy) {
                    const { field, direction = 'asc' } = filters.orderBy
                    results.sort((a, b) => {
                        if (direction === 'desc') {
                            return a[field] < b[field] ? 1 : -1
                        }
                        return a[field] > b[field] ? 1 : -1
                    })
                }

                // Apply limit
                if (filters.limit) {
                    results = results.slice(0, filters.limit)
                }

                resolve(results)
            }

            request.onerror = () => reject(request.error)
        })
    }

    // Query records by index
    async query(table, indexName, value) {
        if (!this.db) throw new Error('Database not initialized')

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([table], 'readonly')
            const store = transaction.objectStore(table)
            const index = store.index(indexName)
            const request = index.getAll(value)

            request.onsuccess = () => {
                resolve(request.result || [])
            }

            request.onerror = () => reject(request.error)
        })
    }

    async update(table, id, updates) {
        if (!this.db) throw new Error('Database not initialized')

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([table], 'readwrite')
            const store = transaction.objectStore(table)

            // First get the existing record
            const getRequest = store.get(id)
            getRequest.onsuccess = () => {
                const existingData = getRequest.result
                if (!existingData) {
                    reject(new Error(`Record with id ${id} not found in ${table}`))
                    return
                }

                // Merge updates with existing data
                const updatedData = {
                    ...existingData,
                    ...updates,
                    updated_at: new Date().toISOString()
                }

                const putRequest = store.put(updatedData)
                putRequest.onsuccess = () => {
                    console.log(`✅ Updated record in ${table}:`, id)
                    this.emit('dataChange', { table, operation: 'update', data: updatedData })
                    resolve(updatedData)
                }
                putRequest.onerror = () => reject(putRequest.error)
            }
            getRequest.onerror = () => reject(getRequest.error)
        })
    }

    async delete(table, id) {
        if (!this.db) throw new Error('Database not initialized')

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([table], 'readwrite')
            const store = transaction.objectStore(table)

            // First get the record to return it
            const getRequest = store.get(id)
            getRequest.onsuccess = () => {
                const data = getRequest.result
                if (!data) {
                    reject(new Error(`Record with id ${id} not found in ${table}`))
                    return
                }

                const deleteRequest = store.delete(id)
                deleteRequest.onsuccess = () => {
                    console.log(`✅ Deleted record from ${table}:`, id)
                    this.emit('dataChange', { table, operation: 'delete', data })
                    resolve(data)
                }
                deleteRequest.onerror = () => reject(deleteRequest.error)
            }
            getRequest.onerror = () => reject(getRequest.error)
        })
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2)
    }

    // Event system
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = []
        }
        this.eventListeners[event].push(callback)
    }

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data))
        }
    }

    // Business logic methods
    async getSalesData(dateRange = {}) {
        const { startDate, endDate } = dateRange
        const filters = {}

        if (startDate || endDate) {
            filters.where = {}
            if (startDate) filters.where.created_at = { operator: 'gte', value: startDate }
            if (endDate) filters.where.created_at = { operator: 'lte', value: endDate }
        }

        return await this.getAll('sales', filters)
    }

    async getInventoryItems() {
        return await this.getAll('ingredients', {
            orderBy: { field: 'name', direction: 'asc' }
        })
    }

    async getLowStockItems() {
        const ingredients = await this.getAll('ingredients')
        return ingredients.filter(ingredient =>
            ingredient.quantity <= ingredient.minimum_stock
        )
    }

    async getMenuItems() {
        return await this.getAll('menu_items', {
            orderBy: { field: 'name', direction: 'asc' }
        })
    }

    async getDailySalesTotal(date = new Date().toISOString().split('T')[0]) {
        const sales = await this.getAll('sales', {
            where: {
                created_at: { operator: 'like', value: date }
            }
        })

        return sales.reduce((total, sale) => total + sale.total, 0)
    }

    async getTopSellingItems(limit = 5) {
        const saleItems = await this.getAll('sale_items')
        const itemStats = {}

        // Aggregate sales by menu item
        for (const item of saleItems) {
            if (!itemStats[item.menu_item_id]) {
                itemStats[item.menu_item_id] = {
                    menu_item_id: item.menu_item_id,
                    quantity_sold: 0,
                    total_revenue: 0
                }
            }
            itemStats[item.menu_item_id].quantity_sold += item.quantity
            itemStats[item.menu_item_id].total_revenue += item.subtotal
        }

        // Get menu item details
        const menuItems = await this.getMenuItems()
        const topItems = Object.values(itemStats)
            .sort((a, b) => b.quantity_sold - a.quantity_sold)
            .slice(0, limit)

        // Add menu item details
        return topItems.map(stat => {
            const menuItem = menuItems.find(item => item.id === stat.menu_item_id)
            return {
                ...stat,
                name: menuItem?.name || 'Unknown',
                price: menuItem?.price || 0
            }
        })
    }

    async getDashboardData() {
        try {
            const today = new Date().toISOString().split('T')[0]
            const todaySales = await this.getDailySalesTotal(today)

            // Get this week's data
            const weekStart = new Date()
            weekStart.setDate(weekStart.getDate() - weekStart.getDay())
            const weekSales = await this.getSalesData({
                startDate: weekStart.toISOString().split('T')[0],
                endDate: today
            })

            const lowStockItems = await this.getLowStockItems()
            const topItems = await this.getTopSellingItems(3)

            return {
                todaySales,
                weekSales: weekSales.reduce((sum, sale) => sum + sale.total, 0),
                salesCount: weekSales.length,
                lowStockCount: lowStockItems.length,
                topSellingItems: topItems,
                lowStockItems: lowStockItems.slice(0, 5)
            }
        } catch (error) {
            console.error('❌ Error getting dashboard data:', error)
            return {
                todaySales: 0,
                weekSales: 0,
                salesCount: 0,
                lowStockCount: 0,
                topSellingItems: [],
                lowStockItems: []
            }
        }
    }

    async addSale(saleData) {
        try {
            const saleId = this.generateId()
            const sale = {
                id: saleId,
                ...saleData,
                created_at: new Date().toISOString()
            }

            // Add sale
            await this.create('sales', sale)

            // Add sale items
            for (const item of saleData.items) {
                await this.create('sale_items', {
                    id: this.generateId(),
                    sale_id: saleId,
                    ...item
                })

                // Update inventory
                await this.updateInventoryAfterSale(item.menu_item_id, item.quantity)
            }

            console.log('✅ Sale added successfully:', saleId)
            return sale

        } catch (error) {
            console.error('❌ Error adding sale:', error)
            throw error
        }
    }

    async updateInventoryAfterSale(menuItemId, quantitySold) {
        try {
            // Get recipe for this menu item
            const recipes = await this.getAll('recipes', {
                where: { menu_item_id: menuItemId }
            })

            // Update ingredient quantities
            for (const recipe of recipes) {
                const ingredient = await this.read('ingredients', recipe.ingredient_id)
                if (ingredient) {
                    const newQuantity = ingredient.quantity - (recipe.quantity * quantitySold)
                    await this.update('ingredients', ingredient.id, {
                        quantity: Math.max(0, newQuantity)
                    })
                }
            }
        } catch (error) {
            console.error('❌ Error updating inventory:', error)
        }
    }

    async addExpense(expenseData) {
        try {
            const expense = {
                id: this.generateId(),
                date: new Date().toISOString().split('T')[0],
                created_at: new Date().toISOString(),
                ...expenseData
            }

            await this.create('expenses', expense)
            console.log('✅ Expense added successfully')
            return expense

        } catch (error) {
            console.error('❌ Error adding expense:', error)
            throw error
        }
    }

    // Data export/import for backup
    async exportData() {
        try {
            const tables = ['menu_categories', 'menu_items', 'ingredients', 'recipes', 'sales', 'sale_items', 'expenses', 'customers', 'settings']
            const exportData = {}

            for (const table of tables) {
                exportData[table] = await this.getAll(table)
            }

            exportData.exportDate = new Date().toISOString()
            exportData.version = '1.0'

            return exportData
        } catch (error) {
            console.error('❌ Error exporting data:', error)
            throw error
        }
    }

    async importData(data) {
        try {
            // Clear existing data
            const tables = ['menu_categories', 'menu_items', 'ingredients', 'recipes', 'sales', 'sale_items', 'expenses', 'customers', 'settings']

            for (const table of tables) {
                const transaction = this.db.transaction([table], 'readwrite')
                const store = transaction.objectStore(table)
                await new Promise((resolve, reject) => {
                    const request = store.clear()
                    request.onsuccess = () => resolve()
                    request.onerror = () => reject(request.error)
                })
            }

            // Import new data
            for (const table of tables) {
                if (data[table]) {
                    for (const item of data[table]) {
                        await this.create(table, item)
                    }
                }
            }

            console.log('✅ Data imported successfully')
            return true

        } catch (error) {
            console.error('❌ Error importing data:', error)
            throw error
        }
    }
}

// Initialize the database manager
let db = null

// Wait for page to load before initializing
document.addEventListener('DOMContentLoaded', async () => {
    try {
        db = new LocalDatabaseManager()

        // Make it globally available
        window.db = db

        console.log('🎉 Local database system ready!')

    } catch (error) {
        console.error('💥 Failed to initialize database:', error)
    }
})
