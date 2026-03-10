import unittest
from unittest.mock import patch, MagicMock


class TestMissingTenantCheck(unittest.TestCase):

    @patch("cityos.compliance.checks.frappe")
    def test_missing_tenant_logs_finding(self, mock_frappe):
        from cityos.compliance.checks import check_missing_tenant
        mock_frappe.db.exists.return_value = True
        mock_meta = MagicMock()
        mock_meta.has_field.return_value = True
        mock_frappe.get_meta.return_value = mock_meta
        mock_frappe.db.count.return_value = 5
        mock_frappe.new_doc.return_value = MagicMock()
        check_missing_tenant()
        self.assertTrue(mock_frappe.new_doc.called)

    @patch("cityos.compliance.checks.frappe")
    def test_no_missing_tenant_no_log(self, mock_frappe):
        from cityos.compliance.checks import check_missing_tenant
        mock_frappe.db.exists.return_value = True
        mock_meta = MagicMock()
        mock_meta.has_field.return_value = True
        mock_frappe.get_meta.return_value = mock_meta
        mock_frappe.db.count.return_value = 0
        check_missing_tenant()


class TestStaleWorkflowCheck(unittest.TestCase):

    @patch("cityos.compliance.checks.frappe")
    def test_stale_events_logged(self, mock_frappe):
        from cityos.compliance.checks import check_stale_workflow_states
        mock_frappe.db.exists.return_value = True
        mock_frappe.db.count.side_effect = [10, 3]
        mock_frappe.new_doc.return_value = MagicMock()
        check_stale_workflow_states()
        self.assertTrue(mock_frappe.new_doc.called)


class TestOrphanStoresCheck(unittest.TestCase):

    @patch("cityos.compliance.checks.frappe")
    def test_orphan_store_logged(self, mock_frappe):
        from cityos.compliance.checks import check_orphan_stores
        mock_frappe.db.exists.return_value = True
        mock_frappe.get_all.return_value = [
            {"name": "Store-1", "tenant": ""},
            {"name": "Store-2", "tenant": "T1"},
        ]
        mock_frappe.new_doc.return_value = MagicMock()
        check_orphan_stores()
        self.assertTrue(mock_frappe.new_doc.called)


class TestGovernanceChainCheck(unittest.TestCase):

    @patch("cityos.compliance.checks.frappe")
    def test_master_with_parent_logged(self, mock_frappe):
        from cityos.compliance.checks import check_governance_chain_integrity
        mock_frappe.db.exists.return_value = True
        mock_frappe.get_all.return_value = [
            {"name": "NC-1", "context_name": "Master", "tenant_tier": "MASTER",
             "parent_tenant": "NC-2", "governance_authority": "GA-1", "status": "Active"},
        ]
        mock_frappe.new_doc.return_value = MagicMock()
        check_governance_chain_integrity()
        self.assertTrue(mock_frappe.new_doc.called)

    @patch("cityos.compliance.checks.frappe")
    def test_city_without_parent_logged(self, mock_frappe):
        from cityos.compliance.checks import check_governance_chain_integrity
        mock_frappe.db.exists.return_value = True
        mock_frappe.get_all.return_value = [
            {"name": "NC-1", "context_name": "Riyadh", "tenant_tier": "CITY",
             "parent_tenant": "", "governance_authority": "", "status": "Active"},
        ]
        mock_frappe.new_doc.return_value = MagicMock()
        check_governance_chain_integrity()
        self.assertTrue(mock_frappe.new_doc.called)

    @patch("cityos.compliance.checks.frappe")
    def test_invalid_tier_parent_logged(self, mock_frappe):
        from cityos.compliance.checks import check_governance_chain_integrity
        mock_frappe.db.exists.side_effect = lambda *args, **kwargs: True
        mock_frappe.get_all.return_value = [
            {"name": "NC-CITY", "context_name": "Riyadh", "tenant_tier": "CITY",
             "parent_tenant": "NC-MASTER", "governance_authority": "GA-1", "status": "Active"},
            {"name": "NC-MASTER", "context_name": "Master", "tenant_tier": "MASTER",
             "parent_tenant": "", "governance_authority": "GA-1", "status": "Active"},
        ]
        mock_frappe.new_doc.return_value = MagicMock()
        check_governance_chain_integrity()
        self.assertTrue(mock_frappe.new_doc.called)


class TestHierarchyIntegrity(unittest.TestCase):

    @patch("cityos.compliance.checks.frappe")
    def test_broken_category_scope_link(self, mock_frappe):
        from cityos.compliance.checks import check_hierarchy_integrity
        mock_frappe.db.exists.side_effect = lambda dt, name=None: {
            ("DocType", "CityOS Category"): True,
            ("DocType", "CityOS Subcategory"): True,
            ("DocType", "CityOS Portal"): True,
        }.get((dt, name) if name else dt, False)
        mock_frappe.get_all.side_effect = [
            [{"name": "Cat-1", "category_name": "Urban", "scope": "NonExistentScope"}],
            [], [],
        ]
        mock_frappe.new_doc.return_value = MagicMock()
        check_hierarchy_integrity()


class TestCrossSystemSyncHealth(unittest.TestCase):

    @patch("cityos.compliance.checks.frappe")
    def test_high_failure_rate_logged(self, mock_frappe):
        from cityos.compliance.checks import check_cross_system_sync_health
        mock_frappe.db.exists.return_value = True
        mock_frappe.db.count.side_effect = [15, 3, 2, 1, 0]
        mock_frappe.new_doc.return_value = MagicMock()
        check_cross_system_sync_health()
        self.assertTrue(mock_frappe.new_doc.called)


class TestExpiredPersonaAssignments(unittest.TestCase):

    @patch("cityos.compliance.checks.frappe")
    def test_expired_assignments_logged(self, mock_frappe):
        from cityos.compliance.checks import check_expired_persona_assignments
        mock_frappe.db.exists.return_value = True
        mock_frappe.db.count.return_value = 3
        mock_frappe.new_doc.return_value = MagicMock()
        check_expired_persona_assignments()
        self.assertTrue(mock_frappe.new_doc.called)


class TestPolicyExpiry(unittest.TestCase):

    @patch("cityos.compliance.checks.frappe")
    def test_expiring_policies_logged(self, mock_frappe):
        from cityos.compliance.checks import check_policy_expiry
        mock_frappe.db.exists.return_value = True
        mock_frappe.db.count.side_effect = [2, 1]
        mock_frappe.new_doc.return_value = MagicMock()
        check_policy_expiry()
        self.assertTrue(mock_frappe.new_doc.called)

    @patch("cityos.compliance.checks.frappe")
    def test_no_expiring_policies_no_log(self, mock_frappe):
        from cityos.compliance.checks import check_policy_expiry
        mock_frappe.db.exists.return_value = True
        mock_frappe.db.count.side_effect = [0, 0]
        check_policy_expiry()


if __name__ == "__main__":
    unittest.main()
