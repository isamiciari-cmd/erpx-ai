انسخ هذا الأمر إلى Figma AI:

```text
Build a complete professional Inventory Management module for ERPX-AI, designed at the level of global ERP systems such as SAP, Oracle NetSuite, Microsoft Dynamics, and Odoo.

Project Context:
ERPX-AI is a modern SaaS ERP platform for companies. The Inventory module must be connected conceptually with Finance, POS, Procurement, Sales, HR permissions, and AI analytics.

Design Requirements:
Create a complete responsive web dashboard UI with a modern enterprise SaaS style:
- Clean white/dark mode support
- Professional sidebar navigation
- KPI cards
- Data tables
- Charts
- Filters
- Search
- Modals
- Forms
- Approval workflows
- Arabic/English ready layout
- Responsive desktop/tablet/mobile design

Main Inventory Features:
1. Inventory Dashboard
- Total stock value
- Available stock
- Reserved stock
- Low stock items
- Out-of-stock items
- Expired/near-expiry items
- Fast-moving items
- Slow-moving items
- Stock turnover
- Warehouse capacity
- Inventory alerts

2. Item Master Data
Create screens for:
- Add new item
- Edit item
- Item details page
- SKU
- Barcode / QR code
- Item name
- Category
- Subcategory
- Brand
- Unit of measure
- Cost price
- Selling price
- Tax category
- Supplier
- Minimum stock level
- Maximum stock level
- Reorder point
- Batch tracking
- Serial number tracking
- Expiry tracking
- Product images
- Attachments

3. Category Management
- Category list
- Add/edit categories
- Parent/child category hierarchy
- Category performance analytics

4. Warehouse Management
Create screens for:
- Warehouse list
- Warehouse details
- Add warehouse
- Edit warehouse
- Zones
- Racks
- Shelves
- Bins
- Storage capacity
- Warehouse manager
- Branch assignment
- Location tracking

5. Stock Movement Engine
Create a transaction-based stock movement system:
- Goods receipt
- Goods issue
- Stock transfer
- Stock adjustment
- Stock return
- Damaged stock
- Scrap stock
- Opening balance
- Internal transfer
- Branch transfer
- Movement approval status
- Movement reference number
- User who created the movement
- Date and time
- Notes
- Attachments

6. Stock Transfer Workflow
Create full transfer process:
- Create transfer request
- Select source warehouse
- Select destination warehouse
- Select items and quantities
- Submit for approval
- Approve/reject
- Dispatch
- Receive
- Close transfer
- Transfer status timeline

7. Inventory Counting
Create screens for:
- Physical count
- Cycle count
- Count sheet
- Count variance
- Approval of variance
- Stock adjustment after approval
- Count history

8. Batch, Serial, and Expiry Tracking
Create UI for:
- Batch number
- Serial number
- Manufacturing date
- Expiry date
- Lot tracking
- Warranty tracking
- Recall management

9. Reorder and Procurement Integration
Create screens for:
- Reorder suggestions
- Auto purchase request
- Low stock alert
- Supplier comparison
- Suggested purchase quantity
- Expected delivery date
- Purchase order linkage

10. Costing and Valuation
Create dashboard and reports for:
- FIFO
- LIFO
- Weighted Average Cost
- Standard Cost
- Inventory valuation
- COGS connection
- Stock value by warehouse
- Stock value by category
- Profit margin analysis

11. Reports and Analytics
Create report pages for:
- Stock on hand
- Inventory valuation report
- Inventory movement report
- Stock aging report
- Dead stock report
- Fast-moving items report
- Slow-moving items report
- Expiry report
- Warehouse performance report
- Transfer report
- Adjustment report

12. AI Inventory Assistant
Create an AI assistant panel inside the Inventory module that can:
- Predict demand
- Suggest reorder quantities
- Detect abnormal stock movements
- Identify dead stock
- Recommend stock transfers
- Predict stockout risk
- Summarize inventory performance
- Generate inventory reports automatically

13. Role-Based Permissions
Create permission UI for:
- Admin
- Inventory Manager
- Warehouse Supervisor
- Accountant
- Sales User
- Auditor

Permissions must include:
- View inventory
- Add item
- Edit item
- Delete item
- Approve stock adjustment
- Approve transfer
- View cost
- Export reports
- Perform stock count

Database Schema Design:
Create a visual database schema section with the following tables:

users
- id
- name
- email
- role_id
- status
- created_at

roles
- id
- name
- description

permissions
- id
- code
- name
- module

role_permissions
- id
- role_id
- permission_id

items
- id
- sku
- barcode
- name
- description
- category_id
- brand
- unit_id
- cost_price
- selling_price
- tax_rate
- reorder_point
- min_stock
- max_stock
- tracking_type
- status
- created_at
- updated_at

item_images
- id
- item_id
- image_url

categories
- id
- parent_id
- name
- description

units
- id
- name
- symbol

warehouses
- id
- name
- code
- branch_id
- manager_id
- address
- capacity
- status

warehouse_locations
- id
- warehouse_id
- zone
- rack
- shelf
- bin
- capacity

stock_balances
- id
- item_id
- warehouse_id
- location_id
- quantity_available
- quantity_reserved
- quantity_on_hand
- average_cost

stock_movements
- id
- movement_number
- movement_type
- item_id
- source_warehouse_id
- destination_warehouse_id
- quantity
- unit_cost
- total_cost
- status
- reference_type
- reference_id
- created_by
- approved_by
- created_at
- approved_at

stock_transfer_requests
- id
- transfer_number
- source_warehouse_id
- destination_warehouse_id
- status
- requested_by
- approved_by
- dispatched_at
- received_at
- created_at

stock_transfer_items
- id
- transfer_id
- item_id
- requested_quantity
- dispatched_quantity
- received_quantity

inventory_counts
- id
- count_number
- warehouse_id
- count_type
- status
- created_by
- approved_by
- created_at

inventory_count_items
- id
- count_id
- item_id
- system_quantity
- counted_quantity
- variance_quantity
- variance_value

batches
- id
- item_id
- batch_number
- manufacturing_date
- expiry_date
- quantity
- warehouse_id
- status

serial_numbers
- id
- item_id
- serial_number
- warehouse_id
- status
- warranty_expiry

suppliers
- id
- name
- contact_person
- phone
- email
- address
- status

purchase_requests
- id
- request_number
- supplier_id
- status
- requested_by
- approved_by
- created_at

purchase_request_items
- id
- purchase_request_id
- item_id
- quantity
- expected_cost

inventory_alerts
- id
- alert_type
- item_id
- warehouse_id
- severity
- message
- status
- created_at

API Structure:
Create a section showing REST API endpoints for the Inventory module:

Authentication:
POST /api/auth/login
POST /api/auth/logout

Items:
GET /api/inventory/items
POST /api/inventory/items
GET /api/inventory/items/{id}
PUT /api/inventory/items/{id}
DELETE /api/inventory/items/{id}

Categories:
GET /api/inventory/categories
POST /api/inventory/categories
PUT /api/inventory/categories/{id}
DELETE /api/inventory/categories/{id}

Warehouses:
GET /api/inventory/warehouses
POST /api/inventory/warehouses
GET /api/inventory/warehouses/{id}
PUT /api/inventory/warehouses/{id}
DELETE /api/inventory/warehouses/{id}

Stock Balances:
GET /api/inventory/stock-balances
GET /api/inventory/stock-balances/item/{itemId}
GET /api/inventory/stock-balances/warehouse/{warehouseId}

Stock Movements:
GET /api/inventory/stock-movements
POST /api/inventory/stock-movements
GET /api/inventory/stock-movements/{id}
POST /api/inventory/stock-movements/{id}/approve
POST /api/inventory/stock-movements/{id}/reject

Transfers:
GET /api/inventory/transfers
POST /api/inventory/transfers
GET /api/inventory/transfers/{id}
POST /api/inventory/transfers/{id}/approve
POST /api/inventory/transfers/{id}/dispatch
POST /api/inventory/transfers/{id}/receive
POST /api/inventory/transfers/{id}/close

Inventory Counts:
GET /api/inventory/counts
POST /api/inventory/counts
GET /api/inventory/counts/{id}
POST /api/inventory/counts/{id}/approve
POST /api/inventory/counts/{id}/adjust

Batches:
GET /api/inventory/batches
POST /api/inventory/batches
GET /api/inventory/batches/{id}

Serial Numbers:
GET /api/inventory/serial-numbers
POST /api/inventory/serial-numbers
GET /api/inventory/serial-numbers/{id}

Reports:
GET /api/inventory/reports/stock-on-hand
GET /api/inventory/reports/valuation
GET /api/inventory/reports/movements
GET /api/inventory/reports/aging
GET /api/inventory/reports/fast-moving
GET /api/inventory/reports/slow-moving
GET /api/inventory/reports/dead-stock
GET /api/inventory/reports/expiry

AI:
POST /api/inventory/ai/demand-forecast
POST /api/inventory/ai/reorder-suggestions
POST /api/inventory/ai/stockout-risk
POST /api/inventory/ai/dead-stock-analysis
POST /api/inventory/ai/generate-report

Flutter UI Structure:
Create a visual app structure with the following folders:

lib/
  core/
    constants/
    theme/
    routing/
    permissions/
    api/
  modules/
    inventory/
      models/
        item_model.dart
        category_model.dart
        warehouse_model.dart
        stock_balance_model.dart
        stock_movement_model.dart
        transfer_model.dart
        inventory_count_model.dart
        batch_model.dart
        serial_number_model.dart
      services/
        inventory_api_service.dart
        inventory_ai_service.dart
      providers/
        inventory_provider.dart
        warehouse_provider.dart
        stock_movement_provider.dart
      screens/
        inventory_dashboard_screen.dart
        item_list_screen.dart
        item_form_screen.dart
        item_details_screen.dart
        warehouse_list_screen.dart
        warehouse_details_screen.dart
        stock_movement_screen.dart
        stock_transfer_screen.dart
        inventory_count_screen.dart
        batch_tracking_screen.dart
        serial_tracking_screen.dart
        inventory_reports_screen.dart
        inventory_ai_assistant_screen.dart
      widgets/
        inventory_kpi_card.dart
        stock_chart.dart
        item_table.dart
        warehouse_card.dart
        transfer_timeline.dart
        alert_panel.dart
        approval_status_badge.dart

UI Pages to Generate:
1. Inventory Dashboard
2. Item Master List
3. Add/Edit Item Form
4. Item Details Page
5. Category Management
6. Warehouse List
7. Warehouse Details
8. Stock Movement Page
9. Stock Transfer Workflow
10. Inventory Count Page
11. Batch Tracking Page
12. Serial Number Tracking Page
13. Reorder Suggestions Page
14. Inventory Reports Page
15. AI Inventory Assistant Page
16. Permission Management Page

Design Style:
Use a premium enterprise SaaS look:
- Sidebar with ERPX-AI logo
- Top navbar with search, notifications, profile
- Professional data tables
- Clean typography
- Rounded cards
- Soft shadows
- Blue, white, dark navy, and gray color palette
- Status badges
- Timeline components
- Charts and analytics cards
- Empty states
- Loading states
- Error states

Output Required:
Generate the complete Figma design for the Inventory module including:
- Full dashboard UI
- All screens listed above
- Database schema diagram
- API structure diagram
- Flutter folder architecture diagram
- User flow diagram
- Stock movement lifecycle diagram
- Permission matrix table
```
