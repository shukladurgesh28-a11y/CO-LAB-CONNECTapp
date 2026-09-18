import { useEffect, useState } from 'react';
import { LocateFixed, MapPinned } from 'lucide-react';
import ServiceMap, { DEFAULT_CENTER } from './ServiceMap';

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

  const pick = (coords) => {
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
      pick(coords);
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <MapPinned size={15} className="text-indigo-600" />
          Tap the map to set the service location
        </div>
      </div>

      <ServiceMap
        center={center}
        height={typeof height === 'number' ? height : parseInt(height, 10) || 300}
        onPick={pick}
        markers={position ? [{ ...position, label: 'Service location', kind: 'picked' }] : []}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2">
        {position ? (
          <span className="font-mono text-[11px] text-slate-600">
            {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </span>
        ) : (
          <span className="text-xs text-slate-500">Click anywhere on the map to choose a service location</span>
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
