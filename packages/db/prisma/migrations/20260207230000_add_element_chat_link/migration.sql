-- AlterTable
ALTER TABLE "chat" ADD COLUMN     "elementId" TEXT;

-- CreateIndex
CREATE INDEX "chat_elementId_idx" ON "chat"("elementId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_elementId_deletedAt_key" ON "chat"("elementId", "deletedAt");

-- AddForeignKey
ALTER TABLE "chat" ADD CONSTRAINT "chat_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "project_element"("id") ON DELETE CASCADE ON UPDATE CASCADE;
