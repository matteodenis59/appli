export type ReportType = 'usure' | 'vandalisme';
export type ReportCategory = 'mobilier' | 'signalisation' | 'mobilite' | 'autre';
export type ReportStatus = 'nouveau' | 'en_cours' | 'resolu';
// - probleme: signaler une dégradation
// - mobilier: confirmer qu'un mobilier existe et est en bon état
// - suggestion: proposer une amélioration (nouveau mobilier, aménagement, mobilité plus simple...)
export type ReportMode = 'probleme' | 'mobilier' | 'suggestion';

export interface Report {
  id: string;
  mode: ReportMode;
  type?: ReportType; // Uniquement pour les problèmes
  category: ReportCategory;
  description: string;
  photo: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  date: string;
  status: ReportStatus;
  reportedBy: string;
  validations?: number; // Nombre de validations pour les mobiliers
  validatedBy?: string[]; // IDs des utilisateurs qui ont validé
}
