Add a professional “Register New Company” button to the ERPX-AI login page and build a complete company registration flow connected to Supabase.

Objective:
Transform the login page into a production-ready authentication entry point where existing users can log in, and new companies can register through a secure onboarding form. The registration form must save company and admin user data into Supabase and activate the user account correctly.

Main Requirements:

1. Login Page Update
- Add a clear button under the login form:
  “Register New Company”
- The button should open a new registration screen or modal.
- Keep the ERPX-AI premium futuristic UI design.
- The button must be responsive and visible on desktop, tablet, and mobile.
- Add smooth transition animation when opening the registration form.

2. Company Registration Form
Create a professional multi-step registration form with the following fields:

Step 1: Company Information
- Company Name
- Commercial Registration Number
- VAT Number
- Business Sector
- Company Size
- Country
- City
- Address
- Official Website

Step 2: Admin User Information
- Full Name
- Job Title
- Email
- Mobile Number
- Password
- Confirm Password

Step 3: Subscription & Account Setup
- Selected Plan: Trial / Monthly / Yearly
- Number of Branches
- Number of Users
- Required Modules:
  - Finance
  - HR
  - Inventory
  - POS
  - Reports
  - AI Assistant

Step 4: Review & Submit
- Show all entered data before submission.
- Add checkbox:
  “I agree to the Terms & Conditions and Privacy Policy”
- Add final submit button:
  “Create Company Account”

3. Supabase Integration
Connect the registration flow directly to Supabase.

On submit:
- Create the admin user using Supabase Auth.
- Save company data into the companies table.
- Save user profile data into the profiles/users table.
- Assign the admin role automatically.
- Link the admin user to the company.
- Save selected subscription plan.
- Save selected modules.
- Create the default company branch.
- Set account status as active or pending approval based on configuration.

4. Required Supabase Tables
Create or connect the following tables:

companies:
- id
- company_name
- commercial_registration_number
- vat_number
- business_sector
- company_size
- country
- city
- address
- website
- status
- created_at

profiles:
- id
- auth_user_id
- company_id
- full_name
- job_title
- email
- mobile
- role
- status
- created_at

roles:
- id
- name
- description

user_roles:
- id
- user_id
- role_id
- company_id

subscriptions:
- id
- company_id
- plan_name
- billing_cycle
- max_branches
- max_users
- status
- started_at
- created_at

company_modules:
- id
- company_id
- module_name
- is_enabled
- created_at

branches:
- id
- company_id
- branch_name
- city
- address
- status
- created_at

5. Authentication Logic
Use Supabase Auth only.

Implementation requirements:
- Use supabase.auth.signUp() to create the admin account.
- Use Supabase database insert queries to save company/profile/subscription/module/branch data.
- After successful registration, log the user in automatically or redirect to login.
- Display success message:
  “Company account created successfully.”
- If email confirmation is enabled, show:
  “Please verify your email to activate your account.”

6. Validation Rules
Add strong validation before submission:

Company:
- Company name is required.
- Commercial registration number is required.
- VAT number must be valid if provided.
- City and country are required.

Admin User:
- Full name is required.
- Email must be valid.
- Mobile number must be valid.
- Password must be at least 8 characters.
- Password must include uppercase, lowercase, number, and symbol.
- Confirm password must match password.

Subscription:
- Plan is required.
- Number of users must be greater than zero.
- Number of branches must be greater than zero.
- At least one module must be selected.

Terms:
- User must accept terms before submitting.

7. Error Handling
Handle all errors professionally:
- Email already exists
- Weak password
- Invalid company data
- Supabase connection failure
- Duplicate commercial registration number
- Missing required fields
- Unauthorized database insert
- RLS policy error

Show user-friendly error messages, not technical database errors.

8. Loading & Feedback States
Add:
- Loading spinner during submission
- Disabled submit button while processing
- Success toast notification
- Error toast notification
- Inline field validation messages
- Final confirmation screen after successful registration

9. Security Requirements
Important:
- Use only Supabase anon/public key on frontend.
- Never expose service_role key.
- Enable Row Level Security on all tables.
- Add secure RLS policies for company-based data isolation.
- Every company must only access its own data.
- Prevent users from accessing other companies’ records.
- Sanitize all input fields.
- Protect post-registration dashboard routes.

10. Multi-Tenant Logic
Each new registration must create an isolated company tenant.

Rules:
- Every company has a unique company_id.
- Every user must belong to one company_id.
- All business records must be filtered by company_id.
- Admin users can only manage their own company.
- Future employees created under the company must inherit the same company_id.

11. UI/UX Design Requirements
Design style:
- Modern SaaS enterprise layout
- Premium ERPX-AI identity
- Dark/Light mode support
- Clean form sections
- Stepper progress indicator
- Glassmorphism cards
- Professional icons
- Clear CTA buttons
- Mobile responsive layout
- Smooth animations
- Error states and success states

12. Post-Registration Redirect
After successful registration:
- Option A: Redirect user to dashboard if email confirmation is disabled.
- Option B: Redirect user to login page if email confirmation is enabled.
- Option C: Show confirmation page with instructions.

13. Code Quality Requirements
Use:
- React
- TypeScript
- Supabase JS Client
- React Hook Form
- Zod validation
- React Router
- Clean reusable components
- Centralized auth service
- Centralized Supabase service
- Proper error handling
- Type-safe interfaces

14. Final Deliverable
Generate clean, production-ready code for:
- Updated login page
- Register New Company button
- Company registration form
- Supabase signUp integration
- Database insert logic
- Validation schema
- Error handling
- Success handling
- Route protection after registration

The final result must be a professional, secure, multi-tenant company registration system connected directly to Supabase.