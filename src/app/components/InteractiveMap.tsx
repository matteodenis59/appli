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

  // 1. Icônes des signalements (Style Pin moderne avec dégradés)
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
          <div class="bg-gradient-to-br ${colorClass} w-10 h-10 rounded-full rounded-bl-none rotate-[45deg] border-2 border-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
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

  // 2. Initialisation de la carte
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false, // On cache pour libérer le haut gauche
      attributionControl: false // On épure
    }).setView([userLocation.lat, userLocation.lng], zoom);

    L.tileLayer("https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png", {
      maxZoom: 20,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Force l'affichage immédiat du conteneur
    const timer = setTimeout(() => map.invalidateSize(), 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 3. LE POINT BLEU (Utilisateur)
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    const map = mapInstanceRef.current;

    const existing = (map as any)._userMarker;
    if (existing) map.removeLayer(existing);

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
      zIndexOffset: 1000
    }).addTo(map);

    (map as any)._userMarker = userMarker;
  }, [userLocation]);

  // 4. LE MARQUEUR DE SÉLECTION (Point violet quand on clique pour signaler)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    
    const existing = (map as any)._selectionMarker;
    if (existing) map.removeLayer(existing);

    if (selectedLocation) {
      const selectionMarker = L.marker([selectedLocation.lat, selectedLocation.lng], {
        icon: L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute w-8 h-8 bg-purple-500 rounded-full animate-ping opacity-20"></div>
              <div class="bg-gradient-to-br from-purple-500 to-indigo-600 w-10 h-10 rounded-full rounded-bl-none rotate-[45deg] border-2 border-white shadow-xl flex items-center justify-center">
                <span class="rotate-[-45deg] text-lg">📍</span>
              </div>
            </div>
          `,
          className: '',
          iconSize: [40, 40],
          iconAnchor: [20, 40]
        }),
        zIndexOffset: 1100
      }).addTo(map);

      (map as any)._selectionMarker = selectionMarker;
      map.setView([selectedLocation.lat, selectedLocation.lng], map.getZoom(), { animate: true });
    }
  }, [selectedLocation]);

  // 5. Gestion des marqueurs de signalements et des POPUPS
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    reports.forEach((report) => {
      const marker = L.marker([report.location.lat, report.location.lng], {
        icon: createCustomIcon(report)
      }).addTo(mapInstanceRef.current!);

      // Popup au design Premium
      const popupContent = `
        <div class="p-1 min-w-[180px] font-sans">
          ${report.photo ? `<img src="${report.photo}" class="w-full h-24 object-cover rounded-xl mb-2" />` : ''}
          <p class="text-xs font-bold text-slate-800 leading-tight mb-1">${report.description}</p>
          <div class="flex items-center gap-1.5 mt-2">
             <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
               ${report.category}
             </span>
             <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
               report.status === 'resolu' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-red-100 text-red-600 border-red-200'
             } border">
               ${report.status}
             </span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'custom-leaflet-popup',
        closeButton: false,
        offset: [0, -10]
      });
      
      if (onReportClick) marker.on('click', () => onReportClick(report));
      markersRef.current.push(marker);
    });
  }, [reports, onReportClick]);

  // 6. Gestion du clic
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
      className="h-full w-full outline-none bg-slate-100" 
      style={{ position: 'absolute', inset: 0 }} 
    />
  );
}