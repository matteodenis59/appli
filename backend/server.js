// 1) Imports
import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import { z } from "zod";

// 2) Setup Express
const app = express();
app.use(cors());
app.use(express.json());

// 3) Setup SQLite
const db = new Database("data.sqlite");

// 4) Création de la table
db.exec(`
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  type TEXT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  photo TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  address TEXT,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  reported_by TEXT NOT NULL,
  validations INTEGER DEFAULT 0,
  validated_by TEXT DEFAULT '[]'
);
`);

// 5) Zod schema
const ReportSchema = z.object({
  id: z.string(),
  mode: z.enum(["probleme", "mobilier", "suggestion"]),
  type: z.enum(["usure", "vandalisme"]).optional(),
  category: z.enum(["mobilier", "signalisation", "mobilite", "autre"]),
  description: z.string(),
  photo: z.string().optional().nullable(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional().nullable(),
  }),
  date: z.string(),
  status: z.enum(["nouveau", "en_cours", "resolu"]),
  reportedBy: z.string(),
  validations: z.number().optional(),
  validatedBy: z.array(z.string()).optional(),
});

// 6) ➜ ICI tu places ton app.post !!!
app.post("/api/reports", (req, res) => {
  const parsed = ReportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const r = parsed.data;

  db.prepare(`
    INSERT INTO reports (
      id, mode, type, category, description, photo,
      lat, lng, address,
      date, status, reported_by,
      validations, validated_by
    )
    VALUES (@id, @mode, @type, @category, @description, @photo,
            @lat, @lng, @address,
            @date, @status, @reportedBy,
            @validations, @validatedBy)
  `).run({
    id: r.id,
    mode: r.mode,
    type: r.type ?? null,
    category: r.category,
    description: r.description,
    photo: r.photo ?? null,
    lat: r.location.lat,
    lng: r.location.lng,
    address: r.location.address ?? null,
    date: r.date,
    status: r.status,
    reported_by: r.reportedBy,
    validations: r.validations ?? 0,
    validated_by: JSON.stringify(r.validatedBy ?? []),
  });

  res.status(201).json(r);
});

// 7) Autres routes (GET, PATCH…)
// …
app.get("/api/health", (req, res) => res.json({ ok: true }));

// 8) Serveur
const PORT = 4000;
app.listen(PORT, () => console.log("Backend running on http://localhost:" + PORT));
