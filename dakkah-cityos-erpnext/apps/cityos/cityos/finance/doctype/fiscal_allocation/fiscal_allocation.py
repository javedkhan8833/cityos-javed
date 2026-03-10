import frappe
from frappe.model.document import Document
from frappe.utils import getdate, today, flt


class FiscalAllocation(Document):
    def validate(self):
        if not self.budget_program:
            frappe.throw("Budget Program is required for Fiscal Allocation")

        if flt(self.allocated_amount) <= 0:
            frappe.throw("Allocated Amount must be greater than 0")

        if self.period_start and self.period_end:
            if getdate(self.period_end) < getdate(self.period_start):
                frappe.throw("Period End must be after Period Start")

        available = frappe.db.get_value("Budget Program", self.budget_program, "available_amount")
        if available is not None and flt(self.allocated_amount) > flt(available):
            frappe.throw(
                "Allocated Amount ({0}) exceeds available budget ({1}) in Budget Program {2}".format(
                    frappe.format_value(self.allocated_amount, {"fieldtype": "Currency"}),
                    frappe.format_value(available, {"fieldtype": "Currency"}),
                    self.budget_program
                )
            )

    def before_save(self):
        self.calculate_amounts()
        self.update_status()

    def calculate_amounts(self):
        self.remaining_amount = flt(self.allocated_amount) - flt(self.committed_amount) - flt(self.spent_amount)

    def update_status(self):
        if flt(self.remaining_amount) <= 0:
            self.status = "Fully Utilized"
        elif self.period_end and getdate(self.period_end) < getdate(today()):
            self.status = "Closed"
        else:
            self.status = "Active"
