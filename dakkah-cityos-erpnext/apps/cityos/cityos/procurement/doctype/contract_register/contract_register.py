import frappe
from frappe.model.document import Document
from frappe.utils import getdate, today, flt


class ContractRegister(Document):

    def validate(self):
        self.validate_dates()
        self.validate_contract_value()
        self.validate_linked_vendor()
        self.validate_payment_schedule_total()
        self.validate_milestone_payment_total()
        self.validate_status_transition()

    def before_save(self):
        self.calculate_amounts()
        self.calculate_sla_compliance()
        self.check_expiry()

    def validate_dates(self):
        if self.start_date and self.end_date:
            if getdate(self.end_date) <= getdate(self.start_date):
                frappe.throw("End Date must be after Start Date.")

    def validate_contract_value(self):
        if self.status != "Draft" and flt(self.contract_value) <= 0:
            frappe.throw("Contract Value must be greater than 0 for non-draft contracts.")

    def validate_linked_vendor(self):
        if self.status != "Draft" and not self.linked_vendor:
            frappe.throw("Linked Vendor is required for non-draft contracts.")

    def validate_payment_schedule_total(self):
        if not self.payment_schedule:
            return

        schedule_total = sum(flt(ps.amount) for ps in self.payment_schedule)
        total = flt(self.total_value) or (flt(self.contract_value) + flt(self.amended_value))

        if total > 0 and schedule_total > total:
            frappe.throw(
                f"Payment Schedule total ({schedule_total}) exceeds Total Contract Value ({total})."
            )

    def validate_milestone_payment_total(self):
        if not self.milestones:
            return

        milestone_total = sum(flt(m.payment_amount) for m in self.milestones if m.payment_linked)
        total = flt(self.total_value) or (flt(self.contract_value) + flt(self.amended_value))

        if total > 0 and milestone_total > total:
            frappe.throw(
                f"Milestone payment total ({milestone_total}) exceeds Total Contract Value ({total})."
            )

    def calculate_amounts(self):
        if self.amendments:
            self.amended_value = sum(flt(a.value_change) for a in self.amendments)

        self.total_value = flt(self.contract_value) + flt(self.amended_value)

        paid = 0
        if self.name:
            invoices = frappe.db.get_all(
                "Municipal Invoice",
                filters={
                    "linked_contract": self.name,
                    "payment_status": "Paid",
                },
                fields=["grand_total"],
            )
            paid = sum(flt(inv.grand_total) for inv in invoices)

        self.paid_amount = paid
        self.remaining_value = flt(self.total_value) - flt(self.paid_amount)
        self.retention_amount = flt(self.paid_amount) * flt(self.retention_percentage) / 100

    def calculate_sla_compliance(self):
        if not self.milestones:
            self.sla_compliance_percentage = 0
            return

        completed = [m for m in self.milestones if m.status == "Completed"]
        total = len(completed)

        if total == 0:
            self.sla_compliance_percentage = 0
            return

        on_time = 0
        for m in completed:
            if m.due_date and m.completion_date:
                if getdate(m.completion_date) <= getdate(m.due_date):
                    on_time += 1
            elif m.completion_date and not m.due_date:
                on_time += 1

        self.sla_compliance_percentage = flt(on_time / total * 100, 2)

    def validate_status_transition(self):
        if not self.has_value_changed("contract_status"):
            return

        previous = self.get_doc_before_save()
        if not previous:
            return

        old_status = previous.contract_status
        new_status = self.contract_status

        if old_status == new_status:
            return

        valid_transitions = {
            "Draft": ["Under Review"],
            "Under Review": ["Active", "Draft"],
            "Active": ["Under Amendment", "Suspended", "Expired", "Terminated", "Renewed"],
            "Under Amendment": ["Active", "Terminated"],
            "Suspended": ["Active", "Terminated"],
            "Expired": ["Renewed"],
            "Renewed": ["Active"],
            "Terminated": [],
        }

        allowed = valid_transitions.get(old_status, [])
        if new_status not in allowed:
            frappe.throw(
                f"Contract status transition from '{old_status}' to '{new_status}' is not allowed. "
                f"Allowed transitions: {', '.join(allowed) if allowed else 'None'}"
            )

    def check_expiry(self):
        if (
            self.end_date
            and self.status == "Active"
            and getdate(self.end_date) < getdate(today())
        ):
            self.status = "Expired"
            if self.contract_status == "Active":
                self.contract_status = "Expired"
