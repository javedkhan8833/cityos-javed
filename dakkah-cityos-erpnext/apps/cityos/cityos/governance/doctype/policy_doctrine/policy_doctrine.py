import frappe
from frappe.model.document import Document


class PolicyDoctrine(Document):
    def validate(self):
        if hasattr(self, 'policy_code') and self.policy_code:
            self.policy_code = self.policy_code.upper().strip()
        if self.effective_date and self.expiry_date:
            if self.expiry_date < self.effective_date:
                frappe.throw("Expiry date cannot be before effective date")
        if self.governance_authority:
            if not frappe.db.exists("Governance Authority", self.governance_authority):
                frappe.throw(f"Governance Authority '{self.governance_authority}' does not exist")
