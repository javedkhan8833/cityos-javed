import frappe
import json
import os
import requests
from frappe.utils import now_datetime


class CityOSCMSClient:
    def __init__(self):
        self.api_url = os.environ.get("CITYOS_CMS_API_URL") or frappe.conf.get("cityos_cms_api_url", "")
        self.api_key = os.environ.get("CITYOS_CMS_API_KEY") or frappe.conf.get("cityos_cms_api_key", "")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Source": "erpnext-cityos",
        })
        self.default_timeout = 30

    def _request(self, method, path, **kwargs):
        if not self.api_url:
            frappe.log_error("CityOS CMS API URL not configured", "CMS Client")
            return None

        if "timeout" not in kwargs:
            kwargs["timeout"] = self.default_timeout

        url = f"{self.api_url}{path}"
        try:
            response = self.session.request(method, url, **kwargs)
            if response.status_code in (200, 201):
                return response.json()
            elif response.status_code == 404:
                return None
            else:
                frappe.log_error(
                    f"CMS API {method} {path} returned {response.status_code}: {response.text[:500]}",
                    "CMS Client Error"
                )
                return None
        except requests.exceptions.ConnectionError:
            frappe.log_error(f"CMS API connection failed: {url}", "CMS Client Error")
            return None
        except Exception as e:
            frappe.log_error(f"CMS API error: {str(e)}", "CMS Client Error")
            return None

    def get(self, path, params=None):
        return self._request("GET", path, params=params)

    def post(self, path, data=None):
        return self._request("POST", path, json=data)

    def put(self, path, data=None):
        return self._request("PUT", path, json=data)

    def delete(self, path):
        return self._request("DELETE", path)

    def get_workflows(self, domain=None, limit=50, offset=0):
        params = {"limit": limit, "offset": offset}
        if domain:
            params["domain"] = domain
        return self.get("/api/workflows", params=params)

    def get_workflow(self, workflow_id):
        return self.get(f"/api/workflows/{workflow_id}")

    def get_workflow_registry(self):
        return self.get("/api/workflows/registry")

    def get_domain_packs(self):
        return self.get("/api/domain-packs")

    def get_domain_pack(self, domain_id):
        return self.get(f"/api/domain-packs/{domain_id}")

    def get_storage_files(self, limit=50, offset=0):
        return self.get("/api/storage", params={"limit": limit, "offset": offset})

    def upload_file(self, file_path, file_name, content_type="application/octet-stream"):
        if not self.api_url:
            return None
        url = f"{self.api_url}/api/storage/upload"
        try:
            with open(file_path, "rb") as f:
                response = self.session.post(
                    url,
                    files={"file": (file_name, f, content_type)},
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                if response.status_code in (200, 201):
                    return response.json()
        except Exception as e:
            frappe.log_error(f"CMS file upload error: {str(e)}", "CMS Client Error")
        return None

    def get_tenants(self, limit=50, offset=0):
        return self.get("/api/tenants", params={"limit": limit, "offset": offset})

    def get_stores(self, tenant_id=None, limit=50, offset=0):
        params = {"limit": limit, "offset": offset}
        if tenant_id:
            params["tenant_id"] = tenant_id
        return self.get("/api/stores", params=params)

    def get_scopes(self, limit=50, offset=0):
        return self.get("/api/scopes", params={"limit": limit, "offset": offset})

    def get_categories(self, scope_id=None, limit=50, offset=0):
        params = {"limit": limit, "offset": offset}
        if scope_id:
            params["scope_id"] = scope_id
        return self.get("/api/categories", params=params)

    def get_subcategories(self, category_id=None, limit=50, offset=0):
        params = {"limit": limit, "offset": offset}
        if category_id:
            params["category_id"] = category_id
        return self.get("/api/subcategories", params=params)

    def get_portals(self, store_id=None, limit=50, offset=0):
        params = {"limit": limit, "offset": offset}
        if store_id:
            params["store_id"] = store_id
        return self.get("/api/portals", params=params)

    def get_countries(self, limit=50, offset=0):
        return self.get("/api/countries", params={"limit": limit, "offset": offset})

    def sync_erp_event(self, event_type, payload):
        return self.post("/api/webhooks/erpnext", data={
            "event": event_type,
            "data": payload,
            "source": "erpnext",
            "timestamp": now_datetime().isoformat(),
        })

    def health_check(self):
        return self.get("/api/health")


def get_cms_client():
    if not hasattr(frappe.local, "_cityos_cms_client"):
        frappe.local._cityos_cms_client = CityOSCMSClient()
    return frappe.local._cityos_cms_client


@frappe.whitelist()
def test_cms_connection():
    client = get_cms_client()
    health = client.health_check()
    if health:
        return {"status": "connected", "data": health}
    return {"status": "disconnected", "error": "Could not reach CMS API"}


@frappe.whitelist()
def fetch_cms_hierarchy():
    client = get_cms_client()
    results = {
        "scopes": client.get_scopes(limit=100) or [],
        "categories": client.get_categories(limit=100) or [],
        "subcategories": client.get_subcategories(limit=100) or [],
        "stores": client.get_stores(limit=100) or [],
        "portals": client.get_portals(limit=100) or [],
        "tenants": client.get_tenants(limit=100) or [],
        "countries": client.get_countries(limit=100) or [],
    }
    return results


@frappe.whitelist()
def fetch_cms_workflows():
    client = get_cms_client()
    workflows = client.get_workflows(limit=100) or {}
    registry = client.get_workflow_registry() or {}
    domain_packs = client.get_domain_packs() or {}
    return {
        "workflows": workflows,
        "registry": registry,
        "domain_packs": domain_packs,
    }


def sync_hierarchy_from_cms():
    from cityos.integrations.payload_sync import (
        _handle_tenant_sync, _handle_scope_sync, _handle_category_sync,
        _handle_subcategory_sync, _handle_store_sync, _handle_portal_sync,
        _handle_governance_authority_sync, _handle_country_sync,
    )

    client = get_cms_client()
    if not client.api_url or not client.api_key:
        frappe.log_error("CityOS CMS API not configured, skipping sync", "CMS Hierarchy Sync")
        return {"status": "skipped", "reason": "not_configured"}

    health = client.health_check()
    if not health:
        frappe.log_error("CityOS CMS API unreachable, skipping sync", "CMS Hierarchy Sync")
        return {"status": "skipped", "reason": "unreachable"}

    stats = {"synced": 0, "errors": 0, "collections": {}}

    sync_order = [
        ("countries", lambda: client.get_countries(limit=500), _handle_country_sync),
        ("governance-authorities", lambda: client.get("/api/governance-authorities", params={"limit": 500}), _handle_governance_authority_sync),
        ("scopes", lambda: client.get_scopes(limit=500), _handle_scope_sync),
        ("categories", lambda: client.get_categories(limit=500), _handle_category_sync),
        ("subcategories", lambda: client.get_subcategories(limit=500), _handle_subcategory_sync),
        ("tenants", lambda: client.get_tenants(limit=500), _handle_tenant_sync),
        ("stores", lambda: client.get_stores(limit=500), _handle_store_sync),
        ("portals", lambda: client.get_portals(limit=500), _handle_portal_sync),
    ]

    for collection_name, fetcher, handler in sync_order:
        try:
            result = fetcher()
            items = _extract_items(result)
            count = 0
            for item in items:
                try:
                    handler("update", item)
                    count += 1
                except Exception as e:
                    stats["errors"] += 1
                    frappe.log_error(
                        f"CMS sync error for {collection_name} item {item.get('id','?')}: {str(e)}",
                        "CMS Hierarchy Sync"
                    )
            stats["collections"][collection_name] = count
            stats["synced"] += count
        except Exception as e:
            stats["errors"] += 1
            frappe.log_error(f"CMS sync error for collection {collection_name}: {str(e)}", "CMS Hierarchy Sync")

    frappe.db.commit()
    frappe.logger("cityos").info(f"CMS hierarchy sync completed: {stats}")
    return {"status": "synced", "stats": stats}


def _extract_items(result):
    if not result:
        return []
    if isinstance(result, list):
        return result
    if isinstance(result, dict):
        return result.get("docs", result.get("data", result.get("items", [])))
    return []



@frappe.whitelist()
def trigger_cms_sync():
    stats = sync_hierarchy_from_cms()
    return stats
