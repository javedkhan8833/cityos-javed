import frappe
from frappe.model.document import Document


class CityOSScope(Document):
    def validate(self):
        if hasattr(self, 'scope_code') and self.scope_code:
            self.scope_code = self.scope_code.upper().strip()
