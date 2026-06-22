// Module 4 emotions. Each entry contributes:
//   name  — short Chinese label for the lock-card area (not currently shown).
//   verb  — the phrase that follows the character name in the caption,
//           e.g. "{name}{verb}" → "小男生很難過".
//   en    — rich English prompt with explicit facial-expression cues;
//           the focal point of every Module-4 image is the face.

export const emotions = [
  {
    id: 'sad_cake',
    name: '難過',
    verb: '的蛋糕掉在地上, 很難過',
    en: 'standing in front of a piece of birthday cake that has fallen and broken on the floor, looking down at the cake with a clearly SAD face — mouth corners pulled way down into a frown, big shiny tears welling in droopy eyes, eyebrows angled up at the inner ends. The sad expression is the focal point of the picture',
    emoji: '😢',
  },
  {
    id: 'happy_icecream',
    name: '開心',
    verb: '正在吃冰淇淋, 很開心',
    en: 'holding an ice-cream cone in one hand and licking it, with a clearly HAPPY face — big wide open smile showing teeth, eyes squinted into cheerful crescents, cheeks slightly raised. The happy expression is the focal point of the picture',
    emoji: '😄',
  },
  {
    id: 'worried_hw',
    name: '煩惱',
    verb: '不知道功課怎麼寫, 很煩惱',
    en: 'sitting at a small desk in front of an open notebook and a pencil, scratching their head with one hand, with a clearly WORRIED / CONFUSED face — furrowed eyebrows pulled together, eyes wide and uncertain, mouth twisted to one side. The worried expression is the focal point of the picture',
    emoji: '😟',
  },
  {
    id: 'tired_school',
    name: '累',
    verb: '剛從學校回來, 看起來很累',
    en: 'walking slowly home from school carrying a school backpack, with a clearly TIRED / EXHAUSTED face — heavy half-closed droopy eyelids, slumped shoulders, mouth slightly open in a small sigh. The tired expression is the focal point of the picture',
    emoji: '😩',
  },
  {
    id: 'crying_fall',
    name: '哭',
    verb: '跌倒了, 很痛, 正在哭',
    en: 'sitting on the ground right after falling down, with a clearly CRYING face — squeezed-shut eyes leaking big tear drops, wide-open square crying mouth showing teeth, both hands up near the face. ALSO IMPORTANT: show a clearly SWOLLEN BUMP injury — either a round bump on the forehead (a raised lump shape sticking out from the head), OR a swollen lump on a knee / shin / foot. The bump should be drawn as a rounded raised shape, like a cartoon swelling — do NOT draw any bandage, plaster, band-aid, gauze, or wrappings. The crying face is the focal point but the swollen injury bump must be clearly visible',
    emoji: '😭',
  },
  {
    id: 'angry_queue',
    name: '生氣',
    verb: '在餐廳外面排隊排很久, 很生氣',
    en: 'standing in a long line of people on the sidewalk outside a restaurant front door (a few other people queued behind, a restaurant signboard visible above the door), looking visibly ANGRY / FRUSTRATED at how long they have been waiting. The face shows obvious anger — eyebrows pushed down hard into a sharp V shape, eyes narrowed in a glare, mouth pulled into a tight downturned scowl or grimace, arms crossed firmly in front of the chest. The angry expression is the focal point of the picture',
    emoji: '😠',
  },
  {
    id: 'annoyed_noisy',
    name: '煩躁',
    verb: '覺得同學很吵, 很煩躁',
    en: 'covering both ears with their hands, with a clearly ANNOYED / IRRITATED face — eyes squinted shut tightly, eyebrows pushed down and pulled together hard into a V shape, mouth pulled to one side in a sharp frown or scowl. The annoyed expression is the focal point of the picture',
    emoji: '😤',
  },
];
