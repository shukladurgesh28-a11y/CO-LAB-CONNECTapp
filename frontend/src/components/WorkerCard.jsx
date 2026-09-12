import { BadgeCheck } from 'lucide-react';
import RatingStars from './RatingStars';

const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-blue-500',
  'bg-pink-500',
  'bg-purple-500',
  'bg-teal-500',
  'bg-rose-500',
];

export default function WorkerCard({ worker, onClick, actionLabel = 'View Profile', onAction }) {
  const initials = worker?.name
    ? worker.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  const colorIndex = worker?.name
    ? worker.name.charCodeAt(0) % AVATAR_COLORS.length
    : 0;

  const displaySkills = worker?.skills?.slice(0, 3) || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 transition-all duration-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div
          className={`w-14 h-14 rounded-full ${AVATAR_COLORS[colorIndex]} flex items-center justify-center flex-shrink-0`}
        >
          <span className="text-lg font-bold text-white">{initials}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{worker?.name}</h3>
            {worker?.verification_status === 'verified' && (
              <BadgeCheck size={18} className="text-green-500 flex-shrink-0" />
            )}
            {worker?.is_available && (
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {displaySkills.map((skill) => (
              <span
                key={skill}
                className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full"
              >
                {skill}
              </span>
            ))}
            {worker?.skills?.length > 3 && (
              <span className="text-xs text-gray-400">
                +{worker.skills.length - 3} more
              </span>
            )}
          </div>

          <RatingStars rating={worker?.rating} />

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {worker?.experience_years != null && (
              <span>{worker.experience_years}yr exp</span>
            )}
            {worker?.total_completed_services != null && (
              <span>{worker.total_completed_services} jobs</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <button
          onClick={() => onAction?.(worker)}
          className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors py-1"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
