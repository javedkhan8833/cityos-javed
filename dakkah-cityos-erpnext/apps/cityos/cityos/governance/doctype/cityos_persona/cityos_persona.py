import frappe
from frappe.model.document import Document


class CityOSPersona(Document):
    def validate(self):
        if hasattr(self, 'persona_code') and self.persona_code:
            self.persona_code = self.persona_code.upper().strip()
