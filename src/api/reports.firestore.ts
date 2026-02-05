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
  getCountFromServer
} from "firebase/firestore";

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
    },
    date: Timestamp.fromDate(new Date(report.date)),
    status: report.status,
    reportedBy: report.reportedBy,
    validations: 0,
    validatedBy: [],
  };

  if (report.type) payload.type = report.type;

  await setDoc(doc(db, "reports", report.id), payload);
}

// ✅ AJOUT : Écoute les points de l'utilisateur
export function listenUserData(uid: string, cb: (data: any) => void) {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    cb(snap.exists() ? snap.data() : { points: 0 });
  });
}

// ✅ AJOUT : Calcule le rang
export async function getGlobalRank(points: number): Promise<number> {
  if (points <= 0) return 0;
  const q = query(collection(db, "users"), where("points", ">", points));
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count + 1;
}