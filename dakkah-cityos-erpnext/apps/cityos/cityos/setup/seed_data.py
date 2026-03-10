import frappe
import json
from frappe.utils import now_datetime, add_days, add_months, getdate


def seed_all():
    frappe.flags.ignore_node_context = True
    
    _seed_node_contexts()
    _seed_hierarchy()
    _seed_finance()
    _seed_procurement()
    _seed_assets()
    _seed_hr()
    _seed_projects()
    _seed_staff_assignments()
    _seed_audit_logs()
    _seed_outbox_events()
    
    frappe.db.commit()
    return {"status": "seeded"}


def _insert_if_missing(doctype, name_field, name_value, data):
    if frappe.db.exists(doctype, {name_field: name_value}):
        return frappe.db.get_value(doctype, {name_field: name_value}, "name")
    
    try:
        doc = frappe.new_doc(doctype)
        for k, v in data.items():
            if doc.meta.has_field(k):
                setattr(doc, k, v)
        doc.flags.ignore_node_context = True
        doc.flags.ignore_permissions = True
        doc.flags.ignore_mandatory = True
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return doc.name
    except Exception as e:
        frappe.db.rollback()
        print(f"  WARN: {doctype} '{name_value}': {e}")
        return None


def _seed_node_contexts():
    tenants = [
        {"context_name": "Riyadh Smart City", "tenant": "riyadh", "country": "Saudi Arabia", "city_or_theme": "Riyadh", "sector": "Municipal Government", "enabled": 1},
        {"context_name": "Jeddah Municipality", "tenant": "jeddah", "country": "Saudi Arabia", "city_or_theme": "Jeddah", "sector": "Municipal Government", "enabled": 1},
        {"context_name": "Dubai Innovation Hub", "tenant": "dubai", "country": "United Arab Emirates", "city_or_theme": "Dubai", "sector": "Smart City", "enabled": 1},
        {"context_name": "Barcelona Smart City", "tenant": "barcelona", "country": "Spain", "city_or_theme": "Barcelona", "sector": "Urban Development", "enabled": 1},
        {"context_name": "Amsterdam Digital", "tenant": "amsterdam", "country": "Netherlands", "city_or_theme": "Amsterdam", "sector": "Digital Services", "enabled": 1},
        {"context_name": "Cairo Urban Development", "tenant": "cairo", "country": "Egypt", "city_or_theme": "Cairo", "sector": "Infrastructure", "enabled": 1},
        {"context_name": "Amman Smart Services", "tenant": "amman", "country": "Jordan", "city_or_theme": "Amman", "sector": "Citizen Services", "enabled": 1},
        {"context_name": "Enterprise Global", "tenant": "enterprise", "country": "Saudi Arabia", "city_or_theme": "Global", "sector": "Enterprise Operations", "enabled": 1},
    ]
    
    for t in tenants:
        if not frappe.db.exists("Country", t["country"]):
            try:
                c = frappe.new_doc("Country")
                c.country_name = t["country"]
                c.flags.ignore_permissions = True
                c.insert(ignore_permissions=True)
            except Exception:
                pass
        
        _insert_if_missing("Node Context", "context_name", t["context_name"], t)


def _seed_hierarchy():
    scopes = [
        {"scope_name": "National Infrastructure", "country": "Saudi Arabia", "description": "National-level infrastructure programs", "is_active": 1},
        {"scope_name": "Urban Development", "country": "Saudi Arabia", "description": "City-level urban development and planning", "is_active": 1},
        {"scope_name": "Digital Services", "country": "Saudi Arabia", "description": "Digital government services and e-government", "is_active": 1},
        {"scope_name": "Environmental", "country": "Saudi Arabia", "description": "Environmental sustainability and green initiatives", "is_active": 1},
        {"scope_name": "Smart Mobility", "country": "United Arab Emirates", "description": "Smart transportation and mobility services", "is_active": 1},
        {"scope_name": "Citizen Services", "country": "Egypt", "description": "Citizen-facing government services", "is_active": 1},
        {"scope_name": "European Standards", "country": "Spain", "description": "EU-compliant smart city standards", "is_active": 1},
    ]
    
    for s in scopes:
        _insert_if_missing("CityOS Scope", "scope_name", s["scope_name"], s)

    categories = [
        {"category_name": "Transportation", "scope": "National Infrastructure", "description": "Roads, highways, public transit", "is_active": 1},
        {"category_name": "Water & Utilities", "scope": "National Infrastructure", "description": "Water supply, sewage, power grid", "is_active": 1},
        {"category_name": "Residential Development", "scope": "Urban Development", "description": "Housing and residential zones", "is_active": 1},
        {"category_name": "Commercial Zones", "scope": "Urban Development", "description": "Business districts and commercial areas", "is_active": 1},
        {"category_name": "E-Government", "scope": "Digital Services", "description": "Online government portals and services", "is_active": 1},
        {"category_name": "IoT & Sensors", "scope": "Digital Services", "description": "IoT infrastructure and sensor networks", "is_active": 1},
        {"category_name": "Waste Management", "scope": "Environmental", "description": "Solid waste and recycling programs", "is_active": 1},
        {"category_name": "Green Energy", "scope": "Environmental", "description": "Solar, wind, and renewable energy", "is_active": 1},
        {"category_name": "Public Transit", "scope": "Smart Mobility", "description": "Bus, metro, and rail systems", "is_active": 1},
        {"category_name": "Healthcare Access", "scope": "Citizen Services", "description": "Public health facilities and programs", "is_active": 1},
    ]
    
    for c in categories:
        _insert_if_missing("CityOS Category", "category_name", c["category_name"], c)

    subcategories = [
        {"subcategory_name": "Highway Construction", "category": "Transportation", "description": "Major highway projects", "is_active": 1},
        {"subcategory_name": "Metro Rail", "category": "Transportation", "description": "Underground and surface metro systems", "is_active": 1},
        {"subcategory_name": "Desalination Plants", "category": "Water & Utilities", "description": "Seawater desalination facilities", "is_active": 1},
        {"subcategory_name": "Smart Grid", "category": "Water & Utilities", "description": "Intelligent power distribution", "is_active": 1},
        {"subcategory_name": "Affordable Housing", "category": "Residential Development", "description": "Low-cost housing programs", "is_active": 1},
        {"subcategory_name": "Digital Identity", "category": "E-Government", "description": "National digital ID systems", "is_active": 1},
        {"subcategory_name": "Traffic Sensors", "category": "IoT & Sensors", "description": "Traffic monitoring and management", "is_active": 1},
        {"subcategory_name": "Recycling Programs", "category": "Waste Management", "description": "Municipal recycling initiatives", "is_active": 1},
        {"subcategory_name": "Solar Farms", "category": "Green Energy", "description": "Large-scale solar energy", "is_active": 1},
        {"subcategory_name": "Bus Rapid Transit", "category": "Public Transit", "description": "BRT corridors and stations", "is_active": 1},
    ]
    
    for sc in subcategories:
        _insert_if_missing("CityOS Subcategory", "subcategory_name", sc["subcategory_name"], sc)

    stores = [
        {"store_name": "Riyadh Central Hub", "tenant": "Riyadh Smart City", "city": "Riyadh", "scope": "Urban Development", "store_type": "Physical", "is_active": 1},
        {"store_name": "Riyadh Digital Portal", "tenant": "Riyadh Smart City", "city": "Riyadh", "scope": "Digital Services", "store_type": "Online", "is_active": 1},
        {"store_name": "Jeddah Corniche Center", "tenant": "Jeddah Municipality", "city": "Jeddah", "scope": "Urban Development", "store_type": "Physical", "is_active": 1},
        {"store_name": "Dubai Smart Hub", "tenant": "Dubai Innovation Hub", "city": "Dubai", "scope": "Smart Mobility", "store_type": "Hybrid", "is_active": 1},
        {"store_name": "Barcelona Digital Lab", "tenant": "Barcelona Smart City", "city": "Barcelona", "scope": "European Standards", "store_type": "Online", "is_active": 1},
        {"store_name": "Amsterdam IoT Center", "tenant": "Amsterdam Digital", "city": "Amsterdam", "scope": "Digital Services", "store_type": "Hybrid", "is_active": 1},
    ]

    for st in stores:
        if frappe.db.exists("Node Context", st["tenant"]):
            _insert_if_missing("CityOS Store", "store_name", st["store_name"], st)
        else:
            nc = frappe.db.get_value("Node Context", {"context_name": st["tenant"]}, "name")
            if nc:
                st["tenant"] = nc
                _insert_if_missing("CityOS Store", "store_name", st["store_name"], st)

    portals = [
        {"portal_name": "Riyadh Citizen Portal", "store": "Riyadh Central Hub", "portal_type": "Citizen Services", "portal_url": "https://riyadh.cityos.sa/citizen", "is_active": 1},
        {"portal_name": "Riyadh Business Portal", "store": "Riyadh Central Hub", "portal_type": "Business Services", "portal_url": "https://riyadh.cityos.sa/business", "is_active": 1},
        {"portal_name": "Riyadh Developer API", "store": "Riyadh Digital Portal", "portal_type": "Internal Operations", "portal_url": "https://api.riyadh.cityos.sa", "is_active": 1},
        {"portal_name": "Jeddah Services Portal", "store": "Jeddah Corniche Center", "portal_type": "Citizen Services", "portal_url": "https://jeddah.cityos.sa/services", "is_active": 1},
        {"portal_name": "Dubai Innovation Portal", "store": "Dubai Smart Hub", "portal_type": "Public Information", "portal_url": "https://dubai.cityos.ae/innovation", "is_active": 1},
        {"portal_name": "Barcelona Open Data", "store": "Barcelona Digital Lab", "portal_type": "Public Information", "portal_url": "https://barcelona.cityos.eu/opendata", "is_active": 1},
    ]

    for p in portals:
        store_name = frappe.db.get_value("CityOS Store", {"store_name": p["store"]}, "name")
        if store_name:
            p["store"] = store_name
            _insert_if_missing("CityOS Portal", "portal_name", p["portal_name"], p)


def _seed_finance():
    today = getdate()
    
    budget_programs = [
        {"program_name": "Riyadh Metro Expansion 2026", "status": "Active", "budget_type": "Capital", "total_budget": 25000000, "allocated_amount": 18000000, "spent_amount": 7500000, "remaining_amount": 10500000, "description": "Phase 3 expansion of Riyadh Metro network", "cityos_tenant": "", "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"program_name": "Jeddah Waterfront Renewal", "status": "Active", "budget_type": "Capital", "total_budget": 15000000, "allocated_amount": 12000000, "spent_amount": 4200000, "remaining_amount": 7800000, "description": "Corniche waterfront redevelopment project", "cityos_country": "Saudi Arabia", "cityos_city": "Jeddah"},
        {"program_name": "Smart Street Lighting Program", "status": "Active", "budget_type": "Operating", "total_budget": 5000000, "allocated_amount": 5000000, "spent_amount": 2100000, "remaining_amount": 2900000, "description": "IoT-enabled smart street lighting across Riyadh", "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"program_name": "Digital ID Rollout", "status": "Draft", "budget_type": "Capital", "total_budget": 8000000, "allocated_amount": 3000000, "spent_amount": 0, "remaining_amount": 3000000, "description": "National digital identity card program", "cityos_country": "Saudi Arabia"},
        {"program_name": "Municipal Waste Recycling", "status": "Active", "budget_type": "Operating", "total_budget": 3500000, "allocated_amount": 3500000, "spent_amount": 1800000, "remaining_amount": 1700000, "description": "City-wide recycling and waste reduction", "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"program_name": "Dubai Smart Transit", "status": "Active", "budget_type": "Capital", "total_budget": 40000000, "allocated_amount": 30000000, "spent_amount": 12000000, "remaining_amount": 18000000, "description": "Autonomous public transit pilot", "cityos_country": "United Arab Emirates", "cityos_city": "Dubai"},
    ]

    for bp in budget_programs:
        _insert_if_missing("Budget Program", "program_name", bp["program_name"], bp)

    funding_sources = [
        {"source_name": "Saudi Public Investment Fund", "source_type": "Federal Grant", "status": "Active", "annual_amount": 50000000, "utilized_amount": 22000000, "available_amount": 28000000, "valid_from": add_months(today, -6), "valid_to": add_months(today, 6), "cityos_country": "Saudi Arabia"},
        {"source_name": "Municipal Tax Revenue - Riyadh", "source_type": "Tax Revenue", "status": "Active", "source_reference": "MTR-RIY-2026", "annual_amount": 30000000, "utilized_amount": 15000000, "available_amount": 15000000, "valid_from": add_months(today, -3), "valid_to": add_months(today, 9), "cityos_country": "Saudi Arabia"},
        {"source_name": "Green Bond 2026", "source_type": "Bond", "status": "Active", "source_reference": "GB-2026-001", "annual_amount": 20000000, "utilized_amount": 5000000, "available_amount": 15000000, "valid_from": today, "valid_to": add_months(today, 24), "cityos_country": "Saudi Arabia"},
        {"source_name": "UAE Smart City Fund", "source_type": "Federal Grant", "status": "Active", "annual_amount": 35000000, "utilized_amount": 12000000, "available_amount": 23000000, "valid_from": add_months(today, -2), "valid_to": add_months(today, 10), "cityos_country": "United Arab Emirates"},
        {"source_name": "EU Urban Development Grant", "source_type": "State Grant", "status": "Active", "annual_amount": 10000000, "utilized_amount": 3000000, "available_amount": 7000000, "cityos_country": "Spain"},
    ]

    for fs in funding_sources:
        _insert_if_missing("Funding Source", "source_name", fs["source_name"], fs)

    invoices = [
        {"invoice_number": "MINV-2026-001", "invoice_type": "Vendor Payment", "status": "Pending Approval", "party_type": "Vendor", "party_name": "Al-Rashid Construction Co.", "due_date": add_days(today, 30), "grand_total": 1250000, "outstanding_amount": 1250000, "currency": "SAR", "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"invoice_number": "MINV-2026-002", "invoice_type": "Vendor Payment", "status": "Paid", "party_type": "Vendor", "party_name": "Saudi Electrical Industries", "due_date": add_days(today, -15), "grand_total": 875000, "outstanding_amount": 0, "currency": "SAR", "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"invoice_number": "MINV-2026-003", "invoice_type": "Citizen Service", "status": "Pending Approval", "party_type": "Vendor", "party_name": "Smart City Solutions LLC", "due_date": add_days(today, 45), "grand_total": 2300000, "outstanding_amount": 2300000, "currency": "SAR", "cityos_country": "Saudi Arabia", "cityos_city": "Jeddah"},
        {"invoice_number": "MINV-2026-004", "invoice_type": "Government Fee", "status": "Overdue", "party_type": "Vendor", "party_name": "TechVision MENA", "due_date": add_days(today, -10), "grand_total": 450000, "outstanding_amount": 450000, "currency": "AED", "cityos_country": "United Arab Emirates", "cityos_city": "Dubai"},
        {"invoice_number": "MINV-2026-005", "invoice_type": "Grant Disbursement", "status": "Approved", "party_type": "Vendor", "party_name": "Green Energy Partners", "due_date": add_days(today, 60), "grand_total": 3100000, "outstanding_amount": 1550000, "currency": "SAR", "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
    ]

    for inv in invoices:
        _insert_if_missing("Municipal Invoice", "invoice_number", inv["invoice_number"], inv)

    allocations = [
        {"allocation_name": "Metro Phase 3 - Civil Works", "status": "Active", "allocated_amount": 8000000, "spent_amount": 3200000, "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"allocation_name": "Smart Lighting - Equipment", "status": "Active", "allocated_amount": 3000000, "spent_amount": 1500000, "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"allocation_name": "Waterfront - Landscaping", "status": "Active", "allocated_amount": 4500000, "spent_amount": 1800000, "cityos_country": "Saudi Arabia", "cityos_city": "Jeddah"},
        {"allocation_name": "Digital ID - Software", "status": "Active", "allocated_amount": 2000000, "spent_amount": 0, "cityos_country": "Saudi Arabia"},
    ]

    for alloc in allocations:
        _insert_if_missing("Fiscal Allocation", "allocation_name", alloc["allocation_name"], alloc)


def _seed_procurement():
    today = getdate()
    
    vendors = [
        {"vendor_name": "Al-Rashid Construction Co.", "vendor_type": "Construction", "registration_number": "CR-SA-10234", "tax_id": "300012345600003", "compliance_status": "Compliant", "compliance_score": 92, "risk_level": "Low", "contact_person": "Ahmed Al-Rashid", "contact_email": "ahmed@alrashid.sa", "contact_phone": "+966 11 234 5678", "cityos_country": "Saudi Arabia"},
        {"vendor_name": "Saudi Electrical Industries", "vendor_type": "Goods", "registration_number": "CR-SA-20456", "tax_id": "300034567800003", "compliance_status": "Compliant", "compliance_score": 88, "risk_level": "Low", "contact_person": "Fahad Al-Saud", "contact_email": "fahad@sei.sa", "contact_phone": "+966 12 345 6789", "cityos_country": "Saudi Arabia"},
        {"vendor_name": "Smart City Solutions LLC", "vendor_type": "Technology", "registration_number": "CR-AE-30789", "tax_id": "100056789000003", "compliance_status": "Compliant", "compliance_score": 95, "risk_level": "Low", "contact_person": "Omar Hassan", "contact_email": "omar@smartcity.ae", "contact_phone": "+971 4 567 8901", "cityos_country": "United Arab Emirates"},
        {"vendor_name": "TechVision MENA", "vendor_type": "Services", "registration_number": "CR-AE-40123", "tax_id": "100078901200003", "compliance_status": "Pending Review", "compliance_score": 75, "risk_level": "Medium", "contact_person": "Sara Al-Maktoum", "contact_email": "sara@techvision.ae", "contact_phone": "+971 4 678 9012", "cityos_country": "United Arab Emirates"},
        {"vendor_name": "Green Energy Partners", "vendor_type": "Goods", "registration_number": "CR-SA-50567", "tax_id": "300090123400003", "compliance_status": "Compliant", "compliance_score": 90, "risk_level": "Low", "contact_person": "Khalid bin Rashid", "contact_email": "khalid@greenergy.sa", "contact_phone": "+966 13 456 7890", "cityos_country": "Saudi Arabia"},
        {"vendor_name": "Barcelona Urban Tech", "vendor_type": "Consulting", "registration_number": "ES-B-60234", "tax_id": "ESB12345678", "compliance_status": "Compliant", "compliance_score": 85, "risk_level": "Low", "contact_person": "Carlos Garcia", "contact_email": "carlos@bcnurbantech.eu", "contact_phone": "+34 93 456 7890", "cityos_country": "Spain"},
    ]

    for v in vendors:
        _insert_if_missing("Vendor Compliance Profile", "vendor_name", v["vendor_name"], v)

    contracts = [
        {"contract_title": "Riyadh Metro Phase 3 Civil Works", "contract_number": "CTR-2026-001", "contract_type": "Construction", "linked_vendor": "", "start_date": add_months(today, -3), "end_date": add_months(today, 21), "contract_value": 12000000, "spent_to_date": 3200000, "remaining_value": 8800000, "status": "Active", "sla_terms": "Monthly progress reports, 95% quality compliance", "cityos_tenant": "", "cityos_country": "Saudi Arabia"},
        {"contract_title": "Smart Street Lighting Installation", "contract_number": "CTR-2026-002", "contract_type": "Supply", "start_date": add_months(today, -1), "end_date": add_months(today, 11), "contract_value": 4500000, "spent_to_date": 1500000, "remaining_value": 3000000, "status": "Active", "sla_terms": "Bi-weekly deployment reports, 99% uptime SLA", "cityos_country": "Saudi Arabia"},
        {"contract_title": "IoT Platform Development", "contract_number": "CTR-2026-003", "contract_type": "Service", "start_date": add_months(today, -6), "end_date": add_months(today, 18), "contract_value": 8000000, "spent_to_date": 4000000, "remaining_value": 4000000, "status": "Active", "sla_terms": "Sprint reviews every 2 weeks, 99.5% platform availability", "cityos_country": "United Arab Emirates"},
        {"contract_title": "Waste Management Equipment Supply", "contract_number": "CTR-2026-004", "contract_type": "Supply", "linked_vendor": "", "start_date": today, "end_date": add_months(today, 6), "contract_value": 2500000, "spent_to_date": 0, "remaining_value": 2500000, "status": "Draft", "cityos_country": "Saudi Arabia"},
        {"contract_title": "Digital Identity Platform", "contract_number": "CTR-2026-005", "contract_type": "License", "start_date": add_months(today, 1), "end_date": add_months(today, 18), "contract_value": 6000000, "spent_to_date": 0, "remaining_value": 6000000, "status": "Under Review", "cityos_country": "Saudi Arabia"},
    ]

    for cr in contracts:
        _insert_if_missing("Contract Register", "contract_title", cr["contract_title"], cr)

    procurement_requests = [
        {"request_title": "Solar Panel Arrays - Phase 1", "request_type": "Goods", "required_date": add_days(today, 60), "estimated_cost": 4500000, "justification": "Required for Green Energy Smart Grid project in Riyadh", "priority": "High", "status": "Draft", "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"request_title": "Traffic Management Software License", "request_type": "Services", "required_date": add_days(today, 30), "estimated_cost": 850000, "justification": "AI-powered traffic management system for smart mobility", "priority": "High", "status": "Draft", "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"request_title": "Water Quality Sensors - 500 Units", "request_type": "Goods", "required_date": add_days(today, 45), "estimated_cost": 1200000, "justification": "IoT water quality monitoring across distribution network", "priority": "Normal", "status": "Draft", "cityos_country": "Saudi Arabia", "cityos_city": "Jeddah"},
        {"request_title": "Consulting - Smart Parking Design", "request_type": "Consulting", "required_date": add_days(today, 90), "estimated_cost": 350000, "justification": "Master plan for smart parking in downtown Barcelona", "priority": "Low", "status": "Draft", "cityos_country": "Spain", "cityos_city": "Barcelona"},
    ]

    for pr in procurement_requests:
        _insert_if_missing("CityOS Procurement Request", "request_title", pr["request_title"], pr)


def _seed_assets():
    today = getdate()
    
    assets = [
        {"asset_name": "Riyadh Metro Train Set A1", "asset_code": "MA-RIY-001", "asset_type": "Vehicle", "status": "Active", "location_description": "Riyadh Metro Depot - Line 1", "acquisition_date": add_months(today, -12), "acquisition_cost": 15000000, "current_value": 13500000, "condition": "Good", "useful_life_years": 30, "manufacturer": "Alstom", "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"asset_name": "Smart Streetlight Unit SL-500", "asset_code": "MA-RIY-002", "asset_type": "Equipment", "status": "Active", "location_description": "King Fahd Road, Riyadh", "acquisition_date": add_months(today, -3), "acquisition_cost": 8500, "current_value": 8000, "condition": "Excellent", "useful_life_years": 15, "manufacturer": "Signify", "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"asset_name": "Water Desalination Pump P-12", "asset_code": "MA-JED-001", "asset_type": "Equipment", "status": "Active", "location_description": "Jeddah Desalination Plant B", "acquisition_date": add_months(today, -24), "acquisition_cost": 2500000, "current_value": 2000000, "condition": "Good", "useful_life_years": 20, "manufacturer": "Grundfos", "cityos_country": "Saudi Arabia", "cityos_city": "Jeddah"},
        {"asset_name": "Solar Inverter Array SI-100", "asset_code": "MA-RIY-003", "asset_type": "Equipment", "status": "Active", "location_description": "Riyadh Solar Farm - Zone C", "acquisition_date": add_months(today, -6), "acquisition_cost": 1200000, "current_value": 1100000, "condition": "Excellent", "useful_life_years": 25, "manufacturer": "SMA Solar", "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"asset_name": "Autonomous Shuttle AV-01", "asset_code": "MA-DXB-001", "asset_type": "Vehicle", "status": "Active", "location_description": "Dubai Innovation District", "acquisition_date": add_months(today, -1), "acquisition_cost": 5000000, "current_value": 5000000, "condition": "Excellent", "useful_life_years": 10, "manufacturer": "Navya", "cityos_country": "United Arab Emirates", "cityos_city": "Dubai"},
        {"asset_name": "Air Quality Monitor AQM-300", "asset_code": "MA-BCN-001", "asset_type": "Technology", "status": "Active", "location_description": "Barcelona Eixample District", "acquisition_date": add_months(today, -8), "acquisition_cost": 45000, "current_value": 40000, "condition": "Good", "useful_life_years": 10, "manufacturer": "Libelium", "cityos_country": "Spain", "cityos_city": "Barcelona"},
    ]

    for a in assets:
        _insert_if_missing("Municipal Asset", "asset_code", a["asset_code"], a)

    facilities = [
        {"facility_name": "Riyadh City Hall", "facility_code": "MF-RIY-001", "facility_type": "Government Building", "status": "Operational", "address": "Al Olaya District, Riyadh", "city": "Riyadh", "total_area_sqm": 25000, "capacity": 500, "operating_hours": "7:30 AM - 4:00 PM", "accessibility_compliant": 1, "annual_operating_cost": 3500000, "energy_rating": "B"},
        {"facility_name": "King Abdulaziz Public Park", "facility_code": "MF-RIY-002", "facility_type": "Park", "status": "Operational", "address": "Al Malaz, Riyadh", "city": "Riyadh", "total_area_sqm": 150000, "capacity": 5000, "operating_hours": "6:00 AM - 11:00 PM", "accessibility_compliant": 1, "annual_operating_cost": 800000, "energy_rating": "A"},
        {"facility_name": "Jeddah Community Center", "facility_code": "MF-JED-001", "facility_type": "Community Center", "status": "Operational", "address": "Al Hamra, Jeddah", "city": "Jeddah", "total_area_sqm": 8000, "capacity": 300, "operating_hours": "8:00 AM - 10:00 PM", "accessibility_compliant": 1, "annual_operating_cost": 1200000, "energy_rating": "B"},
        {"facility_name": "Dubai Smart Services Center", "facility_code": "MF-DXB-001", "facility_type": "Government Building", "status": "Operational", "address": "Business Bay, Dubai", "city": "Dubai", "total_area_sqm": 12000, "capacity": 200, "operating_hours": "8:00 AM - 8:00 PM", "accessibility_compliant": 1, "annual_operating_cost": 2000000, "energy_rating": "A"},
        {"facility_name": "Barcelona Innovation Campus", "facility_code": "MF-BCN-001", "facility_type": "Other", "status": "Operational", "address": "22@ District, Barcelona", "city": "Barcelona", "total_area_sqm": 15000, "capacity": 400, "operating_hours": "7:00 AM - 10:00 PM", "accessibility_compliant": 1, "annual_operating_cost": 1800000, "energy_rating": "A"},
    ]

    for f in facilities:
        _insert_if_missing("Municipal Facility", "facility_code", f["facility_code"], f)

    maintenance_plans = [
        {"plan_name": "Metro Train Monthly Inspection", "plan_type": "Preventive", "frequency": "Monthly", "priority": "High", "estimated_cost": 50000, "status": "Active", "description": "Monthly safety and performance inspection of metro train sets", "last_executed": add_days(today, -25), "next_scheduled": add_days(today, 5), "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"plan_name": "Smart Light Firmware Update", "plan_type": "Preventive", "frequency": "Quarterly", "priority": "Normal", "estimated_cost": 15000, "status": "Active", "description": "Quarterly firmware updates and diagnostic checks for smart streetlights", "last_executed": add_months(today, -2), "next_scheduled": add_months(today, 1), "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"plan_name": "Desalination Plant Overhaul", "plan_type": "Corrective", "frequency": "Annual", "priority": "Critical", "estimated_cost": 500000, "status": "Active", "description": "Annual comprehensive overhaul of desalination plant systems", "next_scheduled": add_months(today, 2), "cityos_country": "Saudi Arabia", "cityos_city": "Jeddah"},
        {"plan_name": "Solar Panel Cleaning", "plan_type": "Preventive", "frequency": "Monthly", "priority": "Normal", "estimated_cost": 25000, "status": "Active", "description": "Monthly cleaning and efficiency check of solar panel arrays", "last_executed": add_days(today, -20), "next_scheduled": add_days(today, 10), "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"plan_name": "AV Shuttle Safety Check", "plan_type": "Preventive", "frequency": "Weekly", "priority": "Critical", "estimated_cost": 30000, "status": "Active", "description": "Weekly autonomous vehicle safety inspection and calibration", "last_executed": add_days(today, -5), "next_scheduled": add_days(today, 2), "cityos_country": "United Arab Emirates", "cityos_city": "Dubai"},
    ]

    for mp in maintenance_plans:
        _insert_if_missing("Maintenance Plan", "plan_name", mp["plan_name"], mp)


def _seed_hr():
    positions = [
        {"position_title": "Chief Technology Officer", "position_code": "PC-CTO-001", "status": "Filled", "grade_level": "Executive", "pay_band": "E1", "min_salary": 45000, "max_salary": 75000, "security_clearance": "Top Secret", "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"position_title": "Smart City Program Director", "position_code": "PC-DIR-001", "status": "Filled", "grade_level": "Senior Management", "pay_band": "D1", "min_salary": 35000, "max_salary": 55000, "security_clearance": "Top Secret", "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"position_title": "IoT Infrastructure Engineer", "position_code": "PC-ENG-001", "status": "Filled", "grade_level": "Professional", "pay_band": "C2", "min_salary": 18000, "max_salary": 30000, "security_clearance": "Enhanced", "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"position_title": "Urban Planning Analyst", "position_code": "PC-ANL-001", "status": "Authorized", "grade_level": "Professional", "pay_band": "C1", "min_salary": 15000, "max_salary": 25000, "security_clearance": "Enhanced", "cityos_country": "Saudi Arabia", "cityos_city": "Jeddah"},
        {"position_title": "Data Governance Officer", "position_code": "PC-GOV-001", "status": "Filled", "grade_level": "Senior Professional", "pay_band": "C3", "min_salary": 22000, "max_salary": 35000, "security_clearance": "Enhanced", "cityos_country": "United Arab Emirates", "cityos_city": "Dubai"},
        {"position_title": "Sustainability Coordinator", "position_code": "PC-SUS-001", "status": "Authorized", "grade_level": "Professional", "pay_band": "C1", "min_salary": 14000, "max_salary": 22000, "security_clearance": "Basic", "cityos_country": "Spain", "cityos_city": "Barcelona"},
    ]

    for p in positions:
        _insert_if_missing("Position Control", "position_code", p["position_code"], p)


def _seed_projects():
    today = getdate()
    
    capital_projects = [
        {"project_name": "Riyadh Metro Phase 3", "project_code": "CP-RIY-001", "project_type": "Infrastructure", "start_date": add_months(today, -6), "target_completion": add_months(today, 30), "status": "In Progress", "total_budget": 25000000, "spent_amount": 7500000, "remaining_budget": 17500000, "phase": "Construction", "priority": "Critical", "location_description": "Northern Riyadh corridors", "gps_latitude": 24.7136, "gps_longitude": 46.6753, "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"project_name": "Jeddah Corniche Waterfront", "project_code": "CP-JED-001", "project_type": "Infrastructure", "start_date": add_months(today, -3), "target_completion": add_months(today, 18), "status": "In Progress", "total_budget": 15000000, "spent_amount": 4200000, "remaining_budget": 10800000, "phase": "Design", "priority": "High", "location_description": "Jeddah Corniche coastal strip", "gps_latitude": 21.5433, "gps_longitude": 39.1728, "cityos_country": "Saudi Arabia", "cityos_city": "Jeddah"},
        {"project_name": "NEOM Smart Infrastructure", "project_code": "CP-NOM-001", "project_type": "Technology", "start_date": add_months(today, -12), "target_completion": add_months(today, 60), "status": "In Progress", "total_budget": 100000000, "spent_amount": 25000000, "remaining_budget": 75000000, "phase": "Construction", "priority": "Critical", "location_description": "NEOM, Tabuk Province", "gps_latitude": 27.9500, "gps_longitude": 35.5667, "cityos_country": "Saudi Arabia"},
        {"project_name": "Dubai Autonomous Transit Network", "project_code": "CP-DXB-001", "project_type": "Transportation", "start_date": add_months(today, -2), "target_completion": add_months(today, 24), "status": "Planning", "total_budget": 40000000, "spent_amount": 2000000, "remaining_budget": 38000000, "phase": "Concept", "priority": "High", "location_description": "Dubai Innovation District", "gps_latitude": 25.2048, "gps_longitude": 55.2708, "cityos_country": "United Arab Emirates", "cityos_city": "Dubai"},
        {"project_name": "Barcelona Superblocks Phase 4", "project_code": "CP-BCN-001", "project_type": "Social", "start_date": add_months(today, -8), "target_completion": add_months(today, 16), "status": "In Progress", "total_budget": 8000000, "spent_amount": 3500000, "remaining_budget": 4500000, "phase": "Construction", "priority": "Normal", "location_description": "Eixample District, Barcelona", "gps_latitude": 41.3874, "gps_longitude": 2.1686, "cityos_country": "Spain", "cityos_city": "Barcelona"},
    ]

    for cp in capital_projects:
        _insert_if_missing("Capital Project", "project_code", cp["project_code"], cp)

    impact_reports = [
        {"report_title": "Riyadh Metro Phase 2 Impact Assessment", "report_type": "Completion Report", "report_date": add_months(today, -1), "beneficiaries_count": 2500000, "jobs_created": 15000, "environmental_impact": "Positive", "economic_impact": "Positive", "social_impact": "Positive", "key_findings": "Metro Phase 2 reduced traffic congestion by 25% in served corridors. Daily ridership exceeded 400,000 within first quarter.", "recommendations": "Accelerate Phase 3 deployment. Integrate feeder bus routes for last-mile connectivity.", "status": "Published", "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"report_title": "Smart Lighting Energy Savings Report", "report_type": "Progress Update", "report_date": add_days(today, -15), "beneficiaries_count": 500000, "jobs_created": 200, "environmental_impact": "Positive", "economic_impact": "Positive", "social_impact": "Positive", "key_findings": "Smart LED streetlights reduced energy consumption by 42% compared to traditional sodium lights. Annual savings of SAR 2.1M.", "recommendations": "Expand to remaining districts. Add motion sensors for further optimization.", "status": "Published", "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"report_title": "Dubai Smart Transit Feasibility", "report_type": "Pre-Project Assessment", "report_date": add_days(today, -5), "beneficiaries_count": 800000, "jobs_created": 5000, "environmental_impact": "Positive", "economic_impact": "Positive", "social_impact": "Positive", "key_findings": "Autonomous transit network can serve 800,000 daily passengers by 2030. Projected 60% reduction in road accidents in covered zones.", "recommendations": "Proceed with pilot deployment in Innovation District. Establish regulatory framework for AV operations.", "status": "Draft", "cityos_country": "United Arab Emirates", "cityos_city": "Dubai"},
    ]

    for ir in impact_reports:
        cp_name = None
        if "Metro" in ir["report_title"]:
            cp_name = frappe.db.get_value("Capital Project", {"project_code": "CP-RIY-001"}, "name")
        elif "Lighting" in ir["report_title"]:
            cp_name = frappe.db.get_value("Capital Project", {"project_code": "CP-RIY-001"}, "name")
        elif "Dubai" in ir["report_title"]:
            cp_name = frappe.db.get_value("Capital Project", {"project_code": "CP-DXB-001"}, "name")
        
        if cp_name:
            ir["linked_project"] = cp_name
        
        _insert_if_missing("Community Impact Report", "report_title", ir["report_title"], ir)


def _seed_staff_assignments():
    today = getdate()

    assignments = [
        {"assignment_title": "Metro Phase 3 Technical Lead", "assignment_type": "Special Project", "start_date": add_months(today, -3), "end_date": add_months(today, 9), "status": "Active", "justification": "Dedicated technical leadership for Phase 3 civil works coordination", "cityos_country": "Saudi Arabia", "cityos_city": "Riyadh"},
        {"assignment_title": "Emergency Water Response Team", "assignment_type": "Emergency", "start_date": add_days(today, -10), "end_date": add_days(today, 20), "status": "Active", "justification": "Emergency deployment for water infrastructure repair in Al Hamra district", "cityos_country": "Saudi Arabia", "cityos_city": "Jeddah"},
        {"assignment_title": "Acting Director - Innovation Hub", "assignment_type": "Acting", "start_date": add_months(today, -1), "end_date": add_months(today, 2), "status": "Active", "justification": "Covering during Director sabbatical leave", "cityos_country": "United Arab Emirates", "cityos_city": "Dubai"},
        {"assignment_title": "Smart Parking Consultant Detail", "assignment_type": "Detail", "start_date": add_months(today, 1), "end_date": add_months(today, 4), "status": "Proposed", "justification": "Cross-departmental detail for smart parking master plan", "cityos_country": "Spain", "cityos_city": "Barcelona"},
    ]

    for sa in assignments:
        _insert_if_missing("Staff Assignment", "assignment_title", sa["assignment_title"], sa)


def _seed_audit_logs():
    today = getdate()

    logs = [
        {"document_type": "Budget Program", "document_name": "Riyadh Metro Expansion 2026", "action": "Created", "user": "Administrator", "timestamp": add_days(now_datetime(), -30), "tenant": "riyadh", "country": "Saudi Arabia", "city": "Riyadh"},
        {"document_type": "Municipal Invoice", "document_name": "MINV-2026-002", "action": "Approved", "user": "Administrator", "timestamp": add_days(now_datetime(), -15), "tenant": "riyadh", "country": "Saudi Arabia", "city": "Riyadh"},
        {"document_type": "Vendor Compliance Profile", "document_name": "Al-Rashid Construction Co.", "action": "Updated", "user": "Administrator", "timestamp": add_days(now_datetime(), -7), "tenant": "riyadh", "country": "Saudi Arabia", "city": "Riyadh"},
        {"document_type": "Capital Project", "document_name": "CP-RIY-001", "action": "Submitted", "user": "Administrator", "timestamp": add_days(now_datetime(), -3), "tenant": "riyadh", "country": "Saudi Arabia", "city": "Riyadh"},
        {"document_type": "Contract Register", "document_name": "CTR-2026-003", "action": "Approved", "user": "Administrator", "timestamp": add_days(now_datetime(), -1), "tenant": "dubai", "country": "United Arab Emirates", "city": "Dubai"},
    ]

    for log in logs:
        _insert_if_missing("CityOS Audit Log", "document_name", log["document_name"], log)


def _seed_outbox_events():
    outbox_events = [
        {"event_type": "vendor.created", "source_doctype": "Vendor Compliance Profile", "source_name": "Al-Rashid Construction Co.", "target_system": "Payload CMS", "status": "Published", "priority": "Normal", "tenant": "riyadh", "country": "Saudi Arabia", "city": "Riyadh", "idempotency_key": "vendor.created:VCP:alrashid:riyadh", "retry_count": 0, "max_retries": 3},
        {"event_type": "invoice.approved", "source_doctype": "Municipal Invoice", "source_name": "MINV-2026-002", "target_system": "Medusa Commerce", "status": "Published", "priority": "High", "tenant": "riyadh", "country": "Saudi Arabia", "city": "Riyadh", "idempotency_key": "invoice.approved:MI:MINV-2026-002:riyadh", "retry_count": 0, "max_retries": 3},
        {"event_type": "project.updated", "source_doctype": "Capital Project", "source_name": "CP-RIY-001", "target_system": "Temporal Workflow", "status": "Published", "priority": "Normal", "tenant": "riyadh", "country": "Saudi Arabia", "city": "Riyadh", "idempotency_key": "project.updated:CP:CP-RIY-001:riyadh", "retry_count": 0, "max_retries": 3},
        {"event_type": "contract.created", "source_doctype": "Contract Register", "source_name": "CTR-2026-001", "target_system": "All", "status": "Pending", "priority": "Normal", "tenant": "riyadh", "country": "Saudi Arabia", "city": "Riyadh", "idempotency_key": "contract.created:CR:CTR-2026-001:riyadh", "retry_count": 0, "max_retries": 3},
        {"event_type": "asset.maintenance_due", "source_doctype": "Municipal Asset", "source_name": "MA-RIY-001", "target_system": "Temporal Workflow", "status": "Failed", "priority": "High", "tenant": "riyadh", "country": "Saudi Arabia", "city": "Riyadh", "idempotency_key": "asset.maint:MA:MA-RIY-001:riyadh", "retry_count": 2, "max_retries": 3},
    ]

    for evt in outbox_events:
        _insert_if_missing("Integration Outbox Event", "idempotency_key", evt["idempotency_key"], evt)
