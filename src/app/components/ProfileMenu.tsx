import { X, Trophy, ShieldCheck, Star, LogOut } from "lucide-react";

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userPhoto: string;
  points: number;
  level: number;
  badge: string;
}

export function ProfileMenu({ isOpen, onClose, userName, userPhoto, points, level, badge }: ProfileMenuProps) {
  return (
    <>
      {/* Overlay sombre */}
      <div 
        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
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
              <div className="absolute -bottom-1 -right-1 bg-blue-500 w-8 h-8 rounded-full flex items-center justify-center border-4 border-slate-800">
                <span className="text-xs font-bold text-white">{level}</span>
              </div>
            </div>
            <h2 className="text-xl font-bold">{userName}</h2>
            <p className="text-blue-300 text-sm font-medium uppercase tracking-widest mt-1">{badge}</p>
          </div>
        </div>

        {/* Stats et Points */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <Trophy size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Points</span>
              </div>
              <p className="text-2xl font-black text-slate-800">{points}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Rang</span>
              </div>
              <p className="text-2xl font-black text-slate-800">#{level + 2}</p>
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
            
            <button className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 rounded-xl transition-colors mt-8 font-bold">
              <LogOut size={20} />
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </>
  );
}