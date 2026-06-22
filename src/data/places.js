// Each place describes a static scene with an "anchor" — the spot inside the
// scene where the item image gets composited on top.
//   itemAnchor: { top, left, size } — fractions of the figure (0..1)
//   clip   — CSS clip-path applied to item (for "hidden behind X" cases)
//   rotate — degrees, item rotation (for "falling off table" effect)
//
// All place prompts must leave clear empty space at the anchor so the
// composited item lands on a plausible surface.

export const places = [
  {
    id: 'fridge_inside',
    name: '冰箱',
    verb: '在打開的冰箱裡面',
    en: 'an open refrigerator viewed from the front, both doors swung open, with empty horizontal shelves clearly visible inside',
    emoji: '🧊',
    itemAnchor: { top: 0.38, left: 0.35, size: 0.30 },
  },
  {
    id: 'table_top',
    name: '桌子',
    verb: '在桌子上',
    en: 'a simple wooden table viewed from the front, the flat top surface clearly visible and empty',
    emoji: '🪑',
    itemAnchor: { top: 0.30, left: 0.35, size: 0.30 },
  },
  {
    id: 'chair_under',
    name: '椅子',
    verb: '在椅子下面',
    en: 'a simple wooden chair viewed from the side, with four visible legs and clear empty space underneath the seat between the legs',
    emoji: '🪑',
    // Sit right on the ground line so it reads as "on the floor under the chair".
    itemAnchor: { top: 0.78, left: 0.36, size: 0.22 },
  },
  {
    id: 'chair_top',
    name: '椅子',
    verb: '在椅子上面',
    en: 'a simple wooden chair viewed from the front, with an empty flat seat clearly visible and ample empty space above the seat',
    emoji: '🪑',
    // Lift up onto the seat surface.
    itemAnchor: { top: 0.20, left: 0.36, size: 0.28 },
  },
  {
    id: 'backpack_left',
    name: '書包',
    verb: '在書包的左邊',
    en: 'a school backpack standing upright in the center of the frame with plenty of empty space to its left',
    emoji: '🎒',
    itemAnchor: { top: 0.52, left: 0.04, size: 0.24 },
  },
  {
    id: 'backpack_right',
    name: '書包',
    verb: '在書包的右邊',
    en: 'a school backpack standing upright in the center of the frame with plenty of empty space to its right',
    emoji: '🎒',
    // Push further right, away from the backpack.
    itemAnchor: { top: 0.52, left: 0.74, size: 0.24 },
  },
  {
    id: 'laptop_left',
    name: '筆電',
    verb: '在筆電的左邊',
    en: 'an open laptop viewed from the front in the center of the frame with plenty of empty space to its left',
    emoji: '💻',
    itemAnchor: { top: 0.46, left: 0.04, size: 0.24 },
  },
  {
    id: 'laptop_right',
    name: '筆電',
    verb: '在筆電的右邊',
    en: 'an open laptop viewed from the front in the center of the frame with plenty of empty space to its right',
    emoji: '💻',
    // Push further right so it does not overlap the laptop body.
    itemAnchor: { top: 0.46, left: 0.74, size: 0.24 },
  },
  {
    id: 'wall_hook',
    name: '牆',
    verb: '掛在牆上',
    // Hand-written wall_hook.svg: hook tip near (50%, 24.2%); picture frame
    // outer corners at (28.3%, 37.1%) and (71.7%, 37.1%); inner mat spans
    // ~32%..68% horizontally and ~41%..82% vertically.
    en: 'hand-drawn (see public/assets/scenes-2/places/wall_hook.svg)',
    emoji: '🪝',
    itemAnchor: { top: 0.45, left: 0.34, size: 0.32 },
    // Two strings from the hook tip to the top corners of the picture frame.
    hangString: {
      fromTop: 0.245, atLeft: 0.50,
      toTop: 0.371, toLeft: 0.283, toRight: 0.717,
    },
  },
  {
    id: 'mom_hand',
    name: '媽媽',
    verb: '在媽媽手上',
    en: 'a smiling mother shown from the chest up, facing the viewer, with both arms extended forward and her two cupped hands held together at chest height as if waiting to receive an object, palms up and empty',
    emoji: '👩',
    // Hands held at chest height roughly center-low; tune after regen.
    itemAnchor: { top: 0.50, left: 0.36, size: 0.24 },
  },
  {
    id: 'table_fall',
    name: '桌邊',
    verb: '從桌邊掉下去',
    en: 'a table viewed from the side showing the right edge of the table top, with empty space below and to the right of the edge',
    emoji: '⬇️',
    // Place item just past the right edge of the table top, midair, not over the legs.
    itemAnchor: { top: 0.50, left: 0.66, size: 0.26 },
    rotate: 30,
  },
  {
    id: 'bowl_hide',
    name: '大碗',
    verb: '藏在大碗後面 (露出一半)',
    en: 'a large round opaque ceramic bowl viewed from the front, sitting on a surface, with empty space directly above the bowl rim',
    emoji: '🥣',
    // Item drawn first, fully; bowl rendered on TOP with page-bg fill so it
    // visually covers the lower half of the item. (Uses a hand-written
    // bowl_hide.svg with explicit page-bg fill.)
    // Anchor higher so more of the item peeks above the bowl rim.
    itemAnchor: { top: 0.18, left: 0.30, size: 0.40 },
    itemBehind: true,
  },
];
