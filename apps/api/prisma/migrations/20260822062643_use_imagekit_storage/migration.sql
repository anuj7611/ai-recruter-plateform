/*
  Warnings:

  - You are about to drop the column `storageBucket` on the `resumes` table. All the data in the column will be lost.
  - You are about to drop the column `storageKey` on the `resumes` table. All the data in the column will be lost.
  - Added the required column `storageFileId` to the `resumes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storagePath` to the `resumes` table without a default value. This is not possible if the table is not empty.
  - Made the column `storageProvider` on table `resumes` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "resumes" DROP COLUMN "storageBucket",
DROP COLUMN "storageKey",
ADD COLUMN     "storageFileId" TEXT NOT NULL,
ADD COLUMN     "storagePath" TEXT NOT NULL,
ADD COLUMN     "storageUrl" TEXT,
ALTER COLUMN "storageProvider" SET NOT NULL,
ALTER COLUMN "storageProvider" SET DEFAULT 'imagekit';
