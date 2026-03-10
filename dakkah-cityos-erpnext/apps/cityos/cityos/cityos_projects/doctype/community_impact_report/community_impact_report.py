import frappe
from frappe.model.document import Document
from frappe.utils import flt


class CommunityImpactReport(Document):
	def validate(self):
		if not self.linked_project:
			frappe.throw("Linked Project is required")

		if not self.assessor:
			frappe.throw("Assessor is required")

		if not self.report_date:
			frappe.throw("Report Date is required")

		self.validate_impact_scores()

		if self.report_status == "Published":
			self.validate_publishable()

	def validate_impact_scores(self):
		score_fields = {
			"Social Impact Score": self.social_impact_score,
			"Economic Impact Score": self.economic_impact_score,
			"Environmental Impact Score": self.environmental_impact_score,
		}

		for label, value in score_fields.items():
			if value is not None and value != 0:
				if flt(value) < 0 or flt(value) > 10:
					frappe.throw(f"{label} must be between 0 and 10")

	def validate_publishable(self):
		missing = []
		if not self.social_impact_score and self.social_impact_score != 0:
			missing.append("Social Impact Score")
		if not self.economic_impact_score and self.economic_impact_score != 0:
			missing.append("Economic Impact Score")
		if not self.environmental_impact_score and self.environmental_impact_score != 0:
			missing.append("Environmental Impact Score")

		if missing:
			frappe.throw(
				f"Cannot publish report without all impact scores filled. "
				f"Missing: {', '.join(missing)}"
			)

	def before_save(self):
		self.calculate_overall_score()

	def calculate_overall_score(self):
		scores = []
		if self.social_impact_score is not None:
			scores.append(flt(self.social_impact_score))
		if self.economic_impact_score is not None:
			scores.append(flt(self.economic_impact_score))
		if self.environmental_impact_score is not None:
			scores.append(flt(self.environmental_impact_score))

		if scores:
			self.overall_impact_score = flt(sum(scores) / len(scores), 2)
		else:
			self.overall_impact_score = 0
