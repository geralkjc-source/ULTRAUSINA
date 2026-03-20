import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from 'nodemailer';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const QUALITY_REPORTS_FILE = path.join(DATA_DIR, "quality_reports.json");
const PENDING_ITEMS_FILE = path.join(DATA_DIR, "pending_items.json");
const OPERATIONAL_EVENTS_FILE = path.join(DATA_DIR, "operational_events.json");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const AUTOMATION_FILE = path.join(DATA_DIR, "automation.json");

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const initializeFile = (file: string, defaultData: any) => {
  if (!fs.existsSync(file) || fs.readFileSync(file, "utf8").trim() === "") {
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

initializeFile(REPORTS_FILE, []);
initializeFile(QUALITY_REPORTS_FILE, []);
initializeFile(PENDING_ITEMS_FILE, []);
initializeFile(OPERATIONAL_EVENTS_FILE, []);
initializeFile(CONFIG_FILE, { 
  emailRecipients: "nilson.oliveira2@vulcaninternational.com",
  emailCc: "cesar.mondlane@vulcaninternational.com, stanley.ferreira@vulcaninternational.com, jacla.celestino@vulcaninternational.com",
  disciplineEmails: {
    "MECÂNICA": "bruno.rabelo@vulcaninternational.com, alcar.rafael@vulcaninternational.com, amancio.novela@vulcaninternational.com, rodrigo.silva@vulcaninternational.com",
    "ELÉTRICA": "alex.julai@vulcaninternational.com, booz.hobjane@vulcaninternational.com",
    "INSTRUMENTAÇÃO": "alex.julai@vulcaninternational.com, booz.hobjane@vulcaninternational.com",
    "OPERAÇÃO": "cesar.mondlane@vulcaninternational.com, stanley.ferreira@vulcaninternational.com, nilson.oliveira2@vulcaninternational.com"
  }
});
initializeFile(AUTOMATION_FILE, { lastAuditSentDate: "" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());
  app.use(session({
    secret: process.env.SESSION_SECRET || 'app-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,      // Required for SameSite=None
      sameSite: 'none',  // Required for cross-origin iframe
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

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

  // Auth Endpoints
  app.get('/api/auth/me', (req: any, res) => {
    if (req.session.user) {
      res.json({ authenticated: true, user: req.session.user });
    } else {
      res.json({ authenticated: false });
    }
  });

  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) return res.status(500).json({ error: "Erro ao fazer logout" });
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });

  // Email Endpoint
  app.post("/api/send-email", async (req, res) => {
    const { subject, text, attachment, to, cc, recipients: bodyRecipients, carbonCopy: bodyCC } = req.body;
    
    // Get default recipients from config if not provided
    let recipients = to || bodyRecipients;
    let carbonCopy = cc !== undefined ? cc : bodyCC;
    
    try {
      const config = readJSON(CONFIG_FILE);
      if (!recipients) recipients = config.emailRecipients || process.env.EMAIL_TO;
      if (carbonCopy === undefined) carbonCopy = config.emailCc || process.env.EMAIL_CC || "";
    } catch (e) {
      if (!recipients) recipients = process.env.EMAIL_TO;
      if (carbonCopy === undefined) carbonCopy = process.env.EMAIL_CC || "";
    }

    if (!recipients) {
      return res.status(400).json({ error: "Nenhum destinatário configurado." });
    }
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      const mailOptions: any = {
        from: process.env.SMTP_USER,
        to: recipients,
        cc: carbonCopy,
        subject: subject,
        text: text,
      };

      if (attachment) {
        mailOptions.attachments = [
          {
            filename: attachment.filename,
            content: Buffer.from(attachment.content, 'base64'),
          }
        ];
      }

      await transporter.sendMail(mailOptions);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error sending email:", error);
      
      let errorMessage = "Falha ao enviar e-mail";
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        errorMessage = "Erro de Autenticação: O usuário ou a senha do e-mail estão incorretos. Se estiver usando Gmail, você precisa usar uma 'Senha de App'.";
      }

      res.status(500).json({ 
        error: errorMessage, 
        details: error.message,
        code: error.code 
      });
    }
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

  // Config Endpoints
  app.get("/api/config", (req, res) => {
    try {
      const config = readJSON(CONFIG_FILE);
      const defaults = {
        googleScriptUrl: "",
        disciplineEmails: {
          "MECÂNICA": "bruno.rabelo@vulcaninternational.com, alcar.rafael@vulcaninternational.com, amancio.novela@vulcaninternational.com, rodrigo.silva@vulcaninternational.com",
          "ELÉTRICA": "alex.julai@vulcaninternational.com, booz.hobjane@vulcaninternational.com",
          "INSTRUMENTAÇÃO": "alex.julai@vulcaninternational.com, booz.hobjane@vulcaninternational.com",
          "OPERAÇÃO": "cesar.mondlane@vulcaninternational.com, stanley.ferreira@vulcaninternational.com, nilson.oliveira2@vulcaninternational.com"
        }
      };
      
      // Merge defaults if disciplineEmails is missing
      const mergedConfig = {
        ...defaults,
        ...config,
        disciplineEmails: {
          ...defaults.disciplineEmails,
          ...(config.disciplineEmails || {})
        }
      };
      
      res.json(mergedConfig);
    } catch (error) {
      res.status(500).json({ error: "Failed to read config" });
    }
  });

  app.post("/api/config", (req, res) => {
    try {
      writeJSON(CONFIG_FILE, req.body);
      res.json(req.body);
    } catch (error) {
      res.status(500).json({ error: "Failed to save config" });
    }
  });

  // Automation Check Endpoint
  app.get("/api/automation/check-audit", (req, res) => {
    try {
      const automation = readJSON(AUTOMATION_FILE);
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      // Check if already sent today
      if (automation.lastAuditSentDate === todayStr) {
        return res.json({ shouldSend: false });
      }

      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
      const isMonday = dayOfWeek === 1;
      
      // Check if last day of month
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const isLastDayOfMonth = tomorrow.getMonth() !== now.getMonth();

      if (isMonday || isLastDayOfMonth) {
        res.json({ shouldSend: true, reason: isMonday ? "Monday" : "Last day of month" });
      } else {
        res.json({ shouldSend: false });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to check automation" });
    }
  });

  app.post("/api/automation/mark-audit-sent", (req, res) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      writeJSON(AUTOMATION_FILE, { lastAuditSentDate: todayStr });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark audit sent" });
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
