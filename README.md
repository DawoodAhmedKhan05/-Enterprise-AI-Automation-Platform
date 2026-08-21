<div align="center">

</div>

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
# NEXGEN AI — Enterprise Automation Platform

**NEXGEN AI** is an autonomous enterprise automation platform that connects ERP, CRM, and cloud workspaces with multimodal AI (**Google Gemini 3.7 Flash**) and a visual workflow engine.

---

## ⚡ Key Features

- **AI Copilot**: Grounded assistant for business operations, queue triage, and ERP queries.
- **Visual Workflow Builder**: n8n/Zapier-style node orchestrator with natural language-to-pipeline generation.
- **Multimodal Document OCR**: Extracts line items, vendor details, and compliance risk flags from invoices/contracts.
- **Support Email Triage**: Classifies urgent issues (P1–P4), analyzes sentiment, and drafts responses.
- **HITL Governance**: SOX-compliant dual approvals for high-value transactions (≥ $5,000).
- **REST APIs**: OpenAPI 3.0 endpoints with an interactive testing sandbox.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Recharts
- **Backend & APIs**: Node.js 20, Express, OpenAPI 3.0
- **AI Engine**: Google Gemini 3.7 Flash (`@google/genai`)
- **Integrations**: SAP S/4HANA (OData), Salesforce, Google/Microsoft Workspace
- **DevOps**: Docker (142MB Alpine), Kubernetes, Cloud Run

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Add Gemini API Key to .env
cp .env.example .env

# 3. Run development server
npm run dev
