import frappe
from frappe.model.document import Document


class CityOSCategory(Document):
    def validate(self):
        if hasattr(self, 'category_code') and self.category_code:
            self.category_code = self.category_code.upper().strip()
