import frappe
from frappe.model.document import Document
from frappe.utils import getdate, today, flt, cint


class CapitalProject(Document):
        PHASE_SEQUENCE = [
                "Planning", "Design", "Procurement", "Construction",
                "Commissioning", "Operational", "Closed"
        ]

        def validate(self):
                if flt(self.total_budget) <= 0:
                        frappe.throw("Total Budget must be greater than 0")

                if self.expected_end_date and self.start_date:
                        if getdate(self.expected_end_date) <= getdate(self.start_date):
                                frappe.throw("Expected End Date must be after Start Date")

                if self.completion_percentage is not None:
                        if flt(self.completion_percentage) < 0 or flt(self.completion_percentage) > 100:
                                frappe.throw("Completion Percentage must be between 0 and 100")

                if self.project_status == "Active" and not self.project_manager:
                        frappe.throw("Project Manager is required when Project Status is 'Active'")

                self.validate_phase_sequence()

        def before_save(self):
                self.calculate_financials()
                self.calculate_completion()
                self.calculate_risk_level()

        def calculate_financials(self):
                total_budget = flt(self.total_budget)

                try:
                        spent = frappe.db.sql("""
                                SELECT COALESCE(SUM(mi.grand_total), 0)
                                FROM `tabMunicipal Invoice` mi
                                WHERE mi.linked_project = %s AND mi.payment_status = 'Paid'
                        """, self.name)
                        self.spent_amount = flt(spent[0][0], 2) if spent else 0
                except Exception:
                        self.spent_amount = flt(self.spent_amount or 0, 2)

                try:
                        committed = frappe.db.sql("""
                                SELECT COALESCE(SUM(
                                        CASE WHEN cr.remaining_value IS NOT NULL AND cr.remaining_value > 0
                                        THEN cr.remaining_value
                                        ELSE cr.contract_value - COALESCE(cr.paid_amount, 0) END
                                ), 0)
                                FROM `tabContract Register` cr
                                WHERE cr.linked_project = %s AND cr.contract_status IN ('Active', 'Approved')
                        """, self.name)
                        self.committed_amount = flt(committed[0][0], 2) if committed else 0
                except Exception:
                        self.committed_amount = flt(self.committed_amount or 0, 2)

                self.remaining_budget = flt(total_budget - flt(self.spent_amount) - flt(self.committed_amount), 2)

                if total_budget > 0:
                        self.budget_utilization = flt(
                                (flt(self.spent_amount) + flt(self.committed_amount)) / total_budget * 100, 2
                        )
                else:
                        self.budget_utilization = 0

        def calculate_completion(self):
                if not self.milestones:
                        return

                total_weight = 0
                weighted_completion = 0

                for milestone in self.milestones:
                        weight = 1
                        total_weight += weight
                        weighted_completion += flt(milestone.completion_percentage) * weight

                if total_weight > 0:
                        self.completion_percentage = flt(weighted_completion / total_weight, 2)

        def calculate_risk_level(self):
                budget_util = flt(self.budget_utilization)
                completion = flt(self.completion_percentage)

                if budget_util > 90 and completion < 70:
                        self.risk_level = "Critical"
                        return

                if self.expected_end_date and self.start_date:
                        today_date = getdate(today())
                        start = getdate(self.start_date)
                        end = getdate(self.expected_end_date)
                        total_days = (end - start).days
                        elapsed_days = (today_date - start).days

                        if total_days > 0 and elapsed_days > 0:
                                expected_progress = (elapsed_days / total_days) * 100
                                if expected_progress - completion > 20:
                                        self.risk_level = "High"
                                        return

                if budget_util > 75:
                        self.risk_level = "Medium"
                else:
                        self.risk_level = "Low"

        def validate_phase_sequence(self):
                if self.is_new() or not self.current_phase:
                        return

                old_phase = self.db_get("current_phase")
                if not old_phase or old_phase == self.current_phase:
                        return

                if old_phase not in self.PHASE_SEQUENCE or self.current_phase not in self.PHASE_SEQUENCE:
                        return

                old_idx = self.PHASE_SEQUENCE.index(old_phase)
                new_idx = self.PHASE_SEQUENCE.index(self.current_phase)

                if new_idx < old_idx:
                        frappe.throw(
                                f"Invalid phase transition from '{old_phase}' to '{self.current_phase}'. "
                                f"Phase sequence: {' → '.join(self.PHASE_SEQUENCE)}"
                        )
