export const EXTRACTION_PROMPT = `You are an expert startup analyst. Analyze this startup idea braindump and extract the 5 core elements.

Be strict but fair in your scoring:
- Score 0-3: Very vague or not mentioned at all
- Score 4-6: Mentioned but lacks important details
- Score 7-8: Well defined with minor gaps
- Score 9-10: Crystal clear and specific

Also generate a concise project title (3-8 words) that clearly identifies this startup idea. It should be descriptive, not a marketing tagline.

For "missingInfo", list specific questions that would help clarify this element.

If an element is not mentioned at all, set value to null and clarityScore to 0.

Startup Idea:
{braindump}`;
