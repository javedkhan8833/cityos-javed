import frappe
from frappe.model.document import Document


class IntegrationOutboxEvent(Document):
    def validate(self):
        if not self.idempotency_key:
            self.idempotency_key = f"{self.event_type}:{self.source_doctype}:{self.source_name}:{self.tenant or 'global'}"

    @staticmethod
    def publish_event(event_type, source_doctype, source_name, payload, target_system="All", tenant=None, country=None, city=None, sector=None, correlation_id=None, priority="Normal"):
        event = frappe.new_doc("Integration Outbox Event")
        event.event_type = event_type
        event.source_doctype = source_doctype
        event.source_name = source_name
        event.event_payload = frappe.as_json(payload) if isinstance(payload, dict) else payload
        event.target_system = target_system
        event.tenant = tenant or ""
        event.country = country or ""
        event.city = city or ""
        event.sector = sector or ""
        event.correlation_id = correlation_id or ""
        event.priority = priority
        event.status = "Pending"
        event.flags.ignore_node_context = True
        event.insert(ignore_permissions=True)
        return event.name
