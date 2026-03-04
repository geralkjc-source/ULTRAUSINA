import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const QUALITY_REPORTS_FILE = path.join(DATA_DIR, "quality_reports.json");
const PENDING_ITEMS_FILE = path.join(DATA_DIR, "pending_items.json");
const OPERATIONAL_EVENTS_FILE = path.join(DATA_DIR, "operational_events.json");

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(REPORTS_FILE)) fs.writeFileSync(REPORTS_FILE, JSON.stringify([]));
if (!fs.existsSync(QUALITY_REPORTS_FILE)) fs.writeFileSync(QUALITY_REPORTS_FILE, JSON.stringify([]));
if (!fs.existsSync(PENDING_ITEMS_FILE)) fs.writeFileSync(PENDING_ITEMS_FILE, JSON.stringify([]));
if (!fs.existsSync(OPERATIONAL_EVENTS_FILE)) fs.writeFileSync(OPERATIONAL_EVENTS_FILE, JSON.stringify([]));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Helper to read/write JSON files
  const readJSON = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
  const writeJSON = (file: string, data: any) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", version: "3.2" });
  });

  // Reports Endpoints
  app.get("/api/reports", (req, res) => {
    try {
      const reports = readJSON(REPORTS_FILE);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to read reports" });
    }
  });

  app.post("/api/reports", (req, res) => {
    try {
      const reports = readJSON(REPORTS_FILE);
      const newReport = req.body;
      reports.push(newReport);
      writeJSON(REPORTS_FILE, reports);
      res.status(201).json(newReport);
    } catch (error) {
      res.status(500).json({ error: "Failed to save report" });
    }
  });

  // Quality Reports Endpoints
  app.get("/api/quality-reports", (req, res) => {
    try {
      const reports = readJSON(QUALITY_REPORTS_FILE);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to read quality reports" });
    }
  });

  app.post("/api/quality-reports", (req, res) => {
    try {
      const reports = readJSON(QUALITY_REPORTS_FILE);
      const newReport = req.body;
      reports.push(newReport);
      writeJSON(QUALITY_REPORTS_FILE, reports);
      res.status(201).json(newReport);
    } catch (error) {
      res.status(500).json({ error: "Failed to save quality report" });
    }
  });

  // Pending Items Endpoints
  app.get("/api/pending-items", (req, res) => {
    try {
      const items = readJSON(PENDING_ITEMS_FILE);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to read pending items" });
    }
  });

  app.post("/api/pending-items", (req, res) => {
    try {
      const items = readJSON(PENDING_ITEMS_FILE);
      const newItem = req.body;
      items.push(newItem);
      writeJSON(PENDING_ITEMS_FILE, items);
      res.status(201).json(newItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to save pending item" });
    }
  });

  // Operational Events Endpoints
  app.get("/api/operational-events", (req, res) => {
    try {
      const events = readJSON(OPERATIONAL_EVENTS_FILE);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to read operational events" });
    }
  });

  app.post("/api/operational-events", (req, res) => {
    try {
      const events = readJSON(OPERATIONAL_EVENTS_FILE);
      const newEvent = req.body;
      events.push(newEvent);
      writeJSON(OPERATIONAL_EVENTS_FILE, events);
      res.status(201).json(newEvent);
    } catch (error) {
      res.status(500).json({ error: "Failed to save operational event" });
    }
  });

  // Sync Endpoint (v3.2)
  app.post("/api/sync", (req, res) => {
    try {
      const { reports: incomingReports, pending: incomingPending, qualityReports: incomingQuality, operationalEvents: incomingOperational, mes_referencia } = req.body;
      
      // 1. Sync Reports
      if (incomingReports && Array.isArray(incomingReports)) {
        const reports = readJSON(REPORTS_FILE);
        incomingReports.forEach((r: any) => {
          const index = reports.findIndex((existing: any) => existing.id === r.id);
          if (index === -1) reports.push(r);
          else reports[index] = { ...reports[index], ...r };
        });
        writeJSON(REPORTS_FILE, reports);
      }

      // 2. Sync Pending Items
      if (incomingPending && Array.isArray(incomingPending)) {
        const pending = readJSON(PENDING_ITEMS_FILE);
        incomingPending.forEach((p: any) => {
          const index = pending.findIndex((existing: any) => existing.id === p.id);
          if (index === -1) pending.push(p);
          else pending[index] = { ...pending[index], ...p };
        });
        writeJSON(PENDING_ITEMS_FILE, pending);
      }

      // 3. Sync Quality Reports
      if (incomingQuality && Array.isArray(incomingQuality)) {
        const quality = readJSON(QUALITY_REPORTS_FILE);
        incomingQuality.forEach((qr: any) => {
          const index = quality.findIndex((existing: any) => existing.id === qr.id);
          if (index === -1) quality.push(qr);
          else quality[index] = { ...quality[index], ...qr };
        });
        writeJSON(QUALITY_REPORTS_FILE, quality);
      }

      // 4. Sync Operational Events
      if (incomingOperational && Array.isArray(incomingOperational)) {
        const events = readJSON(OPERATIONAL_EVENTS_FILE);
        incomingOperational.forEach((oe: any) => {
          const index = events.findIndex((existing: any) => existing.id === oe.id);
          if (index === -1) events.push(oe);
          else events[index] = { ...events[index], ...oe };
        });
        writeJSON(OPERATIONAL_EVENTS_FILE, events);
      }

      res.json({ success: true, message: "Sincronismo v3.2 Concluído no Backend." });
    } catch (error) {
      console.error("Sync Error:", error);
      res.status(500).json({ success: false, message: "Erro no sincronismo v3.2." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from dist in production
    const distPath = path.join(__dirname, "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
