import { User, Award, TrendingUp, X } from 'lucide-react';

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
  if (!isOpen) return null;

  const getLevelColor = (level: number) => {
    if (level >= 10) return 'from-purple-500 to-pink-500';
    if (level >= 5) return 'from-blue-500 to-cyan-500';
    return 'from-green-500 to-emerald-500';
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className="fixed top-0 right-0 w-80 h-full bg-white shadow-2xl z-50 transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#ffb8b8] to-[#ff9999] p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} className="text-white" />
            </button>
            
            {/* Photo de profil */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <img
                  src={userPhoto}
                  alt={userName}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-xl object-cover"
                />
                <div className={`absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br ${getLevelColor(level)} rounded-full flex items-center justify-center border-3 border-white shadow-lg`}>
                  <span className="text-white font-bold text-sm">{level}</span>
                </div>
              </div>
            </div>

            {/* Nom */}
            <h2 className="text-center text-xl font-bold text-white mb-1">{userName}</h2>
            <p className="text-center text-white/80 text-sm">{badge}</p>
          </div>

          {/* Stats */}
          <div className="p-6 space-y-4">
            {/* Points */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border-2 border-yellow-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <TrendingUp className="text-white" size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-800">{points}</div>
                    <div className="text-sm text-gray-600">Points</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Niveau */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${getLevelColor(level)} rounded-full flex items-center justify-center shadow-lg`}>
                    <Award className="text-white" size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-800">Niveau {level}</div>
                    <div className="text-sm text-gray-600">{badge}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progression</span>
                <span>{points % 100} / 100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${getLevelColor(level)} transition-all duration-500 shadow-lg`}
                  style={{ width: `${(points % 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {100 - (points % 100)} points avant le prochain niveau
              </p>
            </div>

            {/* Statistiques supplémentaires */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="bg-blue-50 rounded-lg p-3 text-center border-2 border-blue-200">
                <div className="text-xl font-bold text-blue-700">{Math.floor(points / 20)}</div>
                <div className="text-xs text-blue-600">Signalements</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center border-2 border-green-200">
                <div className="text-xl font-bold text-green-700">{Math.floor(points / 50)}</div>
                <div className="text-xs text-green-600">Résolus</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto p-6 border-t">
            <button
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}