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

export function InteractiveMap({ reports, onReportClick, onMapClick, selectedLocation, userLocation, zoom = 19 }: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // 1. Icônes des signalements (Style Pin moderne)
  const createCustomIcon = (report: Report) => {
    let colorClass = 'from-blue-500 to-blue-600';
    let iconSymbol = '📍';

    if (report.mode === 'suggestion') {
      colorClass = 'from-indigo-500 to-purple-600';
      iconSymbol = '💡';
    } else if (report.status === 'nouveau') {
      colorClass = 'from-red-500 to-red-600';
      iconSymbol = '⚠️';
    } else if (report.status === 'en_cours') {
      colorClass = 'from-amber-500 to-orange-600';
      iconSymbol = '🔧';
    } else if (report.status === 'resolu') {
      colorClass = 'from-emerald-500 to-teal-600';
      iconSymbol = '✅';
    }

    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-4 h-1 bg-black/20 rounded-full blur-[2px] bottom-[-18px]"></div>
          <div class="bg-gradient-to-br ${colorClass} w-10 h-10 rounded-full rounded-bl-none rotate-[45deg] border-2 border-white shadow-lg flex items-center justify-center">
            <span class="rotate-[-45deg] text-lg">${iconSymbol}</span>
          </div>
        </div>
      `,
      className: 'custom-marker-container',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });
  };

  // 2. Initialisation de la carte (Logique GitHub)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([userLocation.lat, userLocation.lng], zoom);

    L.tileLayer("https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; Stadia Maps',
      maxZoom: 20,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Force l'affichage immédiat
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 3. LE POINT BLEU (Localisation utilisateur)
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;

    // Supprimer l'ancien marqueur bleu s'il existe
    const existing = (mapInstanceRef.current as any)._userMarker;
    if (existing) mapInstanceRef.current.removeLayer(existing);

    // Créer le point bleu pulsant
    const userMarker = L.marker([userLocation.lat, userLocation.lng], {
      icon: L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-75"></div>
            <div class="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
          </div>
        `,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
      zIndexOffset: 1000 // Toujours au-dessus des autres
    }).addTo(mapInstanceRef.current);

    (mapInstanceRef.current as any)._userMarker = userMarker;
  }, [userLocation]);

  // 4. Gestion des marqueurs de signalements
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

  // 5. Gestion du clic pour la sélection de position
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const handler = (e: L.LeafletMouseEvent) => {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    };
    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [onMapClick]);

  return (
    <div 
      ref={mapRef} 
      className="h-full w-full outline-none" 
      style={{ position: 'absolute', inset: 0 }} 
    />
  );
}