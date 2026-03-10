# Dakkah CityOS ERP

## Overview
Dakkah CityOS ERP is a CityOS-grade ERP system built on ERPNext and Frappe, designed to manage municipal government and smart city operations. It integrates with a custom CityOS Frappe app and serves as the central "Truth layer" for Financial, Operational, HR, Procurement, Asset, and Compliance data within the Dakkah CityOS platform. Its core purpose is to provide a robust, scalable, and interconnected ERP solution tailored for urban management, aiming to be the economic backbone of the CityOS platform.

## User Preferences
- Frontend on port 5000
- Backend on localhost
- Trust all hosts for Replit proxy compatibility
- CityOS platform philosophy: ERPNext as economic backbone, not just internal ops

## System Architecture
The system is built on Frappe v15.99.0 and ERPNext v17.0.0-dev, extended by a custom CityOS v0.1.0 app. It uses Python 3.12, PostgreSQL, and Redis for caching/queuing. Gunicorn serves the web application, and Werkzeug handles static assets.

**Core Architectural Decisions & Features:**
-   **Multi-Tenancy (NodeContext):** Implements a 5-tier hierarchical `NodeContext` (MASTER → GLOBAL → REGIONAL → COUNTRY → CITY) for strict tenant isolation. This is achieved via `cityos_tenant` custom fields added to 28 core ERPNext doctypes and `permission_query_conditions` across 34 doctypes. CityOS custom doctypes enforce strict tenant filtering, while ERPNext core doctypes allow NULL for backward compatibility. Hierarchical access ensures parent tenants see children. A planned hybrid approach aims to link Node Contexts to auto-created ERPNext Company records for broader coverage.
-   **Governance:** Includes `NodeContext` for tenant management, `CityOS Audit Log` for immutable audit trails, and `Integration Outbox Event` for reliable event publishing. Manages governance authorities, policy doctrines, and persona management.
-   **Modular Design:** Organized into modules for Finance, Procurement, Assets Management, HR Management, and CityOS Projects, each containing specific doctypes with tailored business logic for municipal operations.
-   **UI/UX:** Features 6 custom workspace pages (Governance, Finance, Procurement, Assets, HR, Projects) with doctype shortcuts and dashboard number cards. The login page is branded as "Dakkah CityOS".
-   **Operational Doctypes & Business Logic:** Comprehensive business logic is implemented for 14 operational doctypes across Finance (e.g., Budget Program, Municipal Invoice), Procurement (e.g., CityOS Procurement Request, Vendor Compliance Profile), Assets (e.g., Municipal Asset, Maintenance Plan), HR (e.g., Position Control, Staff Assignment), and Projects (e.g., Capital Project, Community Impact Report), along with 9 child table doctypes.
-   **Audit & Compliance:** Automatic logging with create/update/delete snapshots for CityOS-aware documents. Daily scheduled checks (9 total): missing tenant detection, stale workflow states, orphan stores, overdue maintenance, governance chain integrity, hierarchy consistency, cross-system sync health, expired persona assignments, and policy expiry.
-   **Multi-Tenancy Coverage:** 28 ERPNext doctypes have custom fields, 34 doctypes have PQC (16 ERPNext + 18 CityOS), 12 ERPNext doctypes have fields but no PQC, 92+ ERPNext doctypes with `company` field have no CityOS coverage. Node Context tenant hierarchy (MASTER→CITY) is separate from the organizational taxonomy (Scope→Category→Subcategory) and business hierarchy (Tenant→Store→Portal).
-   **Planned Hybrid Approach (not yet implemented):** Link Node Contexts to auto-created ERPNext Company records. Would cover 120+ ERPNext doctypes via native Company-based User Permissions. Design documented in `apps/cityos/CUSTOMIZATION_GUIDE.md`.
-   **Server Architecture:** A Node.js reverse proxy (`proxy.js`) on port 5000 routes `/socket.io/*` to a Node.js Socket.IO server on port 9000 for real-time features, and all other requests to Gunicorn on port 8000 for the Frappe/ERPNext application.

## External Dependencies
-   **PostgreSQL:** Primary database backend.
-   **Redis:** Used for caching (port 11000) and message queuing/Socket.IO (port 13000).
-   **Node.js Socket.IO:** Real-time WebSocket server for live updates.
-   **Medusa Commerce:** Integrated as the "Transaction Truth" for orders and payments, with bidirectional synchronization.
-   **Payload CMS:** Integrated as the "Content Truth" for syncing various entities, featuring bidirectional synchronization with outbound sync functions and conflict detection.
-   **Temporal Workflow:** Integrated as the "Execution Truth" for managing approval chains and settlement runs, using multi-queue support (`xsystem-platform-queue`, `xsystem-vertical-queue`).
-   **CityOS Workflow Registry:** A discovery layer for cross-system Temporal workflows, handling workflow registration and providing real-time updates via SSE.
-   **Gunicorn:** Web server for the Frappe application (internal only).
-   **Reverse Proxy:** Node.js proxy managing external access and routing.

## Deployment (Reserved VM)
-   **Target:** Replit Reserved VM deployment using `bash /home/runner/workspace/start.sh`
-   **Database Optimization (Pre-Deploy Strategy):** Before publishing, run `bash pre-deploy.sh` to drop 628 empty tables, reducing database objects from ~1830 to ~360 (80% reduction). This brings copy time from ~8.5min to an estimated ~1.7min, well within the 9-minute timeout. Tables are automatically recreated on startup via `recreate_tables.py` (~28s).
-   **Deployment Workflow:** (1) Run `bash pre-deploy.sh` in the Shell. (2) Click Publish. (3) Production starts and recreates empty tables automatically.
-   **Security Fixes (2026-02-13):** Updated cryptography (44.0.3→46.0.5), pillow (11.3.0→12.1.1), pip (25.0.1→26.0.1), pyopenssl (25.0.0→25.3.0) to resolve CVE-2026-26007, CVE-2026-25990, CVE-2025-8869, CVE-2026-1703.
-   **Constraint:** Cannot drop Frappe/ERPNext tables even if empty — they are referenced by the ORM and cause Internal Server Error. Pre-deploy drops them temporarily; start.sh recreates them.
-   **Additional dependency:** `mt940` Python package required for Frappe's Bank Statement Import doctype (sync_all fails without it).

## CI/CD Pipeline (GitHub Actions)
-   **CI Workflow** (`.github/workflows/ci.yml`): Runs on push/PR to main/develop. Performs ruff linting, Python compilation checks, JSON doctype validation, hooks.py syntax validation, workspace JSON validation, hardcoded secrets detection, integration module verification, and doctype integrity checks (duplicate fields, Link/Select validation, multi-tenancy custom fields).
-   **Pre-Deploy Validation** (`.github/workflows/deploy.yml`): Runs on push to main (when CityOS files change) or manual dispatch. Validates all Python files compile, checks scheduler configuration, and scans site configs for leaked secrets. Produces GitHub Step Summary when ready for deployment.
-   **CMS Sync Schedule:** Payload CMS hierarchy sync runs every 15 minutes via cron scheduler. Manual sync available via `trigger_cms_sync` API endpoint. Webhook-driven real-time sync also handles push updates from Payload.