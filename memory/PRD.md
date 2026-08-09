# MedFind — Pharmacy Marketplace (PRD)

## Original Problem Statement
Build a pharmacy marketplace with a Progressive Onboarding flow: patients start with an anonymous AI chat to identify medications (name, dose, form) before signing in to submit a 'Blind Request.' Optional camera tool with a Privacy Mask to assist ID without capturing patient data. Pharmacy Dashboard shows a live queue with Clinical Filters (Schedule II, III-V, Fridge, Specialty) and Watchlist Alerts. Patients use Quick Filters for delivery (Free/Fee-based/Max Fee) and speed (Fill Today); AI suggests expanding filters if results are low. Refinement Loop: if a pharmacy clarifies then rejects, the AI summarizes to refine the request before it returns to the queue. Upon acceptance, the request is hidden from others, a platform fee is charged, and contact details are exchanged. 'Coming Soon' Concierge button. Clean, professional medical aesthetic.

## User Choices
- AI model: **Claude Sonnet 4.6** (via Emergent LLM key)
- Auth: **email + password (JWT)**
- Payment: **Simulated/mock** (no real charge)
- Camera + Privacy Mask: **placeholder UI**
- Demo data: **seeded**

## Architecture
- Frontend: React (CRA + craco), Tailwind, shadcn/ui, sonner, lucide-react. Manrope/IBM Plex fonts.
- Backend: FastAPI, MongoDB (motor). JWT auth (Bearer + cookie), bcrypt.
- AI: emergentintegrations LlmChat → anthropic/claude-sonnet-4-6 (non-streaming JSON).
- Files: backend/{server,models,auth,ai_service,seed}.py; frontend/src/{pages,components,context,lib}.

## User Personas
- Patient: identifies a medication anonymously, posts a Blind Request, tracks responses, receives pharmacy contact on match.
- Pharmacy: monitors live queue, filters clinically, watches specific drugs, clarifies/rejects (AI refine) or accepts (fee + contact).

## Core Requirements (static)
1. Anonymous AI chat medication ID (name/dose/form). 2. Progressive onboarding → auth → Blind Request. 3. Privacy Mask camera (placeholder). 4. Pharmacy live queue + Clinical Filters + Watchlist Alerts. 5. Patient Quick Filters + AI expand-filter suggestion. 6. Refinement Loop (clarify→reject→AI summary→requeue). 7. Accept → hide, charge platform fee (mock), exchange contacts. 8. Coming Soon Concierge button.

## Implemented (2026-06)
- [x] JWT auth (patient/pharmacy roles), demo seed accounts.
- [x] Anonymous AI chat (Claude 4.6) with structured identification + intake panel.
- [x] Privacy Mask camera placeholder with masked-border overlay.
- [x] Blind Request creation, patient "My requests" with status/refinements/contact.
- [x] Quick Filters (delivery free/fee/max, fill today) + live match preview + AI suggestion when low.
- [x] Pharmacy dashboard KPI strip, blind queue (identity hidden), Clinical Filters, Watchlist alerts + management.
- [x] Refinement Loop: clarify + reject → Claude summary → requeue with note.
- [x] Accept → simulated $4.99 fee + contact exchange, hidden from others, Accepted tab.
- [x] Coming Soon Concierge buttons (landing + dashboard).
- [x] End-to-end tested: 100% backend + frontend.

## Backlog (prioritized)
- P1: Real payments (Stripe) to replace simulated fee.
- P1: Functional camera capture + OCR feeding the AI.
- P2: Real-time queue updates (websockets), patient↔pharmacy in-app messaging.
- P2: Concierge service activation, pharmacy ratings/distance-based matching.
- P2: kebab-case testids for clinical filter buttons.

## Next Tasks
- Await user feedback; consider Stripe integration and live camera OCR next.
