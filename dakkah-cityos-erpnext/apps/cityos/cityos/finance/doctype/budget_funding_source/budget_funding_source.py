import frappe
from frappe.model.document import Document


class BudgetFundingSource(Document):
    def validate(self):
        if self.allocated_amount and self.allocated_amount < 0:
            frappe.throw("Allocated Amount cannot be negative")
