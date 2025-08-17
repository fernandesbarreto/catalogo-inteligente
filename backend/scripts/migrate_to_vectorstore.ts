import { PrismaClient } from "@prisma/client";
import { makePgVectorStore } from "../src/infra/ai/langchain/vectorstore/PgvectorStore";

async function migrateToVectorStore() {
  const prisma = new PrismaClient();

  try {
    console.log("Starting migration to vector store...");

    // Get all paints with embeddings using raw query
    const paints = await prisma.$queryRaw<Array<any>>`
      SELECT id, name, color, color_hex, surface_type, room_type, finish, features, line
      FROM paints 
      WHERE embedding IS NOT NULL
    `;

    console.log(`Found ${paints.length} paints with embeddings`);

    if (paints.length === 0) {
      console.log(
        "No paints with embeddings found. Please run the seed script first."
      );
      return;
    }

    // Initialize vector store
    const vectorStore = await makePgVectorStore();

    // Prepare documents for vector store
    const documents = paints.map((paint) => {
      const parts = [
        paint.name,
        paint.color,
        paint.colorHex,
        paint.surfaceType,
        paint.roomType,
        paint.finish,
        paint.features,
        paint.line,
      ].filter(part => part && part.trim()); // Filter out null, undefined, and empty strings
      
      return {
        pageContent: parts.join(" "),
        metadata: {
          id: paint.id,
          name: paint.name,
          color: paint.color,
          colorHex: paint.colorHex,
          surfaceType: paint.surfaceType,
          roomType: paint.roomType,
          finish: paint.finish,
          features: paint.features,
          line: paint.line,
        },
      };
    });

    console.log("Adding documents to vector store...");

    // Add documents to vector store
    await vectorStore.addDocuments(documents);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateToVectorStore();
