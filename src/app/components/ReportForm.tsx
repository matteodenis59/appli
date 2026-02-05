import { useState, useEffect } from 'react';
import { Camera, X, Check, MapPin, CheckCircle, AlertTriangle, Lightbulb, Trash2 } from 'lucide-react';
import { ReportType, ReportCategory, ReportMode } from '@/types/report';

interface ReportFormProps {
  onSubmit: (data: {
    mode: ReportMode;
    type?: ReportType;
    category: ReportCategory;
    description: string;
    photo: string;
    location: { lat: number; lng: number };
  }) => void;
  onCancel: () => void;
  initialLocation?: { lat: number; lng: number } | null;
  userLocation: { lat: number; lng: number }; // Ajout de la loc GPS
  onLocationSelect: () => void;
}

export function ReportForm({ onSubmit, onCancel, initialLocation, userLocation, onLocationSelect }: ReportFormProps) {
  const [mode, setMode] = useState<ReportMode>('probleme');
  const [type, setType] = useState<ReportType>('usure');
  const [category, setCategory] = useState<ReportCategory>('autre');
  const [description, setDescription] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string>('');
  
  // On initialise avec la position manuelle SI elle existe, sinon le GPS
  const [location, setLocation] = useState<{ lat: number; lng: number }>(initialLocation || userLocation);

  // Mettre à jour si une nouvelle position est choisie sur la carte
  useEffect(() => {
    if (initialLocation) setLocation(initialLocation);
  }, [initialLocation]);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return alert('Description requise');
    if (mode !== 'suggestion' && !photoPreview) return alert('Photo obligatoire');
    
    onSubmit({
      mode,
      type: mode === 'probleme' ? type : undefined,
      category,
      description,
      photo: photoPreview || "",
      location
    });
  };

  return (
    <div className="px-5 pb-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        
        {/* 1. SÉLECTEUR DE MODE (Très fin / "Celle du haut") */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          {[
            { id: 'probleme', label: 'Problème', icon: <AlertTriangle size={14}/>, color: 'bg-red-500' },
            { id: 'mobilier', label: 'Mobilier', icon: <CheckCircle size={14}/>, color: 'bg-emerald-500' },
            { id: 'suggestion', label: 'Idée', icon: <Lightbulb size={14}/>, color: 'bg-indigo-600' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id as ReportMode)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-bold transition-all ${
                mode === item.id ? `${item.color} text-white shadow-sm` : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        {/* 2. ÉDITION COMPACTE */}
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase px-1">
             <span>Catégorie</span>
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ReportCategory)}
            className="w-full bg-white border border-slate-200 p-2 rounded-xl text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="mobilier">🪑 Mobilier urbain</option>
            <option value="signalisation">🚦 Signalisation</option>
            <option value="mobilite">🚲 Mobilité</option>
            <option value="autre">✨ Autre</option>
          </select>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Que se passe-t-il ?"
            rows={2}
            className="w-full bg-white border border-slate-200 p-3 rounded-xl text-sm text-slate-600 outline-none resize-none focus:ring-2 focus:ring-blue-100"
            required
          />
        </div>

        {/* 3. PHOTO & LOCALISATION (Optimisé pour l'écran) */}
        <div className="flex gap-2">
          {/* Bloc Photo */}
          {photoPreview ? (
            <div className="relative w-20 h-20 shrink-0">
              <img src={photoPreview} className="w-full h-full object-cover rounded-xl border border-slate-200" alt="Preview" />
              <button onClick={() => setPhotoPreview('')} className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full shadow-lg">
                <X size={10} />
              </button>
            </div>
          ) : (
            <label className="w-20 h-20 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 cursor-pointer active:bg-slate-100 transition-colors">
              <Camera size={20} />
              <span className="text-[9px] font-bold mt-1 uppercase">Photo</span>
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} hidden />
            </label>
          )}

          {/* Bloc Localisation */}
          <button
            type="button"
            onClick={onLocationSelect}
            className={`flex-1 flex flex-col items-center justify-center rounded-xl border-2 transition-all ${
              initialLocation 
              ? 'bg-blue-600 border-blue-500 text-white shadow-md' 
              : 'bg-emerald-50 border-emerald-100 text-emerald-600'
            }`}
          >
            <MapPin size={20} className={initialLocation ? 'animate-bounce' : ''} />
            <span className="text-[9px] font-bold mt-1 uppercase text-center px-1">
              {initialLocation ? 'Position précise' : 'Ma position (GPS)'}
            </span>
            <span className="text-[8px] opacity-70">Appuyer pour changer</span>
          </button>
        </div>

        {/* 4. BOUTONS D'ACTION */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <Trash2 size={18} />
          </button>
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white rounded-xl font-bold py-3 shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Check size={18} /> Confirmer
          </button>
        </div>
      </form>
    </div>
  );
}