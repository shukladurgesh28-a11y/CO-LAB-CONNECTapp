import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

export const DEFAULT_CENTER = { lat: 18.5204, lng: 73.8567 }; // Pune

function dot(color) {
  return L.divIcon({
    className: 'cc-map-dot-wrap',
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

const DOTS = {
  request: dot('#dc2626'),
  worker: dot('#2563eb'),
  customer: dot('#7c3aed'),
  picked: dot('#4f46e5'),
};

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng], map.getZoom());
  }, [center?.lat, center?.lng]);
  return null;
}

function ClickPicker({ onPick }) {
  useMapEvents({
    click(e) {
      onPick?.({
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      });
    },
  });
  return null;
}

/**
 * Reusable real map (Leaflet + OpenStreetMap).
 *
 * markers: [{ lat, lng, label, sub, kind: 'request'|'worker'|'customer'|'picked' }]
 * onPick: when provided, clicking the map reports { lat, lng }.
 */
export default function ServiceMap({
  center,
  markers = [],
  onPick = null,
  height = 260,
  zoom = 13,
}) {
  const valid = markers.filter((m) => Number.isFinite(m?.lat) && Number.isFinite(m?.lng));
  const initial = center || valid[0] || DEFAULT_CENTER;
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200" style={{ height }}>
      <MapContainer
        center={[initial.lat, initial.lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Recenter center={center || valid[0]} />
        {onPick && <ClickPicker onPick={onPick} />}
        {valid.map((m, i) => (
          <Marker key={i} position={[m.lat, m.lng]} icon={DOTS[m.kind] || DOTS.worker}>
            {(m.label || m.sub) && (
              <Popup>
                {m.label && <div className="font-semibold text-sm">{m.label}</div>}
                {m.sub && <div className="text-xs text-gray-600">{m.sub}</div>}
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
