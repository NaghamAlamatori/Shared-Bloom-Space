#!/bin/bash

# Prisma Setup Script for Shared Bloom Space
# This script helps you set up Prisma ORM

echo "🌸 Shared Bloom Space - Prisma Migration Setup 🌸"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  echo "Please ensure your .env file contains: DATABASE_URL=postgresql://..."
  exit 1
fi

echo "✅ DATABASE_URL is configured"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing Prisma dependencies..."
pnpm install
echo ""

# Step 2: Generate Prisma Client
echo "🔧 Step 2: Generating Prisma Client..."
pnpm run prisma:generate
echo ""

# Step 3: Ask user which migration approach they want
echo "🤔 Step 3: Choose migration approach:"
echo ""
echo "  1) Pull from existing database (introspect) - Recommended for existing DB"
echo "  2) Push schema to database (no migration files) - Quick sync"
echo "  3) Create migration files - For production-ready migrations"
echo "  4) Skip this step - I'll do it manually"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
  1)
    echo ""
    echo "📥 Introspecting database..."
    pnpm run prisma:pull
    echo ""
    echo "⚠️  Please review the generated schema.prisma and compare with the provided schema"
    ;;
  2)
    echo ""
    echo "📤 Pushing schema to database..."
    pnpm run prisma:push
    echo ""
    echo "✅ Schema pushed to database"
    ;;
  3)
    echo ""
    echo "📝 Creating migration..."
    read -p "Enter migration name (e.g., 'initial_from_drizzle'): " migration_name
    pnpm run prisma:migrate -- --name "$migration_name"
    echo ""
    echo "✅ Migration created"
    ;;
  4)
    echo ""
    echo "⏭️  Skipping migration step"
    ;;
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "🎉 Prisma setup complete!"
echo ""
echo "Next steps:"
echo "  1. Review the migration guide: PRISMA_MIGRATION_GUIDE.md"
echo "  2. Check code examples: MIGRATION_EXAMPLES.md"
echo "  3. Update your route files to use Prisma"
echo "  4. Test thoroughly before deploying"
echo ""
echo "Useful commands:"
echo "  pnpm run prisma:studio   - Open database GUI"
echo "  pnpm run prisma:generate - Regenerate client after schema changes"
echo "  pnpm run prisma:format   - Format schema file"
echo ""
