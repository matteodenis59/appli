import { Report, ReportStatus } from '@/types/report';
import { X, MapPin, Calendar, User, AlertCircle, Wrench, CheckCircle, ThumbsUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReportDetailProps {
  report: Report;
  onClose: () => void;
  onStatusChange?: (reportId: string, newStatus: ReportStatus) => void;
  onValidate?: (reportId: string) => void;
  isAdmin?: boolean;
}

export function ReportDetail({ report, onClose, onStatusChange, onValidate, isAdmin = false }: ReportDetailProps) {
  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case 'nouveau':
        return <AlertCircle className="text-white" size={20} />;
      case 'en_cours':
        return <Wrench className="text-white" size={20} />;
      case 'resolu':
        return <CheckCircle className="text-white" size={20} />;
    }
  };

  const getStatusLabel = (status: ReportStatus) => {
    switch (status) {
      case 'nouveau':
        return 'Nouveau';
      case 'en_cours':
        return 'En cours de traitement';
      case 'resolu':
        return 'Résolu';
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'nouveau':
        return 'bg-gradient-to-br from-red-500 to-red-600 border-white text-white shadow-xl ring-4 ring-red-400';
      case 'en_cours':
        return 'bg-gradient-to-br from-orange-500 to-orange-600 border-white text-white shadow-xl ring-4 ring-orange-400';
      case 'resolu':
        return 'bg-gradient-to-br from-green-500 to-green-600 border-white text-white shadow-xl ring-4 ring-green-400';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      mobilier: 'Mobilier urbain',
      signalisation: 'Signalisation',
      mobilite: 'Mobilité',
      autre: 'Autre'
    };
    return labels[category] || category;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center md:justify-center z-50">
      <div className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* En-tête */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Détails du signalement</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-4 space-y-4">
          {/* Photo */}
          <div className="relative">
            <img
              src={report.photo}
              alt={report.description}
              className="w-full h-64 object-cover rounded-lg"
            />
            <div className={`absolute top-3 right-3 px-3 py-2 rounded-lg border-2 font-medium flex items-center gap-2 ${getStatusColor(report.status)}`}>
              {getStatusIcon(report.status)}
              {getStatusLabel(report.status)}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold text-lg mb-2">{report.description}</h3>
          </div>

          {/* Informations */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <MapPin size={20} className="text-gray-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-gray-700">Localisation</div>
                <div className="text-sm text-gray-600">{report.location.address}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {report.location.lat.toFixed(6)}, {report.location.lng.toFixed(6)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar size={20} className="text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Date</div>
                  <div className="text-sm text-gray-600">
                    {format(new Date(report.date), 'dd MMMM yyyy', { locale: fr })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(report.date), 'HH:mm', { locale: fr })}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <User size={20} className="text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Signalé par</div>
                  <div className="text-sm text-gray-600">{report.reportedBy}</div>
                </div>
              </div>
            </div>

            {/* Catégories */}
            <div className="flex gap-2 flex-wrap">
              {report.mode === 'probleme' && (
                <span className="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium border-2 border-red-300">
                  🚨 Problème: {report.type && getTypeLabel(report.type)}
                </span>
              )}
              {report.mode === 'mobilier' && (
                <span className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium border-2 border-green-300">
                  ✅ Mobilier OK
                </span>
              )}
              {report.mode === 'suggestion' && (
                <span className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium border-2 border-indigo-300">
                  💡 Suggestion
                </span>
              )}
              <span className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium border-2 border-purple-300">
                {getCategoryLabel(report.category)}
              </span>
            </div>

            {/* Validations pour les mobiliers */}
            {report.mode === 'mobilier' && report.validations !== undefined && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                    <ThumbsUp className="text-white" size={24} />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-800">
                      {report.validations} validation{report.validations > 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-green-600">
                      {report.validations >= 10
                        ? 'Ce mobilier est certifié par la communauté !'
                        : `${10 - report.validations} validation${10 - report.validations > 1 ? 's' : ''} pour être certifié`
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bouton de validation pour les citoyens sur les mobiliers */}
          {!isAdmin && onValidate && report.mode === 'mobilier' && (
            <div className="pt-4 border-t">
              <button
                onClick={() => onValidate(report.id)}
                disabled={report.validatedBy?.includes('current-user')}
                className={`w-full py-4 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-3 ${
                  report.validatedBy?.includes('current-user')
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl'
                }`}
              >
                <ThumbsUp size={24} />
                <span className="text-lg">
                  {report.validatedBy?.includes('current-user')
                    ? 'Déjà validé ✓'
                    : 'Valider ce mobilier (+5 points)'
                  }
                </span>
              </button>
              <p className="text-xs text-center text-gray-500 mt-2">
                Confirmez que ce mobilier existe bien et est en bon état
              </p>
            </div>
          )}

          {/* Actions pour les agents */}
          {isAdmin && onStatusChange && (
            <div className="pt-4 border-t">
              <div className="text-sm font-medium text-gray-700 mb-3">Changer le statut</div>
              <div className="grid grid-cols-3 gap-2">
                {(['nouveau', 'en_cours', 'resolu'] as ReportStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => onStatusChange(report.id, status)}
                    className={`py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                      report.status === status
                        ? getStatusColor(status) + ' ring-2 ring-offset-2 ring-blue-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {getStatusIcon(status)}
                    <span className="text-sm">{getStatusLabel(status)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Validation pour les agents */}
          {isAdmin && onValidate && (
            <div className="pt-4 border-t">
              <div className="text-sm font-medium text-gray-700 mb-3">Valider le signalement</div>
              <button
                onClick={() => onValidate(report.id)}
                className="py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                <ThumbsUp size={20} />
                <span className="text-sm">Valider</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
