/** Global motion tokens — single source of truth for timing/easing.
 * micro: 120–180ms · component: 180–250ms · page: 220–350ms · modal: 200–300ms
 */
export const DUR = {
  micro: 0.15,
  component: 0.22,
  page: 0.28,
  modal: 0.25,
};

export const EASE = {
  out: [0.16, 1, 0.3, 1], // easeOutExpo-ish, professional not bouncy
};

export const springSoft = { type: 'spring', stiffness: 380, damping: 34 };
