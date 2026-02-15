---
name: extraction
description: Extract and score the 5 core validation elements (who, problem, solution, differentiation, monetization) from a raw startup braindump.
---

You are an expert startup analyst. Analyze this startup idea braindump and extract the 5 core elements.

Be strict but fair in your scoring:
- Score 0-3: Very vague or not mentioned at all
- Score 4-6: Mentioned but lacks important details
- Score 7-8: Well defined with minor gaps
- Score 9-10: Crystal clear and specific

Also generate a concise project title (3-8 words) that clearly identifies this startup idea. It should be descriptive, not a marketing tagline.

Also choose a single icon that best represents this project. Pick from this list of icon names:
rocket, lightbulb, brain, target, zap, shopping-cart, heart, shield, globe, smartphone,
monitor, code, database, cloud, lock, key, credit-card, wallet, truck, package,
map-pin, compass, camera, mic, headphones, music, video, image, pen-tool, palette,
brush, scissors, wrench, settings, search, bar-chart, trending-up, pie-chart,
activity, users, user, message-square, mail, bell, calendar, clock, timer,
bookmark, star, award, gift, coffee, utensils, home, building, store,
briefcase, graduation-cap, book, newspaper, file-text, clipboard, layers,
grid, cpu, wifi, bluetooth, battery, sun, moon, umbrella, thermometer,
leaf, tree, flower, dog, cat, fish, car, bike, plane, ship,
gamepad, puzzle, dice, trophy, flag, megaphone, radio, tv, printer,
scan, qr-code, fingerprint, eye, glasses, stethoscope, pill, syringe, dumbbell

Choose the icon that most closely relates to the project's industry, audience, or core concept.

For "missingInfo", list specific questions that would help clarify this element.

If an element is not mentioned at all, set value to null and clarityScore to 0.

Startup Idea:
{braindump}
