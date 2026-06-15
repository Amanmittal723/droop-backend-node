-- AlterTable
ALTER TABLE "user_master" ADD COLUMN "user_mobile" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "user_master_user_mobile_key" ON "user_master"("user_mobile");
