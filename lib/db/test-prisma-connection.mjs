import { PrismaClient } from "./node_modules/.prisma/client/index.js";

const prisma = new PrismaClient();

async function testConnection() {
  console.log("🧪 Testing Prisma connection...\n");

  try {
    // Test database connection
    await prisma.$connect();
    console.log("✅ Database connection successful!");

    // Count users
    const userCount = await prisma.user.count();
    console.log(`📊 Users in database: ${userCount}`);

    // Count bloom spaces
    const bloomSpaceCount = await prisma.bloomSpace.count();
    console.log(`🌸 Bloom spaces in database: ${bloomSpaceCount}`);

    // Count all tables
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.bloomSpace.count(),
      prisma.member.count(),
      prisma.event.count(),
      prisma.memory.count(),
      prisma.note.count(),
      prisma.task.count(),
      prisma.bloomFlower.count(),
      prisma.focusSession.count(),
    ]);

    console.log("\n📈 Database Statistics:");
    console.log(`   Users: ${counts[0]}`);
    console.log(`   Bloom Spaces: ${counts[1]}`);
    console.log(`   Members: ${counts[2]}`);
    console.log(`   Events: ${counts[3]}`);
    console.log(`   Memories: ${counts[4]}`);
    console.log(`   Notes: ${counts[5]}`);
    console.log(`   Tasks: ${counts[6]}`);
    console.log(`   Bloom Flowers: ${counts[7]}`);
    console.log(`   Focus Sessions: ${counts[8]}`);

    console.log("\n✨ Prisma is working perfectly!");
    console.log("\n📚 Next steps:");
    console.log("   1. Read: lib/db/PRISMA_README.md");
    console.log("   2. Check: lib/db/MIGRATION_EXAMPLES.md");
    console.log("   3. Update your route files to use Prisma");
    
  } catch (error) {
    console.error("❌ Error testing Prisma connection:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
