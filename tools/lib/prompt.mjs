// Shared prompt builder for gen-scenes (OpenAI) and gen-scenes-nano (Gemini).
//
// IMPORTANT — this prompt is the contract for visual style.
// Treat it as a locked artifact: changing it will make new images drift
// away from the 120-image set that's already in public/assets/scenes/.
// If you need a new style, give it a new name and a new script — don't
// mutate this one.

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
