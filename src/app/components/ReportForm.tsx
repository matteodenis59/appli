import { useState } from 'react';
import { Camera, X, Check, MapPin, CheckCircle, AlertTriangle, Lightbulb, Trash2 } from 'lucide-react';
import { ReportType, ReportCategory, ReportMode } from '@/types/report';

const SUGGESTION_PLACEHOLDER_PHOTO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700"><rect width="1200" height="700" fill="#EEF2FF"/><text x="600" y="350" font-family="Arial" font-size="40" text-anchor="middle" fill="#4F46E5" font-weight="bold">Suggestion (Sans photo)</text></svg>
`)}`;

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
  onLocationSelect: () => void;
}

export function ReportForm({ onSubmit, onCancel, initialLocation, onLocationSelect }: ReportFormProps) {
  const [mode, setMode] = useState<ReportMode>('probleme');
  const [type, setType] = useState<ReportType>('usure');
  const [category, setCategory] = useState<ReportCategory>('autre');
  const [description, setDescription] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(initialLocation || null);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
      if (!location) captureLocation();
    };
    reader.readAsDataURL(file);
  };

  const captureLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation({ lat: 50.6292, lng: 3.0573 }),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return alert('La description est requise');
    if (mode !== 'suggestion' && !photoPreview) return alert('La photo est obligatoire');
    
    onSubmit({
      mode,
      type: mode === 'probleme' ? type : undefined,
      category,
      description,
      photo: photoPreview || SUGGESTION_PLACEHOLDER_PHOTO,
      location: location || { lat: 50.6292, lng: 3.0573 }
    });
  };

  return (
    <div className="px-6 pb-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* 1. SÉLECTEUR DE MODE (Compact Chips) */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
          {[
            { id: 'probleme', label: 'Problème', icon: <AlertTriangle size={14}/>, color: 'bg-red-500' },
            { id: 'mobilier', label: 'Mobilier', icon: <CheckCircle size={14}/>, color: 'bg-emerald-500' },
            { id: 'suggestion', label: 'Idée', icon: <Lightbulb size={14}/>, color: 'bg-indigo-600' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id as ReportMode)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                mode === item.id ? `${item.color} text-white shadow-md` : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        {/* 2. ÉDITION (Description & Catégorie dans un bloc) */}
        <div className="bg-slate-50 rounded-[24px] p-4 border border-slate-100 space-y-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ReportCategory)}
            className="w-full bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
          >
            <option value="mobilier">🪑 Mobilier urbain</option>
            <option value="signalisation">🚦 Signalisation</option>
            <option value="mobilite">🚲 Mobilité</option>
            <option value="autre">✨ Autre</option>
          </select>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Détails du signalement..."
            rows={2}
            className="w-full bg-transparent text-sm text-slate-600 focus:outline-none resize-none border-t border-slate-200 pt-3"
            required
          />
        </div>

        {/* 3. PHOTO & POSITION (Inline) */}
        <div className="flex gap-3">
          {photoPreview ? (
            <div className="relative w-24 h-24 shrink-0">
              <img src={photoPreview} className="w-full h-full object-cover rounded-2xl border-2 border-white shadow-md" alt="Preview" />
              <button onClick={() => setPhotoPreview('')} className="absolute -top-2 -right-2 bg-slate-900 text-white p-1 rounded-full shadow-lg">
                <X size={12} />
              </button>
            </div>
          ) : (
            <label className="w-24 h-24 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 cursor-pointer hover:bg-slate-100 transition-colors">
              <Camera size={24} />
              <span className="text-[10px] font-bold mt-1 uppercase">Photo</span>
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} hidden />
            </label>
          )}

          <button
            type="button"
            onClick={onLocationSelect}
            className={`flex-1 flex flex-col items-center justify-center rounded-2xl border-2 transition-all ${
              location 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
              : 'bg-blue-50 border-blue-100 text-blue-600 animate-pulse'
            }`}
          >
            <MapPin size={24} />
            <span className="text-[10px] font-bold mt-1 uppercase">
              {location ? 'Lieu validé' : 'Placer sur la carte'}
            </span>
          </button>
        </div>

        {/* 4. ACTIONS FINALES */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="p-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-colors"
          >
            <Trash2 size={20} />
          </button>
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white rounded-2xl font-bold py-4 shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Check size={20} /> Envoyer
          </button>
        </div>
      </form>
    </div>
  );
}