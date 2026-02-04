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

export function InteractiveMap({ reports, onReportClick, onMapClick, selectedLocation, userLocation, zoom = 16 }: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Reprise du créateur d'icônes original GitHub
  const createCustomIcon = (report: Report) => {
    let color = '#3b82f6';
    let iconSymbol = '📍';
    if (report.mode === 'suggestion') { color = '#4f46e5'; iconSymbol = '💡'; }
    else if (report.status === 'nouveau') { color = '#ef4444'; iconSymbol = '⚠️'; }
    else if (report.status === 'en_cours') { color = '#f59e0b'; iconSymbol = '🔧'; }
    else if (report.status === 'resolu') { color = '#10b981'; iconSymbol = '✓'; }

    return L.divIcon({
      html: `<div style="background-color: ${color}; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: 16px;">${iconSymbol}</div>`,
      className: 'custom-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  };

  // --- INITIALISATION STRICTE GITHUB ---
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([userLocation.lat, userLocation.lng], zoom ?? 19);

    L.tileLayer("https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 20,
    }).addTo(map);

    mapInstanceRef.current = map;

    // FIX AFFICHAGE : Invalidation de la taille forcée après rendu
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // Tableau vide pour init unique

  // Gestion des clics
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const handler = (e: L.LeafletMouseEvent) => { onMapClick?.(e.latlng.lat, e.latlng.lng); };
    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [onMapClick]);

  // Gestion des marqueurs
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    reports.forEach((report) => {
      const marker = L.marker([report.location.lat, report.location.lng], {
        icon: createCustomIcon(report)
      }).addTo(mapInstanceRef.current!);
      
      if (onReportClick) marker.on('click', () => onReportClick(report));
      markersRef.current.push(marker);
    });
  }, [reports, onReportClick]);

  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} className="z-0" />;
}