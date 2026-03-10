import unittest
from unittest.mock import patch, MagicMock


class TestPayloadSyncWebhookHandlers(unittest.TestCase):

    @patch("cityos.integrations.payload_sync.frappe")
    def test_handle_payload_webhook_routes_correctly(self, mock_frappe):
        from cityos.integrations.payload_sync import handle_payload_webhook
        data = {"collection": "unknown-collection", "operation": "create", "doc": {}}
        handle_payload_webhook(data)
        mock_frappe.log_error.assert_called()

    @patch("cityos.integrations.payload_sync.frappe")
    def test_tenant_sync_create(self, mock_frappe):
        from cityos.integrations.payload_sync import _handle_tenant_sync
        mock_frappe.db.get_value.return_value = None
        mock_frappe.db.exists.return_value = True
        mock_doc = MagicMock()
        mock_frappe.new_doc.return_value = mock_doc
        _handle_tenant_sync("create", {
            "id": "t-001", "name": "Dakkah Master", "tenantTier": "MASTER",
            "slug": "dakkah-master", "status": "Active", "residencyZone": "GCC",
            "country": {"name": "Saudi Arabia"},
            "settings": {"defaultLocale": "ar-SA", "timezone": "Asia/Riyadh"},
        })
        mock_frappe.new_doc.assert_called_with("Node Context")
        mock_doc.insert.assert_called()

    @patch("cityos.integrations.payload_sync.frappe")
    def test_tenant_sync_update_existing(self, mock_frappe):
        from cityos.integrations.payload_sync import _handle_tenant_sync
        mock_frappe.db.get_value.return_value = "NC-Existing"
        _handle_tenant_sync("update", {
            "id": "t-001", "name": "Updated Name", "tenantTier": "GLOBAL", "status": "Active",
        })
        mock_frappe.db.set_value.assert_called()

    @patch("cityos.integrations.payload_sync.frappe")
    def test_tenant_sync_delete_archives(self, mock_frappe):
        from cityos.integrations.payload_sync import _handle_tenant_sync
        mock_frappe.db.get_value.return_value = "NC-Existing"
        _handle_tenant_sync("delete", {"id": "t-001"})
        mock_frappe.db.set_value.assert_called_with("Node Context", "NC-Existing", "status", "Archived")

    @patch("cityos.integrations.payload_sync.frappe")
    def test_governance_authority_sync_create(self, mock_frappe):
        from cityos.integrations.payload_sync import _handle_governance_authority_sync
        mock_frappe.db.get_value.return_value = None
        mock_doc = MagicMock()
        mock_frappe.new_doc.return_value = mock_doc
        _handle_governance_authority_sync("create", {
            "id": "ga-001", "name": "Saudi Authority",
            "authorityType": "Federal", "jurisdictionLevel": "COUNTRY", "status": "Active",
        })
        mock_frappe.new_doc.assert_called_with("Governance Authority")
        mock_doc.insert.assert_called()

    @patch("cityos.integrations.payload_sync.frappe")
    def test_governance_authority_sync_delete_deactivates(self, mock_frappe):
        from cityos.integrations.payload_sync import _handle_governance_authority_sync
        mock_frappe.db.get_value.return_value = "GA-Existing"
        _handle_governance_authority_sync("delete", {"id": "ga-001"})
        mock_frappe.db.set_value.assert_called_with("Governance Authority", "GA-Existing", "status", "Inactive")

    @patch("cityos.integrations.payload_sync.frappe")
    def test_policy_sync_create(self, mock_frappe):
        from cityos.integrations.payload_sync import _handle_policy_sync
        mock_frappe.db.get_value.return_value = None
        mock_doc = MagicMock()
        mock_frappe.new_doc.return_value = mock_doc
        _handle_policy_sync("create", {
            "id": "pol-001", "name": "Data Residency Policy",
            "policyType": "Data Residency", "scopeLevel": "COUNTRY",
            "enforcementLevel": "Mandatory", "inheritanceMode": "Inherit", "status": "Active",
        })
        mock_frappe.new_doc.assert_called_with("Policy Doctrine")
        mock_doc.insert.assert_called()

    @patch("cityos.integrations.payload_sync.frappe")
    def test_persona_sync_create(self, mock_frappe):
        from cityos.integrations.payload_sync import _handle_persona_sync
        mock_frappe.db.get_value.return_value = None
        mock_doc = MagicMock()
        mock_frappe.new_doc.return_value = mock_doc
        _handle_persona_sync("create", {
            "id": "per-001", "name": "Citizen Persona",
            "personaType": "Citizen", "personaCode": "CIT-001", "status": "Active",
        })
        mock_frappe.new_doc.assert_called_with("CityOS Persona")
        mock_doc.insert.assert_called()

    @patch("cityos.integrations.payload_sync.frappe")
    def test_store_sync_create(self, mock_frappe):
        from cityos.integrations.payload_sync import _handle_store_sync
        mock_frappe.db.get_value.return_value = None
        mock_doc = MagicMock()
        mock_frappe.new_doc.return_value = mock_doc
        _handle_store_sync("create", {
            "id": "s-001", "name": "Downtown Store",
            "handle": "downtown-store", "tenant": {"handle": "dakkah"},
        })
        mock_frappe.new_doc.assert_called_with("CityOS Store")
        mock_doc.insert.assert_called()

    @patch("cityos.integrations.payload_sync.frappe")
    def test_store_sync_delete_disables(self, mock_frappe):
        from cityos.integrations.payload_sync import _handle_store_sync
        mock_frappe.db.get_value.return_value = "Store-Existing"
        _handle_store_sync("delete", {"id": "s-001"})
        mock_frappe.db.set_value.assert_called_with("CityOS Store", "Store-Existing", "enabled", 0)

    @patch("cityos.integrations.payload_sync.frappe")
    def test_compliance_record_sync(self, mock_frappe):
        from cityos.integrations.payload_sync import _handle_compliance_record_sync
        mock_frappe.db.exists.return_value = True
        mock_doc = MagicMock()
        mock_frappe.new_doc.return_value = mock_doc
        _handle_compliance_record_sync("create", {
            "id": "cr-001", "action": "Check",
            "checkType": "Annual Audit", "result": "Pass", "severity": "Info",
        })
        mock_frappe.new_doc.assert_called_with("CityOS Audit Log")
        mock_doc.insert.assert_called()

    @patch("cityos.integrations.payload_sync.frappe")
    def test_empty_id_returns_early(self, mock_frappe):
        from cityos.integrations.payload_sync import _handle_tenant_sync
        _handle_tenant_sync("create", {"id": "", "name": "Test"})
        mock_frappe.new_doc.assert_not_called()


class TestMedusaSyncWebhookHandlers(unittest.TestCase):

    @patch("cityos.integrations.medusa_sync.frappe")
    def test_handle_medusa_webhook_routes_correctly(self, mock_frappe):
        from cityos.integrations.medusa_sync import handle_medusa_webhook
        data = {"event": "unknown.event", "data": {}}
        handle_medusa_webhook(data)
        mock_frappe.log_error.assert_called()

    @patch("cityos.integrations.medusa_sync.frappe")
    def test_tenant_created_handler(self, mock_frappe):
        from cityos.integrations.medusa_sync import _handle_tenant_created
        mock_frappe.db.get_value.return_value = None
        mock_frappe.db.exists.return_value = True
        mock_doc = MagicMock()
        mock_frappe.new_doc.return_value = mock_doc
        _handle_tenant_created({
            "id": "medusa-t-001", "name": "Medusa Tenant",
            "metadata": {"tenant_tier": "CITY", "country": "Saudi Arabia"},
        })
        mock_frappe.new_doc.assert_called_with("Node Context")
        mock_doc.insert.assert_called()

    @patch("cityos.integrations.medusa_sync.frappe")
    def test_tenant_created_skips_existing(self, mock_frappe):
        from cityos.integrations.medusa_sync import _handle_tenant_created
        mock_frappe.db.get_value.return_value = "NC-Existing"
        _handle_tenant_created({"id": "medusa-t-001", "name": "Existing"})
        mock_frappe.new_doc.assert_not_called()

    @patch("cityos.integrations.medusa_sync.frappe")
    def test_order_completed_updates_workflow_state(self, mock_frappe):
        from cityos.integrations.medusa_sync import _handle_order_completed
        mock_frappe.db.get_value.return_value = "INV-001"
        _handle_order_completed({"id": "order-123"})
        mock_frappe.db.set_value.assert_called_with(
            "Sales Invoice", "INV-001", "cityos_workflow_state", "Completed"
        )

    @patch("cityos.integrations.medusa_sync.frappe")
    def test_payment_captured_updates_state(self, mock_frappe):
        from cityos.integrations.medusa_sync import _handle_payment_captured
        mock_frappe.db.get_value.return_value = "INV-001"
        _handle_payment_captured({"order_id": "order-123"})
        mock_frappe.db.set_value.assert_called_with(
            "Sales Invoice", "INV-001", "cityos_workflow_state", "Paid"
        )

    @patch("cityos.integrations.medusa_sync.frappe")
    def test_product_created_handler(self, mock_frappe):
        from cityos.integrations.medusa_sync import _handle_product_created
        mock_frappe.db.get_value.return_value = None
        mock_frappe.db.exists.return_value = False
        mock_doc = MagicMock()
        mock_frappe.new_doc.return_value = mock_doc
        _handle_product_created({"id": "prod-001", "title": "Test Product"})
        mock_frappe.new_doc.assert_called_with("Item")


class TestTemporalSyncHandlers(unittest.TestCase):

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_approval_result_handler(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_approval_result
        mock_frappe.db.exists.return_value = True
        mock_meta = MagicMock()
        mock_meta.has_field.return_value = True
        mock_frappe.get_meta.return_value = mock_meta
        _handle_approval_result("wf-001", "completed", {
            "doctype": "CityOS Procurement Request",
            "name": "PR-001", "approved": True,
        })
        mock_frappe.db.set_value.assert_called()

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_procurement_approval_handler(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_procurement_approval
        mock_frappe.db.exists.return_value = True
        mock_doc = MagicMock()
        mock_doc.docstatus = 0
        mock_frappe.get_doc.return_value = mock_doc
        _handle_procurement_approval("wf-001", "completed", {
            "name": "PR-001", "approved": True,
        })
        self.assertEqual(mock_doc.cityos_workflow_state, "Approved")
        mock_doc.save.assert_called()

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_enqueue_temporal_workflow(self, mock_frappe):
        from cityos.integrations.temporal_sync import enqueue_temporal_workflow
        mock_doc = MagicMock()
        mock_frappe.new_doc.return_value = mock_doc
        mock_frappe.session.user = "admin@test.com"
        enqueue_temporal_workflow(
            "procurement_approval", "cityos-erp",
            {"request_id": "PR-001"},
            doctype="CityOS Procurement Request", docname="PR-001"
        )
        mock_frappe.new_doc.assert_called_with("Integration Outbox Event")
        mock_doc.insert.assert_called()


class TestOutboundSync(unittest.TestCase):

    @patch("cityos.integrations.payload_sync.requests")
    @patch("cityos.integrations.payload_sync.frappe")
    def test_sync_vendor_to_payload_success(self, mock_frappe, mock_requests):
        from cityos.integrations.payload_sync import sync_vendor_to_payload
        mock_frappe.conf.get.side_effect = lambda k, d="": {
            "payload_api_url": "http://cms.local", "payload_api_key": "key123"
        }.get(k, d)
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_requests.post.return_value = mock_response
        vendor = MagicMock()
        vendor.vendor_name = "Test Vendor"
        vendor.name = "VND-001"
        vendor.status = "Active"
        vendor.cityos_tenant = "T1"
        sync_vendor_to_payload(vendor)
        mock_requests.post.assert_called_once()

    @patch("cityos.integrations.payload_sync.requests")
    @patch("cityos.integrations.payload_sync.frappe")
    def test_sync_vendor_skips_no_config(self, mock_frappe, mock_requests):
        from cityos.integrations.payload_sync import sync_vendor_to_payload
        mock_frappe.conf.get.return_value = ""
        sync_vendor_to_payload(MagicMock())
        mock_requests.post.assert_not_called()

    @patch("cityos.integrations.payload_sync.requests")
    @patch("cityos.integrations.payload_sync.frappe")
    def test_sync_governance_authority_to_payload(self, mock_frappe, mock_requests):
        from cityos.integrations.payload_sync import sync_governance_authority_to_payload
        mock_frappe.conf.get.side_effect = lambda k, d="": {
            "payload_api_url": "http://cms.local", "payload_api_key": "key123"
        }.get(k, d)
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_requests.post.return_value = mock_response
        doc = MagicMock()
        doc.authority_name = "Saudi Authority"
        doc.name = "GA-001"
        sync_governance_authority_to_payload(doc)
        mock_requests.post.assert_called_once()

    @patch("cityos.integrations.payload_sync.requests")
    @patch("cityos.integrations.payload_sync.frappe")
    def test_sync_policy_to_payload(self, mock_frappe, mock_requests):
        from cityos.integrations.payload_sync import sync_policy_to_payload
        mock_frappe.conf.get.side_effect = lambda k, d="": {
            "payload_api_url": "http://cms.local", "payload_api_key": "key123"
        }.get(k, d)
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_requests.post.return_value = mock_response
        doc = MagicMock()
        doc.policy_name = "Data Residency"
        doc.name = "POL-001"
        sync_policy_to_payload(doc)
        mock_requests.post.assert_called_once()


if __name__ == "__main__":
    unittest.main()
