import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";
import { EmbeddingProviderFactory } from "../src/infra/ai/embeddings/EmbeddingProviderFactory";

const prisma = new PrismaClient();

interface PaintData {
  name: string;
  color: string;
  colorHex: string;
  surfaceType: string;
  roomType: string;
  finish: string;
  features: string;
  line: string;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const embeddingProvider = EmbeddingProviderFactory.getProvider();

  if (!embeddingProvider.isAvailable()) {
    throw new Error("Provedor de embedding não está disponível");
  }

  try {
    return await embeddingProvider.generateEmbedding(text);
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

async function parseCSV(filePath: string): Promise<PaintData[]> {
  const csvContent = fs.readFileSync(filePath, "utf-8");
  const lines = csvContent.split("\n").filter((line) => line.trim());
  const headers = lines[0].split(",");

  const paints: PaintData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const paint: PaintData = {
      name: values[0]?.trim() || "",
      color: values[1]?.trim() || "",
      colorHex: values[2]?.trim() || "",
      surfaceType: values[3]?.trim() || "",
      roomType: values[4]?.trim() || "",
      finish: values[5]?.trim() || "",
      features: values[6]?.trim() || "",
      line: values[7]?.trim() || "",
    };

    // Only add if we have at least a name
    if (paint.name) {
      paints.push(paint);
    }
  }

  return paints;
}

async function createPaintText(paint: PaintData): Promise<string> {
  const parts = [
    paint.name,
    paint.color,
    paint.colorHex, // Include the hex color!
    paint.surfaceType,
    paint.roomType,
    paint.finish,
    paint.features,
    paint.line,
  ].filter((part) => part && part.trim());

  return parts.join(" ");
}

async function seedPaints() {
  try {
    console.log("🌱 Starting paint seeding...");

    // Check if embedding provider is available
    const embeddingProvider = EmbeddingProviderFactory.getProvider();
    if (!embeddingProvider.isAvailable()) {
      throw new Error("Provedor de embedding não está disponível");
    }

    // Parse CSV file
    const csvPath = path.join(process.cwd(), "data", "paints.csv");
    console.log(`📖 Reading paints from: ${csvPath}`);

    const paints = await parseCSV(csvPath);
    console.log(`📊 Found ${paints.length} paints to seed`);

    // Clear existing paints
    console.log("🗑️  Clearing existing paints...");
    await prisma.paint.deleteMany();

    // Seed paints with embeddings
    console.log("🚀 Seeding paints with embeddings...");

    for (let i = 0; i < paints.length; i++) {
      const paint = paints[i];
      console.log(
        `📝 Processing paint ${i + 1}/${paints.length}: ${paint.name}`
      );

      // Create text for embedding
      const paintText = await createPaintText(paint);
      console.log(`📝 Text for embedding: "${paintText}"`);

      // Generate embedding
      console.log(`🧠 Generating embedding for: ${paint.name}`);
      const embedding = await generateEmbedding(paintText);

      // Create paint record with embedding using raw SQL
      await prisma.$executeRaw`
        INSERT INTO paints (id, name, color, color_hex, surface_type, room_type, finish, features, line, embedding, created_at, updated_at)
        VALUES (${crypto.randomUUID()}, ${paint.name}, ${paint.color}, ${
        paint.colorHex
      }, ${paint.surfaceType}, ${paint.roomType}, ${paint.finish}, ${
        paint.features || null
      }, ${paint.line || null}, ${embedding}::vector, NOW(), NOW())
      `;

      console.log(`✅ Created paint: ${paint.name}`);

      // Add a small delay to avoid rate limiting
      if (i < paints.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(
      `🎉 Successfully seeded ${paints.length} paints with embeddings!`
    );
  } catch (error) {
    console.error("❌ Error seeding paints:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
if (require.main === module) {
  seedPaints()
    .then(() => {
      console.log("✅ Paint seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Paint seeding failed:", error);
      process.exit(1);
    });
}
