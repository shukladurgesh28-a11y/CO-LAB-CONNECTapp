import { MapPinned } from 'lucide-react';

function project(point, bounds) {
  const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 0.01);
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.01);
  return {
    left: `${((point.longitude - bounds.minLng) / lngSpan) * 100}%`,
    top: `${100 - ((point.latitude - bounds.minLat) / latSpan) * 100}%`,
  };
}

export default function DemandHeatmap({ points = [] }) {
  if (points.length === 0) {
    return <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">No geographic demand data for this period.</div>;
  }

  const bounds = {
    minLat: Math.min(...points.map((point) => point.latitude)),
    maxLat: Math.max(...points.map((point) => point.latitude)),
    minLng: Math.min(...points.map((point) => point.longitude)),
    maxLng: Math.max(...points.map((point) => point.longitude)),
  };
  const maxDemand = Math.max(...points.map((point) => point.demand), 1);

  return (
    <div className="relative h-64 overflow-hidden rounded-xl border border-slate-200 bg-[#dce8df]" aria-label="Service demand heatmap">
      <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(#b8ccbf_1px,transparent_1px),linear-gradient(90deg,#b8ccbf_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="absolute left-[-10%] top-[38%] h-7 w-[120%] rotate-[-12deg] border-y-4 border-white/90 bg-[#cbd8cf]" />
      <div className="absolute left-[18%] top-[-15%] h-[130%] w-6 rotate-[24deg] border-x-4 border-white/90 bg-[#cbd8cf]" />
      {points.map((point) => {
        const position = project(point, bounds);
        const size = 18 + (point.demand / maxDemand) * 28;
        return (
          <div key={`${point.latitude}-${point.longitude}-${point.service_id}`} className="absolute -translate-x-1/2 -translate-y-1/2" style={position} title={`${point.service_type}: ${point.demand} requests`}>
            <div className="flex items-center justify-center rounded-full bg-red-500/25" style={{ width: size, height: size }}>
              <MapPinned size={16} className="fill-red-500 text-white drop-shadow" />
            </div>
          </div>
        );
      })}
      <div className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm">Live request locations</div>
    </div>
  );
}
