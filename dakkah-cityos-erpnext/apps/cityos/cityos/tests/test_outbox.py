import unittest
from unittest.mock import patch, MagicMock


class TestOutboxPublishPendingEvents(unittest.TestCase):

    @patch("cityos.integrations.outbox.frappe")
    def test_publish_pending_events_processes_events(self, mock_frappe):
        from cityos.integrations.outbox import publish_pending_events
        pending_event = MagicMock()
        pending_event.name = "EVT-001"
        pending_event.event_type = "TEST_EVENT"
        pending_event.target_system = "Payload CMS"
        pending_event.event_payload = '{"test": true}'
        pending_event.retry_count = 0
        pending_event.priority = "Normal"
        mock_frappe.get_all.side_effect = [[pending_event], []]
        mock_frappe.conf.get.return_value = ""
        publish_pending_events()
        mock_frappe.db.set_value.assert_called()

    @patch("cityos.integrations.outbox.frappe")
    def test_no_pending_events_does_nothing(self, mock_frappe):
        from cityos.integrations.outbox import publish_pending_events
        mock_frappe.get_all.return_value = []
        publish_pending_events()


class TestOutboxDispatch(unittest.TestCase):

    @patch("cityos.integrations.outbox.requests")
    @patch("cityos.integrations.outbox.frappe")
    def test_dispatch_to_medusa(self, mock_frappe, mock_requests):
        from cityos.integrations.outbox import _dispatch_to_medusa
        mock_frappe.conf.get.side_effect = lambda k, d="": {
            "medusa_api_url": "http://medusa.local", "medusa_api_key": "key"
        }.get(k, d)
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_requests.post.return_value = mock_response
        _dispatch_to_medusa("TEST_EVENT", {"data": "test"})
        mock_requests.post.assert_called_once()

    @patch("cityos.integrations.outbox.requests")
    @patch("cityos.integrations.outbox.frappe")
    def test_dispatch_to_payload(self, mock_frappe, mock_requests):
        from cityos.integrations.outbox import _dispatch_to_payload
        mock_frappe.conf.get.side_effect = lambda k, d="": {
            "payload_api_url": "http://payload.local", "payload_api_key": "key"
        }.get(k, d)
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_requests.post.return_value = mock_response
        _dispatch_to_payload("TEST_EVENT", {"data": "test"})
        mock_requests.post.assert_called_once()

    @patch("cityos.integrations.outbox.requests")
    @patch("cityos.integrations.outbox.frappe")
    def test_dispatch_to_temporal(self, mock_frappe, mock_requests):
        from cityos.integrations.outbox import _dispatch_to_temporal
        mock_frappe.conf.get.side_effect = lambda k, d="": {
            "temporal_api_url": "http://temporal.local"
        }.get(k, d)
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_requests.post.return_value = mock_response
        _dispatch_to_temporal("TEST_EVENT", {"workflow_type": "test", "task_queue": "test-q"})
        mock_requests.post.assert_called_once()

    @patch("cityos.integrations.outbox.frappe")
    def test_dispatch_to_medusa_skips_no_config(self, mock_frappe):
        from cityos.integrations.outbox import _dispatch_to_medusa
        mock_frappe.conf.get.return_value = ""
        _dispatch_to_medusa("TEST_EVENT", {})

    @patch("cityos.integrations.outbox.requests")
    @patch("cityos.integrations.outbox.frappe")
    def test_dispatch_to_medusa_raises_on_error(self, mock_frappe, mock_requests):
        from cityos.integrations.outbox import _dispatch_to_medusa
        mock_frappe.conf.get.side_effect = lambda k, d="": {
            "medusa_api_url": "http://medusa.local", "medusa_api_key": "key"
        }.get(k, d)
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_requests.post.return_value = mock_response
        with self.assertRaises(Exception):
            _dispatch_to_medusa("TEST_EVENT", {"data": "test"})


class TestOutboxEventDispatchRouting(unittest.TestCase):

    @patch("cityos.integrations.outbox.frappe")
    def test_dispatch_event_routes_to_medusa(self, mock_frappe):
        from cityos.integrations.outbox import _dispatch_event
        mock_frappe.conf.get.return_value = ""
        event = MagicMock()
        event.target_system = "Medusa Commerce"
        event.event_type = "TEST"
        event.event_payload = '{"test": true}'
        _dispatch_event(event)

    @patch("cityos.integrations.outbox.frappe")
    def test_dispatch_event_routes_to_all(self, mock_frappe):
        from cityos.integrations.outbox import _dispatch_event
        mock_frappe.conf.get.return_value = ""
        event = MagicMock()
        event.target_system = "All"
        event.event_type = "TEST"
        event.event_payload = '{"test": true}'
        _dispatch_event(event)


class TestOutboxEventModel(unittest.TestCase):

    @patch("cityos.governance.doctype.integration_outbox_event.integration_outbox_event.frappe")
    def test_idempotency_key_generated(self, mock_frappe):
        from cityos.governance.doctype.integration_outbox_event.integration_outbox_event import IntegrationOutboxEvent
        doc = MagicMock()
        doc.idempotency_key = ""
        doc.event_type = "TEST_EVENT"
        doc.source_doctype = "Sales Invoice"
        doc.source_name = "INV-001"
        doc.tenant = "T1"
        IntegrationOutboxEvent.validate(doc)
        self.assertIn("TEST_EVENT", doc.idempotency_key)
        self.assertIn("Sales Invoice", doc.idempotency_key)

    @patch("cityos.governance.doctype.integration_outbox_event.integration_outbox_event.frappe")
    def test_existing_idempotency_key_preserved(self, mock_frappe):
        from cityos.governance.doctype.integration_outbox_event.integration_outbox_event import IntegrationOutboxEvent
        doc = MagicMock()
        doc.idempotency_key = "custom-key-123"
        IntegrationOutboxEvent.validate(doc)
        self.assertEqual(doc.idempotency_key, "custom-key-123")


if __name__ == "__main__":
    unittest.main()
