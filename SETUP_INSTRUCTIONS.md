# ERPX-AI Setup Instructions

## Files You Need to Copy

After cloning the repository, you need to copy these files from the Claude Code workspace to your local project:

### Core Configuration Files (Root Directory)

1. `package.json` - Dependencies and scripts
2. `vite.config.ts` - Vite configuration
3. `vercel.json` - Vercel deployment config
4. `.npmrc` - pnpm configuration
5. `tsconfig.json` - TypeScript configuration
6. `index.html` - HTML entry point

### Source Code (src/ directory)

Copy the entire `src/` folder containing:

- `src/app/` - All React components
- `src/lib/` - Utilities and validation
- `src/services/` - API services
- `src/contexts/` - React contexts
- `src/styles/` - CSS files
- `src/main.tsx` - Entry point

### Database (database/ directory)

Copy the entire `database/` folder containing:

- `DEPLOY_TO_SUPABASE.sql` - Main database schema
- `SEED_DATA.sql` - Sample data
- `CREATE_ADMIN_USER.sql` - Admin user setup
- `ADD_REGISTRATION_TABLES.sql` - Registration tables

### Public Assets (public/ directory)

Copy the `public/` folder if it exists

## After Copying Files

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Build to test:

   ```bash
   pnpm build
   ```

3. Commit and push:

   ```bash
   git add .
   git commit -m "Add complete ERPX-AI application with registration system"
   git push origin main
   ```

4. Vercel will auto-deploy!

## Environment Variables (Already in Vercel)

These should already be set in your Vercel dashboard:

- `VITE_SUPABASE_URL` = https://svxmlejmhlocsjjtftxd.supabase.co
- `VITE_SUPABASE_ANON_KEY` = (your anon key)

## Database Setup

Run these SQL files in Supabase SQL Editor (in order):

1. `DEPLOY_TO_SUPABASE.sql` - Creates all tables
2. `SEED_DATA.sql` - Adds sample data
3. `ADD_REGISTRATION_TABLES.sql` - Adds subscription tables
4. `CREATE_ADMIN_USER.sql` - Creates first admin user

## Testing

After deployment, visit:

- https://erpx-ai.com - Main site
- https://erpx-ai.com/register - Company registration
- https://erpx-ai.com/login - Login page
