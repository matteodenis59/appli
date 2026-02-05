import type { Report } from "@/types/report";
import { db } from "@/firebase";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
  getDocs,
  getCountFromServer
} from "firebase/firestore";

/**
 * Écoute la liste des signalements en temps réel
 */
export function listenReports(cb: (reports: Report[]) => void) {
  const q = query(collection(db, "reports"), orderBy("date", "desc"));

  return onSnapshot(q, (snap) => {
    const reports = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
      } as Report;
    });

    cb(reports);
  });
}

/**
 * Crée un nouveau signalement dans Firestore
 */
export async function createReport(report: Report) {
  const payload: any = {
    id: report.id,
    mode: report.mode,
    category: report.category,
    description: report.description,
    photo: report.photo ?? "",
    location: {
      lat: report.location.lat,
      lng: report.location.lng,
      ...(report.location.address ? { address: report.location.address } : {}),
    },
    date: Timestamp.fromDate(new Date(report.date)),
    status: report.status,
    reportedBy: report.reportedBy,
    validations: report.validations ?? 0,
    validatedBy: report.validatedBy ?? [],
  };

  if (report.type) payload.type = report.type;

  await setDoc(doc(db, "reports", report.id), payload);
}

/**
 * ✅ NOUVEAU : Écoute les données d'un utilisateur (points, etc.)
 */
export function listenUserData(uid: string, cb: (data: any) => void) {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    if (snap.exists()) {
      cb(snap.data());
    } else {
      cb({ points: 0 }); // Valeur par défaut si l'utilisateur n'existe pas encore
    }
  });
}

/**
 * ✅ NOUVEAU : Calcule le rang mondial basé sur les points
 */
export async function getGlobalRank(points: number): Promise<number> {
  if (points <= 0) return 0;
  
  // On compte combien d'utilisateurs ont plus de points que l'utilisateur actuel
  const q = query(collection(db, "users"), where("points", ">", points));
  const snapshot = await getCountFromServer(q);
  
  // Rang = Nombre de personnes devant + 1
  return snapshot.data().count + 1;
}