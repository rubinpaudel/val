import type { ValidationTask } from "../../modules/validation/validation.types";

export interface ResearchContext {
  projectDescription: string;
  tasks: ValidationTask[];
}

export function buildContextFromTasks(tasks: ValidationTask[]): string {
  return tasks
    .filter((t) => t.isCompleted && t.answer)
    .map((t) => `## ${t.title}\n${t.answer}`)
    .join("\n\n");
}

// Problem Evidence Research Prompt
export function buildProblemEvidencePrompt(context: ResearchContext): string {
  const taskContext = buildContextFromTasks(context.tasks);

  return `You are a startup validation researcher. Your task is to find evidence that validates (or invalidates) whether a real problem exists for this startup idea.

## Startup Idea
${context.projectDescription}

## Information Gathered from Founder
${taskContext}

## Research Objectives
Search for:
1. **Forum discussions** - Look for Reddit posts, Hacker News threads, Stack Overflow questions, or industry forums where people discuss this problem
2. **Product reviews** - Find reviews of existing solutions that mention frustrations, limitations, or unmet needs
3. **Social media** - Search Twitter/X, LinkedIn posts where professionals complain about or discuss this problem
4. **Community discussions** - Slack communities, Discord servers, Facebook groups related to the target audience

## What to Look For
- Evidence that people are actively experiencing this problem
- Intensity of pain (are people frustrated, or just mildly annoyed?)
- Frequency of discussion (is this a common topic or rare?)
- Willingness to pay signals (have people mentioned paying for solutions?)
- Workaround attempts (how are people currently solving this?)

## Output Format
Provide your findings in a structured format:
1. **Evidence Summary**: Brief overview of what you found
2. **Key Findings**: 3-5 most important pieces of evidence with sources
3. **Pain Intensity Assessment**: Low/Medium/High with justification
4. **Frequency Assessment**: Rare/Occasional/Common/Widespread
5. **Willingness to Pay Signals**: None/Weak/Moderate/Strong
6. **Concerns or Red Flags**: Any reasons to be cautious

Be specific and cite your sources. Include URLs where possible.`;
}

// Competitor Analysis Prompt
export function buildCompetitorAnalysisPrompt(context: ResearchContext): string {
  const taskContext = buildContextFromTasks(context.tasks);

  return `You are a startup validation researcher. Your task is to analyze the competitive landscape for this startup idea.

## Startup Idea
${context.projectDescription}

## Information Gathered from Founder
${taskContext}

## Research Objectives
Search for:
1. **Direct competitors** - Products/services that solve the exact same problem
2. **Indirect competitors** - Products that solve adjacent problems or are used as workarounds
3. **Failed attempts** - Startups that tried to solve this problem but failed (and why)
4. **Market leaders** - Who dominates this space and what's their weakness

## For Each Competitor, Find
- Company name and website
- What they do (one sentence)
- Pricing model
- Customer reviews/ratings
- Key strengths
- Key weaknesses or gaps
- Why customers love or hate them

## Output Format
1. **Market Overview**: Brief summary of the competitive landscape
2. **Direct Competitors**: List with details (max 5-7)
3. **Indirect Competitors/Workarounds**: What people use today
4. **Market Gaps**: What's missing in current solutions
5. **Differentiation Opportunities**: Where this startup could stand out
6. **Competitive Moat Assessment**: How defensible is this market

Include pricing information and review ratings where available. Be honest about the level of competition.`;
}

// Market Signals Prompt
export function buildMarketSignalsPrompt(context: ResearchContext): string {
  const taskContext = buildContextFromTasks(context.tasks);

  return `You are a startup validation researcher. Your task is to analyze market signals and timing for this startup idea.

## Startup Idea
${context.projectDescription}

## Information Gathered from Founder
${taskContext}

## Research Objectives
Search for:
1. **Search trends** - Is interest in this problem/solution growing, stable, or declining?
2. **Funding activity** - Have investors recently funded companies in this space?
3. **News coverage** - Are there recent articles about this problem or market?
4. **Industry reports** - Market size estimates, growth projections
5. **Technology enablers** - New technologies that make this solution more viable now

## What to Look For
- Google Trends data for relevant keywords
- Recent funding rounds in the space (last 12-24 months)
- Acquisitions that signal market interest
- Regulatory changes that create opportunities
- Technology shifts (AI, mobile, etc.) that enable new solutions

## Output Format
1. **Trend Analysis**: Is the market growing? Evidence?
2. **Funding Signals**: Recent investments in the space
3. **Timing Assessment**: Why now? What's changed?
4. **Market Size Indicators**: Any data on market size
5. **Technology Tailwinds**: What tech trends support this idea
6. **Risk Factors**: What could derail this market

Be data-driven. Include specific numbers, dates, and sources where possible.`;
}

// Report Synthesis Prompt
export function buildReportSynthesisPrompt(
  context: ResearchContext,
  problemEvidence: string,
  competitorAnalysis: string,
  marketSignals: string
): string {
  return `You are a startup validation analyst. Based on the research conducted, synthesize a final Problem-Solution Fit assessment report.

## Original Idea
${context.projectDescription}

## Research Findings

### Problem Evidence
${problemEvidence}

### Competitor Analysis
${competitorAnalysis}

### Market Signals
${marketSignals}

## Your Task
Synthesize all the research into a final assessment with:

1. **Overall Score (1-10)**: Based on all evidence
   - 1-3: Weak - Problem not validated, saturated market, or poor timing
   - 4-5: Below Average - Some concerns that need addressing
   - 6-7: Moderate - Promising but with notable risks
   - 8-9: Strong - Well-validated problem with good market opportunity
   - 10: Exceptional - Clear problem, gap in market, perfect timing

2. **Verdict**: STRONG, MODERATE, or WEAK

3. **Summary Points**: 3-5 key bullet points (both positive and negative)

4. **Detailed Analysis by Section**:
   - problemEvidence: { score (1-10), keyFindings, concerns }
   - competitorAnalysis: { score (1-10), keyFindings, concerns }
   - marketSignals: { score (1-10), keyFindings, concerns }

5. **Recommendations**: 3-5 actionable next steps for the founder

## Response Format
Respond with a JSON object:
{
  "summaryScore": 7,
  "summaryVerdict": "MODERATE",
  "summaryPoints": [
    "Point 1",
    "Point 2",
    "Point 3"
  ],
  "sections": {
    "problemEvidence": {
      "score": 8,
      "keyFindings": ["Finding 1", "Finding 2"],
      "concerns": ["Concern 1"]
    },
    "competitorAnalysis": {
      "score": 6,
      "keyFindings": ["Finding 1", "Finding 2"],
      "concerns": ["Concern 1"]
    },
    "marketSignals": {
      "score": 7,
      "keyFindings": ["Finding 1", "Finding 2"],
      "concerns": ["Concern 1"]
    }
  },
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2",
    "Recommendation 3"
  ]
}

Be balanced and honest. A good report identifies both opportunities and risks.`;
}
