import { useState } from 'react';
import { Report, ReportStatus } from '@/types/report';
import { Filter, MapPin, Calendar, User, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdminPanelProps {
  reports: Report[];
  onReportClick: (report: Report) => void;
  onStatusChange: (reportId: string, newStatus: ReportStatus) => void;
  onValidate?: (reportId: string) => void;
}

export function AdminPanel({ reports, onReportClick, onStatusChange, onValidate }: AdminPanelProps) {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'tous'>('tous');
  const [categoryFilter, setCategoryFilter] = useState<string>('tous');
  const [modeFilter, setModeFilter] = useState<'tous' | 'probleme' | 'mobilier' | 'suggestion'>('tous');

  const filteredReports = reports.filter((report) => {
    const matchesStatus = statusFilter === 'tous' || report.status === statusFilter;
    const matchesCategory = categoryFilter === 'tous' || report.category === categoryFilter;
    const matchesMode = modeFilter === 'tous' || report.mode === modeFilter;
    return matchesStatus && matchesCategory && matchesMode;
  });

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'nouveau':
        return 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg border-2 border-white ring-2 ring-red-400';
      case 'en_cours':
        return 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg border-2 border-white ring-2 ring-orange-400';
      case 'resolu':
        return 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg border-2 border-white ring-2 ring-green-400';
    }
  };

  const getStatusLabel = (status: ReportStatus) => {
    switch (status) {
      case 'nouveau':
        return 'Nouveau';
      case 'en_cours':
        return 'En cours';
      case 'resolu':
        return 'Résolu';
    }
  };

  const statsData = {
    nouveau: reports.filter(r => r.status === 'nouveau').length,
    en_cours: reports.filter(r => r.status === 'en_cours').length,
    resolu: reports.filter(r => r.status === 'resolu').length,
    total: reports.length
  };

  return (
    <div className="bg-white rounded-t-3xl shadow-lg h-full flex flex-col">
      {/* En-tête */}
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold mb-4">Tableau de bord - Agent</h2>
        
        {/* Statistiques */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold">{statsData.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="bg-red-50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-red-700">{statsData.nouveau}</div>
            <div className="text-xs text-red-600">Nouveaux</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-orange-700">{statsData.en_cours}</div>
            <div className="text-xs text-orange-600">En cours</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-green-700">{statsData.resolu}</div>
            <div className="text-xs text-green-600">Résolus</div>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 items-center mb-2">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtres:</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'tous')}
            className="p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="tous">Tous les statuts</option>
            <option value="nouveau">Nouveaux</option>
            <option value="en_cours">En cours</option>
            <option value="resolu">Résolus</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="tous">Toutes catégories</option>
            <option value="mobilier">Mobilier urbain</option>
            <option value="signalisation">Signalisation</option>
            <option value="mobilite">Mobilité</option>
            <option value="autre">Autre</option>
          </select>

          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as 'tous' | 'probleme' | 'mobilier' | 'suggestion')}
            className="p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2"
          >
            <option value="tous">Tous les types</option>
            <option value="probleme">🚨 Problèmes uniquement</option>
            <option value="mobilier">✅ Mobiliers uniquement</option>
            <option value="suggestion">💡 Suggestions uniquement</option>
          </select>
        </div>
      </div>

      {/* Liste des signalements */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredReports.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle size={48} className="mx-auto mb-2 opacity-50" />
            <p>Aucun signalement trouvé</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <div
              key={report.id}
              onClick={() => onReportClick(report)}
              className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex gap-3">
                <img
                  src={report.photo}
                  alt={report.description}
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-sm line-clamp-2">{report.description}</h3>
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                    <MapPin size={12} />
                    <span className="truncate">{report.location.address}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-1 rounded font-medium ${getStatusColor(report.status)}`}>
                      {getStatusLabel(report.status)}
                    </span>
                    <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">
                      {report.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      {format(new Date(report.date), 'dd MMM yyyy', { locale: fr })}
                    </div>
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      {report.reportedBy}
                    </div>
                  </div>
                </div>
              </div>

              {/* Changement de statut */}
              <div className="mt-3 pt-3 border-t flex gap-2">
                {(['nouveau', 'en_cours', 'resolu'] as ReportStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(report.id, status);
                    }}
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                      report.status === status
                        ? getStatusColor(status) + ' cursor-default'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    disabled={report.status === status}
                  >
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
