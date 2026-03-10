import unittest
from unittest.mock import patch, MagicMock


class TestNodeContextValidation(unittest.TestCase):

    def _make_mock_doc(self, **kwargs):
        doc = MagicMock()
        doc.doctype = kwargs.get("doctype", "Sales Invoice")
        doc.name = kwargs.get("name", "INV-001")
        doc.flags = MagicMock()
        doc.flags.ignore_node_context = kwargs.get("ignore_node_context", False)
        doc.cityos_tenant = kwargs.get("cityos_tenant", "")
        doc.cityos_scope = kwargs.get("cityos_scope", "")
        doc.cityos_category = kwargs.get("cityos_category", "")
        doc.cityos_subcategory = kwargs.get("cityos_subcategory", "")
        doc.cityos_store = kwargs.get("cityos_store", "")
        mock_meta = MagicMock()
        mock_meta.has_field = MagicMock(return_value=True)
        doc.meta = mock_meta
        return doc

    @patch("cityos.governance.node_context.frappe")
    def test_exempt_doctype_skips_validation(self, mock_frappe):
        from cityos.governance.node_context import validate_node_context
        doc = self._make_mock_doc(doctype="CityOS Audit Log")
        validate_node_context(doc, "validate")
        mock_frappe.throw.assert_not_called()

    @patch("cityos.governance.node_context.frappe")
    def test_non_cityos_field_skips_validation(self, mock_frappe):
        from cityos.governance.node_context import validate_node_context
        doc = self._make_mock_doc(doctype="Sales Invoice")
        doc.meta.has_field.return_value = False
        validate_node_context(doc, "validate")
        mock_frappe.throw.assert_not_called()

    @patch("cityos.governance.node_context.frappe")
    def test_ignore_flag_skips_validation(self, mock_frappe):
        from cityos.governance.node_context import validate_node_context
        doc = self._make_mock_doc(doctype="Sales Invoice", ignore_node_context=True)
        doc.flags.ignore_node_context = True
        validate_node_context(doc, "validate")
        mock_frappe.throw.assert_not_called()

    @patch("cityos.governance.node_context.frappe")
    def test_default_tenant_assigned_for_non_admin(self, mock_frappe):
        from cityos.governance.node_context import validate_node_context
        mock_frappe.session.user = "test@example.com"
        mock_frappe.db.get_default.return_value = "DefaultTenant"
        mock_frappe.db.get_value.return_value = None
        doc = self._make_mock_doc(doctype="Sales Invoice", cityos_tenant="")
        validate_node_context(doc, "validate")
        self.assertEqual(doc.cityos_tenant, "DefaultTenant")

    @patch("cityos.governance.node_context.frappe")
    def test_category_scope_mismatch_throws(self, mock_frappe):
        from cityos.governance.node_context import validate_node_context
        mock_frappe.session.user = "Administrator"
        mock_frappe.db.get_value.return_value = "Scope-B"
        doc = self._make_mock_doc(
            doctype="Sales Invoice",
            cityos_tenant="T1",
            cityos_scope="Scope-A",
            cityos_category="Cat-1"
        )
        validate_node_context(doc, "validate")
        mock_frappe.throw.assert_called()
        call_args = mock_frappe.throw.call_args
        self.assertIn("does not belong to Scope", str(call_args))

    @patch("cityos.governance.node_context.frappe")
    def test_subcategory_category_mismatch_throws(self, mock_frappe):
        from cityos.governance.node_context import validate_node_context
        mock_frappe.session.user = "Administrator"
        def get_value_side_effect(doctype, name, field):
            if doctype == "CityOS Category":
                return None
            if doctype == "CityOS Subcategory":
                return "Cat-Other"
            return None
        mock_frappe.db.get_value.side_effect = get_value_side_effect
        doc = self._make_mock_doc(
            doctype="Sales Invoice",
            cityos_tenant="T1",
            cityos_category="Cat-1",
            cityos_subcategory="SubCat-1"
        )
        validate_node_context(doc, "validate")
        mock_frappe.throw.assert_called()

    @patch("cityos.governance.node_context.frappe")
    def test_store_tenant_mismatch_throws(self, mock_frappe):
        from cityos.governance.node_context import validate_node_context
        mock_frappe.session.user = "Administrator"
        mock_frappe.db.get_value.return_value = "OtherTenant"
        doc = self._make_mock_doc(
            doctype="Sales Invoice",
            cityos_tenant="T1",
            cityos_store="Store-1"
        )
        doc.cityos_scope = ""
        doc.cityos_category = ""
        doc.cityos_subcategory = ""
        validate_node_context(doc, "validate")
        mock_frappe.throw.assert_called()

    @patch("cityos.governance.node_context.frappe")
    def test_permission_query_admin_returns_empty(self, mock_frappe):
        from cityos.governance.node_context import get_permission_query_conditions
        result = get_permission_query_conditions(user="Administrator", doctype="Sales Invoice")
        self.assertEqual(result, "")

    @patch("cityos.governance.node_context.frappe")
    def test_permission_query_system_manager_returns_empty(self, mock_frappe):
        from cityos.governance.node_context import get_permission_query_conditions
        mock_frappe.get_roles.return_value = ["System Manager"]
        result = get_permission_query_conditions(user="manager@test.com", doctype="Sales Invoice")
        self.assertEqual(result, "")

    @patch("cityos.governance.node_context.frappe")
    def test_permission_query_filters_by_tenant(self, mock_frappe):
        from cityos.governance.node_context import get_permission_query_conditions
        mock_frappe.get_roles.return_value = ["Employee"]
        mock_frappe.db.get_default.return_value = "MyTenant"
        mock_frappe.db.escape = lambda val, percent=True: f"'{val}'"
        mock_frappe.db.get_value.return_value = None
        result = get_permission_query_conditions(user="user@test.com", doctype="Sales Invoice")
        self.assertIn("MyTenant", result)
        self.assertIn("cityos_tenant", result)

    @patch("cityos.governance.node_context.frappe")
    def test_new_doctypes_in_exempt_list(self, mock_frappe):
        from cityos.governance.node_context import EXEMPT_DOCTYPES
        self.assertIn("Governance Authority", EXEMPT_DOCTYPES)
        self.assertIn("Policy Doctrine", EXEMPT_DOCTYPES)
        self.assertIn("CityOS Persona", EXEMPT_DOCTYPES)
        self.assertIn("CityOS Persona Assignment", EXEMPT_DOCTYPES)


class TestNodeContextTierValidation(unittest.TestCase):

    def _make_node_doc(self, **kwargs):
        from cityos.governance.doctype.node_context.node_context import NodeContext
        doc = MagicMock()
        doc.name = kwargs.get("name", "NC-001")
        doc.parent_context = kwargs.get("parent_context", "")
        doc.parent_tenant = kwargs.get("parent_tenant", "")
        doc.tenant_tier = kwargs.get("tenant_tier", "")
        doc.slug = kwargs.get("slug", "")
        doc.governance_authority = kwargs.get("governance_authority", "")
        doc.enabled = kwargs.get("enabled", 1)
        doc._validate_no_self_reference = lambda: NodeContext._validate_no_self_reference(doc)
        doc._validate_parent_enabled = lambda: NodeContext._validate_parent_enabled(doc)
        doc._validate_tier_hierarchy = lambda: NodeContext._validate_tier_hierarchy(doc)
        doc._validate_slug = lambda: NodeContext._validate_slug(doc)
        doc._validate_governance_authority = lambda: NodeContext._validate_governance_authority(doc)
        doc._check_circular_hierarchy = lambda: NodeContext._check_circular_hierarchy(doc)
        doc.as_dict = lambda: {k: getattr(doc, k) for k in ['name', 'context_name', 'tenant_tier', 'governance_authority', 'parent_tenant'] if hasattr(doc, k)}
        return doc

    @patch("cityos.governance.doctype.node_context.node_context.frappe")
    def test_self_reference_throws(self, mock_frappe):
        from cityos.governance.doctype.node_context.node_context import NodeContext
        doc = self._make_node_doc(name="NC-001", parent_context="NC-001")
        NodeContext.validate(doc)
        mock_frappe.throw.assert_called()
        self.assertIn("cannot be its own parent", str(mock_frappe.throw.call_args_list))

    @patch("cityos.governance.doctype.node_context.node_context.frappe")
    def test_parent_tenant_self_reference_throws(self, mock_frappe):
        from cityos.governance.doctype.node_context.node_context import NodeContext
        doc = self._make_node_doc(name="NC-001", parent_tenant="NC-001", tenant_tier="CITY")
        NodeContext.validate(doc)
        mock_frappe.throw.assert_called()

    @patch("cityos.governance.doctype.node_context.node_context.frappe")
    def test_master_with_parent_throws(self, mock_frappe):
        from cityos.governance.doctype.node_context.node_context import NodeContext
        mock_parent = MagicMock()
        mock_parent.enabled = True
        mock_parent.status = "Active"
        mock_parent.tenant_tier = "GLOBAL"
        mock_frappe.get_doc.return_value = mock_parent
        mock_frappe.db.get_value.return_value = None
        mock_frappe.db.exists.return_value = False
        doc = self._make_node_doc(name="NC-MASTER", parent_tenant="NC-PARENT", tenant_tier="MASTER")
        NodeContext.validate(doc)
        mock_frappe.throw.assert_called()

    @patch("cityos.governance.doctype.node_context.node_context.frappe")
    def test_city_with_master_parent_throws(self, mock_frappe):
        from cityos.governance.doctype.node_context.node_context import NodeContext
        mock_parent = MagicMock()
        mock_parent.enabled = True
        mock_parent.status = "Active"
        mock_parent.tenant_tier = "MASTER"
        mock_frappe.get_doc.return_value = mock_parent
        mock_frappe.db.get_value.return_value = None
        mock_frappe.db.exists.return_value = False
        doc = self._make_node_doc(name="NC-CITY", parent_tenant="NC-MASTER", tenant_tier="CITY")
        NodeContext.validate(doc)
        mock_frappe.throw.assert_called()
        self.assertIn("CITY", str(mock_frappe.throw.call_args_list))

    @patch("cityos.governance.doctype.node_context.node_context.frappe")
    def test_city_with_country_parent_valid(self, mock_frappe):
        from cityos.governance.doctype.node_context.node_context import NodeContext
        mock_parent = MagicMock()
        mock_parent.enabled = True
        mock_parent.status = "Active"
        mock_parent.tenant_tier = "COUNTRY"
        mock_frappe.get_doc.return_value = mock_parent
        mock_frappe.db.get_value.return_value = None
        mock_frappe.db.exists.return_value = False
        doc = self._make_node_doc(name="NC-CITY", parent_tenant="NC-COUNTRY", tenant_tier="CITY")
        NodeContext.validate(doc)
        mock_frappe.throw.assert_not_called()

    @patch("cityos.governance.doctype.node_context.node_context.frappe")
    def test_global_with_master_parent_valid(self, mock_frappe):
        from cityos.governance.doctype.node_context.node_context import NodeContext
        mock_parent = MagicMock()
        mock_parent.enabled = True
        mock_parent.status = "Active"
        mock_parent.tenant_tier = "MASTER"
        mock_frappe.get_doc.return_value = mock_parent
        mock_frappe.db.get_value.return_value = None
        mock_frappe.db.exists.return_value = False
        doc = self._make_node_doc(name="NC-GLOBAL", parent_tenant="NC-MASTER", tenant_tier="GLOBAL")
        NodeContext.validate(doc)
        mock_frappe.throw.assert_not_called()

    @patch("cityos.governance.doctype.node_context.node_context.frappe")
    def test_regional_with_global_parent_valid(self, mock_frappe):
        from cityos.governance.doctype.node_context.node_context import NodeContext
        mock_parent = MagicMock()
        mock_parent.enabled = True
        mock_parent.status = "Active"
        mock_parent.tenant_tier = "GLOBAL"
        mock_frappe.get_doc.return_value = mock_parent
        mock_frappe.db.get_value.return_value = None
        mock_frappe.db.exists.return_value = False
        doc = self._make_node_doc(name="NC-REGIONAL", parent_tenant="NC-GLOBAL", tenant_tier="REGIONAL")
        NodeContext.validate(doc)
        mock_frappe.throw.assert_not_called()

    @patch("cityos.governance.doctype.node_context.node_context.frappe")
    def test_country_with_city_parent_throws(self, mock_frappe):
        from cityos.governance.doctype.node_context.node_context import NodeContext
        mock_parent = MagicMock()
        mock_parent.enabled = True
        mock_parent.status = "Active"
        mock_parent.tenant_tier = "CITY"
        mock_frappe.get_doc.return_value = mock_parent
        mock_frappe.db.get_value.return_value = None
        mock_frappe.db.exists.return_value = False
        doc = self._make_node_doc(name="NC-COUNTRY", parent_tenant="NC-CITY", tenant_tier="COUNTRY")
        NodeContext.validate(doc)
        mock_frappe.throw.assert_called()


class TestNodeContextMethods(unittest.TestCase):

    @patch("cityos.governance.doctype.node_context.node_context.frappe")
    def test_get_tenant_chain(self, mock_frappe):
        from cityos.governance.doctype.node_context.node_context import NodeContext
        doc = MagicMock()
        doc.name = "NC-CITY"
        doc.parent_tenant = "NC-COUNTRY"
        doc.as_dict.return_value = {"name": "NC-CITY", "tenant_tier": "CITY"}
        parent = MagicMock()
        parent.parent_tenant = ""
        parent.as_dict.return_value = {"name": "NC-COUNTRY", "tenant_tier": "COUNTRY"}
        mock_frappe.get_doc.return_value = parent
        result = NodeContext.get_tenant_chain(doc)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["name"], "NC-COUNTRY")
        self.assertEqual(result[1]["name"], "NC-CITY")

    @patch("cityos.governance.doctype.node_context.node_context.frappe")
    def test_get_inherited_policies(self, mock_frappe):
        from cityos.governance.doctype.node_context.node_context import NodeContext
        doc = MagicMock()
        doc.name = "NC-CITY"
        doc.parent_tenant = ""
        chain_node = {
            "name": "NC-CITY", "context_name": "City-Riyadh",
            "tenant_tier": "CITY", "governance_authority": "GA-Saudi"
        }
        doc.get_tenant_chain = lambda: [chain_node]
        mock_frappe.db.exists.return_value = True
        mock_frappe.get_all.return_value = [
            {"name": "POL-001", "policy_name": "Data Residency", "policy_type": "Data Residency",
             "scope_level": "COUNTRY", "enforcement_level": "Mandatory", "inheritance_mode": "Inherit"}
        ]
        result = NodeContext.get_inherited_policies(doc)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["policy_name"], "Data Residency")
        self.assertEqual(result[0]["inherited_from"], "City-Riyadh")

    @patch("cityos.governance.doctype.node_context.node_context.frappe")
    def test_slug_validation_lowercases(self, mock_frappe):
        from cityos.governance.doctype.node_context.node_context import NodeContext
        mock_frappe.db.exists.return_value = False
        mock_frappe.db.get_value.return_value = None
        doc = MagicMock()
        doc.name = "NC-TEST"
        doc.parent_context = ""
        doc.parent_tenant = ""
        doc.tenant_tier = ""
        doc.slug = "My Test Slug"
        doc.governance_authority = ""
        doc.enabled = 1
        doc._validate_no_self_reference = lambda: NodeContext._validate_no_self_reference(doc)
        doc._validate_parent_enabled = lambda: NodeContext._validate_parent_enabled(doc)
        doc._validate_tier_hierarchy = lambda: NodeContext._validate_tier_hierarchy(doc)
        doc._validate_slug = lambda: NodeContext._validate_slug(doc)
        doc._validate_governance_authority = lambda: NodeContext._validate_governance_authority(doc)
        doc._check_circular_hierarchy = lambda: NodeContext._check_circular_hierarchy(doc)
        NodeContext.validate(doc)
        self.assertEqual(doc.slug, "my-test-slug")


if __name__ == "__main__":
    unittest.main()
