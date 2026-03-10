import frappe
from frappe.model.document import Document
from frappe.utils import flt, cint, getdate, today


class MunicipalFacility(Document):
	def validate(self):
		if flt(self.total_area_sqm) > 0 and flt(self.usable_area_sqm) > flt(self.total_area_sqm):
			frappe.throw("Usable Area (sqm) cannot exceed Total Area (sqm)")

		if cint(self.capacity) > 0 and cint(self.current_occupancy) > cint(self.capacity):
			frappe.throw("Current Occupancy cannot exceed Capacity")

		if self.facility_status == "Active" and not self.facility_manager:
			frappe.throw("Facility Manager is required when Facility Status is 'Active'")

		if self.year_built:
			current_year = getdate(today()).year
			if cint(self.year_built) <= 1800:
				frappe.throw("Year Built must be after 1800")
			if cint(self.year_built) > current_year:
				frappe.throw(f"Year Built cannot be in the future (current year: {current_year})")

	def before_save(self):
		self.calculate_occupancy_rate()

	def calculate_occupancy_rate(self):
		capacity = cint(self.capacity)
		occupancy = cint(self.current_occupancy)
		if capacity > 0:
			self.occupancy_rate = flt(occupancy / capacity * 100, 2)
		else:
			self.occupancy_rate = 0
