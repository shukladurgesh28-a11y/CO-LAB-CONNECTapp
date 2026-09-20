export default function ServiceCard({ service, onClick }) {
  const gradients = [
    'from-indigo-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-blue-500 to-cyan-600',
    'from-pink-500 to-rose-600',
  ];

  const gradientIndex = service?.name
    ? service.name.charCodeAt(0) % gradients.length
    : 0;

  return (
    <div
      onClick={onClick}
      className="cc-card cc-card-hover bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer"
    >
      <div
        className={`h-28 bg-gradient-to-br ${
          gradients[gradientIndex]
        } flex items-center justify-center`}
      >
        {service?.icon ? (
          <service.icon size={40} className="text-white" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {service?.name?.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1">{service?.name}</h3>

        {service?.category && (
          <span className="inline-block text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mb-2">
            {service.category}
          </span>
        )}

        {service?.description && (
          <p className="text-sm text-gray-500 line-clamp-2">
            {service.description}
          </p>
        )}
      </div>
    </div>
  );
}
