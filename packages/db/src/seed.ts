/**
 * Comprehensive seed script that creates 5 startup projects at different
 * pipeline stages: draft, structured, answered, researching, researched.
 *
 * Usage: pnpm db:seed (from packages/db)
 *
 * Finds the first user in the DB and creates all projects under them.
 * Cleans up previously seeded data (by [Seed] title prefix) before creating.
 */

import crypto from "node:crypto";
import prisma from "./index";

const SEED_PREFIX = "[Seed]";

// ─── Helpers ──────────────────────────────────────────────────────────

function configHash(config: Record<string, unknown>): string {
  const sorted = JSON.stringify(config, Object.keys(config).sort());
  return crypto.createHash("sha256").update(sorted).digest("hex");
}

function urlHash(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex");
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

// ─── Shared element + question helpers ────────────────────────────────

function makeElements(
  projectId: string,
  data: {
    who: { value: string; clarity: number; missing: string[] };
    problem: { value: string; clarity: number; missing: string[] };
    solution: { value: string; clarity: number; missing: string[] };
    differentiation: { value: string; clarity: number; missing: string[] };
    monetization: { value: string; clarity: number; missing: string[] };
  },
) {
  return (Object.entries(data) as [string, { value: string; clarity: number; missing: string[] }][]).map(
    ([type, d]) => ({
      projectId,
      elementType: type as "who" | "problem" | "solution" | "differentiation" | "monetization",
      statedValue: d.value,
      clarityScore: d.clarity,
      missingInfo: d.missing,
    }),
  );
}

type QuestionDef = {
  questionText: string;
  level: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";
  category: string;
  whyAsking: string;
  exampleAnswer?: string;
  isCritical: boolean;
  canSkip: boolean;
  answerFormat: string;
  answerOptions?: string[];
};

function makeQuestions(projectId: string, defs: QuestionDef[]) {
  return defs.map((d, i) => ({
    projectId,
    questionText: d.questionText,
    level: d.level,
    category: d.category,
    whyAsking: d.whyAsking,
    exampleAnswer: d.exampleAnswer ?? null,
    isCritical: d.isCritical,
    canSkip: d.canSkip,
    answerFormat: d.answerFormat,
    answerOptions: d.answerOptions ?? undefined,
    displayOrder: i,
  }));
}

// ─── Question definitions (reused across answered/researching/researched) ──

const PET_QUESTIONS: QuestionDef[] = [
  { questionText: "Who is the primary pet owner you are targeting?", level: "understand", category: "who", whyAsking: "Understanding the exact user profile helps validate whether the problem is real for them", exampleAnswer: "Millennial pet parents in urban areas who treat their pets like family members", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "What type of pets do your target users own?", level: "remember", category: "who", whyAsking: "Different pet types have very different health monitoring needs", isCritical: false, canSkip: true, answerFormat: "multi_select", answerOptions: ["Dogs", "Cats", "Birds", "Reptiles"] },
  { questionText: "What is the biggest challenge pet owners face with their pet's health?", level: "analyze", category: "problem", whyAsking: "Understanding the core pain point determines product-market fit", exampleAnswer: "Missing early warning signs because they lack veterinary training", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "How often do your target users visit the vet?", level: "remember", category: "problem", whyAsking: "Visit frequency reveals willingness to invest in pet health", isCritical: false, canSkip: true, answerFormat: "single_select", answerOptions: ["Only when sick", "Annually", "Every 6 months", "Quarterly or more"] },
  { questionText: "Describe the core feature that makes this product valuable.", level: "create", category: "solution", whyAsking: "A clear core feature helps scope the MVP", exampleAnswer: "AI photo analysis that flags potential skin conditions, weight changes, and behavioral anomalies", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "Which AI capabilities should the app include at launch?", level: "evaluate", category: "solution", whyAsking: "Scoping AI features prevents over-engineering the MVP", isCritical: false, canSkip: true, answerFormat: "multi_select", answerOptions: ["Photo-based symptom detection", "Behavior pattern tracking", "Diet recommendations", "Vet appointment reminders"] },
  { questionText: "What existing pet health apps have you tried?", level: "analyze", category: "differentiation", whyAsking: "Knowing competitor gaps helps position the product uniquely", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "What is your biggest advantage over existing solutions?", level: "evaluate", category: "differentiation", whyAsking: "A clear differentiator is essential for positioning", isCritical: false, canSkip: true, answerFormat: "single_select", answerOptions: ["AI-powered early detection", "Vet clinic integration", "Comprehensive health timeline", "Community-driven insights"] },
  { questionText: "How would you charge pet owners for this service?", level: "apply", category: "monetization", whyAsking: "Revenue model affects product design and go-to-market strategy", exampleAnswer: "Freemium with basic tracking free, $9.99/mo for AI analysis and vet integration", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "What price range feels right for a monthly subscription?", level: "evaluate", category: "monetization", whyAsking: "Price sensitivity determines viability of the business model", isCritical: false, canSkip: true, answerFormat: "single_select", answerOptions: ["$5-10/mo", "$10-20/mo", "$20-30/mo", "$30+/mo"] },
  { questionText: "Which additional revenue streams interest you?", level: "evaluate", category: "monetization", whyAsking: "Multiple revenue streams increase business resilience", isCritical: false, canSkip: true, answerFormat: "multi_select", answerOptions: ["Vet referral commissions", "Pet insurance partnerships", "Premium breed-specific content", "Pet product marketplace"] },
];

const INVOICE_QUESTIONS: QuestionDef[] = [
  { questionText: "Who specifically would use this product? Describe your ideal first 10 users.", level: "understand", category: "who", whyAsking: "Understanding the exact user profile helps validate whether the problem is real for them", exampleAnswer: "Solo developers and designers who invoice 2-5 clients monthly", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "What type of freelancers are you primarily targeting?", level: "remember", category: "who", whyAsking: "Different freelancer types have different invoicing needs and pain points", isCritical: false, canSkip: true, answerFormat: "single_select", answerOptions: ["Developers/Engineers", "Designers/Creatives", "Consultants/Coaches", "Writers/Content creators"] },
  { questionText: "What are freelancers doing today to manage invoicing?", level: "analyze", category: "problem", whyAsking: "Understanding current behavior reveals how painful the problem really is", exampleAnswer: "They use a mix of Google Sheets, PDF templates, and manual bank transfers", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "How much time do freelancers typically spend on invoicing per month?", level: "remember", category: "problem", whyAsking: "Time spent reveals urgency and willingness to pay for automation", isCritical: false, canSkip: true, answerFormat: "single_select", answerOptions: ["Less than 1 hour", "1-3 hours", "3-5 hours", "More than 5 hours"] },
  { questionText: "What would the ideal AI-powered invoice workflow look like?", level: "create", category: "solution", whyAsking: "Defining the ideal flow helps scope the MVP and set expectations", exampleAnswer: "Just describe the work done in natural language and the AI generates a professional invoice with correct rates and line items", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "Which integrations are most important at launch?", level: "evaluate", category: "solution", whyAsking: "Integration choices determine technical scope and partnership strategy", isCritical: false, canSkip: true, answerFormat: "multi_select", answerOptions: ["Stripe/PayPal payments", "QuickBooks/Xero accounting", "Bank account sync", "Slack/Email notifications"] },
  { questionText: "What existing invoicing tools have you tried, and what was missing?", level: "analyze", category: "differentiation", whyAsking: "Knowing competitor gaps helps position the product uniquely", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "What is the single most important differentiator?", level: "evaluate", category: "differentiation", whyAsking: "A clear differentiator is essential for positioning in a competitive market", isCritical: false, canSkip: true, answerFormat: "single_select", answerOptions: ["AI-generated invoices from conversations", "Automatic payment follow-ups", "Multi-currency with real-time rates", "Client relationship insights"] },
  { questionText: "How do you plan to make money from this product?", level: "apply", category: "monetization", whyAsking: "Revenue model affects product design, pricing, and go-to-market strategy", exampleAnswer: "Freemium: 3 free invoices/mo, $19/mo for unlimited + AI features", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "What pricing model feels right for this type of product?", level: "evaluate", category: "monetization", whyAsking: "Pricing model impacts user acquisition and retention strategy", isCritical: false, canSkip: true, answerFormat: "single_select", answerOptions: ["Monthly subscription", "Per-invoice fee", "Percentage of payments processed", "Freemium + paid tier"] },
  { questionText: "Which features justify a premium tier?", level: "evaluate", category: "monetization", whyAsking: "Premium features determine upgrade motivation and revenue ceiling", isCritical: false, canSkip: true, answerFormat: "multi_select", answerOptions: ["AI invoice generation", "Payment tracking & reminders", "Multi-currency support", "Tax report generation"] },
];

const INVOICE_ANSWERS = [
  { answerText: "Solo freelance developers and designers who invoice 2-5 clients monthly. They're technically savvy but hate administrative work. Typically aged 25-40, earning $50-150k/year." },
  { answerText: "Developers/Engineers" },
  { answerText: "Most use a messy combination of Google Docs templates, manual PayPal invoices, and spreadsheets to track who owes what. Some use FreshBooks but find it overkill for solo work." },
  { answerText: "1-3 hours" },
  { answerText: "After finishing a project milestone, just send a voice memo or type 'Invoice Acme Corp for 40 hours of React development at $150/hr' and the AI creates, sends, and tracks the invoice automatically." },
  { answerText: "Stripe/PayPal payments, Slack/Email notifications", answerData: ["Stripe/PayPal payments", "Slack/Email notifications"] },
  { answerText: "Tried FreshBooks (too complex for solo), Wave (free but clunky UI), and Bonsai (expensive for what it offers). None of them let me generate invoices from natural language or automatically follow up on late payments." },
  { answerText: "AI-generated invoices from conversations" },
  { answerText: "Freemium model: 5 free invoices per month to build the habit, $19/mo for unlimited invoices with AI generation, $39/mo for teams with multi-currency and accounting integrations." },
  { answerText: "Freemium + paid tier" },
  { answerText: "AI invoice generation, Payment tracking & reminders, Multi-currency support", answerData: ["AI invoice generation", "Payment tracking & reminders", "Multi-currency support"] },
];

const SAFETY_QUESTIONS: QuestionDef[] = [
  { questionText: "Who specifically would use this app? Describe your ideal early adopters.", level: "understand", category: "who", whyAsking: "Understanding the exact user profile helps validate whether the problem is real for them", exampleAnswer: "Urban residents, especially women and parents, who want real-time safety awareness in their neighborhood", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "What type of community are you primarily targeting?", level: "remember", category: "who", whyAsking: "Different communities have different safety concerns and communication patterns", isCritical: false, canSkip: true, answerFormat: "single_select", answerOptions: ["Dense urban neighborhoods", "Suburban communities", "College campuses", "Rural areas"] },
  { questionText: "What are people doing today to stay informed about neighborhood safety?", level: "analyze", category: "problem", whyAsking: "Understanding current behavior reveals how painful the problem really is", exampleAnswer: "Checking Nextdoor, local Facebook groups, or police blotters—all delayed and unreliable", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "How often do safety concerns affect your target users' daily decisions?", level: "remember", category: "problem", whyAsking: "Frequency reveals urgency and willingness to adopt a new solution", isCritical: false, canSkip: true, answerFormat: "single_select", answerOptions: ["Daily", "Several times a week", "Weekly", "Rarely"] },
  { questionText: "What would the ideal safety app experience look like?", level: "create", category: "solution", whyAsking: "Defining the ideal experience helps scope the MVP", exampleAnswer: "Real-time map with crowd-sourced incident reports, AI-predicted safe walking routes, and one-tap SOS to contacts", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "Which features are must-haves for the MVP?", level: "evaluate", category: "solution", whyAsking: "Feature prioritization prevents scope creep", isCritical: false, canSkip: true, answerFormat: "multi_select", answerOptions: ["Real-time incident map", "Walking route safety scores", "Emergency SOS button", "Push alert notifications"] },
  { questionText: "What existing safety apps have you tried, and what was missing?", level: "analyze", category: "differentiation", whyAsking: "Knowing competitor gaps helps position the product uniquely", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "What is the single most important differentiator?", level: "evaluate", category: "differentiation", whyAsking: "A clear differentiator is essential in a competitive market", isCritical: false, canSkip: true, answerFormat: "single_select", answerOptions: ["AI-predicted safety patterns", "Crowdsourced real-time reports", "Safe route planning", "Community trust network"] },
  { questionText: "How do you plan to monetize this app?", level: "apply", category: "monetization", whyAsking: "Revenue model affects product design and go-to-market strategy", exampleAnswer: "Free base app with premium safety features like real-time agent monitoring at $9.99/mo", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "What pricing model feels right?", level: "evaluate", category: "monetization", whyAsking: "Pricing model impacts user acquisition in a market where free alternatives exist", isCritical: false, canSkip: true, answerFormat: "single_select", answerOptions: ["Freemium", "Monthly subscription", "City/HOA licensing", "Ad-supported"] },
  { questionText: "Which premium features justify a paid tier?", level: "evaluate", category: "monetization", whyAsking: "Premium features determine upgrade motivation", isCritical: false, canSkip: true, answerFormat: "multi_select", answerOptions: ["24/7 safety monitoring agents", "Historical crime analytics", "Family location sharing", "Insurance discounts partnership"] },
];

const SAFETY_ANSWERS = [
  { answerText: "Urban residents aged 22-45, especially women walking alone and parents of young children. They're smartphone-native and already use location-based apps daily." },
  { answerText: "Dense urban neighborhoods" },
  { answerText: "They cobble together info from Nextdoor posts, local news, neighborhood Facebook groups, and word of mouth. Information is always delayed by hours or days, and there's no way to assess safety for a specific route at a specific time." },
  { answerText: "Daily" },
  { answerText: "Open the app before leaving home, see a real-time heat map of recent incidents on your route, get an AI-suggested safe alternative if needed, and have a one-tap SOS that alerts your emergency contacts with your live location." },
  { answerText: "Real-time incident map, Emergency SOS button, Push alert notifications", answerData: ["Real-time incident map", "Emergency SOS button", "Push alert notifications"] },
  { answerText: "Citizen is noisy with too many alerts for distant incidents. Nextdoor is delayed and full of unverified complaints. Life360 is family tracking, not safety intelligence. None of them help me plan safe walking routes." },
  { answerText: "AI-predicted safety patterns" },
  { answerText: "Free app for basic alerts and map. $9.99/mo premium for AI route safety, historical analytics, and 24/7 monitoring. Enterprise tier for property managers and campus security at $99/mo." },
  { answerText: "Freemium" },
  { answerText: "24/7 safety monitoring agents, Historical crime analytics, Family location sharing", answerData: ["24/7 safety monitoring agents", "Historical crime analytics", "Family location sharing"] },
];

const ROYALTY_QUESTIONS: QuestionDef[] = [
  { questionText: "Who specifically would use this platform? Describe your ideal first users.", level: "understand", category: "who", whyAsking: "Understanding the exact user profile helps validate whether the problem is real for them", exampleAnswer: "Independent musicians who collaborate with 2-5 other artists per track and struggle to split royalties fairly", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "What type of creators are you primarily targeting?", level: "remember", category: "who", whyAsking: "Different creator types have different royalty splitting needs", isCritical: false, canSkip: true, answerFormat: "single_select", answerOptions: ["Independent musicians", "Producers/beatmakers", "Podcast creators", "YouTube collaborators"] },
  { questionText: "What are creators doing today to split royalties?", level: "analyze", category: "problem", whyAsking: "Understanding current behavior reveals how painful the problem really is", exampleAnswer: "Informal agreements, spreadsheets, or manual PayPal transfers after royalty statements arrive months later", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "How often do royalty disputes cause problems between collaborators?", level: "remember", category: "problem", whyAsking: "Dispute frequency reveals the urgency of the problem", isCritical: false, canSkip: true, answerFormat: "single_select", answerOptions: ["Very often—it ruins relationships", "Frequently", "Occasionally", "Rarely"] },
  { questionText: "Describe the ideal royalty splitting workflow.", level: "create", category: "solution", whyAsking: "Defining the ideal flow helps scope the MVP", exampleAnswer: "Upload a track, tag collaborators, set split percentages in a smart contract, and royalties auto-distribute as they come in from streaming platforms", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "Which platform integrations are essential at launch?", level: "evaluate", category: "solution", whyAsking: "Integration scope determines technical complexity and partnership strategy", isCritical: false, canSkip: true, answerFormat: "multi_select", answerOptions: ["Spotify for Artists", "Apple Music for Artists", "YouTube Content ID", "SoundCloud"] },
  { questionText: "What existing royalty/distribution platforms have you tried?", level: "analyze", category: "differentiation", whyAsking: "Knowing competitor gaps helps position the product uniquely", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "What is the single most important differentiator?", level: "evaluate", category: "differentiation", whyAsking: "A clear differentiator is essential for positioning", isCritical: false, canSkip: true, answerFormat: "single_select", answerOptions: ["Automated smart contract splits", "Real-time royalty dashboard", "Dispute resolution system", "Multi-platform aggregation"] },
  { questionText: "How do you plan to make money from this platform?", level: "apply", category: "monetization", whyAsking: "Revenue model affects product design and go-to-market strategy", exampleAnswer: "Small percentage fee on royalty payouts (2-3%) plus optional premium features", isCritical: true, canSkip: false, answerFormat: "text" },
  { questionText: "What pricing model feels right?", level: "evaluate", category: "monetization", whyAsking: "Pricing model impacts adoption in a market sensitive to fees", isCritical: false, canSkip: true, answerFormat: "single_select", answerOptions: ["Percentage of royalties", "Monthly subscription", "Per-track fee", "Freemium"] },
  { questionText: "Which features justify premium pricing?", level: "evaluate", category: "monetization", whyAsking: "Premium features determine upgrade motivation and revenue ceiling", isCritical: false, canSkip: true, answerFormat: "multi_select", answerOptions: ["Smart contract automation", "Multi-platform royalty aggregation", "Tax reporting & 1099s", "Advance payment/loan features"] },
];

const ROYALTY_ANSWERS = [
  { answerText: "Independent hip-hop and electronic music producers who collaborate remotely with 2-5 artists per track. They release 1-3 tracks monthly and are frustrated by delayed, opaque royalty payments." },
  { answerText: "Producers/beatmakers" },
  { answerText: "Verbal agreements or DM screenshots, then manually splitting whatever arrives from DistroKid or TuneCore months later via Venmo or PayPal. Most have no written contracts." },
  { answerText: "Frequently" },
  { answerText: "Before uploading a track, add all collaborators by email, drag sliders to set split percentages, everyone confirms via the app, then royalties auto-distribute to each person's account as they accrue from Spotify/Apple/YouTube." },
  { answerText: "Spotify for Artists, Apple Music for Artists, YouTube Content ID", answerData: ["Spotify for Artists", "Apple Music for Artists", "YouTube Content ID"] },
  { answerText: "DistroKid has basic splits but no transparency or real-time tracking. Stem is good but expensive and geared toward labels. Splitchain was promising but shut down. None handle disputes well." },
  { answerText: "Automated smart contract splits" },
  { answerText: "2.5% fee on royalty payouts with no monthly subscription for basic use. $14.99/mo pro tier adds real-time analytics, tax reports, and advance payments." },
  { answerText: "Percentage of royalties" },
  { answerText: "Smart contract automation, Multi-platform royalty aggregation, Tax reporting & 1099s", answerData: ["Smart contract automation", "Multi-platform royalty aggregation", "Tax reporting & 1099s"] },
];

// ─── Competitor profile data ──────────────────────────────────────────

const CITIZEN_PROFILE = {
  status: "complete",
  name: "Citizen",
  url: "https://citizen.com",
  oneLiner: "Real-time safety alerts and incident tracking for cities",
  companyOverview: {
    foundedYear: 2016,
    headquarters: "New York, NY",
    teamSize: "200-500",
    totalFunding: "$133M",
    keyPeople: ["Andrew Frame (CEO)", "Ben Jealous (Board)"],
    description: "Citizen is a personal safety app that provides real-time 911 alerts, live incident video, and a communication platform for communities to stay informed about emergencies and crime in their area.",
  },
  product: {
    coreFeatures: ["Real-time 911 alerts", "Live incident map", "Safety broadcasts", "SOS button", "Citizen Plus safety agents"],
    targetAudience: "Urban residents concerned about personal safety",
    pricingModel: "Freemium",
    pricingTiers: [
      { name: "Free", price: "$0", features: ["Real-time alerts", "Incident map", "Safety broadcasts"] },
      { name: "Citizen Plus", price: "$19.99/mo", features: ["24/7 safety agents", "Identity protection", "Location sharing"] },
    ],
    platforms: ["iOS", "Android"],
  },
  traction: {
    estimatedUsers: "10M+",
    estimatedRevenue: "$50M ARR (estimated)",
    notableCustomers: [],
    appStoreRating: 4.2,
    reviewCount: 180000,
    productHuntUpvotes: null,
  },
  strengths: ["Massive user base in major cities", "Strong real-time data pipeline", "24/7 professional safety agents", "Deep 911 data integration"],
  weaknesses: ["Controversial privacy practices", "Limited to major US cities", "High false alarm rate causes alert fatigue", "Expensive premium tier"],
  marketPosition: {
    category: "Personal Safety",
    positionDescription: "Market leader in real-time urban safety alerts with the largest user base",
    differentiators: ["Real-time 911 feed integration", "Live video broadcasts from incidents", "Professional safety agents available 24/7"],
  },
};

const DISTROKID_PROFILE = {
  status: "complete",
  name: "DistroKid",
  url: "https://distrokid.com",
  oneLiner: "Music distribution service with basic royalty splitting",
  companyOverview: {
    foundedYear: 2013,
    headquarters: "New York, NY",
    teamSize: "50-100",
    totalFunding: "$100M+",
    keyPeople: ["Philip Kaplan (Founder & CEO)"],
    description: "DistroKid is a music distribution service that lets artists upload unlimited songs to Spotify, Apple Music, and other platforms for a flat annual fee. Includes basic royalty splitting features.",
  },
  product: {
    coreFeatures: ["Unlimited uploads", "Multi-platform distribution", "Basic royalty splits", "Spotify for Artists verification", "Lyrics distribution"],
    targetAudience: "Independent musicians and small labels",
    pricingModel: "Annual subscription",
    pricingTiers: [
      { name: "Musician", price: "$22.99/yr", features: ["1 artist", "Unlimited uploads"] },
      { name: "Musician Plus", price: "$35.99/yr", features: ["2 artists", "Customizable release dates"] },
      { name: "Label", price: "$79.99/yr", features: ["Up to 100 artists", "Label dashboard"] },
    ],
    platforms: ["Web", "iOS", "Android"],
  },
  traction: {
    estimatedUsers: "2M+ artists",
    estimatedRevenue: "$80M ARR (estimated)",
    notableCustomers: [],
    appStoreRating: 4.5,
    reviewCount: 25000,
    productHuntUpvotes: 1200,
  },
  strengths: ["Extremely low price point", "Fast distribution (24-48 hours)", "Large artist community", "Simple user interface"],
  weaknesses: ["Splits feature is basic—no real-time tracking", "No smart contracts or dispute resolution", "Opaque royalty reporting", "No advance payment options"],
  marketPosition: {
    category: "Music Distribution",
    positionDescription: "Market leader in affordable music distribution but royalty splitting is an afterthought",
    differentiators: ["Lowest annual price", "Unlimited uploads model", "Fastest distribution times"],
  },
};

const STEM_PROFILE = {
  status: "complete",
  name: "Stem",
  url: "https://stem.is",
  oneLiner: "Distribution and royalty management for independent artists and labels",
  companyOverview: {
    foundedYear: 2015,
    headquarters: "Los Angeles, CA",
    teamSize: "30-60",
    totalFunding: "$10M",
    keyPeople: ["Milana Rabkin Lewis (CEO)"],
    description: "Stem is a music distribution and royalty management platform designed for independent artists and labels. It offers transparent analytics, automated splits, and advances on future royalties.",
  },
  product: {
    coreFeatures: ["Multi-platform distribution", "Automated royalty splits", "Real-time analytics dashboard", "Advance payments", "Sync licensing support"],
    targetAudience: "Professional independent artists and small-to-mid-size labels",
    pricingModel: "Revenue share",
    pricingTiers: [
      { name: "Standard", price: "5% of revenue", features: ["Distribution", "Splits", "Analytics"] },
      { name: "Pro", price: "Custom", features: ["Advances", "Sync licensing", "Priority support"] },
    ],
    platforms: ["Web", "iOS"],
  },
  traction: {
    estimatedUsers: "100K+ artists",
    estimatedRevenue: "$15M ARR (estimated)",
    notableCustomers: [],
    appStoreRating: 4.0,
    reviewCount: 800,
    productHuntUpvotes: 450,
  },
  strengths: ["Transparent real-time analytics", "Automated split payments", "Advance funding available", "Strong label tools"],
  weaknesses: ["Higher cost (5% rev share)", "Slower distribution than competitors", "Smaller artist community", "Limited platform integrations beyond music"],
  marketPosition: {
    category: "Music Distribution & Royalty Management",
    positionDescription: "Premium distribution focused on transparency and financial services for artists",
    differentiators: ["Real-time royalty transparency", "Advance payments on future earnings", "Label-grade split management"],
  },
};

const SPLITS_IO_PROFILE = {
  status: "complete",
  name: "Splits.io",
  url: "https://splits.io",
  oneLiner: "Collaborative royalty splitting platform for music creators",
  companyOverview: {
    foundedYear: 2020,
    headquarters: "Remote (US)",
    teamSize: "5-10",
    totalFunding: "$2M (seed)",
    keyPeople: ["Various"],
    description: "Splits.io is a lightweight platform focused specifically on royalty splitting for music collaborators. It integrates with major distributors and provides a simple interface for managing splits.",
  },
  product: {
    coreFeatures: ["Split agreements", "Payout tracking", "Collaborator invites", "Integration with distributors"],
    targetAudience: "Music producers and songwriters who collaborate frequently",
    pricingModel: "Freemium",
    pricingTiers: [
      { name: "Free", price: "$0", features: ["Up to 5 tracks", "Basic splits"] },
      { name: "Pro", price: "$9.99/mo", features: ["Unlimited tracks", "Advanced analytics", "Priority payouts"] },
    ],
    platforms: ["Web"],
  },
  traction: {
    estimatedUsers: "15K+ users",
    estimatedRevenue: "$500K ARR (estimated)",
    notableCustomers: [],
    appStoreRating: null,
    reviewCount: null,
    productHuntUpvotes: 320,
  },
  strengths: ["Focused purely on splits (does one thing well)", "Simple UX for collaborators", "Low cost / free tier", "Fast setup for new agreements"],
  weaknesses: ["No distribution—requires separate distributor", "Small team, limited feature velocity", "No smart contract enforcement", "Limited payment options (US-centric)"],
  marketPosition: {
    category: "Royalty Splitting",
    positionDescription: "Niche player focused exclusively on the splitting problem without distribution",
    differentiators: ["Pure-play split management", "No distribution lock-in", "Collaboration-first design"],
  },
};

// ─── Source data ──────────────────────────────────────────────────────

const SAFETY_SOURCES = [
  { sourceType: "WEB_PAGE" as const, title: "Citizen App Review - TechCrunch", url: "https://techcrunch.com/reviews/citizen-app", discoveredBy: "seed-script", credibility: "high" },
  { sourceType: "WEB_PAGE" as const, title: "Citizen: Crunchbase Profile", url: "https://www.crunchbase.com/organization/citizen-app", discoveredBy: "seed-script", credibility: "high" },
  { sourceType: "APP_STORE" as const, title: "Citizen: Safety & Awareness on the App Store", url: "https://apps.apple.com/us/app/citizen-safety-awareness/id1039889567", discoveredBy: "seed-script", credibility: "high" },
  { sourceType: "NEWS_ARTICLE" as const, title: "The Rise of Safety Apps in Urban Areas", url: "https://www.wired.com/story/safety-apps-urban-areas", discoveredBy: "seed-script", credibility: "medium" },
];

const ROYALTY_SOURCES = [
  { sourceType: "WEB_PAGE" as const, title: "DistroKid", url: "https://distrokid.com", discoveredBy: "seed-script", credibility: "high" },
  { sourceType: "WEB_PAGE" as const, title: "DistroKid - Crunchbase", url: "https://www.crunchbase.com/organization/distrokid", discoveredBy: "seed-script", credibility: "high" },
  { sourceType: "WEB_PAGE" as const, title: "Stem Distribution", url: "https://stem.is", discoveredBy: "seed-script", credibility: "high" },
  { sourceType: "WEB_PAGE" as const, title: "Stem on Product Hunt", url: "https://www.producthunt.com/products/stem", discoveredBy: "seed-script", credibility: "medium" },
  { sourceType: "WEB_PAGE" as const, title: "Splits.io", url: "https://splits.io", discoveredBy: "seed-script", credibility: "high" },
  { sourceType: "NEWS_ARTICLE" as const, title: "Music Royalty Tech Landscape 2025", url: "https://www.musicbusinessworldwide.com/royalty-tech-2025", discoveredBy: "seed-script", credibility: "medium" },
];

// ─── Seed Functions ───────────────────────────────────────────────────

async function seedDraftProject(userId: string) {
  console.log('\n[1/5] Creating "AI Recipe Coach" (draft)...');
  const project = await prisma.project.create({
    data: {
      userId,
      title: `${SEED_PREFIX} AI Recipe Coach`,
      icon: "utensils",
      status: "draft",
      rawBraindump:
        "An AI that learns your dietary restrictions, what's in your pantry, and your cooking skill level, then generates personalized weekly meal plans with step-by-step video coaching. It would adjust recipes based on seasonal ingredients and learn from your feedback over time. Maybe integrate with grocery delivery services to auto-order missing ingredients.",
    },
  });
  console.log(`  Created project: ${project.id}`);
}

async function seedStructuredProject(userId: string) {
  console.log('\n[2/5] Creating "Pet Health Tracker" (structured)...');
  const project = await prisma.project.create({
    data: {
      userId,
      title: `${SEED_PREFIX} Pet Health Tracker`,
      icon: "dog",
      status: "structured",
      rawBraindump:
        "A mobile app for pet owners to track vet visits, vaccinations, medications, diet, and exercise. Uses AI to detect early health warning signs from photos and behavior logs. Integrates with local vet clinics for easy appointment booking and record sharing.",
    },
  });
  console.log(`  Created project: ${project.id}`);

  const elements = makeElements(project.id, {
    who: { value: "Pet owners (dogs and cats primarily) who want proactive health monitoring", clarity: 4.5, missing: ["age demographics", "urban vs rural"] },
    problem: { value: "Pet owners miss early warning signs of illness because they lack veterinary knowledge and vet visits are infrequent", clarity: 5.0, missing: ["current vet visit frequency", "insurance coverage"] },
    solution: { value: "AI-powered health monitoring that analyzes photos and behavior to flag potential issues early", clarity: 3.5, missing: ["AI accuracy expectations", "vet integration details"] },
    differentiation: { value: "Combines photo AI analysis with local vet clinic integration", clarity: 3.0, missing: ["competitor awareness", "vet willingness to integrate"] },
    monetization: { value: "Not yet defined", clarity: 1.5, missing: ["pricing research", "willingness to pay", "vet partnership revenue share"] },
  });
  await prisma.projectElement.createMany({ data: elements });
  console.log(`  Created ${elements.length} elements`);

  const questions = makeQuestions(project.id, PET_QUESTIONS);
  await prisma.question.createMany({ data: questions });
  const textCount = questions.filter((q) => q.answerFormat === "text").length;
  const singleCount = questions.filter((q) => q.answerFormat === "single_select").length;
  const multiCount = questions.filter((q) => q.answerFormat === "multi_select").length;
  console.log(`  Created ${questions.length} questions (${textCount} text, ${singleCount} single_select, ${multiCount} multi_select)`);
}

async function seedAnsweredProject(userId: string) {
  console.log('\n[3/5] Creating "Freelancer Invoice AI" (answered)...');
  const project = await prisma.project.create({
    data: {
      userId,
      title: `${SEED_PREFIX} Freelancer Invoice AI`,
      icon: "credit-card",
      status: "answered",
      rawBraindump:
        "An AI tool for freelancers that auto-generates invoices from natural language descriptions of work done. Tracks payment status, sends automatic follow-ups for late payments, handles multi-currency conversions with real-time rates. Connects to bank accounts and accounting software like QuickBooks.",
    },
  });
  console.log(`  Created project: ${project.id}`);

  const elements = makeElements(project.id, {
    who: { value: "Solo freelance developers and designers invoicing 2-5 clients monthly", clarity: 7.0, missing: [] },
    problem: { value: "Freelancers waste 1-3 hours monthly on manual invoicing with messy spreadsheets and templates", clarity: 8.0, missing: [] },
    solution: { value: "AI generates professional invoices from natural language, auto-tracks payments, and follows up on late invoices", clarity: 6.5, missing: ["accounting integration depth"] },
    differentiation: { value: "Only tool that generates invoices from conversational input—competitors require manual form filling", clarity: 7.0, missing: [] },
    monetization: { value: "Freemium: 5 free invoices/mo, $19/mo unlimited with AI, $39/mo teams", clarity: 7.5, missing: [] },
  });
  await prisma.projectElement.createMany({ data: elements });
  console.log(`  Created ${elements.length} elements`);

  const questionData = makeQuestions(project.id, INVOICE_QUESTIONS);
  await prisma.question.createMany({ data: questionData });
  const questions = await prisma.question.findMany({
    where: { projectId: project.id },
    orderBy: { displayOrder: "asc" },
  });
  console.log(`  Created ${questions.length} questions`);

  const answers = questions.map((q, i) => ({
    questionId: q.id,
    projectId: project.id,
    userId,
    answerText: INVOICE_ANSWERS[i]!.answerText,
    answerData: INVOICE_ANSWERS[i]!.answerData ?? undefined,
  }));
  await prisma.answer.createMany({ data: answers });
  console.log(`  Created ${answers.length} answers`);
}

async function seedResearchingProject(userId: string) {
  console.log('\n[4/5] Creating "Neighborhood Safety App" (researching)...');
  const project = await prisma.project.create({
    data: {
      userId,
      title: `${SEED_PREFIX} Neighborhood Safety App`,
      icon: "shield",
      status: "researching",
      rawBraindump:
        "A community-powered safety app that crowdsources real-time incident reports, integrates with public crime data, and uses AI to predict safety patterns. Includes walking route safety scores and emergency SOS features. Think Waze but for personal safety.",
    },
  });
  console.log(`  Created project: ${project.id}`);

  // Elements
  const elements = makeElements(project.id, {
    who: { value: "Urban residents aged 22-45, especially women and parents of young children", clarity: 8.0, missing: [] },
    problem: { value: "People rely on delayed, fragmented sources (Nextdoor, news, word of mouth) for neighborhood safety information", clarity: 8.5, missing: [] },
    solution: { value: "Real-time crowdsourced incident map with AI-predicted safe walking routes and one-tap SOS", clarity: 7.0, missing: ["data source partnerships"] },
    differentiation: { value: "AI-predicted safety patterns and proactive route planning vs reactive alert feeds", clarity: 7.5, missing: [] },
    monetization: { value: "Freemium base app, $9.99/mo premium with AI route safety and monitoring agents", clarity: 7.0, missing: [] },
  });
  await prisma.projectElement.createMany({ data: elements });

  // Questions + Answers
  const questionData = makeQuestions(project.id, SAFETY_QUESTIONS);
  await prisma.question.createMany({ data: questionData });
  const questions = await prisma.question.findMany({
    where: { projectId: project.id },
    orderBy: { displayOrder: "asc" },
  });
  const answers = questions.map((q, i) => ({
    questionId: q.id,
    projectId: project.id,
    userId,
    answerText: SAFETY_ANSWERS[i]!.answerText,
    answerData: SAFETY_ANSWERS[i]!.answerData ?? undefined,
  }));
  await prisma.answer.createMany({ data: answers });
  console.log(`  Created ${elements.length} elements, ${questions.length} questions, ${answers.length} answers`);

  // ORCHESTRATOR job (completed)
  const orchestratorJob = await prisma.researchJob.create({
    data: {
      projectId: project.id,
      agentType: "ORCHESTRATOR",
      status: "COMPLETED",
      progressPercent: 100,
      progressMessage: "Discovered 4 competitors",
      queuedAt: hoursAgo(4),
      startedAt: hoursAgo(4),
      completedAt: hoursAgo(3),
      resultsSummary: {
        competitorsFound: 4,
        competitors: ["Citizen", "Nextdoor", "Neighbors by Ring", "Life360"],
      },
    },
  });

  // Competitor discovery results (from orchestrator)
  const competitors = [
    { name: "Citizen", url: "https://citizen.com", oneLiner: "Real-time safety alerts and incident tracking for cities", whyCompetitor: "Direct competitor in real-time safety incident reporting" },
    { name: "Nextdoor", url: "https://nextdoor.com", oneLiner: "Neighborhood social network with safety discussions", whyCompetitor: "Covers neighborhood safety as part of broader community platform" },
    { name: "Neighbors by Ring", url: "https://ring.com/neighbors", oneLiner: "Ring's community safety sharing platform", whyCompetitor: "Hardware-backed safety community with video sharing" },
    { name: "Life360", url: "https://life360.com", oneLiner: "Family safety and location sharing app", whyCompetitor: "Family-focused safety features overlap with SOS and location sharing" },
  ];

  const discoveryResults = await Promise.all(
    competitors.map((c) =>
      prisma.researchResult.create({
        data: {
          projectId: project.id,
          researchJobId: orchestratorJob.id,
          resultType: "competitor_discovery",
          data: c,
          confidence: "MEDIUM",
          confidenceScore: 0.7,
          sourceCount: 2,
          agentType: "ORCHESTRATOR",
        },
      }),
    ),
  );

  // COMPETITOR_INTEL jobs at various stages
  const citizenConfig = {
    competitorName: "Citizen",
    competitorUrl: "https://citizen.com",
    competitorOneLiner: "Real-time safety alerts and incident tracking for cities",
    whyCompetitor: "Direct competitor in real-time safety incident reporting",
    discoveryResultId: discoveryResults[0]!.id,
    parentJobId: orchestratorJob.id,
  };
  const citizenJob = await prisma.researchJob.create({
    data: {
      projectId: project.id,
      agentType: "COMPETITOR_INTEL",
      status: "COMPLETED",
      progressPercent: 100,
      progressMessage: "Research complete for Citizen",
      config: citizenConfig,
      configHash: configHash(citizenConfig),
      queuedAt: hoursAgo(3),
      startedAt: hoursAgo(3),
      completedAt: hoursAgo(1),
    },
  });

  // Note: A partial unique index (research_job_project_active_unique) allows only
  // ONE active (QUEUED/RUNNING) job per project. So remaining competitors are
  // either COMPLETED or not yet queued (waiting for the current one to finish).

  const nextdoorConfig = {
    competitorName: "Nextdoor",
    competitorUrl: "https://nextdoor.com",
    competitorOneLiner: "Neighborhood social network with safety discussions",
    whyCompetitor: "Covers neighborhood safety as part of broader community platform",
    discoveryResultId: discoveryResults[1]!.id,
    parentJobId: orchestratorJob.id,
  };
  await prisma.researchJob.create({
    data: {
      projectId: project.id,
      agentType: "COMPETITOR_INTEL",
      status: "RUNNING",
      progressPercent: 45,
      progressMessage: "Deep researching Nextdoor...",
      config: nextdoorConfig,
      configHash: configHash(nextdoorConfig),
      queuedAt: hoursAgo(2),
      startedAt: hoursAgo(1),
    },
  });
  console.log("  Created 3 research jobs (1 orchestrator + 2 competitor intel, 2 more pending discovery)");

  // Citizen competitor profile result
  const citizenResult = await prisma.researchResult.create({
    data: {
      projectId: project.id,
      researchJobId: citizenJob.id,
      resultType: "competitor_profile",
      data: CITIZEN_PROFILE,
      confidence: "HIGH",
      confidenceScore: 0.9,
      sourceCount: 4,
      agentType: "COMPETITOR_INTEL",
    },
  });
  console.log("  Created 5 research results (4 discovery + 1 profile)");
  // Neighbors by Ring and Life360 jobs haven't been queued yet (only one active job at a time)

  // Sources and citations
  const sources = await Promise.all(
    SAFETY_SOURCES.map((s) =>
      prisma.source.create({
        data: { ...s, urlHash: urlHash(s.url) },
      }),
    ),
  );

  await prisma.sourceCitation.createMany({
    data: sources.map((s) => ({
      sourceId: s.id,
      researchResultId: citizenResult.id,
      citedText: `Information sourced from ${s.title}`,
      relevanceScore: 0.85,
    })),
  });
  console.log(`  Created ${sources.length} sources, ${sources.length} citations`);
}

async function seedResearchedProject(userId: string) {
  console.log('\n[5/5] Creating "Creator Royalty Splitter" (researched)...');
  const project = await prisma.project.create({
    data: {
      userId,
      title: `${SEED_PREFIX} Creator Royalty Splitter`,
      icon: "music",
      status: "researched",
      rawBraindump:
        "A platform for music creators and collaborators to automatically split royalties based on smart contracts. Integrates with Spotify, Apple Music, and YouTube. Handles disputes, provides transparent dashboards, and supports international payments. Think of it as Stripe for music royalties.",
    },
  });
  console.log(`  Created project: ${project.id}`);

  // Elements
  const elements = makeElements(project.id, {
    who: { value: "Independent hip-hop and electronic producers who collaborate remotely with 2-5 artists per track", clarity: 8.5, missing: [] },
    problem: { value: "Collaborators rely on verbal agreements and manual PayPal splits, leading to delayed payments, disputes, and broken relationships", clarity: 9.0, missing: [] },
    solution: { value: "Upload a track, set split percentages in a smart contract, and royalties auto-distribute as they accrue from streaming platforms", clarity: 8.0, missing: [] },
    differentiation: { value: "Only platform combining smart contract enforcement with real-time multi-platform royalty aggregation", clarity: 8.0, missing: [] },
    monetization: { value: "2.5% fee on royalty payouts, no monthly subscription for basic; $14.99/mo pro tier with analytics and advances", clarity: 8.5, missing: [] },
  });
  await prisma.projectElement.createMany({ data: elements });

  // Questions + Answers
  const questionData = makeQuestions(project.id, ROYALTY_QUESTIONS);
  await prisma.question.createMany({ data: questionData });
  const questions = await prisma.question.findMany({
    where: { projectId: project.id },
    orderBy: { displayOrder: "asc" },
  });
  const answers = questions.map((q, i) => ({
    questionId: q.id,
    projectId: project.id,
    userId,
    answerText: ROYALTY_ANSWERS[i]!.answerText,
    answerData: ROYALTY_ANSWERS[i]!.answerData ?? undefined,
  }));
  await prisma.answer.createMany({ data: answers });
  console.log(`  Created ${elements.length} elements, ${questions.length} questions, ${answers.length} answers`);

  // ORCHESTRATOR job (completed)
  const orchestratorJob = await prisma.researchJob.create({
    data: {
      projectId: project.id,
      agentType: "ORCHESTRATOR",
      status: "COMPLETED",
      progressPercent: 100,
      progressMessage: "Discovered 3 competitors",
      queuedAt: daysAgo(2),
      startedAt: daysAgo(2),
      completedAt: daysAgo(2),
      resultsSummary: {
        competitorsFound: 3,
        competitors: ["DistroKid", "Stem", "Splits.io"],
      },
    },
  });

  // Competitor discovery results
  const competitorData = [
    { name: "DistroKid", url: "https://distrokid.com", oneLiner: "Music distribution service with basic royalty splitting", whyCompetitor: "Largest indie distribution platform with split features" },
    { name: "Stem", url: "https://stem.is", oneLiner: "Distribution and royalty management for independent artists", whyCompetitor: "Focused on transparent royalty management and advances" },
    { name: "Splits.io", url: "https://splits.io", oneLiner: "Collaborative royalty splitting platform", whyCompetitor: "Pure-play royalty splitting solution for music collaborators" },
  ];

  const discoveryResults = await Promise.all(
    competitorData.map((c) =>
      prisma.researchResult.create({
        data: {
          projectId: project.id,
          researchJobId: orchestratorJob.id,
          resultType: "competitor_discovery",
          data: c,
          confidence: "MEDIUM",
          confidenceScore: 0.75,
          sourceCount: 2,
          agentType: "ORCHESTRATOR",
        },
      }),
    ),
  );

  // COMPETITOR_INTEL jobs (all completed)
  const profiles = [DISTROKID_PROFILE, STEM_PROFILE, SPLITS_IO_PROFILE];
  const competitorJobs = [];
  for (let i = 0; i < competitorData.length; i++) {
    const c = competitorData[i]!;
    const jobConfig = {
      competitorName: c.name,
      competitorUrl: c.url,
      competitorOneLiner: c.oneLiner,
      whyCompetitor: c.whyCompetitor,
      discoveryResultId: discoveryResults[i]!.id,
      parentJobId: orchestratorJob.id,
    };
    const job = await prisma.researchJob.create({
      data: {
        projectId: project.id,
        agentType: "COMPETITOR_INTEL",
        status: "COMPLETED",
        progressPercent: 100,
        progressMessage: `Research complete for ${c.name}`,
        config: jobConfig,
        configHash: configHash(jobConfig),
        queuedAt: daysAgo(2),
        startedAt: daysAgo(2),
        completedAt: daysAgo(1),
      },
    });
    competitorJobs.push(job);
  }
  console.log(`  Created ${competitorJobs.length + 1} research jobs (1 orchestrator + ${competitorJobs.length} competitor intel)`);

  // Competitor profile results
  const profileResults = [];
  for (let i = 0; i < competitorJobs.length; i++) {
    const result = await prisma.researchResult.create({
      data: {
        projectId: project.id,
        researchJobId: competitorJobs[i]!.id,
        resultType: "competitor_profile",
        data: profiles[i]!,
        confidence: i === 0 ? "HIGH" : "MEDIUM",
        confidenceScore: i === 0 ? 0.9 : 0.7,
        sourceCount: 2,
        agentType: "COMPETITOR_INTEL",
      },
    });
    profileResults.push(result);
  }
  console.log(`  Created ${discoveryResults.length + profileResults.length} research results (${discoveryResults.length} discovery + ${profileResults.length} profiles)`);

  // Sources
  const sources = await Promise.all(
    ROYALTY_SOURCES.map((s) =>
      prisma.source.create({
        data: { ...s, urlHash: urlHash(s.url) },
      }),
    ),
  );

  // Citations: link sources to profile results (2 sources per competitor)
  const citations = [];
  for (let i = 0; i < profileResults.length; i++) {
    const result = profileResults[i]!;
    const resultSources = sources.slice(i * 2, i * 2 + 2);
    for (const source of resultSources) {
      citations.push({
        sourceId: source.id,
        researchResultId: result.id,
        citedText: `Information sourced from ${source.title}`,
        relevanceScore: 0.85,
      });
    }
  }
  await prisma.sourceCitation.createMany({ data: citations });
  console.log(`  Created ${sources.length} sources, ${citations.length} citations`);
}

// ─── Main ─────────────────────────────────────────────────────────────

async function seed() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found in DB. Sign in first, then run this script.");
    process.exit(1);
  }
  console.log(`Using user: ${user.email} (${user.id})`);

  // Cleanup previous seed data
  const seedProjects = await prisma.project.findMany({
    where: { title: { startsWith: SEED_PREFIX }, userId: user.id },
    select: { id: true },
  });
  if (seedProjects.length > 0) {
    await prisma.source.deleteMany({ where: { discoveredBy: "seed-script" } });
    for (const p of seedProjects) {
      await prisma.project.delete({ where: { id: p.id } });
    }
    console.log(`Deleted ${seedProjects.length} previous seed projects`);
  }

  await seedDraftProject(user.id);
  await seedStructuredProject(user.id);
  await seedAnsweredProject(user.id);
  await seedResearchingProject(user.id);
  await seedResearchedProject(user.id);

  console.log("\nDone! 5 seed projects created across all pipeline stages.");
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
