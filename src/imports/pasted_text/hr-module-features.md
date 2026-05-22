Add a complete Human Resources (HRM) module to ERPX-AI with global ERP-level functionality.

HR Module Features:

1. HR Dashboard
- Total employees
- Active employees
- New hires
- Resignations
- Attendance rate
- Absenteeism rate
- Overtime hours
- Payroll cost
- Employees by department
- Employees by branch
- Contract expiry alerts
- Leave balance summary
- Performance overview
- HR alerts and notifications

2. Employee Management
- Employee list
- Add/edit employee
- Employee profile
- Employee ID
- Full name
- Nationality
- ID/Iqama number
- Passport details
- Job title
- Department
- Branch
- Manager
- Employment type (Full-time / Part-time / Contract)
- Hire date
- Contract start/end date
- Salary details
- Bank account details
- Contact information
- Address
- Emergency contact
- Documents (ID, contract, certificates)
- Employee status (Active / Terminated / On Leave)

3. Organizational Structure
- Company structure
- Branches
- Departments
- Teams
- Job roles
- Reporting hierarchy
- Org chart visualization

4. Attendance Management
- Clock-in / Clock-out
- Attendance logs
- Late arrivals
- Early departures
- Absences
- Shift schedules
- Flexible shifts
- Biometric integration
- Mobile attendance
- Geo-location tracking
- Attendance approval workflow

5. Leave Management
- Leave types (Annual / Sick / Unpaid / Emergency)
- Leave request
- Leave balance
- Leave approval workflow
- Leave calendar
- Holiday calendar
- Carry forward policy
- Leave encashment
- Leave history

6. Payroll Management
- Salary structure
- Basic salary
- Allowances (Housing, Transport, etc.)
- Deductions (Loans, Penalties, etc.)
- Overtime calculation
- Bonuses
- Payroll processing
- Payslip generation
- Payroll approval workflow
- Payroll posting to Finance
- Multi-branch payroll
- Multi-currency support

7. Contracts Management
- Employee contracts
- Contract templates
- Contract renewal
- Contract expiry alerts
- Contract version history
- Digital signature support

8. Recruitment Management (ATS)
- Job postings
- Candidates
- Applications
- CV upload
- Interview scheduling
- Interview feedback
- Candidate evaluation
- Hiring pipeline
- Offer letters
- Convert candidate to employee

9. Performance Management
- KPIs
- Performance reviews
- Review cycles
- Manager feedback
- Employee self-assessment
- Rating system
- Performance reports
- Promotion recommendations

10. Training and Development
- Training programs
- Courses
- Employee training records
- Certifications
- Training schedules
- Training feedback
- Skill tracking
- Development plans

11. Employee Self-Service (ESS)
- View profile
- Update personal info
- Request leave
- View payslips
- Submit expenses
- View attendance
- Submit requests
- Notifications

12. Overtime Management
- Overtime requests
- Overtime approval
- Overtime rules
- Overtime calculation
- Link overtime with payroll

13. Loans and Advances
- Employee loan request
- Loan approval
- Loan repayment schedule
- Salary deduction integration
- Loan balance tracking

14. Disciplinary Actions
- Warnings
- Penalties
- Violations
- Disciplinary records
- Approval workflow

15. HR Reports
- Employee report
- Attendance report
- Leave report
- Payroll report
- Overtime report
- Performance report
- Recruitment report
- Training report
- Employee turnover report

16. AI HR Assistant
- Predict employee turnover
- Analyze attendance patterns
- Suggest promotions
- Detect performance issues
- Recommend training programs
- Optimize workforce planning
- Predict hiring needs
- Generate HR reports automatically

17. HR Permissions
Roles:
- Admin
- HR Manager
- HR Officer
- Payroll Officer
- Department Manager
- Employee

Permissions:
- View employees
- Add employee
- Edit employee
- Delete employee
- Approve leave
- Approve attendance
- Process payroll
- Approve payroll
- View salaries
- Manage contracts
- Manage recruitment
- Manage performance
- Export HR reports

HR Database Schema:

employees
- id
- employee_code
- first_name
- last_name
- nationality
- id_number
- passport_number
- job_title
- department_id
- branch_id
- manager_id
- employment_type
- hire_date
- contract_start_date
- contract_end_date
- basic_salary
- bank_account
- email
- phone
- address
- emergency_contact
- status
- created_at
- updated_at

departments
- id
- name
- branch_id
- manager_id

job_roles
- id
- name
- description

attendance
- id
- employee_id
- date
- check_in
- check_out
- late_minutes
- early_leave_minutes
- status

shifts
- id
- name
- start_time
- end_time
- break_time

employee_shifts
- id
- employee_id
- shift_id
- effective_date

leave_types
- id
- name
- max_days
- carry_forward
- paid

leave_requests
- id
- employee_id
- leave_type_id
- start_date
- end_date
- total_days
- reason
- status
- approved_by
- created_at

payroll
- id
- employee_id
- payroll_period
- basic_salary
- allowances
- deductions
- overtime_amount
- bonus
- net_salary
- status
- processed_by
- approved_by
- created_at

contracts
- id
- employee_id
- contract_type
- start_date
- end_date
- salary
- status
- signed_at

candidates
- id
- full_name
- email
- phone
- position_applied
- status
- resume_url
- created_at

interviews
- id
- candidate_id
- interview_date
- interviewer_id
- feedback
- rating

performance_reviews
- id
- employee_id
- review_period
- rating
- feedback
- reviewed_by
- created_at

training_programs
- id
- name
- description
- start_date
- end_date

employee_training
- id
- employee_id
- training_id
- completion_status
- certificate_url

overtime_requests
- id
- employee_id
- date
- hours
- reason
- status
- approved_by

employee_loans
- id
- employee_id
- loan_amount
- remaining_balance
- monthly_deduction
- status

disciplinary_actions
- id
- employee_id
- action_type
- description
- action_date
- approved_by

HR API Structure:

GET /api/hr/dashboard

GET /api/hr/employees
POST /api/hr/employees
GET /api/hr/employees/{id}
PUT /api/hr/employees/{id}
DELETE /api/hr/employees/{id}

GET /api/hr/departments
POST /api/hr/departments
PUT /api/hr/departments/{id}

GET /api/hr/attendance
POST /api/hr/attendance/check-in
POST /api/hr/attendance/check-out

GET /api/hr/leaves
POST /api/hr/leaves
POST /api/hr/leaves/{id}/approve
POST /api/hr/leaves/{id}/reject

GET /api/hr/payroll
POST /api/hr/payroll/process
POST /api/hr/payroll/{id}/approve

GET /api/hr/contracts
POST /api/hr/contracts
PUT /api/hr/contracts/{id}

GET /api/hr/recruitment/candidates
POST /api/hr/recruitment/candidates
POST /api/hr/recruitment/{id}/schedule-interview

GET /api/hr/performance
POST /api/hr/performance

GET /api/hr/training
POST /api/hr/training

GET /api/hr/overtime
POST /api/hr/overtime
POST /api/hr/overtime/{id}/approve

GET /api/hr/loans
POST /api/hr/loans
POST /api/hr/loans/{id}/approve

GET /api/hr/disciplinary
POST /api/hr/disciplinary

GET /api/hr/reports/employees
GET /api/hr/reports/attendance
GET /api/hr/reports/payroll
GET /api/hr/reports/leaves

POST /api/hr/ai/turnover-prediction
POST /api/hr/ai/performance-analysis
POST /api/hr/ai/workforce-planning
POST /api/hr/ai/generate-report

Flutter HR UI Structure:

lib/
  modules/
    hr/
      models/
        employee_model.dart
        department_model.dart
        attendance_model.dart
        leave_model.dart
        payroll_model.dart
        contract_model.dart
        candidate_model.dart
        performance_model.dart
        training_model.dart
        overtime_model.dart
        loan_model.dart
      services/
        hr_api_service.dart
        hr_ai_service.dart
      providers/
        hr_provider.dart
        employee_provider.dart
        payroll_provider.dart
      screens/
        hr_dashboard_screen.dart
        employee_list_screen.dart
        employee_form_screen.dart
        employee_profile_screen.dart
        attendance_screen.dart
        leave_management_screen.dart
        payroll_screen.dart
        contracts_screen.dart
        recruitment_screen.dart
        performance_screen.dart
        training_screen.dart
        overtime_screen.dart
        loans_screen.dart
        disciplinary_screen.dart
        hr_reports_screen.dart
        hr_ai_assistant_screen.dart
      widgets/
        hr_kpi_card.dart
        employee_table.dart
        attendance_chart.dart
        leave_calendar.dart
        payroll_card.dart
        performance_chart.dart
        approval_status_badge.dart

HR UI Pages to Generate:
1. HR Dashboard
2. Employee List
3. Employee Profile
4. Add/Edit Employee Form
5. Attendance Page
6. Leave Management Page
7. Payroll Page
8. Contracts Page
9. Recruitment Page
10. Performance Page
11. Training Page
12. Overtime Page
13. Loans Page
14. Disciplinary Actions Page
15. HR Reports Page
16. AI HR Assistant Page
17. HR Permission Matrix

Important Integration Logic:
- Payroll must generate journal entries in Finance.
- Overtime must be included in payroll calculation.
- Employee loans must deduct from salary.
- Attendance must affect payroll (late/absence deductions).
- Leave must affect payroll and attendance.
- Recruitment must convert candidates into employees.
- Performance must impact promotions and salary adjustments.
- Expense claims must integrate with Finance expenses.
- Employee permissions must sync with system-wide access control.