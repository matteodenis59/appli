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
      ...(report.location.address ? { address: report.location.address } : {}),
    },
    date: Timestamp.fromDate(new Date(report.date)),
    status: report.status,
    reportedBy: report.reportedBy,
    validations: report.validations ?? 0,
    validatedBy: report.validatedBy ?? [],
  };

  // IMPORTANT : on n'ajoute "type" que s'il existe
  if (report.type) payload.type = report.type;

  await setDoc(doc(db, "reports", report.id), payload);
}
