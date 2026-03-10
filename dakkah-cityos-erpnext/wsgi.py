import frappe.app
from werkzeug.middleware.shared_data import SharedDataMiddleware
import os

bench_path = os.path.dirname(os.path.abspath(__file__))

def force_site_middleware(app):
    def middleware(environ, start_response):
        environ["HTTP_HOST"] = "site1.local"
        environ["SERVER_NAME"] = "site1.local"
        return app(environ, start_response)
    return middleware

inner_app = force_site_middleware(frappe.app.application)

application = SharedDataMiddleware(
    inner_app,
    {
        "/assets": os.path.join(bench_path, "sites", "assets"),
    },
)

application.allow_fallback = True
