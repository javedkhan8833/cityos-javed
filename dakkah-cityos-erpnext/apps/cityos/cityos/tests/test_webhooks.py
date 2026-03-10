import unittest
from unittest.mock import patch, MagicMock
import hmac
import hashlib


class TestWebhookSignatureVerification(unittest.TestCase):

    def test_valid_signature(self):
        from cityos.integrations.webhooks import _verify_signature
        secret = "test-secret-key"
        payload = b'{"test": "data"}'
        expected_sig = hmac.HMAC(
            secret.encode("utf-8"), payload, hashlib.sha256
        ).hexdigest()
        result = _verify_signature(payload, secret, expected_sig)
        self.assertTrue(result)

    def test_invalid_signature(self):
        from cityos.integrations.webhooks import _verify_signature
        result = _verify_signature(b'{"test": "data"}', "secret", "wrong-signature")
        self.assertFalse(result)

    def test_empty_signature(self):
        from cityos.integrations.webhooks import _verify_signature
        result = _verify_signature(b'{"test": "data"}', "secret", "")
        self.assertFalse(result)

    def test_different_payloads_different_sigs(self):
        from cityos.integrations.webhooks import _verify_signature
        secret = "test-secret"
        payload1 = b'{"a": 1}'
        payload2 = b'{"a": 2}'
        sig1 = hmac.HMAC(secret.encode("utf-8"), payload1, hashlib.sha256).hexdigest()
        self.assertTrue(_verify_signature(payload1, secret, sig1))
        self.assertFalse(_verify_signature(payload2, secret, sig1))

    def test_unicode_secret(self):
        from cityos.integrations.webhooks import _verify_signature
        secret = "test-secret-unicode-\u00e9"
        payload = b'{"data": "test"}'
        expected_sig = hmac.HMAC(
            secret.encode("utf-8"), payload, hashlib.sha256
        ).hexdigest()
        self.assertTrue(_verify_signature(payload, secret, expected_sig))


class TestMedusaWebhookEndpoint(unittest.TestCase):

    @patch("cityos.integrations.webhooks.frappe")
    def test_medusa_webhook_no_data_throws(self, mock_frappe):
        from cityos.integrations.webhooks import medusa_webhook
        mock_frappe.request.get_json.return_value = None
        mock_frappe.ValidationError = Exception
        mock_frappe.AuthenticationError = Exception
        mock_frappe.throw.side_effect = Exception("No data received")
        with self.assertRaises(Exception):
            medusa_webhook()

    @patch("cityos.integrations.webhooks.frappe")
    def test_medusa_webhook_invalid_signature_throws(self, mock_frappe):
        from cityos.integrations.webhooks import medusa_webhook
        mock_frappe.request.get_json.return_value = {"event": "test"}
        mock_frappe.request.get_data.return_value = b'{"event": "test"}'
        mock_frappe.request.headers = {"x-medusa-signature": "wrong"}
        mock_frappe.conf.get.return_value = "real-secret"
        mock_frappe.AuthenticationError = Exception
        mock_frappe.ValidationError = Exception
        mock_frappe.throw.side_effect = Exception("Invalid signature")
        with self.assertRaises(Exception):
            medusa_webhook()


class TestPayloadWebhookEndpoint(unittest.TestCase):

    @patch("cityos.integrations.webhooks.frappe")
    def test_payload_webhook_no_data_throws(self, mock_frappe):
        from cityos.integrations.webhooks import payload_webhook
        mock_frappe.request.get_json.return_value = None
        mock_frappe.ValidationError = Exception
        mock_frappe.throw.side_effect = Exception("No data received")
        with self.assertRaises(Exception):
            payload_webhook()


class TestTemporalWebhookEndpoint(unittest.TestCase):

    @patch("cityos.integrations.webhooks.frappe")
    def test_temporal_webhook_no_data_throws(self, mock_frappe):
        from cityos.integrations.webhooks import temporal_webhook
        mock_frappe.request.get_json.return_value = None
        mock_frappe.ValidationError = Exception
        mock_frappe.throw.side_effect = Exception("No data received")
        with self.assertRaises(Exception):
            temporal_webhook()


class TestIntegrationStatusEndpoint(unittest.TestCase):

    @patch("cityos.integrations.webhooks.frappe")
    def test_integration_status_returns_dict(self, mock_frappe):
        from cityos.integrations.webhooks import get_integration_status
        mock_frappe.conf.get.side_effect = lambda key, default="": {
            "medusa_api_url": "http://medusa.local",
            "payload_api_url": "http://payload.local",
        }.get(key, default)
        mock_frappe.db.exists.return_value = True
        mock_frappe.db.count.return_value = 5
        result = get_integration_status()
        self.assertIn("medusa", result)
        self.assertIn("payload_cms", result)
        self.assertIn("outbox", result)
        self.assertTrue(result["medusa"]["configured"])
        self.assertTrue(result["payload_cms"]["configured"])


if __name__ == "__main__":
    unittest.main()
