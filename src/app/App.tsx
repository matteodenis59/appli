import { useEffect, useState } from "react";
import { InteractiveMap } from "@/app/components/InteractiveMap";
import { ReportForm } from "@/app/components/ReportForm";
import { Report, ReportStatus, ReportMode, ReportType, ReportCategory } from "@/types/report";
import { ReportDetail } from "@/app/components/ReportDetail";
import { AdminPanel } from "@/app/components/AdminPanel";
import { ProfileMenu } from "@/app/components/ProfileMenu";
import { ArrowRight, User } from "lucide-react";
import { toast, Toaster } from "sonner";
import { useCallback } from "react";
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

  // Géoloc
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);

  // Connexion anonyme (uid)
  useEffect(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(console.error);
    }
  }, []);

  // Écoute Firestore temps réel
  useEffect(() => {
    const unsub = listenReports(setReports);
    return () => unsub();
  }, []);

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

  useEffect(() => {
    requestGeolocation();
  }, []);


  // Données utilisateur mock
  const userData = {
    name: "Sophie Martin",
    photo:
      "https://images.unsplash.com/photo-1532272478764-53cd1fe53f72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBmcmVuY2glMjBwZXJzb24lMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzAxMDYzNjR8MA&ixlib=rb-4.1.0&q=80&w=1080",
    points: userPoints,
    level: Math.floor(userPoints / 50),
    badge: "🏆 Contributeur expert",
  };

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (selectingLocation) {
      setSelectedLocation({ lat, lng });
      setSelectingLocation(false);
      toast.success("Localisation sélectionnée sur la carte");
    }
  }, [selectingLocation]);

  const handleReportSubmit = async (data: {
    mode: ReportMode;
    type?: ReportType;
    category: ReportCategory;
    description: string;
    photo: string;
    location: { lat: number; lng: number };
  }) => {
    try {
      const uid = auth.currentUser?.uid ?? "anonymous";

      const newReport: Report = {
        id: crypto.randomUUID(),
        mode: data.mode,
        type: data.type,
        category: data.category,
        description: data.description,
        photo: data.photo ?? "",
        location: {
          lat: Number(data.location.lat),
          lng: Number(data.location.lng),
        },
        date: new Date().toISOString(),
        status: "nouveau",
        reportedBy: uid,
        validations: 0,
        validatedBy: [],
      };

      await createReport(newReport);

      setShowReportForm(false);
      setSelectedLocation(null);

      const pointsEarned = data.mode === "probleme" ? 20 : 10;
      setUserPoints((prev) => prev + pointsEarned);

      if (data.mode === "probleme") {
        toast.success(`Problème signalé avec succès ! +${pointsEarned} points`);
      } else {
        toast.success(`Signalement envoyé ! +${pointsEarned} points`);
      }
    } catch (e) {
      console.error("Erreur createReport:", e);
      toast.error("Impossible d'enregistrer le signalement (voir console).");
    }
  };

  const handleValidate = (reportId: string) => {
    const report = reports.find((r) => r.id === reportId);
    if (!report || report.mode !== "mobilier") return;

    if (report.validatedBy?.includes("current-user")) {
      toast.error("Vous avez déjà validé ce mobilier");
      return;
    }

    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              validations: (r.validations || 0) + 1,
              validatedBy: [...(r.validatedBy || []), "current-user"],
            }
          : r
      )
    );

    const pointsEarned = 5;
    setUserPoints((prev) => prev + pointsEarned);
    toast.success(`Mobilier validé ! +${pointsEarned} points`);

    if (selectedReport?.id === reportId) {
      setSelectedReport({
        ...selectedReport,
        validations: (selectedReport.validations || 0) + 1,
        validatedBy: [...(selectedReport.validatedBy || []), "current-user"],
      });
    }
  };

  const handleStatusChange = (reportId: string, newStatus: ReportStatus) => {
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r)));

    if (selectedReport?.id === reportId) {
      setSelectedReport({ ...selectedReport, status: newStatus });
    }

    const statusLabels: Record<ReportStatus, string> = {
      nouveau: "Nouveau",
      en_cours: "En cours",
      resolu: "Résolu",
    };

    toast.success(`Statut changé en "${statusLabels[newStatus]}"`);
  };

  const handleReportClick = (report: Report) => {
    setSelectedReport(report);
  };

  const handleLocationSelect = () => {
    setSelectingLocation(true);
    toast.info("Cliquez sur la carte pour sélectionner une localisation");
  };

  const toggleUserMode = () => {
    const newMode: UserMode = userMode === "citizen" ? "agent" : "citizen";
    setUserMode(newMode);
    setShowReportForm(false);
    setSelectingLocation(false);
    setSelectedLocation(null);

    if (newMode === "agent") {
      setShowAdminPanel(true);
      toast.info("Mode Agent municipal activé");
    } else {
      setShowAdminPanel(false);
      toast.info("Mode Citoyen activé");
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden">
      <Toaster position="top-center" richColors />

      {/* Bandeau aMELiorons */}
      <div className="bg-[#ffb8b8] py-4 px-4 flex-shrink-0 z-30 relative flex items-center justify-between">
        <div className="w-10"></div>
        <h1 className="text-center text-3xl font-bold tracking-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <span className="text-white">a</span>
          <span className="text-red-600">MEL</span>
          <span className="text-white">iorons</span>
        </h1>

        <button onClick={() => setShowProfileMenu(true)} className="relative group">
          <img
            src={userData.photo}
            alt={userData.name}
            className="w-10 h-10 rounded-full border-2 border-white shadow-lg object-cover transition-transform group-hover:scale-110"
          />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center border-2 border-white shadow-md">
            <span className="text-white font-bold text-xs">{userData.level}</span>
          </div>
        </button>
      </div>

      {/* Switch mode utilisateur */}
      <div className="bg-white shadow-sm z-20 flex-shrink-0 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <User size={20} className={userMode === "agent" ? "text-blue-600" : "text-gray-600"} />
            <span className="font-semibold text-sm">{userMode === "agent" ? "Mode Agent" : "Mode Citoyen"}</span>
          </div>

          <button
            onClick={toggleUserMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all shadow-md ${
              userMode === "agent"
                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
                : "bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700"
            }`}
          >
            <ArrowRight size={18} />
            <span className="text-sm">{userMode === "agent" ? "Passer en Citoyen" : "Passer en Agent"}</span>
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {/* Section Carte */}
        <div className="h-[60vh] relative">
          {geoLoading ? (
            <div className="h-full flex items-center justify-center bg-white">
              <div className="text-sm text-gray-600">Récupération de votre localisation…</div>
            </div>
          ) : geoError || !userLocation ? (
            <div className="h-full flex items-center justify-center bg-white px-6 text-center">
              <div>
                <div className="text-base font-semibold text-gray-900 mb-2">Localisation requise</div>
                <div className="text-sm text-gray-600 mb-4">{geoError ?? "Localisation non disponible."}</div>

                <button
                  type="button"
                  onClick={requestGeolocation}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Réessayer
                </button>
                <div className="text-xs text-gray-500 mt-3">
                  Astuce : sur iPhone, vérifie Safari → Réglages → Localisation.
                </div>
              </div>
              <div className="absolute bottom-2 left-2 z-30 bg-white/90 text-xs px-2 py-1 rounded">
                {geoLoading ? "geo: loading" : geoError ? `geo: error (${geoError})` : `geo: ok (${userLocation?.lat.toFixed(5)}, ${userLocation?.lng.toFixed(5)})`}
              </div>

            </div>
          ) : (
            <InteractiveMap
              reports={reports}
              onReportClick={handleReportClick}
              onMapClick={handleMapClick}
              selectedLocation={selectedLocation}
              userLocation={userLocation}
              zoom={19}
            />
          )}

          {/* Légende */}
          {!showAdminPanel && !geoLoading && !geoError && userLocation && (
            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
              <div className="text-xs font-semibold mb-2 text-gray-700">Légende</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg border-2 border-white ring-2 ring-red-300"></div>
                  <span className="text-xs text-gray-600 font-medium">Nouveau</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg border-2 border-white ring-2 ring-orange-300"></div>
                  <span className="text-xs text-gray-600 font-medium">En cours</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-lg border-2 border-white ring-2 ring-green-300"></div>
                  <span className="text-xs text-gray-600 font-medium">Résolu</span>
                </div>
              </div>
            </div>
          )}

          {/* Indicateur de sélection */}
          {selectingLocation && !geoLoading && !geoError && userLocation && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
              <div className="bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg animate-pulse flex items-center gap-2">
                <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                <span className="font-medium">Cliquez sur la carte</span>
              </div>
            </div>
          )}
        </div>

        {/* Formulaire (mode citoyen) */}
        {userMode === "citizen" && (
          <div className="bg-white min-h-[40vh] pb-6">
            <div className="px-4 pt-6 pb-4">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Créer un signalement</h2>
              <p className="text-sm text-gray-600 mb-4">Aidez-nous à améliorer la métropole lilloise</p>
            </div>

            <ReportForm
              onSubmit={handleReportSubmit}
              onCancel={() => {
                setSelectedLocation(null);
                setSelectingLocation(false);
              }}
              initialLocation={selectedLocation}
              onLocationSelect={handleLocationSelect}
            />
          </div>
        )}

        {/* Panneau admin */}
        {showAdminPanel && userMode === "agent" && (
          <div className="absolute bottom-0 left-0 right-0 h-[70vh] z-20">
            <AdminPanel
              reports={reports}
              onReportClick={handleReportClick}
              onStatusChange={handleStatusChange}
              onValidate={handleValidate}
            />
          </div>
        )}

        {/* Détail signalement */}
        {selectedReport && (
          <ReportDetail
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onStatusChange={userMode === "agent" ? handleStatusChange : undefined}
            onValidate={selectedReport.mode === "mobilier" && userMode === "citizen" ? handleValidate : undefined}
            isAdmin={userMode === "agent"}
          />
        )}

        {/* Menu profil */}
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
    </div>
  );
}




