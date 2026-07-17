-- CreateEnum
CREATE TYPE "OpenShiftStatus" AS ENUM ('open', 'claimed');

-- AlterTable
ALTER TABLE "DeptSetting" ADD COLUMN     "scheduleWindowEnd" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "scheduleWindowMessage" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "scheduleWindowStart" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Worker" ADD COLUMN     "annualLeaveBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "annualLeaveTaken" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "OpenShift" (
    "id" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "date" TEXT NOT NULL,
    "from" TEXT NOT NULL DEFAULT '',
    "to" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "status" "OpenShiftStatus" NOT NULL DEFAULT 'open',
    "ownerId" TEXT,
    "claimedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpenShift_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OpenShift" ADD CONSTRAINT "OpenShift_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenShift" ADD CONSTRAINT "OpenShift_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
