import sys
import os
from unittest.mock import MagicMock
from datetime import date, datetime, timedelta

test_dir = os.path.dirname(__file__)
apps_dir = os.path.join(test_dir, '..', '..', '..')

for app_path in ['frappe', 'erpnext', 'cityos']:
    full_path = os.path.abspath(os.path.join(apps_dir, app_path))
    if full_path not in sys.path:
        sys.path.insert(0, full_path)

if 'frappe' not in sys.modules:
    frappe_mock = MagicMock()

    frappe_mock.utils.getdate = lambda x: x if isinstance(x, date) else date.fromisoformat(str(x)) if x else None
    frappe_mock.utils.today = lambda: '2026-02-10'
    frappe_mock.utils.flt = lambda x, precision=None: round(float(x or 0), precision) if precision else float(x or 0)
    frappe_mock.utils.cint = lambda x: int(x or 0)
    frappe_mock.utils.now_datetime = lambda: datetime(2026, 2, 10, 12, 0, 0)
    frappe_mock.utils.add_days = lambda d, days: (d if isinstance(d, date) else date.fromisoformat(str(d))) + timedelta(days=days) if d else None
    frappe_mock.utils.add_months = lambda d, months: d
    frappe_mock.utils.cstr = lambda x: str(x) if x else ""
    frappe_mock.utils.add_to_date = lambda dt, **kwargs: dt
    frappe_mock.utils.get_datetime = lambda x: datetime.fromisoformat(str(x)) if x else None
    frappe_mock.format_value = lambda v, opts=None: str(v)
    frappe_mock.session = MagicMock()
    frappe_mock.session.user = "testuser@example.com"
    frappe_mock.conf = {}
    frappe_mock.local = MagicMock()
    frappe_mock.local.flags = MagicMock()
    frappe_mock.local.flags.in_test = True
    frappe_mock._ = lambda x: x
    frappe_mock._dict = lambda **kwargs: type('_dict', (dict,), {'__getattr__': dict.get, '__setattr__': dict.__setitem__})(**kwargs)

    frappe_mock.whitelist = lambda **kwargs: lambda fn: fn
    frappe_mock.db.escape = lambda val, percent=True: f"'{val}'"

    def mock_throw(msg, *args, **kwargs):
        raise Exception(msg)

    frappe_mock.throw = mock_throw

    document_mock = MagicMock()
    document_mock.Document = type('Document', (), {})

    sys.modules['frappe'] = frappe_mock
    sys.modules['frappe.utils'] = frappe_mock.utils
    sys.modules['frappe.model'] = MagicMock()
    sys.modules['frappe.model.document'] = document_mock
