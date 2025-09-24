# Mock Database Documentation

## Overview
The Sandwich POS system includes a comprehensive mock database system for development, testing, and demonstration purposes. This system generates realistic business data to showcase all application features.

## 🎭 Mock Data Components

### 1. **Ingredients Database** (19 items)
- **Bread & Base**: Sandwich bread, whole wheat bread, baguette
- **Proteins**: Ham, bacon, grilled chicken, tuna
- **Dairy**: Cheddar cheese, mozzarella, fresh butter
- **Vegetables**: Lettuce, tomatoes, onions
- **Sauces**: Mayonnaise, mustard, Caesar dressing
- **Beverages**: Coffee beans, fresh milk, fruit juice

**Features:**
- Realistic stock levels with some items below minimum
- Thai supplier names and locations
- Cost analysis with price per unit
- Low stock alerts simulation

### 2. **Menu Items Database** (20 items)
**Categories:**
- **Hot Sandwiches** (7 items): Double cheese toast, ham & cheese, bacon cheese melt, etc.
- **Cold Sandwiches** (4 items): Ham salad, tuna salad, chicken caesar, fresh veggie
- **Beverages** (6 items): Hot coffee, iced coffee, chocolate, milk, fruit juice, water
- **Sides** (3 items): French fries, vegetable salad, crispy bread

**Features:**
- Realistic pricing in Thai Baht (฿10-75)
- Cost calculation for profit analysis
- Thai descriptions and names
- Category-based organization

### 3. **Sales Transaction Data** (150+ transactions)
- **Time Period**: Last 14 days of realistic sales
- **Pattern Simulation**:
  - Weekends: 12-25 sales per day
  - Weekdays: 8-18 sales per day
  - Business hours: 8 AM - 8 PM
- **Transaction Details**:
  - 1-4 items per sale
  - Quantity variations (1-2 per item)
  - Tax calculation (7% VAT)
  - Payment method mix (70% cash, 30% card)

### 4. **Expense Tracking** (25+ expenses)
- **Categories**: Ingredients, equipment, utilities, supplies, maintenance
- **Realistic Vendors**: Local market, dairy farm, equipment stores
- **Amount Range**: ฿100-2,100 per expense
- **Receipt Simulation**: 60% with receipt IDs

### 5. **Daily Operations** (7 days)
- Opening/closing cash tracking
- Daily profit/loss calculation
- Sales vs expenses analysis
- Realistic cash flow patterns

## 🚀 Usage Instructions

### Automatic Loading
- Mock data loads automatically on first visit
- Data persists in browser localStorage
- System checks for existing data before generating new

### Manual Management
Access the **Settings** screen for mock data controls:

1. **🔄 โหลดข้อมูลจำลอง** - Generate fresh mock data
2. **🗑️ ล้างข้อมูล** - Clear all mock data
3. **Status Display** - Shows current data statistics

### Developer Console
Monitor mock data loading:
```javascript
// Check if mock data is loaded
console.log('Mock data loaded:', localStorage.getItem('mockDataLoaded'));

// Access mock database
if (typeof mockDB !== 'undefined') {
    console.log('Analytics:', mockDB.getAnalytics());
    console.log('Menu items:', mockDB.getMockData('menuItems'));
    console.log('Ingredients:', mockDB.getMockData('ingredients'));
}
```

## 📊 Business Scenarios Demonstrated

### **Profitable Operations**
- High-margin items: Hot sandwiches with 40-60% profit margins
- Popular beverages with quick turnover
- Efficient ingredient usage tracking

### **Inventory Management**
- Low stock alerts for baguette and tuna (below minimum levels)
- Overstocked items like sandwich bread and lettuce
- Supplier diversity with cost optimization

### **Sales Analytics**
- Weekend peak performance (higher sales volume)
- Popular item analysis (cheese toast, coffee leading sales)
- Average order value: ฿45-85 per transaction

### **Financial Management**
- Daily profit tracking with realistic variations
- Expense management across multiple categories
- Cash flow monitoring with opening/closing balances

## 🔧 Technical Implementation

### Data Generation
```javascript
// Mock data is generated in database.js
class MockDataGenerator {
    generateAllMockData() {
        this.generateIngredients();    // 19 realistic ingredients
        this.generateMenuItems();      // 20 menu items across 4 categories
        this.generateSalesData();      // 14 days of sales history
        this.generateExpenses();       // 4 weeks of expense tracking
        this.generateDailyOperations(); // 7 days of operations
    }
}
```

### Integration Points
- **Dashboard**: Real-time metrics from mock sales data
- **POS System**: Menu items populated from mock database
- **Inventory**: Stock levels and alerts from mock ingredients
- **Reports**: Analytics calculated from mock transactions

## 🎯 Demo Scenarios

### **Scenario 1: Busy Weekend**
- Sales surge on Saturday/Sunday
- Popular items selling out
- Higher profit margins due to volume

### **Scenario 2: Inventory Alert**
- Baguette and tuna below minimum stock
- Automatic reorder recommendations
- Supplier contact information ready

### **Scenario 3: Profit Analysis**
- Menu items ranked by profitability
- Cost optimization suggestions
- Price adjustment recommendations

### **Scenario 4: Daily Operations**
- Opening cash: ฿500-1,000
- Sales tracking throughout the day
- Expense recording with receipts
- End-of-day profit calculation

## 🔄 Data Refresh

Mock data automatically refreshes to maintain realistic patterns:
- **Sales Data**: Updates with current date references
- **Stock Levels**: Fluctuates based on sales patterns
- **Profit Margins**: Adjusts with ingredient cost changes
- **Analytics**: Recalculates in real-time

## 📱 Mobile Optimization

All mock data displays are optimized for mobile viewing:
- Touch-friendly interfaces
- Responsive data tables
- Swipe-friendly navigation
- Quick action buttons

---

This mock database system provides a complete business simulation, allowing users to experience all POS features with realistic data patterns and scenarios.
