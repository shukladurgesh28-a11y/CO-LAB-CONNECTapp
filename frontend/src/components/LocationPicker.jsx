import { useEffect, useMemo, useState } from 'react';
import { LocateFixed, MapPinned, WifiOff } from 'lucide-react';

const DEFAULT_CENTER = { lat: 18.5204, lng: 73.8567 };
const MAP_BOUNDS = { latSpan: 0.16, lngSpan: 0.2 };

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function coordinatesToPosition(coords, center) {
  return {
    left: `${50 + ((coords.lng - center.lng) / MAP_BOUNDS.lngSpan) * 100}%`,
    top: `${50 - ((coords.lat - center.lat) / MAP_BOUNDS.latSpan) * 100}%`,
  };
}

export default function LocationPicker({
  onLocationSelect,
  initialPosition,
  height = '300px',
}) {
  const [position, setPosition] = useState(initialPosition || null);
  const [center, setCenter] = useState(initialPosition || DEFAULT_CENTER);

  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
      setCenter(initialPosition);
    }
  }, [initialPosition?.lat, initialPosition?.lng]);

  const markerStyle = useMemo(
    () => (position ? coordinatesToPosition(position, center) : null),
    [position, center]
  );

  const selectFromMap = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    const y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
    const coords = {
      lat: Number((center.lat + (0.5 - y) * MAP_BOUNDS.latSpan).toFixed(6)),
      lng: Number((center.lng + (x - 0.5) * MAP_BOUNDS.lngSpan).toFixed(6)),
    };
    setPosition(coords);
    onLocationSelect?.(coords);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((result) => {
      const coords = {
        lat: Number(result.coords.latitude.toFixed(6)),
        lng: Number(result.coords.longitude.toFixed(6)),
      };
      setCenter(coords);
      setPosition(coords);
      onLocationSelect?.(coords);
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <MapPinned size={15} className="text-indigo-600" />
          Offline map
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-700">
          <WifiOff size={13} />
          Works without internet
        </div>
      </div>

      <div
        role="application"
        aria-label="Offline location map. Click to select a location."
        onClick={selectFromMap}
        className="relative isolate cursor-crosshair overflow-hidden bg-[#dce8df]"
        style={{ height }}
      >
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(#b8ccbf_1px,transparent_1px),linear-gradient(90deg,#b8ccbf_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute left-[-10%] top-[38%] h-7 w-[120%] rotate-[-12deg] border-y-4 border-white/90 bg-[#cbd8cf]" />
        <div className="absolute left-[18%] top-[-15%] h-[130%] w-6 rotate-[24deg] border-x-4 border-white/90 bg-[#cbd8cf]" />
        <div className="absolute left-[8%] top-[18%] h-20 w-32 rounded-[45%] border-2 border-emerald-200/80 bg-emerald-100/60" />
        <div className="absolute right-[8%] bottom-[14%] h-24 w-40 rounded-[45%] border-2 border-emerald-200/80 bg-emerald-100/60" />
        <div className="absolute left-3 top-3 rounded-md bg-white/85 px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
          Local area map
        </div>
        {markerStyle && (
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-full drop-shadow-md"
            style={markerStyle}
          >
            <MapPinned className="fill-indigo-600 text-white" size={34} strokeWidth={1.6} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2">
        {position ? (
          <span className="font-mono text-[11px] text-slate-600">
            {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </span>
        ) : (
          <span className="text-xs text-slate-500">Click anywhere to choose a service location</span>
        )}
        <button
          type="button"
          onClick={useCurrentLocation}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          <LocateFixed size={14} />
          Use my location
        </button>
      </div>
    </div>
  );
}
