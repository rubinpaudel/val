import type { TaskTemplate } from "../../modules/validation/validation.types";

export interface TaskGenerationInput {
  projectDescription: string;
  frameworkType: string;
  frameworkName: string;
  taskTemplates: TaskTemplate[];
}

export interface ExtractedInfo {
  category: string;
  extractedAnswer: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
}

export interface TaskGenerationResult {
  extractedInfo: ExtractedInfo[];
  tasksToCreate: {
    category: string;
    title: string;
    description: string;
    helpText: string | null;
    isRequired: boolean;
    priority: number;
    prefilledAnswer: string | null;
  }[];
}

export function buildTaskGenerationPrompt(input: TaskGenerationInput): string {
  const taskCategories = input.taskTemplates
    .map(
      (t) => `- ${t.category}: ${t.title}
  Description: ${t.description}`
    )
    .join("\n");

  return `You are analyzing a startup idea description to determine what information is already provided and what additional information is needed for a ${input.frameworkName} analysis.

## Project Description
${input.projectDescription}

## Required Information Categories
${taskCategories}

## Your Task
1. Analyze the project description and extract any information that matches the required categories
2. For each category, determine:
   - What information (if any) was provided
   - Your confidence level in the extraction (HIGH, MEDIUM, LOW, NONE)
3. Generate a list of tasks/questions that need to be asked for missing or unclear information

## Response Format
Respond with a JSON object in this exact format:
{
  "extractedInfo": [
    {
      "category": "CATEGORY_NAME",
      "extractedAnswer": "The information extracted from the description, or null if not found",
      "confidence": "HIGH" | "MEDIUM" | "LOW" | "NONE"
    }
  ],
  "analysis": {
    "targetCustomerClarity": "Brief assessment of how clearly the target customer is defined",
    "problemClarity": "Brief assessment of how clearly the problem is defined",
    "overallReadiness": "Brief assessment of how ready this description is for research"
  }
}

## Guidelines
- Be generous in extraction - if the description implies something, extract it
- HIGH confidence: Explicitly stated in the description
- MEDIUM confidence: Strongly implied or can be inferred with reasonable certainty
- LOW confidence: Weakly implied, may need confirmation
- NONE: Not mentioned or cannot be inferred
- For partial information, extract what's available and note the gaps

## Example
If the description says "mobile app for busy parents to track their kids' activities", you would extract:
- TARGET_CUSTOMER: "busy parents" (HIGH confidence)
- PROBLEM_STATEMENT: "need to track children's activities" (MEDIUM confidence - implied but not explicit about the pain)`;
}

export function buildTaskFilteringPrompt(
  extractedInfo: ExtractedInfo[],
  taskTemplates: TaskTemplate[]
): string {
  const infoSummary = extractedInfo
    .map(
      (info) =>
        `- ${info.category}: ${info.extractedAnswer || "Not provided"} (Confidence: ${info.confidence})`
    )
    .join("\n");

  const templates = taskTemplates
    .map(
      (t) => `{
  "category": "${t.category}",
  "title": "${t.title}",
  "description": "${t.description}",
  "helpText": ${t.helpText ? `"${t.helpText}"` : "null"},
  "isRequired": ${t.isRequired},
  "priority": ${t.priority}
}`
    )
    .join(",\n");

  return `Based on the information already extracted from a project description, determine which questions still need to be asked.

## Extracted Information
${infoSummary}

## Available Task Templates
[${templates}]

## Your Task
For each task template, decide:
1. If confidence is HIGH, the task can be pre-filled with the extracted answer
2. If confidence is MEDIUM, create the task but include the extracted answer as a suggested starting point
3. If confidence is LOW or NONE, create the task without a pre-filled answer

## Response Format
Respond with a JSON array of tasks to create:
{
  "tasks": [
    {
      "category": "CATEGORY_NAME",
      "title": "Task title",
      "description": "Task description",
      "helpText": "Help text or null",
      "isRequired": true/false,
      "priority": 1,
      "prefilledAnswer": "Extracted answer if confidence was HIGH, otherwise null",
      "skipTask": false,
      "skipReason": null
    }
  ]
}

Only set skipTask to true if confidence is HIGH AND the extracted information fully answers the question.`;
}
