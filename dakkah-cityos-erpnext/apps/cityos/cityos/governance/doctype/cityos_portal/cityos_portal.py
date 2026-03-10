import frappe
from frappe.model.document import Document


class CityOSPortal(Document):
    def validate(self):
        if hasattr(self, 'portal_handle'):
            if self.portal_handle:
                self.portal_handle = self.portal_handle.lower().strip().replace(" ", "-")
            elif self.portal_name:
                self.portal_handle = self.portal_name.lower().strip().replace(" ", "-")

        if self.store and not self.tenant:
            store = frappe.get_doc("CityOS Store", self.store)
            self.tenant = store.tenant
