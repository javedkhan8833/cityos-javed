# Dakkah CityOS ERP — Full Detailed Implementation Plan

**Date:** February 10, 2026
**Based on:** CITYOS_GAP_ANALYSIS.md
**System:** ERPNext v17.0.0-dev on Frappe v15.99.0, PostgreSQL, CityOS App v0.1.0

---

## Table of Contents

1. [Implementation Philosophy](#1-implementation-philosophy)
2. [Phase Overview](#2-phase-overview)
3. [Phase 1: Foundation — Core Logic & Security Hardening](#3-phase-1-foundation--core-logic--security-hardening)
4. [Phase 2: Integration — ERPNext Bridge & CMS Completeness](#4-phase-2-integration--erpnext-bridge--cms-completeness)
5. [Phase 3: Operational Visibility — Dashboards & Reporting](#5-phase-3-operational-visibility--dashboards--reporting)
6. [Phase 4: Maturity — Advanced Workflows, New Entities & Migration Tools](#6-phase-4-maturity--advanced-workflows-new-entities--migration-tools)
7. [Cross-Cutting Concerns](#7-cross-cutting-concerns)
8. [Testing Strategy](#8-testing-strategy)
9. [Deployment & Rollback Strategy](#9-deployment--rollback-strategy)
10. [Risk Register](#10-risk-register)
11. [Dependency Map](#11-dependency-map)
12. [Appendix: File-Level Change Map](#appendix-file-level-change-map)

---

## 1. Implementation Philosophy

### 1.1 Guiding Principles

1. **Build on ERPNext, don't rebuild it.** Wherever ERPNext has a mature module (Accounts, HR, Assets, Buying, Projects), CityOS doctypes should link to and extend those modules rather than duplicate functionality.
2. **Multi-tenant from the start.** Every new feature must enforce tenant scoping in queries, APIs, and UI. No feature ships without tenant isolation verified.
3. **Event-driven by default.** State changes propagate through the Integration Outbox pattern. Direct cross-system calls are avoided except for real-time requirements.
4. **Test before ship.** Every business logic change requires unit tests. Integration changes require mock-based integration tests. Target: 85%+ coverage on CityOS app code.
5. **Incremental delivery.** Each task delivers a self-contained, testable unit of work. No "big bang" releases.

### 1.2 Implementation Order Rationale

The four phases are sequenced by dependency:

- **Phase 1 (Foundation)** must come first because business logic, field definitions, and security rules are prerequisites for everything else.
- **Phase 2 (Integration)** depends on Phase 1 because ERPNext module linkage requires the CityOS doctypes to have proper fields and validation, and CMS sync requires those fields to exist.
- **Phase 3 (Visibility)** depends on Phase 2 because dashboards and reports need data flowing through proper workflows and integrations.
- **Phase 4 (Maturity)** builds on the operational foundation of Phases 1-3.

---

## 2. Phase Overview

| Phase | Name | Tasks | Focus |
|-------|------|-------|-------|
| **1** | Foundation | 1.1–1.8 | Core doctype business logic, missing fields, RBAC, multi-tenant hardening, seed data |
| **2** | Integration | 2.1–2.7 | ERPNext module bridges, CMS sync completeness, workflow state machines, API contracts |
| **3** | Visibility | 3.1–3.5 | Dashboards, reports, compliance dashboard, workflow dashboard, integration health |
| **4** | Maturity | 4.1–4.6 | Remaining modules, advanced workflows, new entities, migration tools, advanced security |

---

## 3. Phase 1: Foundation — Core Logic & Security Hardening

### Task 1.1: Add Missing Fields to Core Doctypes

**Objective:** Extend doctype schemas with all fields required for business logic, lifecycle management, and ERPNext linkage.

**Scope:** 10 doctypes across Finance, Procurement, Assets, HR, and Projects modules.

#### 1.1.1 Budget Program — New Fields

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `fiscal_year` | Link | Fiscal Year | ERPNext fiscal year reference |
| `revision_number` | Int | | Auto-incremented on revision |
| `original_amount` | Currency | | Initially proposed budget |
| `approved_amount` | Currency | | Amount after approval |
| `committed_amount` | Currency | | Amount committed to POs/contracts (read-only, computed) |
| `actual_amount` | Currency | | Amount actually spent (read-only, computed) |
| `available_amount` | Currency | | approved - committed - actual (read-only, computed) |
| `utilization_percentage` | Percent | | (committed + actual) / approved × 100 (read-only, computed) |
| `approval_status` | Select | Draft, Submitted, Under Review, Approved, Active, Revision Requested, Closed | Workflow status |
| `approved_by` | Link | User | Approving authority |
| `approved_date` | Date | | Date of approval |
| `budget_type` | Select | Operating, Capital, Grant, Emergency | Budget classification |
| `funding_sources` | Table | Budget Funding Source (child table) | Multi-source funding breakdown |
| `linked_erpnext_budget` | Link | Budget | ERPNext Budget reference |

**Child Table: Budget Funding Source**

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `funding_source` | Link | Funding Source | Reference to funding source |
| `allocated_amount` | Currency | | Amount from this source |
| `percentage` | Percent | | Percentage of total budget |

#### 1.1.2 Municipal Invoice — New Fields

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `invoice_type` | Select | Standard, Credit Note, Debit Note, Pro Forma | Invoice classification |
| `due_date` | Date | | Payment due date |
| `payment_terms` | Link | Payment Terms Template | ERPNext payment terms |
| `payment_status` | Select | Unpaid, Partially Paid, Paid, Overdue, Written Off | Payment lifecycle |
| `paid_amount` | Currency | | Amount received (read-only, computed) |
| `outstanding_amount` | Currency | | grand_total - paid_amount (read-only, computed) |
| `overdue_days` | Int | | Days past due date (read-only, computed) |
| `late_fee_amount` | Currency | | Calculated late fee |
| `late_fee_rate` | Percent | | Late fee percentage per period |
| `linked_sales_invoice` | Link | Sales Invoice | ERPNext Sales Invoice reference |
| `linked_budget_program` | Link | Budget Program | Budget to charge against |
| `billing_period_start` | Date | | Service period start |
| `billing_period_end` | Date | | Service period end |
| `department` | Link | Department | ERPNext Department |
| `cost_center` | Link | Cost Center | ERPNext Cost Center |

#### 1.1.3 Funding Source — New Fields

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `source_type` | Select | Grant, Tax Revenue, Federal Transfer, State Transfer, Municipal Revenue, Loan, Donation, Fee Revenue | Classification |
| `total_amount` | Currency | | Total available funding |
| `allocated_amount` | Currency | | Amount allocated to budget programs (read-only, computed) |
| `utilized_amount` | Currency | | Amount actually spent (read-only, computed) |
| `available_amount` | Currency | | total - allocated (read-only, computed) |
| `utilization_percentage` | Percent | | utilized / total × 100 (read-only, computed) |
| `effective_date` | Date | | When funding becomes available |
| `expiry_date` | Date | | When funding expires |
| `donor_organization` | Data | | For grants: funding organization |
| `grant_reference` | Data | | External grant reference number |
| `reporting_requirements` | Small Text | | Compliance/reporting obligations |
| `restrictions` | Small Text | | Usage restrictions on this funding |
| `status` | Select | Active, Exhausted, Expired, Frozen | Current status |

#### 1.1.4 Fiscal Allocation — New Fields

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `budget_program` | Link | Budget Program | Parent budget |
| `funding_source` | Link | Funding Source | Source of funds |
| `allocation_period` | Select | Monthly, Quarterly, Semi-Annual, Annual | Period type |
| `period_start` | Date | | Allocation period start |
| `period_end` | Date | | Allocation period end |
| `allocated_amount` | Currency | | Amount for this period |
| `committed_amount` | Currency | | Committed from this allocation (read-only, computed) |
| `spent_amount` | Currency | | Actually spent (read-only, computed) |
| `remaining_amount` | Currency | | allocated - committed - spent (read-only, computed) |
| `status` | Select | Draft, Active, Fully Utilized, Closed | Allocation status |
| `department` | Link | Department | Target department |
| `cost_center` | Link | Cost Center | ERPNext cost center |

#### 1.1.5 CityOS Procurement Request — New Fields

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `request_date` | Date | | Date of request |
| `required_by_date` | Date | | When items/services are needed |
| `estimated_amount` | Currency | | Estimated total cost |
| `approved_amount` | Currency | | Approved budget for this procurement |
| `actual_amount` | Currency | | Actual cost after PO/contract (read-only, computed) |
| `budget_program` | Link | Budget Program | Budget to charge against |
| `fiscal_allocation` | Link | Fiscal Allocation | Specific allocation period |
| `urgency_level` | Select | Normal, Urgent, Emergency | Priority classification |
| `procurement_method` | Select | Open Tender, Limited Tender, Direct Purchase, Framework Agreement, Emergency | Method |
| `procurement_category` | Link | CityOS Category | Category classification |
| `evaluation_criteria` | Small Text | | How vendors will be evaluated |
| `justification` | Text | | Business justification |
| `requesting_department` | Link | Department | ERPNext Department |
| `requesting_officer` | Link | User | Person making the request |
| `approval_level` | Select | Department Head, Director, Committee | Based on amount thresholds |
| `selected_vendor` | Link | Supplier | Chosen vendor after evaluation |
| `linked_purchase_order` | Link | Purchase Order | ERPNext PO created from this request |
| `linked_rfq` | Link | Request for Quotation | ERPNext RFQ reference |
| `items` | Table | Procurement Request Item (child table) | Line items |
| `required_documents` | Table | Procurement Document Checklist (child table) | Required documents |

**Child Table: Procurement Request Item**

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `item_code` | Link | Item | ERPNext Item |
| `item_name` | Data | | Item description |
| `qty` | Float | | Quantity required |
| `uom` | Link | UOM | Unit of measure |
| `estimated_rate` | Currency | | Estimated unit price |
| `estimated_amount` | Currency | | qty × rate (computed) |

**Child Table: Procurement Document Checklist**

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `document_name` | Data | | Document type required |
| `is_mandatory` | Check | | Whether required |
| `is_attached` | Check | | Whether received |
| `attachment` | Attach | | The document file |

#### 1.1.6 Vendor Compliance Profile — New Fields

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `linked_supplier` | Link | Supplier | ERPNext Supplier reference |
| `vendor_type` | Select | Goods, Services, Works, Consultancy | Vendor classification |
| `compliance_score` | Float | | Calculated score 0-100 (read-only, computed) |
| `risk_level` | Select | Low, Medium, High, Critical | Risk classification |
| `last_assessment_date` | Date | | Most recent compliance check |
| `next_assessment_date` | Date | | Next scheduled check |
| `performance_rating` | Rating | | Overall performance (1-5 stars) |
| `delivery_rating` | Rating | | Delivery performance (1-5 stars) |
| `quality_rating` | Rating | | Quality rating (1-5 stars) |
| `total_contracts` | Int | | Number of contracts (read-only, computed) |
| `total_contract_value` | Currency | | Total contract value (read-only, computed) |
| `active_contracts` | Int | | Current active contracts (read-only, computed) |
| `debarment_status` | Select | None, Under Review, Debarred, Reinstated | Debarment status |
| `debarment_reason` | Small Text | | Reason for debarment |
| `debarment_start_date` | Date | | When debarment begins |
| `debarment_end_date` | Date | | When debarment ends |
| `insurance_expiry` | Date | | Insurance certificate expiry |
| `registration_expiry` | Date | | Business registration expiry |
| `tax_compliance_expiry` | Date | | Tax clearance expiry |
| `certificates` | Table | Vendor Certificate (child table) | Compliance certificates |

**Child Table: Vendor Certificate**

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `certificate_type` | Select | Trade License, Tax Clearance, Insurance, ISO Certification, Safety Certification, Other | Type |
| `certificate_number` | Data | | Certificate/license number |
| `issuing_authority` | Data | | Who issued it |
| `issue_date` | Date | | Date issued |
| `expiry_date` | Date | | Expiration date |
| `status` | Select | Valid, Expiring Soon, Expired, Revoked | Current status |
| `attachment` | Attach | | Certificate document |

#### 1.1.7 Contract Register — New Fields

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `contract_type` | Select | Goods, Services, Works, Consultancy, Framework, Lease | Classification |
| `contract_number` | Data | | Official contract number |
| `contract_value` | Currency | | Original contract value |
| `amended_value` | Currency | | Total value of amendments |
| `total_value` | Currency | | contract_value + amended_value (computed) |
| `start_date` | Date | | Contract start |
| `end_date` | Date | | Contract end |
| `renewal_date` | Date | | Next renewal date |
| `auto_renew` | Check | | Whether contract auto-renews |
| `notice_period_days` | Int | | Days notice required for non-renewal |
| `linked_vendor` | Link | Supplier | ERPNext Supplier |
| `linked_vendor_profile` | Link | Vendor Compliance Profile | Vendor compliance link |
| `linked_procurement_request` | Link | CityOS Procurement Request | Originating request |
| `contract_status` | Select | Draft, Under Review, Active, Under Amendment, Suspended, Expired, Renewed, Terminated | Lifecycle status |
| `performance_bond_amount` | Currency | | Performance guarantee amount |
| `performance_bond_expiry` | Date | | Guarantee expiry |
| `retention_percentage` | Percent | | Retention on payments |
| `retention_amount` | Currency | | Total retained (computed) |
| `paid_amount` | Currency | | Total paid to vendor (read-only, computed) |
| `remaining_value` | Currency | | total_value - paid_amount (computed) |
| `sla_compliance_percentage` | Percent | | SLA compliance score |
| `contract_manager` | Link | User | Person managing this contract |
| `milestones` | Table | Contract Milestone (child table) | Deliverable milestones |
| `payment_schedule` | Table | Contract Payment Schedule (child table) | Payment plan |
| `amendments` | Table | Contract Amendment (child table) | Amendment history |

**Child Table: Contract Milestone**

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `milestone_name` | Data | | Milestone description |
| `due_date` | Date | | Expected completion |
| `completion_date` | Date | | Actual completion |
| `deliverable` | Small Text | | What is to be delivered |
| `status` | Select | Pending, In Progress, Completed, Overdue, Waived | Status |
| `payment_linked` | Check | | Whether payment is tied to this milestone |
| `payment_amount` | Currency | | Amount tied to milestone |

**Child Table: Contract Payment Schedule**

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `payment_date` | Date | | Scheduled payment date |
| `amount` | Currency | | Payment amount |
| `description` | Data | | Payment description |
| `status` | Select | Scheduled, Invoiced, Paid, Overdue | Payment status |
| `linked_invoice` | Link | Municipal Invoice | Invoice reference |

**Child Table: Contract Amendment**

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `amendment_date` | Date | | Date of amendment |
| `amendment_number` | Data | | Amendment reference |
| `description` | Small Text | | What changed |
| `value_change` | Currency | | Change in contract value (+/-) |
| `approved_by` | Link | User | Who approved the amendment |

#### 1.1.8 Municipal Asset — New Fields

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `asset_code` | Data | | Unique asset identifier |
| `asset_class` | Select | Land, Building, Infrastructure, Vehicle, Equipment, Furniture, IT Equipment, Other | Classification |
| `acquisition_date` | Date | | When asset was acquired |
| `acquisition_cost` | Currency | | Original purchase price |
| `current_value` | Currency | | Current book value (read-only, computed) |
| `accumulated_depreciation` | Currency | | Total depreciation (read-only, computed) |
| `depreciation_method` | Select | Straight Line, Declining Balance, None | Depreciation method |
| `useful_life_years` | Int | | Expected useful life |
| `salvage_value` | Currency | | Residual value at end of life |
| `condition_rating` | Select | Excellent, Good, Fair, Poor, Critical, Condemned | Current condition |
| `last_inspection_date` | Date | | Most recent inspection |
| `next_inspection_date` | Date | | Next scheduled inspection |
| `location` | Data | | Physical location description |
| `gps_latitude` | Float | | GPS latitude coordinate |
| `gps_longitude` | Float | | GPS longitude coordinate |
| `facility` | Link | Municipal Facility | Which facility this asset is in |
| `custodian` | Link | Employee | Current responsible person |
| `custodian_department` | Link | Department | Responsible department |
| `warranty_expiry` | Date | | Warranty end date |
| `insurance_policy` | Data | | Insurance policy number |
| `insurance_expiry` | Date | | Insurance end date |
| `linked_erpnext_asset` | Link | Asset | ERPNext Asset reference |
| `linked_procurement` | Link | CityOS Procurement Request | How it was acquired |
| `asset_status` | Select | In Procurement, In Service, Under Maintenance, Out of Service, Decommissioned, Disposed | Lifecycle status |
| `disposal_date` | Date | | When disposed |
| `disposal_method` | Select | Sale, Auction, Donation, Scrap, Transfer | How disposed |
| `disposal_value` | Currency | | Amount received on disposal |

#### 1.1.9 Municipal Facility — New Fields

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `facility_code` | Data | | Unique facility identifier |
| `facility_type` | Select | Office, School, Hospital, Park, Utility, Public Space, Warehouse, Workshop, Other | Type |
| `address` | Small Text | | Full address |
| `gps_latitude` | Float | | GPS latitude |
| `gps_longitude` | Float | | GPS longitude |
| `total_area_sqm` | Float | | Total area in square meters |
| `usable_area_sqm` | Float | | Usable area |
| `capacity` | Int | | Maximum occupancy/capacity |
| `current_occupancy` | Int | | Current occupancy |
| `operating_hours` | Data | | Standard operating hours |
| `year_built` | Int | | Construction year |
| `last_renovation_year` | Int | | Last major renovation |
| `condition_rating` | Select | Excellent, Good, Fair, Poor, Critical | Overall condition |
| `accessibility_compliant` | Check | | ADA/accessibility compliance |
| `energy_rating` | Select | A, B, C, D, E, F, G | Energy efficiency rating |
| `facility_manager` | Link | Employee | Responsible person |
| `managing_department` | Link | Department | Responsible department |
| `monthly_operating_cost` | Currency | | Average monthly cost |
| `annual_budget` | Currency | | Annual facility budget |
| `status` | Select | Active, Under Construction, Under Renovation, Temporarily Closed, Permanently Closed | Status |
| `assets` | Table MultiSelect | Municipal Asset | Assets in this facility (read-only) |

#### 1.1.10 Maintenance Plan — New Fields

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `maintenance_type` | Select | Preventive, Corrective, Predictive, Emergency | Type |
| `priority` | Select | Low, Medium, High, Critical | Priority level |
| `asset` | Link | Municipal Asset | Asset being maintained |
| `facility` | Link | Municipal Facility | Facility being maintained |
| `description` | Text | | Work description |
| `estimated_cost` | Currency | | Estimated maintenance cost |
| `actual_cost` | Currency | | Actual cost incurred |
| `budget_program` | Link | Budget Program | Budget to charge |
| `assigned_to` | Link | User | Internal assignee |
| `assigned_contractor` | Link | Supplier | External contractor |
| `contractor_contract` | Link | Contract Register | Related contract |
| `scheduled_date` | Date | | Planned date |
| `completion_date` | Date | | Actual completion |
| `completion_notes` | Text | | Work performed description |
| `recurrence_pattern` | Select | None, Weekly, Bi-Weekly, Monthly, Quarterly, Semi-Annual, Annual | Repeat pattern |
| `next_scheduled_date` | Date | | Next occurrence (auto-calculated) |
| `work_order_number` | Data | | External work order reference |
| `downtime_hours` | Float | | Asset/facility downtime |
| `parts_used` | Table | Maintenance Parts Used (child table) | Parts consumed |
| `status` | Select | Scheduled, In Progress, Completed, Overdue, Cancelled | Status |

**Child Table: Maintenance Parts Used**

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `item_code` | Link | Item | ERPNext Item |
| `item_name` | Data | | Part description |
| `qty` | Float | | Quantity used |
| `rate` | Currency | | Unit cost |
| `amount` | Currency | | Total (computed) |

#### 1.1.11 Position Control — New Fields

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `position_code` | Data | | Unique position identifier |
| `position_title` | Data | | Job title |
| `position_grade` | Data | | Grade/level |
| `position_step` | Int | | Step within grade |
| `department` | Link | Department | ERPNext Department |
| `designation` | Link | Designation | ERPNext Designation |
| `reports_to` | Link | Position Control | Reporting position |
| `budget_allocation` | Currency | | Annual budget for this position |
| `min_salary` | Currency | | Minimum salary for grade/step |
| `max_salary` | Currency | | Maximum salary for grade/step |
| `required_qualifications` | Small Text | | Minimum qualifications |
| `required_experience_years` | Int | | Minimum years experience |
| `is_supervisory` | Check | | Whether this position supervises others |
| `max_headcount` | Int | | Authorized positions at this code (default 1) |
| `filled_count` | Int | | Currently filled (read-only, computed) |
| `vacancy_count` | Int | | max_headcount - filled (read-only, computed) |
| `is_frozen` | Check | | Whether position is frozen |
| `freeze_reason` | Small Text | | Reason for freeze |
| `freeze_date` | Date | | When frozen |
| `status` | Select | Active, Frozen, Abolished | Position status |

#### 1.1.12 Staff Assignment — New Fields

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `employee` | Link | Employee | ERPNext Employee |
| `employee_name` | Data | | Auto-fetched from Employee (read-only) |
| `position` | Link | Position Control | Assigned position |
| `position_title` | Data | | Auto-fetched from Position (read-only) |
| `assignment_type` | Select | Permanent, Acting, Interim, Temporary, Secondment | Type |
| `effective_from` | Date | | Assignment start date |
| `effective_to` | Date | | Assignment end date (null for permanent) |
| `previous_position` | Link | Position Control | Position before this assignment |
| `previous_assignment` | Link | Staff Assignment | Previous assignment record |
| `salary_amount` | Currency | | Salary for this assignment |
| `allowances` | Currency | | Additional allowances |
| `department` | Link | Department | Auto-fetched from Position (read-only) |
| `approval_status` | Select | Draft, Pending Approval, Approved, Rejected, Ended | Status |
| `approved_by` | Link | User | Approving authority |
| `approved_date` | Date | | Approval date |
| `end_reason` | Select | Transfer, Promotion, Resignation, Retirement, Termination, Contract End | Why assignment ended |
| `remarks` | Small Text | | Additional notes |

#### 1.1.13 Capital Project — New Fields

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `project_code` | Data | | Unique project identifier |
| `project_type` | Select | Infrastructure, Building, Renovation, IT, Environment, Social, Mixed | Type |
| `total_budget` | Currency | | Approved project budget |
| `spent_amount` | Currency | | Amount spent to date (read-only, computed) |
| `committed_amount` | Currency | | Amount committed (POs/contracts) (read-only, computed) |
| `remaining_budget` | Currency | | total - spent - committed (computed) |
| `budget_utilization` | Percent | | (spent + committed) / total × 100 (computed) |
| `current_phase` | Select | Planning, Design, Procurement, Construction, Commissioning, Operational, Closed | Current phase |
| `completion_percentage` | Percent | | Overall completion |
| `project_manager` | Link | Employee | Project manager |
| `managing_department` | Link | Department | Responsible department |
| `contractor` | Link | Supplier | Primary contractor |
| `contractor_contract` | Link | Contract Register | Main contract |
| `start_date` | Date | | Project start |
| `expected_end_date` | Date | | Planned completion |
| `actual_end_date` | Date | | Actual completion |
| `risk_level` | Select | Low, Medium, High, Critical | Current risk assessment |
| `risk_description` | Small Text | | Key risks |
| `linked_erpnext_project` | Link | Project | ERPNext Project |
| `linked_budget_program` | Link | Budget Program | Budget reference |
| `location` | Data | | Project location |
| `gps_latitude` | Float | | GPS latitude |
| `gps_longitude` | Float | | GPS longitude |
| `beneficiary_count` | Int | | Estimated beneficiaries |
| `project_status` | Select | Proposed, Approved, Active, On Hold, Completed, Cancelled | Status |
| `milestones` | Table | Project Milestone (child table) | Key milestones |

**Child Table: Project Milestone**

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `milestone_name` | Data | | Milestone description |
| `phase` | Select | Planning, Design, Procurement, Construction, Commissioning | Related phase |
| `due_date` | Date | | Expected completion |
| `completion_date` | Date | | Actual completion |
| `deliverable` | Small Text | | What is expected |
| `status` | Select | Pending, In Progress, Completed, Overdue, Waived | Status |
| `completion_percentage` | Percent | | Milestone progress |

#### 1.1.14 Community Impact Report — New Fields

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `linked_project` | Link | Capital Project | Associated project |
| `report_type` | Select | Pre-Project Assessment, Mid-Project Review, Post-Project Evaluation, Annual Review | Type |
| `report_date` | Date | | Date of assessment |
| `assessor` | Link | User | Person who conducted assessment |
| `social_impact_score` | Float | | Social impact rating (0-10) |
| `economic_impact_score` | Float | | Economic impact rating (0-10) |
| `environmental_impact_score` | Float | | Environmental impact rating (0-10) |
| `overall_impact_score` | Float | | Average of three scores (computed) |
| `beneficiary_count_actual` | Int | | Actual beneficiaries served |
| `jobs_created` | Int | | Direct jobs created |
| `jobs_sustained` | Int | | Ongoing jobs maintained |
| `community_feedback_summary` | Text | | Summary of community feedback |
| `key_findings` | Text | | Major findings |
| `recommendations` | Text | | Improvement recommendations |
| `cost_benefit_ratio` | Float | | Benefits / costs ratio |
| `status` | Select | Draft, Under Review, Published | Report status |

**Implementation Steps:**

1. Create child table doctype JSON schemas for all child tables listed above
2. Update each parent doctype JSON schema with new fields
3. Run `bench migrate` to apply schema changes
4. Add computed field logic in Python classes
5. Write unit tests for all computed fields
6. Update existing tests if field requirements change

---

### Task 1.2: Implement Finance Module Business Logic

**Objective:** Add validation, calculations, and lifecycle management to all 4 finance doctypes.

#### 1.2.1 Budget Program Business Logic

**File:** `apps/cityos/cityos/finance/doctype/budget_program/budget_program.py`

**Validation Rules:**
- `approved_amount` must not exceed `original_amount` × 1.1 (10% tolerance) without explicit override
- `fiscal_year` is required and must be an active fiscal year
- Budget type must be set before submission
- At least one funding source must be linked
- Total of funding source allocations must equal `approved_amount`
- Cannot approve if `cityos_tenant` is not set

**Computed Fields (recalculated on save):**
- `committed_amount` = SUM of all linked Procurement Request `approved_amount` where status = Approved/Active
- `actual_amount` = SUM of all linked Municipal Invoice `grand_total` where payment_status = Paid
- `available_amount` = `approved_amount` - `committed_amount` - `actual_amount`
- `utilization_percentage` = (`committed_amount` + `actual_amount`) / `approved_amount` × 100
- `revision_number` auto-increments when `approval_status` changes to "Revision Requested"

**Status Transitions:**
```
Draft → Submitted (validate: all required fields set)
Submitted → Under Review (auto: on submit)
Under Review → Approved (validate: approved_by set, user has Finance Manager role)
Approved → Active (auto: on fiscal year start or manual activation)
Active → Revision Requested (validate: revision justification provided)
Revision Requested → Draft (resets to draft for editing)
Active → Closed (validate: fiscal year ended or manual close, all commitments resolved)
Any → Rejected (validate: rejection reason provided)
```

**Integration Triggers:**
- On status change to "Approved": Create outbox event `BUDGET_APPROVED` for CMS sync
- On status change to "Active": Sync to ERPNext Budget if `linked_erpnext_budget` set
- On any amount change: Recalculate all linked Fiscal Allocation remaining amounts
- On close: Update all linked Fiscal Allocations to "Closed"

#### 1.2.2 Municipal Invoice Business Logic

**File:** `apps/cityos/cityos/finance/doctype/municipal_invoice/municipal_invoice.py`

**Validation Rules:**
- `due_date` must be after posting date
- `billing_period_end` must be after `billing_period_start`
- `grand_total` must be positive (or negative only for Credit Notes)
- If `linked_budget_program` is set, validate budget has `available_amount` >= `grand_total`
- `department` and `cost_center` required when `linked_budget_program` is set
- Cannot submit without at least one line item

**Computed Fields:**
- `outstanding_amount` = `grand_total` - `paid_amount`
- `overdue_days` = MAX(0, today - `due_date`) when `payment_status` not in (Paid, Written Off)
- `late_fee_amount` = `outstanding_amount` × `late_fee_rate` × (`overdue_days` / 365) (simple interest)
- `payment_status` auto-calculated:
  - Unpaid: paid_amount = 0
  - Partially Paid: 0 < paid_amount < grand_total
  - Paid: paid_amount >= grand_total
  - Overdue: outstanding_amount > 0 AND today > due_date

**Status Transitions:**
```
Draft → Submitted (validate: all required fields, budget check)
Submitted → Verified (validate: verification officer role)
Verified → Approved (validate: finance manager role)
Approved → Payment Scheduled (auto or manual)
Payment Scheduled → Paid (auto: when paid_amount >= grand_total)
Paid → Reconciled (validate: linked to GL entry or payment entry)
Any → Disputed (validate: dispute reason provided)
Disputed → Under Investigation → Resolved
Submitted → Rejected (validate: rejection reason)
Any → Cancelled (validate: no payments received, or full reversal)
```

**Integration Triggers:**
- On submit: Create ERPNext Sales Invoice if `linked_sales_invoice` not set
- On payment received: Update `paid_amount`, recalculate `payment_status`
- On status change: Create outbox event for Medusa Commerce (if e-commerce origin)
- On budget deduction: Update linked Budget Program `actual_amount`

#### 1.2.3 Funding Source Business Logic

**File:** `apps/cityos/cityos/finance/doctype/funding_source/funding_source.py`

**Validation Rules:**
- `total_amount` must be positive
- `expiry_date` must be after `effective_date`
- Cannot allocate more than `available_amount`
- Cannot modify if status is "Exhausted" or "Expired"
- `donor_organization` required when `source_type` is "Grant" or "Donation"

**Computed Fields:**
- `allocated_amount` = SUM of all Budget Funding Source child table entries referencing this source
- `utilized_amount` = SUM of actual_amount from all linked Budget Programs
- `available_amount` = `total_amount` - `allocated_amount`
- `utilization_percentage` = `utilized_amount` / `total_amount` × 100
- `status` auto-calculated:
  - Active: available_amount > 0 AND expiry_date >= today
  - Exhausted: available_amount <= 0
  - Expired: expiry_date < today
  - Frozen: manually set

#### 1.2.4 Fiscal Allocation Business Logic

**File:** `apps/cityos/cityos/finance/doctype/fiscal_allocation/fiscal_allocation.py`

**Validation Rules:**
- `budget_program` and `funding_source` are required
- `allocated_amount` must not exceed linked Funding Source `available_amount`
- `allocated_amount` must not exceed linked Budget Program `approved_amount` - (sum of other allocations)
- `period_end` must be after `period_start`
- Period must fall within linked Budget Program's fiscal year

**Computed Fields:**
- `committed_amount` = portion of Budget Program commitments attributable to this period
- `spent_amount` = SUM of Municipal Invoice amounts charged to this allocation in this period
- `remaining_amount` = `allocated_amount` - `committed_amount` - `spent_amount`
- `status` auto-calculated:
  - Draft: not yet active
  - Active: period_start <= today <= period_end AND remaining > 0
  - Fully Utilized: remaining <= 0
  - Closed: period_end < today

---

### Task 1.3: Implement Procurement Module Business Logic

**Objective:** Add validation, lifecycle management, and ERPNext integration to procurement doctypes.

#### 1.3.1 CityOS Procurement Request Business Logic

**File:** `apps/cityos/cityos/procurement/doctype/cityos_procurement_request/cityos_procurement_request.py`

**Validation Rules:**
- `required_by_date` must be in the future (or today)
- `estimated_amount` must equal SUM of item line `estimated_amount` values
- `budget_program` required for requests > 0 amount
- Budget availability check: linked Budget Program `available_amount` >= `estimated_amount`
- All mandatory documents in checklist must be attached before submission
- `procurement_method` required based on amount thresholds:
  - < 10,000: Direct Purchase allowed
  - 10,000-100,000: Limited Tender or above
  - > 100,000: Open Tender or Framework Agreement
  - Emergency: Emergency method with justification

**Auto-Assignment of Approval Level:**
- < 50,000: Department Head
- 50,000-500,000: Director
- > 500,000: Committee

**Computed Fields:**
- `estimated_amount` = SUM of items' estimated_amount
- `actual_amount` = linked Purchase Order `grand_total` (if PO exists)
- `approval_level` = based on `estimated_amount` thresholds above

**Status Transitions:**
```
Draft → Submitted (validate: all items, budget check, documents)
Submitted → Budget Verified (auto: budget availability confirmed)
Budget Verified → Under Review (assigned to approval_level role)
Under Review → Approved (validate: approver has correct role for amount)
Under Review → Returned for Revision (validate: revision notes)
Returned for Revision → Draft (back to requester)
Approved → RFQ Issued (validate: linked_rfq created in ERPNext)
RFQ Issued → Vendor Selected (validate: selected_vendor set)
Vendor Selected → PO Created (auto: linked_purchase_order created)
PO Created → Received (validate: PO receipt confirmed)
Received → Closed (validate: all items received, final invoice processed)
Any → Rejected (validate: rejection reason)
Any → Cancelled (validate: no PO or PO cancelled)
```

**Integration Triggers:**
- On approval: Create ERPNext Request for Quotation if procurement_method requires it
- On vendor selection: Create ERPNext Purchase Order
- On PO creation: Update Budget Program `committed_amount`
- On close: Update Budget Program `actual_amount`
- On any status change: Create outbox event for CMS sync and Temporal workflow update

#### 1.3.2 Vendor Compliance Profile Business Logic

**File:** `apps/cityos/cityos/procurement/doctype/vendor_compliance_profile/vendor_compliance_profile.py`

**Validation Rules:**
- `linked_supplier` should be unique (one profile per supplier)
- Cannot create procurement request for debarred vendor
- Certificate expiry dates must be in expected range
- At least basic certificates required for active status

**Computed Fields:**
- `compliance_score` = weighted average:
  - Certificates valid: 30% (% of certificates not expired)
  - Performance rating: 25% (normalized to 0-100)
  - Delivery rating: 20% (normalized to 0-100)
  - Quality rating: 15% (normalized to 0-100)
  - Contract history: 10% (positive contracts / total)
- `risk_level` = based on compliance_score:
  - >= 80: Low
  - 60-79: Medium
  - 40-59: High
  - < 40: Critical
- `total_contracts`, `total_contract_value`, `active_contracts` = aggregated from Contract Register
- Certificate `status` auto-updates:
  - Valid: expiry > today + 30 days
  - Expiring Soon: today < expiry <= today + 30 days
  - Expired: expiry < today

**Integration Triggers:**
- On compliance_score change: Sync to Payload CMS
- On debarment: Notify all active contracts, block new procurement
- On certificate expiry: Create notification, update score

#### 1.3.3 Contract Register Business Logic

**File:** `apps/cityos/cityos/procurement/doctype/contract_register/contract_register.py`

**Validation Rules:**
- `end_date` must be after `start_date`
- `contract_value` must be positive
- `linked_vendor` required for non-draft contracts
- Performance bond expiry should be after contract end_date
- Payment schedule total must not exceed `total_value`
- Milestone payment total must not exceed `total_value`

**Computed Fields:**
- `total_value` = `contract_value` + `amended_value`
- `paid_amount` = SUM of linked Municipal Invoices where payment_status = Paid
- `remaining_value` = `total_value` - `paid_amount`
- `retention_amount` = `paid_amount` × `retention_percentage`
- `sla_compliance_percentage` = (milestones completed on time / total milestones) × 100

**Status Transitions:**
```
Draft → Under Review (validate: all required fields)
Under Review → Active (validate: all parties signed, start_date reached)
Active → Under Amendment (validate: amendment details provided)
Under Amendment → Active (validate: amendment approved)
Active → Suspended (validate: suspension reason)
Suspended → Active (validate: suspension lifted)
Active → Expired (auto: end_date passed without renewal)
Expired → Renewed (validate: new end_date set, renewal approved)
Any → Terminated (validate: termination reason, penalty calculation)
```

---

### Task 1.4: Implement Assets Module Business Logic

**Objective:** Add lifecycle management, depreciation, and maintenance tracking.

#### 1.4.1 Municipal Asset Business Logic

**File:** `apps/cityos/cityos/assets_management/doctype/municipal_asset/municipal_asset.py`

**Validation Rules:**
- `acquisition_cost` must be positive
- `useful_life_years` must be positive when depreciation_method != None
- `salvage_value` must be less than `acquisition_cost`
- `custodian` required when status is "In Service"
- `disposal_date` and `disposal_method` required when status is "Disposed"
- Cannot dispose if linked to active Maintenance Plans

**Computed Fields:**
- `accumulated_depreciation` (Straight Line):
  - annual_depreciation = (acquisition_cost - salvage_value) / useful_life_years
  - accumulated = annual_depreciation × years_since_acquisition
  - Capped at (acquisition_cost - salvage_value)
- `accumulated_depreciation` (Declining Balance):
  - rate = 2 / useful_life_years (double declining)
  - Calculated year by year
- `current_value` = `acquisition_cost` - `accumulated_depreciation`
- `next_inspection_date` = auto-calculated based on inspection frequency settings

**Integration Triggers:**
- On create: Create ERPNext Asset if value exceeds capitalization threshold
- On status change: Sync to Payload CMS
- On disposal: Create outbox event, update ERPNext Asset status
- On custodian change: Log in audit trail

#### 1.4.2 Municipal Facility Business Logic

**File:** `apps/cityos/cityos/assets_management/doctype/municipal_facility/municipal_facility.py`

**Validation Rules:**
- `usable_area_sqm` must not exceed `total_area_sqm`
- `current_occupancy` must not exceed `capacity`
- `facility_manager` required for Active facilities
- Year_built must be reasonable (> 1800, <= current year)

**Computed Fields:**
- `asset_count` = COUNT of Municipal Assets linked to this facility
- `total_asset_value` = SUM of Municipal Asset `current_value` for this facility
- `occupancy_rate` = `current_occupancy` / `capacity` × 100
- `maintenance_compliance` = (completed maintenance plans / total scheduled) × 100

#### 1.4.3 Maintenance Plan Business Logic

**File:** `apps/cityos/cityos/assets_management/doctype/maintenance_plan/maintenance_plan.py`

**Validation Rules:**
- Either `asset` or `facility` must be set (or both)
- `scheduled_date` required
- `estimated_cost` must be positive
- `assigned_to` or `assigned_contractor` required (at least one)
- If contractor assigned, `contractor_contract` should be validated as active

**Computed Fields:**
- `actual_cost` = SUM of parts_used amounts + labor cost
- `next_scheduled_date` = calculated from `completion_date` + `recurrence_pattern`
- `status` auto-updates:
  - Overdue: scheduled_date < today AND status still "Scheduled"

**On Complete:**
- Calculate `actual_cost` from parts used
- Set `completion_date`
- Calculate `next_scheduled_date` if recurring
- Auto-create next Maintenance Plan if recurrence_pattern is set
- Update asset `last_inspection_date` if applicable

---

### Task 1.5: Implement HR Module Business Logic

**Objective:** Add position management and assignment validation with ERPNext Employee integration.

#### 1.5.1 Position Control Business Logic

**File:** `apps/cityos/cityos/hr_management/doctype/position_control/position_control.py`

**Validation Rules:**
- `position_code` must be unique within tenant
- `max_headcount` must be >= 1
- `min_salary` must be <= `max_salary`
- Cannot freeze if there are active assignments
- Cannot abolish if there are active assignments (must end assignments first)
- `reports_to` cannot create circular hierarchy
- `department` and `designation` required

**Computed Fields:**
- `filled_count` = COUNT of active Staff Assignments for this position
- `vacancy_count` = `max_headcount` - `filled_count`

**Integration Triggers:**
- On status change to "Frozen": Notify HR and all assigned employees
- On abolish: Notify HR for reassignment planning

#### 1.5.2 Staff Assignment Business Logic

**File:** `apps/cityos/cityos/hr_management/doctype/staff_assignment/staff_assignment.py`

**Validation Rules:**
- `position` must exist and not be frozen/abolished
- `employee` must exist and be active in ERPNext
- Position must have vacancy (`vacancy_count` > 0) unless assignment_type is "Acting" or "Interim"
- `effective_from` is required
- `effective_to` is required for non-permanent assignments
- `salary_amount` must be between position's `min_salary` and `max_salary`
- Employee cannot have two active permanent assignments simultaneously
- Cannot approve own assignment

**Auto-Actions:**
- On approval: Update Position Control `filled_count`
- On end: Update Position Control `filled_count`, set `end_reason`
- On create: Auto-fetch `employee_name` from Employee, `position_title` and `department` from Position
- On create with previous_position: Link to previous Staff Assignment

---

### Task 1.6: Implement Projects Module Business Logic

**Objective:** Add project lifecycle management and impact tracking.

#### 1.6.1 Capital Project Business Logic

**File:** `apps/cityos/cityos/cityos_projects/doctype/capital_project/capital_project.py`

**Validation Rules:**
- `total_budget` must be positive
- `expected_end_date` must be after `start_date`
- `completion_percentage` must be between 0 and 100
- `project_manager` required for Active projects
- Phase transitions must follow sequence: Planning → Design → Procurement → Construction → Commissioning → Operational
- Cannot close if there are open contracts or unresolved invoices

**Computed Fields:**
- `spent_amount` = SUM of linked Municipal Invoices (paid)
- `committed_amount` = SUM of linked Contract Register `remaining_value`
- `remaining_budget` = `total_budget` - `spent_amount` - `committed_amount`
- `budget_utilization` = (`spent_amount` + `committed_amount`) / `total_budget` × 100
- `completion_percentage` = weighted average of milestone completion percentages
- `risk_level` auto-calculated:
  - Budget utilization > 90% with completion < 70%: Critical
  - Behind schedule by > 20%: High
  - Minor deviations: Medium
  - On track: Low

**Integration Triggers:**
- On create: Create ERPNext Project if `linked_erpnext_project` not set
- On phase change: Create outbox event for CMS sync
- On close: Generate final Community Impact Report prompt
- On budget change: Update linked Budget Program

#### 1.6.2 Community Impact Report Business Logic

**File:** `apps/cityos/cityos/cityos_projects/doctype/community_impact_report/community_impact_report.py`

**Validation Rules:**
- `linked_project` required
- All three impact scores must be between 0 and 10
- `assessor` required
- `report_date` required
- Cannot publish without all scores filled

**Computed Fields:**
- `overall_impact_score` = (`social_impact_score` + `economic_impact_score` + `environmental_impact_score`) / 3

---

### Task 1.7: Harden Multi-Tenant Data Isolation

**Objective:** Ensure all CityOS doctypes enforce tenant-based data isolation consistently.

#### 1.7.1 Add Permission Query Conditions for All Custom Doctypes

**File:** `apps/cityos/cityos/hooks.py`

Add the following doctypes to `permission_query_conditions`:

```python
permission_query_conditions = {
    # ... existing 21 ERPNext doctypes ...
    # CityOS Finance
    "Budget Program": "cityos.governance.node_context.get_permission_query_conditions",
    "Funding Source": "cityos.governance.node_context.get_permission_query_conditions",
    "Municipal Invoice": "cityos.governance.node_context.get_permission_query_conditions",
    "Fiscal Allocation": "cityos.governance.node_context.get_permission_query_conditions",
    # CityOS Procurement
    "CityOS Procurement Request": "cityos.governance.node_context.get_permission_query_conditions",
    "Vendor Compliance Profile": "cityos.governance.node_context.get_permission_query_conditions",
    "Contract Register": "cityos.governance.node_context.get_permission_query_conditions",
    # CityOS Assets
    "Municipal Asset": "cityos.governance.node_context.get_permission_query_conditions",
    "Municipal Facility": "cityos.governance.node_context.get_permission_query_conditions",
    "Maintenance Plan": "cityos.governance.node_context.get_permission_query_conditions",
    # CityOS HR
    "Position Control": "cityos.governance.node_context.get_permission_query_conditions",
    "Staff Assignment": "cityos.governance.node_context.get_permission_query_conditions",
    # CityOS Projects
    "Capital Project": "cityos.governance.node_context.get_permission_query_conditions",
    "Community Impact Report": "cityos.governance.node_context.get_permission_query_conditions",
}
```

#### 1.7.2 Enhance Permission Query to Support Hierarchy

**File:** `apps/cityos/cityos/governance/node_context.py`

Update `get_permission_query_conditions` to support hierarchical tenant access:

**Current:** Filters by exact tenant match only.

**Target:** If user's tenant is REGIONAL tier, also show COUNTRY and CITY tenants below them.

**Implementation:**
1. Get user's assigned tenant and its tier
2. If MASTER tier: return "" (full access)
3. If GLOBAL/REGIONAL/COUNTRY: query all child tenants recursively
4. Build IN clause with user's tenant + all child tenants
5. Cache the tenant tree for performance (invalidate on Node Context changes)

#### 1.7.3 Fix Default Tenant Fallback

**Current Issue:** If `cityos_default_tenant` is not set, the filter returns empty string (no filtering at all).

**Fix:** When no default tenant is set and user is not Administrator/System Manager, return a condition that matches nothing (`1=0`) to deny access rather than granting full access.

#### 1.7.4 Add Tenant Validation to API Endpoints

Update all whitelisted API endpoints to validate that the requesting user has access to the tenant referenced in the request:

**Files to update:**
- `apps/cityos/cityos/integrations/temporal_sync.py` — `trigger_workflow()`, `get_workflow_status()`
- `apps/cityos/cityos/integrations/webhooks.py` — All webhook handlers

**Implementation:** Create a `validate_tenant_access(tenant_id)` utility function that checks user's tenant hierarchy access.

---

### Task 1.8: Configure RBAC for Custom Doctypes

**Objective:** Define role-based permissions for all 26 custom CityOS doctypes.

#### 1.8.1 Permission Matrix

| Doctype | CityOS Admin | Finance Manager | Procurement Officer | Asset Manager | HR Manager | Project Manager | Read All |
|---------|-------------|-----------------|--------------------|--------------|-----------:|----------------|----------|
| Node Context | RWCD | R | R | R | R | R | R |
| CityOS Scope | RWCD | R | R | R | R | R | R |
| CityOS Category | RWCD | R | R | R | R | R | R |
| CityOS Subcategory | RWCD | R | R | R | R | R | R |
| CityOS Store | RWCD | R | R | R | R | R | R |
| CityOS Portal | RWCD | R | R | R | R | R | R |
| Governance Authority | RWCD | R | R | R | R | R | R |
| Policy Doctrine | RWCD | R | R | R | R | R | R |
| CityOS Persona | RWCD | R | R | R | R | R | R |
| CityOS Persona Assignment | RWCD | R | R | R | R | R | R |
| CityOS Audit Log | R | R | R | R | R | R | R |
| Integration Outbox Event | R | R | R | R | R | R | - |
| Budget Program | RW | RWSCA | R | R | R | R | R |
| Funding Source | RW | RWCD | R | R | R | R | R |
| Municipal Invoice | RW | RWSCA | R | R | R | R | R |
| Fiscal Allocation | RW | RWCD | R | R | R | R | R |
| CityOS Procurement Request | RW | R | RWSCA | R | R | R | R |
| Vendor Compliance Profile | RW | R | RWCD | R | R | R | R |
| Contract Register | RW | R | RWCD | R | R | R | R |
| Municipal Asset | RW | R | R | RWCD | R | R | R |
| Municipal Facility | RW | R | R | RWCD | R | R | R |
| Maintenance Plan | RW | R | R | RWSCA | R | R | R |
| Position Control | RW | R | R | R | RWCD | R | R |
| Staff Assignment | RW | R | R | R | RWSCA | R | R |
| Capital Project | RW | R | R | R | R | RWCD | R |
| Community Impact Report | RW | R | R | R | R | RWCD | R |

**Legend:** R=Read, W=Write, S=Submit, C=Create, A=Amend, D=Delete

#### 1.8.2 Implementation

**File:** Each doctype's JSON schema file — add `permissions` array.

**Additional setup in** `apps/cityos/cityos/setup/install.py`:
- Create all CityOS roles if they don't exist
- Apply DocPerm entries for each role × doctype combination
- Set up role profiles for common combinations

---

## 4. Phase 2: Integration — ERPNext Bridge & CMS Completeness

### Task 2.1: Connect Budget Program to ERPNext Budget Module

**Objective:** When a Budget Program is approved/activated, create or update a corresponding ERPNext Budget for actual vs. budgeted tracking.

**Implementation:**

1. **On Budget Program approval** → Create ERPNext Budget:
   - Map `fiscal_year` → Budget fiscal year
   - Map `approved_amount` → Budget amount
   - Map `cost_center` → Budget against Cost Center
   - Map CityOS tenant → Accounting Dimension filter

2. **Daily reconciliation** (scheduled task):
   - Pull actual GL entries from ERPNext Budget
   - Update Budget Program `actual_amount`
   - Recalculate utilization

3. **Budget availability API** (`check_budget_availability`):
   - Before procurement approval, check ERPNext Budget availability
   - Return available amount, committed amount, and warning thresholds

**Files:**
- `apps/cityos/cityos/finance/doctype/budget_program/budget_program.py` — on_approve method
- `apps/cityos/cityos/finance/budget_bridge.py` — new file for ERPNext Budget sync logic
- `apps/cityos/cityos/hooks.py` — add scheduled task for daily reconciliation

---

### Task 2.2: Connect Procurement Request to ERPNext Buying Module

**Objective:** Procurement Request approval creates ERPNext Purchase flow documents.

**Implementation:**

1. **On Procurement Request approval → RFQ**:
   - Create ERPNext Request for Quotation from procurement items
   - Link suppliers from shortlist
   - Set deadline from required_by_date
   - Set `linked_rfq` on procurement request

2. **On Vendor Selection → Purchase Order**:
   - Create ERPNext Purchase Order from winning quotation
   - Copy items, rates, terms
   - Set `linked_purchase_order` on procurement request
   - Link to Budget Program cost center

3. **On PO Receipt → Budget Update**:
   - Update Budget Program `actual_amount`
   - Update Fiscal Allocation `spent_amount`
   - Update Procurement Request `actual_amount`

**Files:**
- `apps/cityos/cityos/procurement/doctype/cityos_procurement_request/cityos_procurement_request.py` — on_approve, on_vendor_select methods
- `apps/cityos/cityos/procurement/procurement_bridge.py` — new file for ERPNext Buying integration
- `apps/cityos/cityos/hooks.py` — add doc_event hooks for Purchase Order and Purchase Receipt

---

### Task 2.3: Connect Municipal Asset to ERPNext Asset Module

**Objective:** Municipal Assets above capitalization threshold create ERPNext Assets for financial tracking.

**Implementation:**

1. **On Municipal Asset creation (if acquisition_cost > threshold)**:
   - Create ERPNext Asset with matching depreciation method
   - Map location → Asset Location
   - Map custodian → Custodian (Employee)
   - Set `linked_erpnext_asset`

2. **Depreciation sync** (daily scheduled task):
   - Pull accumulated depreciation from ERPNext Asset
   - Update Municipal Asset `accumulated_depreciation` and `current_value`

3. **On disposal**:
   - Create ERPNext Asset Movement (disposal)
   - Record disposal amount as revenue (if applicable)

**Files:**
- `apps/cityos/cityos/assets_management/doctype/municipal_asset/municipal_asset.py` — after_insert, on_dispose methods
- `apps/cityos/cityos/assets_management/asset_bridge.py` — new file for ERPNext Asset sync
- `apps/cityos/cityos/hooks.py` — add doc_event for Asset depreciation

---

### Task 2.4: Connect Staff Assignment to ERPNext HR Module

**Objective:** Staff Assignments link to ERPNext Employee records and reflect in HR reports.

**Implementation:**

1. **On Staff Assignment approval**:
   - Update Employee's `department` and `designation` from Position Control
   - Set Employee's `reports_to` based on Position hierarchy
   - Create ERPNext Employee Promotion/Transfer if position change

2. **On assignment end**:
   - Update Employee's department/designation if they have a new assignment
   - If no new assignment, flag for HR attention

3. **Position-Employee dashboard**:
   - Show on Position Control: all current and past assignees
   - Show on Employee: all positions held

**Files:**
- `apps/cityos/cityos/hr_management/doctype/staff_assignment/staff_assignment.py` — on_approve, on_end methods
- `apps/cityos/cityos/hr_management/hr_bridge.py` — new file for ERPNext HR integration

---

### Task 2.5: Connect Capital Project to ERPNext Projects Module

**Objective:** Capital Projects create ERPNext Projects for task management and costing.

**Implementation:**

1. **On Capital Project activation**:
   - Create ERPNext Project
   - Map milestones → Project tasks
   - Set project type, company, cost center
   - Set `linked_erpnext_project`

2. **Progress sync** (daily or on-demand):
   - Pull task completion from ERPNext Project
   - Update Capital Project `completion_percentage`
   - Pull costs from ERPNext Project costing
   - Update Capital Project `spent_amount`

3. **Phase transitions**:
   - Update ERPNext Project status on phase change
   - Auto-create tasks for new phase milestones

**Files:**
- `apps/cityos/cityos/cityos_projects/doctype/capital_project/capital_project.py` — on_activate, on_phase_change methods
- `apps/cityos/cityos/cityos_projects/project_bridge.py` — new file for ERPNext Project sync

---

### Task 2.6: Complete CMS (Payload CMS) Bidirectional Sync

**Objective:** Extend sync to cover all operational entities, add conflict detection, and sync status tracking.

#### 2.6.1 Add Outbound Sync for Missing Entities

**File:** `apps/cityos/cityos/integrations/payload_sync.py` — add new sync functions:

| Function | Trigger | CMS Endpoint |
|----------|---------|-------------|
| `sync_budget_program_to_payload(doc)` | on_update of Budget Program | `/api/budget-programs` |
| `sync_procurement_request_to_payload(doc)` | on_update of Procurement Request | `/api/procurement-requests` |
| `sync_contract_to_payload(doc)` | on_update of Contract Register | `/api/contracts` |
| `sync_capital_project_to_payload(doc)` | on_update of Capital Project | `/api/capital-projects` |
| `sync_municipal_invoice_to_payload(doc)` | on_update of Municipal Invoice | `/api/invoices` |
| `sync_facility_to_payload(doc)` | on_update of Municipal Facility | `/api/facilities` |
| `sync_maintenance_plan_to_payload(doc)` | on_update of Maintenance Plan | `/api/maintenance-plans` |
| `sync_position_to_payload(doc)` | on_update of Position Control | `/api/positions` |
| `sync_staff_assignment_to_payload(doc)` | on_update of Staff Assignment | `/api/staff-assignments` |
| `sync_impact_report_to_payload(doc)` | on_update of Community Impact Report | `/api/impact-reports` |

**File:** `apps/cityos/cityos/hooks.py` — add doc_events for each doctype.

#### 2.6.2 Add Conflict Detection

**New File:** `apps/cityos/cityos/integrations/sync_manager.py`

**Implementation:**
1. Add `cms_last_modified` and `erp_last_modified` fields to synced doctypes
2. Before outbound sync: check if CMS version is newer than last known sync
3. If conflict detected: create a "Sync Conflict" audit log entry, skip update, notify admin
4. Provide API to resolve conflicts manually (accept ERPNext version, accept CMS version, or merge)

#### 2.6.3 Add Sync Status Tracking

**New Doctype:** `CityOS Sync Status`

| Field | Type | Description |
|-------|------|-------------|
| `entity_type` | Data | Doctype name |
| `entity_name` | Data | Document name |
| `target_system` | Select | Payload CMS / Medusa Commerce |
| `last_sync_time` | Datetime | When last synced |
| `sync_status` | Select | In Sync / Pending / Failed / Conflict |
| `error_message` | Text | Error details if failed |
| `retry_count` | Int | Number of retries |

#### 2.6.4 Add Delta/Incremental Sync

**Update:** `apps/cityos/cityos/integrations/cms_client.py`

- Track last sync timestamp per entity type
- Use CMS API's `updatedAt[gte]` filter to only fetch changed records
- Implement cursor-based pagination for large datasets

---

### Task 2.7: Implement Workflow State Machines

**Objective:** Define and enforce valid state transitions with role-based guards for the 4 operational workflow types.

#### 2.7.1 State Machine Engine

**New File:** `apps/cityos/cityos/governance/workflow_engine.py`

**Implementation:**

```
WorkflowStateMachine:
  - transitions: dict of {(from_state, to_state): TransitionRule}
  - TransitionRule:
      - required_role: str (frappe role)
      - validators: list of callable
      - on_transition: list of callable (side effects)
      - sla_hours: int (optional, max time in from_state)
  
  - validate_transition(doc, from_state, to_state, user):
      - Check transition exists
      - Check user has required_role
      - Run all validators
      - Return True or raise with specific error
  
  - execute_transition(doc, to_state, user):
      - validate_transition()
      - Set doc.cityos_workflow_state = to_state
      - Run on_transition callbacks
      - Create audit log entry
      - Create outbox event for Temporal notification
```

#### 2.7.2 Define State Machines for Each Workflow Type

**Procurement Approval:**
```
transitions:
  Draft → Submitted: {role: "Procurement Officer", validate: [all_items_present, budget_check]}
  Submitted → Budget Verified: {role: "Finance Manager", validate: [budget_available]}
  Budget Verified → Under Review: {role: "Finance Manager"}
  Under Review → Approved: {role: based on approval_level, validate: [amount_threshold_check]}
  Under Review → Returned: {role: based on approval_level, validate: [return_notes_provided]}
  Returned → Draft: {role: "Procurement Officer"}
  Approved → RFQ Issued: {role: "Procurement Officer", on_transition: [create_erpnext_rfq]}
  RFQ Issued → Vendor Selected: {role: "Procurement Officer", validate: [vendor_selected]}
  Vendor Selected → PO Created: {role: "Procurement Officer", on_transition: [create_erpnext_po]}
  PO Created → Received: {role: "Procurement Officer", validate: [receipt_confirmed]}
  Received → Closed: {role: "Procurement Officer", validate: [final_invoice_processed]}
  * → Rejected: {role: based on approval_level, validate: [rejection_reason]}
  * → Cancelled: {role: "CityOS Administrator", validate: [no_active_po]}
```

**Budget Approval:**
```
transitions:
  Draft → Submitted: {role: "Finance Manager", validate: [all_fields_complete]}
  Submitted → Under Review: {role: "Finance Manager"}
  Under Review → Approved: {role: "CityOS Administrator", validate: [authorized_approver]}
  Approved → Active: {role: "Finance Manager", validate: [fiscal_year_active]}
  Active → Revision Requested: {role: "Finance Manager", validate: [revision_justification]}
  Revision Requested → Draft: {role: "Finance Manager"}
  Active → Closed: {role: "Finance Manager", validate: [all_commitments_resolved]}
  * → Rejected: {role: "CityOS Administrator", validate: [rejection_reason]}
```

**Invoice Settlement:**
```
transitions:
  Draft → Submitted: {role: "Finance Manager", validate: [all_fields_complete]}
  Submitted → Verified: {role: "Finance Manager", validate: [verification_check]}
  Verified → Approved: {role: "Finance Manager", validate: [budget_check]}
  Approved → Payment Scheduled: {role: "Finance Manager"}
  Payment Scheduled → Paid: {auto: when paid_amount >= grand_total}
  Paid → Reconciled: {role: "Finance Manager", validate: [gl_entry_exists]}
  * → Disputed: {role: any, validate: [dispute_reason]}
  Disputed → Under Investigation: {role: "Finance Manager"}
  Under Investigation → Resolved: {role: "Finance Manager"}
  Submitted → Rejected: {role: "Finance Manager", validate: [rejection_reason]}
```

**Vendor Onboarding:**
```
transitions:
  Application Received → Document Verification: {role: "Procurement Officer"}
  Document Verification → Compliance Check: {role: "Procurement Officer", validate: [docs_complete]}
  Compliance Check → Background Check: {role: "Procurement Officer"}
  Background Check → Approved: {role: "Procurement Officer", validate: [all_checks_clear]}
  Background Check → Conditional: {role: "Procurement Officer", validate: [conditions_specified]}
  Conditional → Active: {role: "Procurement Officer", validate: [conditions_met]}
  * → Rejected: {role: "Procurement Officer", validate: [rejection_reason]}
  Active → Under Review: {role: "Procurement Officer", validate: [review_period_reached]}
  Under Review → Active: {role: "Procurement Officer"}
  Under Review → Suspended: {role: "Procurement Officer", validate: [suspension_reason]}
  Under Review → Debarred: {role: "CityOS Administrator", validate: [debarment_reason]}
```

---

## 5. Phase 3: Operational Visibility — Dashboards & Reporting

### Task 3.1: Build Financial Dashboard

**New File:** `apps/cityos/cityos/finance/dashboard.py`

**Number Cards:**
- Total Budget (all active Budget Programs)
- Total Utilized (committed + actual)
- Budget Utilization % (overall)
- Outstanding Invoices (count and amount)
- Overdue Invoices (count and amount)
- Revenue This Month

**Charts:**
- Budget vs. Actual by Program (bar chart)
- Revenue by Funding Source (pie chart)
- Invoice Aging (stacked bar: current, 30d, 60d, 90d+)
- Monthly Expenditure Trend (line chart, 12 months)
- Budget Utilization by Department (horizontal bar)

**Workspace:** Update CityOS Finance workspace with dashboard cards and charts.

---

### Task 3.2: Build Procurement Pipeline Dashboard

**New File:** `apps/cityos/cityos/procurement/dashboard.py`

**Number Cards:**
- Active Procurement Requests (count)
- Total Procurement Value (pipeline)
- Pending Approvals (count)
- Average Approval Time (days)
- Active Contracts (count and value)
- Expiring Contracts (next 90 days)

**Charts:**
- Procurement Requests by Status (funnel chart)
- Spending by Category (pie chart)
- Vendor Distribution (top 10 by contract value)
- Monthly Procurement Volume (line chart)
- Contract Expiry Timeline (Gantt-style)

---

### Task 3.3: Build Asset Management Dashboard

**New File:** `apps/cityos/cityos/assets_management/dashboard.py`

**Number Cards:**
- Total Assets (count and value)
- Assets by Condition (Excellent/Good/Fair/Poor/Critical)
- Maintenance Compliance % (on-time completions)
- Overdue Maintenance (count)
- Facilities (count)
- Average Facility Occupancy %

**Charts:**
- Asset Distribution by Class (pie chart)
- Asset Value by Facility (bar chart)
- Maintenance Completion Rate (line chart, monthly)
- Depreciation Schedule (line chart, projected)
- Asset Condition Distribution (donut chart)

---

### Task 3.4: Build Integration Health Dashboard

**New File:** `apps/cityos/cityos/integrations/dashboard.py`

**Number Cards:**
- Outbox Queue Depth (pending events)
- Failed Events (last 24h)
- Dead Letter Events (total)
- Sync Success Rate % (last 24h)
- Workflow Registry Status (connected/disconnected)
- Active Workflows (in progress)

**Charts:**
- Events by Target System (stacked bar, hourly)
- Success/Failure Rate Trend (line chart, 7 days)
- Average Event Processing Time (line chart)
- Event Volume by Type (pie chart)
- Dead Letter Trend (line chart, 30 days)

---

### Task 3.5: Build Custom Reports

**New Directory:** `apps/cityos/cityos/finance/report/`

| Report | Type | Key Filters |
|--------|------|-------------|
| Budget Utilization Report | Script Report | Fiscal Year, Budget Type, Department, Tenant |
| Procurement Status Report | Script Report | Date Range, Status, Department, Amount Range |
| Asset Register | Script Report | Asset Class, Facility, Condition, Status |
| Maintenance Compliance Report | Script Report | Date Range, Asset/Facility, Priority |
| Vendor Performance Report | Script Report | Vendor, Date Range, Category |
| Contract Expiry Report | Script Report | Expiry Period (30/60/90d), Status, Vendor |
| Tenant Activity Report | Script Report | Tenant, Date Range, Activity Type |
| Integration Sync Report | Script Report | Target System, Date Range, Status |
| Governance Hierarchy Report | Query Report | Tier, Status |
| Compliance Findings Report | Script Report | Severity, Category, Date Range, Resolution Status |

---

## 6. Phase 4: Maturity — Advanced Workflows, New Entities & Migration Tools

### Task 4.1: Add New Operational Doctypes

#### 4.1.1 Service Request

**Module:** Governance
**Purpose:** Citizen/department service request management

**Key Fields:** request_type, description, priority, requested_by, assigned_to, sla_definition, status, resolution, resolution_date, satisfaction_rating

**Status Flow:** Received → Acknowledged → Assigned → In Progress → Resolved → Closed → Reopened

#### 4.1.2 Permit/License

**Module:** Governance
**Purpose:** Business permits, construction permits, operational licenses

**Key Fields:** permit_type, applicant, application_date, review_status, conditions, issue_date, expiry_date, renewal_status, linked_inspection, fees_paid

**Status Flow:** Applied → Under Review → Inspection Required → Approved/Rejected → Issued → Active → Expiring → Expired/Renewed

#### 4.1.3 Inspection Record

**Module:** Assets Management
**Purpose:** Facility/asset inspection tracking

**Key Fields:** inspection_type, inspector, inspection_date, asset/facility, findings (child table), overall_rating, corrective_actions (child table), follow_up_date

**Status Flow:** Scheduled → In Progress → Completed → Actions Required → Actions Verified → Closed

#### 4.1.4 SLA Definition

**Module:** Governance
**Purpose:** Service level agreement templates

**Key Fields:** service_type, priority_levels (child table with response_time and resolution_time per priority), escalation_rules (child table), applicable_departments, measurement_period

#### 4.1.5 Compliance Case

**Module:** Compliance
**Purpose:** Formal compliance investigation tracking

**Key Fields:** finding_reference (Audit Log), case_type, severity, investigator, investigation_start, investigation_end, findings_detail, corrective_action, preventive_action, status

**Status Flow:** Opened → Under Investigation → Findings Documented → Corrective Action Assigned → Action Completed → Verified → Closed

---

### Task 4.2: Implement Advanced Workflow Features

#### 4.2.1 Parallel Approval

- Support for requiring multiple approvals (e.g., Finance AND Legal)
- Track each approver's decision independently
- Only advance when all required approvals are received

**New Child Table:** Workflow Approval Record (approver, role, decision, decision_date, comments)

#### 4.2.2 Delegation

- Allow users to delegate approval authority during absence
- Delegation record: delegator, delegate, date_from, date_to, workflow_types, max_amount

**New Doctype:** Approval Delegation

#### 4.2.3 SLA Tracking and Escalation

- Track time spent in each workflow state
- Warn when approaching SLA deadline (notification)
- Auto-escalate to supervisor when SLA breached
- Dashboard showing SLA compliance metrics

#### 4.2.4 Conditional Routing

- Amount-based routing (different approvers for different amounts)
- Category-based routing (different paths for goods vs. services)
- Urgency-based routing (expedited path for emergency procurement)

---

### Task 4.3: Build Data Migration Tools

#### 4.3.1 Import Templates

Create CSV/Excel templates with:
- Column headers matching doctype fields
- Data validation rules in Excel
- Sample data rows
- Mapping documentation

**Templates needed for:** Municipal Assets, Facilities, Positions, Employees, Vendors, Budget Programs, Contracts

#### 4.3.2 Tenant Provisioning Script

**New File:** `apps/cityos/cityos/setup/provision_tenant.py`

Automated script that:
1. Creates Node Context (tenant) with specified tier
2. Sets up default CityOS Scopes and Categories for the tenant
3. Creates Cost Centers mapped to the hierarchy
4. Sets up Number Series prefixed with tenant code
5. Creates default roles and permissions for tenant admin
6. Syncs to Payload CMS
7. Creates welcome notification

#### 4.3.3 Demo Data Generator

**New File:** `apps/cityos/cityos/setup/demo_data.py`

Generates realistic test data:
- 5-tier tenant hierarchy (1 MASTER, 2 GLOBAL, 4 REGIONAL, 8 COUNTRY, 16 CITY)
- 100+ municipal assets across facilities
- 50+ positions with staff assignments
- 20+ budget programs with allocations
- 30+ procurement requests at various stages
- 10+ contracts with milestones and payments
- 5+ capital projects with impact reports

---

### Task 4.4: Implement Seed Data

**File:** `apps/cityos/cityos/setup/install.py`

#### 4.4.1 Default Governance Hierarchy

```
MASTER: Dakkah CityOS Platform
  └── GLOBAL: Dakkah Global Operations
       ├── REGIONAL: Middle East & North Africa
       │    ├── COUNTRY: Saudi Arabia
       │    │    └── CITY: Riyadh
       │    └── COUNTRY: UAE
       │         └── CITY: Dubai
       └── REGIONAL: Asia Pacific
            └── COUNTRY: Malaysia
                 └── CITY: Kuala Lumpur
```

#### 4.4.2 Default Scopes

- Administration
- Infrastructure
- Social Services
- Public Safety
- Environment & Sustainability
- Economic Development
- Urban Planning

#### 4.4.3 Default Categories (per Scope)

- Infrastructure: Roads, Water & Sewage, Electricity, Buildings, Public Transport, Communications
- Social Services: Education, Healthcare, Housing, Community Centers, Recreation
- Public Safety: Fire Services, Emergency Management, Public Health
- Environment: Waste Management, Parks & Green Spaces, Air Quality, Water Quality
- Economic Development: Business Licensing, Investment Promotion, Market Management

#### 4.4.4 Default Workflow States

For each workflow type, seed the standard states listed in Task 2.7.

---

### Task 4.5: Implement Advanced Security

#### 4.5.1 Field-Level Permissions

Add `permlevel` to sensitive fields:
- Financial amounts: permlevel 1 (Finance Manager + CityOS Admin)
- Compliance scores: permlevel 1 (Procurement Officer + CityOS Admin)
- Personnel data: permlevel 1 (HR Manager + CityOS Admin)
- System fields (workflow state, audit): permlevel 2 (CityOS Admin only)

#### 4.5.2 Data Classification

Add `data_classification` field to all CityOS doctypes:
- Public: Visible to all authenticated users
- Internal: Visible within tenant
- Confidential: Visible to role-specific users within tenant
- Restricted: Visible to named individuals only

#### 4.5.3 Audit Enhancement

Extend CityOS Audit Log to capture:
- API access from external systems (Medusa, Payload, Temporal)
- Permission query executions
- Failed access attempts
- Data export events
- Bulk operations

---

### Task 4.6: API Versioning and Documentation

#### 4.6.1 API Version Prefix

Create versioned API endpoints:
```
/api/v1/cityos/procurement-requests
/api/v1/cityos/budget-programs
/api/v1/cityos/municipal-assets
...
```

**Implementation:** New file `apps/cityos/cityos/api/v1/` directory with versioned endpoint handlers.

#### 4.6.2 OpenAPI Specification

Generate OpenAPI 3.0 spec from doctype schemas and API endpoints.

**File:** `apps/cityos/cityos/api/openapi.json`

Auto-generate from:
- Doctype field definitions → request/response schemas
- Whitelisted methods → endpoint definitions
- Role permissions → security definitions

#### 4.6.3 Rate Limiting

Add rate limiting middleware for API and webhook endpoints:
- Webhook endpoints: 100 requests/minute per source IP
- API endpoints: 60 requests/minute per authenticated user
- Bulk operations: 10 requests/minute

#### 4.6.4 Idempotency

Add idempotency key support for webhook endpoints:
- Accept `X-Idempotency-Key` header
- Store processed keys in Redis with 24h TTL
- Return cached response for duplicate keys

---

## 7. Cross-Cutting Concerns

### 7.1 Accounting Dimensions

**When:** Phase 2 (after fields exist)

Add CityOS Tenant, Scope, and Category as ERPNext Accounting Dimensions:
1. Register dimensions in ERPNext Settings
2. Add dimension fields to GL Entry
3. Enable filtering on all financial reports
4. Map Cost Centers to CityOS hierarchy

### 7.2 Number Series

**When:** Phase 1 (Task 1.8)

Create tenant-scoped naming series:
```
Budget Program: BP-{tenant_code}-{YYYY}-{####}
Municipal Invoice: MI-{tenant_code}-{YYYY}-{####}
Procurement Request: PR-{tenant_code}-{YYYY}-{####}
Contract: CT-{tenant_code}-{YYYY}-{####}
Municipal Asset: MA-{tenant_code}-{####}
Capital Project: CP-{tenant_code}-{YYYY}-{####}
Position: PS-{tenant_code}-{####}
```

### 7.3 Print Formats

**When:** Phase 3

Create CityOS-branded print formats for:
- Municipal Invoice (formal government invoice)
- Procurement Request (with approval chain)
- Contract Register (official contract summary)
- Purchase Order (municipal-branded PO)
- Community Impact Report (public-facing report)

### 7.4 Email Templates

**When:** Phase 2

Create notification templates for:
- Workflow state changes (approval requested, approved, rejected)
- SLA warnings and breaches
- Certificate expiry reminders
- Contract renewal reminders
- Compliance finding notifications

---

## 8. Testing Strategy

### 8.1 Test Categories

| Category | Coverage Target | Approach |
|----------|----------------|----------|
| Unit Tests | 85%+ for business logic | Mock frappe, test validation/calculation |
| Integration Tests | All ERPNext bridges | Mock ERPNext APIs, test data flow |
| Workflow Tests | All state transitions | Test valid and invalid transitions |
| Security Tests | All permission rules | Test access with different roles/tenants |
| API Tests | All endpoints | Test request/response contracts |
| Sync Tests | All CMS/Medusa sync | Mock external APIs, test payload format |

### 8.2 Test File Structure

```
apps/cityos/cityos/tests/
  test_budget_program.py          — Finance business logic
  test_municipal_invoice.py       — Invoice lifecycle
  test_funding_source.py          — Funding calculations
  test_fiscal_allocation.py       — Allocation logic
  test_procurement_request.py     — Procurement lifecycle
  test_vendor_compliance.py       — Compliance scoring
  test_contract_register.py       — Contract lifecycle
  test_municipal_asset.py         — Asset depreciation & lifecycle
  test_municipal_facility.py      — Facility management
  test_maintenance_plan.py        — Maintenance scheduling
  test_position_control.py        — Position management
  test_staff_assignment.py        — Assignment validation
  test_capital_project.py         — Project lifecycle
  test_community_impact.py        — Impact calculations
  test_workflow_engine.py         — State machine engine
  test_workflow_transitions.py    — All workflow state transitions
  test_multi_tenant.py            — Tenant isolation
  test_permissions.py             — RBAC enforcement
  test_erpnext_bridges.py         — ERPNext module integration
  test_cms_sync.py                — Payload CMS sync
  test_medusa_sync.py             — Medusa Commerce sync
  test_temporal_workflows.py      — Temporal workflow tests (existing, 70 tests)
  test_api_endpoints.py           — API contract tests
  test_compliance_checks.py       — Compliance check logic
```

### 8.3 Test Execution

**Run all tests:**
```bash
cd /home/runner/workspace && \
PYTHONPATH=apps/frappe:apps/erpnext:apps/cityos:$PYTHONPATH \
python -m pytest apps/cityos/cityos/tests/ -v --tb=short -c /dev/null
```

**Target: 400+ tests across all categories**

---

## 9. Deployment & Rollback Strategy

### 9.1 Schema Migration Safety

1. All field additions use Frappe's doctype JSON schema (non-destructive)
2. Never drop columns — add new columns alongside deprecated ones
3. Use `bench migrate` for schema updates
4. Test migrations on a copy of production data before deploying

### 9.2 Feature Flags

For large features, use site_config.json flags:
```json
{
  "cityos_enable_workflow_engine": true,
  "cityos_enable_erpnext_bridges": false,
  "cityos_enable_advanced_security": false
}
```

This allows gradual rollout and quick rollback of specific features.

### 9.3 Rollback Plan

Each phase has a documented rollback:
1. **Phase 1:** Schema additions are backward-compatible; revert Python logic only
2. **Phase 2:** ERPNext bridges can be disabled via feature flags; CMS sync can be paused
3. **Phase 3:** Dashboards/reports are additive only; remove from workspace
4. **Phase 4:** New doctypes can be hidden; advanced features disabled via flags

---

## 10. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| ERPNext API changes in upgrade | Medium | High | Pin ERPNext version; test bridges before upgrade |
| CMS schema mismatch | Medium | Medium | Validate incoming payload against expected schema |
| Performance degradation with complex queries | Medium | High | Index tenant fields; cache permission queries; paginate |
| Data corruption during sync conflicts | Low | Critical | Implement conflict detection; never auto-overwrite; audit all changes |
| Multi-tenant data leakage | Low | Critical | Default-deny permission; comprehensive test suite; regular security audit |
| Temporal workflow timeout | Medium | Medium | Set appropriate timeouts; retry logic; dead letter queue monitoring |
| Redis failure affecting caching | Low | High | Graceful degradation; re-query database on cache miss |
| Large dataset performance | Medium | High | Database indexing strategy; query optimization; background processing |

---

## 11. Dependency Map

```
Phase 1:
  Task 1.1 (Fields) ─────────────┐
  Task 1.7 (Multi-tenant) ──────┐│
  Task 1.8 (RBAC) ─────────────┐││
                                │││
  Task 1.2 (Finance Logic) ←───┤│├── depends on Task 1.1 (fields must exist)
  Task 1.3 (Procurement Logic) ←┤│├── depends on Task 1.1
  Task 1.4 (Assets Logic) ←─────┤│├── depends on Task 1.1
  Task 1.5 (HR Logic) ←─────────┤│├── depends on Task 1.1
  Task 1.6 (Projects Logic) ←───┘│├── depends on Task 1.1
                                  ││
Phase 2:                          ││
  Task 2.1 (Budget Bridge) ←─────┘│── depends on Task 1.2
  Task 2.2 (Procurement Bridge) ←──── depends on Task 1.3
  Task 2.3 (Asset Bridge) ←───────── depends on Task 1.4
  Task 2.4 (HR Bridge) ←──────────── depends on Task 1.5
  Task 2.5 (Project Bridge) ←─────── depends on Task 1.6
  Task 2.6 (CMS Sync) ←───────────── depends on Task 1.1 (fields for sync)
  Task 2.7 (Workflow Engine) ←─────── depends on Tasks 1.2-1.6 (status fields)

Phase 3:
  Task 3.1 (Financial Dashboard) ←── depends on Task 2.1
  Task 3.2 (Procurement Dashboard) ← depends on Task 2.2
  Task 3.3 (Asset Dashboard) ←────── depends on Task 2.3
  Task 3.4 (Integration Dashboard) ← depends on Task 2.6
  Task 3.5 (Custom Reports) ←─────── depends on Tasks 2.1-2.5

Phase 4:
  Task 4.1 (New Doctypes) ←────────── depends on Task 2.7 (workflow engine)
  Task 4.2 (Advanced Workflows) ←──── depends on Task 2.7
  Task 4.3 (Migration Tools) ←─────── depends on Task 1.1 (schema complete)
  Task 4.4 (Seed Data) ←──────────── depends on Task 1.8 (roles defined)
  Task 4.5 (Advanced Security) ←──── depends on Task 1.8
  Task 4.6 (API Documentation) ←──── depends on Tasks 2.1-2.5 (APIs exist)
```

---

## Appendix: File-Level Change Map

### New Files to Create

| File | Phase | Purpose |
|------|-------|---------|
| `cityos/finance/budget_bridge.py` | 2.1 | ERPNext Budget sync |
| `cityos/procurement/procurement_bridge.py` | 2.2 | ERPNext Buying sync |
| `cityos/assets_management/asset_bridge.py` | 2.3 | ERPNext Asset sync |
| `cityos/hr_management/hr_bridge.py` | 2.4 | ERPNext HR sync |
| `cityos/cityos_projects/project_bridge.py` | 2.5 | ERPNext Project sync |
| `cityos/integrations/sync_manager.py` | 2.6 | Conflict detection & sync status |
| `cityos/governance/workflow_engine.py` | 2.7 | State machine engine |
| `cityos/finance/dashboard.py` | 3.1 | Financial dashboard |
| `cityos/procurement/dashboard.py` | 3.2 | Procurement dashboard |
| `cityos/assets_management/dashboard.py` | 3.3 | Asset dashboard |
| `cityos/integrations/dashboard.py` | 3.4 | Integration health dashboard |
| `cityos/finance/report/budget_utilization/` | 3.5 | Budget report |
| `cityos/finance/report/invoice_aging/` | 3.5 | Invoice aging report |
| `cityos/procurement/report/procurement_status/` | 3.5 | Procurement report |
| `cityos/procurement/report/vendor_performance/` | 3.5 | Vendor report |
| `cityos/procurement/report/contract_expiry/` | 3.5 | Contract expiry report |
| `cityos/assets_management/report/asset_register/` | 3.5 | Asset report |
| `cityos/assets_management/report/maintenance_compliance/` | 3.5 | Maintenance report |
| `cityos/governance/report/tenant_activity/` | 3.5 | Tenant report |
| `cityos/governance/report/governance_hierarchy/` | 3.5 | Hierarchy report |
| `cityos/compliance/report/compliance_findings/` | 3.5 | Compliance report |
| `cityos/integrations/report/sync_status/` | 3.5 | Sync report |
| `cityos/governance/doctype/service_request/` | 4.1 | New doctype |
| `cityos/governance/doctype/permit_license/` | 4.1 | New doctype |
| `cityos/assets_management/doctype/inspection_record/` | 4.1 | New doctype |
| `cityos/governance/doctype/sla_definition/` | 4.1 | New doctype |
| `cityos/compliance/doctype/compliance_case/` | 4.1 | New doctype |
| `cityos/governance/doctype/approval_delegation/` | 4.2 | New doctype |
| `cityos/setup/provision_tenant.py` | 4.3 | Tenant provisioning |
| `cityos/setup/demo_data.py` | 4.3 | Demo data generator |
| `cityos/api/v1/` | 4.6 | Versioned API |
| `cityos/api/openapi.json` | 4.6 | API spec |
| 20+ test files | All | Test coverage |

### Existing Files to Modify

| File | Phase | Changes |
|------|-------|---------|
| `cityos/hooks.py` | 1.7, 1.8, 2.1-2.6 | Permission queries, doc_events, scheduled tasks |
| `cityos/governance/node_context.py` | 1.7 | Hierarchical tenant access, fix default fallback |
| `cityos/governance/audit.py` | 4.5 | Extended audit logging |
| `cityos/compliance/checks.py` | 1.2-1.6 | New checks for business logic compliance |
| `cityos/integrations/payload_sync.py` | 2.6 | 10+ new sync functions |
| `cityos/integrations/medusa_sync.py` | 2.6 | Enhanced sync with conflict detection |
| `cityos/integrations/outbox.py` | 2.6 | New event types for new entities |
| `cityos/integrations/cms_client.py` | 2.6 | Delta sync, pagination |
| `cityos/integrations/temporal_sync.py` | 2.7 | Workflow engine integration |
| `cityos/setup/install.py` | 1.8, 4.4 | Roles, permissions, seed data |
| All 14 operational doctype `.py` files | 1.2-1.6 | Business logic |
| All 26 doctype `.json` files | 1.1, 1.8 | New fields, permissions |

### Doctype JSON Schema Updates

| Doctype | Phase | Changes |
|---------|-------|---------|
| Budget Program | 1.1 | 14 new fields + 1 child table |
| Municipal Invoice | 1.1 | 15 new fields |
| Funding Source | 1.1 | 13 new fields |
| Fiscal Allocation | 1.1 | 12 new fields |
| CityOS Procurement Request | 1.1 | 17 new fields + 2 child tables |
| Vendor Compliance Profile | 1.1 | 18 new fields + 1 child table |
| Contract Register | 1.1 | 21 new fields + 3 child tables |
| Municipal Asset | 1.1 | 24 new fields |
| Municipal Facility | 1.1 | 17 new fields |
| Maintenance Plan | 1.1 | 18 new fields + 1 child table |
| Position Control | 1.1 | 16 new fields |
| Staff Assignment | 1.1 | 16 new fields |
| Capital Project | 1.1 | 23 new fields + 1 child table |
| Community Impact Report | 1.1 | 15 new fields |
| **Total** | | **~239 new fields, 9 child tables** |

---

*End of Implementation Plan*
