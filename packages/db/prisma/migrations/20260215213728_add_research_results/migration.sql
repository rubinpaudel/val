-- CreateEnum
CREATE TYPE "confidence_level" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "source_type" AS ENUM ('web_page', 'app_store', 'api_response', 'report', 'news_article');

-- CreateTable
CREATE TABLE "research_result" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "researchJobId" TEXT NOT NULL,
    "resultType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "confidence" "confidence_level" NOT NULL DEFAULT 'medium',
    "confidenceScore" DECIMAL(3,2),
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "agentType" "research_agent_type" NOT NULL,
    "agentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source" (
    "id" TEXT NOT NULL,
    "sourceType" "source_type" NOT NULL,
    "title" TEXT,
    "url" TEXT,
    "rawContent" TEXT,
    "extractedData" JSONB,
    "author" TEXT,
    "publishedAt" TIMESTAMP(3),
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "credibility" TEXT,
    "discoveredBy" TEXT NOT NULL,
    "searchQuery" TEXT,
    "urlHash" TEXT,
    "contentHash" TEXT,
    "screenshotUrl" TEXT,
    "archivedUrl" TEXT,

    CONSTRAINT "source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_citation" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "researchResultId" TEXT NOT NULL,
    "citedData" JSONB,
    "citedText" TEXT,
    "citationPage" INTEGER,
    "citationQuote" TEXT,
    "relevanceScore" DECIMAL(3,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_citation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "research_result_projectId_idx" ON "research_result"("projectId");

-- CreateIndex
CREATE INDEX "research_result_researchJobId_idx" ON "research_result"("researchJobId");

-- CreateIndex
CREATE INDEX "research_result_resultType_idx" ON "research_result"("resultType");

-- CreateIndex
CREATE INDEX "research_result_confidence_idx" ON "research_result"("confidence");

-- CreateIndex
CREATE UNIQUE INDEX "source_urlHash_key" ON "source"("urlHash");

-- CreateIndex
CREATE INDEX "source_sourceType_idx" ON "source"("sourceType");

-- CreateIndex
CREATE INDEX "source_retrievedAt_idx" ON "source"("retrievedAt");

-- CreateIndex
CREATE INDEX "source_urlHash_idx" ON "source"("urlHash");

-- CreateIndex
CREATE INDEX "source_citation_sourceId_idx" ON "source_citation"("sourceId");

-- CreateIndex
CREATE INDEX "source_citation_researchResultId_idx" ON "source_citation"("researchResultId");

-- AddForeignKey
ALTER TABLE "research_result" ADD CONSTRAINT "research_result_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_result" ADD CONSTRAINT "research_result_researchJobId_fkey" FOREIGN KEY ("researchJobId") REFERENCES "research_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_citation" ADD CONSTRAINT "source_citation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_citation" ADD CONSTRAINT "source_citation_researchResultId_fkey" FOREIGN KEY ("researchResultId") REFERENCES "research_result"("id") ON DELETE CASCADE ON UPDATE CASCADE;
