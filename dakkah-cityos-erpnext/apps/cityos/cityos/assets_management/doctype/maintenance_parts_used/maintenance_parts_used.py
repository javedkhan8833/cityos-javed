import frappe
from frappe.model.document import Document


class MaintenancePartsUsed(Document):
    def validate(self):
        if self.qty and self.rate:
            self.amount = self.qty * self.rate
