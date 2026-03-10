import frappe
from frappe.model.document import Document
from frappe.utils import getdate, today, flt


class FundingSource(Document):
    def validate(self):
        if flt(self.total_amount) <= 0 and flt(self.annual_amount) <= 0:
            frappe.throw("Total Amount or Annual Amount must be greater than 0")

        if self.valid_from and self.valid_to:
            if getdate(self.valid_to) < getdate(self.valid_from):
                frappe.throw("Valid To date must be after Valid From date")

        grant_types = ["Grant", "Donation", "Federal Grant", "State Grant"]
        if self.source_type in grant_types and not self.donor_organization:
            frappe.throw(
                "Donor Organization is required when Source Type is {0}".format(self.source_type)
            )

    def before_save(self):
        self.calculate_amounts()
        self.update_status()

    def calculate_amounts(self):
        allocated = frappe.db.sql(
            """SELECT COALESCE(SUM(bfs.allocated_amount), 0) as total
            FROM `tabBudget Funding Source` bfs
            INNER JOIN `tabBudget Program` bp ON bp.name = bfs.parent
            WHERE bfs.funding_source = %(name)s
            AND bfs.parenttype = 'Budget Program'""",
            {"name": self.name},
            as_dict=True
        )
        self.allocated_amount = flt(allocated[0].total) if allocated else 0

        utilized = frappe.db.sql(
            """SELECT COALESCE(SUM(bp.actual_amount), 0) as total
            FROM `tabBudget Funding Source` bfs
            INNER JOIN `tabBudget Program` bp ON bp.name = bfs.parent
            WHERE bfs.funding_source = %(name)s
            AND bfs.parenttype = 'Budget Program'""",
            {"name": self.name},
            as_dict=True
        )
        self.utilized_amount = flt(utilized[0].total) if utilized else 0

        base = flt(self.total_amount) or flt(self.annual_amount) or 0
        self.available_amount = base - flt(self.allocated_amount)

        denominator = flt(self.total_amount) or flt(self.annual_amount) or 1
        self.utilization_percentage = flt(self.utilized_amount) / denominator * 100

    def update_status(self):
        if flt(self.available_amount) <= 0:
            self.status = "Exhausted"
        elif self.valid_to and getdate(self.valid_to) < getdate(today()):
            self.status = "Expired"
        elif self.status != "Frozen":
            self.status = "Active"
