import { X, Trophy, ShieldCheck, Star, LogOut } from "lucide-react";

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userPhoto: string;
  points: number;
  globalRank: number; // Modifié : on passe le vrai rang global
  onLogout: () => void; // Ajouté : pour gérer la déconnexion
}

export function ProfileMenu({ 
  isOpen, 
  onClose, 
  userName, 
  userPhoto, 
  points, 
  globalRank,
  onLogout 
}: ProfileMenuProps) {

  // Logique pour déterminer le titre honorifique en fonction des points
  const getStatusLabel = (pts: number) => {
    if (pts >= 1000) return "Légende Urbaine";
    if (pts >= 500) return "Expert Citoyen";
    if (pts >= 200) return "Citoyen Actif";
    return "Nouveau Citoyen";
  };

  return (
    <>
      {/* Overlay sombre */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panneau latéral */}
      <div className={`fixed top-0 right-0 h-full w-[85%] max-w-sm bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out border-l border-slate-100 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header du Profil */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
          
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <img src={userPhoto} alt={userName} className="w-24 h-24 rounded-full border-4 border-white/20 object-cover shadow-xl" />
              <div className="absolute -bottom-1 -right-1 bg-blue-500 px-2 py-1 rounded-lg flex items-center justify-center border-2 border-slate-800 shadow-lg">
                <span className="text-[10px] font-black text-white italic">LVL {Math.floor(points / 100)}</span>
              </div>
            </div>
            <h2 className="text-xl font-bold">{userName}</h2>
            {/* Statut dynamique basé sur les points réels */}
            <p className="text-blue-300 text-xs font-bold uppercase tracking-[0.2em] mt-1">
              🏆 {getStatusLabel(points)}
            </p>
          </div>
        </div>

        {/* Stats et Points */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Points réels de Firestore */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <Trophy size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Points</span>
              </div>
              <p className="text-2xl font-black text-slate-800">{points}</p>
            </div>

            {/* Rang global calculé */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Classement</span>
              </div>
              <p className="text-2xl font-black text-slate-800">
                #{globalRank || "--"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors group">
              <div className="flex items-center gap-3 text-slate-700">
                <Star className="text-slate-400 group-hover:text-amber-500 transition-colors" size={20} />
                <span className="font-semibold">Mes succès</span>
              </div>
              <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full italic">Bientôt</span>
            </button>
            
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 rounded-xl transition-colors mt-8 font-bold"
            >
              <LogOut size={20} />
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
