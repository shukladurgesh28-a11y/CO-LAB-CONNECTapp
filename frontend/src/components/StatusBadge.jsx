const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  reviewing: 'bg-blue-100 text-blue-800',
  recommended: 'bg-purple-100 text-purple-800',
  allocated: 'bg-indigo-100 text-indigo-800',
  confirmed: 'bg-green-100 text-green-800',
  en_route: 'bg-cyan-100 text-cyan-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  urgent: 'bg-red-100 text-red-800 animate-pulse',
  verified: 'bg-green-100 text-green-800',
  unverified: 'bg-gray-100 text-gray-800',
  available: 'bg-green-100 text-green-800',
  busy: 'bg-orange-100 text-orange-800',
  failed: 'bg-red-100 text-red-800',
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-3 py-1',
};

export default function StatusBadge({ status, size = 'md' }) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <span
      className={`inline-block rounded-full font-medium capitalize ${colorClass} ${sizeClass}`}
    >
      {status?.replace(/_/g, ' ')}
    </span>
  );
}
