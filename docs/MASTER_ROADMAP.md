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

## Current implementation status (confirmed from repository history)

| Feature | Status |
|---|---|
| Business search intent presets | Merged into main; CI success |
| Browser tab restoration | Merged into main; CI success |
| Recent business search history | Merged into main; CI success |
| Website-based prospect deduplication | Merged into main; CI success |
| Extract/preserve contact candidates | PR #27 merged after correcting a syntax error; latest test-and-build CI passed; installer skipped |
| Remaining 40-tool baseline | Requires a systematic repository audit before assigning complete/partial/missing statuses |
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

1. Run a baseline audit of the current repository against all 40 tools and stages; mark each as implemented, partial, missing or blocked with code/test evidence.
2. Finish the Leads/Workspace module as one coherent workflow: source search → candidate extraction → deduplication → company record → qualification → next task/follow-up.
3. Define the shared data model and persistence/migration strategy before adding modules that duplicate records.
4. Proceed to estimates and commercial proposals, then documents, production, finance, supply/risk and AI/automation.
