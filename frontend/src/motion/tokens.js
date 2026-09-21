/**
 * Global motion tokens — single source of truth for timing/easing.
 * Inspired by premium Dribbble-quality motion design.
 * micro: 120-180ms · component: 180-250ms · page: 220-350ms · modal: 200-300ms
 */

export const DUR = {
  micro: 0.15,
  component: 0.22,
  page: 0.28,
  modal: 0.25,
  stagger: 0.06,
  countUp: 0.9,
};

export const EASE = {
  out: [0.16, 1, 0.3, 1],
  outExpo: [0.19, 1, 0.22, 1],
  outCirc: [0.075, 0.82, 0.165, 1],
  inOut: [0.4, 0, 0.2, 1],
  standard: [0.4, 0, 0.2, 1],
  decelerate: [0, 0, 0.2, 1],
  accelerate: [0.4, 0, 1, 1],
};

/**
 * Spring configurations for different motion personalities
 * - soft: gentle, premium feel
 * - snappy: responsive, crisp
 * - bouncy: playful (use sparingly)
 * - heavy: deliberate, grounded
 * - fluid: smooth, continuous
 */
export const SPRING = {
  soft: { type: 'spring', stiffness: 380, damping: 34, mass: 0.9 },
  snappy: { type: 'spring', stiffness: 480, damping: 38, mass: 0.8 },
  bouncy: { type: 'spring', stiffness: 400, damping: 25, mass: 0.8 },
  heavy: { type: 'spring', stiffness: 280, damping: 42, mass: 1.2 },
  fluid: { type: 'spring', stiffness: 340, damping: 30, mass: 1 },
  indicator: { type: 'spring', stiffness: 520, damping: 40, mass: 0.7 },
  card: { type: 'spring', stiffness: 320, damping: 36, mass: 1 },
  modal: { type: 'spring', stiffness: 360, damping: 34, mass: 1 },
  button: { type: 'spring', stiffness: 500, damping: 45, mass: 0.5 },
};

/**
 * Preset transitions for common patterns
 */
export const TRANSITIONS = {
  pageEnter: { duration: DUR.page, ease: EASE.outExpo },
  pageExit: { duration: DUR.component, ease: EASE.accelerate },
  cardStagger: (index) => ({
    ...SPRING.card,
    delay: index * DUR.stagger,
  }),
  statCountUp: { duration: DUR.countUp, ease: EASE.outCirc },
  buttonHover: { duration: DUR.micro, ease: EASE.out },
  buttonPress: { duration: DUR.micro, ease: EASE.accelerate },
  sidebarIndicator: SPRING.indicator,
  modalContent: SPRING.modal,
  drawerContent: { type: 'spring', stiffness: 400, damping: 36, mass: 1 },
  toastEnter: { type: 'spring', stiffness: 420, damping: 38, mass: 0.8 },
  tooltipEnter: { duration: DUR.micro, ease: EASE.out },
  focusRing: { duration: DUR.micro, ease: EASE.out },
};

/**
 * Motion variants for AnimatePresence
 */
export const VARIANTS = {
  page: {
    initial: { opacity: 0, y: 8, scale: 0.995 },
    enter: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -6, scale: 0.995 },
  },
  card: {
    initial: { opacity: 0, y: 16, scale: 0.97 },
    enter: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -8, scale: 0.98 },
  },
  stat: {
    initial: { opacity: 0, y: 12 },
    enter: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
  sidebarItem: {
    inactive: { x: 0, scale: 1, backgroundColor: 'transparent' },
    hover: { x: 4, scale: 1.02 },
    active: { x: 0, scale: 1 },
  },
  indicator: {
    initial: { opacity: 0, height: 0, y: 4 },
    enter: { opacity: 1, height: 'auto', y: 0 },
    exit: { opacity: 0, height: 0, y: -4 },
  },
  modal: {
    initial: { opacity: 0, scale: 0.96, y: 8 },
    enter: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 8 },
  },
  drawer: {
    initial: { x: '100%' },
    enter: { x: 0 },
    exit: { x: '100%' },
  },
  toast: {
    initial: { opacity: 0, x: 40, scale: 0.95 },
    enter: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 40, scale: 0.95 },
  },
  button: {
    hover: { y: -1, scale: 1.01 },
    tap: { scale: 0.97 },
    loading: { scale: 0.99 },
  },
  serviceCard: {
    initial: { opacity: 0, y: 20, scale: 0.96 },
    enter: { opacity: 1, y: 0, scale: 1 },
    hover: { y: -4, scale: 1.015 },
    tap: { scale: 0.985 },
    selected: { scale: 1.01, boxShadow: '0 12px 32px -8px rgba(79, 70, 229, 0.35)' },
  },
  urgencyCard: {
    initial: { opacity: 0, y: 16, scale: 0.97 },
    enter: { opacity: 1, y: 0, scale: 1 },
    hover: { y: -2, scale: 1.01 },
    selected: { scale: 1.02, borderWidth: 2 },
  },
  progressStep: {
    inactive: { scale: 1, opacity: 0.5 },
    active: { scale: 1.1, opacity: 1 },
    completed: { scale: 1, opacity: 1 },
  },
  aiNode: {
    initial: { opacity: 0, scale: 0.5, y: 20 },
    enter: (i) => ({ opacity: 1, scale: 1, y: 0, transition: { ...SPRING.fluid, delay: i * 0.12 } }),
    pulse: { scale: [1, 1.15, 1] },
    highlight: { scale: 1.2, boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.4)' },
  },
  aiConnection: {
    initial: { pathLength: 0, opacity: 0 },
    enter: { pathLength: 1, opacity: 1 },
    active: { stroke: '#6366f1', strokeWidth: 3 },
  },
  tableRow: {
    initial: { opacity: 0, x: -16 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 16 },
  },
  listItem: {
    initial: { opacity: 0, x: -20 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
};

/**
 * Reduced motion safe transitions
 */
export const REDUCED = {
  page: { duration: 0.01 },
  card: { duration: 0.01 },
  modal: { duration: 0.01 },
  toast: { duration: 0.01 },
  all: { duration: 0.01 },
};