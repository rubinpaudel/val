import { config } from "dotenv";
import { join } from "path";

// Load env from apps/server/.env relative to monorepo root
config({ path: join(import.meta.dir, "../../../../apps/server/.env") });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const PROBLEM_SOLUTION_FIT_DEFINITION = {
  type: "PROBLEM_SOLUTION_FIT",
  name: "Problem-Solution Fit",
  description:
    "Validates that your solution addresses a real, painful problem for a specific customer segment",
  taskTemplates: [
    {
      category: "TARGET_CUSTOMER",
      title: "Define target customer",
      description:
        "Who specifically will use this? Describe their role, industry, company size, or demographics.",
      helpText:
        "Be specific. 'Startups' is too broad. 'Solo founders with technical backgrounds building B2B SaaS' is better.",
      isRequired: true,
      priority: 1,
    },
    {
      category: "PROBLEM_STATEMENT",
      title: "Describe the core problem",
      description:
        "What specific pain point are they experiencing? What triggers this pain?",
      helpText:
        "Focus on the problem, not your solution. Describe what makes this painful.",
      isRequired: true,
      priority: 2,
    },
    {
      category: "CURRENT_WORKAROUNDS",
      title: "Explain current workarounds",
      description:
        "How are they solving this problem today? What tools, processes, or manual work do they use?",
      helpText:
        "Understanding existing solutions helps identify gaps and switching costs.",
      isRequired: true,
      priority: 3,
    },
    {
      category: "PAIN_FREQUENCY",
      title: "Rate problem frequency",
      description:
        "How often does this problem occur? (hourly, daily, weekly, monthly, quarterly)",
      helpText: "Higher frequency problems are generally better opportunities.",
      isRequired: true,
      priority: 4,
    },
    {
      category: "FINANCIAL_IMPACT",
      title: "Estimate financial impact",
      description:
        "What's the cost of this problem going unsolved? (time wasted, money lost, opportunities missed)",
      helpText:
        "Quantify if possible. '$5k/month in lost deals' is more compelling than 'costs them money'.",
      isRequired: true,
      priority: 5,
    },
  ],
  researchConfig: {
    searchQueries: ["problem_evidence", "competitor_analysis", "market_signals"],
    sourcesTarget: 15,
    maxDuration: 7200000, // 2 hours in ms
  },
  reportSchema: {
    sections: [
      "problemEvidence",
      "competitorAnalysis",
      "marketSignals",
      "recommendations",
    ],
  },
};

export async function seedFrameworkDefinitions() {
  console.log("Seeding framework definitions...");

  // Upsert Problem-Solution Fit framework
  const psfFramework = await prisma.frameworkDefinition.upsert({
    where: { type: PROBLEM_SOLUTION_FIT_DEFINITION.type },
    update: {
      name: PROBLEM_SOLUTION_FIT_DEFINITION.name,
      description: PROBLEM_SOLUTION_FIT_DEFINITION.description,
      taskTemplates: PROBLEM_SOLUTION_FIT_DEFINITION.taskTemplates,
      researchConfig: PROBLEM_SOLUTION_FIT_DEFINITION.researchConfig,
      reportSchema: PROBLEM_SOLUTION_FIT_DEFINITION.reportSchema,
    },
    create: {
      type: PROBLEM_SOLUTION_FIT_DEFINITION.type,
      name: PROBLEM_SOLUTION_FIT_DEFINITION.name,
      description: PROBLEM_SOLUTION_FIT_DEFINITION.description,
      taskTemplates: PROBLEM_SOLUTION_FIT_DEFINITION.taskTemplates,
      researchConfig: PROBLEM_SOLUTION_FIT_DEFINITION.researchConfig,
      reportSchema: PROBLEM_SOLUTION_FIT_DEFINITION.reportSchema,
    },
  });

  console.log(`Created/Updated framework: ${psfFramework.name} (${psfFramework.id})`);

  return { psfFramework };
}

// Run seed if executed directly
if (import.meta.main) {
  seedFrameworkDefinitions()
    .then(() => {
      console.log("Seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
