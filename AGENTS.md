# ERPX-AI Project - Agent Instructions

## Project Location
**The actual project is at: `C:\Users\LENOVO\erpx-ai\`**
- The workspace directory `C:\isamiciari-cmd\erpx-ai` is EMPTY - do not use it

## Project Structure
- **Frontend**: React + TypeScript + Vite at `C:\Users\LENOVO\erpx-ai\`
- **Mobile**: React Native (Expo) at `C:\Users\LENOVO\erpx-ai\ERPX\`

## Key Files Modified (Button Fixes)
All buttons across the system have been verified and fixed with proper onClick handlers:

### Web (React/TypeScript)
- `src/app/layout/Topbar.tsx` - AI Assistant, View All Notifications buttons
- `src/app/pages/DashboardPage.tsx` - Export, AI Report, Auto/Predicted toggle, Apply Recommendation, HVAC adjust buttons
- `src/app/pages/cashier/CashierPOSPage.tsx` - Print, Scan buttons
- `src/app/pages/LandingPage.tsx` - Watch Video button
- `src/app/pages/ExecutiveDashboard.tsx` - VAT Report, Quick Actions, Report Cards, Invoice Actions, Filter, Invoice Builder buttons
- `src/app/pages/bms/EnergyPage.tsx` - Export Report button
- `src/app/pages/bms/CCTVLivePage.tsx` - Settings button
- `src/app/pages/EmployeesPage.tsx` - Edit button
- `src/app/pages/FoodDeliveryDashboard.tsx` - View All buttons (2)
- `src/app/pages/InventoryPage.tsx` - Refresh button
- `src/app/pages/InventoryPageNew.tsx` - Export, Filter buttons
- `src/app/pages/finance/*` - All finance pages (Budget, AIFinance, Accounts Receivable, Cash Bank, Expense, Financial Reports, Accounts Payable, Fixed Assets, General Ledger, Trial Balance, VAT Tax, Journal Entries)
- `src/app/pages/hr/*` - All HR pages (Employee List, Attendance, HR Dashboard, Leave Management, Recruitment, Payroll, AI HR Assistant)
- `src/app/pages/PurchasesPage.tsx` - Export, New Request, Approve/Reject buttons
- `src/app/pages/StudioPage.tsx` - Submit button

### Mobile (React Native)
- `ERPX/app/(auth)/login.tsx` - Forgot Password, Register buttons

## Commands
```bash
cd C:\Users\LENOVO\erpx-ai
pnpm install
pnpm run dev
```

## Notes
- No tsconfig.json in root - TypeScript compilation not available
- Use `pnpm run build` to validate changes compile
- Project uses motion/react for animations
- All motion.button and button elements now have onClick handlers