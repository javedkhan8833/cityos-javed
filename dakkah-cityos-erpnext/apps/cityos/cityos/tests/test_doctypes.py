import unittest
from unittest.mock import patch, MagicMock


class TestCityOSScope(unittest.TestCase):

    @patch("cityos.governance.doctype.cityos_scope.cityos_scope.frappe")
    def test_scope_code_uppercased(self, mock_frappe):
        from cityos.governance.doctype.cityos_scope.cityos_scope import CityOSScope
        doc = MagicMock()
        doc.scope_code = "urb-dev"
        CityOSScope.validate(doc)
        self.assertEqual(doc.scope_code, "URB-DEV")


class TestCityOSCategory(unittest.TestCase):

    @patch("cityos.governance.doctype.cityos_category.cityos_category.frappe")
    def test_category_code_uppercased(self, mock_frappe):
        from cityos.governance.doctype.cityos_category.cityos_category import CityOSCategory
        doc = MagicMock()
        doc.category_code = "edu-001"
        CityOSCategory.validate(doc)
        self.assertEqual(doc.category_code, "EDU-001")


class TestCityOSSubcategory(unittest.TestCase):

    @patch("cityos.governance.doctype.cityos_subcategory.cityos_subcategory.frappe")
    def test_subcategory_code_uppercased(self, mock_frappe):
        from cityos.governance.doctype.cityos_subcategory.cityos_subcategory import CityOSSubcategory
        doc = MagicMock()
        doc.subcategory_code = "k12-001"
        CityOSSubcategory.validate(doc)
        self.assertEqual(doc.subcategory_code, "K12-001")


class TestCityOSStore(unittest.TestCase):

    @patch("cityos.governance.doctype.cityos_store.cityos_store.frappe")
    def test_store_handle_lowercased(self, mock_frappe):
        from cityos.governance.doctype.cityos_store.cityos_store import CityOSStore
        doc = MagicMock()
        doc.store_handle = "Downtown Store"
        doc.store_name = "Downtown Store"
        CityOSStore.validate(doc)
        self.assertEqual(doc.store_handle, "downtown-store")

    @patch("cityos.governance.doctype.cityos_store.cityos_store.frappe")
    def test_store_handle_from_name(self, mock_frappe):
        from cityos.governance.doctype.cityos_store.cityos_store import CityOSStore
        doc = MagicMock()
        doc.store_handle = ""
        doc.store_name = "City Center"
        CityOSStore.validate(doc)
        self.assertEqual(doc.store_handle, "city-center")


class TestCityOSPortal(unittest.TestCase):

    @patch("cityos.governance.doctype.cityos_portal.cityos_portal.frappe")
    def test_portal_handle_lowercased(self, mock_frappe):
        from cityos.governance.doctype.cityos_portal.cityos_portal import CityOSPortal
        doc = MagicMock()
        doc.portal_handle = "Main Portal"
        doc.portal_name = "Main Portal"
        doc.store = ""
        doc.tenant = ""
        CityOSPortal.validate(doc)
        self.assertEqual(doc.portal_handle, "main-portal")

    @patch("cityos.governance.doctype.cityos_portal.cityos_portal.frappe")
    def test_portal_inherits_tenant_from_store(self, mock_frappe):
        from cityos.governance.doctype.cityos_portal.cityos_portal import CityOSPortal
        mock_store = MagicMock()
        mock_store.tenant = "T1"
        mock_frappe.get_doc.return_value = mock_store
        doc = MagicMock()
        doc.portal_handle = "test"
        doc.portal_name = "Test"
        doc.store = "Store-1"
        doc.tenant = ""
        CityOSPortal.validate(doc)
        self.assertEqual(doc.tenant, "T1")


class TestAuditLog(unittest.TestCase):

    @patch("cityos.governance.audit.frappe")
    def test_exempt_doctype_skips_audit(self, mock_frappe):
        from cityos.governance.audit import log_document_create
        doc = MagicMock()
        doc.doctype = "CityOS Audit Log"
        log_document_create(doc, "after_insert")
        mock_frappe.new_doc.assert_not_called()

    @patch("cityos.governance.audit.frappe")
    def test_non_cityos_aware_skips_audit(self, mock_frappe):
        from cityos.governance.audit import log_document_create
        doc = MagicMock()
        doc.doctype = "Sales Invoice"
        doc.meta.has_field.return_value = False
        log_document_create(doc, "after_insert")
        mock_frappe.new_doc.assert_not_called()

    @patch("cityos.governance.audit.frappe")
    def test_cityos_aware_doc_creates_audit(self, mock_frappe):
        from cityos.governance.audit import log_document_create
        mock_frappe.db.exists.return_value = True
        mock_frappe.session.user = "admin@test.com"
        doc = MagicMock()
        doc.doctype = "Sales Invoice"
        doc.name = "INV-001"
        doc.meta.has_field.return_value = True
        doc.cityos_tenant = "T1"
        doc.cityos_country = "SA"
        doc.cityos_city = ""
        doc.cityos_correlation_id = ""
        doc.cityos_scope = ""
        doc.cityos_store = ""
        mock_audit = MagicMock()
        mock_frappe.new_doc.return_value = mock_audit
        log_document_create(doc, "after_insert")
        mock_frappe.new_doc.assert_called_with("CityOS Audit Log")
        mock_audit.insert.assert_called()

    @patch("cityos.governance.audit.frappe")
    def test_delete_creates_audit(self, mock_frappe):
        from cityos.governance.audit import log_document_delete
        mock_frappe.db.exists.return_value = True
        mock_frappe.session.user = "admin@test.com"
        doc = MagicMock()
        doc.doctype = "Sales Invoice"
        doc.name = "INV-001"
        doc.meta.has_field.return_value = True
        doc.cityos_tenant = ""
        doc.cityos_country = ""
        doc.cityos_city = ""
        doc.cityos_correlation_id = ""
        doc.cityos_scope = ""
        doc.cityos_store = ""
        mock_audit = MagicMock()
        mock_frappe.new_doc.return_value = mock_audit
        log_document_delete(doc, "on_trash")
        mock_frappe.new_doc.assert_called_with("CityOS Audit Log")


if __name__ == "__main__":
    unittest.main()
