import { z } from "zod";

export const ALLOWED_ICONS = new Set([
  "rocket", "lightbulb", "brain", "target", "zap", "shopping-cart", "heart",
  "shield", "globe", "smartphone", "monitor", "code", "database", "cloud",
  "lock", "key", "credit-card", "wallet", "truck", "package", "map-pin",
  "compass", "camera", "mic", "headphones", "music", "video", "image",
  "pen-tool", "palette", "brush", "scissors", "wrench", "settings", "search",
  "bar-chart", "trending-up", "pie-chart", "activity", "users", "user",
  "message-square", "mail", "bell", "calendar", "clock", "timer", "bookmark",
  "star", "award", "gift", "coffee", "utensils", "home", "building", "store",
  "briefcase", "graduation-cap", "book", "newspaper", "file-text", "clipboard",
  "layers", "grid", "cpu", "wifi", "bluetooth", "battery", "sun", "moon",
  "umbrella", "thermometer", "leaf", "tree", "flower", "dog", "cat", "fish",
  "car", "bike", "plane", "ship", "gamepad", "puzzle", "dice", "trophy",
  "flag", "megaphone", "radio", "tv", "printer", "scan", "qr-code",
  "fingerprint", "eye", "glasses", "stethoscope", "pill", "syringe", "dumbbell",
]);

export const DEFAULT_ICON = "lightbulb";

const elementSchema = z.object({
  value: z.string().nullable(),
  clarityScore: z.number().min(0).max(10).describe("How clearly defined is this element (0-10)"),
  missingInfo: z.array(z.string()).describe("What information is missing or vague"),
  confidence: z.number().min(0).max(1).describe("AI confidence in this extraction (0-1)"),
});

export const ElementExtractionSchema = z.object({
  title: z
    .string()
    .max(80)
    .describe(
      "A concise, descriptive project title (3-8 words) that captures the core idea. Not a tagline or slogan — just a clear name for the project."
    ),
  icon: z
    .string()
    .max(60)
    .describe(
      "A kebab-case icon name from the provided allowlist that best represents this project's industry or concept."
    ),
  who: elementSchema.describe("The target audience/customer segment"),
  problem: elementSchema.describe("The problem being solved"),
  solution: elementSchema.describe("The proposed solution"),
  differentiation: elementSchema.describe("What makes this different from alternatives"),
  monetization: elementSchema.describe("How this will make money"),
});
