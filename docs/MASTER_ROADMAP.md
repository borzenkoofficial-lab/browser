# NEXUS Business Browser — master roadmap

**Source of truth:** «NEXUS Business Browser — техническое задание v1.0» (40 инструментов, 8 направлений).  
**Purpose:** объединить исходное ТЗ и дополнительные функции, согласованные в ходе разработки. Новые идеи добавляются в этот документ; исходные требования не удаляются молча.

## Product principle

Локальное Windows-приложение предпринимателя в строительстве: единая система для поиска заказов, расчётов, документов, производства, финансов, снабжения, рисков и автоматизации. Основные локальные операции работают офлайн; интернет-поиск и внешние ИИ-модели требуют подключения. Платные сервисы не подключать без отдельного согласования. Установщик не собирать до отдельной просьбы пользователя.

## Master architecture

- NEXUS Workspace: главная панель, глобальный поиск, уведомления, настройки.
- Leads: клиенты, контакты, сделки, тендеры.
- Estimates: прайс, строительный калькулятор, себестоимость, маржа, КП, производительность.
- Documents: договоры, акты, счета, версии, архив, распознавание.
- Objects: объекты, бригады, смены, планировщик, фотоотчёты, план/факт.
- Finance: денежный поток, задолженности, прибыль, обязательства, сценарии.
- Suppliers: субподрядчики, рабочие, техника, вывоз, склад и инструмент.
- Risks: проверка контрагентов, анализ договоров, требования, безопасность и исполнительная документация.
- AI & Automation: ассистент, анализ тендеров, сценарии автоматизации, глобальный поиск, аналитика.
- Shared data: компании, контакты, сделки, объекты, сметы, прайс, смены, документы, платежи, поставщики, задачи и источники данных.

## Implementation stages

| Stage | Scope | Completion gate |
|---|---|---|
| 0. Audit & foundation | Audit repo, build, storage, Electron security boundaries, backups, migrations, error logging | Reproducible build, tests pass, restore/migration tested on copies, extension points documented |
| 1. Workspace & shared data | Clients, contacts, global search, tasks, settings, history, backup, CSV import/export | Data persists after restart; duplicates controlled; backup can be restored |
| 2. Getting orders | Tools 1–5: search, company dossiers, lead qualification, contact history, tasks, tender basics | A prospect can be sourced, checked, assigned, and moved through the pipeline |
| 3. Estimates & proposals | Tools 6–10: price list, calculator, cost, margin, productivity forecast, resource comparison, PDF proposal | Control calculations match expected results; costs are transparent; proposal totals match estimate |
| 4. Documents & archive | Tools 11–15: contracts, acts, invoices, versions, templates, document recognition | Documents are linked to company/object, archived, and validated |
| 5. Production | Tools 16–20: object passport, crews, planning, photo reports, plan/fact | Work can be tracked through completion with shift and actual-cost reports |
| 6. Finance | Tools 21–25: cash flow, receivables, object profit, obligations, budget scenarios | Actual money is distinguished from planned payments; forecasts are traceable |
| 7. Supply & risk | Tools 26–35: contractors, crews, equipment, waste removal, inventory, counterparty/contract/compliance checks | Resources linked to objects; source and date recorded for checks |
| 8. AI & automation | Tools 36–40: AI assistant, tender analysis, workflows, global search, analytics | Provider isolated; risky actions require confirmation; results traceable |
| 9. Commercial release | Regression audit, update/install/uninstall, clean Windows install, backup recovery, final installer | Real Windows artifact and critical user flows tested and documented |

## All 40 tools from v1.0

### A. Leads — tools 1–5
1. Client search center: websites, open catalogs, URLs and imported lists; region/industry/customer filters.
2. Lead qualification: status, priority, suitable services, notes, next action and contact date.
3. Tender search: source, deadline, amount, region, requirements, source URL, verification date and reminder.
4. Contact center: call/email log, message templates and follow-up tasks.
5. Company dossier: website, public details, published contacts, industry, projects and sources.

### B. Estimates — tools 6–10
6. Construction calculator: work types, units, quantities, rates and complexity factors.
7. Cost and margin: labor, materials, equipment, transport, waste removal, overhead and other costs.
8. Estimates and commercial proposals: line items, quantities, rates, terms, versions and PDF.
9. Productivity forecast: output norms, crew size, shifts and site conditions with explicit assumptions.
10. Supplier comparison: price, delivery, minimum order, timing, rental and comparable total cost.

### C. Documents — tools 11–15
11. Contract generator with templates, variables, appendices, payment terms and stages.
12. Acts linked to object and estimate, including quantities, periods, stages, comments and signatures.
13. Invoices and payments: advance, staged payments, balance and details.
14. Archive with search, versions, categories and links to company/object.
15. Document recognition for text, dates, amounts, details and line items, with manual review before saving.

### D. Objects — tools 16–20
16. Object passport: address, client, contract, estimate, deadlines and responsible people.
17. Crew management: composition, rates, availability, skills and shift history.
18. Planner: stages, dates, owners, dependencies and reminders.
19. Photo reports linked to object/date/stage with notes and export.
20. Plan/fact: costs, quantities, timing and profit deviations.

### E. Finance — tools 21–25
21. Cash flow: planned/actual income and expense, projected balance.
22. Accounts receivable: debt, due date, customer, delay and reminder history.
23. Profit by object: revenue, costs, obligations and result.
24. Obligations calendar: payments, payroll, rent, taxes and contract dates.
25. Budget and scenarios: plan, base forecast, stress scenario and comparison.

### F. Suppliers — tools 26–30
26. Subcontractor database with contacts, specialty, geography, documents and work history.
27. Worker/crew search by skills, rates, availability and applications.
28. Equipment rental: type, rate, delivery, minimum shift and idle time.
29. Waste removal: volume, containers, trips, price and documents, linked to estimate.
30. Inventory/tools: stock, issue, return, write-off, responsible person and movement history.

### G. Risks — tools 31–35
31. Counterparty checks with public information, details and source links.
32. Contract analysis: payment, penalties, retention, warranties, deadlines and clauses to review.
33. Construction requirements: regulations, editions, scope of application and primary source.
34. Work safety: checklists, briefings, PPE and observations.
35. Handover documentation checklist with prepared/missing/review-required status.

### H. AI & automation — tools 36–40
36. AI assistant for document analysis, summaries, business writing and calculation support.
37. Tender analysis: deadlines, requirements, quantities and risks linked to source documents.
38. Automation: triggers, conditions, actions, schedules and execution log.
39. Global search across clients, objects, documents, estimates, notes and history.
40. Business analytics: pipeline, conversion, workload, margin and expenses calculated from system data.

## Additional features added during implementation

These supplement the 40-tool baseline and do not replace it.

- Business search intent presets: search patterns for official websites, contacts, tenders/procurement, customers, partners/contractors; sector, region and keyword controls.
- Browser session restoration: restore up to 12 HTTP/HTTPS tabs and active tab after relaunch.
- Recent business searches: keep the last five searches with intent/source/query and allow repeat/clear.
- Prospect deduplication by website: normalize host, ignore protocol, www and path; open existing record instead of creating a duplicate.
- Contact candidate extraction: extract unique email/phone candidates from the open page, keep additional candidates in notes, label as unverified. Not proof that contact details are current.
- Proposed major UX/function expansions to fold into the matching baseline modules: a dedicated client acquisition workspace; sales pipeline/next-action dashboard; company intelligence timeline; AI-assisted page summaries and outreach drafts; richer project/tab workspaces; source freshness and data-quality indicators. These are roadmap additions, not claims that they are implemented.

## Engineering and data integrity rules

1. One company should not be duplicated across modules.
2. Business logic must use typed services/repositories rather than direct UI storage access.
3. Schema changes require versioned migrations and a non-destructive upgrade path.
4. Core local workflows work offline; web search and external AI require internet.
5. Keep architecture compatible with later sync, but do not build the sync server in the early stages.
6. Websites must not gain direct access to the customer database, filesystem, or privileged app APIs.
7. Every significant feature has tests and explicit acceptance criteria.
8. Store source URL, capture/verification date and manual-entry labels for externally sourced data.
9. Never invent market prices or treat an unverified website/contact as proof of reliability.
10. Preserve document versions; estimate changes must not silently rewrite issued proposals.
11. Distinguish planned vs received payments, planned vs paid expenses, profit vs cash balance.
12. AI must not autonomously send messages, sign documents, alter financial data or delete records. Require user confirmation for external or high-impact actions.
13. Protect provider API keys using OS secure storage or an appropriate protected mechanism; disclose data sent to external AI.
14. No paid services, subscriptions, tender databases, SMS, e-signature or cloud storage without prior approval.
15. Financial formulas must distinguish margin from markup, handle rounding explicitly, and make tax/VAT settings separate.
16. Security, legal and safety analysis must show sources, dates and uncertainty; no definitive accusations or unsupported legal/safety conclusions.

## Quality gates for every stage

- Unit tests for calculations, normalization, import, validation and transformations.
- Integration tests for persistence, relationships and migrations.
- Regression tests for existing behavior.
- TypeScript and production build checks.
- Backup/restore and import/export checks.
- Electron IPC, site isolation and secret handling review.
- UI review for dialogs, contrast, errors, scaling and accessibility.
- Real Windows testing explicitly tracked separately from CI. Never claim Windows testing from Linux CI.
- Installer workflow is intentionally not run until the user asks for an installer.

## First-pass audit of the 40 tools (repository snapshot: 2026-10-14)

**Method and limits:** static review of `src/renderer/ui/App.tsx`, `src/electron/main.ts`, `src/electron/preload.ts`, `src/electron/storage/database.ts`, `src/electron/storage/validation.ts`, the unit tests and README. This is a code-scope audit, not a manual run of the Windows application. “Partial” means some relevant data/UI exists but one or more explicit requirements are missing; it does not mean production-ready.

| # | Tool from v1.0 | Status | Evidence and gap |
|---:|---|---|---|
| 1 | Client search center | **Partial** | `App.tsx`: `Research`, search intent presets, query preview/repeat; CSV import and browser-based site saving exist. No built-in crawler or verified results catalogue; searches open external search engines. |
| 2 | Lead qualification | **Partial** | `App.tsx`: company form includes status, priority-related dashboard ordering, industry, tags, notes, next action and follow-up date. No full sales pipeline stages, assignment or structured qualification score. |
| 3 | Tender search | **Partial** | Tender/procurement is a search intent preset. No tender register with amount, deadline, requirements, source verification and reminder workflow. |
| 4 | Contact center | **Partial** | Contact fields, extracted email/phone candidates, activity note and follow-up date exist. No call/email history timeline or integrated message sending/templates workflow. |
| 5 | Company dossier | **Partial** | Prospect record, website extraction and unverified contact candidates exist. No structured projects/public-details/source history or source freshness tracking. |
| 6 | Construction calculator | **Partial** | `EstimatesPage` supports line items, units, quantity, price and cost. No maintained work-rate catalogue or complexity-factor library is evident. |
| 7 | Cost and margin | **Partial** | Estimate lines store price and cost and calculate economics. Separate structured labor/material/equipment/transport/waste/overhead breakdown and explicit tax/VAT settings are not present as a complete model. |
| 8 | Estimates and commercial proposals | **Partial** | `EstimatesPage` and `DocumentsPage` support saved estimates, proposal fields, templates/styles and print flow. Version history and an immutable issued-document snapshot are not evident; only three styles are represented in the current type. |
| 9 | Productivity forecast | **Partial** | Object shift reports store workers, hours, quantity, revenue and cost; productivity can be reviewed from recorded shifts. Forecasting with norms, assumptions, site factors and uncertainty is not implemented as a distinct tool. |
| 10 | Supplier comparison | **Partial** | Supplier records store contact, payment terms, delivery days and rating. No comparable quote table or total-cost calculation across suppliers. |
| 11 | Contract generator | **Partial** | Generic business document editor includes customer/supplier/object, terms and templates. No dedicated contract clauses, appendices, staged payment builder or contract-specific validation. |
| 12 | Acts | **Missing** | No dedicated act document type/workflow linked to object, estimate, period, quantities and signatures was found. |
| 13 | Invoices and payments | **Partial** | Finance has planned/paid income and expense entries. No invoice generator with advance/staged-payment/balance details and payment reconciliation. |
| 14 | Archive | **Partial** | Documents are saved locally and listed. Searchable categories, revisions/version history and a complete company/object document archive are not evident. |
| 15 | Document recognition | **Missing** | No OCR/document extraction or manual-review workflow was found. |
| 16 | Object passport | **Partial** | `ObjectsPage` stores name, customer, address, status, dates, estimate link and planned financial fields. Contract/responsible-person linkage is not complete. |
| 17 | Crew management | **Missing** | Shift reports capture a worker count, but there is no worker/crew directory with rates, skills, availability and history. |
| 18 | Planner | **Partial** | Object dates and follow-up dates exist. No stage dependencies, owners, task calendar or object schedule planner was found. |
| 19 | Photo reports | **Missing** | No object-linked photo upload/report and export workflow was found. |
| 20 | Plan/fact | **Partial** | Object and shift fields include planned and actual-like quantity/revenue/cost data. A complete variance analysis for schedule, quantity, cost and profit is not evident. |
| 21 | Cash flow | **Partial** | Finance entries distinguish “План” and “Оплачено” and include type/date/amount/object. A projected running balance and period-based cash-flow forecast are not evident as a complete feature. |
| 22 | Accounts receivable | **Partial** | Customer/counterparty, dates and operation status can be recorded. No dedicated debt aging, due-date follow-up and reminder history. |
| 23 | Profit by object | **Partial** | Finance entries link to objects and objects have planned revenue/cost. No complete reconciled object profit report combining all revenue, costs and obligations. |
| 24 | Obligations calendar | **Missing** | No unified calendar for payroll, rent, taxes and contractual payments was found. |
| 25 | Budget and scenarios | **Missing** | No base/stress scenario builder or budget comparison was found. |
| 26 | Subcontractor database | **Partial** | Supplier directory stores category, contacts, region, terms, delivery time, rating and status. Dedicated subcontractor specialties, documents and work history are absent. |
| 27 | Worker/crew search | **Missing** | No worker database, skills/rates/availability search or applications workflow. |
| 28 | Equipment rental | **Partial** | Generic supplier records can hold equipment vendors and delivery terms, but equipment type/rate/minimum shift/idle-time comparisons are not modelled. |
| 29 | Waste removal | **Missing** | No dedicated waste-removal volume/container/trip/document workflow linked to an estimate. |
| 30 | Inventory/tools | **Missing** | No stock, issue, return, write-off or responsible-person movement register. |
| 31 | Counterparty checks | **Missing** | No integrated counterparty verification dossier with sourced public records was found. |
| 32 | Contract analysis | **Missing** | No contract clause extraction/risk review workflow was found. |
| 33 | Construction requirements | **Missing** | No sourced regulation/edition/scope lookup module was found. |
| 34 | Work safety | **Missing** | No safety checklist, briefing, PPE or observation register was found. |
| 35 | Handover documentation checklist | **Missing** | No prepared/missing/review-required executive-documentation checklist was found. |
| 36 | AI assistant | **Missing** | README and settings UI explicitly describe AI provider integration as not implemented; no provider/runtime integration was found. |
| 37 | Tender analysis | **Missing** | Search presets can form procurement queries, but there is no analysis of tender files, deadlines, requirements, quantities or risks. |
| 38 | Automation | **Missing** | No trigger/condition/action scheduler or execution log was found. |
| 39 | Global search | **Partial** | Client-list search and browser history are available separately. No single cross-module search across clients, objects, documents, estimates, notes and history. |
| 40 | Business analytics | **Partial** | Dashboard shows lead priorities/follow-ups and module-level records exist. No unified conversion, workload, margin and expense analytics across the business. |

### Audit summary

- **Implemented as specified:** 0/40 tools at the full acceptance-criteria level.
- **Partial foundation exists:** 21/40.
- **Missing as dedicated workflows:** 19/40.
- These counts intentionally do not equate a generic field or screen with a completed business tool. Several partial modules are useful foundations, but do not yet meet the original v1.0 completion gates.
- Storage already has versioned SQLite schema/migrations, validated record types and backup integrity/restore tests: `database.ts`, `validation.ts`, `tests/unit/database.test.ts`. Existing data kinds include prospects, bookmarks, history, estimates, documents, objects, finance and suppliers. The current shared model still lacks first-class contacts, tasks, tender records, crews, inventory movements, obligations and source-verification records.
- CI run `38632712612` for the merged master-roadmap commit completed successfully. This verifies the configured CI checks only; it does **not** verify manual Windows behavior or all 40 tool workflows.

### Priority order after audit

1. **Close Leads workflow:** company/source record → contact candidates with verification state → qualification/status → next action/task → follow-up dashboard. Add explicit source URL/captured date and prevent duplicate companies across CSV/manual/site capture.
2. **Shared model before expansion:** first-class tasks, contact/activity records, source provenance, document type/version and object relationships; migrations must preserve current user data.
3. **Finish estimates/proposals:** rate catalogue, transparent cost components, explicit margin vs markup, forecast assumptions, proposal version snapshot and PDF export acceptance tests.
4. **Build dedicated document and production flows:** contracts/acts/invoices, object stages, crew directory, shift attachments/photo reports and plan/fact.
5. **Then finance, supply/risk and AI:** obligations/debt aging/scenarios; equipment/waste/inventory; sourced checks and contract analysis; AI only after provider security, consent and external-action confirmation are designed.

## Current implementation status (confirmed from repository history)

| Feature | Status |
|---|---|
| Business search intent presets | Merged into main; CI success |
| Browser tab restoration | Merged into main; CI success |
| Recent business search history | Merged into main; CI success |
| Website-based prospect deduplication | Merged into main; CI success |
| Extract/preserve contact candidates | PR #27 merged after correcting a syntax error; latest test-and-build CI passed; installer skipped |
| 40-tool baseline audit | First-pass static audit added below; no tool meets all v1.0 acceptance criteria yet |
| Manual Windows validation | Not confirmed |
| Commercial installer | Not built by request |

## Operating rule for this roadmap

Before each major implementation batch:
1. Inspect the current code and map it to this roadmap.
2. Select one coherent module or capability, not random cosmetic tasks.
3. Define acceptance criteria and tests before changing code.
4. Implement on a branch/PR.
5. Wait for CI; fix failures before merging.
6. Update this document with actual status and evidence.
7. Do not claim manual Windows validation unless it was performed.
8. Do not build the installer until explicitly requested.

## Immediate next steps

1. Validate and close the first-pass audit by mapping each partial/missing tool to explicit acceptance tests; repeat the audit after each module.
2. Finish the Leads/Workspace workflow: source search → candidate extraction → deduplication → company record → qualification → next task/follow-up.
3. Add first-class task, activity/contact and source-provenance models with safe migrations before expanding other modules.
4. Finish estimates/proposal versioning, then dedicated documents and production workflows.
5. Continue with finance, supply/risk, then AI/automation only after security and confirmation boundaries are designed.
