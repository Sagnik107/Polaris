import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Create modern pulse icon for bases
const createBaseIcon = (type = 'station', status = 'Operational') => {
  const isVessel = type === 'Mobile Vessel';
  const color = status === 'Operational' ? '#29d6b0' : '#f6c85f';

  return L.divIcon({
    className: 'custom-polar-marker',
    html: `
      <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${color}; opacity: 0.25; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #04101e; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center;">
          <div style="width: 6px; height: 6px; border-radius: 50%; background: ${color};"></div>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

export const PolarMap = ({
  bases = [],
  center = [-70, 45],
  zoom = 3,
  height = '420px',
  routes = [],
}) => {
  // Standard polar route vectors between Antarctic stations
  const defaultRoutes = [
    // Bharati to Maitri Antarctic transit corridor
    [[-69.4068, 76.1953], [-67.0, 45.0], [-70.7661, 11.7322]],
  ];

  const displayRoutes = routes.length > 0 ? routes : defaultRoutes;

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-polar-950" style={{ height }}>
      {/* Radar sweep overlay */}
      <div className="absolute top-4 right-4 z-[400] flex items-center gap-2 bg-slate-900/80 backdrop-blur border border-sky-500/30 px-2.5 py-1 rounded-full text-[11px] font-mono text-sky-400">
        <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
        RADAR ACTIVE • 4 SATELLITE LINKS
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', background: '#020914' }}
      >
        {/* Standard Leaflet OpenStreetMap tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Route vectors */}
        {displayRoutes.map((route, idx) => (
          <Polyline
            key={`route-${idx}`}
            positions={route}
            pathOptions={{
              color: '#28a9f5',
              weight: 2,
              dashArray: '6, 6',
              opacity: 0.7,
            }}
          />
        ))}

        {/* Base markers */}
        {bases.map((base) => {
          if (!base.coordinates?.lat || !base.coordinates?.lng) return null;
          return (
            <Marker
              key={base._id || base.code}
              position={[base.coordinates.lat, base.coordinates.lng]}
              icon={createBaseIcon(base.type, base.status)}
            >
              <Popup className="polar-map-popup">
                <div className="p-1 text-slate-900 min-w-[160px]">
                  <h4 className="font-bold text-sm tracking-tight">{base.name}</h4>
                  <p className="text-xs text-slate-600">{base.type || 'Polar Station'}</p>
                  <div className="mt-2 text-xs border-t border-slate-200 pt-1 flex flex-col gap-0.5 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Personnel:</span>
                      <span className="font-semibold">{base.currentPersonnel || 0} / {base.capacity || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <span className="font-semibold text-teal-700">{base.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Position:</span>
                      <span>{base.coordinates.lat.toFixed(2)}°, {base.coordinates.lng.toFixed(2)}°</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default PolarMap;
