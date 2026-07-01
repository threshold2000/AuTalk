// Shared prompt builders for image generation scripts.
//
// IMPORTANT — these prompts are the contract for visual style.
// Treat them as locked artifacts: changing them will make new images drift
// away from existing sets in public/assets/scenes-*. If you need a new
// style, give it a new name and a new script — don't mutate these.

// Module 1 (who-doing-what): animal × action composite scene.
export function buildScenePrompt({ animal, action }) {
  const isHuman = animal.human === true;
  const subject = isHuman
    ? `a cute cartoon ${animal.en}`
    : `a cute cartoon ${animal.en} drawn anthropomorphically (standing upright like a person if the action requires it)`;
  return [
    'A simple black ink line drawing on a pure white background,',
    `in the clean style of a children's coloring book or storybook illustration.`,
    `The picture shows ${subject} ${action.en}.`,
    'Use only clean continuous black outlines. No shading. No grayscale fill. No color. No text or letters.',
    'The subject is centered and fully visible inside the frame. Minimal background — only the props or environment essential to the action.',
    'Friendly, gentle facial expression. Suitable for young children.',
  ].join(' ');
}

// Module 2 (what-where) — items: a single object on a transparent background,
// drawn in the same line style so it can be composited over place backgrounds.
export function buildItemPrompt({ item }) {
  return [
    'A simple black ink line drawing of a single object on a fully transparent background,',
    `in the clean style of a children's coloring book or storybook illustration.`,
    `The picture shows ${item.en}, drawn very LARGE so the object fills most of the canvas — only minimal margin (around 5%) is left around its edges.`,
    'Use BOLD THICK black outlines, as if drawn with a heavy marker. Lines must be at least as thick as the lines in a typical coloring-book illustration.',
    'No shading. No grayscale fill. No color. No text or letters.',
    'Absolutely no other objects, no shadows on the ground, no scenery, no frame, no background.',
    'The object is the entire subject. Suitable for young children.',
  ].join(' ');
}

// Module 4 (who-feeling) — character × emotion. Single composed scene per cell.
// The focal point is the FACIAL EXPRESSION; the prompt makes that explicit.
export function buildMoodPrompt({ character, emotion }) {
  const isHuman = character.human === true;
  const subject = isHuman
    ? `a ${character.en}`
    : `a cute cartoon ${character.en} drawn anthropomorphically (standing or sitting upright like a person if the action requires it)`;
  return [
    'A simple black ink line drawing on a pure white background,',
    `in the clean style of a children's coloring book or storybook illustration.`,
    `The picture shows ${subject} ${emotion.en}.`,
    'IMPORTANT: the face is the focal point of the picture. The emotion must be unmistakable at a single glance. Draw the face slightly larger than realistic proportions and place it near the upper third of the frame so it reads clearly.',
    'Use only clean continuous black outlines. No shading. No grayscale fill. No color. No text or letters.',
    'Minimal background — only the props or environment essential to the scene.',
    'Suitable for young autistic children — uncluttered, easy to identify the emotion.',
  ].join(' ');
}

// Module 5 (what-color) — cross product of a plain object × a color.
// Unlike other modules this one MUST be in color (color IS the point).
export function buildColorPrompt({ item, color }) {
  return [
    `A cute cartoon illustration of ${item.en}, painted entirely in solid ${color.en}.`,
    `The ${item.en} is coloured UNMISTAKABLY ${color.en} — the color should be immediately obvious at a glance.`,
    'Clean black outline, filled with solid color inside. Simple children\'s picture-book style.',
    'On a plain pure-white background. Only the single object — no shadows, no scenery, no other objects, no text or letters.',
  ].join(' ');
}

// Module 2 (what-where) — places: a static scene/context with clear empty space
// where a small object will be composited on top of it.
export function buildPlacePrompt({ place }) {
  return [
    'A simple black ink line drawing on a pure white background,',
    `in the clean style of a children's coloring book or storybook illustration.`,
    `The picture shows ${place.en}.`,
    'Use only clean continuous black outlines. No shading. No grayscale fill. No color. No text or letters.',
    'Leave clear empty space where a small object will be placed. No extra objects, no decorative scenery.',
    'Minimal lines. Suitable for young children.',
  ].join(' ');
}
