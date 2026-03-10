import frappe
from frappe.model.document import Document


class GovernanceAuthority(Document):
    def validate(self):
        if self.parent_authority:
            if self.parent_authority == self.name:
                frappe.throw("Governance Authority cannot be its own parent")
            parent = frappe.get_doc("Governance Authority", self.parent_authority)
            if parent.status != "Active":
                frappe.throw(f"Parent authority '{self.parent_authority}' is not active")
