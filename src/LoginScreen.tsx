import { signInGoogle } from "@/auth";
import { MapPin, ShieldCheck, Info } from "lucide-react";

export function LoginScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header avec un dégradé */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <MapPin size={32} />
          </div>
          <h1 className="text-2xl font-bold italic">Améliorons</h1>
          <p className="text-blue-100 mt-2">Signalez, agissez, améliorez votre ville.</p>
        </div>

        {/* Corps de la page */}
        <div className="p-8">
          <div className="space-y-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="text-blue-600 mt-1"><ShieldCheck size={20} /></div>
              <div>
                <h3 className="font-semibold text-slate-800">Compte Citoyen</h3>
                <p className="text-sm text-slate-500">Suivez l'état de vos signalements en temps réel.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="text-blue-600 mt-1"><Info size={20} /></div>
              <div>
                <h3 className="font-semibold text-slate-800">Impact Direct</h3>
                <p className="text-sm text-slate-500">Aidez les services techniques à intervenir plus vite.</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => signInGoogle()}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 py-3 px-4 rounded-xl font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 active:scale-[0.98]"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Continuer avec Google
          </button>

          <p className="text-center text-xs text-slate-400 mt-8">
            En vous connectant, vous acceptez de partager votre position lors de vos futurs signalements.
          </p>
        </div>
      </div>
    </div>
  );
}
