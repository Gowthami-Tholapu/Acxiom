# AcxiomCRM — Enterprise Sales & CRM Platform

An enterprise-grade, production-oriented Customer Relationship Management (CRM) platform engineered for modern sales organizations. Built with **FastAPI** on the backend and **React + Vite** on the frontend, featuring **SQLAlchemy 2.x**, **MySQL**, **Alembic**, **Pydantic v2**, and **Chart.js**.

---

## 1. Project Overview & Architectural Vision

AcxiomCRM models the complete end-to-end commercial sales lifecycle:

```
Lead Ingestion 
  ───▶ Qualification 
  ───▶ Controlled Conversion 
  ───▶ Customer Account & Opportunity Deal 
  ───▶ Scheduled Follow-Ups & Touchpoint Activities 
  ───▶ Deal Won / Lost & Commission / Revenue Realization
```

### Key Highlights
- **Layered Clean Architecture:** Complete separation of Presentation (React SPA), Application/DTO (Pydantic v2), Business/Domain Services, Data Access (SQLAlchemy 2.x), Database (MySQL/Alembic), and Centralized Cross-Cutting Concerns (Audit Logging, Authentication, Security, Rate Limiting & Middleware).
- **Zero Raw ORM Entity Exposure:** Strict DTO/Pydantic schemas across all boundaries. No internal hashes or private fields ever escape to API responses.
- **Three-Tier Validation Architecture:**
  1. *Level 1 (Client-side):* Instant UI feedback for email format, 10–15 digit phone patterns, required fields, date constraints, and password complexity.
  2. *Level 2 (FastAPI / Pydantic v2):* Boundary schema enforcement, types, regex parsing, and data normalization.
  3. *Level 3 (Domain / Business Layer):* Server-side database uniqueness, duplicate customer detection, valid status transitions, opportunity value rules, and follow-up temporal validations.
- **Enterprise Security & Authentication:** Passwords hashed with adaptive `bcrypt` (12 rounds); strict password policy (8+ chars, upper, lower, digit, special char); automatic temporary account lockout (after 5 failed attempts for 15 mins); secure JWT authentication delivered via **HTTP-only SameSite cookies** with Authorization Bearer header support; parameterized queries with SQLAlchemy 2.0 preventing SQL injection; and automated security response headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`).
- **Role-Based Authorization & Scoping:** Rigid server-side scoping for `Admin`, `Manager`, and `SalesExecutive`. Sales Executives can never view, update, or delete other executives' customers, leads, or opportunities simply by altering an ID in the URL (enforcing strict `403 Forbidden`).
- **Centralized Append-Oriented Audit Log:** Automatic audit recording of authentication events (logins, failed attempts, lockouts, logouts), entity creations, updates, deletions, and conversions with old-value/new-value JSON snapshots and actor IP addresses.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Framework** | FastAPI (Python 3.11+) | High-performance asynchronous REST API & OpenAPI docs |
| **ORM** | SQLAlchemy 2.x | Type-safe declarative database models and query builder |
| **Migrations** | Alembic | Version-controlled schema migrations |
| **Database** | MySQL 8.0 / SQLite (dev fallback) | Relational master store with foreign keys and unique indexes |
| **Validation** | Pydantic v2 | Input sanitization, data transfer objects, request/response models |
| **Security & Auth** | Bcrypt + PyJWT | Secure password hashing, account lockout, JWT tokens |
| **HTTP Cookies** | HTTP-only Cookies | Protected SPA session persistence against XSS token theft |
| **Frontend Framework** | React 19 + Vite | Fast modern single-page application |
| **Routing** | React Router v7 | Protected routes, layout routing, dynamic navigation |
| **HTTP Client** | Axios | Centralized interceptors, cookie credentials, error translation |
| **Styling & UI** | Bootstrap 5 + Bootstrap Icons | Clean, responsive enterprise SaaS layout & design system |
| **Visualizations** | Chart.js / react-chartjs-2 | Interactive Lead Status, Pipeline by Stage, and Monthly Revenue charts |
| **Containerization** | Docker & Docker Compose | Multi-container orchestration (MySQL, Backend, Frontend Nginx) |
| **Testing** | Pytest + HTTPX TestClient | Comprehensive test suite covering auth, business rules, and scoping |

---

## 3. Directory Structure

```
├── backend/
│   ├── alembic/                    # Alembic migration scripts and versions
│   │   ├── versions/
│   │   │   └── 28d3ea63aabf_initial_schema.py
│   │   └── env.py
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/             # REST API controllers
│   │   │       ├── activities.py
│   │   │       ├── audit_logs.py
│   │   │       ├── auth.py
│   │   │       ├── customers.py
│   │   │       ├── dashboard.py
│   │   │       ├── follow_ups.py
│   │   │       ├── leads.py
│   │   │       ├── opportunities.py
│   │   │       ├── reports.py
│   │   │       └── users.py
│   │   ├── core/                   # Settings, security, and auth dependencies
│   │   │   ├── config.py
│   │   │   ├── dependencies.py
│   │   │   └── security.py
│   │   ├── db/                     # Database engine, session, and declarative Base
│   │   │   ├── base.py
│   │   │   ├── database.py
│   │   │   └── session.py
│   │   ├── middleware/             # HTTP logging & security headers middleware
│   │   │   └── logging.py
│   │   ├── models/                 # SQLAlchemy 2.0 ORM entities
│   │   │   ├── activity.py
│   │   │   ├── audit_log.py
│   │   │   ├── customer.py
│   │   │   ├── follow_up.py
│   │   │   ├── lead.py
│   │   │   ├── opportunity.py
│   │   │   ├── role.py
│   │   │   └── user.py
│   │   ├── schemas/                # Pydantic v2 DTO schemas
│   │   │   ├── activity.py
│   │   │   ├── audit_log.py
│   │   │   ├── auth.py
│   │   │   ├── customer.py
│   │   │   ├── dashboard.py
│   │   │   ├── follow_up.py
│   │   │   ├── lead.py
│   │   │   ├── opportunity.py
│   │   │   ├── reports.py
│   │   │   ├── role.py
│   │   │   └── user.py
│   │   ├── services/               # Centralized business logic & transactions
│   │   │   ├── activity_service.py
│   │   │   ├── audit_service.py
│   │   │   ├── auth_service.py
│   │   │   ├── customer_service.py
│   │   │   ├── dashboard_service.py
│   │   │   ├── follow_up_service.py
│   │   │   ├── lead_service.py
│   │   │   ├── opportunity_service.py
│   │   │   ├── report_service.py
│   │   │   └── user_service.py
│   │   ├── utils/                  # Pagination, scoping filters, validators
│   │   │   ├── filters.py
│   │   │   ├── pagination.py
│   │   │   └── validators.py
│   │   └── main.py                 # FastAPI application factory
│   ├── tests/                      # Automated test suite
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   └── test_crm_business_rules.py
│   ├── alembic.ini
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── seed.py                     # Initial seed generator
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/                    # Centralized Axios client with interceptors
│   │   │   └── axiosClient.js
│   │   ├── charts/                 # Chart.js component wrappers
│   │   │   ├── LeadStatusChart.jsx
│   │   │   ├── MonthlySalesChart.jsx
│   │   │   └── PipelineChart.jsx
│   │   ├── components/             # Reusable UI components
│   │   │   ├── AlertBanner.jsx
│   │   │   ├── ConfirmModal.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── Pagination.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── StatsCard.jsx
│   │   ├── context/                # Authentication context & session state
│   │   │   └── AuthContext.jsx
│   │   ├── layouts/                # Main authenticated and public layouts
│   │   │   ├── AuthLayout.jsx
│   │   │   └── MainLayout.jsx
│   │   ├── pages/                  # Application views
│   │   │   ├── admin/
│   │   │   │   ├── AuditLogsPage.jsx
│   │   │   │   └── UsersAdminPage.jsx
│   │   │   ├── activities/
│   │   │   │   ├── ActivitiesListPage.jsx
│   │   │   │   └── ActivityFormModal.jsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   └── RegisterPage.jsx
│   │   │   ├── customers/
│   │   │   │   ├── CustomerDetailPage.jsx
│   │   │   │   ├── CustomerFormModal.jsx
│   │   │   │   └── CustomersListPage.jsx
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardPage.jsx
│   │   │   ├── followups/
│   │   │   │   ├── FollowUpFormModal.jsx
│   │   │   │   └── FollowUpsListPage.jsx
│   │   │   ├── leads/
│   │   │   │   ├── LeadConvertModal.jsx
│   │   │   │   ├── LeadFormModal.jsx
│   │   │   │   └── LeadsListPage.jsx
│   │   │   ├── opportunities/
│   │   │   │   ├── OpportunitiesListPage.jsx
│   │   │   │   ├── OpportunityFormModal.jsx
│   │   │   │   └── PipelineKanbanPage.jsx
│   │   │   └── reports/
│   │   │       └── ReportsPage.jsx
│   │   ├── routes/
│   │   │   └── AppRoutes.jsx
│   │   ├── utils/                  # Formatters & client-side validators
│   │   │   ├── formatters.js
│   │   │   └── validators.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml
├── README.md
└── AcxiomCRM_Complete_Project_Assignment.pdf
```

---

## 4. Database Design & Entity Architecture

The schema uses strict primary keys, foreign keys, unique indexes, cascading rules, and timestamps:

```
[ROLES] 1 ──── ∞ [USERS]
                   │
    ┌──────────────┼──────────────┬──────────────┬──────────────┐
    │ 1            │ 1            │ 1            │ 1            │ 1
    ▼ ∞            ▼ ∞            ▼ ∞            ▼ ∞            ▼ ∞
[CUSTOMERS]    [LEADS]     [OPPORTUNITIES]  [FOLLOW_UPS]   [ACTIVITIES]
    │              │              │              │              │
    └──────────────┼──────────────┼──────────────┘              │
                   │              │                             │
                   └──────────────┴─────────────────────────────┘
```

1. **USER (`users`)**:
   - `id` (PK, INT AUTO_INCREMENT)
   - `name` (VARCHAR(100), NOT NULL)
   - `email` (VARCHAR(150), UNIQUE, INDEX, NOT NULL)
   - `password_hash` (VARCHAR(255), NOT NULL)
   - `role_id` (FK -> `roles.id`, RESTRICT)
   - `is_active` (BOOLEAN, DEFAULT TRUE)
   - `failed_login_count` (INT, DEFAULT 0)
   - `lockout_end` (DATETIME, NULLABLE)
   - `created_at`, `updated_at` (DATETIME)
2. **ROLE (`roles`)**:
   - `id` (PK), `name` (VARCHAR(50), UNIQUE) — `Admin`, `Manager`, `SalesExecutive`
3. **CUSTOMER (`customers`)**:
   - `id` (PK), `customer_code` (VARCHAR(50), UNIQUE, INDEX, e.g. `CUST-0001`)
   - `customer_name` (VARCHAR(150)), `email` (VARCHAR(150), UNIQUE), `phone` (VARCHAR(30), UNIQUE)
   - `company_name`, `address`, `city`, `state`, `status` (`Active` / `Inactive`)
   - `created_by` (FK -> `users.id`)
4. **LEAD (`leads`)**:
   - `id` (PK), `lead_code` (VARCHAR(50), UNIQUE, e.g. `LEAD-0001`), `lead_name`, `email`, `phone`, `company_name`
   - `source` (`Website`, `Referral`, `Cold Call`, `Campaign`, `Trade Show`, `Partner`, `Other`)
   - `status` (`New`, `Contacted`, `Qualified`, `Unqualified`, `Converted`, `Lost`)
   - `priority` (`Low`, `Medium`, `High`, `Urgent`), `expected_value` (FLOAT >= 0)
   - `assigned_to` (FK -> `users.id`), `notes`, `converted_customer_id` (FK -> `customers.id`, SET NULL)
5. **OPPORTUNITY (`opportunities`)**:
   - `id` (PK), `opportunity_name`, `customer_id` (FK -> `customers.id`, CASCADE), `lead_id` (FK -> `leads.id`, SET NULL)
   - `amount` (FLOAT > 0 for active), `stage` (`Qualification`, `Proposal`, `Negotiation`, `Won`, `Lost`)
   - `probability` (FLOAT, 0–100), `expected_close_date` (DATE >= today for active)
   - `status` (`Open`, `Won`, `Lost`), `assigned_to` (FK -> `users.id`), `notes`
   - Derived property: `weighted_value = amount * probability / 100`
6. **FOLLOW_UP (`follow_ups`)**:
   - `id` (PK), `customer_id` (FK), `lead_id` (FK), `opportunity_id` (FK)
   - `follow_up_date` (DATETIME >= today for planned), `follow_up_type` (`Call`, `Meeting`, `Email`, `Task`)
   - `subject`, `remarks`, `status` (`Planned`, `Completed`, `Missed`, `Cancelled`)
   - `assigned_to` (FK -> `users.id`)
7. **ACTIVITY (`activities`)**:
   - `id` (PK), `activity_type` (`Call`, `Meeting`, `Email`, `Task`), `subject`, `description`
   - `activity_date` (DATETIME), `customer_id` (FK), `lead_id` (FK), `assigned_to` (FK), `status`
8. **AUDIT_LOG (`audit_logs`)**:
   - `id` (PK), `user_id` (FK -> `users.id`, SET NULL), `action` (LOGIN, CREATE, UPDATE, DELETE, CONVERT, etc.)
   - `entity_name`, `record_id`, `old_value` (JSON), `new_value` (JSON), `ip_address`, `details`, `created_at`

---

## 5. Security & Authentication Architecture

- **Password Policy:** Minimum 8 characters, containing at least 1 uppercase letter, 1 lowercase letter, 1 digit, and 1 special character (`[!@#$%^&*...]`).
- **Account Lockout:**
  - Failed login attempts increment `failed_login_count`.
  - Upon reaching 5 consecutive failures, `lockout_end` is automatically set to `now() + 15 minutes`.
  - Requests during lockout are rejected with `403 Forbidden` and a time-remaining indicator.
  - Successful login resets `failed_login_count` to 0.
- **Session & Cookie Security:**
  - Access tokens (JWT HS256) are written as `HttpOnly`, `SameSite=lax` cookies.
  - API endpoints support both Cookie-based session extraction and `Authorization: Bearer <token>` headers for testing and OpenAPI Swagger exploration.
- **Role-Based Authorization Matrix:**

| Capability / Module | Admin | Manager | Sales Executive |
| :--- | :---: | :---: | :---: |
| **Dashboard** | Full Enterprise View | Full Team Scope | Assigned Records Only |
| **Customers** | All Customers | Team Customers | Assigned / Created Only |
| **Leads** | All Leads | Team Leads | Assigned Only |
| **Opportunities** | All Deals | Team Deals | Assigned Only |
| **Follow-Ups** | All Follow-ups | Team Follow-ups | Assigned Only |
| **Activities** | All Touchpoints | Team Touchpoints | Assigned Only |
| **Reports** | All + Audit Reports | Team Reports | Assigned Reports Only |
| **CSV Exports** | Full Scope | Team Scope | Scoped to Assigned Data |
| **User Management** | Full (Create/Role/Reset) | Read-only Team Directory | No Access (403) |
| **Audit Logs View** | Dedicated Screen | Limited / Scoped | No Access (403) |

---

## 6. Default Seed Credentials

Run `python seed.py` or startup Docker Compose to seed these initial user accounts:

| User Name | Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Admin User** | `Admin` | `admin@acxiomcrm.com` | `Admin@12345!` | Full system administration, audit logs, all records |
| **Sales Manager** | `Manager` | `manager@acxiomcrm.com` | `Manager@12345!` | Team pipeline, deals, user list, management reports |
| **Alex Morgan** | `SalesExecutive` | `alex.sales@acxiomcrm.com` | `Sales@12345!` | Assigned customers (CUST-0001, CUST-0002, etc.), leads, deals |
| **Sarah Jenkins** | `SalesExecutive` | `sarah.sales@acxiomcrm.com` | `Sales@12345!` | Assigned customers (CUST-0003, CUST-0004, etc.), leads, deals |

> **Note:** The Login page includes convenient **Quick Demo Credentials** buttons so you can switch personas with a single click.

---

## 7. Local Development Quickstart

### Prerequisites
- Python 3.10+ (tested on Python 3.11 & 3.13)
- Node.js 18+ (tested on Node v22)
- MySQL 8.0 (or SQLite for instantaneous zero-dependency local testing)

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment (optional but recommended):**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux / macOS:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment:**
   Create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *For MySQL:* Set `DATABASE_URL=mysql+pymysql://root:password@localhost:3306/acxiom_crm`
   *For local SQLite:* Set `DATABASE_URL=sqlite:///./acxiom_crm.db`

5. **Run Alembic Migrations:**
   ```bash
   alembic upgrade head
   ```

6. **Seed realistic CRM dataset:**
   ```bash
   python seed.py
   ```

7. **Start FastAPI server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   - API Root: `http://localhost:8000`
   - Interactive Swagger OpenAPI Docs: `http://localhost:8000/docs`
   - ReDoc Docs: `http://localhost:8000/redoc`

---

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install npm dependencies:**
   ```bash
   npm install
   ```

3. **Start Vite development server:**
   ```bash
   npm run dev
   ```
   - Application URL: `http://localhost:5173`

---

## 8. Docker Deployment

Deploy the entire full-stack application (MySQL 8.0, FastAPI backend, and React Nginx frontend) with Docker Compose:

```bash
docker compose up --build -d
```

### Services Started:
- **Frontend SPA (Nginx):** `http://localhost:3000`
- **Backend API (FastAPI):** `http://localhost:8000`
- **Swagger Documentation:** `http://localhost:8000/docs`
- **MySQL Database:** `localhost:3306` (database: `acxiom_crm`, user: `crm_user`)

To stop all services:
```bash
docker compose down -v
```

---

## 9. Running Automated Tests

A comprehensive test suite is located in `backend/tests/` covering authentication, account lockout, role scoping, business validations, lead conversion, and audit logging.

Run the test suite:
```bash
cd backend
pytest -v
```

### Test Coverage Highlights
- `test_registration_success`: Verifies self-service registration defaults to `SalesExecutive` and never exposes password hashes.
- `test_registration_duplicate_email`: Verifies 409 Conflict rejection.
- `test_registration_weak_password`: Verifies password complexity rejection (400).
- `test_login_success`: Validates JWT creation and user response.
- `test_login_invalid_password`: Verifies 401 Unauthorized.
- `test_login_lockout_after_repeated_failures`: Verifies temporary account lockout after 5 failures (403 Forbidden).
- `test_login_deactivated_account`: Verifies deactivated accounts are rejected (403).
- `test_get_me_endpoint`: Verifies current session recovery without password exposure.
- `test_customer_validation_and_uniqueness`: Tests email and phone format validation and duplicate rejection.
- `test_sales_executive_scoping_and_forbidden_access`: Asserts that Sales Executive 1 cannot read Sales Executive 2's customer by ID (strict `403 Forbidden`).
- `test_opportunity_business_rules`: Enforces amount > 0, probability 0–100, and close date not in past for active deals; checks weighted value calculation.
- `test_follow_up_date_rules`: Confirms planned follow-up dates earlier than today are rejected (400).
- `test_lead_conversion_workflow`: Validates lifecycle transition (`New` -> `Contacted` -> `Qualified` -> `Converted`), creation of linked Customer and Opportunity, and rejection of duplicate conversion.
- `test_audit_logs_recorded`: Asserts that CRM operations generate audit entries and restricts audit view to authorized administrators.

---

## 10. Acceptance Scenario Verification Checklist

| # | Requirement | Implementation / Verification Reference | Status |
| :---: | :--- | :--- | :---: |
| 1 | Open AcxiomCRM unauthenticated &rarr; protected pages inaccessible | `frontend/src/components/ProtectedRoute.jsx` redirects anonymous users to `/login`. | **PASS** |
| 2 | Register test user & login successfully &rarr; redirect to Dashboard | Tested in `test_auth.py::test_registration_success`, UI pre-fills work cleanly. | **PASS** |
| 3 | Create Customer with invalid email/phone &rarr; client validation blocks save | `frontend/src/utils/validators.js` & `CustomerFormModal.jsx` display inline invalid-feedback. | **PASS** |
| 4 | Bypass browser validation &rarr; backend rejects invalid payload | `app/utils/validators.py` and `CustomerService` return `400 Bad Request`. Tested in `test_customer_validation_and_uniqueness`. | **PASS** |
| 5 | Create Opportunity with Amount <= 0 &rarr; rejected | `OpportunityService` enforces `Amount > 0` for active deals. Tested in `test_opportunity_business_rules`. | **PASS** |
| 6 | Create Opportunity with Probability > 100 &rarr; rejected | `OpportunityCreate` and `OpportunityService` reject `> 100`. Tested in `test_opportunity_business_rules`. | **PASS** |
| 7 | Expected Close Date in the past &rarr; rejected for active opportunity | `validate_opportunity_rules` rejects past dates. Tested in `test_opportunity_business_rules`. | **PASS** |
| 8 | Create Follow-Up dated before today &rarr; rejected | `validate_follow_up_date` enforces date >= today. Tested in `test_follow_up_date_rules`. | **PASS** |
| 9 | Login as SalesExecutive &rarr; only assigned data is accessible | Verified by `verify_record_access` and `apply_scope_filter`. Tested in `test_sales_executive_scoping_and_forbidden_access`. | **PASS** |
| 10 | Login as Manager &rarr; team pipeline and reports accessible | `Manager` role accesses team CRM items and management reports; security admin blocked. | **PASS** |
| 11 | Login as Admin &rarr; user/role/audit administrative screens available | `UsersAdminPage.jsx` and `AuditLogsPage.jsx` enabled only for Admin. | **PASS** |
| 12 | Create/Update/Delete CRM record &rarr; audit entry generated | `AuditService.log_event` records old/new JSON diffs and IP. Tested in `test_audit_logs_recorded`. | **PASS** |
| 13 | Call `/api/customers` &rarr; authorized JSON returned | Returns `PaginatedResponse[CustomerResponse]` with generated codes. | **PASS** |
| 14 | Open Dashboard &rarr; KPI cards and Chart.js charts display authorized data | `DashboardPage.jsx` renders KPIs, Lead Status chart, Pipeline chart, and Monthly Won sales chart. | **PASS** |
| 15 | Search, Filter, and Pagination | Backend pagination (`?page=1&page_size=20`) and multi-column search implemented across all list screens. | **PASS** |
| 16 | Lead Qualification & Conversion | `LeadConvertModal.jsx` converts Qualified leads to Customers & Opportunities without duplicates. | **PASS** |
| 17 | Reports with CSV Export | Scoped CSV exports implemented for Customers, Leads, Deals, and Follow-Ups in `ReportService`. | **PASS** |
| 18 | Containerized Docker Stack | Multi-container `docker-compose.yml` configured with health checks and volume persistence. | **PASS** |

---

## 11. REST API Specification Summary

All endpoints are documented interactively in OpenAPI format at `http://localhost:8000/docs`:

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Self-service registration (defaults to SalesExecutive)
- `POST /api/auth/login` — Issues access token & sets HTTP-only cookie
- `POST /api/auth/logout` — Revokes session & clears cookie
- `GET  /api/auth/me` — Fetches current user profile and role

### Customers (`/api/customers`)
- `GET    /api/customers` — Scoped customer list with search, filter, pagination
- `POST   /api/customers` — Create customer with unique code (`CUST-xxxx`)
- `GET    /api/customers/{id}` — Customer details (enforces ownership)
- `PUT    /api/customers/{id}` — Update customer details
- `DELETE /api/customers/{id}` — Safe delete or deactivation

### Leads (`/api/leads`)
- `GET    /api/leads` — Scoped leads list
- `POST   /api/leads` — Create lead with unique code (`LEAD-xxxx`)
- `GET    /api/leads/{id}` — Lead details
- `PUT    /api/leads/{id}` — Update lead / lifecycle state
- `POST   /api/leads/{id}/convert` — Convert qualified lead to Customer & Opportunity
- `DELETE /api/leads/{id}` — Delete lead

### Opportunities (`/api/opportunities`)
- `GET    /api/opportunities` — Scoped deals list
- `POST   /api/opportunities` — Create deal with business validation
- `GET    /api/opportunities/{id}` — Deal details
- `PUT    /api/opportunities/{id}` — Update deal / stage progression
- `DELETE /api/opportunities/{id}` — Delete deal

### Follow-Ups (`/api/followups`)
- `GET    /api/followups` — Scoped follow-ups (supports `upcoming=true` / `overdue=true`)
- `POST   /api/followups` — Schedule follow-up (enforces date >= today)
- `GET    /api/followups/{id}` — Follow-up details
- `PUT    /api/followups/{id}` — Reschedule or update status
- `DELETE /api/followups/{id}` — Delete follow-up

### Activities (`/api/activities`)
- `GET    /api/activities` — Scoped activity log
- `POST   /api/activities` — Record Call, Meeting, Email, or Task touchpoint
- `GET    /api/activities/{id}` — Activity details
- `PUT    /api/activities/{id}` — Update activity
- `DELETE /api/activities/{id}` — Delete activity

### Dashboard & Analytics (`/api/dashboard`)
- `GET /api/dashboard` — Role-scoped KPIs, Chart.js datasets, recent touchpoints

### Reports (`/api/reports`)
- `GET /api/reports/pipeline` — Stage-wise pipeline summary
- `GET /api/reports/conversions` — Conversion rates and win ratios
- `GET /api/reports/customers` & `/api/reports/customers/csv`
- `GET /api/reports/leads` & `/api/reports/leads/csv`
- `GET /api/reports/opportunities` & `/api/reports/opportunities/csv`
- `GET /api/reports/followups` & `/api/reports/followups/csv`
- `GET /api/reports/user-activity` — User touchpoint counts (Manager/Admin)
- `GET /api/reports/audit` — Audit trail report (Admin)

### Administration (`/api/users` & `/api/audit-logs`)
- `GET   /api/users` — User list (Manager & Admin)
- `POST  /api/users` — Provision new user (Admin)
- `PATCH /api/users/{id}/role` — Change user role (Admin)
- `PATCH /api/users/{id}/status` — Toggle active/inactive (Admin)
- `POST  /api/users/{id}/reset-password` — Administrative password reset (Admin)
- `GET   /api/audit-logs` — Immutable audit log with old/new diffs (Admin)
