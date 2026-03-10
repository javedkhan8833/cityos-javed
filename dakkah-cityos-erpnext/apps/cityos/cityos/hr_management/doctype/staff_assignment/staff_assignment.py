import frappe
from frappe.model.document import Document
from frappe.utils import flt, cint, getdate, today


class StaffAssignment(Document):
	def validate(self):
		if not self.employee:
			frappe.throw("Employee is required")

		if not self.position:
			frappe.throw("Position is required")

		if not self.effective_from:
			frappe.throw("Effective From date is required")

		if self.assignment_type not in ("Permanent",) and not self.effective_to:
			frappe.throw("Effective To date is required for non-permanent assignments")

		if self.effective_to and getdate(self.effective_to) < getdate(self.effective_from):
			frappe.throw("Effective To date cannot be before Effective From date")

		self.validate_salary_range()
		self.validate_position_vacancy()
		self.validate_no_duplicate_active()

	def validate_salary_range(self):
		if not self.salary_amount or not self.position:
			return

		position = frappe.get_doc("Position Control", self.position)
		if flt(position.min_salary) > 0 and flt(self.salary_amount) < flt(position.min_salary):
			frappe.throw(
				f"Salary Amount {self.salary_amount} is below the minimum salary "
				f"{position.min_salary} for this position"
			)
		if flt(position.max_salary) > 0 and flt(self.salary_amount) > flt(position.max_salary):
			frappe.throw(
				f"Salary Amount {self.salary_amount} exceeds the maximum salary "
				f"{position.max_salary} for this position"
			)

	def validate_position_vacancy(self):
		if self.assignment_type in ("Acting", "Interim"):
			return

		if not self.position:
			return

		if not self.is_new() and self.db_get("position") == self.position and self.db_get("approval_status") == "Approved":
			return

		position = frappe.get_doc("Position Control", self.position)
		position.calculate_headcount()

		if cint(position.vacancy_count) <= 0:
			frappe.throw(
				f"Position '{position.position_title}' has no vacancies. "
				f"Max Headcount: {position.max_headcount}, Filled: {position.filled_count}"
			)

	def validate_no_duplicate_active(self):
		if self.assignment_type != "Permanent" or self.approval_status != "Approved":
			return

		today_date = today()
		filters = {
			"employee": self.employee,
			"assignment_type": "Permanent",
			"approval_status": "Approved",
			"name": ["!=", self.name],
		}

		existing = frappe.db.sql("""
			SELECT name FROM `tabStaff Assignment`
			WHERE employee = %s
			AND assignment_type = 'Permanent'
			AND approval_status = 'Approved'
			AND name != %s
			AND effective_from <= %s
			AND (effective_to IS NULL OR effective_to = '' OR effective_to >= %s)
		""", (self.employee, self.name or "NEW", today_date, today_date))

		if existing:
			frappe.throw(
				f"Employee {self.employee} already has an active permanent assignment ({existing[0][0]}). "
				"An employee cannot have two active permanent assignments."
			)

	def before_save(self):
		self.fetch_related_fields()

	def fetch_related_fields(self):
		if self.employee:
			employee_name = frappe.db.get_value("Employee", self.employee, "employee_name")
			if employee_name:
				self.employee_name = employee_name

		if self.position:
			position_data = frappe.db.get_value(
				"Position Control", self.position,
				["position_title", "department"], as_dict=True
			)
			if position_data:
				self.position_title = position_data.position_title
				self.department = position_data.department

	def on_update(self):
		if not self.is_new():
			old_status = self.db_get("approval_status")
			if old_status != self.approval_status and self.approval_status == "Approved":
				self.update_position_headcount()

	def update_position_headcount(self):
		if self.position:
			position = frappe.get_doc("Position Control", self.position)
			position.calculate_headcount()
			position.db_set("filled_count", position.filled_count)
			position.db_set("vacancy_count", position.vacancy_count)
