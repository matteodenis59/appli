import { useEffect, useState, useCallback } from "react";
import { InteractiveMap } from "@/app/components/InteractiveMap";
import { ReportForm } from "@/app/components/ReportForm";
import { Report, ReportStatus } from "@/types/report";
import { ReportDetail } from "@/app/components/ReportDetail";
import { AdminPanel } from "@/app/components/AdminPanel";
import { ProfileMenu } from "@/app/components/ProfileMenu";
import { LoginScreen } from "@/LoginScreen"; 
import { Plus, Layers, Map as MapIcon, X, User, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";

// Import unique du type User de Firebase
import type { User as FirebaseUser } from "firebase/auth";
import { auth } from "@/firebase";
import { listenReports, createReport } from "@/api/reports.firestore";
import { listenAuth } from "@/auth";

type UserMode = "citizen" | "agent";

export default function App() {
  // --- ÉTATS ---
  const [reports, setReports] = useState<Report[]>([]);
  const [userMode, setUserMode] = useState<UserMode>("citizen");
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectingLocation, setSelectingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userStats, setUserStats] = useState({ points: 0, globalRank: 0 });

  // --- ÉTATS AUTH & GÉOLOC ---
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // Pour attendre Firebase
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // --- LOGIQUE GÉOLOCALISATION ---
  const requestGeolocation = useCallback(() => {
    setGeoLoading(true);
    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n’est pas supportée.");
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
        setGeoError("Impossible de récupérer votre position.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, []);

  // --- GESTION DE LA CONNEXION & SESSION ---
  useEffect(() => {
    const unsubAuth = listenAuth((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      // On ne lance la géoloc QUE si l'utilisateur est bien connecté
      if (currentUser) {
        requestGeolocation();
      }
    });
    return () => unsubAuth();
  }, [requestGeolocation]);

  // --- ÉCOUTE FIRESTORE ---
  useEffect(() => {
    if (user) {
      const unsubReports = listenReports(setReports);
      return () => unsubReports();
    }
  }, [user]);

  useEffect(() => {
  if (user) {
    // 1. Écouter les points en temps réel
    const unsub = listenUserData(user.uid, async (data) => {
      const rank = await getGlobalRank(data.points || 0);
      setUserStats({ points: data.points || 0, globalRank: rank });
    });
    return () => unsub();
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
      const pointsToAdd = data.mode === "probleme" ? 20 : 10;
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
         points: increment(pointsToAdd)
      });
      toast.success("Signalement envoyé !");
    } catch (e) {
      toast.error("Erreur d'envoi");
    }
  };

  const handleStatusChange = (reportId: string, newStatus: ReportStatus) => {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
    toast.success("Statut mis à jour");
  };

  // --- ÉCRANS DE CHARGEMENT ET CONNEXION ---
  
  // 1. Attente de Firebase (Session existante)
  if (authLoading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
      <p className="font-bold tracking-tight text-xl">a<span className="text-red-600">MEL</span>iorons</p>
    </div>
  );

  // 2. Force l'utilisateur à se connecter
  if (!user) return <LoginScreen />;

  // 3. Préparation des données une fois connecté
  const userData = {
    name: user.displayName || "Citoyen",
    photo: user.photoURL || "...",
    points: userStats.points,
    level: Math.floor(userStats.points / 50),
    rank: userStats.globalRank, // <-- Nouvelle donnée
    badge: userStats.globalRank <= 3 ? "🥇 Top Contributeur" : "🏆 Citoyen Actif",
  };

  return (
    <div className="h-screen w-screen relative bg-slate-900 overflow-hidden font-sans">
      <Toaster position="top-center" richColors />

      {/* 1. CARTE PLEIN ÉCRAN */}
      <div className="absolute inset-0 z-0 h-full w-full">
        {userLocation ? (
          <InteractiveMap
            reports={reports}
            onReportClick={setSelectedReport}
            onMapClick={handleMapClick}
            selectedLocation={selectedLocation}
            userLocation={userLocation}
            zoom={18}
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 text-slate-500 p-6 text-center">
            <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
            <p className="font-medium">Initialisation de la carte...</p>
            {geoError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 max-w-xs shadow-sm">
                <p className="text-sm font-bold mb-1">Localisation requise</p>
                <p className="text-xs mb-3">{geoError}</p>
                <button onClick={() => window.location.reload()} className="text-xs font-bold underline">Réessayer</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. BOUTONS DE CONTRÔLE (Top Right) */}
      <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-3 pointer-events-none">
        <button 
          onClick={() => setShowProfileMenu(true)} 
          className="bg-white/90 backdrop-blur-md p-1 rounded-full shadow-lg border border-white/40 pointer-events-auto hover:scale-105 transition-transform"
        >
          <div className="relative">
            <img src={userData.photo} className="w-11 h-11 rounded-full object-cover" alt="Profil" />
            <div className="absolute -bottom-1 -right-1 bg-blue-600 text-[10px] font-bold text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {userData.level}
            </div>
          </div>
        </button>

        <button 
          onClick={toggleUserMode} 
          className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl font-bold shadow-lg transition-all border ${
            userMode === "agent" ? "bg-emerald-500 border-emerald-400 text-white" : "bg-white/90 text-slate-700 border-slate-200 backdrop-blur-md"
          }`}
        >
          {userMode === "agent" ? <Layers size={18} /> : <User size={18} />}
          <span className="text-[10px] uppercase tracking-wider">{userMode === "agent" ? "Agent" : "Citoyen"}</span>
        </button>
      </div>

      {/* 3. LOGO & BOUTON SIGNALER (Bottom Bar) */}
      <div className="absolute bottom-8 left-0 right-0 z-40 px-6 flex items-end justify-between pointer-events-none">
        {/* Logo Bas Gauche */}
        <div className="bg-white/90 backdrop-blur-lg px-4 py-3 rounded-2xl shadow-xl border border-white/40 flex items-center gap-3 pointer-events-auto">
          <div className="bg-red-500 p-1.5 rounded-lg">
            <MapIcon className="text-white" size={18} />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800">
            a<span className="text-red-600">MEL</span>iorons
          </h1>
        </div>

        {/* FAB Bas Droite */}
        {userMode === "citizen" && !showReportForm && !selectingLocation && (
          <button 
            onClick={() => setShowReportForm(true)} 
            className="bg-blue-600 text-white p-5 rounded-3xl shadow-2xl hover:scale-110 transition-all flex items-center gap-3 active:scale-95 pointer-events-auto"
          >
            <Plus size={28} strokeWidth={3} />
            <span className="font-bold text-sm pr-1">Signaler</span>
          </button>
        )}
      </div>

      {/* 4. MODALES, PANNEAUX & OVERLAYS */}

      {/* Indicateur de sélection de lieu */}
      {selectingLocation && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className="bg-blue-600/90 text-white px-6 py-3 rounded-full shadow-2xl animate-bounce flex items-center gap-2 backdrop-blur-sm border-2 border-white/50 font-bold">
             <Plus size={20} /> Touchez le lieu du problème
          </div>
        </div>
      )}

      {/* Formulaire Signalement */}
      {showReportForm && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-slate-900/20 backdrop-blur-[2px]">
          <div className="bg-white w-full max-w-md rounded-t-[40px] shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-8 py-6 border-b flex items-center justify-between z-10">
              <h2 className="text-xl font-bold">Nouveau Signalement</h2>
              <button onClick={() => setShowReportForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="p-2">
              <ReportForm 
                onSubmit={handleReportSubmit} 
                onCancel={() => { setShowReportForm(false); setSelectedLocation(null); }} 
                initialLocation={selectedLocation} 
                onLocationSelect={() => { setShowReportForm(false); setSelectingLocation(true); toast.info("Placez le marqueur sur la carte"); }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Panneau Agent */}
      {showAdminPanel && userMode === "agent" && (
        <div className="absolute bottom-0 left-0 right-0 h-[65vh] z-40 bg-white rounded-t-[40px] shadow-2xl overflow-hidden border-t border-slate-100">
           <AdminPanel reports={reports} onReportClick={setSelectedReport} onStatusChange={handleStatusChange} onValidate={() => {}} />
        </div>
      )}

      {/* Détails du Signalement */}
      {selectedReport && (
        <ReportDetail 
          report={selectedReport} 
          onClose={() => setSelectedReport(null)} 
          isAdmin={userMode === "agent"} 
          onStatusChange={userMode === "agent" ? handleStatusChange : undefined}
        />
      )}

      {/* Menu Profil (Drawer) */}
      <ProfileMenu 
        isOpen={showProfileMenu} 
        onClose={() => setShowProfileMenu(false)} 
        userName={userData.name} 
        userPhoto={userData.photo} 
        points={userData.points} 
        level={userData.level} 
        badge={userData.badge} 
      />
    </div>
  );
}
