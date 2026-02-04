import { useEffect, useState, useCallback } from "react";
import { InteractiveMap } from "@/app/components/InteractiveMap";
import { ReportForm } from "@/app/components/ReportForm";
import { Report, ReportStatus, ReportMode, ReportType, ReportCategory } from "@/types/report";
import { ReportDetail } from "@/app/components/ReportDetail";
import { AdminPanel } from "@/app/components/AdminPanel";
import { ProfileMenu } from "@/app/components/ProfileMenu";
import { Plus, Layers, Map as MapIcon, X, User } from "lucide-react";
import { toast, Toaster } from "sonner";
import { signInAnonymously } from "firebase/auth";
import { auth } from "@/firebase";
import { listenReports, createReport } from "@/api/reports.firestore";

type UserMode = "citizen" | "agent";

export default function App() {
  const [reports, setReports] = useState<Report[]>([]);
  const [userMode, setUserMode] = useState<UserMode>("citizen");
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectingLocation, setSelectingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userPoints, setUserPoints] = useState(347);

  // --- LOGIQUE GÉOLOC ORIGINALE GITHUB ---
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);

  const requestGeolocation = () => {
    setGeoLoading(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n’est pas supportée par ce navigateur.");
      setGeoLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError(null);
        setGeoLoading(false);
      },
      (err) => {
        let msg = "Impossible de récupérer votre localisation.";
        if (err.code === err.PERMISSION_DENIED) msg = "Vous avez refusé l’accès à la localisation.";
        else if (err.code === err.POSITION_UNAVAILABLE) msg = "Position indisponible (GPS/Wi-Fi).";
        else if (err.code === err.TIMEOUT) msg = "La localisation a expiré (timeout).";
        setGeoError(msg);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  useEffect(() => { requestGeolocation(); }, []);

  // --- LOGIQUE FIREBASE ---
  useEffect(() => {
    if (!auth.currentUser) signInAnonymously(auth).catch(console.error);
    const unsub = listenReports(setReports);
    return () => unsub();
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (selectingLocation) {
      setSelectedLocation({ lat, lng });
      setSelectingLocation(false);
      setShowReportForm(true);
      toast.success("Position validée");
    }
  }, [selectingLocation]);

  const handleReportSubmit = async (data: any) => {
    try {
      const uid = auth.currentUser?.uid ?? "anonymous";
      const newReport: Report = {
        ...data,
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        status: "nouveau",
        reportedBy: uid,
        validations: 0,
        validatedBy: [],
      };
      await createReport(newReport);
      setShowReportForm(false);
      setSelectedLocation(null);
      setUserPoints(p => p + (data.mode === "probleme" ? 20 : 10));
      toast.success("Signalement envoyé !");
    } catch (e) {
      toast.error("Erreur d'envoi");
    }
  };

  const userData = {
    name: "Sophie Martin",
    photo: "https://images.unsplash.com/photo-1532272478764-53cd1fe53f72?w=100&h=100&fit=crop",
    points: userPoints,
    level: Math.floor(userPoints / 50),
    badge: "🏆 Contributeur expert",
  };

  return (
    <div className="h-screen w-screen relative bg-slate-900 overflow-hidden font-sans">
      <Toaster position="top-center" richColors />

      {/* 1. CARTE (Plein écran avec logique GitHub) */}
      <div className="absolute inset-0 z-0">
        {geoLoading ? (
          <div className="h-full w-full flex flex-col items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-slate-500 font-medium italic">Récupération de votre localisation…</p>
          </div>
        ) : geoError || !userLocation ? (
          <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-sm">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Localisation requise</h2>
              <p className="text-slate-600 mb-6 text-sm">{geoError ?? "Localisation non disponible."}</p>
              <button onClick={requestGeolocation} className="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-colors">
                Réessayer
              </button>
            </div>
            {/* Debug info GitHub */}
            <div className="absolute bottom-2 left-2 z-30 bg-white/90 text-[10px] px-2 py-1 rounded border border-slate-200">
               {geoError ? `geo: error (${geoError})` : `geo: ok (${userLocation?.lat.toFixed(5)}, ${userLocation?.lng.toFixed(5)})`}
            </div>
          </div>
        ) : (
          <InteractiveMap
            reports={reports}
            onReportClick={setSelectedReport}
            onMapClick={handleMapClick}
            selectedLocation={selectedLocation}
            userLocation={userLocation}
            zoom={19}
          />
        )}
      </div>

      {/* 2. BOUTONS FLOTTANTS (Profil & Mode) */}
      <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-3 pointer-events-none">
        <button onClick={() => setShowProfileMenu(true)} className="bg-white/90 backdrop-blur-md p-1 rounded-full shadow-lg border border-white/40 pointer-events-auto hover:scale-105 transition-transform">
          <div className="relative">
            <img src={userData.photo} className="w-11 h-11 rounded-full object-cover shadow-inner" alt="Profil" />
            <div className="absolute -bottom-1 -right-1 bg-blue-600 text-[10px] font-bold text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {userData.level}
            </div>
          </div>
        </button>

        <button onClick={() => {
          const newMode = userMode === "citizen" ? "agent" : "citizen";
          setUserMode(newMode);
          setShowAdminPanel(newMode === "agent");
          toast.info(`Mode ${newMode === "agent" ? "Agent" : "Citoyen"} activé`);
        }} className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl font-bold shadow-lg transition-all border ${userMode === "agent" ? "bg-emerald-500 border-emerald-400 text-white" : "bg-white/90 border-slate-200 text-slate-700 backdrop-blur-md"}`}>
          {userMode === "agent" ? <Layers size={18} /> : <User size={18} />}
          <span className="text-[10px] uppercase tracking-wider">{userMode === "agent" ? "Agent" : "Citoyen"}</span>
        </button>
      </div>

      {/* 3. BARRE BASSE (Logo & Signalement) */}
      <div className="absolute bottom-8 left-0 right-0 z-40 px-6 flex items-end justify-between pointer-events-none">
        <div className="bg-white/90 backdrop-blur-lg px-4 py-3 rounded-2xl shadow-xl border border-white/40 flex items-center gap-3 pointer-events-auto">
          <div className="bg-red-500 p-1.5 rounded-lg"><MapIcon className="text-white" size={18} /></div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800">a<span className="text-red-600">MEL</span>iorons</h1>
        </div>

        {userMode === "citizen" && !showReportForm && !selectingLocation && (
          <button onClick={() => setShowReportForm(true)} className="bg-blue-600 text-white p-5 rounded-3xl shadow-2xl hover:bg-blue-700 hover:scale-110 transition-all flex items-center gap-3 active:scale-95 pointer-events-auto">
            <Plus size={28} strokeWidth={3} />
            <span className="font-bold pr-1 text-sm">Signaler</span>
          </button>
        )}
      </div>

      {/* 4. FORMULAIRES & DÉTAILS */}
      {showReportForm && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-slate-900/20 backdrop-blur-[2px]">
          <div className="bg-white w-full max-w-md rounded-t-[40px] shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-8 py-6 border-b border-slate-50 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-slate-800">Signalement</h2>
              <button onClick={() => setShowReportForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-400" /></button>
            </div>
            <ReportForm onSubmit={handleReportSubmit} onCancel={() => { setShowReportForm(false); setSelectedLocation(null); }} initialLocation={selectedLocation} onLocationSelect={() => { setShowReportForm(false); setSelectingLocation(true); toast.info("Où se trouve le problème ?"); }} />
          </div>
        </div>
      )}

      {showAdminPanel && userMode === "agent" && (
        <div className="absolute bottom-0 left-0 right-0 h-[65vh] z-40 bg-white rounded-t-[40px] shadow-2xl overflow-hidden border-t border-slate-100">
           <AdminPanel reports={reports} onReportClick={setSelectedReport} onStatusChange={() => {}} onValidate={() => {}} />
        </div>
      )}

      {selectedReport && <ReportDetail report={selectedReport} onClose={() => setSelectedReport(null)} isAdmin={userMode === "agent"} />}
      <ProfileMenu isOpen={showProfileMenu} onClose={() => setShowProfileMenu(false)} userName={userData.name} userPhoto={userData.photo} points={userData.points} level={userData.level} badge={userData.badge} />
    </div>
  );
}