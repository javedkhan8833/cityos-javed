import frappe
from frappe.model.document import Document
from frappe.utils import flt, cint, getdate, today


class PositionControl(Document):
	def validate(self):
		if cint(self.max_headcount) < 1:
			frappe.throw("Max Headcount must be at least 1")

		if flt(self.min_salary) > flt(self.max_salary) and flt(self.max_salary) > 0:
			frappe.throw("Minimum Salary cannot exceed Maximum Salary")

		if not self.department:
			frappe.throw("Department is required")

		if not self.designation:
			frappe.throw("Designation is required")

		if self.reports_to and self.reports_to == self.name:
			frappe.throw("Position cannot report to itself")

		if self.is_frozen or self.position_status == "Frozen":
			active_count = self.get_active_assignment_count()
			if active_count > 0:
				frappe.throw(
					f"Cannot freeze position with {active_count} active assignment(s). "
					"Please end all active assignments first."
				)

		if self.position_status == "Abolished":
			active_count = self.get_active_assignment_count()
			if active_count > 0:
				frappe.throw(
					f"Cannot abolish position with {active_count} active assignment(s). "
					"Please end all active assignments first."
				)

	def before_save(self):
		self.calculate_headcount()

	def calculate_headcount(self):
		if self.is_new():
			self.filled_count = 0
			self.vacancy_count = cint(self.max_headcount)
			return

		today_date = today()
		filled = frappe.db.count("Staff Assignment", filters={
			"position": self.name,
			"approval_status": "Approved",
			"effective_from": ["<=", today_date],
		})

		active_with_end = frappe.db.count("Staff Assignment", filters={
			"position": self.name,
			"approval_status": "Approved",
			"effective_from": ["<=", today_date],
			"effective_to": ["<", today_date],
			"effective_to": ["is", "set"],
		})

		filled_count = frappe.db.sql("""
			SELECT COUNT(*) FROM `tabStaff Assignment`
			WHERE position = %s
			AND approval_status = 'Approved'
			AND effective_from <= %s
			AND (effective_to IS NULL OR effective_to = '' OR effective_to >= %s)
		""", (self.name, today_date, today_date))[0][0]

		self.filled_count = cint(filled_count)
		self.vacancy_count = max(0, cint(self.max_headcount) - self.filled_count)

	def get_active_assignment_count(self):
		if self.is_new():
			return 0

		today_date = today()
		return frappe.db.sql("""
			SELECT COUNT(*) FROM `tabStaff Assignment`
			WHERE position = %s
			AND approval_status = 'Approved'
			AND effective_from <= %s
			AND (effective_to IS NULL OR effective_to = '' OR effective_to >= %s)
		""", (self.name, today_date, today_date))[0][0]
