ALTER TABLE "ColoringPage" DROP COLUMN "difficulty";
DROP TYPE "Difficulty";
ALTER TABLE "ColoringPage" ALTER COLUMN "orientation" SET DEFAULT 'PORTRAIT';
