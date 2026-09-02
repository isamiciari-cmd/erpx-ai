Add a complete Purchases / Procurement Management module to ERPX-AI with global ERP-level functionality.

Purchases Module Features:

1. Purchases Dashboard

- Total purchases
- Monthly purchases
- Pending purchase requests
- Pending purchase orders
- Approved purchase orders
- Received purchases
- Supplier outstanding balance
- Purchase returns
- Top suppliers
- Purchases by category
- Purchases by branch
- Purchases by warehouse
- Budget utilization
- Cost saving analysis
- Late deliveries
- Purchase approval status

2. Supplier Management

- Supplier list
- Add/edit supplier
- Supplier profile
- Supplier code
- Company name
- Commercial registration number
- VAT number
- Contact person
- Phone
- Email
- Address
- Payment terms
- Credit limit
- Bank details
- Supplier rating
- Supplier performance
- Supplier balance
- Supplier transaction history

3. Purchase Requests

- Create purchase request
- Request number
- Requesting department
- Branch
- Warehouse
- Requested items
- Quantity
- Required date
- Priority
- Justification
- Attachments
- Approval workflow
- Status: Draft / Submitted / Approved / Rejected / Converted to RFQ / Converted to PO

4. Request for Quotation RFQ

- Create RFQ
- Select suppliers
- Linked purchase request
- Items and quantities
- Required delivery date
- RFQ deadline
- Supplier responses
- Price comparison
- Delivery time comparison
- Supplier score comparison
- Convert selected RFQ to purchase order

5. Purchase Orders

- Create purchase order
- PO number
- Supplier
- Branch
- Warehouse
- Items
- Quantity
- Unit cost
- Discount
- VAT
- Shipping cost
- Expected delivery date
- Payment terms
- Approval workflow
- Status: Draft / Sent / Approved / Partially Received / Fully Received / Cancelled / Closed
- Budget validation
- Contract linkage

6. Goods Receipt

- Receive goods against purchase order
- GRN number
- Supplier
- Warehouse
- Received items
- Ordered quantity
- Received quantity
- Damaged quantity
- Accepted quantity
- Batch number
- Serial number
- Expiry date
- Quality check status
- Auto-update Inventory stock
- Partial receipt support

7. Supplier Invoices

- Create supplier invoice
- Linked purchase order
- Linked goods receipt
- Invoice number
- Supplier
- Invoice date
- Due date
- Subtotal
- Discount
- VAT
- Total amount
- Payment status
- Three-way matching: PO vs GRN vs Invoice
- Finance integration
- Accounts payable posting

8. Supplier Payments

- Record supplier payment
- Payment method: Cash / Bank Transfer / Card / Online Payment
- Payment reference number
- Partial payment support
- Payment allocation to supplier invoices
- Supplier balance update
- Finance module integration

9. Purchase Returns

- Create purchase return
- Linked PO / GRN / supplier invoice
- Returned items
- Return reason
- Quantity returned
- Refund amount
- Debit note generation
- Deduct returned stock from Inventory
- Approval workflow

10. Purchase Contracts

- Supplier contracts
- Contract start date
- Contract end date
- Contract value
- Contracted items
- Contract pricing
- SLA terms
- Delivery terms
- Payment terms
- Contract renewal alerts
- Contract compliance tracking

11. Budget Control

- Department purchase budget
- Branch purchase budget
- Budget period
- Available budget
- Used budget
- Pending commitments
- Budget approval workflow
- Block purchase orders exceeding budget
- Budget variance report

12. Supplier Evaluation

- Delivery performance
- Price competitiveness
- Quality score
- Response time
- Return rate
- Compliance score
- Supplier rating dashboard
- Preferred supplier marking

13. Purchase Reports

- Purchase summary report
- Purchases by supplier
- Purchases by item
- Purchases by category
- Purchases by branch
- Purchase order status report
- Goods receipt report
- Supplier invoice aging
- Outstanding payables
- Supplier performance report
- Purchase return report
- Budget variance report
- Cost saving report

14. AI Procurement Assistant

- Suggest best supplier
- Predict purchase demand
- Detect abnormal purchase cost
- Recommend reorder purchases
- Compare supplier quotations
- Predict delivery delays
- Identify cost-saving opportunities
- Generate purchase reports automatically
- Alert for contract renewal
- Detect duplicate invoices

15. Purchase Permissions
    Roles:

- Admin
- Procurement Manager
- Purchase Officer
- Warehouse Supervisor
- Accountant
- Finance Manager
- Auditor

Permissions:

- View purchases dashboard
- Add supplier
- Edit supplier
- Delete supplier
- Create purchase request
- Approve purchase request
- Create RFQ
- Approve RFQ
- Create purchase order
- Approve purchase order
- Receive goods
- Create supplier invoice
- Approve supplier invoice
- Record supplier payment
- Create purchase return
- Approve purchase return
- View supplier prices
- View purchase costs
- Export purchase reports
- Manage purchase contracts
- Manage procurement budgets

Purchases Database Schema:

suppliers

- id
- supplier_code
- company_name
- commercial_registration
- vat_number
- contact_person
- phone
- email
- address
- payment_terms
- credit_limit
- bank_name
- iban
- supplier_rating
- balance
- status
- created_at
- updated_at

purchase_requests

- id
- request_number
- department_id
- branch_id
- warehouse_id
- priority
- required_date
- justification
- status
- requested_by
- approved_by
- created_at
- approved_at

purchase_request_items

- id
- purchase_request_id
- item_id
- requested_quantity
- estimated_cost
- notes

purchase_rfqs

- id
- rfq_number
- purchase_request_id
- deadline
- required_delivery_date
- status
- created_by
- created_at

purchase_rfq_suppliers

- id
- rfq_id
- supplier_id
- status
- response_date
- total_amount
- delivery_days
- notes

purchase_rfq_items

- id
- rfq_id
- supplier_id
- item_id
- quantity
- quoted_price
- discount
- tax_rate
- total

purchase_orders

- id
- po_number
- supplier_id
- purchase_request_id
- rfq_id
- branch_id
- warehouse_id
- status
- expected_delivery_date
- payment_terms
- subtotal
- discount_amount
- tax_amount
- shipping_cost
- total_amount
- budget_status
- created_by
- approved_by
- created_at
- approved_at

purchase_order_items

- id
- purchase_order_id
- item_id
- ordered_quantity
- received_quantity
- unit_cost
- discount
- tax_rate
- total

goods_receipts

- id
- grn_number
- purchase_order_id
- supplier_id
- warehouse_id
- status
- received_by
- quality_checked_by
- received_at
- created_at

goods_receipt_items

- id
- goods_receipt_id
- item_id
- ordered_quantity
- received_quantity
- damaged_quantity
- accepted_quantity
- batch_number
- serial_number
- expiry_date
- quality_status

supplier_invoices

- id
- invoice_number
- supplier_id
- purchase_order_id
- goods_receipt_id
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
- three_way_match_status
- created_by
- approved_by
- created_at

supplier_invoice_items

- id
- supplier_invoice_id
- item_id
- quantity
- unit_cost
- discount
- tax_rate
- total

supplier_payments

- id
- payment_number
- supplier_id
- supplier_invoice_id
- payment_method
- amount
- reference_number
- payment_date
- created_by

purchase_returns

- id
- return_number
- supplier_id
- purchase_order_id
- goods_receipt_id
- supplier_invoice_id
- reason
- status
- refund_amount
- created_by
- approved_by
- created_at

purchase_return_items

- id
- purchase_return_id
- item_id
- quantity
- unit_cost
- total

purchase_contracts

- id
- contract_number
- supplier_id
- start_date
- end_date
- contract_value
- payment_terms
- delivery_terms
- sla_terms
- status
- created_by
- created_at

purchase_contract_items

- id
- contract_id
- item_id
- contracted_price
- minimum_quantity
- maximum_quantity

purchase_budgets

- id
- department_id
- branch_id
- budget_period
- budget_amount
- used_amount
- committed_amount
- available_amount
- status

supplier_evaluations

- id
- supplier_id
- evaluation_period
- delivery_score
- quality_score
- price_score
- response_score
- compliance_score
- total_score
- evaluated_by
- created_at

Purchases API Structure:

GET /api/purchases/dashboard

GET /api/purchases/suppliers
POST /api/purchases/suppliers
GET /api/purchases/suppliers/{id}
PUT /api/purchases/suppliers/{id}
DELETE /api/purchases/suppliers/{id}

GET /api/purchases/requests
POST /api/purchases/requests
GET /api/purchases/requests/{id}
PUT /api/purchases/requests/{id}
POST /api/purchases/requests/{id}/submit
POST /api/purchases/requests/{id}/approve
POST /api/purchases/requests/{id}/reject
POST /api/purchases/requests/{id}/convert-to-rfq
POST /api/purchases/requests/{id}/convert-to-po

GET /api/purchases/rfqs
POST /api/purchases/rfqs
GET /api/purchases/rfqs/{id}
PUT /api/purchases/rfqs/{id}
POST /api/purchases/rfqs/{id}/send-to-suppliers
POST /api/purchases/rfqs/{id}/compare
POST /api/purchases/rfqs/{id}/convert-to-po

GET /api/purchases/orders
POST /api/purchases/orders
GET /api/purchases/orders/{id}
PUT /api/purchases/orders/{id}
POST /api/purchases/orders/{id}/approve
POST /api/purchases/orders/{id}/send
POST /api/purchases/orders/{id}/cancel
POST /api/purchases/orders/{id}/close

GET /api/purchases/goods-receipts
POST /api/purchases/goods-receipts
GET /api/purchases/goods-receipts/{id}
POST /api/purchases/goods-receipts/{id}/quality-check
POST /api/purchases/goods-receipts/{id}/post-to-inventory

GET /api/purchases/supplier-invoices
POST /api/purchases/supplier-invoices
GET /api/purchases/supplier-invoices/{id}
PUT /api/purchases/supplier-invoices/{id}
POST /api/purchases/supplier-invoices/{id}/three-way-match
POST /api/purchases/supplier-invoices/{id}/approve
POST /api/purchases/supplier-invoices/{id}/post-to-finance

GET /api/purchases/payments
POST /api/purchases/payments
GET /api/purchases/payments/{id}

GET /api/purchases/returns
POST /api/purchases/returns
GET /api/purchases/returns/{id}
POST /api/purchases/returns/{id}/approve
POST /api/purchases/returns/{id}/deduct-stock
POST /api/purchases/returns/{id}/generate-debit-note

GET /api/purchases/contracts
POST /api/purchases/contracts
GET /api/purchases/contracts/{id}
PUT /api/purchases/contracts/{id}
POST /api/purchases/contracts/{id}/renew

GET /api/purchases/budgets
POST /api/purchases/budgets
PUT /api/purchases/budgets/{id}
GET /api/purchases/budgets/validate

GET /api/purchases/supplier-evaluations
POST /api/purchases/supplier-evaluations
GET /api/purchases/supplier-evaluations/{supplierId}

GET /api/purchases/reports/summary
GET /api/purchases/reports/by-supplier
GET /api/purchases/reports/by-item
GET /api/purchases/reports/by-category
GET /api/purchases/reports/by-branch
GET /api/purchases/reports/order-status
GET /api/purchases/reports/goods-receipt
GET /api/purchases/reports/invoice-aging
GET /api/purchases/reports/outstanding-payables
GET /api/purchases/reports/supplier-performance
GET /api/purchases/reports/returns
GET /api/purchases/reports/budget-variance
GET /api/purchases/reports/cost-saving

POST /api/purchases/ai/best-supplier
POST /api/purchases/ai/demand-prediction
POST /api/purchases/ai/cost-anomaly
POST /api/purchases/ai/reorder-purchases
POST /api/purchases/ai/quotation-comparison
POST /api/purchases/ai/delivery-delay-risk
POST /api/purchases/ai/cost-saving-opportunities
POST /api/purchases/ai/duplicate-invoice-detection
POST /api/purchases/ai/generate-report

Flutter Purchases UI Structure:

lib/
modules/
purchases/
models/
supplier_model.dart
purchase_request_model.dart
rfq_model.dart
purchase_order_model.dart
goods_receipt_model.dart
supplier_invoice_model.dart
supplier_payment_model.dart
purchase_return_model.dart
purchase_contract_model.dart
purchase_budget_model.dart
supplier_evaluation_model.dart
services/
purchases_api_service.dart
purchases_ai_service.dart
providers/
purchases_provider.dart
supplier_provider.dart
purchase_order_provider.dart
supplier_invoice_provider.dart
screens/
purchases_dashboard_screen.dart
supplier_list_screen.dart
supplier_form_screen.dart
supplier_details_screen.dart
purchase_request_list_screen.dart
purchase_request_form_screen.dart
rfq_list_screen.dart
rfq_comparison_screen.dart
purchase_order_list_screen.dart
purchase_order_form_screen.dart
goods_receipt_screen.dart
supplier_invoice_screen.dart
supplier_payment_screen.dart
purchase_return_screen.dart
purchase_contracts_screen.dart
purchase_budget_screen.dart
supplier_evaluation_screen.dart
purchases_reports_screen.dart
purchases_ai_assistant_screen.dart
widgets/
purchases_kpi_card.dart
supplier_table.dart
purchase_order_status_badge.dart
rfq_comparison_table.dart
goods_receipt_table.dart
three_way_match_card.dart
supplier_rating_card.dart
budget_usage_chart.dart
approval_status_badge.dart

Purchases UI Pages to Generate:

1. Purchases Dashboard
2. Supplier List
3. Supplier Profile
4. Add/Edit Supplier Form
5. Purchase Request List
6. Purchase Request Builder
7. RFQ List
8. RFQ Comparison Page
9. Purchase Order List
10. Purchase Order Builder
11. Goods Receipt Page
12. Supplier Invoice Page
13. Supplier Payment Page
14. Purchase Returns Page
15. Purchase Contracts Page
16. Purchase Budget Control Page
17. Supplier Evaluation Page
18. Purchases Reports Page
19. AI Procurement Assistant Page
20. Purchases Permission Matrix

Important Integration Logic:

- Approved purchase orders must create pending commitments in Finance.
- Goods receipts must increase stock automatically in Inventory.
- Supplier invoices must create accounts payable entries in Finance.
- Supplier payments must update supplier balance and Finance cash/bank accounts.
- Purchase returns must deduct stock from Inventory and create debit notes.
- Reorder suggestions must connect with Inventory low-stock alerts.
- Purchase budgets must block or require approval for over-budget purchases.
- Supplier performance must be calculated from delivery, quality, returns, and pricing.
