/*
  Warnings:

  - You are about to drop the column `bonus` on the `Bookmaker` table. All the data in the column will be lost.
  - You are about to drop the column `expectedValue` on the `Bookmaker` table. All the data in the column will be lost.
  - You are about to drop the column `bizumReceived` on the `Operation` table. All the data in the column will be lost.
  - You are about to drop the column `bonusType` on the `Operation` table. All the data in the column will be lost.
  - You are about to drop the column `bookmaker` on the `Operation` table. All the data in the column will be lost.
  - You are about to drop the column `paidToPerson` on the `Operation` table. All the data in the column will be lost.
  - Added the required column `bonusType` to the `Bookmaker` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxBonus` to the `Bookmaker` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxDeposit` to the `Bookmaker` table without a default value. This is not possible if the table is not empty.
  - Added the required column `minDeposit` to the `Bookmaker` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Bookmaker` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookmakerId` to the `Operation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Bet" ADD COLUMN     "betNumber" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Bookmaker" DROP COLUMN "bonus",
DROP COLUMN "expectedValue",
ADD COLUMN     "bonusPercentage" DOUBLE PRECISION NOT NULL DEFAULT 100,
ADD COLUMN     "bonusType" TEXT NOT NULL,
ADD COLUMN     "daysFreebetValid" INTEGER,
ADD COLUMN     "daysToDeposit" INTEGER,
ADD COLUMN     "daysToQualify" INTEGER,
ADD COLUMN     "freebetValue" DOUBLE PRECISION,
ADD COLUMN     "maxBonus" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "maxDeposit" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "maxOddsFreebet" DOUBLE PRECISION,
ADD COLUMN     "minDeposit" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "minOddsFreebet" DOUBLE PRECISION,
ADD COLUMN     "minOddsQualifying" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "numDeposits" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "numFreebets" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "numQualifying" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "promoCode" TEXT,
ADD COLUMN     "sameEvent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Operation" DROP COLUMN "bizumReceived",
DROP COLUMN "bonusType",
DROP COLUMN "bookmaker",
DROP COLUMN "paidToPerson",
ADD COLUMN     "bizumSent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "bookmakerId" TEXT NOT NULL,
ADD COLUMN     "commissionPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "moneyReturned" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "commission" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "depositNum" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_bookmakerId_fkey" FOREIGN KEY ("bookmakerId") REFERENCES "Bookmaker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
