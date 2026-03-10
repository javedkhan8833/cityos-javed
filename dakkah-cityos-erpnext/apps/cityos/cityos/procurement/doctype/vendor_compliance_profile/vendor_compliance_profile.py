import frappe
from frappe.model.document import Document
from frappe.utils import getdate, today, flt, add_days


class VendorComplianceProfile(Document):

    def validate(self):
        self.validate_unique_supplier()
        self.validate_certificate_dates()
        self.validate_debarment()

    def before_save(self):
        self.update_certificate_statuses()
        self.calculate_compliance_score()
        self.calculate_risk_level()
        self.calculate_contract_stats()

    def validate_unique_supplier(self):
        if not self.linked_supplier:
            return

        existing = frappe.db.get_value(
            "Vendor Compliance Profile",
            {
                "linked_supplier": self.linked_supplier,
                "name": ("!=", self.name),
            },
            "name",
        )
        if existing:
            frappe.throw(
                f"A Vendor Compliance Profile already exists for supplier "
                f"'{self.linked_supplier}': {existing}"
            )

    def validate_certificate_dates(self):
        if not self.certificates:
            return

        for cert in self.certificates:
            if cert.issue_date and cert.expiry_date:
                if getdate(cert.expiry_date) <= getdate(cert.issue_date):
                    frappe.throw(
                        f"Certificate '{cert.certificate_type}' (Row {cert.idx}): "
                        f"Expiry Date must be after Issue Date."
                    )

    def calculate_compliance_score(self):
        certificates_valid_pct = 0
        if self.certificates:
            total_certs = len(self.certificates)
            valid_certs = sum(
                1 for c in self.certificates if c.status == "Valid"
            )
            certificates_valid_pct = (valid_certs / total_certs) * 30 if total_certs > 0 else 0

        performance_pct = flt(self.performance_rating or 0) / 5 * 25
        delivery_pct = flt(self.delivery_rating or 0) / 5 * 20
        quality_pct = flt(self.quality_rating or 0) / 5 * 15
        contract_pct = 10

        self.compliance_score = flt(
            certificates_valid_pct + performance_pct + delivery_pct + quality_pct + contract_pct,
            2,
        )

    def calculate_risk_level(self):
        score = flt(self.compliance_score)
        if score >= 80:
            self.risk_level = "Low"
        elif score >= 60:
            self.risk_level = "Medium"
        elif score >= 40:
            self.risk_level = "High"
        else:
            self.risk_level = "Critical"

    def update_certificate_statuses(self):
        if not self.certificates:
            return

        today_date = getdate(today())
        expiring_soon_date = getdate(add_days(today(), 30))

        for cert in self.certificates:
            if not cert.expiry_date:
                cert.status = "Valid"
                continue

            expiry = getdate(cert.expiry_date)
            if expiry < today_date:
                cert.status = "Expired"
            elif expiry <= expiring_soon_date:
                cert.status = "Expiring Soon"
            else:
                cert.status = "Valid"

    def calculate_contract_stats(self):
        if not self.linked_supplier:
            self.total_contracts = 0
            self.total_contract_value = 0
            self.active_contracts = 0
            return

        contracts = frappe.db.get_all(
            "Contract Register",
            filters={"linked_vendor": self.linked_supplier},
            fields=["name", "total_value", "contract_status", "status"],
        )

        self.total_contracts = len(contracts)
        self.total_contract_value = sum(flt(c.total_value) for c in contracts)
        self.active_contracts = sum(
            1 for c in contracts
            if c.status == "Active" or c.contract_status == "Active"
        )

    def validate_debarment(self):
        if self.debarment_status != "Debarred":
            return

        if not self.debarment_reason:
            frappe.throw("Debarment Reason is required when Debarment Status is 'Debarred'.")

        if not self.debarment_start_date:
            frappe.throw("Debarment Start Date is required when Debarment Status is 'Debarred'.")

        if not self.debarment_end_date:
            frappe.throw("Debarment End Date is required when Debarment Status is 'Debarred'.")

        if getdate(self.debarment_end_date) <= getdate(self.debarment_start_date):
            frappe.throw("Debarment End Date must be after Debarment Start Date.")
