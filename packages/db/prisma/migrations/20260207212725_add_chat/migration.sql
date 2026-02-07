-- CreateEnum
CREATE TYPE "message_role" AS ENUM ('user', 'assistant');

-- CreateTable
CREATE TABLE "chat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "role" "message_role" NOT NULL,
    "parts" JSONB NOT NULL DEFAULT '[]',
    "textContent" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_userId_createdAt_idx" ON "chat"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "chat_projectId_idx" ON "chat"("projectId");

-- CreateIndex
CREATE INDEX "chat_deletedAt_idx" ON "chat"("deletedAt");

-- CreateIndex
CREATE INDEX "message_chatId_createdAt_idx" ON "message"("chatId", "createdAt" ASC);

-- AddForeignKey
ALTER TABLE "chat" ADD CONSTRAINT "chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat" ADD CONSTRAINT "chat_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
