import { readSkillFile } from "./skill-loader";
import { registerSkill } from "./skill-registry";
import { createGoogleSearchTool } from "./google-search/google-search.tool";

// Register all skills on import
const extraction = readSkillFile("extraction");
registerSkill({ ...extraction.metadata, instructions: extraction.content });

const questionGen = readSkillFile("question-generation");
registerSkill({ ...questionGen.metadata, instructions: questionGen.content });

const googleSearch = readSkillFile("google-search");
registerSkill({
  ...googleSearch.metadata,
  instructions: googleSearch.content,
  tools: () => ({ google_search: createGoogleSearchTool() }),
});

// Re-export registry functions
export { loadSkill, composeSkills, type SkillEntry } from "./skill-registry";
export {
  readSkillFile,
  type SkillFile,
  type SkillMetadata,
} from "./skill-loader";
