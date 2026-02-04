import { useState } from 'react';
import { Camera, X, Check, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import { ReportType, ReportCategory, ReportMode } from '@/types/report';

const SUGGESTION_PLACEHOLDER_PHOTO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#EEF2FF"/>
      <stop offset="1" stop-color="#E0E7FF"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="700" fill="url(#g)"/>
  <g fill="#4F46E5" opacity="0.12">
    <circle cx="180" cy="140" r="110"/>
    <circle cx="1040" cy="170" r="130"/>
    <circle cx="980" cy="560" r="150"/>
    <circle cx="220" cy="540" r="150"/>
  </g>
  <g font-family="Poppins, Arial, sans-serif" text-anchor="middle">
    <text x="600" y="330" font-size="44" fill="#111827" font-weight="700">Suggestion</text>
    <text x="600" y="390" font-size="22" fill="#374151">Ajoute une photo si tu veux (facultatif)</text>
  </g>
</svg>
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
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToCompressedDataUrl(file, 1024, 1024, 0.65);
      setPhotoPreview(dataUrl);
      captureLocation(); // tu gardes ta logique actuelle
    } catch (err) {
      console.error("Erreur traitement photo:", err);
      alert("Impossible de traiter la photo.");
    }
  };

  async function fileToCompressedDataUrl(
    file: File,
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.65
  ): Promise<string> {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = url;
    });

    let { width, height } = img;

    const scale = Math.min(maxWidth / width, maxHeight / height, 1);
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context not available");

    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    // JPEG compressé => beaucoup plus léger que PNG/base64 brut
    return canvas.toDataURL("image/jpeg", quality);
  }


  const captureLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(newLocation);
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
          // Utiliser une position par défaut (centre de Lille) si échec
          setLocation({ lat: 50.6292, lng: 3.0573 });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      // Fallback si géolocalisation non disponible
      setLocation({ lat: 50.6292, lng: 3.0573 });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Champs obligatoires
    if (!location || !description) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Photo obligatoire uniquement pour "problème" et "mobilier OK"
    if (mode !== 'suggestion' && !photoPreview) {
      alert('Veuillez ajouter une photo');
      return;
    }

    onSubmit({
      mode,
      type: mode === 'probleme' ? type : undefined,
      category,
      description,
      photo: photoPreview || SUGGESTION_PLACEHOLDER_PHOTO,
      location: location
    });
  };

  return (
    <div className="px-4 pb-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode de rapport */}
        <div>
          <label className="block text-sm font-medium mb-2">Type de signalement</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setMode('probleme')}
              className={`py-3 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'probleme'
                  ? 'bg-red-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <AlertTriangle size={18} />
              Problème
            </button>
            <button
              type="button"
              onClick={() => setMode('mobilier')}
              className={`py-3 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'mobilier'
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CheckCircle size={18} />
              Mobilier OK
            </button>
            <button
              type="button"
              onClick={() => setMode('suggestion')}
              className={`py-3 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                mode === 'suggestion'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="text-base leading-none">💡</span>
              Suggestion
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            <span className="font-medium">Suggestion</span> = proposer un nouveau mobilier, un aménagement, une idée pour simplifier la mobilité…
          </p>
        </div>

        {/* Type de problème - Uniquement pour mode problème */}
        {mode === 'probleme' && (
          <div>
            <label className="block text-sm font-medium mb-2">Type de problème</label>
            <div className="grid grid-cols-2 gap-2">
              {(['usure', 'vandalisme'] as ReportType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    type === t
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Catégorie */}
        <div>
          <label className="block text-sm font-medium mb-2">Catégorie</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ReportCategory)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="mobilier">Mobilier urbain</option>
            <option value="signalisation">Signalisation</option>
            <option value="mobilite">Mobilité</option>
            <option value="autre">Autre</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              mode === 'probleme'
                ? 'Décrivez le problème constaté...'
                : mode === 'mobilier'
                  ? "Décrivez le mobilier (ex: Banc en bois, Panneau d'information...)"
                  : "Décrivez votre idée (ex: ajouter un banc, créer une rampe, améliorer un passage piéton...)"
            }
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Photo */}
        <div>
          <label className="block text-sm font-medium mb-2">Photo</label>
          {mode === 'suggestion' && (
            <p className="text-xs text-gray-500 mb-2">
              Optionnelle (tu peux illustrer l’endroit ou l’idée).
            </p>
          )}
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              {location && (
                <div className="absolute bottom-2 left-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg">
                  <MapPin size={14} />
                  Position capturée
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setPhotoPreview('');
                  setLocation(null);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <Camera size={32} className="text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Cliquez pour prendre une photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                hidden
              />

            </label>
          )}
        </div>

        {/* Boutons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
          >
            Réinitialiser
          </button>
          <button
            type="submit"
            className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 flex items-center justify-center gap-2"
          >
            <Check size={20} />
            Envoyer
          </button>
        </div>
      </form>
    </div>
  );
}
