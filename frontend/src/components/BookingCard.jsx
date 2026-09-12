import { Calendar, MapPin, User } from 'lucide-react';
import StatusBadge from './StatusBadge';

const STATUS_BORDER = {
  pending: 'border-l-yellow-400',
  confirmed: 'border-l-green-400',
  allocated: 'border-l-indigo-400',
  in_progress: 'border-l-blue-400',
  en_route: 'border-l-cyan-400',
  completed: 'border-l-green-500',
  cancelled: 'border-l-red-400',
  urgent: 'border-l-red-500',
};

export default function BookingCard({ booking, onClick }) {
  const borderColor = STATUS_BORDER[booking?.status] || 'border-l-gray-300';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${borderColor} p-4 cursor-pointer transition-all duration-200 hover:shadow-md`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900 truncate pr-3">
          {booking?.service_name || booking?.service?.name || 'Service'}
        </h3>
        <StatusBadge status={booking?.status} size="sm" />
      </div>

      <div className="space-y-1.5 text-sm text-gray-600">
        {booking?.worker_name && (
          <div className="flex items-center gap-2">
            <User size={14} className="text-gray-400 flex-shrink-0" />
            <span className="truncate">{booking.worker_name}</span>
          </div>
        )}
        {booking?.date && (
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-400 flex-shrink-0" />
            <span>
              {booking.date}
              {booking.time ? ` at ${booking.time}` : ''}
            </span>
          </div>
        )}
        {booking?.location && (
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-gray-400 flex-shrink-0" />
            <span className="truncate">{booking.location}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        {booking?.amount != null && (
          <span className="text-sm font-semibold text-gray-900">
            ₹{Number(booking.amount).toLocaleString('en-IN')}
          </span>
        )}
        <span className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
          View Details →
        </span>
      </div>
    </div>
  );
}
