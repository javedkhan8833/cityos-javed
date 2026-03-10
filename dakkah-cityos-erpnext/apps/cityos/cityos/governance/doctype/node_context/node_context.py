import frappe
from frappe.model.document import Document

VALID_TIER_PARENTS = {
    "MASTER": [],
    "GLOBAL": ["MASTER"],
    "REGIONAL": ["GLOBAL", "MASTER"],
    "COUNTRY": ["REGIONAL", "GLOBAL"],
    "CITY": ["COUNTRY"],
}


class NodeContext(Document):
    def validate(self):
        self._validate_no_self_reference()
        self._validate_parent_enabled()
        self._validate_tier_hierarchy()
        self._validate_slug()
        self._validate_governance_authority()

    def _validate_no_self_reference(self):
        if hasattr(self, 'parent_context') and self.parent_context and self.parent_context == self.name:
            frappe.throw("Node Context cannot be its own parent")
        if hasattr(self, 'parent_tenant') and self.parent_tenant and self.parent_tenant == self.name:
            frappe.throw("Node Context cannot be its own parent tenant")

    def _validate_parent_enabled(self):
        if hasattr(self, 'parent_context') and self.parent_context:
            parent = frappe.get_doc("Node Context", self.parent_context)
            if not parent.enabled:
                frappe.throw(f"Parent context '{self.parent_context}' is disabled")
        if hasattr(self, 'parent_tenant') and self.parent_tenant:
            parent = frappe.get_doc("Node Context", self.parent_tenant)
            if hasattr(parent, 'status') and parent.status and parent.status != "Active":
                frappe.throw(f"Parent tenant '{self.parent_tenant}' is not active (status: {parent.status})")

    def _validate_tier_hierarchy(self):
        if not hasattr(self, 'tenant_tier') or not self.tenant_tier:
            return
        if hasattr(self, 'parent_tenant') and self.parent_tenant:
            parent = frappe.get_doc("Node Context", self.parent_tenant)
            parent_tier = getattr(parent, 'tenant_tier', '') or ''
            valid_parents = VALID_TIER_PARENTS.get(self.tenant_tier, [])
            if parent_tier and valid_parents and parent_tier not in valid_parents:
                frappe.throw(
                    f"A {self.tenant_tier} tier tenant cannot have a {parent_tier} tier parent. "
                    f"Valid parent tiers for {self.tenant_tier}: {', '.join(valid_parents)}",
                    title="Invalid Tenant Hierarchy"
                )
        if self.tenant_tier == "MASTER" and hasattr(self, 'parent_tenant') and self.parent_tenant:
            frappe.throw("MASTER tier tenants cannot have a parent tenant")
        self._check_circular_hierarchy()

    def _check_circular_hierarchy(self):
        if not hasattr(self, 'parent_tenant') or not self.parent_tenant:
            return
        visited = {self.name}
        current_name = self.parent_tenant
        depth = 0
        while current_name and depth < 10:
            if current_name in visited:
                frappe.throw("Circular tenant hierarchy detected", title="Invalid Tenant Hierarchy")
            visited.add(current_name)
            current_name = frappe.db.get_value("Node Context", current_name, "parent_tenant")
            depth += 1

    def _validate_slug(self):
        if hasattr(self, 'slug') and self.slug:
            self.slug = self.slug.lower().strip().replace(" ", "-")

    def _validate_governance_authority(self):
        if hasattr(self, 'governance_authority') and self.governance_authority:
            if not frappe.db.exists("Governance Authority", self.governance_authority):
                frappe.throw(f"Governance Authority '{self.governance_authority}' does not exist")

    def get_full_hierarchy(self):
        hierarchy = [self.as_dict()]
        current = self
        while current.parent_context:
            current = frappe.get_doc("Node Context", current.parent_context)
            hierarchy.append(current.as_dict())
        return list(reversed(hierarchy))

    def get_tenant_chain(self):
        chain = [self.as_dict()]
        current = self
        depth = 0
        while hasattr(current, 'parent_tenant') and current.parent_tenant and depth < 10:
            current = frappe.get_doc("Node Context", current.parent_tenant)
            chain.append(current.as_dict())
            depth += 1
        return list(reversed(chain))

    def get_inherited_policies(self):
        policies = []
        chain = self.get_tenant_chain()
        for node in chain:
            ga = node.get("governance_authority")
            if ga and frappe.db.exists("Governance Authority", ga):
                ga_policies = frappe.get_all(
                    "Policy Doctrine",
                    filters={"governance_authority": ga, "status": "Active"},
                    fields=["name", "policy_name", "policy_type", "scope_level", "enforcement_level", "inheritance_mode"]
                )
                for p in ga_policies:
                    p["inherited_from"] = node.get("context_name", node.get("name"))
                    p["source_tier"] = node.get("tenant_tier", "")
                    policies.append(p)
        return policies

    @staticmethod
    def resolve_context(tenant=None, country=None, city=None, sector=None):
        filters = {"enabled": 1}
        if tenant:
            filters["tenant"] = tenant
        if country:
            filters["country"] = country
        if city:
            filters["city_or_theme"] = city
        if sector:
            filters["sector"] = sector

        contexts = frappe.get_all(
            "Node Context",
            filters=filters,
            fields=["name", "tenant", "country", "city_or_theme", "sector"],
            order_by="creation desc",
            limit=1,
        )
        return contexts[0] if contexts else None
