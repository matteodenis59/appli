import { useEffect, useState, useCallback } from "react";
import { InteractiveMap } from "@/app/components/InteractiveMap";
import { ReportForm } from "@/app/components/ReportForm";
import { Report, ReportStatus, ReportMode, ReportType, ReportCategory } from "@/types/report";
import { ReportDetail } from "@/app/components/ReportDetail";
import { AdminPanel } from "@/app/components/AdminPanel";
import { ProfileMenu } from "@/app/components/ProfileMenu";
import { LoginScreen } from "@/LoginScreen"; 
import { Plus, Layers, Map as MapIcon, X, User, ArrowRight, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";

// Imports Firebase
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/firebase";
import { listenReports, createReport } from "@/api/reports.firestore";

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
  const [authLoading, setAuthLoading] = useState(true); // État pour l'attente Firebase
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // --- LOGIQUE GÉOLOCALISATION ---
  const requestGeolocation = useCallback(() => {
    setGeoLoading(true);
    setGeoError(null);

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
        let msg = "Position indisponible.";
        if (err.code === 1) msg = "Accès à la localisation refusé.";
        setGeoError(msg);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, []);

  // --- 1. GESTION DE L'AUTHENTIFICATION ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false); // Firebase a fini de vérifier la session
    });
    return () => unsubscribe();
  }, []);

  // --- 2. GESTION DE LA GÉOLOC (Seulement APRÈS Auth) ---
  useEffect(() => {
    if (!authLoading && user) {
      requestGeolocation();
    }
  }, [authLoading, user, requestGeolocation]);

  // --- 3. ÉCOUTE FIRESTORE ---
  useEffect(() => {
    if (user) {
      const unsub = listenReports(setReports);
      return () => unsub();
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
    // On crée un objet propre sans valeurs undefined
    const cleanLocation = {
      lat: data.location?.lat || userLocation?.lat || 50.6292,
      lng: data.location?.lng || userLocation?.lng || 3.0573
    };

    const newReport: Report = {
      id: crypto.randomUUID(),
      mode: data.mode,
      category: data.category,
      description: data.description,
      photo: data.photo || "",
      location: cleanLocation,
      date: new Date().toISOString(),
      status: "nouveau",
      reportedBy: user?.uid || "anonymous",
      validations: 0,
      validatedBy: [],
      // ✅ Correction : On n'ajoute 'type' que s'il existe vraiment
      ...(data.type && { type: data.type }) 
    };

    await createReport(newReport);
    setShowReportForm(false);
    setSelectedLocation(null);
    setUserPoints(p => p + (data.mode === "probleme" ? 20 : 10));
    toast.success("Signalement envoyé !");
    
    // Mise à jour des points dans Firestore (Utilise increment pour éviter les bugs)
    const pointsToAdd = data.mode === "probleme" ? 20 : 10;
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      points: increment(pointsToAdd)
    });
  } catch (e) {
    console.error("Erreur Firestore détaillée:", e); // Pour voir l'erreur réelle dans la console
    toast.error("Erreur d'envoi (problème de connexion ou de données)");
  }
};

  // --- RENDU CONDITIONNEL ---

  // A. Écran de chargement initial (Firebase vérifie la session)
  if (authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="animate-spin text-red-600 mb-4" size={48} />
        <p className="font-bold tracking-widest uppercase text-sm">Chargement d'aMELiorons...</p>
      </div>
    );
  }

  // B. Si non connecté -> Écran de Login
  if (!user) {
    return <LoginScreen />;
  }

  // C. Si connecté -> Interface Principale
  const userData = {
    name: user.displayName || "Citoyen",
    photo: user.photoURL || "...",
    points: userStats.points,
    level: Math.floor(userStats.points / 50),
    rank: userStats.globalRank, // <-- Nouvelle donnée
    badge: userStats.globalRank <= 3 ? "🥇 Top Contributeur" : "🏆 Citoyen Actif",
  };

  return (
    <div className="h-screen w-screen relative bg-slate-50 overflow-hidden font-sans">
      <Toaster position="top-center" richColors />

      {/* 1. CARTE (Fond de plan) */}
      <div className="absolute inset-0 z-0">
        {!userLocation ? (
          <div className="h-full w-full flex flex-col items-center justify-center bg-slate-100 text-slate-500">
            {geoLoading ? (
              <>
                <Loader2 className="animate-spin mb-4" size={32} />
                <p>Récupération de votre position GPS...</p>
              </>
            ) : (
              <div className="p-6 text-center max-w-xs bg-white rounded-3xl shadow-xl border border-slate-100">
                <p className="text-red-500 font-bold mb-2">Localisation requise</p>
                <p className="text-xs mb-4">{geoError || "Nous avons besoin de votre position pour afficher la carte."}</p>
                <button onClick={requestGeolocation} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-200">
                  Autoriser l'accès
                </button>
              </div>
            )}
          </div>
        ) : (
          <InteractiveMap
            reports={reports}
            onReportClick={setSelectedReport}
            onMapClick={handleMapClick}
            selectedLocation={selectedLocation}
            userLocation={userLocation}
            zoom={18}
          />
        )}
      </div>

      {/* 2. ÉLÉMENTS FLOTTANTS (Profil & Mode) */}
      <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-3 pointer-events-none">
        <button onClick={() => setShowProfileMenu(true)} className="bg-white/90 backdrop-blur-md p-1 rounded-full shadow-lg border border-white/40 pointer-events-auto">
          <img src={userData.photo} className="w-11 h-11 rounded-full object-cover shadow-sm" alt="Profil" />
        </button>

        <button onClick={() => {
          const newMode = userMode === "citizen" ? "agent" : "citizen";
          setUserMode(newMode);
          setShowAdminPanel(newMode === "agent");
        }} className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl font-bold shadow-lg border ${userMode === "agent" ? "bg-emerald-500 text-white border-emerald-400" : "bg-white text-slate-700"}`}>
          {userMode === "agent" ? <Layers size={18} /> : <User size={18} />}
          <span className="text-[10px] uppercase">{userMode === "agent" ? "Mode Agent" : "Mode Citoyen"}</span>
        </button>
      </div>

      {/* 3. LOGO & BOUTON SIGNALER (Barre basse) */}
      <div className="absolute bottom-8 left-6 right-6 z-40 flex items-end justify-between pointer-events-none">
        <div className="bg-white/90 backdrop-blur-lg px-4 py-3 rounded-2xl shadow-xl border border-white/40 flex items-center gap-3 pointer-events-auto">
          <div className="bg-red-500 p-1.5 rounded-lg"><MapIcon className="text-white" size={18} /></div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">a<span className="text-red-600">MEL</span>iorons</h1>
        </div>

        {userMode === "citizen" && !showReportForm && !selectingLocation && (
          <button onClick={() => setShowReportForm(true)} className="bg-blue-600 text-white p-5 rounded-3xl shadow-2xl hover:scale-105 active:scale-95 transition-all pointer-events-auto">
            <Plus size={28} strokeWidth={3} />
          </button>
        )}
      </div>

      {/* Modales & Panneaux */}
      {showReportForm && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-slate-900/20 backdrop-blur-[2px]">
          <div className="bg-white w-full max-w-md rounded-t-[40px] shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden">
            <div className="px-8 py-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Nouveau Signalement</h2>
              <button onClick={() => setShowReportForm(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto">
              <ReportForm 
                onSubmit={handleReportSubmit} 
                onCancel={() => { setShowReportForm(false); setSelectedLocation(null); }} 
                initialLocation={selectedLocation} 
                onLocationSelect={() => { setShowReportForm(false); setSelectingLocation(true); }} 
              />
            </div>
          </div>
        </div>
      )}

      {showAdminPanel && userMode === "agent" && (
        <div className="absolute bottom-0 left-0 right-0 h-[65vh] z-40 bg-white rounded-t-[40px] shadow-2xl border-t">
           <AdminPanel reports={reports} onReportClick={setSelectedReport} onStatusChange={() => {}} onValidate={() => {}} />
        </div>
      )}

      {selectedReport && <ReportDetail report={selectedReport} onClose={() => setSelectedReport(null)} isAdmin={userMode === "agent"} />}
      <ProfileMenu isOpen={showProfileMenu} onClose={() => setShowProfileMenu(false)} userName={userData.name} userPhoto={userData.photo} points={userData.points} level={userData.level} badge={userData.badge} />
    </div>
  );
}
