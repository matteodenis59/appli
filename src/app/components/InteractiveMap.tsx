import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Report } from '@/types/report';

interface InteractiveMapProps {
  reports: Report[];
  onReportClick?: (report: Report) => void;
  onMapClick?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
  userLocation: { lat: number; lng: number };
  zoom?: number;
}

// ✅ CORRECTION 1 : Ajout de l'accolade { juste après les props
export function InteractiveMap({ reports, onReportClick, onMapClick, selectedLocation, userLocation, zoom = 16 }: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const createCustomIcon = (report: Report) => {
    let color = '#3b82f6';
    let iconSymbol = '📍';

    if (report.mode === 'suggestion') {
      color = '#4f46e5';
      iconSymbol = '💡';
      return L.divIcon({
        html: `<div style="background-color: ${color}; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: 16px;">${iconSymbol}</div>`,
        className: 'custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });
    }
    
    if (report.status === 'nouveau') {
      color = '#ef4444';
      iconSymbol = '⚠️';
    } else if (report.status === 'en_cours') {
      color = '#f59e0b';
      iconSymbol = '🔧';
    } else if (report.status === 'resolu') {
      color = '#10b981';
      iconSymbol = '✓';
    }

    if (report.type === 'vandalisme') {
      iconSymbol = '⚠️';
    }

    return L.divIcon({
      html: `<div style="background-color: ${color}; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: 16px;">${iconSymbol}</div>`,
      className: 'custom-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([userLocation.lat, userLocation.lng], zoom ?? 19);

    L.tileLayer("https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 20,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Important si la map apparaît après un rendu conditionnel
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // ✅ IMPORTANT : tableau vide

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const handler = (e: L.LeafletMouseEvent) => {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    };

    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [onMapClick]);



  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 15, { animate: true });

    const existing = (mapInstanceRef.current as any)._userMarker;
    if (existing) mapInstanceRef.current.removeLayer(existing);

    const marker = L.marker([userLocation.lat, userLocation.lng], {
      icon: L.divIcon({
        html: '<div style="background:#2563eb;width:14px;height:14px;border-radius:999px;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,.25)"></div>',
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
    }).addTo(mapInstanceRef.current);

    (mapInstanceRef.current as any)._userMarker = marker;
  }, [userLocation]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    reports.forEach((report) => {
      const marker = L.marker([report.location.lat, report.location.lng], {
        icon: createCustomIcon(report)
      }).addTo(mapInstanceRef.current!);

      const modeLabel = report.mode === 'probleme' ? '🚨 Problème' : report.mode === 'mobilier' ? '✅ Mobilier OK' : '💡 Suggestion';

      // Note : Attention à report.location.address qui peut être undefined si ton type Report ne le contient pas
      const popupContent = `
        <div style="min-width: 200px;">
          <img src="${report.photo}" style="width: 100%; height: 128px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" />
          <h3 style="font-weight: 600;">${report.description}</h3>
          <div style="display: flex; gap: 8px; font-size: 12px; margin-top: 8px;">
            <span style="padding: 4px 8px; border-radius: 4px; background: #eee;">${report.status}</span>
            <span style="padding: 4px 8px; border-radius: 4px; background: #eee;">${modeLabel}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      if (onReportClick) marker.on('click', () => onReportClick(report));
      markersRef.current.push(marker);
    });
  }, [reports, onReportClick]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const existingLocationMarker = (mapInstanceRef.current as any)._locationMarker;
    if (existingLocationMarker) mapInstanceRef.current.removeLayer(existingLocationMarker);

    if (selectedLocation) {
      const locationMarker = L.marker([selectedLocation.lat, selectedLocation.lng], {
        icon: L.divIcon({
          html: '<div style="background-color: #8b5cf6; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border: 4px solid white; box-shadow: 0 2px 12px rgba(139,92,246,0.5); font-size: 20px;">📍</div>',
          className: 'custom-marker pulse-marker',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        })
      }).addTo(mapInstanceRef.current);
      (mapInstanceRef.current as any)._locationMarker = locationMarker;
    }
  }, [selectedLocation]);

  // ✅ CORRECTION 2 : Le dernier useEffect est maintenant BIEN placé avant le return
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], zoom, { animate: true });
  }, [userLocation, zoom]);

  // ✅ CORRECTION 3 : Le return est le point final du rendu
  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} className="z-0" />;
} // <--- Cette accolade ferme maintenant proprement TOUTE la fonction