import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedPaintsSimple() {
  try {
    console.log("🌱 Starting simple paint seeding...");

    // Clear existing paints
    console.log("🗑️  Clearing existing paints...");
    await prisma.paint.deleteMany();

    // Create a few test paints without embeddings
    const testPaints = [
      {
        name: "Test Paint 1",
        color: "Blue",
        colorHex: "#0000FF",
        surfaceType: "indoor",
        roomType: "bedroom",
        finish: "matte",
        features: "washable",
        line: "Test Line",
      },
      {
        name: "Test Paint 2",
        color: "Red",
        colorHex: "#FF0000",
        surfaceType: "outdoor",
        roomType: "garden",
        finish: "glossy",
        features: "weather resistant",
        line: "Test Line",
      },
      {
        name: "Test Paint 3",
        color: "Green",
        colorHex: "#00FF00",
        surfaceType: "indoor",
        roomType: "kitchen",
        finish: "semigloss",
        features: "stain resistant",
        line: "Test Line",
      },
    ];

    console.log("🚀 Creating test paints...");

    for (const paint of testPaints) {
      await prisma.paint.create({
        data: paint,
      });
      console.log(`✅ Created paint: ${paint.name}`);
    }

    console.log(`🎉 Successfully seeded ${testPaints.length} test paints!`);
  } catch (error) {
    console.error("❌ Error seeding paints:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
if (require.main === module) {
  seedPaintsSimple()
    .then(() => {
      console.log("✅ Simple paint seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Simple paint seeding failed:", error);
      process.exit(1);
    });
}
