import frappe
from frappe.model.document import Document
from frappe.utils import getdate, today, flt, add_days


class MaintenancePlan(Document):
	RECURRENCE_DAYS = {
		"Weekly": 7,
		"Bi-Weekly": 14,
		"Monthly": 30,
		"Quarterly": 90,
		"Semi-Annual": 182,
		"Annual": 365,
	}

	def validate(self):
		if not self.asset and not self.facility:
			frappe.throw("Either Asset or Facility must be set")

		if not self.scheduled_date:
			frappe.throw("Scheduled Date is required")

		if flt(self.estimated_cost) <= 0:
			frappe.throw("Estimated Cost must be greater than 0")

		if not self.assigned_to and not self.assigned_contractor:
			frappe.throw("Either Assigned To or Assigned Contractor is required")

	def before_save(self):
		self.calculate_actual_cost()
		self.check_overdue()

	def calculate_actual_cost(self):
		total = 0
		if self.parts_used:
			for part in self.parts_used:
				total += flt(part.amount)
		self.actual_cost = flt(total, 2)

	def check_overdue(self):
		if self.maintenance_status == "Scheduled" and self.scheduled_date:
			if getdate(self.scheduled_date) < getdate(today()):
				self.maintenance_status = "Overdue"

	def calculate_next_date(self):
		if not self.recurrence_pattern or self.recurrence_pattern == "None":
			self.next_scheduled_date = None
			return

		base_date = getdate(self.completion_date) if self.completion_date else getdate(self.scheduled_date)
		days = self.RECURRENCE_DAYS.get(self.recurrence_pattern, 0)

		if days > 0:
			self.next_scheduled_date = add_days(base_date, days)
		else:
			self.next_scheduled_date = None

	def on_update(self):
		if self.maintenance_status == "Completed":
			self.on_complete()

	def on_complete(self):
		if not self.completion_date:
			self.completion_date = today()
			self.db_set("completion_date", self.completion_date)

		self.calculate_next_date()
		if self.next_scheduled_date:
			self.db_set("next_scheduled_date", self.next_scheduled_date)

		if self.recurrence_pattern and self.recurrence_pattern != "None" and self.next_scheduled_date:
			self.create_next_plan()

	def create_next_plan(self):
		new_plan = frappe.copy_doc(self)
		new_plan.scheduled_date = self.next_scheduled_date
		new_plan.maintenance_status = "Scheduled"
		new_plan.completion_date = None
		new_plan.next_scheduled_date = None
		new_plan.completion_notes = None
		new_plan.actual_cost = 0
		new_plan.parts_used = []
		new_plan.work_order_number = None
		new_plan.downtime_hours = 0
		new_plan.insert(ignore_permissions=True)
