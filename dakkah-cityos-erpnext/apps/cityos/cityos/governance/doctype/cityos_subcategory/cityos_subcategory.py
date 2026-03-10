import frappe
from frappe.model.document import Document


class CityOSSubcategory(Document):
    def validate(self):
        if hasattr(self, 'subcategory_code') and self.subcategory_code:
            self.subcategory_code = self.subcategory_code.upper().strip()
