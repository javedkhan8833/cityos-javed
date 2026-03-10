import frappe
from frappe.model.document import Document


class ProcurementRequestItem(Document):
    def validate(self):
        if self.qty and self.estimated_rate:
            self.estimated_amount = self.qty * self.estimated_rate
