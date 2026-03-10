import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import json
import frappe


def setUpModule():
    try:
        frappe.local.flags = frappe._dict(in_test=True)
    except Exception:
        pass


def tearDownModule():
    try:
        frappe.local.flags = frappe._dict()
    except Exception:
        pass


class TestWorkflowMetadata(unittest.TestCase):

    def test_all_five_workflow_types_defined(self):
        from cityos.integrations.temporal_sync import WORKFLOW_METADATA
        expected = [
            "approval_chain", "procurement_approval",
            "invoice_settlement", "vendor_onboarding", "budget_approval",
        ]
        for wf in expected:
            self.assertIn(wf, WORKFLOW_METADATA, f"Missing workflow type: {wf}")

    def test_metadata_has_required_fields(self):
        from cityos.integrations.temporal_sync import WORKFLOW_METADATA
        for wf_type, meta in WORKFLOW_METADATA.items():
            self.assertIn("displayName", meta, f"{wf_type} missing displayName")
            self.assertIn("description", meta, f"{wf_type} missing description")
            self.assertIn("domainPack", meta, f"{wf_type} missing domainPack")
            self.assertIn("taskQueues", meta, f"{wf_type} missing taskQueues")
            self.assertIn("tags", meta, f"{wf_type} missing tags")

    def test_all_workflows_have_system_erpnext_tag(self):
        from cityos.integrations.temporal_sync import WORKFLOW_METADATA
        for wf_type, meta in WORKFLOW_METADATA.items():
            self.assertIn("system:erpnext", meta["tags"], f"{wf_type} missing system:erpnext tag")

    def test_all_workflows_have_domain_xsystem_tag(self):
        from cityos.integrations.temporal_sync import WORKFLOW_METADATA
        for wf_type, meta in WORKFLOW_METADATA.items():
            self.assertIn("domain:xsystem", meta["tags"], f"{wf_type} missing domain:xsystem tag")

    def test_platform_queue_workflows(self):
        from cityos.integrations.temporal_sync import WORKFLOW_METADATA
        platform_wfs = ["approval_chain", "procurement_approval", "vendor_onboarding"]
        for wf in platform_wfs:
            self.assertIn(
                "xsystem-platform-queue",
                WORKFLOW_METADATA[wf]["taskQueues"],
                f"{wf} should use xsystem-platform-queue",
            )

    def test_vertical_queue_workflows(self):
        from cityos.integrations.temporal_sync import WORKFLOW_METADATA
        vertical_wfs = ["invoice_settlement", "budget_approval"]
        for wf in vertical_wfs:
            self.assertIn(
                "xsystem-vertical-queue",
                WORKFLOW_METADATA[wf]["taskQueues"],
                f"{wf} should use xsystem-vertical-queue",
            )

    def test_domain_pack_is_xsystem(self):
        from cityos.integrations.temporal_sync import WORKFLOW_METADATA
        for wf_type, meta in WORKFLOW_METADATA.items():
            self.assertEqual(meta["domainPack"], "xsystem", f"{wf_type} should have domainPack=xsystem")


class TestWorkflowDoctypeMap(unittest.TestCase):

    def test_all_workflow_types_mapped(self):
        from cityos.integrations.temporal_sync import WORKFLOW_DOCTYPE_MAP, WORKFLOW_METADATA
        for wf_type in WORKFLOW_METADATA:
            self.assertIn(wf_type, WORKFLOW_DOCTYPE_MAP, f"{wf_type} not in WORKFLOW_DOCTYPE_MAP")

    def test_procurement_maps_to_procurement_request(self):
        from cityos.integrations.temporal_sync import WORKFLOW_DOCTYPE_MAP
        self.assertEqual(WORKFLOW_DOCTYPE_MAP["procurement_approval"], "CityOS Procurement Request")

    def test_invoice_maps_to_municipal_invoice(self):
        from cityos.integrations.temporal_sync import WORKFLOW_DOCTYPE_MAP
        self.assertEqual(WORKFLOW_DOCTYPE_MAP["invoice_settlement"], "Municipal Invoice")

    def test_vendor_maps_to_vendor_compliance(self):
        from cityos.integrations.temporal_sync import WORKFLOW_DOCTYPE_MAP
        self.assertEqual(WORKFLOW_DOCTYPE_MAP["vendor_onboarding"], "Vendor Compliance Profile")

    def test_budget_maps_to_budget_program(self):
        from cityos.integrations.temporal_sync import WORKFLOW_DOCTYPE_MAP
        self.assertEqual(WORKFLOW_DOCTYPE_MAP["budget_approval"], "Budget Program")

    def test_approval_chain_has_no_fixed_doctype(self):
        from cityos.integrations.temporal_sync import WORKFLOW_DOCTYPE_MAP
        self.assertIsNone(WORKFLOW_DOCTYPE_MAP["approval_chain"])


class TestQueueRouting(unittest.TestCase):

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_approval_chain_routes_to_platform_queue(self, mock_frappe):
        from cityos.integrations.temporal_sync import get_queue_for_workflow
        mock_frappe.conf.get.return_value = None
        result = get_queue_for_workflow("approval_chain")
        self.assertEqual(result, "xsystem-platform-queue")

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_invoice_settlement_routes_to_vertical_queue(self, mock_frappe):
        from cityos.integrations.temporal_sync import get_queue_for_workflow
        mock_frappe.conf.get.return_value = None
        result = get_queue_for_workflow("invoice_settlement")
        self.assertEqual(result, "xsystem-vertical-queue")

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_budget_approval_routes_to_vertical_queue(self, mock_frappe):
        from cityos.integrations.temporal_sync import get_queue_for_workflow
        mock_frappe.conf.get.return_value = None
        result = get_queue_for_workflow("budget_approval")
        self.assertEqual(result, "xsystem-vertical-queue")

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_unknown_workflow_uses_default_queue(self, mock_frappe):
        from cityos.integrations.temporal_sync import get_queue_for_workflow
        mock_frappe.conf.get.side_effect = lambda k, d=None: {
            "temporal_task_queues": ["xsystem-platform-queue", "xsystem-vertical-queue"],
            "temporal_default_task_queue": "xsystem-platform-queue",
        }.get(k, d)
        result = get_queue_for_workflow("unknown_workflow")
        self.assertEqual(result, "xsystem-platform-queue")


class TestTemporalConfig(unittest.TestCase):

    @patch("cityos.integrations.temporal_sync.os")
    @patch("cityos.integrations.temporal_sync.frappe")
    def test_config_returns_all_keys(self, mock_frappe, mock_os):
        from cityos.integrations.temporal_sync import get_temporal_config
        mock_frappe.conf.get.side_effect = lambda k, d=None: {
            "temporal_endpoint": "test.endpoint:7233",
            "temporal_namespace": "test-ns.abc",
            "temporal_task_queues": ["q1", "q2"],
            "temporal_default_task_queue": "q1",
            "temporal_system_id": "erpnext",
            "temporal_domain": "xsystem",
            "workflow_registry_base_url": "http://registry.local",
        }.get(k, d)
        mock_os.environ.get.return_value = "test-key"

        config = get_temporal_config()
        self.assertEqual(config["endpoint"], "test.endpoint:7233")
        self.assertEqual(config["namespace"], "test-ns.abc")
        self.assertEqual(config["task_queues"], ["q1", "q2"])
        self.assertEqual(config["system_id"], "erpnext")
        self.assertEqual(config["domain"], "xsystem")
        self.assertEqual(config["api_key"], "test-key")
        self.assertEqual(config["registry_base_url"], "http://registry.local")

    @patch("cityos.integrations.temporal_sync.os")
    @patch("cityos.integrations.temporal_sync.frappe")
    def test_config_defaults(self, mock_frappe, mock_os):
        from cityos.integrations.temporal_sync import get_temporal_config
        mock_frappe.conf.get.side_effect = lambda k, d=None: d
        mock_os.environ.get.return_value = ""

        config = get_temporal_config()
        self.assertIn("xsystem-platform-queue", config["task_queues"])
        self.assertIn("xsystem-vertical-queue", config["task_queues"])
        self.assertEqual(config["system_id"], "erpnext")
        self.assertEqual(config["domain"], "xsystem")

    @patch("cityos.integrations.temporal_sync.os")
    @patch("cityos.integrations.temporal_sync.frappe")
    def test_string_task_queues_converted_to_list(self, mock_frappe, mock_os):
        from cityos.integrations.temporal_sync import get_temporal_config
        mock_frappe.conf.get.side_effect = lambda k, d=None: {
            "temporal_task_queues": "single-queue",
        }.get(k, d)
        mock_os.environ.get.return_value = ""

        config = get_temporal_config()
        self.assertIsInstance(config["task_queues"], list)
        self.assertEqual(config["task_queues"], ["single-queue"])


class TestApprovalChainHandler(unittest.TestCase):

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_completed_sets_approved(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_approval_result
        mock_frappe.db.exists.return_value = True
        mock_meta = MagicMock()
        mock_meta.has_field.return_value = True
        mock_frappe.get_meta.return_value = mock_meta
        _handle_approval_result("wf-001", "completed", {
            "doctype": "CityOS Procurement Request", "name": "PR-001", "approved": True,
        })
        mock_frappe.db.set_value.assert_any_call(
            "CityOS Procurement Request", "PR-001", "cityos_workflow_state", "Approved"
        )

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_failed_sets_rejected(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_approval_result
        mock_frappe.db.exists.return_value = True
        mock_meta = MagicMock()
        mock_meta.has_field.return_value = True
        mock_frappe.get_meta.return_value = mock_meta
        _handle_approval_result("wf-001", "failed", {
            "doctype": "CityOS Procurement Request", "name": "PR-001",
        })
        mock_frappe.db.set_value.assert_any_call(
            "CityOS Procurement Request", "PR-001", "cityos_workflow_state", "Rejected"
        )

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_timed_out_sets_escalated(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_approval_result
        mock_frappe.db.exists.return_value = True
        mock_meta = MagicMock()
        mock_meta.has_field.return_value = True
        mock_frappe.get_meta.return_value = mock_meta
        _handle_approval_result("wf-001", "timed_out", {
            "doctype": "CityOS Procurement Request", "name": "PR-001",
        })
        mock_frappe.db.set_value.assert_any_call(
            "CityOS Procurement Request", "PR-001", "cityos_workflow_state", "Escalated"
        )

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_cancelled_sets_cancelled(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_approval_result
        mock_frappe.db.exists.return_value = True
        mock_meta = MagicMock()
        mock_meta.has_field.return_value = True
        mock_frappe.get_meta.return_value = mock_meta
        _handle_approval_result("wf-001", "cancelled", {
            "doctype": "CityOS Procurement Request", "name": "PR-001",
        })
        mock_frappe.db.set_value.assert_any_call(
            "CityOS Procurement Request", "PR-001", "cityos_workflow_state", "Cancelled"
        )

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_missing_doctype_returns_early(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_approval_result
        _handle_approval_result("wf-001", "completed", {"approved": True})
        mock_frappe.db.exists.assert_not_called()

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_nonexistent_doc_returns_early(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_approval_result
        mock_frappe.db.exists.return_value = False
        _handle_approval_result("wf-001", "completed", {
            "doctype": "CityOS Procurement Request", "name": "FAKE-001",
        })
        mock_frappe.get_meta.assert_not_called()


class TestProcurementApprovalHandler(unittest.TestCase):

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_approved_updates_doc(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_procurement_approval
        mock_frappe.db.exists.return_value = True
        mock_doc = MagicMock()
        mock_doc.docstatus = 0
        mock_frappe.get_doc.return_value = mock_doc
        _handle_procurement_approval("wf-001", "completed", {
            "name": "PR-001", "approved": True,
        })
        self.assertEqual(mock_doc.cityos_workflow_state, "Approved")
        mock_doc.save.assert_called_with(ignore_permissions=True)

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_rejected_does_not_update(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_procurement_approval
        mock_frappe.db.exists.return_value = True
        mock_doc = MagicMock()
        mock_doc.docstatus = 0
        mock_frappe.get_doc.return_value = mock_doc
        _handle_procurement_approval("wf-001", "completed", {
            "name": "PR-001", "approved": False,
        })
        mock_doc.save.assert_not_called()

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_submitted_doc_not_updated(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_procurement_approval
        mock_frappe.db.exists.return_value = True
        mock_doc = MagicMock()
        mock_doc.docstatus = 1
        mock_frappe.get_doc.return_value = mock_doc
        _handle_procurement_approval("wf-001", "completed", {
            "name": "PR-001", "approved": True,
        })
        mock_doc.save.assert_not_called()

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_missing_name_returns_early(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_procurement_approval
        _handle_procurement_approval("wf-001", "completed", {"approved": True})
        mock_frappe.get_doc.assert_not_called()


class TestInvoiceSettlementHandler(unittest.TestCase):

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_municipal_invoice_settled(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_invoice_settlement
        mock_frappe.db.exists.side_effect = lambda dt, name: dt == "Municipal Invoice"
        _handle_invoice_settlement("wf-001", "completed", {"name": "MI-001"})
        mock_frappe.db.set_value.assert_any_call(
            "Municipal Invoice", "MI-001", "cityos_workflow_state", "Settled"
        )

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_sales_invoice_settled(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_invoice_settlement
        mock_frappe.db.exists.side_effect = lambda dt, name: dt == "Sales Invoice"
        _handle_invoice_settlement("wf-001", "completed", {"name": "SI-001"})
        mock_frappe.db.set_value.assert_any_call(
            "Sales Invoice", "SI-001", "cityos_workflow_state", "Settled"
        )

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_non_completed_does_not_settle(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_invoice_settlement
        mock_frappe.db.exists.return_value = True
        _handle_invoice_settlement("wf-001", "failed", {"name": "MI-001"})
        mock_frappe.db.set_value.assert_not_called()

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_empty_name_returns_early(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_invoice_settlement
        _handle_invoice_settlement("wf-001", "completed", {})
        mock_frappe.db.exists.assert_not_called()


class TestVendorOnboardingHandler(unittest.TestCase):

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_approved_sets_verified(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_vendor_onboarding
        mock_frappe.db.exists.return_value = True
        _handle_vendor_onboarding("wf-001", "completed", {
            "name": "VCP-001", "approved": True,
        })
        mock_frappe.db.set_value.assert_any_call(
            "Vendor Compliance Profile", "VCP-001", {"status": "Verified"}
        )

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_rejected_sets_rejected(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_vendor_onboarding
        mock_frappe.db.exists.return_value = True
        _handle_vendor_onboarding("wf-001", "completed", {
            "name": "VCP-001", "approved": False,
        })
        mock_frappe.db.set_value.assert_any_call(
            "Vendor Compliance Profile", "VCP-001", {"status": "Rejected"}
        )

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_nonexistent_vendor_returns_early(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_vendor_onboarding
        mock_frappe.db.exists.return_value = False
        _handle_vendor_onboarding("wf-001", "completed", {
            "name": "FAKE-001", "approved": True,
        })
        mock_frappe.db.set_value.assert_not_called()


class TestBudgetApprovalHandler(unittest.TestCase):

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_approved_sets_workflow_state(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_budget_approval
        mock_frappe.db.exists.return_value = True
        mock_meta = MagicMock()
        mock_meta.has_field.return_value = True
        mock_frappe.get_meta.return_value = mock_meta
        _handle_budget_approval("wf-001", "completed", {
            "name": "BP-001", "approved": True,
        })
        mock_frappe.db.set_value.assert_any_call(
            "Budget Program", "BP-001", "cityos_workflow_state", "Approved"
        )

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_not_approved_does_not_update(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_budget_approval
        mock_frappe.db.exists.return_value = True
        _handle_budget_approval("wf-001", "completed", {
            "name": "BP-001", "approved": False,
        })
        mock_frappe.db.set_value.assert_not_called()

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_nonexistent_budget_returns_early(self, mock_frappe):
        from cityos.integrations.temporal_sync import _handle_budget_approval
        mock_frappe.db.exists.return_value = False
        _handle_budget_approval("wf-001", "completed", {
            "name": "FAKE-001", "approved": True,
        })
        mock_frappe.get_meta.assert_not_called()


class TestWebhookDispatcher(unittest.TestCase):

    @patch("cityos.integrations.temporal_sync._create_workflow_audit")
    @patch("cityos.integrations.temporal_sync._handle_approval_result")
    @patch("cityos.integrations.temporal_sync.frappe")
    def test_dispatches_approval_chain(self, mock_frappe, mock_handler, mock_audit):
        from cityos.integrations.temporal_sync import handle_temporal_webhook
        handle_temporal_webhook({
            "workflow_id": "wf-001", "workflow_type": "approval_chain",
            "status": "completed", "result": {"approved": True},
        })
        mock_handler.assert_called_once()

    @patch("cityos.integrations.temporal_sync._create_workflow_audit")
    @patch("cityos.integrations.temporal_sync._handle_procurement_approval")
    @patch("cityos.integrations.temporal_sync.frappe")
    def test_dispatches_procurement_approval(self, mock_frappe, mock_handler, mock_audit):
        from cityos.integrations.temporal_sync import handle_temporal_webhook
        handle_temporal_webhook({
            "workflow_id": "wf-002", "workflow_type": "procurement_approval",
            "status": "completed", "result": {"approved": True},
        })
        mock_handler.assert_called_once()

    @patch("cityos.integrations.temporal_sync._create_workflow_audit")
    @patch("cityos.integrations.temporal_sync._handle_invoice_settlement")
    @patch("cityos.integrations.temporal_sync.frappe")
    def test_dispatches_invoice_settlement(self, mock_frappe, mock_handler, mock_audit):
        from cityos.integrations.temporal_sync import handle_temporal_webhook
        handle_temporal_webhook({
            "workflow_id": "wf-003", "workflow_type": "invoice_settlement",
            "status": "completed", "result": {"name": "MI-001"},
        })
        mock_handler.assert_called_once()

    @patch("cityos.integrations.temporal_sync._create_workflow_audit")
    @patch("cityos.integrations.temporal_sync._handle_vendor_onboarding")
    @patch("cityos.integrations.temporal_sync.frappe")
    def test_dispatches_vendor_onboarding(self, mock_frappe, mock_handler, mock_audit):
        from cityos.integrations.temporal_sync import handle_temporal_webhook
        handle_temporal_webhook({
            "workflow_id": "wf-004", "workflow_type": "vendor_onboarding",
            "status": "completed", "result": {"name": "VCP-001"},
        })
        mock_handler.assert_called_once()

    @patch("cityos.integrations.temporal_sync._create_workflow_audit")
    @patch("cityos.integrations.temporal_sync._handle_budget_approval")
    @patch("cityos.integrations.temporal_sync.frappe")
    def test_dispatches_budget_approval(self, mock_frappe, mock_handler, mock_audit):
        from cityos.integrations.temporal_sync import handle_temporal_webhook
        handle_temporal_webhook({
            "workflow_id": "wf-005", "workflow_type": "budget_approval",
            "status": "completed", "result": {"name": "BP-001"},
        })
        mock_handler.assert_called_once()

    @patch("cityos.integrations.temporal_sync._create_workflow_audit")
    @patch("cityos.integrations.temporal_sync.frappe")
    def test_unknown_workflow_creates_audit(self, mock_frappe, mock_audit):
        from cityos.integrations.temporal_sync import handle_temporal_webhook
        handle_temporal_webhook({
            "workflow_id": "wf-999", "workflow_type": "unknown_type",
            "status": "completed", "result": {},
        })
        mock_audit.assert_called_once_with("wf-999", "unknown_type", "completed", {})


class TestEnqueueTemporalWorkflow(unittest.TestCase):

    @patch("cityos.integrations.temporal_sync.now_datetime")
    @patch("cityos.integrations.temporal_sync.frappe")
    def test_creates_outbox_event(self, mock_frappe, mock_now):
        from cityos.integrations.temporal_sync import enqueue_temporal_workflow
        mock_now.return_value = MagicMock(isoformat=MagicMock(return_value="2026-02-10T12:00:00"))
        mock_doc = MagicMock()
        mock_frappe.new_doc.return_value = mock_doc
        mock_frappe.session.user = "admin@test.com"

        enqueue_temporal_workflow(
            "procurement_approval",
            input_data={"request_id": "PR-001"},
            doctype="CityOS Procurement Request",
            docname="PR-001",
        )
        mock_frappe.new_doc.assert_called_with("Integration Outbox Event")
        mock_doc.insert.assert_called_with(ignore_permissions=True)
        self.assertEqual(mock_doc.event_type, "TEMPORAL_WORKFLOW_PROCUREMENT_APPROVAL")
        self.assertEqual(mock_doc.target_system, "Temporal Workflow")
        self.assertEqual(mock_doc.source_doctype, "CityOS Procurement Request")
        self.assertEqual(mock_doc.priority, "High")

    @patch("cityos.integrations.temporal_sync.now_datetime")
    @patch("cityos.integrations.temporal_sync.frappe")
    def test_uses_correct_queue(self, mock_frappe, mock_now):
        from cityos.integrations.temporal_sync import enqueue_temporal_workflow
        mock_now.return_value = MagicMock(isoformat=MagicMock(return_value="2026-02-10T12:00:00"))
        mock_doc = MagicMock()
        mock_frappe.new_doc.return_value = mock_doc
        mock_frappe.session.user = "admin@test.com"

        enqueue_temporal_workflow("invoice_settlement", input_data={"name": "MI-001"})
        payload = json.loads(mock_doc.event_payload)
        self.assertEqual(payload["task_queue"], "xsystem-vertical-queue")

    @patch("cityos.integrations.temporal_sync.now_datetime")
    @patch("cityos.integrations.temporal_sync.frappe")
    def test_custom_queue_override(self, mock_frappe, mock_now):
        from cityos.integrations.temporal_sync import enqueue_temporal_workflow
        mock_now.return_value = MagicMock(isoformat=MagicMock(return_value="2026-02-10T12:00:00"))
        mock_doc = MagicMock()
        mock_frappe.new_doc.return_value = mock_doc
        mock_frappe.session.user = "admin@test.com"

        enqueue_temporal_workflow(
            "approval_chain", task_queue="custom-queue",
            input_data={"doc": "test"},
        )
        payload = json.loads(mock_doc.event_payload)
        self.assertEqual(payload["task_queue"], "custom-queue")


class TestTriggerWorkflowAPI(unittest.TestCase):

    def test_invalid_workflow_type_validated(self):
        from cityos.integrations.temporal_sync import WORKFLOW_METADATA
        self.assertNotIn("nonexistent_workflow", WORKFLOW_METADATA)

    @patch("cityos.integrations.temporal_sync.enqueue_temporal_workflow")
    def test_invalid_workflow_type_throws(self, mock_enqueue):
        from cityos.integrations.temporal_sync import trigger_workflow
        with self.assertRaises(Exception):
            trigger_workflow("nonexistent_workflow")

    @patch("cityos.integrations.temporal_sync.enqueue_temporal_workflow")
    def test_wrong_doctype_throws(self, mock_enqueue):
        from cityos.integrations.temporal_sync import trigger_workflow
        with self.assertRaises(Exception):
            trigger_workflow(
                "procurement_approval",
                doctype="Sales Invoice",
                docname="SI-001",
            )

    @patch("cityos.integrations.temporal_sync.enqueue_temporal_workflow")
    @patch("cityos.integrations.temporal_sync.frappe")
    def test_nonexistent_doc_throws(self, mock_frappe, mock_enqueue):
        from cityos.integrations.temporal_sync import trigger_workflow
        mock_frappe.db.exists.return_value = False
        mock_frappe.DoesNotExistError = frappe.DoesNotExistError
        mock_frappe.throw = frappe.throw
        with self.assertRaises(Exception):
            trigger_workflow(
                "invoice_settlement",
                doctype="Municipal Invoice",
                docname="MI-FAKE",
            )

    @patch("cityos.integrations.temporal_sync.enqueue_temporal_workflow")
    @patch("cityos.integrations.temporal_sync.frappe")
    def test_approval_chain_without_doc(self, mock_frappe, mock_enqueue):
        from cityos.integrations.temporal_sync import trigger_workflow
        mock_frappe.session.user = "admin@test.com"
        mock_frappe.conf.get.return_value = None
        result = trigger_workflow("approval_chain")
        self.assertEqual(result["status"], "enqueued")
        self.assertEqual(result["workflow_type"], "approval_chain")
        self.assertEqual(result["task_queue"], "xsystem-platform-queue")
        mock_enqueue.assert_called_once()

    @patch("cityos.integrations.temporal_sync.enqueue_temporal_workflow")
    @patch("cityos.integrations.temporal_sync.frappe")
    def test_procurement_with_doc(self, mock_frappe, mock_enqueue):
        from cityos.integrations.temporal_sync import trigger_workflow
        mock_frappe.session.user = "admin@test.com"
        mock_frappe.conf.get.return_value = None
        mock_frappe.db.exists.return_value = True
        mock_doc = MagicMock()
        mock_doc.meta.has_field.return_value = True
        mock_frappe.get_doc.return_value = mock_doc
        result = trigger_workflow(
            "procurement_approval",
            doctype="CityOS Procurement Request",
            docname="PR-001",
        )
        self.assertEqual(result["status"], "enqueued")
        self.assertEqual(result["doctype"], "CityOS Procurement Request")
        mock_frappe.db.set_value.assert_called_with(
            "CityOS Procurement Request", "PR-001", "cityos_workflow_state", "Workflow Started"
        )

    def test_wrong_doctype_detected(self):
        from cityos.integrations.temporal_sync import WORKFLOW_DOCTYPE_MAP
        expected = WORKFLOW_DOCTYPE_MAP["procurement_approval"]
        self.assertEqual(expected, "CityOS Procurement Request")
        self.assertNotEqual(expected, "Sales Invoice")

    def test_doctype_mapping_consistency(self):
        from cityos.integrations.temporal_sync import WORKFLOW_DOCTYPE_MAP
        self.assertEqual(WORKFLOW_DOCTYPE_MAP["invoice_settlement"], "Municipal Invoice")
        self.assertEqual(WORKFLOW_DOCTYPE_MAP["vendor_onboarding"], "Vendor Compliance Profile")
        self.assertEqual(WORKFLOW_DOCTYPE_MAP["budget_approval"], "Budget Program")

    @patch("cityos.integrations.temporal_sync.enqueue_temporal_workflow")
    @patch("cityos.integrations.temporal_sync.frappe")
    def test_input_data_string_parsed(self, mock_frappe, mock_enqueue):
        from cityos.integrations.temporal_sync import trigger_workflow
        mock_frappe.session.user = "admin@test.com"
        mock_frappe.conf.get.return_value = None
        result = trigger_workflow(
            "approval_chain",
            input_data='{"extra_field": "value"}',
        )
        self.assertEqual(result["status"], "enqueued")
        input_payload = mock_enqueue.call_args[1]["input_data"]
        self.assertIn("extra_field", input_payload)

    @patch("cityos.integrations.temporal_sync.enqueue_temporal_workflow")
    @patch("cityos.integrations.temporal_sync.frappe")
    def test_auto_sets_doctype_from_map(self, mock_frappe, mock_enqueue):
        from cityos.integrations.temporal_sync import trigger_workflow
        mock_frappe.session.user = "admin@test.com"
        mock_frappe.conf.get.return_value = None
        result = trigger_workflow("budget_approval")
        self.assertEqual(result["doctype"], "Budget Program")
        self.assertEqual(result["task_queue"], "xsystem-vertical-queue")


class TestGetWorkflowTypes(unittest.TestCase):

    def test_returns_all_types(self):
        from cityos.integrations.temporal_sync import get_workflow_types, WORKFLOW_METADATA, WORKFLOW_DOCTYPE_MAP
        result = []
        for wf_type, metadata in WORKFLOW_METADATA.items():
            result.append({
                "workflow_type": wf_type,
                "display_name": metadata["displayName"],
                "description": metadata["description"],
                "task_queues": metadata["taskQueues"],
                "domain_pack": metadata["domainPack"],
                "tags": metadata["tags"],
                "expected_doctype": WORKFLOW_DOCTYPE_MAP.get(wf_type),
            })
        self.assertEqual(len(result), 5)
        types = [r["workflow_type"] for r in result]
        self.assertIn("approval_chain", types)
        self.assertIn("procurement_approval", types)
        self.assertIn("invoice_settlement", types)
        self.assertIn("vendor_onboarding", types)
        self.assertIn("budget_approval", types)

    def test_has_all_fields(self):
        from cityos.integrations.temporal_sync import WORKFLOW_METADATA, WORKFLOW_DOCTYPE_MAP
        for wf_type, metadata in WORKFLOW_METADATA.items():
            wf = {
                "workflow_type": wf_type,
                "display_name": metadata["displayName"],
                "description": metadata["description"],
                "task_queues": metadata["taskQueues"],
                "expected_doctype": WORKFLOW_DOCTYPE_MAP.get(wf_type),
            }
            self.assertIn("workflow_type", wf)
            self.assertIn("display_name", wf)
            self.assertIn("description", wf)
            self.assertIn("task_queues", wf)
            self.assertIn("expected_doctype", wf)


class TestWorkflowRegistryModule(unittest.TestCase):

    @patch("cityos.integrations.workflow_registry.frappe")
    def test_discover_skips_when_no_url(self, mock_frappe):
        from cityos.integrations.workflow_registry import _get_registry_url
        mock_frappe.conf.get.return_value = ""
        from cityos.integrations.temporal_sync import get_temporal_config
        with patch("cityos.integrations.workflow_registry.get_temporal_config") as mock_config:
            mock_config.return_value = {"registry_base_url": ""}
            url = _get_registry_url()
            self.assertEqual(url, "")

    @patch("cityos.integrations.workflow_registry.requests")
    @patch("cityos.integrations.workflow_registry.get_temporal_config")
    @patch("cityos.integrations.workflow_registry.frappe")
    def test_discover_success(self, mock_frappe, mock_config, mock_requests):
        from cityos.integrations.workflow_registry import discover_workflows
        mock_frappe.conf.get.return_value = "http://registry.local"
        mock_config.return_value = {
            "registry_base_url": "http://registry.local",
            "system_id": "erpnext",
        }
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"workflowType": "approval_chain", "tags": ["system:erpnext"]},
        ]
        mock_requests.get.return_value = mock_response
        mock_frappe.cache.set_value = MagicMock()

        result = discover_workflows()
        self.assertEqual(len(result), 1)

    @patch("cityos.integrations.workflow_registry.requests")
    @patch("cityos.integrations.workflow_registry.get_temporal_config")
    @patch("cityos.integrations.workflow_registry.frappe")
    def test_register_success(self, mock_frappe, mock_config, mock_requests):
        from cityos.integrations.workflow_registry import register_workflows
        mock_frappe.conf.get.return_value = "http://registry.local"
        mock_config.return_value = {
            "registry_base_url": "http://registry.local",
            "system_id": "erpnext",
        }
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_requests.post.return_value = mock_response

        result = register_workflows()
        self.assertEqual(result["registered"], 5)
        self.assertEqual(result["failed"], 0)

    @patch("cityos.integrations.workflow_registry.requests")
    @patch("cityos.integrations.workflow_registry.get_temporal_config")
    @patch("cityos.integrations.workflow_registry.frappe")
    def test_register_conflict_409_skips(self, mock_frappe, mock_config, mock_requests):
        from cityos.integrations.workflow_registry import register_workflows
        mock_frappe.conf.get.return_value = "http://registry.local"
        mock_config.return_value = {
            "registry_base_url": "http://registry.local",
            "system_id": "erpnext",
        }
        mock_response = MagicMock()
        mock_response.status_code = 409
        mock_requests.post.return_value = mock_response

        result = register_workflows()
        self.assertEqual(result["skipped"], 5)
        self.assertEqual(result["registered"], 0)

    @patch("cityos.integrations.workflow_registry.requests")
    @patch("cityos.integrations.workflow_registry.get_temporal_config")
    @patch("cityos.integrations.workflow_registry.frappe")
    def test_discover_connection_error_graceful(self, mock_frappe, mock_config, mock_requests):
        import requests as req
        from cityos.integrations.workflow_registry import discover_workflows
        mock_frappe.conf.get.return_value = "http://unreachable.local"
        mock_config.return_value = {
            "registry_base_url": "http://unreachable.local",
            "system_id": "erpnext",
        }
        mock_requests.get.side_effect = req.exceptions.ConnectionError("Connection refused")
        mock_requests.exceptions = req.exceptions

        result = discover_workflows()
        self.assertEqual(result, [])

    @patch("cityos.integrations.workflow_registry._sse_thread", None)
    @patch("cityos.integrations.workflow_registry.get_temporal_config")
    @patch("cityos.integrations.workflow_registry.frappe")
    def test_registry_status_no_url(self, mock_frappe, mock_config):
        from cityos.integrations.workflow_registry import get_workflow_registry_status
        mock_config.return_value = {
            "system_id": "erpnext",
            "domain": "xsystem",
            "task_queues": ["xsystem-platform-queue", "xsystem-vertical-queue"],
            "registry_base_url": "",
        }
        mock_frappe.conf.get.return_value = ""
        mock_frappe.cache.get_value.return_value = None

        result = get_workflow_registry_status()
        self.assertEqual(result["system_id"], "erpnext")
        self.assertEqual(result["registry_url"], "(not configured)")
        self.assertEqual(len(result["registered_workflow_types"]), 5)


class TestAuditLogCreation(unittest.TestCase):

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_creates_audit_log_on_approval(self, mock_frappe):
        from cityos.integrations.temporal_sync import _create_workflow_audit
        mock_frappe.db.exists.return_value = True
        mock_doc = MagicMock()
        mock_frappe.new_doc.return_value = mock_doc

        _create_workflow_audit("wf-001", "approval_chain", "completed", {
            "doctype": "CityOS Procurement Request",
            "name": "PR-001",
            "approved": True,
            "approved_by": "admin@dakkah.io",
        })
        mock_frappe.new_doc.assert_called_with("CityOS Audit Log")
        self.assertEqual(mock_doc.document_type, "CityOS Procurement Request")
        self.assertEqual(mock_doc.document_name, "PR-001")
        self.assertEqual(mock_doc.action, "Approved")
        self.assertEqual(mock_doc.user, "admin@dakkah.io")
        mock_doc.insert.assert_called_with(ignore_permissions=True)

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_creates_escalated_audit_on_failure(self, mock_frappe):
        from cityos.integrations.temporal_sync import _create_workflow_audit
        mock_frappe.db.exists.return_value = True
        mock_doc = MagicMock()
        mock_frappe.new_doc.return_value = mock_doc

        _create_workflow_audit("wf-002", "budget_approval", "failed", {
            "name": "BP-001",
        })
        self.assertEqual(mock_doc.action, "Escalated")

    @patch("cityos.integrations.temporal_sync.frappe")
    def test_skips_when_no_audit_doctype(self, mock_frappe):
        from cityos.integrations.temporal_sync import _create_workflow_audit
        mock_frappe.db.exists.return_value = False
        _create_workflow_audit("wf-001", "approval_chain", "completed", {})
        mock_frappe.new_doc.assert_not_called()


if __name__ == "__main__":
    unittest.main()
