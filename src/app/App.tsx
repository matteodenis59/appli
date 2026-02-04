import { useEffect, useState, useCallback } from "react";
import { InteractiveMap } from "@/app/components/InteractiveMap";
import { ReportForm } from "@/app/components/ReportForm";
import { Report, ReportStatus } from "@/types/report";
import { ReportDetail } from "@/app/components/ReportDetail";
import { AdminPanel } from "@/app/components/AdminPanel";
import { ProfileMenu } from "@/app/components/ProfileMenu";
import { LoginScreen } from "@/LoginScreen"; 
import { Plus, Layers, Map as MapIcon, X, User, ArrowRight } from "lucide-react";
import { toast, Toaster } from "sonner";

import type { User as FirebaseUser } from "firebase/auth";
import { auth } from "@/firebase";
import { listenReports, createReport } from "@/api/reports.firestore";
import { listenAuth } from "@/auth";

type UserMode = "citizen" | "agent";

export default function App() {
  // --- ÉTATS PARTAGÉS ---
  const [reports, setReports] = useState<Report[]>([]);
  const [userMode, setUserMode] = useState<UserMode>("citizen");
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectingLocation, setSelectingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userPoints, setUserPoints] = useState(347);

  // --- ÉTATS AUTH & GÉOLOC ---
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // --- LOGIQUE GÉOLOCALISATION (Version A) ---
  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Géolocalisation non supportée.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoError(null);
      },
      (err) => {
        setGeoError("Position indisponible.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, []);

  // --- LOGIQUE AUTH & FIRESTORE (Version B) ---
  useEffect(() => {
    const unsubAuth = listenAuth((currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) requestGeolocation();
    });
    return () => unsubAuth();
  }, [requestGeolocation]);

  useEffect(() => {
    if (user) {
      const unsubReports = listenReports(setReports);
      return () => unsubReports();
    }
  }, [user]);

  // --- HANDLERS ---
  const toggleUserMode = () => {
    const newMode = userMode === "citizen" ? "agent" : "citizen";
    setUserMode(newMode);
    setShowAdminPanel(newMode === "agent");
    toast.info(`Mode ${newMode === "agent" ? "Agent" : "Citoyen"} activé`);
  };

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
      const newReport: Report = {
        ...data,
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        status: "nouveau",
        reportedBy: user?.uid || "anonymous",
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

  const handleStatusChange = (reportId: string, newStatus: ReportStatus) => {
    // Ici vous pourriez ajouter l'appel API vers Firestore
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
    toast.success("Statut mis à jour");
  };

  // --- DONNÉES UTILISATEUR ---
  if (loading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
      <p className="font-bold">Chargement d'aMELiorons...</p>
    </div>
  );

  if (!user) return <LoginScreen />;

  const userData = {
    name: user.displayName || "Citoyen",
    photo: user.photoURL || "https://images.unsplash.com/photo-1532272478764-53cd1fe53f72?w=100&h=100&fit=crop",
    points: userPoints,
    level: Math.floor(userPoints / 50),
    badge: "🏆 Contributeur expert",
  };

  return (
    <div className="h-screen w-screen relative bg-slate-900 overflow-hidden font-sans">
      <Toaster position="top-center" richColors />

      {/* 1. CARTE PLEIN ÉCRAN */}
      <div className="absolute inset-0 z-0">
        <InteractiveMap
          reports={reports}
          onReportClick={setSelectedReport}
          onMapClick={handleMapClick}
          selectedLocation={selectedLocation}
          userLocation={userLocation}
          zoom={18}
        />
      </div>

      {/* 2. INTERFACE FLOTTANTE (Top Right) */}
      <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-3 pointer-events-none">
        <button onClick={() => setShowProfileMenu(true)} className="bg-white/90 backdrop-blur-md p-1 rounded-full shadow-lg border border-white/40 pointer-events-auto">
          <img src={userData.photo} className="w-11 h-11 rounded-full object-cover" alt="Profil" />
        </button>

        <button onClick={toggleUserMode} className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl font-bold shadow-lg transition-all border ${userMode === "agent" ? "bg-emerald-500 text-white" : "bg-white text-slate-700"}`}>
          {userMode === "agent" ? <Layers size={18} /> : <User size={18} />}
          <span className="text-[10px] uppercase tracking-wider">{userMode === "agent" ? "Mode Agent" : "Mode Citoyen"}</span>
        </button>
      </div>

      {/* 3. LOGO & BOUTON SIGNALER (Bottom) */}
      <div className="absolute bottom-8 left-0 right-0 z-40 px-6 flex items-end justify-between pointer-events-none">
        <div className="bg-white/90 backdrop-blur-lg px-4 py-3 rounded-2xl shadow-xl border border-white/40 flex items-center gap-3 pointer-events-auto">
          <div className="bg-red-500 p-1.5 rounded-lg"><MapIcon className="text-white" size={18} /></div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800">a<span className="text-red-600">MEL</span>iorons</h1>
        </div>

        {userMode === "citizen" && !showReportForm && !selectingLocation && (
          <button onClick={() => setShowReportForm(true)} className="bg-blue-600 text-white p-5 rounded-3xl shadow-2xl hover:scale-110 transition-all flex items-center gap-3 pointer-events-auto">
            <Plus size={28} strokeWidth={3} />
            <span className="font-bold text-sm">Signaler</span>
          </button>
        )}
      </div>

      {/* 4. MODALES & PANNEAUX */}
      {showReportForm && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-slate-900/20 backdrop-blur-[2px]">
          <div className="bg-white w-full max-w-md rounded-t-[40px] shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="px-8 py-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Nouveau Signalement</h2>
              <button onClick={() => setShowReportForm(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
            </div>
            <ReportForm 
              onSubmit={handleReportSubmit} 
              onCancel={() => { setShowReportForm(false); setSelectedLocation(null); }} 
              initialLocation={selectedLocation} 
              onLocationSelect={() => { setShowReportForm(false); setSelectingLocation(true); }} 
            />
          </div>
        </div>
      )}

      {showAdminPanel && userMode === "agent" && (
        <div className="absolute bottom-0 left-0 right-0 h-[65vh] z-40 bg-white rounded-t-[40px] shadow-2xl overflow-hidden">
           <AdminPanel reports={reports} onReportClick={setSelectedReport} onStatusChange={handleStatusChange} onValidate={() => {}} />
        </div>
      )}

      {selectedReport && (
        <ReportDetail 
          report={selectedReport} 
          onClose={() => setSelectedReport(null)} 
          isAdmin={userMode === "agent"} 
          onStatusChange={userMode === "agent" ? handleStatusChange : undefined}
        />
      )}

      <ProfileMenu isOpen={showProfileMenu} onClose={() => setShowProfileMenu(false)} userName={userData.name} userPhoto={userData.photo} points={userData.points} level={userData.level} badge={userData.badge} />
    </div>
  );
}
