import frappe
from frappe.model.document import Document
from frappe.utils import getdate, today, flt, cint


class MunicipalAsset(Document):
	VALID_STATUS_TRANSITIONS = {
		"In Procurement": ["In Service"],
		"In Service": ["Under Maintenance", "Out of Service"],
		"Under Maintenance": ["In Service", "Out of Service", "Decommissioned"],
		"Out of Service": ["In Service", "Under Maintenance", "Decommissioned"],
		"Decommissioned": ["Disposed"],
		"Disposed": [],
	}

	def validate(self):
		if flt(self.acquisition_cost) <= 0:
			frappe.throw("Acquisition Cost must be greater than 0")

		if self.depreciation_method and self.depreciation_method != "None":
			if cint(self.useful_life_years) <= 0:
				frappe.throw("Useful Life (Years) must be greater than 0 when depreciation method is set")

		if flt(self.salvage_value) >= flt(self.acquisition_cost):
			frappe.throw("Salvage Value must be less than Acquisition Cost")

		if self.asset_status == "In Service" and not self.custodian:
			frappe.throw("Custodian is required when Asset Status is 'In Service'")

		if self.asset_status == "Disposed":
			if not self.disposal_date:
				frappe.throw("Disposal Date is required when Asset Status is 'Disposed'")
			if not self.disposal_method:
				frappe.throw("Disposal Method is required when Asset Status is 'Disposed'")

		self.validate_status_transition()

	def before_save(self):
		self.calculate_depreciation()

	def calculate_depreciation(self):
		acquisition_cost = flt(self.acquisition_cost)
		salvage_value = flt(self.salvage_value)
		useful_life = cint(self.useful_life_years)

		if not self.depreciation_method or self.depreciation_method == "None" or not self.acquisition_date:
			self.accumulated_depreciation = 0
			self.current_value = acquisition_cost
			return

		today_date = getdate(today())
		acq_date = getdate(self.acquisition_date)
		depreciable_amount = acquisition_cost - salvage_value

		if depreciable_amount <= 0 or useful_life <= 0:
			self.accumulated_depreciation = 0
			self.current_value = acquisition_cost
			return

		if self.depreciation_method == "Straight Line":
			annual_dep = depreciable_amount / useful_life
			years_elapsed = (today_date - acq_date).days / 365.25
			if years_elapsed < 0:
				years_elapsed = 0
			accumulated = min(annual_dep * years_elapsed, depreciable_amount)
			self.accumulated_depreciation = flt(accumulated, 2)

		elif self.depreciation_method == "Declining Balance":
			rate = 2.0 / useful_life
			accumulated = 0
			book_value = acquisition_cost

			for year in range(useful_life):
				year_start = getdate(frappe.utils.add_days(acq_date, int(year * 365.25)))
				year_end = getdate(frappe.utils.add_days(acq_date, int((year + 1) * 365.25)))

				if today_date < year_start:
					break

				yearly_dep = book_value * rate
				yearly_dep = min(yearly_dep, book_value - salvage_value)

				if yearly_dep <= 0:
					break

				if today_date >= year_end:
					accumulated += yearly_dep
					book_value -= yearly_dep
				else:
					fraction = (today_date - year_start).days / 365.25
					accumulated += yearly_dep * fraction
					break

			accumulated = min(accumulated, depreciable_amount)
			self.accumulated_depreciation = flt(accumulated, 2)

		self.current_value = flt(acquisition_cost - flt(self.accumulated_depreciation), 2)

	def validate_status_transition(self):
		if self.is_new():
			return

		old_status = self.db_get("asset_status")
		if not old_status or old_status == self.asset_status:
			return

		allowed = self.VALID_STATUS_TRANSITIONS.get(old_status, [])
		if self.asset_status not in allowed:
			frappe.throw(
				f"Invalid status transition from '{old_status}' to '{self.asset_status}'. "
				f"Allowed transitions: {', '.join(allowed) if allowed else 'None'}"
			)
