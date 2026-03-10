import frappe
from frappe.model.document import Document


class CityOSPersonaAssignment(Document):
    def validate(self):
        if self.effective_date and self.expiry_date:
            if self.expiry_date < self.effective_date:
                frappe.throw("Expiry date cannot be before effective date")
        if self.persona and not frappe.db.exists("CityOS Persona", self.persona):
            frappe.throw(f"Persona '{self.persona}' does not exist")
        if self.tenant and not frappe.db.exists("Node Context", self.tenant):
            frappe.throw(f"Tenant '{self.tenant}' does not exist")
