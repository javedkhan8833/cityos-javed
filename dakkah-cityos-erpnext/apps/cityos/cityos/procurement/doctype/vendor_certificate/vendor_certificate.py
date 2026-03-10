import frappe
from frappe.model.document import Document
from frappe.utils import getdate, today


class VendorCertificate(Document):
    def validate(self):
        if self.expiry_date:
            if getdate(self.expiry_date) < getdate(today()):
                self.status = "Expired"
            elif (getdate(self.expiry_date) - getdate(today())).days <= 30:
                self.status = "Expiring Soon"
            else:
                self.status = "Valid"
