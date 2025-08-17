/*
  Warnings:

  - You are about to drop the `paints` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."paints";

-- CreateTable
CREATE TABLE "public"."paints" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "color_hex" TEXT NOT NULL,
    "surface_type" TEXT NOT NULL,
    "room_type" TEXT NOT NULL,
    "finish" TEXT NOT NULL,
    "features" TEXT,
    "line" TEXT,
    "embedding" vector(1536),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paints_pkey" PRIMARY KEY ("id")
);
