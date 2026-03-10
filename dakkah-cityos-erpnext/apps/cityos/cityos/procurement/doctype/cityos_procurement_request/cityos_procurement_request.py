import frappe
from frappe.model.document import Document
from frappe.utils import getdate, today, flt, cint, now_datetime


class CityOSProcurementRequest(Document):

    def validate(self):
        self.validate_required_by_date()
        self.calculate_item_totals()
        self.validate_procurement_method()
        self.validate_budget()
        self.validate_mandatory_documents()
        self.validate_status_transition()

    def before_save(self):
        self.calculate_item_totals()
        self.set_approval_level()
        if not self.request_date:
            self.request_date = today()

    def on_update(self):
        if self.has_value_changed("status") and self.status == "Approved":
            self.db_set("approved_date", today())
            self.db_set("approved_by", frappe.session.user)

    def validate_required_by_date(self):
        if self.required_by_date and getdate(self.required_by_date) < getdate(today()):
            frappe.throw("Required By Date must be today or a future date.")

    def calculate_item_totals(self):
        if self.items:
            total = sum(flt(item.estimated_amount) for item in self.items)
            self.estimated_amount = total
            if self.estimated_cost is not None:
                self.estimated_cost = total

    def validate_procurement_method(self):
        if not self.procurement_method:
            return

        amount = flt(self.estimated_amount)
        method = self.procurement_method

        if amount < 10000:
            pass
        elif amount <= 100000:
            if method == "Direct Purchase":
                frappe.throw(
                    f"Procurement method '{method}' is not allowed for estimated amount "
                    f"{amount}. Amount between 10,000 and 100,000 requires Limited Tender or above."
                )
        else:
            if method not in ("Open Tender", "Framework Agreement"):
                frappe.throw(
                    f"Procurement method '{method}' is not allowed for estimated amount "
                    f"{amount}. Amount above 100,000 requires Open Tender or Framework Agreement."
                )

    def validate_budget(self):
        if not self.budget_program:
            return

        budget = frappe.db.get_value(
            "Budget Program", self.budget_program, "available_amount"
        )
        if budget is not None and flt(budget) < flt(self.estimated_amount):
            frappe.throw(
                f"Insufficient budget. Available amount ({flt(budget)}) in Budget Program "
                f"'{self.budget_program}' is less than estimated amount ({flt(self.estimated_amount)})."
            )

    def validate_mandatory_documents(self):
        if not self.required_documents:
            return

        missing = []
        for doc in self.required_documents:
            if cint(doc.is_mandatory) and not cint(doc.is_attached):
                missing.append(doc.document_name)

        if missing and self.docstatus == 1:
            frappe.throw(
                "The following mandatory documents must be attached before submitting: "
                + ", ".join(missing)
            )

    def validate_status_transition(self):
        if not self.has_value_changed("status"):
            return

        previous = self.get_doc_before_save()
        if not previous:
            return

        old_status = previous.status
        new_status = self.status

        if old_status == new_status:
            return

        valid_transitions = {
            "Draft": ["Submitted"],
            "Submitted": ["Budget Verified", "Returned for Revision", "Rejected", "Cancelled"],
            "Budget Verified": ["Under Review", "Returned for Revision", "Rejected", "Cancelled"],
            "Under Review": ["Approved", "Returned for Revision", "Rejected", "Cancelled"],
            "Approved": ["RFQ Issued", "Cancelled"],
            "Returned for Revision": ["Submitted", "Cancelled"],
            "RFQ Issued": ["Vendor Selected", "Cancelled"],
            "Vendor Selected": ["PO Created", "Cancelled"],
            "PO Created": ["Received", "Cancelled"],
            "Received": ["Closed"],
            "Rejected": [],
            "Closed": [],
            "Cancelled": [],
        }

        allowed = valid_transitions.get(old_status, [])
        if new_status not in allowed:
            frappe.throw(
                f"Status transition from '{old_status}' to '{new_status}' is not allowed. "
                f"Allowed transitions: {', '.join(allowed) if allowed else 'None'}"
            )

    def set_approval_level(self):
        amount = flt(self.estimated_amount)
        if amount < 50000:
            self.approval_level = "Department Head"
        elif amount <= 500000:
            self.approval_level = "Director"
        else:
            self.approval_level = "Committee"
