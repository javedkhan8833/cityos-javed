import frappe
from frappe.model.document import Document
from frappe.utils import getdate, today, flt


class MunicipalInvoice(Document):
    def validate(self):
        if not flt(self.grand_total):
            frappe.throw("Grand Total is required and must not be zero")

        if flt(self.grand_total) <= 0 and self.invoice_type != "Credit Note":
            if flt(self.grand_total) < 0 and self.invoice_type == "Credit Note":
                pass
            elif flt(self.grand_total) <= 0:
                frappe.throw("Grand Total must be greater than 0")

        if not self.due_date:
            frappe.msgprint("Due Date should be set for proper payment tracking", indicator="orange")

        if self.billing_period_start and self.billing_period_end:
            if getdate(self.billing_period_end) < getdate(self.billing_period_start):
                frappe.throw("Billing Period End must be after Billing Period Start")

        self.validate_budget()

    def before_save(self):
        self.calculate_payment_fields()
        self.update_payment_status()

    def calculate_payment_fields(self):
        self.outstanding_amount = flt(self.grand_total) - flt(self.paid_amount)

        if (
            self.due_date
            and flt(self.outstanding_amount) > 0
            and self.status not in ["Paid", "Written Off", "Cancelled"]
        ):
            days_diff = (getdate(today()) - getdate(self.due_date)).days
            self.overdue_days = max(0, days_diff)
        else:
            self.overdue_days = 0

        if self.overdue_days > 0 and flt(self.late_fee_rate) > 0:
            self.late_fee_amount = (
                flt(self.outstanding_amount) * flt(self.late_fee_rate) / 100 * self.overdue_days / 365
            )
        else:
            self.late_fee_amount = 0

    def update_payment_status(self):
        if flt(self.paid_amount) >= flt(self.grand_total) and flt(self.grand_total) > 0:
            self.payment_status = "Paid"
        elif flt(self.paid_amount) > 0:
            self.payment_status = "Partially Paid"
        elif self.due_date and getdate(self.due_date) < getdate(today()):
            self.payment_status = "Overdue"
        else:
            self.payment_status = "Unpaid"

    def validate_budget(self):
        if not self.budget_program:
            return
        available = frappe.db.get_value("Budget Program", self.budget_program, "available_amount")
        if available is not None and flt(available) < flt(self.grand_total):
            frappe.throw(
                "Insufficient budget in {0}. Available: {1}, Required: {2}".format(
                    self.budget_program,
                    frappe.format_value(available, {"fieldtype": "Currency"}),
                    frappe.format_value(self.grand_total, {"fieldtype": "Currency"})
                )
            )

    def on_submit(self):
        if self.budget_program:
            budget = frappe.get_doc("Budget Program", self.budget_program)
            budget.calculate_amounts()
            budget.save(ignore_permissions=True)
