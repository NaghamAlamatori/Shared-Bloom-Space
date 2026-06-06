@echo off
REM Prisma Setup Script for Shared Bloom Space (Windows)
REM This script helps you set up Prisma ORM

echo.
echo 🌸 Shared Bloom Space - Prisma Migration Setup 🌸
echo.

REM Check if DATABASE_URL is set
if "%DATABASE_URL%"=="" (
  echo ❌ Error: DATABASE_URL environment variable is not set
  echo Please ensure your .env file contains: DATABASE_URL=postgresql://...
  exit /b 1
)

echo ✅ DATABASE_URL is configured
echo.

REM Step 1: Install dependencies
echo 📦 Step 1: Installing Prisma dependencies...
call pnpm install
echo.

REM Step 2: Generate Prisma Client
echo 🔧 Step 2: Generating Prisma Client...
call pnpm run prisma:generate
echo.

REM Step 3: Ask user which migration approach they want
echo 🤔 Step 3: Choose migration approach:
echo.
echo   1) Pull from existing database (introspect) - Recommended for existing DB
echo   2) Push schema to database (no migration files) - Quick sync
echo   3) Create migration files - For production-ready migrations
echo   4) Skip this step - I'll do it manually
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
  echo.
  echo 📥 Introspecting database...
  call pnpm run prisma:pull
  echo.
  echo ⚠️  Please review the generated schema.prisma and compare with the provided schema
) else if "%choice%"=="2" (
  echo.
  echo 📤 Pushing schema to database...
  call pnpm run prisma:push
  echo.
  echo ✅ Schema pushed to database
) else if "%choice%"=="3" (
  echo.
  echo 📝 Creating migration...
  set /p migration_name="Enter migration name (e.g., 'initial_from_drizzle'): "
  call pnpm run prisma:migrate -- --name %migration_name%
  echo.
  echo ✅ Migration created
) else if "%choice%"=="4" (
  echo.
  echo ⏭️  Skipping migration step
) else (
  echo ❌ Invalid choice
  exit /b 1
)

echo.
echo 🎉 Prisma setup complete!
echo.
echo Next steps:
echo   1. Review the migration guide: PRISMA_MIGRATION_GUIDE.md
echo   2. Check code examples: MIGRATION_EXAMPLES.md
echo   3. Update your route files to use Prisma
echo   4. Test thoroughly before deploying
echo.
echo Useful commands:
echo   pnpm run prisma:studio   - Open database GUI
echo   pnpm run prisma:generate - Regenerate client after schema changes
echo   pnpm run prisma:format   - Format schema file
echo.

pause
