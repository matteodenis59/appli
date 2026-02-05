import { useEffect, useState, useCallback } from "react";
import { InteractiveMap } from "@/app/components/InteractiveMap";
import { ReportForm } from "@/app/components/ReportForm";
import { Report, ReportStatus, ReportMode, ReportType, ReportCategory } from "@/types/report";
import { ReportDetail } from "@/app/components/ReportDetail";
import { AdminPanel } from "@/app/components/AdminPanel";
import { ProfileMenu } from "@/app/components/ProfileMenu";
import { LoginScreen } from "@/LoginScreen"; 
import { Plus, Layers, Map as MapIcon, X, User, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";

// Imports Firebase & Firestore
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, updateDoc, increment } from "firebase/firestore"; // ✅ Ajouté
import { auth, db } from "@/firebase"; // ✅ Ajouté db
import { listenReports, createReport, listenUserData, getGlobalRank } from "@/api/reports.firestore"; // ✅ Ajouté les fonctions de stats
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getCountFromServer 
} from "firebase/firestore";

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
  
  // État Stats Utilisateur
  const [userStats, setUserStats] = useState({ points: 0, globalRank: 0 });

  // --- ÉTATS AUTH & GÉOLOC ---
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true); 
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
        setGeoError("Position indisponible.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, []);

  // 1 & 2. GESTION DE L'AUTH, CRÉATION DE PROFIL & GÉOLOC
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      // --- ÉTAPE A : GESTION FIRESTORE ---
      const userRef = doc(db, "users", currentUser.uid);
      
      try {
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // Création initiale si le compte n'existe pas en base
          await setDoc(userRef, {
            uid: currentUser.uid,
            displayName: currentUser.displayName || "Citoyen",
            email: currentUser.email,
            photoURL: currentUser.photoURL || "",
            points: 347, // Score de départ
            createdAt: new Date().toISOString()
          });
          console.log("Nouveau profil Firestore créé !");
        }
      } catch (error) {
        console.error("Erreur Firestore lors de l'auth:", error);
      }

      // --- ÉTAPE B : MISE À JOUR ÉTAT & GÉOLOC ---
      setUser(currentUser);
      requestGeolocation();
    } else {
      setUser(null);
    }
    
    setAuthLoading(false);
  });

  return () => unsubscribe();
}, [requestGeolocation]);

  // 3. ÉCOUTE FIRESTORE (Reports)
  useEffect(() => {
    if (user) {
      const unsub = listenReports(setReports);
      return () => unsub();
    }
  }, [user]);

  // 4. ÉCOUTE DATA UTILISATEUR (Points & Rang)
  useEffect(() => {
  if (!user) return;

  // On crée la référence au document
  const userRef = doc(db, "users", user.uid);

  // Écouteur temps réel pour les points
  const unsub = onSnapshot(userRef, async (snap) => {
    try {
      if (snap.exists()) {
        const currentPoints = snap.data().points || 0;

        // Calcul du rang de manière isolée (sans bloquer le reste)
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("points", ">", currentPoints));
        const rankSnap = await getCountFromServer(q);
        const newRank = rankSnap.data().count + 1;

        // On met à jour l'état une seule fois
        setUserStats({
          points: currentPoints,
          globalRank: newRank
        });
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour des stats:", err);
    }
  });

  return () => unsub();
}, [user]); // Ne dépend que de l'utilisateur

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
    if (!user) return;
    
    try {
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
        reportedBy: user.uid,
        validations: 0,
        validatedBy: [],
        ...(data.type && { type: data.type }) 
      };

      await createReport(newReport);
      setShowReportForm(false);
      setSelectedLocation(null);
      
      // ✅ Mise à jour Firestore (Increment)
      const pointsToAdd = data.mode === "probleme" ? 20 : 10;
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        points: increment(pointsToAdd)
      });

      toast.success(`Signalement envoyé ! +${pointsToAdd} points`);
    } catch (e) {
      console.error("Erreur envoi:", e);
      toast.error("Erreur lors de l'envoi");
    }
  };

  // --- RENDU ---

  if (authLoading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <Loader2 className="animate-spin text-red-600 mb-4" size={48} />
      <p className="font-bold tracking-widest">CHARGEMENT...</p>
    </div>
  );

  if (!user) return <LoginScreen />;

  const userData = {
    name: user.displayName || "Citoyen",
    photo: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'U'}&background=random`,
    points: userStats.points,
    level: Math.floor(userStats.points / 50),
    rank: userStats.globalRank,
    badge: userStats.globalRank <= 3 && userStats.points > 0 ? "🥇 Top Contributeur" : "🏆 Citoyen Actif",
  };

  return (
    <div className="h-screen w-screen relative bg-slate-900 overflow-hidden font-sans">
      <Toaster position="top-center" richColors />

      {/* 1. CARTE */}
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
          <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 text-slate-500">
             <Loader2 className="animate-spin mb-4" size={32} />
             <p className="font-medium italic">Localisation en cours...</p>
          </div>
        )}
      </div>

      {/* 2. BOUTONS FLOTTANTS (Top Right) */}
      <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-3 pointer-events-none">
        <button 
          onClick={() => setShowProfileMenu(true)} 
          className="bg-white/90 backdrop-blur-md p-1 rounded-full shadow-lg border border-white/40 pointer-events-auto"
        >
          <div className="relative">
            <img src={userData.photo} className="w-11 h-11 rounded-full object-cover" alt="Profil" />
            <div className="absolute -bottom-1 -right-1 bg-blue-600 text-[10px] font-bold text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
              {userData.level}
            </div>
          </div>
        </button>

        <button 
          onClick={() => {
            const newMode = userMode === "citizen" ? "agent" : "citizen";
            setUserMode(newMode);
            setShowAdminPanel(newMode === "agent");
          }} 
          className={`pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl font-bold shadow-lg border ${
            userMode === "agent" ? "bg-emerald-500 text-white" : "bg-white/90 text-slate-700"
          }`}
        >
          {userMode === "agent" ? <Layers size={18} /> : <User size={18} />}
          <span className="text-[10px] uppercase">{userMode === "agent" ? "Agent" : "Citoyen"}</span>
        </button>
      </div>

      {/* 3. LOGO & BOUTON SIGNALER (Bottom) */}
      <div className="absolute bottom-8 left-6 right-6 z-40 flex items-end justify-between pointer-events-none">
        <div className="bg-white/90 backdrop-blur-lg px-4 py-3 rounded-2xl shadow-xl border border-white/40 flex items-center gap-3 pointer-events-auto">
          <div className="bg-red-500 p-1.5 rounded-lg"><MapIcon className="text-white" size={18} /></div>
          <h1 className="text-lg font-bold text-slate-800">a<span className="text-red-600">MEL</span>iorons</h1>
        </div>

        {userMode === "citizen" && !showReportForm && !selectingLocation && (
          <button 
            onClick={() => setShowReportForm(true)} 
            className="bg-blue-600 text-white p-5 rounded-3xl shadow-2xl hover:scale-105 active:scale-95 transition-all pointer-events-auto"
          >
            <Plus size={28} strokeWidth={3} />
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
            <div className="max-h-[75vh] overflow-y-auto">
              <ReportForm 
                onSubmit={handleReportSubmit} 
                onCancel={() => { setShowReportForm(false); setSelectedLocation(null); }} 
                initialLocation={selectedLocation} 
                userLocation={userLocation!} // ✅ Ajouté pour fixer le bug GPS
                onLocationSelect={() => { setShowReportForm(false); setSelectingLocation(true); }} 
              />
            </div>
          </div>
        </div>
      )}

      {showAdminPanel && userMode === "agent" && (
        <div className="absolute bottom-0 left-0 right-0 h-[65vh] z-40 bg-white rounded-t-[40px] shadow-2xl border-t overflow-hidden">
           <AdminPanel reports={reports} onReportClick={setSelectedReport} onStatusChange={() => {}} onValidate={() => {}} />
        </div>
      )}

      {selectedReport && <ReportDetail report={selectedReport} onClose={() => setSelectedReport(null)} isAdmin={userMode === "agent"} />}
      
      <ProfileMenu 
      isOpen={showProfileMenu} 
      onClose={() => setShowProfileMenu(false)} 
      userName={user?.displayName || "Citoyen"} 
      userPhoto={user?.photoURL || "url_par_defaut"} 
      points={userStats.points}     // Tes points Firestore
      globalRank={userStats.globalRank} // Ton rang calculé
      onLogout={() => auth.signOut()} 
    />
    </div>
  );
}
