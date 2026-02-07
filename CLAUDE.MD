## Project Overview

Val is an async AI-powered startup validation platform that helps entrepreneurs validate their projects through structured research while they focus on other priorities. Unlike instant validation tools, Val conducts deep, multi-hour research in the background and guides founders through an interactive Q&A process to shape the research.

## Core Concepts

### The Problem
Founders excel at generating ideas but struggle with project validation due to:

- Time investment required for proper market research
- Lack of structured validation frameworks
- No systematic way to track and compare multiple projects
- Pressure to build immediately (especially with AI coding tools making development trivial)

### The Solution
An AI assistant named Val that:

- Accepts fuzzy, incomplete startup project ideas (brain dumps)
- Identifies information gaps through intelligent questioning
- Conducts thorough research asynchronously (hours, not seconds)
- Produces structured validation reports across multiple frameworks
- Maintains a searchable repository of all validated projects

### Unique Differentiation

- Async-first: Research happens in the background (overnight), not instantly
- Conversational: Val asks clarifying questions before researching
- Iterative: Users shape the research through Q&A, not passive report consumption
- Project backlog: Manage multiple projects in different validation stages
- Framework-by-framework: Progressive depth (Problem-Solution Fit → Competitors → Value Prop)


## User Journey

### 1. Brain Dump

User submits fuzzy project idea:
"mobile app where you can braindump your startup ideas 
and your assistant in the background will research and 
validate your idea async while you work on other things"

### 2. Clarifying Questions

Val analyzes and responds:
"I need to understand your project better. Let me ask you a few questions:

1. Who specifically would use this? (solo founders, teams, etc.)
2. What are they using today to validate ideas?
3. What would make them switch from their current approach?
4. How urgent is this problem for them?
5. What's the financial impact of building the wrong thing?"

### 3. Research

User answers questions → Val starts research:
"Perfect! I'm researching your market now. I'll analyze:
- Problem evidence (forums, reviews, discussions)
- Existing solutions (competitors, alternatives)
- Market signals (trends, funding, timing)

Check back tomorrow morning for your report."

### 4. Report

Email notification: "Your research is ready!"

Report includes:

Problem-Solution Fit Analysis:
- 47 discussions found on Reddit about idea validation
- Average pain level: 8/10
- Current solutions rated 4.5/10 satisfaction

Current Solutions:
- ValidatorAI: instant reports, lacks depth
- DimeADozen: comprehensive but no iteration
- Manual research: time-consuming

Market Signals:
- Google Trends: "startup validation" +40% YoY
- 15 funding rounds in adjacent space (2024)
- Peak search interest: Sunday evenings

Assessment:
🟢 Real problem with validated pain
🟢 Current solutions have clear gaps
🔴 Competitive market (15+ tools)
⚠️  Differentiation must be clear

Recommendations:
1. Focus on async + conversational approach
2. Target bootstrapped founders (higher pain)
3. Launch with Problem-Solution Fit framework only

## Tech Stack

- Next.js
- TailwindCSS
- TypeScript
- React
- Node.js
- PostgreSQL
- Prisma
- Better-Auth
- tRPC
- Tanstack Query

### Project Structure

```
val/
├── apps/
│   ├── web/         # Frontend application (Next.js)
│   ├── native/      # Mobile application (React Native, Expo)
│   └── server/      # Backend API (Express, TRPC)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

### Best Practices

We use feature colocation to keep related files together in the frontend and backend.