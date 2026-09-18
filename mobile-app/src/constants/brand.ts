/** CO-LAB CONNECT brand tokens (shared by all roles). */
export const Brand = {
  indigo950: '#1E1B4B',
  indigo600: '#4F46E5',
  emerald600: '#059669',
  amber600: '#D97706',
  red600: '#DC2626',
  tagline: 'Trusted Services. Fair Opportunities. Stronger Cooperatives.',
} as const;

export const STATUS_COLORS: Record<string, string> = {
  pending: '#B45309',
  confirmed: '#1D4ED8',
  accepted: '#1D4ED8',
  en_route: '#4F46E5',
  service_started: '#C2410C',
  in_progress: '#C2410C',
  completed: '#047857',
  cancelled: '#6B7280',
  rejected: '#B91C1C',
  offered: '#B45309',
  declined: '#B91C1C',
  SUBMITTED: '#B45309',
  MATCHING: '#7C3AED',
  PARTIALLY_FULFILLED: '#B45309',
  FULLY_FULFILLED: '#1D4ED8',
  WORK_IN_PROGRESS: '#4F46E5',
  COMPLETED: '#047857',
  CANCELLED: '#6B7280',
  DRAFT: '#6B7280',
};
