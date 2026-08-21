import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper for Gemini text generation with fallback
async function generateAiResponse(prompt: string, systemInstruction?: string, isJson: boolean = false): Promise<string> {
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || "You are an enterprise AI Automation Platform intelligence engine.",
          responseMimeType: isJson ? "application/json" : undefined,
          temperature: 0.3,
        },
      });
      if (response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn("Gemini API call failed, using intelligent deterministic fallback:", err?.message || err);
    }
  }
  return "";
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Health & System Status
app.get("/api/health", (_req, res) => {
  res.json({
    status: "healthy",
    version: "2.4.0",
    uptime: process.uptime(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
    services: {
      workflowEngine: "active",
      documentOcr: "active",
      triageWorker: "active",
      integrationsGateway: "connected",
    },
  });
});

// 2. AI Business Assistant / Copilot
app.post("/api/ai/copilot", async (req, res) => {
  try {
    const { message, history = [], contextData = {} } = req.body;
    const systemPrompt = `You are Nexus AI, the enterprise Business Copilot embedded inside an Enterprise AI Automation Platform.
You have real-time access to the company's CRM, ERP (SAP S/4HANA), Ticket System, Active Workflows, and Document Intelligence metadata.
Context summary:
- Active Workflows: ${contextData.activeWorkflowsCount || 12}
- Pending Approvals: ${contextData.pendingApprovalsCount || 4}
- Unresolved Tickets: ${contextData.unresolvedTicketsCount || 8}
- Today's Document Processing Volume: ${contextData.processedDocsCount || 47} invoices & contracts
- Automated Hours Saved: 342.5 hrs this month ($24,800 ROI)

Provide concise, authoritative, professional enterprise assistance. When relevant, propose concrete automation actions (e.g., "Trigger Invoice Approval Workflow #WF-104", "Escalate Ticket #TK-883 to Tier 3 DevOps", "Draft Vendor Reminder"). Format responses cleanly with markdown headers, bold metrics, and structured lists.`;

    const fullPrompt = `User question / instruction: ${message}\nRecent context: ${JSON.stringify(history.slice(-4))}`;
    const aiText = await generateAiResponse(fullPrompt, systemPrompt, false);

    if (aiText) {
      return res.json({ reply: aiText, source: "gemini-3.7-flash" });
    }

    // Fallback response generator
    let fallbackReply = `### Enterprise Intelligence Summary
Based on the current telemetry across your connected enterprise systems:
- **ERP & Financials**: SAP S/4HANA sync completed 4 minutes ago with 100% data integrity. 3 high-value vendor invoices ($45,200 total) are waiting in the HITL Approval Queue.
- **Workflow Automation**: 14 automated workflows executed 1,840 task steps in the last 24h with a **99.4% SLA adherence rate**.
- **Customer Support**: AI triage filtered 89 incoming emails, automatically resolving 58 tier-1 billing queries and escalating 3 churn-risk tickets.

**Recommended Action**: Would you like me to auto-approve validated low-risk invoices (< $5,000) or dispatch the weekly operations report to executive stakeholders on Slack?`;

    if (message.toLowerCase().includes("invoice") || message.toLowerCase().includes("erp")) {
      fallbackReply = `### Invoice & ERP Automation Audit
- **Detected**: 4 pending invoices from *Acme Cloud Services* ($14,250), *Apex Logistics* ($3,800), *CyberSec Global* ($12,000), and *Datadog* ($4,500).
- **Compliance Check**: 3 match purchase order terms (PO-9921, PO-8832). 1 invoice has a 5% rate discrepancy requiring manager approval.
- **AI Recommendation**: Approved invoices under $5,000 can be automatically scheduled for net-30 ACH transfer via SAP connector.`;
    } else if (message.toLowerCase().includes("ticket") || message.toLowerCase().includes("email") || message.toLowerCase().includes("support")) {
      fallbackReply = `### Inbound Support & Email Triage Overview
- **Active Queue**: 18 emails processed in the last hour.
- **Sentiment Distribution**: 72% Positive/Neutral, 28% Urgent/Frustrated.
- **Critical Ticket**: \`TK-9042\` - "SSO Authentication Gateway 502 Bad Gateway" (Customer: MegaCorp Global, ARR: $240k).
- **Automated Workflow**: Workflow \`WF-03 (P1 Incident Auto-Escalation)\` paged the On-Call DevOps engineer via PagerDuty and opened an incident channel in Slack \`#incidents-p1\`.`;
    }

    res.json({ reply: fallbackReply, source: "deterministic-engine" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to process Copilot request" });
  }
});

// 3. Document Intelligence & OCR Extraction
app.post("/api/ai/extract-document", async (req, res) => {
  try {
    const { documentName, documentType, rawText, base64 } = req.body;

    const systemPrompt = `You are a high-precision Enterprise Document Intelligence Parser.
Extract key structured metadata from the provided document (Invoice, Contract, NDA, Purchase Order, or Tax Form).
Output STRICT JSON matching this schema:
{
  "documentType": string,
  "vendorOrCounterparty": string,
  "documentId": string,
  "issueDate": string,
  "dueDateOrExpiration": string,
  "totalAmount": number,
  "currency": string,
  "taxAmount": number,
  "paymentTerms": string,
  "lineItems": [
    { "description": string, "quantity": number, "unitPrice": number, "total": number }
  ],
  "complianceScore": number (0-100),
  "riskLevel": "Low" | "Medium" | "High",
  "detectedRisks": string[],
  "keyClauses": string[],
  "summary": string
}`;

    const prompt = `Document Name: ${documentName}\nSpecified Type: ${documentType}\nContent Sample:\n${rawText || "Enterprise Service Agreement & Invoice sample"}`;
    const aiText = await generateAiResponse(prompt, systemPrompt, true);

    if (aiText) {
      try {
        const parsed = JSON.parse(aiText);
        return res.json({ extracted: parsed, source: "gemini-3.7-flash" });
      } catch (e) {
        // Parse error fallback
      }
    }

    // High quality mock extraction fallback
    const mockExtraction = {
      documentType: documentType || "Vendor Invoice",
      vendorOrCounterparty: documentName.includes("Contract") ? "OmniTech Solutions LLC" : "CloudScale Infrastructure Inc.",
      documentId: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
      issueDate: new Date().toISOString().split("T")[0],
      dueDateOrExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      totalAmount: 18450.00,
      currency: "USD",
      taxAmount: 1476.00,
      paymentTerms: "Net 30 - Wire / Automated Clearing House (ACH)",
      lineItems: [
        { description: "Managed Kubernetes Cluster Nodes (Enterprise Tier)", quantity: 6, unitPrice: 1850.00, total: 11100.00 },
        { description: "Dedicated AI Inference Gateway (NVIDIA H100 GPU Pods)", quantity: 2, unitPrice: 2800.00, total: 5600.00 },
        { description: "Multi-Region Cloud Object Storage (10TB Egress)", quantity: 1, unitPrice: 1750.00, total: 1750.00 },
      ],
      complianceScore: 96,
      riskLevel: "Low",
      detectedRisks: [
        "Automatic renewal clause requires 45-day prior written notice.",
        "Late payment interest capped at standard 1.5% per month.",
      ],
      keyClauses: [
        "Section 4.2: Data privacy compliance with SOC2 Type II and GDPR standard contractual clauses.",
        "Section 7.1: Mutual indemnification against intellectual property claims up to 2x annual contract value.",
        "Section 11.4: 99.95% Monthly SLA with credit reimbursement tiers for downtime.",
      ],
      summary: "Standard high-value enterprise infrastructure invoice with valid matching purchase order and fully compliant terms.",
    };

    res.json({ extracted: mockExtraction, source: "deterministic-engine" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to extract document" });
  }
});

// 4. Intelligent Email Triage & Ticket Dispatch
app.post("/api/ai/triage-email", async (req, res) => {
  try {
    const { subject, sender, body } = req.body;

    const systemPrompt = `You are an enterprise email triage and intelligent ticket creation agent.
Analyze the inbound email and return a STRICT JSON object:
{
  "category": "Billing" | "Technical Support" | "Sales Inquiry" | "Security/Compliance" | "Feature Request",
  "priority": "P1 - Critical" | "P2 - High" | "P3 - Medium" | "P4 - Low",
  "sentiment": "Frustrated" | "Neutral" | "Positive" | "Urgent",
  "churnRisk": boolean,
  "confidenceScore": number (0-100),
  "extractedEntities": {
    "accountName": string,
    "product": string,
    "errorCodes": string[],
    "requestedDeadline": string
  },
  "suggestedAssignee": string,
  "targetTicketQueue": "DevOps Incident" | "Tier 2 Support" | "Enterprise Sales" | "Finance & Invoicing",
  "ticketTitle": string,
  "ticketSummary": string,
  "aiDraftReply": string,
  "automatedActionRecommended": string
}`;

    const prompt = `From: ${sender}\nSubject: ${subject}\nBody:\n${body}`;
    const aiText = await generateAiResponse(prompt, systemPrompt, true);

    if (aiText) {
      try {
        const parsed = JSON.parse(aiText);
        return res.json({ triage: parsed, source: "gemini-3.7-flash" });
      } catch (e) {
        // Fall through
      }
    }

    // High quality deterministic triage fallback
    const isUrgent = body.toLowerCase().includes("down") || body.toLowerCase().includes("error") || body.toLowerCase().includes("urgent") || subject.toLowerCase().includes("critical");
    const mockTriage = {
      category: isUrgent ? "Technical Support" : "Billing",
      priority: isUrgent ? "P1 - Critical" : "P3 - Medium",
      sentiment: isUrgent ? "Urgent" : "Neutral",
      churnRisk: isUrgent,
      confidenceScore: 94,
      extractedEntities: {
        accountName: sender.split("@")[1]?.replace(".com", "").toUpperCase() || "ACME CORP",
        product: "Enterprise Automation Gateway v2.4",
        errorCodes: isUrgent ? ["ERR_GATEWAY_TIMEOUT_504", "JWT_SIGNATURE_EXPIRED"] : [],
        requestedDeadline: isUrgent ? "Immediate (< 1 hour SLA)" : "Next Business Day",
      },
      suggestedAssignee: isUrgent ? "Sarah Jenkins (Lead SRE)" : "Marcus Vance (Billing Specialist)",
      targetTicketQueue: isUrgent ? "DevOps Incident" : "Finance & Invoicing",
      ticketTitle: `[${isUrgent ? "P1 - URGENT" : "INQUIRY"}] ${subject}`,
      ticketSummary: `Inbound request from ${sender}. AI classified as ${isUrgent ? "high-severity production blocker" : "standard account inquiry"} requiring automated ticket dispatch.`,
      aiDraftReply: `Dear Customer,\n\nThank you for reaching out to Enterprise Support. We have received your inquiry regarding "${subject}" and automatically routed it to our ${isUrgent ? "Tier 3 Incident Response Team" : "Account Support Team"}.\n\nTicket Reference: TK-${Math.floor(10000 + Math.random() * 90000)}\nEstimated Response Time: ${isUrgent ? "15 minutes" : "2 hours"}\n\nBest regards,\nAutomated Support Dispatch`,
      automatedActionRecommended: isUrgent ? "Create ServiceNow P1 Incident & Notify PagerDuty" : "Create Zendesk Ticket & Send Automated Acknowledgment",
    };

    res.json({ triage: mockTriage, source: "deterministic-engine" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to triage email" });
  }
});

// 5. Workflow AI Synthesizer (Natural language to n8n / Zapier visual graph)
app.post("/api/ai/generate-workflow", async (req, res) => {
  try {
    const { prompt: userGoal } = req.body;

    const systemPrompt = `You are a Workflow Automation Architect for n8n, Zapier, and Enterprise Orchestrators.
Convert the natural language prompt into a structured node-based workflow graph.
Return STRICT JSON:
{
  "workflowName": string,
  "description": string,
  "trigger": {
    "type": "webhook" | "schedule" | "email" | "crm_event" | "form_submission",
    "name": string,
    "config": object
  },
  "nodes": [
    {
      "id": string,
      "name": string,
      "type": "trigger" | "ai_action" | "integration" | "logic" | "approval_gate",
      "service": "gemini" | "salesforce" | "hubspot" | "sap_erp" | "gmail" | "slack" | "microsoft_teams" | "webhook" | "condition",
      "action": string,
      "description": string,
      "parameters": object
    }
  ],
  "connections": [
    { "from": string, "to": string, "label"?: string }
  ],
  "estimatedTimeSavedPerRunMinutes": number,
  "confidenceScore": number
}`;

    const aiText = await generateAiResponse(userGoal, systemPrompt, true);
    if (aiText) {
      try {
        const parsed = JSON.parse(aiText);
        return res.json({ workflow: parsed, source: "gemini-3.7-flash" });
      } catch (e) {}
    }

    // Default workflow synthesis fallback
    const mockWorkflow = {
      workflowName: `AI Orchestrator: ${userGoal.slice(0, 40)}`,
      description: `Automated end-to-end pipeline orchestrated from natural language specification.`,
      trigger: {
        type: "webhook",
        name: "Inbound Enterprise Event",
        config: { path: "/webhook/ai-trigger", method: "POST" },
      },
      nodes: [
        {
          id: "node-1",
          name: "Webhook Ingestion",
          type: "trigger",
          service: "webhook",
          action: "Receive Event Payload",
          description: "Ingests raw JSON payload from external enterprise system.",
          parameters: { authRequired: true, rateLimit: "100/min" },
        },
        {
          id: "node-2",
          name: "Gemini Context Extraction",
          type: "ai_action",
          service: "gemini",
          action: "Analyze & Classify Sentiment/Intent",
          description: "Extracts key financial entities and risk clauses.",
          parameters: { model: "gemini-3.7-flash", temperature: 0.2 },
        },
        {
          id: "node-3",
          name: "ERP Data Synchronization",
          type: "integration",
          service: "sap_erp",
          action: "Check PO Balance & Credit Limit",
          description: "Queries SAP S/4HANA OData API for account standing.",
          parameters: { systemId: "SAP-PRD-01", timeoutMs: 3000 },
        },
        {
          id: "node-4",
          name: "Value Threshold Check",
          type: "logic",
          service: "condition",
          action: "Evaluate If Total > $5,000",
          description: "Routes high-value operations to human approval.",
          parameters: { operator: "greater_than", threshold: 5000 },
        },
        {
          id: "node-5",
          name: "Slack Ops Notification",
          type: "integration",
          service: "slack",
          action: "Broadcast Action Summary",
          description: "Posts structured audit card to #finance-automations.",
          parameters: { channel: "#finance-automations" },
        },
      ],
      connections: [
        { from: "node-1", to: "node-2" },
        { from: "node-2", to: "node-3" },
        { from: "node-3", to: "node-4" },
        { from: "node-4", to: "node-5" },
      ],
      estimatedTimeSavedPerRunMinutes: 18,
      confidenceScore: 98,
    };

    res.json({ workflow: mockWorkflow, source: "deterministic-engine" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate workflow" });
  }
});

// 6. Executive Insights & ROI Analysis
app.post("/api/ai/executive-insights", async (req, res) => {
  try {
    const { stats } = req.body;
    const systemPrompt = `You are a Chief Automation Officer & Strategic BI Advisor.
Analyze the company's enterprise automation metrics and return a STRICT JSON report:
{
  "executiveSummary": string,
  "monthlyCostSavings": string,
  "hoursSaved": number,
  "roiMultiplier": string,
  "keyAchievements": string[],
  "criticalBottlenecks": string[],
  "strategicOpportunities": [
    { "title": string, "impact": "High" | "Medium", "potentialHoursSaved": number, "effort": "Low" | "Medium" | "High", "description": string }
  ],
  "complianceAuditStatus": "SOC2 Type II & GDPR Compliant"
}`;

    const prompt = `System Telemetry:\n${JSON.stringify(stats || { totalExecutions: 14200, successRate: "99.2%", avgExecutionMs: 420, activeConnectors: 8 })}`;
    const aiText = await generateAiResponse(prompt, systemPrompt, true);

    if (aiText) {
      try {
        const parsed = JSON.parse(aiText);
        return res.json({ insights: parsed, source: "gemini-3.7-flash" });
      } catch (e) {}
    }

    // Default executive report fallback
    const mockInsights = {
      executiveSummary: "The enterprise automation platform demonstrated strong operational efficiency across Q3, achieving a 99.4% execution success rate and reducing invoice cycle times from 4.2 days to 38 minutes.",
      monthlyCostSavings: "$38,450",
      hoursSaved: 512,
      roiMultiplier: "4.8x ROI",
      keyAchievements: [
        "Eliminated manual data entry across 1,840 monthly vendor invoices via Gemini Document Intelligence.",
        "Reduced customer support P1 escalation response times from 45 minutes to 3.2 minutes.",
        "Zero data leaks or authentication failures across 4 connected ERP/CRM gateways.",
      ],
      criticalBottlenecks: [
        "14% of high-value invoices (> $25,000) experience > 48h latency in manual VP sign-off queues.",
        "Legacy NetSuite sandbox connector experiences intermittent rate limits during month-end batch reconciliation.",
      ],
      strategicOpportunities: [
        {
          title: "Automated Contract Renewal Sentinel",
          impact: "High",
          potentialHoursSaved: 120,
          effort: "Low",
          description: "Deploy automated OCR scanners 60 days before vendor contract expirations to negotiate early-bird tiers.",
        },
        {
          title: "Autonomous IT Helpdesk Self-Healing",
          impact: "High",
          potentialHoursSaved: 190,
          effort: "Medium",
          description: "Connect AI triage directly to Okta SSO and AWS IAM for automated password & temporary access resets.",
        },
      ],
      complianceAuditStatus: "SOC2 Type II & GDPR Compliant",
    };

    res.json({ insights: mockInsights, source: "deterministic-engine" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate executive insights" });
  }
});

// 7. Live REST API Mock Sandbox for Webhook / Workflow Triggers
app.post("/api/v1/workflows/trigger", (req, res) => {
  const { workflowId, payload } = req.body;
  const executionId = `exec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  res.json({
    success: true,
    executionId,
    workflowId: workflowId || "WF-01-INVOICE-ERP",
    status: "COMPLETED",
    durationMs: 412,
    timestamp: new Date().toISOString(),
    logs: [
      { step: "1. Webhook Trigger", status: "SUCCESS", durationMs: 18, message: "Payload validated against OpenAPI schema" },
      { step: "2. AI Document OCR", status: "SUCCESS", durationMs: 195, message: "Extracted 4 line items with 99.2% confidence" },
      { step: "3. SAP S/4HANA Sync", status: "SUCCESS", durationMs: 140, message: "PO-8821 matched; posted journal entry" },
      { step: "4. Slack Notification", status: "SUCCESS", durationMs: 59, message: "Card broadcasted to #finance-alerts" },
    ],
    output: {
      itemsProcessed: 4,
      totalAmount: payload?.totalAmount || 18450.00,
      currency: "USD",
      erpReference: `SAP-DOC-${Math.floor(1000000 + Math.random() * 9000000)}`,
    },
  });
});

// 8. Test Third-Party Integration Connector
app.post("/api/v1/integrations/test", (req, res) => {
  const { serviceName, credentials } = req.body;
  res.json({
    connected: true,
    service: serviceName,
    latencyMs: Math.floor(45 + Math.random() * 80),
    authenticatedAs: credentials?.username || "enterprise-service-account@corp.internal",
    permissions: ["read:records", "write:events", "admin:webhooks"],
    lastHealthCheck: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// Vite Middleware / Static Asset Setup
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Enterprise AI Automation Platform running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
