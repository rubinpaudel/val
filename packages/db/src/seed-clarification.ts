/**
 * Seed script to create a test project with questions (text, single_select, multi_select)
 * in "structured" status, ready for testing the clarification chat flow.
 *
 * Usage: bun run packages/db/src/seed-clarification.ts
 *
 * The script finds the first user in the DB and creates the project under them.
 * It cleans up any previously seeded test project (by title match) before creating fresh data.
 */

import prisma from "./index";

const TEST_PROJECT_TITLE = "[Test] Async Validation Platform";

async function seed() {
  // Find first user
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found in DB. Sign in first, then run this script.");
    process.exit(1);
  }
  console.log(`Using user: ${user.email} (${user.id})`);

  // Clean up previous test data
  const existing = await prisma.project.findFirst({
    where: { title: TEST_PROJECT_TITLE, userId: user.id },
  });
  if (existing) {
    await prisma.project.delete({ where: { id: existing.id } });
    console.log("Deleted previous test project");
  }

  // Create project
  const project = await prisma.project.create({
    data: {
      userId: user.id,
      title: TEST_PROJECT_TITLE,
      icon: "lightbulb",
      rawBraindump:
        "A mobile app where you can braindump your startup ideas and an AI assistant in the background will research and validate your idea async while you work on other things. It would ask you clarifying questions and then go off to do deep research overnight.",
      status: "structured",
    },
  });
  console.log(`Created project: ${project.id}`);

  // Create elements
  const elements = await Promise.all([
    prisma.projectElement.create({
      data: {
        projectId: project.id,
        elementType: "who",
        statedValue: "Solo founders and indie hackers who have many ideas but limited time to validate them",
        clarityScore: 4,
        missingInfo: ["team size preference", "technical vs non-technical founders"],
      },
    }),
    prisma.projectElement.create({
      data: {
        projectId: project.id,
        elementType: "problem",
        statedValue: "Founders waste weeks building products nobody wants because they skip proper validation",
        clarityScore: 5,
        missingInfo: ["current validation methods", "time spent on validation"],
      },
    }),
    prisma.projectElement.create({
      data: {
        projectId: project.id,
        elementType: "solution",
        statedValue: "AI-powered async validation that researches in the background while founders focus on building",
        clarityScore: 3,
        missingInfo: ["specific research outputs", "interaction model"],
      },
    }),
    prisma.projectElement.create({
      data: {
        projectId: project.id,
        elementType: "differentiation",
        statedValue: "Async-first approach vs instant AI validation tools",
        clarityScore: 3,
        missingInfo: ["competitor awareness", "unique value prop"],
      },
    }),
    prisma.projectElement.create({
      data: {
        projectId: project.id,
        elementType: "monetization",
        statedValue: "Not yet specified",
        clarityScore: 2,
        missingInfo: ["pricing model", "willingness to pay", "revenue targets"],
      },
    }),
  ]);
  console.log(`Created ${elements.length} elements`);

  // Create questions — mix of text, single_select, multi_select per category
  const questions = [
    // WHO questions
    {
      projectId: project.id,
      questionText: "Who specifically would use this product? Describe your ideal first 10 users.",
      level: "understand" as const,
      category: "who",
      whyAsking: "Understanding the exact user profile helps validate whether the problem is real for them",
      exampleAnswer: "Bootstrapped solo founders building SaaS products, typically technical, aged 25-40",
      isCritical: true,
      canSkip: false,
      answerFormat: "text",
      displayOrder: 0,
    },
    {
      projectId: project.id,
      questionText: "What type of founders are you primarily targeting?",
      level: "remember" as const,
      category: "who",
      whyAsking: "Different founder types have different validation needs and willingness to pay",
      isCritical: false,
      canSkip: true,
      answerFormat: "single_select",
      answerOptions: ["Solo founders", "Small teams (2-5)", "Startup studios", "Corporate innovation teams"],
      displayOrder: 1,
    },
    {
      projectId: project.id,
      questionText: "What is their technical background?",
      level: "remember" as const,
      category: "who",
      whyAsking: "Technical level affects how they approach validation and what tools they already use",
      isCritical: false,
      canSkip: true,
      answerFormat: "single_select",
      answerOptions: ["Technical (can code)", "Semi-technical", "Non-technical", "Mixed backgrounds"],
      displayOrder: 2,
    },

    // PROBLEM questions
    {
      projectId: project.id,
      questionText: "What are founders doing today to validate their ideas before building?",
      level: "analyze" as const,
      category: "problem",
      whyAsking: "Understanding current behavior reveals how painful the problem really is",
      exampleAnswer: "They Google competitors, ask friends, post on Reddit, or just start building and hope for the best",
      isCritical: true,
      canSkip: false,
      answerFormat: "text",
      displayOrder: 3,
    },
    {
      projectId: project.id,
      questionText: "How much time do founders typically spend on idea validation before starting to build?",
      level: "remember" as const,
      category: "problem",
      whyAsking: "Time investment reveals urgency and willingness to pay for a faster solution",
      isCritical: false,
      canSkip: true,
      answerFormat: "single_select",
      answerOptions: ["Less than a day", "A few days", "1-2 weeks", "More than 2 weeks"],
      displayOrder: 4,
    },

    // SOLUTION questions
    {
      projectId: project.id,
      questionText: "What would the ideal validation report look like? What sections or insights would it include?",
      level: "create" as const,
      category: "solution",
      whyAsking: "Defining the output helps scope the MVP and sets expectations",
      exampleAnswer: "Market size, competitor analysis, problem evidence from forums, and a go/no-go recommendation",
      isCritical: true,
      canSkip: false,
      answerFormat: "text",
      displayOrder: 5,
    },
    {
      projectId: project.id,
      questionText: "Which research frameworks should Val use for validation?",
      level: "evaluate" as const,
      category: "solution",
      whyAsking: "The framework choice determines the depth and usefulness of the output",
      isCritical: false,
      canSkip: true,
      answerFormat: "multi_select",
      answerOptions: [
        "Problem-Solution Fit",
        "Competitive Analysis",
        "Market Sizing (TAM/SAM/SOM)",
        "Value Proposition Canvas",
        "Jobs-to-be-Done",
      ],
      displayOrder: 6,
    },

    // DIFFERENTIATION questions
    {
      projectId: project.id,
      questionText: "What existing tools have you tried for idea validation, and what was missing?",
      level: "analyze" as const,
      category: "differentiation",
      whyAsking: "Knowing competitor gaps helps position the product uniquely",
      isCritical: true,
      canSkip: false,
      answerFormat: "text",
      displayOrder: 7,
    },
    {
      projectId: project.id,
      questionText: "What is the single most important differentiator for your product?",
      level: "evaluate" as const,
      category: "differentiation",
      whyAsking: "A clear differentiator is essential for positioning in a competitive market",
      isCritical: false,
      canSkip: true,
      answerFormat: "single_select",
      answerOptions: [
        "Async/overnight research (depth over speed)",
        "Conversational Q&A approach",
        "Multi-idea portfolio management",
        "Framework-by-framework progressive depth",
      ],
      displayOrder: 8,
    },

    // MONETIZATION questions
    {
      projectId: project.id,
      questionText: "How do you plan to make money from this product?",
      level: "apply" as const,
      category: "monetization",
      whyAsking: "Revenue model affects product design, pricing, and go-to-market strategy",
      exampleAnswer: "Freemium with 1 free validation per month, $29/mo for unlimited validations",
      isCritical: true,
      canSkip: false,
      answerFormat: "text",
      displayOrder: 9,
    },
    {
      projectId: project.id,
      questionText: "What pricing model feels right for this type of product?",
      level: "evaluate" as const,
      category: "monetization",
      whyAsking: "Pricing model impacts user acquisition and retention strategy",
      isCritical: false,
      canSkip: true,
      answerFormat: "single_select",
      answerOptions: ["Monthly subscription", "Per-validation credits", "Freemium + paid tier", "One-time purchase"],
      displayOrder: 10,
    },
  ];

  await prisma.question.createMany({ data: questions });
  console.log(`Created ${questions.length} questions`);

  const textCount = questions.filter((q) => q.answerFormat === "text").length;
  const singleCount = questions.filter((q) => q.answerFormat === "single_select").length;
  const multiCount = questions.filter((q) => q.answerFormat === "multi_select").length;
  console.log(`  ${textCount} text, ${singleCount} single_select, ${multiCount} multi_select`);

  console.log("\nDone! Project is in 'structured' status, ready for clarification testing.");
  console.log(`Project ID: ${project.id}`);

  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
