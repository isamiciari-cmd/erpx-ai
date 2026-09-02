انسخ هذا الجزء وأضفه لنفس Prompt الخاص بـ Figma:

```text
Add a complete Sales Management module to ERPX-AI with global ERP-level functionality.

Sales Module Features:

1. Sales Dashboard
- Total revenue
- Monthly sales
- Daily sales
- Sales growth
- Gross profit
- Net profit
- Sales by branch
- Sales by customer
- Sales by product
- Top-selling products
- Sales target achievement
- Pending invoices
- Overdue payments
- Sales pipeline
- Sales forecast

2. Customer Management
- Customer list
- Add/edit customer
- Customer profile
- Customer type: Individual / Company
- Commercial registration number
- VAT number
- Contact person
- Phone
- Email
- Address
- Credit limit
- Payment terms
- Customer balance
- Customer transaction history
- Customer sales performance

3. Sales Quotations
- Create quotation
- Quotation number
- Customer selection
- Products/services selection
- Quantity
- Unit price
- Discount
- VAT
- Total amount
- Expiry date
- Quotation status: Draft / Sent / Approved / Rejected / Expired
- Convert quotation to sales order

4. Sales Orders
- Create sales order
- Sales order number
- Customer
- Branch
- Warehouse
- Items
- Quantity
- Price
- Discount
- Tax
- Delivery date
- Payment terms
- Approval workflow
- Sales order status: Draft / Confirmed / Partially Delivered / Delivered / Cancelled
- Reserve stock automatically from Inventory

5. Invoicing
- Create invoice
- Invoice number
- Customer
- Linked sales order
- Items
- VAT calculation
- Discounts
- Shipping fees
- Total amount
- Payment status: Unpaid / Partially Paid / Paid / Overdue
- Invoice approval
- PDF invoice generation
- QR code for e-invoice
- ZATCA-ready invoice structure

6. Payments
- Record customer payment
- Payment method: Cash / Bank Transfer / Card / Online Payment
- Payment reference number
- Partial payment support
- Payment allocation to invoices
- Receipt generation
- Customer balance update
- Finance module integration

7. Sales Returns
- Return request
- Linked invoice/order
- Returned items
- Return reason
- Refund amount
- Restock returned items to Inventory
- Credit note generation
- Return approval workflow

8. Discounts and Promotions
- Discount rules
- Coupon codes
- Customer-specific pricing
- Product-specific discounts
- Branch-specific offers
- Date-based promotions
- Approval for large discounts

9. Price Lists
- Standard price list
- Wholesale price list
- Retail price list
- Customer-specific price list
- Branch price list
- Currency support
- Effective date and expiry date

10. Sales Targets and Commissions
- Sales targets by employee
- Sales targets by branch
- Monthly/quarterly/yearly targets
- Commission rules
- Commission percentage
- Commission calculation
- Link commissions with HR and Payroll

11. CRM and Pipeline
- Leads
- Opportunities
- Sales stages
- Expected deal value
- Probability percentage
- Follow-up reminders
- Sales activities
- Customer communication history
- Convert opportunity to quotation

12. POS Integration
- POS sales sync
- Branch sales tracking
- Cashier sales
- End-of-day closing
- Cash drawer reconciliation
- Auto inventory deduction
- Auto invoice generation

13. Sales Reports
- Sales summary report
- Revenue report
- Profitability report
- Sales by customer
- Sales by product
- Sales by branch
- Sales by employee
- Sales return report
- Invoice aging report
- Outstanding payments report
- Target achievement report
- Commission report

14. AI Sales Assistant
- Sales forecasting
- Customer buying behavior analysis
- Product recommendation
- Upselling suggestions
- Churn risk detection
- Best-selling product prediction
- Revenue anomaly detection
- Auto-generate sales reports
- Suggest discount strategies

15. Sales Permissions
Roles:
- Admin
- Sales Manager
- Sales Representative
- Accountant
- Cashier
- Auditor

Permissions:
- View sales dashboard
- Add customer
- Edit customer
- Delete customer
- Create quotation
- Approve quotation
- Create sales order
- Approve sales order
- Create invoice
- Approve invoice
- Record payment
- Issue refund
- Create return
- Approve return
- View profit margin
- Export reports
- Manage discounts
- Manage price lists

Sales Database Schema:

customers
- id
- customer_code
- name
- customer_type
- commercial_registration
- vat_number
- contact_person
- phone
- email
- address
- credit_limit
- payment_terms
- balance
- status
- created_at
- updated_at

sales_quotations
- id
- quotation_number
- customer_id
- status
- valid_until
- subtotal
- discount_amount
- tax_amount
- total_amount
- created_by
- approved_by
- created_at

sales_quotation_items
- id
- quotation_id
- item_id
- quantity
- unit_price
- discount
- tax_rate
- total

sales_orders
- id
- order_number
- customer_id
- quotation_id
- branch_id
- warehouse_id
- status
- delivery_date
- payment_terms
- subtotal
- discount_amount
- tax_amount
- total_amount
- created_by
- approved_by
- created_at

sales_order_items
- id
- sales_order_id
- item_id
- quantity
- reserved_quantity
- delivered_quantity
- unit_price
- discount
- tax_rate
- total

sales_invoices
- id
- invoice_number
- customer_id
- sales_order_id
- invoice_date
- due_date
- status
- payment_status
- subtotal
- discount_amount
- tax_amount
- total_amount
- paid_amount
- remaining_amount
- zatca_qr_code
- created_by
- approved_by
- created_at

sales_invoice_items
- id
- invoice_id
- item_id
- quantity
- unit_price
- discount
- tax_rate
- total

customer_payments
- id
- payment_number
- customer_id
- invoice_id
- payment_method
- amount
- reference_number
- payment_date
- created_by

sales_returns
- id
- return_number
- customer_id
- invoice_id
- reason
- status
- refund_amount
- created_by
- approved_by
- created_at

sales_return_items
- id
- return_id
- item_id
- quantity
- unit_price
- total

price_lists
- id
- name
- type
- currency
- effective_date
- expiry_date
- status

price_list_items
- id
- price_list_id
- item_id
- price

sales_targets
- id
- employee_id
- branch_id
- target_period
- target_amount
- achieved_amount
- commission_rate
- status

sales_leads
- id
- lead_number
- customer_name
- phone
- email
- source
- status
- assigned_to
- expected_value
- created_at

sales_opportunities
- id
- lead_id
- customer_id
- opportunity_name
- stage
- expected_value
- probability
- expected_close_date
- assigned_to
- status

Sales API Structure:

GET /api/sales/dashboard
GET /api/sales/customers
POST /api/sales/customers
GET /api/sales/customers/{id}
PUT /api/sales/customers/{id}
DELETE /api/sales/customers/{id}

GET /api/sales/quotations
POST /api/sales/quotations
GET /api/sales/quotations/{id}
PUT /api/sales/quotations/{id}
POST /api/sales/quotations/{id}/approve
POST /api/sales/quotations/{id}/reject
POST /api/sales/quotations/{id}/convert-to-order

GET /api/sales/orders
POST /api/sales/orders
GET /api/sales/orders/{id}
PUT /api/sales/orders/{id}
POST /api/sales/orders/{id}/approve
POST /api/sales/orders/{id}/reserve-stock
POST /api/sales/orders/{id}/deliver
POST /api/sales/orders/{id}/cancel

GET /api/sales/invoices
POST /api/sales/invoices
GET /api/sales/invoices/{id}
PUT /api/sales/invoices/{id}
POST /api/sales/invoices/{id}/approve
POST /api/sales/invoices/{id}/generate-pdf
POST /api/sales/invoices/{id}/generate-zatca-qr

GET /api/sales/payments
POST /api/sales/payments
GET /api/sales/payments/{id}

GET /api/sales/returns
POST /api/sales/returns
GET /api/sales/returns/{id}
POST /api/sales/returns/{id}/approve
POST /api/sales/returns/{id}/refund
POST /api/sales/returns/{id}/restock

GET /api/sales/price-lists
POST /api/sales/price-lists
PUT /api/sales/price-lists/{id}

GET /api/sales/targets
POST /api/sales/targets
PUT /api/sales/targets/{id}

GET /api/sales/leads
POST /api/sales/leads
PUT /api/sales/leads/{id}
POST /api/sales/leads/{id}/convert-to-opportunity

GET /api/sales/opportunities
POST /api/sales/opportunities
PUT /api/sales/opportunities/{id}
POST /api/sales/opportunities/{id}/convert-to-quotation

GET /api/sales/reports/summary
GET /api/sales/reports/revenue
GET /api/sales/reports/profitability
GET /api/sales/reports/by-customer
GET /api/sales/reports/by-product
GET /api/sales/reports/by-branch
GET /api/sales/reports/by-employee
GET /api/sales/reports/returns
GET /api/sales/reports/invoice-aging
GET /api/sales/reports/outstanding-payments
GET /api/sales/reports/targets
GET /api/sales/reports/commissions

POST /api/sales/ai/forecast
POST /api/sales/ai/customer-behavior
POST /api/sales/ai/product-recommendations
POST /api/sales/ai/churn-risk
POST /api/sales/ai/revenue-anomaly
POST /api/sales/ai/generate-report

Flutter Sales UI Structure:

lib/
  modules/
    sales/
      models/
        customer_model.dart
        quotation_model.dart
        sales_order_model.dart
        invoice_model.dart
        payment_model.dart
        sales_return_model.dart
        price_list_model.dart
        sales_target_model.dart
        lead_model.dart
        opportunity_model.dart
      services/
        sales_api_service.dart
        sales_ai_service.dart
      providers/
        sales_provider.dart
        customer_provider.dart
        quotation_provider.dart
        invoice_provider.dart
      screens/
        sales_dashboard_screen.dart
        customer_list_screen.dart
        customer_form_screen.dart
        customer_details_screen.dart
        quotation_list_screen.dart
        quotation_form_screen.dart
        sales_order_list_screen.dart
        sales_order_form_screen.dart
        invoice_list_screen.dart
        invoice_form_screen.dart
        payment_screen.dart
        sales_return_screen.dart
        price_list_screen.dart
        sales_targets_screen.dart
        crm_pipeline_screen.dart
        sales_reports_screen.dart
        sales_ai_assistant_screen.dart
      widgets/
        sales_kpi_card.dart
        sales_chart.dart
        customer_table.dart
        quotation_status_badge.dart
        invoice_status_badge.dart
        payment_status_badge.dart
        pipeline_board.dart
        sales_target_progress.dart

Sales UI Pages to Generate:
1. Sales Dashboard
2. Customer List
3. Customer Profile
4. Add/Edit Customer Form
5. Quotation List
6. Quotation Builder
7. Sales Order List
8. Sales Order Form
9. Invoice List
10. Invoice Builder
11. Payment Collection Page
12. Sales Returns Page
13. Price Lists Page
14. Sales Targets Page
15. CRM Pipeline Board
16. Sales Reports Page
17. AI Sales Assistant Page
18. Sales Permission Matrix

Important Integration Logic:
- Sales Orders must reserve stock from Inventory.
- Delivered sales must deduct stock automatically.
- Invoices must post accounting entries to Finance.
- Payments must update customer balance and Finance.
- Sales returns must update Inventory and create credit notes.
- Sales commissions must connect to HR and Payroll.
- POS transactions must sync automatically with Sales and Inventory.
```
