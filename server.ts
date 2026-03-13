import express from "express";
import cors from "cors";
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

const initializeFile = (file: string, defaultData: any) => {
  if (!fs.existsSync(file) || fs.readFileSync(file, "utf8").trim() === "[]" || fs.readFileSync(file, "utf8").trim() === "") {
    fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
  }
};

const sampleReports = [
  {
    id: "sample-1",
    timestamp: new Date().toISOString(),
    operator: "SISTEMA",
    area: "MOAGEM",
    turno: "A",
    turma: "1",
    status: "concluido",
    items: [
      { name: "Nivel de Oleo", status: "conforme", comment: "Ok" },
      { name: "Temperatura Mancal", status: "conforme", comment: "65C" }
    ]
  }
];

const samplePending = [
  {
    id: "sample-p1",
    timestamp: new Date().toISOString(),
    operator: "SISTEMA",
    area: "FILTRAGEM",
    turma: "2",
    description: "Vazamento na bomba 01",
    status: "pendente",
    priority: "alta"
  }
];

initializeFile(REPORTS_FILE, sampleReports);
initializeFile(QUALITY_REPORTS_FILE, []);
initializeFile(PENDING_ITEMS_FILE, samplePending);
initializeFile(OPERATIONAL_EVENTS_FILE, []);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Helper to read/write JSON files
  const readJSON = (file: string) => {
    try {
      const content = fs.readFileSync(file, "utf8");
      if (!content || content.trim() === "") return [];
      return JSON.parse(content);
    } catch (e) {
      console.error(`Error reading ${file}:`, e);
      return [];
    }
  };
  const writeJSON = (file: string, data: any) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", version: "4.0" });
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

  app.put("/api/pending-items/:id", (req, res) => {
    try {
      const items = readJSON(PENDING_ITEMS_FILE);
      const { id } = req.params;
      const index = items.findIndex((item: any) => item.id === id);
      if (index !== -1) {
        items[index] = { ...items[index], ...req.body };
        writeJSON(PENDING_ITEMS_FILE, items);
        res.json(items[index]);
      } else {
        res.status(404).json({ error: "Item not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update pending item" });
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

  // Sync Endpoint (v4.0)
  app.post("/api/sync", (req, res) => {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[${new Date().toISOString()}] [${requestId}] Sync Request Received`);
    try {
      const { reports: incomingReports, pending: incomingPending, qualityReports: incomingQuality, operationalEvents: incomingOperational } = req.body;
      
      if (!incomingReports && !incomingPending && !incomingQuality && !incomingOperational) {
        console.warn(`[${new Date().toISOString()}] [${requestId}] Empty sync request`);
        return res.json({ success: true, message: "Nada para sincronizar." });
      }

      let syncCount = 0;

      // 1. Sync Reports
      if (incomingReports && Array.isArray(incomingReports)) {
        try {
          const reports = readJSON(REPORTS_FILE);
          incomingReports.forEach((r: any) => {
            const index = reports.findIndex((existing: any) => existing.id === r.id);
            if (index === -1) { reports.push(r); syncCount++; }
            else reports[index] = { ...reports[index], ...r };
          });
          writeJSON(REPORTS_FILE, reports);
        } catch (e) {
          console.error(`[${requestId}] Error syncing reports:`, e);
          throw new Error("Erro ao salvar relatórios");
        }
      }

      // 2. Sync Pending Items
      if (incomingPending && Array.isArray(incomingPending)) {
        try {
          const pending = readJSON(PENDING_ITEMS_FILE);
          incomingPending.forEach((p: any) => {
            const index = pending.findIndex((existing: any) => existing.id === p.id);
            if (index === -1) { pending.push(p); syncCount++; }
            else pending[index] = { ...pending[index], ...p };
          });
          writeJSON(PENDING_ITEMS_FILE, pending);
        } catch (e) {
          console.error(`[${requestId}] Error syncing pending items:`, e);
          throw new Error("Erro ao salvar pendências");
        }
      }

      // 3. Sync Quality Reports
      if (incomingQuality && Array.isArray(incomingQuality)) {
        try {
          const quality = readJSON(QUALITY_REPORTS_FILE);
          incomingQuality.forEach((qr: any) => {
            const index = quality.findIndex((existing: any) => existing.id === qr.id);
            if (index === -1) { quality.push(qr); syncCount++; }
            else quality[index] = { ...quality[index], ...qr };
          });
          writeJSON(QUALITY_REPORTS_FILE, quality);
        } catch (e) {
          console.error(`[${requestId}] Error syncing quality reports:`, e);
          throw new Error("Erro ao salvar qualidade");
        }
      }

      // 4. Sync Operational Events
      if (incomingOperational && Array.isArray(incomingOperational)) {
        try {
          const events = readJSON(OPERATIONAL_EVENTS_FILE);
          incomingOperational.forEach((oe: any) => {
            const index = events.findIndex((existing: any) => existing.id === oe.id);
            if (index === -1) { events.push(oe); syncCount++; }
            else events[index] = { ...events[index], ...oe };
          });
          writeJSON(OPERATIONAL_EVENTS_FILE, events);
        } catch (e) {
          console.error(`[${requestId}] Error syncing operational events:`, e);
          throw new Error("Erro ao salvar eventos operacionais");
        }
      }

      console.log(`[${new Date().toISOString()}] [${requestId}] Sync Success: ${syncCount} new items`);
      res.json({ success: true, message: `Sincronismo v4.0 Concluído (${syncCount} novos itens).` });
    } catch (error: any) {
      console.error(`[${requestId}] Sync Error:`, error);
      res.status(500).json({ success: false, message: error.message || "Erro interno no sincronismo v4.0." });
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
