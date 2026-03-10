import unittest
from unittest.mock import patch, MagicMock
from datetime import date


class TestGovernanceAuthority(unittest.TestCase):

    @patch("cityos.governance.doctype.governance_authority.governance_authority.frappe")
    def test_self_reference_parent_throws(self, mock_frappe):
        from cityos.governance.doctype.governance_authority.governance_authority import GovernanceAuthority
        doc = MagicMock()
        doc.name = "GA-001"
        doc.parent_authority = "GA-001"
        GovernanceAuthority.validate(doc)
        mock_frappe.throw.assert_called()
        self.assertIn("cannot be its own parent", str(mock_frappe.throw.call_args_list))

    @patch("cityos.governance.doctype.governance_authority.governance_authority.frappe")
    def test_inactive_parent_throws(self, mock_frappe):
        from cityos.governance.doctype.governance_authority.governance_authority import GovernanceAuthority
        parent = MagicMock()
        parent.status = "Inactive"
        mock_frappe.get_doc.return_value = parent
        doc = MagicMock()
        doc.name = "GA-002"
        doc.parent_authority = "GA-001"
        GovernanceAuthority.validate(doc)
        mock_frappe.throw.assert_called()

    @patch("cityos.governance.doctype.governance_authority.governance_authority.frappe")
    def test_valid_parent_no_error(self, mock_frappe):
        from cityos.governance.doctype.governance_authority.governance_authority import GovernanceAuthority
        parent = MagicMock()
        parent.status = "Active"
        mock_frappe.get_doc.return_value = parent
        doc = MagicMock()
        doc.name = "GA-002"
        doc.parent_authority = "GA-001"
        GovernanceAuthority.validate(doc)
        mock_frappe.throw.assert_not_called()

    @patch("cityos.governance.doctype.governance_authority.governance_authority.frappe")
    def test_no_parent_no_error(self, mock_frappe):
        from cityos.governance.doctype.governance_authority.governance_authority import GovernanceAuthority
        doc = MagicMock()
        doc.name = "GA-001"
        doc.parent_authority = ""
        GovernanceAuthority.validate(doc)
        mock_frappe.throw.assert_not_called()


class TestPolicyDoctrine(unittest.TestCase):

    @patch("cityos.governance.doctype.policy_doctrine.policy_doctrine.frappe")
    def test_policy_code_uppercased(self, mock_frappe):
        from cityos.governance.doctype.policy_doctrine.policy_doctrine import PolicyDoctrine
        doc = MagicMock()
        doc.policy_code = "data-res-001"
        doc.effective_date = None
        doc.expiry_date = None
        doc.governance_authority = ""
        PolicyDoctrine.validate(doc)
        self.assertEqual(doc.policy_code, "DATA-RES-001")

    @patch("cityos.governance.doctype.policy_doctrine.policy_doctrine.frappe")
    def test_expiry_before_effective_throws(self, mock_frappe):
        from cityos.governance.doctype.policy_doctrine.policy_doctrine import PolicyDoctrine
        doc = MagicMock()
        doc.policy_code = ""
        doc.effective_date = date(2026, 6, 1)
        doc.expiry_date = date(2026, 1, 1)
        doc.governance_authority = ""
        PolicyDoctrine.validate(doc)
        mock_frappe.throw.assert_called()

    @patch("cityos.governance.doctype.policy_doctrine.policy_doctrine.frappe")
    def test_valid_dates_no_error(self, mock_frappe):
        from cityos.governance.doctype.policy_doctrine.policy_doctrine import PolicyDoctrine
        doc = MagicMock()
        doc.policy_code = ""
        doc.effective_date = date(2026, 1, 1)
        doc.expiry_date = date(2026, 12, 31)
        doc.governance_authority = ""
        PolicyDoctrine.validate(doc)
        mock_frappe.throw.assert_not_called()

    @patch("cityos.governance.doctype.policy_doctrine.policy_doctrine.frappe")
    def test_invalid_governance_authority_throws(self, mock_frappe):
        from cityos.governance.doctype.policy_doctrine.policy_doctrine import PolicyDoctrine
        mock_frappe.db.exists.return_value = False
        doc = MagicMock()
        doc.policy_code = ""
        doc.effective_date = None
        doc.expiry_date = None
        doc.governance_authority = "NonExistent-GA"
        PolicyDoctrine.validate(doc)
        mock_frappe.throw.assert_called()


class TestCityOSPersona(unittest.TestCase):

    @patch("cityos.governance.doctype.cityos_persona.cityos_persona.frappe")
    def test_persona_code_uppercased(self, mock_frappe):
        from cityos.governance.doctype.cityos_persona.cityos_persona import CityOSPersona
        doc = MagicMock()
        doc.persona_code = "citizen-v1"
        CityOSPersona.validate(doc)
        self.assertEqual(doc.persona_code, "CITIZEN-V1")

    @patch("cityos.governance.doctype.cityos_persona.cityos_persona.frappe")
    def test_empty_code_no_error(self, mock_frappe):
        from cityos.governance.doctype.cityos_persona.cityos_persona import CityOSPersona
        doc = MagicMock()
        doc.persona_code = ""
        CityOSPersona.validate(doc)
        mock_frappe.throw.assert_not_called()


class TestCityOSPersonaAssignment(unittest.TestCase):

    @patch("cityos.governance.doctype.cityos_persona_assignment.cityos_persona_assignment.frappe")
    def test_expiry_before_effective_throws(self, mock_frappe):
        from cityos.governance.doctype.cityos_persona_assignment.cityos_persona_assignment import CityOSPersonaAssignment
        doc = MagicMock()
        doc.effective_date = date(2026, 6, 1)
        doc.expiry_date = date(2026, 1, 1)
        doc.persona = "P1"
        doc.tenant = "T1"
        mock_frappe.db.exists.return_value = True
        CityOSPersonaAssignment.validate(doc)
        mock_frappe.throw.assert_called()

    @patch("cityos.governance.doctype.cityos_persona_assignment.cityos_persona_assignment.frappe")
    def test_invalid_persona_throws(self, mock_frappe):
        from cityos.governance.doctype.cityos_persona_assignment.cityos_persona_assignment import CityOSPersonaAssignment
        doc = MagicMock()
        doc.effective_date = None
        doc.expiry_date = None
        doc.persona = "NonExistent"
        doc.tenant = "T1"
        mock_frappe.db.exists.side_effect = lambda dt, name: dt == "Node Context"
        CityOSPersonaAssignment.validate(doc)
        mock_frappe.throw.assert_called()

    @patch("cityos.governance.doctype.cityos_persona_assignment.cityos_persona_assignment.frappe")
    def test_invalid_tenant_throws(self, mock_frappe):
        from cityos.governance.doctype.cityos_persona_assignment.cityos_persona_assignment import CityOSPersonaAssignment
        doc = MagicMock()
        doc.effective_date = None
        doc.expiry_date = None
        doc.persona = "P1"
        doc.tenant = "NonExistent"
        mock_frappe.db.exists.side_effect = lambda dt, name: dt == "CityOS Persona"
        CityOSPersonaAssignment.validate(doc)
        mock_frappe.throw.assert_called()

    @patch("cityos.governance.doctype.cityos_persona_assignment.cityos_persona_assignment.frappe")
    def test_valid_assignment_no_error(self, mock_frappe):
        from cityos.governance.doctype.cityos_persona_assignment.cityos_persona_assignment import CityOSPersonaAssignment
        doc = MagicMock()
        doc.effective_date = date(2026, 1, 1)
        doc.expiry_date = date(2026, 12, 31)
        doc.persona = "P1"
        doc.tenant = "T1"
        mock_frappe.db.exists.return_value = True
        CityOSPersonaAssignment.validate(doc)
        mock_frappe.throw.assert_not_called()


if __name__ == "__main__":
    unittest.main()
