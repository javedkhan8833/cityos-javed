import frappe
from frappe.model.document import Document


class CityOSStore(Document):
    def validate(self):
        if hasattr(self, 'store_handle'):
            if self.store_handle:
                self.store_handle = self.store_handle.lower().strip().replace(" ", "-")
            elif self.store_name:
                self.store_handle = self.store_name.lower().strip().replace(" ", "-")
