import frappe
from frappe.model.document import Document
from frappe.utils import getdate, today, flt, now_datetime


class BudgetProgram(Document):
    def validate(self):
        if not self.fiscal_year:
            frappe.throw("Fiscal Year is required for Budget Program")
        if not self.budget_type:
            frappe.throw("Budget Type is required for Budget Program")
        if flt(self.total_budget) <= 0:
            frappe.throw("Total Budget must be greater than 0")

        if self.funding_sources and flt(self.approved_amount) > 0:
            total_funding = sum(flt(row.allocated_amount) for row in self.funding_sources)
            if abs(total_funding - flt(self.approved_amount)) > 0.01:
                frappe.throw(
                    "Total of Funding Sources ({0}) must match Approved Amount ({1})".format(
                        frappe.format_value(total_funding, {"fieldtype": "Currency"}),
                        frappe.format_value(self.approved_amount, {"fieldtype": "Currency"})
                    )
                )

        self.validate_status_transition()

    def before_save(self):
        self.calculate_amounts()
        self.calculate_funding_percentages()

    def calculate_amounts(self):
        committed = frappe.db.sql(
            """SELECT COALESCE(SUM(estimated_amount), 0) as total
            FROM `tabCityOS Procurement Request`
            WHERE budget_program = %(name)s
            AND status IN ('Approved', 'Active')""",
            {"name": self.name},
            as_dict=True
        )
        self.committed_amount = flt(committed[0].total) if committed else 0

        actual = frappe.db.sql(
            """SELECT COALESCE(SUM(grand_total), 0) as total
            FROM `tabMunicipal Invoice`
            WHERE budget_program = %(name)s
            AND payment_status = 'Paid'
            AND docstatus = 1""",
            {"name": self.name},
            as_dict=True
        )
        self.actual_amount = flt(actual[0].total) if actual else 0

        base_amount = flt(self.approved_amount) or flt(self.total_budget)
        self.available_amount = base_amount - flt(self.committed_amount) - flt(self.actual_amount)
        self.remaining_amount = flt(self.total_budget) - flt(self.spent_amount)

        if flt(self.approved_amount) > 0:
            self.utilization_percentage = (
                (flt(self.committed_amount) + flt(self.actual_amount)) / flt(self.approved_amount) * 100
            )
        else:
            self.utilization_percentage = 0

    def calculate_funding_percentages(self):
        if not self.funding_sources or not flt(self.approved_amount):
            return
        for row in self.funding_sources:
            row.percentage = flt(row.allocated_amount) / flt(self.approved_amount) * 100

    def validate_status_transition(self):
        if self.is_new():
            return

        old_status = frappe.db.get_value("Budget Program", self.name, "status")
        if not old_status or old_status == self.status:
            return

        valid_transitions = {
            "Draft": ["Submitted"],
            "Submitted": ["Under Review"],
            "Under Review": ["Approved", "Rejected"],
            "Approved": ["Active"],
            "Active": ["Revision Requested", "Closed"],
        }

        allowed = valid_transitions.get(old_status, [])
        if self.status not in allowed:
            frappe.throw(
                "Invalid status transition from {0} to {1}. Allowed transitions: {2}".format(
                    old_status, self.status, ", ".join(allowed) if allowed else "None"
                )
            )

    def on_update(self):
        if self.status == "Approved" and not self.approved_date:
            frappe.db.set_value("Budget Program", self.name, "approved_date", today())
