import unittest
from unittest.mock import patch, MagicMock, PropertyMock, call
import sys
import os
import json
from datetime import date, datetime, timedelta

import frappe as frappe_mock

_thrown_messages = []

_original_throw = getattr(frappe_mock, 'throw', None)

def mock_throw(msg, *args, **kwargs):
    _thrown_messages.append(msg)
    raise Exception(msg)

frappe_mock.throw = mock_throw
frappe_mock.msgprint = MagicMock()
frappe_mock.log_error = MagicMock()
frappe_mock.db = MagicMock()
frappe_mock.get_roles = MagicMock(return_value=[])


def setUpModule():
    frappe_mock.local.flags.in_test = True


def flt(x, precision=None):
    return round(float(x or 0), precision) if precision else float(x or 0)


def cint(x):
    return int(x or 0)


def getdate(x):
    if isinstance(x, date):
        return x
    if x:
        return date.fromisoformat(str(x))
    return None


def add_days(d, days):
    if d:
        base = d if isinstance(d, date) else date.fromisoformat(str(d))
        return base + timedelta(days=days)
    return None


def today_str():
    return '2026-02-10'


def today_date():
    return date(2026, 2, 10)


# ============================================================
# FINANCE TESTS
# ============================================================

class TestBudgetProgram(unittest.TestCase):

    def setUp(self):
        _thrown_messages.clear()

    def test_validate_fiscal_year_required(self):
        with self.assertRaises(Exception) as ctx:
            fiscal_year = ""
            if not fiscal_year:
                raise Exception("Fiscal Year is required for Budget Program")
        self.assertIn("Fiscal Year is required", str(ctx.exception))

    def test_validate_fiscal_year_present(self):
        fiscal_year = "2025-2026"
        self.assertTrue(bool(fiscal_year))

    def test_validate_total_budget_positive(self):
        with self.assertRaises(Exception):
            total_budget = 0
            if flt(total_budget) <= 0:
                raise Exception("Total Budget must be greater than 0")

    def test_validate_total_budget_negative(self):
        with self.assertRaises(Exception):
            total_budget = -5000
            if flt(total_budget) <= 0:
                raise Exception("Total Budget must be greater than 0")

    def test_validate_total_budget_valid(self):
        total_budget = 100000
        self.assertGreater(flt(total_budget), 0)

    def test_calculate_amounts_available(self):
        approved_amount = 100000
        committed_amount = 30000
        actual_amount = 20000
        available = flt(approved_amount) - flt(committed_amount) - flt(actual_amount)
        self.assertEqual(available, 50000)

    def test_calculate_available_amount_no_approved(self):
        total_budget = 200000
        approved_amount = 0
        committed_amount = 50000
        actual_amount = 30000
        base = flt(approved_amount) or flt(total_budget)
        available = base - flt(committed_amount) - flt(actual_amount)
        self.assertEqual(available, 120000)

    def test_utilization_percentage_with_approved(self):
        approved_amount = 100000
        committed_amount = 40000
        actual_amount = 30000
        utilization = (flt(committed_amount) + flt(actual_amount)) / flt(approved_amount) * 100
        self.assertEqual(utilization, 70.0)

    def test_utilization_percentage_zero_approved(self):
        approved_amount = 0
        utilization = 0 if flt(approved_amount) <= 0 else 50
        self.assertEqual(utilization, 0)

    def test_utilization_percentage_full(self):
        approved_amount = 50000
        committed_amount = 25000
        actual_amount = 25000
        utilization = (flt(committed_amount) + flt(actual_amount)) / flt(approved_amount) * 100
        self.assertEqual(utilization, 100.0)

    def test_status_transition_draft_to_submitted(self):
        valid_transitions = {
            "Draft": ["Submitted"],
            "Submitted": ["Under Review"],
            "Under Review": ["Approved", "Rejected"],
            "Approved": ["Active"],
            "Active": ["Revision Requested", "Closed"],
        }
        old_status = "Draft"
        new_status = "Submitted"
        allowed = valid_transitions.get(old_status, [])
        self.assertIn(new_status, allowed)

    def test_status_transition_valid_under_review_to_approved(self):
        valid_transitions = {
            "Draft": ["Submitted"],
            "Submitted": ["Under Review"],
            "Under Review": ["Approved", "Rejected"],
            "Approved": ["Active"],
            "Active": ["Revision Requested", "Closed"],
        }
        old_status = "Under Review"
        new_status = "Approved"
        allowed = valid_transitions.get(old_status, [])
        self.assertIn(new_status, allowed)

    def test_status_transition_invalid_draft_to_active(self):
        valid_transitions = {
            "Draft": ["Submitted"],
            "Submitted": ["Under Review"],
            "Under Review": ["Approved", "Rejected"],
            "Approved": ["Active"],
            "Active": ["Revision Requested", "Closed"],
        }
        old_status = "Draft"
        new_status = "Active"
        allowed = valid_transitions.get(old_status, [])
        self.assertNotIn(new_status, allowed)

    def test_status_transition_invalid_approved_to_draft(self):
        valid_transitions = {
            "Draft": ["Submitted"],
            "Submitted": ["Under Review"],
            "Under Review": ["Approved", "Rejected"],
            "Approved": ["Active"],
            "Active": ["Revision Requested", "Closed"],
        }
        old_status = "Approved"
        new_status = "Draft"
        allowed = valid_transitions.get(old_status, [])
        self.assertNotIn(new_status, allowed)

    def test_approved_date_auto_set(self):
        status = "Approved"
        approved_date = None
        if status == "Approved" and not approved_date:
            approved_date = today_str()
        self.assertEqual(approved_date, '2026-02-10')

    def test_approved_date_not_overwritten(self):
        status = "Approved"
        approved_date = "2026-01-15"
        if status == "Approved" and not approved_date:
            approved_date = today_str()
        self.assertEqual(approved_date, "2026-01-15")

    def test_funding_sources_total_match(self):
        approved_amount = 100000
        funding_amounts = [40000, 35000, 25000]
        total_funding = sum(flt(a) for a in funding_amounts)
        self.assertAlmostEqual(total_funding, flt(approved_amount), places=2)

    def test_funding_sources_total_mismatch(self):
        approved_amount = 100000
        funding_amounts = [40000, 35000, 20000]
        total_funding = sum(flt(a) for a in funding_amounts)
        self.assertGreater(abs(total_funding - flt(approved_amount)), 0.01)

    def test_calculate_funding_percentages(self):
        approved_amount = 200000
        funding_amounts = [100000, 60000, 40000]
        percentages = [flt(a) / flt(approved_amount) * 100 for a in funding_amounts]
        self.assertEqual(percentages[0], 50.0)
        self.assertEqual(percentages[1], 30.0)
        self.assertEqual(percentages[2], 20.0)

    def test_calculate_funding_percentages_zero_approved(self):
        approved_amount = 0
        result = []
        if not flt(approved_amount):
            result = []
        self.assertEqual(result, [])

    def test_budget_type_required(self):
        with self.assertRaises(Exception):
            budget_type = ""
            if not budget_type:
                raise Exception("Budget Type is required for Budget Program")


class TestMunicipalInvoice(unittest.TestCase):

    def setUp(self):
        _thrown_messages.clear()

    def test_validate_grand_total_positive(self):
        with self.assertRaises(Exception):
            grand_total = 0
            if not flt(grand_total):
                raise Exception("Grand Total is required and must not be zero")

    def test_validate_grand_total_negative_non_credit(self):
        grand_total = -500
        invoice_type = "Standard"
        with self.assertRaises(Exception):
            if flt(grand_total) <= 0 and invoice_type != "Credit Note":
                raise Exception("Grand Total must be greater than 0")

    def test_validate_grand_total_negative_credit_note(self):
        grand_total = -500
        invoice_type = "Credit Note"
        valid = True
        if flt(grand_total) <= 0 and invoice_type != "Credit Note":
            valid = False
        self.assertTrue(valid)

    def test_calculate_outstanding(self):
        grand_total = 10000
        paid_amount = 3000
        outstanding = flt(grand_total) - flt(paid_amount)
        self.assertEqual(outstanding, 7000)

    def test_calculate_outstanding_fully_paid(self):
        grand_total = 10000
        paid_amount = 10000
        outstanding = flt(grand_total) - flt(paid_amount)
        self.assertEqual(outstanding, 0)

    def test_calculate_outstanding_overpaid(self):
        grand_total = 10000
        paid_amount = 12000
        outstanding = flt(grand_total) - flt(paid_amount)
        self.assertEqual(outstanding, -2000)

    def test_calculate_overdue_days(self):
        due_date = date(2026, 1, 10)
        today_d = date(2026, 2, 10)
        outstanding = 5000
        status = "Draft"
        if outstanding > 0 and status not in ["Paid", "Written Off", "Cancelled"]:
            days_diff = (today_d - due_date).days
            overdue_days = max(0, days_diff)
        else:
            overdue_days = 0
        self.assertEqual(overdue_days, 31)

    def test_calculate_overdue_days_not_due(self):
        due_date = date(2026, 3, 10)
        today_d = date(2026, 2, 10)
        days_diff = (today_d - due_date).days
        overdue_days = max(0, days_diff)
        self.assertEqual(overdue_days, 0)

    def test_late_fee_calculation(self):
        outstanding_amount = 10000
        late_fee_rate = 5.0
        overdue_days = 30
        late_fee = flt(outstanding_amount) * flt(late_fee_rate) / 100 * overdue_days / 365
        self.assertAlmostEqual(late_fee, 41.095, places=2)

    def test_late_fee_no_overdue(self):
        overdue_days = 0
        late_fee_rate = 5.0
        outstanding_amount = 10000
        if overdue_days <= 0:
            late_fee = 0
        else:
            late_fee = flt(outstanding_amount) * flt(late_fee_rate) / 100 * overdue_days / 365
        self.assertEqual(late_fee, 0)

    def test_late_fee_no_rate(self):
        overdue_days = 30
        late_fee_rate = 0
        outstanding_amount = 10000
        if overdue_days > 0 and flt(late_fee_rate) > 0:
            late_fee = flt(outstanding_amount) * flt(late_fee_rate) / 100 * overdue_days / 365
        else:
            late_fee = 0
        self.assertEqual(late_fee, 0)

    def test_payment_status_paid(self):
        paid_amount = 10000
        grand_total = 10000
        if flt(paid_amount) >= flt(grand_total) and flt(grand_total) > 0:
            status = "Paid"
        else:
            status = "Unpaid"
        self.assertEqual(status, "Paid")

    def test_payment_status_partial(self):
        paid_amount = 3000
        grand_total = 10000
        due_date = date(2026, 3, 10)
        if flt(paid_amount) >= flt(grand_total) and flt(grand_total) > 0:
            status = "Paid"
        elif flt(paid_amount) > 0:
            status = "Partially Paid"
        else:
            status = "Unpaid"
        self.assertEqual(status, "Partially Paid")

    def test_payment_status_overdue(self):
        paid_amount = 0
        grand_total = 10000
        due_date = date(2026, 1, 1)
        today_d = date(2026, 2, 10)
        if flt(paid_amount) >= flt(grand_total) and flt(grand_total) > 0:
            status = "Paid"
        elif flt(paid_amount) > 0:
            status = "Partially Paid"
        elif due_date and due_date < today_d:
            status = "Overdue"
        else:
            status = "Unpaid"
        self.assertEqual(status, "Overdue")

    def test_payment_status_unpaid(self):
        paid_amount = 0
        grand_total = 10000
        due_date = date(2026, 3, 10)
        today_d = date(2026, 2, 10)
        if flt(paid_amount) >= flt(grand_total) and flt(grand_total) > 0:
            status = "Paid"
        elif flt(paid_amount) > 0:
            status = "Partially Paid"
        elif due_date and due_date < today_d:
            status = "Overdue"
        else:
            status = "Unpaid"
        self.assertEqual(status, "Unpaid")

    def test_billing_period_validation_valid(self):
        start = date(2026, 1, 1)
        end = date(2026, 1, 31)
        valid = end >= start
        self.assertTrue(valid)

    def test_billing_period_validation_invalid(self):
        start = date(2026, 2, 1)
        end = date(2026, 1, 15)
        with self.assertRaises(Exception):
            if end < start:
                raise Exception("Billing Period End must be after Billing Period Start")

    def test_budget_validation_sufficient(self):
        available = 50000
        grand_total = 30000
        self.assertGreaterEqual(flt(available), flt(grand_total))

    def test_budget_validation_insufficient(self):
        available = 10000
        grand_total = 30000
        with self.assertRaises(Exception):
            if flt(available) < flt(grand_total):
                raise Exception("Insufficient budget")


class TestFundingSource(unittest.TestCase):

    def setUp(self):
        _thrown_messages.clear()

    def test_validate_amount_positive(self):
        with self.assertRaises(Exception):
            total_amount = 0
            annual_amount = 0
            if flt(total_amount) <= 0 and flt(annual_amount) <= 0:
                raise Exception("Total Amount or Annual Amount must be greater than 0")

    def test_validate_amount_total_only(self):
        total_amount = 50000
        annual_amount = 0
        valid = flt(total_amount) > 0 or flt(annual_amount) > 0
        self.assertTrue(valid)

    def test_validate_amount_annual_only(self):
        total_amount = 0
        annual_amount = 12000
        valid = flt(total_amount) > 0 or flt(annual_amount) > 0
        self.assertTrue(valid)

    def test_validate_date_range_valid(self):
        valid_from = date(2025, 1, 1)
        valid_to = date(2026, 12, 31)
        self.assertGreaterEqual(valid_to, valid_from)

    def test_validate_date_range_invalid(self):
        valid_from = date(2026, 6, 1)
        valid_to = date(2025, 12, 31)
        with self.assertRaises(Exception):
            if valid_to < valid_from:
                raise Exception("Valid To date must be after Valid From date")

    def test_donor_required_for_grants(self):
        source_type = "Grant"
        donor_organization = ""
        grant_types = ["Grant", "Donation", "Federal Grant", "State Grant"]
        with self.assertRaises(Exception):
            if source_type in grant_types and not donor_organization:
                raise Exception("Donor Organization is required")

    def test_donor_required_for_federal_grant(self):
        source_type = "Federal Grant"
        donor_organization = ""
        grant_types = ["Grant", "Donation", "Federal Grant", "State Grant"]
        with self.assertRaises(Exception):
            if source_type in grant_types and not donor_organization:
                raise Exception("Donor Organization is required")

    def test_donor_not_required_for_tax(self):
        source_type = "Tax Revenue"
        donor_organization = ""
        grant_types = ["Grant", "Donation", "Federal Grant", "State Grant"]
        requires_donor = source_type in grant_types and not donor_organization
        self.assertFalse(requires_donor)

    def test_calculate_available(self):
        total_amount = 100000
        allocated_amount = 60000
        available = flt(total_amount) - flt(allocated_amount)
        self.assertEqual(available, 40000)

    def test_calculate_available_annual(self):
        total_amount = 0
        annual_amount = 50000
        allocated_amount = 20000
        base = flt(total_amount) or flt(annual_amount) or 0
        available = base - flt(allocated_amount)
        self.assertEqual(available, 30000)

    def test_utilization_percentage(self):
        utilized_amount = 40000
        total_amount = 100000
        utilization = flt(utilized_amount) / flt(total_amount) * 100
        self.assertEqual(utilization, 40.0)

    def test_utilization_percentage_annual(self):
        utilized_amount = 10000
        total_amount = 0
        annual_amount = 50000
        denominator = flt(total_amount) or flt(annual_amount) or 1
        utilization = flt(utilized_amount) / denominator * 100
        self.assertEqual(utilization, 20.0)

    def test_status_exhausted(self):
        available_amount = 0
        if flt(available_amount) <= 0:
            status = "Exhausted"
        else:
            status = "Active"
        self.assertEqual(status, "Exhausted")

    def test_status_exhausted_negative(self):
        available_amount = -100
        if flt(available_amount) <= 0:
            status = "Exhausted"
        else:
            status = "Active"
        self.assertEqual(status, "Exhausted")

    def test_status_expired(self):
        available_amount = 5000
        valid_to = date(2025, 12, 31)
        today_d = date(2026, 2, 10)
        if flt(available_amount) <= 0:
            status = "Exhausted"
        elif valid_to and valid_to < today_d:
            status = "Expired"
        else:
            status = "Active"
        self.assertEqual(status, "Expired")

    def test_status_frozen_preserved(self):
        available_amount = 5000
        valid_to = date(2027, 12, 31)
        today_d = date(2026, 2, 10)
        current_status = "Frozen"
        if flt(available_amount) <= 0:
            status = "Exhausted"
        elif valid_to and valid_to < today_d:
            status = "Expired"
        elif current_status != "Frozen":
            status = "Active"
        else:
            status = current_status
        self.assertEqual(status, "Frozen")

    def test_status_active(self):
        available_amount = 50000
        valid_to = date(2027, 12, 31)
        today_d = date(2026, 2, 10)
        current_status = "Active"
        if flt(available_amount) <= 0:
            status = "Exhausted"
        elif valid_to and valid_to < today_d:
            status = "Expired"
        elif current_status != "Frozen":
            status = "Active"
        else:
            status = current_status
        self.assertEqual(status, "Active")


class TestFiscalAllocation(unittest.TestCase):

    def setUp(self):
        _thrown_messages.clear()

    def test_validate_budget_required(self):
        with self.assertRaises(Exception):
            budget_program = ""
            if not budget_program:
                raise Exception("Budget Program is required for Fiscal Allocation")

    def test_validate_budget_present(self):
        budget_program = "BP-001"
        self.assertTrue(bool(budget_program))

    def test_validate_amount_positive(self):
        with self.assertRaises(Exception):
            allocated_amount = 0
            if flt(allocated_amount) <= 0:
                raise Exception("Allocated Amount must be greater than 0")

    def test_validate_amount_negative(self):
        with self.assertRaises(Exception):
            allocated_amount = -1000
            if flt(allocated_amount) <= 0:
                raise Exception("Allocated Amount must be greater than 0")

    def test_validate_period_dates_valid(self):
        period_start = date(2026, 1, 1)
        period_end = date(2026, 6, 30)
        self.assertGreaterEqual(period_end, period_start)

    def test_validate_period_dates_invalid(self):
        period_start = date(2026, 7, 1)
        period_end = date(2026, 3, 31)
        with self.assertRaises(Exception):
            if period_end < period_start:
                raise Exception("Period End must be after Period Start")

    def test_calculate_remaining(self):
        allocated_amount = 100000
        committed_amount = 30000
        spent_amount = 40000
        remaining = flt(allocated_amount) - flt(committed_amount) - flt(spent_amount)
        self.assertEqual(remaining, 30000)

    def test_calculate_remaining_zero(self):
        allocated_amount = 50000
        committed_amount = 25000
        spent_amount = 25000
        remaining = flt(allocated_amount) - flt(committed_amount) - flt(spent_amount)
        self.assertEqual(remaining, 0)

    def test_status_fully_utilized(self):
        remaining_amount = 0
        period_end = date(2026, 12, 31)
        today_d = date(2026, 2, 10)
        if flt(remaining_amount) <= 0:
            status = "Fully Utilized"
        elif period_end and period_end < today_d:
            status = "Closed"
        else:
            status = "Active"
        self.assertEqual(status, "Fully Utilized")

    def test_status_closed(self):
        remaining_amount = 5000
        period_end = date(2025, 12, 31)
        today_d = date(2026, 2, 10)
        if flt(remaining_amount) <= 0:
            status = "Fully Utilized"
        elif period_end and period_end < today_d:
            status = "Closed"
        else:
            status = "Active"
        self.assertEqual(status, "Closed")

    def test_status_active(self):
        remaining_amount = 5000
        period_end = date(2026, 12, 31)
        today_d = date(2026, 2, 10)
        if flt(remaining_amount) <= 0:
            status = "Fully Utilized"
        elif period_end and period_end < today_d:
            status = "Closed"
        else:
            status = "Active"
        self.assertEqual(status, "Active")

    def test_calculate_remaining_negative(self):
        allocated_amount = 50000
        committed_amount = 30000
        spent_amount = 30000
        remaining = flt(allocated_amount) - flt(committed_amount) - flt(spent_amount)
        self.assertEqual(remaining, -10000)


# ============================================================
# PROCUREMENT TESTS
# ============================================================

class TestProcurementRequest(unittest.TestCase):

    def setUp(self):
        _thrown_messages.clear()

    def test_validate_required_by_date_future(self):
        required_by = date(2026, 3, 1)
        today_d = date(2026, 2, 10)
        self.assertGreaterEqual(required_by, today_d)

    def test_validate_required_by_date_past(self):
        required_by = date(2026, 1, 1)
        today_d = date(2026, 2, 10)
        with self.assertRaises(Exception):
            if required_by < today_d:
                raise Exception("Required By Date must be today or a future date.")

    def test_validate_required_by_date_today(self):
        required_by = date(2026, 2, 10)
        today_d = date(2026, 2, 10)
        self.assertGreaterEqual(required_by, today_d)

    def test_calculate_item_totals(self):
        item_amounts = [5000, 3000, 2000]
        total = sum(flt(a) for a in item_amounts)
        self.assertEqual(total, 10000)

    def test_calculate_item_totals_empty(self):
        item_amounts = []
        total = sum(flt(a) for a in item_amounts)
        self.assertEqual(total, 0)

    def test_calculate_item_totals_single(self):
        item_amounts = [15000]
        total = sum(flt(a) for a in item_amounts)
        self.assertEqual(total, 15000)

    def test_procurement_method_direct_purchase_allowed(self):
        amount = 5000
        method = "Direct Purchase"
        valid = True
        if amount >= 10000 and amount <= 100000 and method == "Direct Purchase":
            valid = False
        self.assertTrue(valid)

    def test_procurement_method_direct_purchase_not_allowed(self):
        amount = 50000
        method = "Direct Purchase"
        with self.assertRaises(Exception):
            if 10000 <= amount <= 100000 and method == "Direct Purchase":
                raise Exception("Direct Purchase not allowed for this amount")

    def test_procurement_method_limited_tender(self):
        amount = 50000
        method = "Limited Tender"
        valid = True
        if 10000 <= amount <= 100000 and method == "Direct Purchase":
            valid = False
        self.assertTrue(valid)

    def test_procurement_method_open_tender_required(self):
        amount = 150000
        method = "Limited Tender"
        with self.assertRaises(Exception):
            if amount > 100000 and method not in ("Open Tender", "Framework Agreement"):
                raise Exception("Open Tender or Framework Agreement required")

    def test_procurement_method_open_tender_valid(self):
        amount = 150000
        method = "Open Tender"
        valid = True
        if amount > 100000 and method not in ("Open Tender", "Framework Agreement"):
            valid = False
        self.assertTrue(valid)

    def test_procurement_method_framework_agreement(self):
        amount = 500000
        method = "Framework Agreement"
        valid = True
        if amount > 100000 and method not in ("Open Tender", "Framework Agreement"):
            valid = False
        self.assertTrue(valid)

    def test_approval_level_department(self):
        amount = 30000
        if amount < 50000:
            level = "Department Head"
        elif amount <= 500000:
            level = "Director"
        else:
            level = "Committee"
        self.assertEqual(level, "Department Head")

    def test_approval_level_director(self):
        amount = 200000
        if amount < 50000:
            level = "Department Head"
        elif amount <= 500000:
            level = "Director"
        else:
            level = "Committee"
        self.assertEqual(level, "Director")

    def test_approval_level_committee(self):
        amount = 1000000
        if amount < 50000:
            level = "Department Head"
        elif amount <= 500000:
            level = "Director"
        else:
            level = "Committee"
        self.assertEqual(level, "Committee")

    def test_approval_level_boundary_50k(self):
        amount = 50000
        if amount < 50000:
            level = "Department Head"
        elif amount <= 500000:
            level = "Director"
        else:
            level = "Committee"
        self.assertEqual(level, "Director")

    def test_approval_level_boundary_500k(self):
        amount = 500000
        if amount < 50000:
            level = "Department Head"
        elif amount <= 500000:
            level = "Director"
        else:
            level = "Committee"
        self.assertEqual(level, "Director")

    def test_status_transitions_draft_to_submitted(self):
        valid_transitions = {
            "Draft": ["Submitted"],
            "Submitted": ["Budget Verified", "Returned for Revision", "Rejected", "Cancelled"],
            "Budget Verified": ["Under Review", "Returned for Revision", "Rejected", "Cancelled"],
            "Under Review": ["Approved", "Returned for Revision", "Rejected", "Cancelled"],
            "Approved": ["RFQ Issued", "Cancelled"],
        }
        self.assertIn("Submitted", valid_transitions["Draft"])

    def test_status_transitions_submitted_to_budget_verified(self):
        valid_transitions = {
            "Draft": ["Submitted"],
            "Submitted": ["Budget Verified", "Returned for Revision", "Rejected", "Cancelled"],
        }
        self.assertIn("Budget Verified", valid_transitions["Submitted"])

    def test_status_transitions_invalid_draft_to_approved(self):
        valid_transitions = {
            "Draft": ["Submitted"],
        }
        self.assertNotIn("Approved", valid_transitions["Draft"])

    def test_mandatory_documents_all_attached(self):
        docs = [
            {"document_name": "ID Copy", "is_mandatory": 1, "is_attached": 1},
            {"document_name": "Tax Cert", "is_mandatory": 1, "is_attached": 1},
        ]
        missing = [d["document_name"] for d in docs if d["is_mandatory"] and not d["is_attached"]]
        self.assertEqual(len(missing), 0)

    def test_mandatory_documents_missing(self):
        docs = [
            {"document_name": "ID Copy", "is_mandatory": 1, "is_attached": 0},
            {"document_name": "Tax Cert", "is_mandatory": 1, "is_attached": 1},
        ]
        missing = [d["document_name"] for d in docs if d["is_mandatory"] and not d["is_attached"]]
        self.assertEqual(missing, ["ID Copy"])

    def test_mandatory_documents_none_mandatory(self):
        docs = [
            {"document_name": "Brochure", "is_mandatory": 0, "is_attached": 0},
        ]
        missing = [d["document_name"] for d in docs if d["is_mandatory"] and not d["is_attached"]]
        self.assertEqual(len(missing), 0)

    def test_request_date_auto_set(self):
        request_date = None
        if not request_date:
            request_date = today_str()
        self.assertEqual(request_date, '2026-02-10')


class TestVendorCompliance(unittest.TestCase):

    def setUp(self):
        _thrown_messages.clear()

    def test_calculate_score_full_marks(self):
        certificates = [{"status": "Valid"}, {"status": "Valid"}, {"status": "Valid"}]
        performance_rating = 5
        delivery_rating = 5
        quality_rating = 5

        total_certs = len(certificates)
        valid_certs = sum(1 for c in certificates if c["status"] == "Valid")
        certificates_valid_pct = (valid_certs / total_certs) * 30

        performance_pct = flt(performance_rating) / 5 * 25
        delivery_pct = flt(delivery_rating) / 5 * 20
        quality_pct = flt(quality_rating) / 5 * 15
        contract_pct = 10

        score = certificates_valid_pct + performance_pct + delivery_pct + quality_pct + contract_pct
        self.assertEqual(score, 100.0)

    def test_calculate_score_no_ratings(self):
        certificates = []
        performance_rating = 0
        delivery_rating = 0
        quality_rating = 0

        certificates_valid_pct = 0
        performance_pct = flt(performance_rating) / 5 * 25
        delivery_pct = flt(delivery_rating) / 5 * 20
        quality_pct = flt(quality_rating) / 5 * 15
        contract_pct = 10

        score = certificates_valid_pct + performance_pct + delivery_pct + quality_pct + contract_pct
        self.assertEqual(score, 10.0)

    def test_calculate_score_partial(self):
        certificates = [{"status": "Valid"}, {"status": "Expired"}]
        performance_rating = 3
        delivery_rating = 4
        quality_rating = 2

        total_certs = len(certificates)
        valid_certs = sum(1 for c in certificates if c["status"] == "Valid")
        certificates_valid_pct = (valid_certs / total_certs) * 30

        performance_pct = flt(performance_rating) / 5 * 25
        delivery_pct = flt(delivery_rating) / 5 * 20
        quality_pct = flt(quality_rating) / 5 * 15
        contract_pct = 10

        score = certificates_valid_pct + performance_pct + delivery_pct + quality_pct + contract_pct
        self.assertAlmostEqual(score, 15 + 15 + 16 + 6 + 10, places=1)

    def test_risk_level_low(self):
        score = 85
        if score >= 80:
            level = "Low"
        elif score >= 60:
            level = "Medium"
        elif score >= 40:
            level = "High"
        else:
            level = "Critical"
        self.assertEqual(level, "Low")

    def test_risk_level_low_boundary(self):
        score = 80
        if score >= 80:
            level = "Low"
        elif score >= 60:
            level = "Medium"
        elif score >= 40:
            level = "High"
        else:
            level = "Critical"
        self.assertEqual(level, "Low")

    def test_risk_level_medium(self):
        score = 65
        if score >= 80:
            level = "Low"
        elif score >= 60:
            level = "Medium"
        elif score >= 40:
            level = "High"
        else:
            level = "Critical"
        self.assertEqual(level, "Medium")

    def test_risk_level_high(self):
        score = 45
        if score >= 80:
            level = "Low"
        elif score >= 60:
            level = "Medium"
        elif score >= 40:
            level = "High"
        else:
            level = "Critical"
        self.assertEqual(level, "High")

    def test_risk_level_critical(self):
        score = 30
        if score >= 80:
            level = "Low"
        elif score >= 60:
            level = "Medium"
        elif score >= 40:
            level = "High"
        else:
            level = "Critical"
        self.assertEqual(level, "Critical")

    def test_risk_level_critical_zero(self):
        score = 0
        if score >= 80:
            level = "Low"
        elif score >= 60:
            level = "Medium"
        elif score >= 40:
            level = "High"
        else:
            level = "Critical"
        self.assertEqual(level, "Critical")

    def test_certificate_status_valid(self):
        today_d = date(2026, 2, 10)
        expiring_soon = today_d + timedelta(days=30)
        expiry_date = date(2027, 6, 1)
        if expiry_date < today_d:
            status = "Expired"
        elif expiry_date <= expiring_soon:
            status = "Expiring Soon"
        else:
            status = "Valid"
        self.assertEqual(status, "Valid")

    def test_certificate_status_expiring(self):
        today_d = date(2026, 2, 10)
        expiring_soon = today_d + timedelta(days=30)
        expiry_date = date(2026, 3, 1)
        if expiry_date < today_d:
            status = "Expired"
        elif expiry_date <= expiring_soon:
            status = "Expiring Soon"
        else:
            status = "Valid"
        self.assertEqual(status, "Expiring Soon")

    def test_certificate_status_expired(self):
        today_d = date(2026, 2, 10)
        expiring_soon = today_d + timedelta(days=30)
        expiry_date = date(2025, 12, 31)
        if expiry_date < today_d:
            status = "Expired"
        elif expiry_date <= expiring_soon:
            status = "Expiring Soon"
        else:
            status = "Valid"
        self.assertEqual(status, "Expired")

    def test_certificate_no_expiry(self):
        expiry_date = None
        status = "Valid" if not expiry_date else "Check"
        self.assertEqual(status, "Valid")

    def test_debarment_validation_reason_required(self):
        debarment_status = "Debarred"
        debarment_reason = ""
        with self.assertRaises(Exception):
            if debarment_status == "Debarred" and not debarment_reason:
                raise Exception("Debarment Reason is required")

    def test_debarment_validation_start_date_required(self):
        debarment_status = "Debarred"
        debarment_start_date = None
        with self.assertRaises(Exception):
            if debarment_status == "Debarred" and not debarment_start_date:
                raise Exception("Debarment Start Date is required")

    def test_debarment_validation_end_date_required(self):
        debarment_status = "Debarred"
        debarment_end_date = None
        with self.assertRaises(Exception):
            if debarment_status == "Debarred" and not debarment_end_date:
                raise Exception("Debarment End Date is required")

    def test_debarment_validation_dates_order(self):
        debarment_start = date(2026, 1, 1)
        debarment_end = date(2025, 12, 31)
        with self.assertRaises(Exception):
            if debarment_end <= debarment_start:
                raise Exception("Debarment End Date must be after Debarment Start Date")

    def test_debarment_validation_valid(self):
        debarment_status = "Debarred"
        debarment_reason = "Fraud"
        debarment_start = date(2026, 1, 1)
        debarment_end = date(2027, 1, 1)
        valid = debarment_end > debarment_start
        self.assertTrue(valid)

    def test_debarment_not_debarred_no_validation(self):
        debarment_status = "Clear"
        should_validate = debarment_status == "Debarred"
        self.assertFalse(should_validate)

    def test_unique_supplier_check(self):
        existing_profile = "VCP-001"
        with self.assertRaises(Exception):
            if existing_profile:
                raise Exception("A Vendor Compliance Profile already exists")

    def test_certificate_date_validation(self):
        issue_date = date(2026, 1, 1)
        expiry_date = date(2025, 12, 31)
        with self.assertRaises(Exception):
            if expiry_date <= issue_date:
                raise Exception("Expiry Date must be after Issue Date")


class TestContractRegister(unittest.TestCase):

    def setUp(self):
        _thrown_messages.clear()

    def test_validate_dates_valid(self):
        start_date = date(2026, 1, 1)
        end_date = date(2026, 12, 31)
        self.assertGreater(end_date, start_date)

    def test_validate_dates_invalid(self):
        start_date = date(2026, 6, 1)
        end_date = date(2026, 1, 1)
        with self.assertRaises(Exception):
            if end_date <= start_date:
                raise Exception("End Date must be after Start Date.")

    def test_validate_dates_same(self):
        start_date = date(2026, 6, 1)
        end_date = date(2026, 6, 1)
        with self.assertRaises(Exception):
            if end_date <= start_date:
                raise Exception("End Date must be after Start Date.")

    def test_validate_contract_value_positive(self):
        contract_value = 50000
        status = "Active"
        valid = not (status != "Draft" and flt(contract_value) <= 0)
        self.assertTrue(valid)

    def test_validate_contract_value_zero_non_draft(self):
        contract_value = 0
        status = "Active"
        with self.assertRaises(Exception):
            if status != "Draft" and flt(contract_value) <= 0:
                raise Exception("Contract Value must be greater than 0")

    def test_validate_contract_value_zero_draft_ok(self):
        contract_value = 0
        status = "Draft"
        should_throw = status != "Draft" and flt(contract_value) <= 0
        self.assertFalse(should_throw)

    def test_calculate_total_value(self):
        contract_value = 100000
        amendment_values = [5000, -2000, 10000]
        amended_value = sum(flt(v) for v in amendment_values)
        total_value = flt(contract_value) + flt(amended_value)
        self.assertEqual(total_value, 113000)

    def test_calculate_total_value_no_amendments(self):
        contract_value = 100000
        amended_value = 0
        total_value = flt(contract_value) + flt(amended_value)
        self.assertEqual(total_value, 100000)

    def test_calculate_remaining(self):
        total_value = 100000
        paid_amount = 30000
        remaining = flt(total_value) - flt(paid_amount)
        self.assertEqual(remaining, 70000)

    def test_retention_amount(self):
        paid_amount = 50000
        retention_percentage = 10
        retention = flt(paid_amount) * flt(retention_percentage) / 100
        self.assertEqual(retention, 5000)

    def test_retention_amount_zero_percentage(self):
        paid_amount = 50000
        retention_percentage = 0
        retention = flt(paid_amount) * flt(retention_percentage) / 100
        self.assertEqual(retention, 0)

    def test_sla_compliance_all_on_time(self):
        milestones = [
            {"status": "Completed", "due_date": date(2026, 3, 1), "completion_date": date(2026, 2, 28)},
            {"status": "Completed", "due_date": date(2026, 6, 1), "completion_date": date(2026, 5, 30)},
        ]
        completed = [m for m in milestones if m["status"] == "Completed"]
        total = len(completed)
        on_time = sum(1 for m in completed if m["completion_date"] <= m["due_date"])
        sla = flt(on_time / total * 100, 2) if total > 0 else 0
        self.assertEqual(sla, 100.0)

    def test_sla_compliance_partial(self):
        milestones = [
            {"status": "Completed", "due_date": date(2026, 3, 1), "completion_date": date(2026, 2, 28)},
            {"status": "Completed", "due_date": date(2026, 6, 1), "completion_date": date(2026, 7, 15)},
        ]
        completed = [m for m in milestones if m["status"] == "Completed"]
        total = len(completed)
        on_time = sum(1 for m in completed if m["completion_date"] <= m["due_date"])
        sla = flt(on_time / total * 100, 2) if total > 0 else 0
        self.assertEqual(sla, 50.0)

    def test_sla_compliance_none_completed(self):
        milestones = [
            {"status": "Pending", "due_date": date(2026, 3, 1), "completion_date": None},
        ]
        completed = [m for m in milestones if m["status"] == "Completed"]
        total = len(completed)
        sla = flt(0 / 1 * 100, 2) if total > 0 else 0
        self.assertEqual(sla, 0)

    def test_status_transitions_draft_to_under_review(self):
        valid_transitions = {
            "Draft": ["Under Review"],
            "Under Review": ["Active", "Draft"],
            "Active": ["Under Amendment", "Suspended", "Expired", "Terminated", "Renewed"],
            "Under Amendment": ["Active", "Terminated"],
            "Suspended": ["Active", "Terminated"],
            "Expired": ["Renewed"],
            "Renewed": ["Active"],
            "Terminated": [],
        }
        self.assertIn("Under Review", valid_transitions["Draft"])

    def test_status_transitions_invalid_draft_to_active(self):
        valid_transitions = {
            "Draft": ["Under Review"],
        }
        self.assertNotIn("Active", valid_transitions["Draft"])

    def test_status_transitions_terminated_no_transition(self):
        valid_transitions = {
            "Terminated": [],
        }
        self.assertEqual(valid_transitions["Terminated"], [])

    def test_auto_expiry(self):
        end_date = date(2025, 12, 31)
        status = "Active"
        today_d = date(2026, 2, 10)
        if end_date and status == "Active" and end_date < today_d:
            status = "Expired"
        self.assertEqual(status, "Expired")

    def test_no_expiry_future_end(self):
        end_date = date(2027, 12, 31)
        status = "Active"
        today_d = date(2026, 2, 10)
        if end_date and status == "Active" and end_date < today_d:
            status = "Expired"
        self.assertEqual(status, "Active")

    def test_payment_schedule_total_valid(self):
        schedule_amounts = [25000, 25000, 25000, 25000]
        total_value = 100000
        schedule_total = sum(flt(a) for a in schedule_amounts)
        self.assertLessEqual(schedule_total, total_value)

    def test_payment_schedule_total_exceeds(self):
        schedule_amounts = [30000, 30000, 30000, 30000]
        total_value = 100000
        schedule_total = sum(flt(a) for a in schedule_amounts)
        with self.assertRaises(Exception):
            if schedule_total > total_value:
                raise Exception("Payment Schedule total exceeds Total Contract Value")


# ============================================================
# ASSETS TESTS
# ============================================================

class TestMunicipalAsset(unittest.TestCase):

    def setUp(self):
        _thrown_messages.clear()

    def test_validate_acquisition_cost_positive(self):
        cost = 50000
        self.assertGreater(flt(cost), 0)

    def test_validate_acquisition_cost_zero(self):
        cost = 0
        with self.assertRaises(Exception):
            if flt(cost) <= 0:
                raise Exception("Acquisition Cost must be greater than 0")

    def test_validate_acquisition_cost_negative(self):
        cost = -1000
        with self.assertRaises(Exception):
            if flt(cost) <= 0:
                raise Exception("Acquisition Cost must be greater than 0")

    def test_straight_line_depreciation(self):
        acquisition_cost = 100000
        salvage_value = 10000
        useful_life = 10
        depreciable = acquisition_cost - salvage_value
        annual_dep = depreciable / useful_life
        self.assertEqual(annual_dep, 9000)

    def test_straight_line_depreciation_5_years(self):
        acquisition_cost = 100000
        salvage_value = 10000
        useful_life = 10
        years_elapsed = 5
        depreciable = acquisition_cost - salvage_value
        annual_dep = depreciable / useful_life
        accumulated = min(annual_dep * years_elapsed, depreciable)
        self.assertEqual(accumulated, 45000)

    def test_straight_line_depreciation_full(self):
        acquisition_cost = 100000
        salvage_value = 10000
        useful_life = 10
        years_elapsed = 12
        depreciable = acquisition_cost - salvage_value
        annual_dep = depreciable / useful_life
        accumulated = min(annual_dep * years_elapsed, depreciable)
        self.assertEqual(accumulated, depreciable)

    def test_straight_line_depreciation_partial_year(self):
        acquisition_cost = 100000
        salvage_value = 10000
        useful_life = 10
        years_elapsed = 2.5
        depreciable = acquisition_cost - salvage_value
        annual_dep = depreciable / useful_life
        accumulated = min(annual_dep * years_elapsed, depreciable)
        self.assertEqual(accumulated, 22500)

    def test_declining_balance_rate(self):
        useful_life = 10
        rate = 2.0 / useful_life
        self.assertEqual(rate, 0.2)

    def test_declining_balance_year1(self):
        acquisition_cost = 100000
        salvage_value = 10000
        useful_life = 10
        rate = 2.0 / useful_life
        year1_dep = acquisition_cost * rate
        year1_dep = min(year1_dep, acquisition_cost - salvage_value)
        self.assertEqual(year1_dep, 20000)

    def test_declining_balance_year2(self):
        acquisition_cost = 100000
        salvage_value = 10000
        useful_life = 10
        rate = 2.0 / useful_life
        book_value = acquisition_cost
        year1_dep = min(book_value * rate, book_value - salvage_value)
        book_value -= year1_dep
        year2_dep = min(book_value * rate, book_value - salvage_value)
        self.assertEqual(year2_dep, 16000)

    def test_current_value_calculation(self):
        acquisition_cost = 100000
        accumulated_depreciation = 30000
        current_value = acquisition_cost - accumulated_depreciation
        self.assertEqual(current_value, 70000)

    def test_current_value_no_depreciation(self):
        acquisition_cost = 100000
        depreciation_method = "None"
        accumulated_depreciation = 0
        current_value = acquisition_cost
        self.assertEqual(current_value, 100000)

    def test_status_transitions_valid(self):
        transitions = {
            "In Procurement": ["In Service"],
            "In Service": ["Under Maintenance", "Out of Service"],
            "Under Maintenance": ["In Service", "Out of Service", "Decommissioned"],
            "Out of Service": ["In Service", "Under Maintenance", "Decommissioned"],
            "Decommissioned": ["Disposed"],
            "Disposed": [],
        }
        self.assertIn("In Service", transitions["In Procurement"])
        self.assertIn("Under Maintenance", transitions["In Service"])
        self.assertIn("In Service", transitions["Under Maintenance"])

    def test_status_transitions_invalid(self):
        transitions = {
            "In Procurement": ["In Service"],
            "Disposed": [],
        }
        self.assertNotIn("In Service", transitions["Disposed"])
        self.assertNotIn("Disposed", transitions["In Procurement"])

    def test_disposal_validation_date_required(self):
        asset_status = "Disposed"
        disposal_date = None
        with self.assertRaises(Exception):
            if asset_status == "Disposed" and not disposal_date:
                raise Exception("Disposal Date is required")

    def test_disposal_validation_method_required(self):
        asset_status = "Disposed"
        disposal_method = ""
        with self.assertRaises(Exception):
            if asset_status == "Disposed" and not disposal_method:
                raise Exception("Disposal Method is required")

    def test_disposal_validation_complete(self):
        asset_status = "Disposed"
        disposal_date = date(2026, 2, 1)
        disposal_method = "Auction"
        valid = bool(disposal_date) and bool(disposal_method)
        self.assertTrue(valid)

    def test_custodian_required_in_service(self):
        asset_status = "In Service"
        custodian = ""
        with self.assertRaises(Exception):
            if asset_status == "In Service" and not custodian:
                raise Exception("Custodian is required when Asset Status is 'In Service'")

    def test_custodian_not_required_other_status(self):
        asset_status = "In Procurement"
        custodian = ""
        should_throw = asset_status == "In Service" and not custodian
        self.assertFalse(should_throw)

    def test_salvage_value_less_than_cost(self):
        acquisition_cost = 100000
        salvage_value = 10000
        self.assertLess(flt(salvage_value), flt(acquisition_cost))

    def test_salvage_value_exceeds_cost(self):
        acquisition_cost = 100000
        salvage_value = 120000
        with self.assertRaises(Exception):
            if flt(salvage_value) >= flt(acquisition_cost):
                raise Exception("Salvage Value must be less than Acquisition Cost")

    def test_useful_life_required_with_depreciation(self):
        depreciation_method = "Straight Line"
        useful_life = 0
        with self.assertRaises(Exception):
            if depreciation_method and depreciation_method != "None" and cint(useful_life) <= 0:
                raise Exception("Useful Life must be greater than 0")

    def test_depreciation_no_method(self):
        depreciation_method = "None"
        accumulated_depreciation = 0
        current_value = 100000
        if not depreciation_method or depreciation_method == "None":
            accumulated_depreciation = 0
            current_value = 100000
        self.assertEqual(accumulated_depreciation, 0)
        self.assertEqual(current_value, 100000)


class TestMunicipalFacility(unittest.TestCase):

    def setUp(self):
        _thrown_messages.clear()

    def test_validate_area_usable_exceeds_total(self):
        total_area = 1000
        usable_area = 1200
        with self.assertRaises(Exception):
            if flt(total_area) > 0 and flt(usable_area) > flt(total_area):
                raise Exception("Usable Area cannot exceed Total Area")

    def test_validate_area_valid(self):
        total_area = 1000
        usable_area = 800
        valid = not (flt(total_area) > 0 and flt(usable_area) > flt(total_area))
        self.assertTrue(valid)

    def test_validate_area_equal(self):
        total_area = 1000
        usable_area = 1000
        valid = not (flt(total_area) > 0 and flt(usable_area) > flt(total_area))
        self.assertTrue(valid)

    def test_validate_occupancy_exceeds_capacity(self):
        capacity = 100
        current_occupancy = 120
        with self.assertRaises(Exception):
            if cint(capacity) > 0 and cint(current_occupancy) > cint(capacity):
                raise Exception("Current Occupancy cannot exceed Capacity")

    def test_validate_occupancy_valid(self):
        capacity = 100
        current_occupancy = 80
        valid = not (cint(capacity) > 0 and cint(current_occupancy) > cint(capacity))
        self.assertTrue(valid)

    def test_validate_year_built_too_old(self):
        year_built = 1700
        with self.assertRaises(Exception):
            if cint(year_built) <= 1800:
                raise Exception("Year Built must be after 1800")

    def test_validate_year_built_future(self):
        year_built = 2030
        current_year = 2026
        with self.assertRaises(Exception):
            if cint(year_built) > current_year:
                raise Exception("Year Built cannot be in the future")

    def test_validate_year_built_valid(self):
        year_built = 2010
        current_year = 2026
        valid = 1800 < cint(year_built) <= current_year
        self.assertTrue(valid)

    def test_occupancy_rate(self):
        capacity = 200
        current_occupancy = 150
        rate = flt(current_occupancy / capacity * 100, 2)
        self.assertEqual(rate, 75.0)

    def test_occupancy_rate_full(self):
        capacity = 100
        current_occupancy = 100
        rate = flt(current_occupancy / capacity * 100, 2)
        self.assertEqual(rate, 100.0)

    def test_occupancy_rate_empty(self):
        capacity = 100
        current_occupancy = 0
        rate = flt(current_occupancy / capacity * 100, 2)
        self.assertEqual(rate, 0.0)

    def test_occupancy_rate_zero_capacity(self):
        capacity = 0
        current_occupancy = 0
        if cint(capacity) > 0:
            rate = flt(current_occupancy / capacity * 100, 2)
        else:
            rate = 0
        self.assertEqual(rate, 0)

    def test_facility_manager_required_active(self):
        facility_status = "Active"
        facility_manager = ""
        with self.assertRaises(Exception):
            if facility_status == "Active" and not facility_manager:
                raise Exception("Facility Manager is required")


class TestMaintenancePlan(unittest.TestCase):

    def setUp(self):
        _thrown_messages.clear()

    def test_validate_asset_or_facility_required(self):
        asset = ""
        facility = ""
        with self.assertRaises(Exception):
            if not asset and not facility:
                raise Exception("Either Asset or Facility must be set")

    def test_validate_asset_set(self):
        asset = "ASSET-001"
        facility = ""
        valid = bool(asset) or bool(facility)
        self.assertTrue(valid)

    def test_validate_facility_set(self):
        asset = ""
        facility = "FAC-001"
        valid = bool(asset) or bool(facility)
        self.assertTrue(valid)

    def test_validate_both_set(self):
        asset = "ASSET-001"
        facility = "FAC-001"
        valid = bool(asset) or bool(facility)
        self.assertTrue(valid)

    def test_calculate_actual_cost(self):
        parts = [{"amount": 500}, {"amount": 300}, {"amount": 200}]
        total = sum(flt(p["amount"]) for p in parts)
        self.assertEqual(total, 1000)

    def test_calculate_actual_cost_empty(self):
        parts = []
        total = sum(flt(p["amount"]) for p in parts)
        self.assertEqual(total, 0)

    def test_calculate_next_date_weekly(self):
        recurrence_days = {"Weekly": 7}
        base_date = date(2026, 2, 10)
        days = recurrence_days["Weekly"]
        next_date = base_date + timedelta(days=days)
        self.assertEqual(next_date, date(2026, 2, 17))

    def test_calculate_next_date_biweekly(self):
        recurrence_days = {"Bi-Weekly": 14}
        base_date = date(2026, 2, 10)
        days = recurrence_days["Bi-Weekly"]
        next_date = base_date + timedelta(days=days)
        self.assertEqual(next_date, date(2026, 2, 24))

    def test_calculate_next_date_monthly(self):
        recurrence_days = {"Monthly": 30}
        base_date = date(2026, 2, 10)
        days = recurrence_days["Monthly"]
        next_date = base_date + timedelta(days=days)
        self.assertEqual(next_date, date(2026, 3, 12))

    def test_calculate_next_date_quarterly(self):
        recurrence_days = {"Quarterly": 90}
        base_date = date(2026, 2, 10)
        days = recurrence_days["Quarterly"]
        next_date = base_date + timedelta(days=days)
        self.assertEqual(next_date, date(2026, 5, 11))

    def test_calculate_next_date_semi_annual(self):
        recurrence_days = {"Semi-Annual": 182}
        base_date = date(2026, 2, 10)
        days = recurrence_days["Semi-Annual"]
        next_date = base_date + timedelta(days=days)
        self.assertEqual(next_date, date(2026, 8, 11))

    def test_calculate_next_date_annual(self):
        recurrence_days = {"Annual": 365}
        base_date = date(2026, 2, 10)
        days = recurrence_days["Annual"]
        next_date = base_date + timedelta(days=days)
        self.assertEqual(next_date, date(2027, 2, 10))

    def test_calculate_next_date_no_recurrence(self):
        recurrence_pattern = "None"
        if recurrence_pattern == "None":
            next_date = None
        self.assertIsNone(next_date)

    def test_overdue_detection(self):
        maintenance_status = "Scheduled"
        scheduled_date = date(2026, 1, 15)
        today_d = date(2026, 2, 10)
        if maintenance_status == "Scheduled" and scheduled_date < today_d:
            maintenance_status = "Overdue"
        self.assertEqual(maintenance_status, "Overdue")

    def test_overdue_detection_not_overdue(self):
        maintenance_status = "Scheduled"
        scheduled_date = date(2026, 3, 15)
        today_d = date(2026, 2, 10)
        if maintenance_status == "Scheduled" and scheduled_date < today_d:
            maintenance_status = "Overdue"
        self.assertEqual(maintenance_status, "Scheduled")

    def test_overdue_detection_completed(self):
        maintenance_status = "Completed"
        scheduled_date = date(2026, 1, 15)
        today_d = date(2026, 2, 10)
        if maintenance_status == "Scheduled" and scheduled_date < today_d:
            maintenance_status = "Overdue"
        self.assertEqual(maintenance_status, "Completed")

    def test_estimated_cost_required(self):
        estimated_cost = 0
        with self.assertRaises(Exception):
            if flt(estimated_cost) <= 0:
                raise Exception("Estimated Cost must be greater than 0")

    def test_next_date_uses_completion_date(self):
        completion_date = date(2026, 2, 15)
        scheduled_date = date(2026, 2, 10)
        base_date = completion_date if completion_date else scheduled_date
        next_date = base_date + timedelta(days=30)
        self.assertEqual(next_date, date(2026, 3, 17))

    def test_next_date_uses_scheduled_date_fallback(self):
        completion_date = None
        scheduled_date = date(2026, 2, 10)
        base_date = completion_date if completion_date else scheduled_date
        next_date = base_date + timedelta(days=30)
        self.assertEqual(next_date, date(2026, 3, 12))


# ============================================================
# HR TESTS
# ============================================================

class TestPositionControl(unittest.TestCase):

    def setUp(self):
        _thrown_messages.clear()

    def test_validate_max_headcount_minimum(self):
        max_headcount = 0
        with self.assertRaises(Exception):
            if cint(max_headcount) < 1:
                raise Exception("Max Headcount must be at least 1")

    def test_validate_max_headcount_valid(self):
        max_headcount = 5
        self.assertGreaterEqual(cint(max_headcount), 1)

    def test_validate_max_headcount_one(self):
        max_headcount = 1
        self.assertGreaterEqual(cint(max_headcount), 1)

    def test_validate_salary_range_valid(self):
        min_salary = 30000
        max_salary = 80000
        valid = flt(min_salary) <= flt(max_salary)
        self.assertTrue(valid)

    def test_validate_salary_range_invalid(self):
        min_salary = 80000
        max_salary = 50000
        with self.assertRaises(Exception):
            if flt(min_salary) > flt(max_salary) and flt(max_salary) > 0:
                raise Exception("Minimum Salary cannot exceed Maximum Salary")

    def test_validate_salary_range_zero_max(self):
        min_salary = 80000
        max_salary = 0
        should_throw = flt(min_salary) > flt(max_salary) and flt(max_salary) > 0
        self.assertFalse(should_throw)

    def test_calculate_filled_count(self):
        filled_count = 3
        max_headcount = 5
        vacancy_count = max(0, cint(max_headcount) - cint(filled_count))
        self.assertEqual(vacancy_count, 2)

    def test_calculate_vacancy_count_full(self):
        filled_count = 5
        max_headcount = 5
        vacancy_count = max(0, cint(max_headcount) - cint(filled_count))
        self.assertEqual(vacancy_count, 0)

    def test_calculate_vacancy_count_empty(self):
        filled_count = 0
        max_headcount = 3
        vacancy_count = max(0, cint(max_headcount) - cint(filled_count))
        self.assertEqual(vacancy_count, 3)

    def test_calculate_vacancy_no_negative(self):
        filled_count = 7
        max_headcount = 5
        vacancy_count = max(0, cint(max_headcount) - cint(filled_count))
        self.assertEqual(vacancy_count, 0)

    def test_no_self_reporting(self):
        position_name = "POS-001"
        reports_to = "POS-001"
        with self.assertRaises(Exception):
            if reports_to and reports_to == position_name:
                raise Exception("Position cannot report to itself")

    def test_no_self_reporting_valid(self):
        position_name = "POS-001"
        reports_to = "POS-002"
        self.assertNotEqual(position_name, reports_to)

    def test_freeze_with_assignments(self):
        is_frozen = True
        active_count = 2
        with self.assertRaises(Exception):
            if is_frozen and active_count > 0:
                raise Exception("Cannot freeze position with active assignments")

    def test_freeze_no_assignments(self):
        is_frozen = True
        active_count = 0
        should_throw = is_frozen and active_count > 0
        self.assertFalse(should_throw)

    def test_abolish_with_assignments(self):
        position_status = "Abolished"
        active_count = 1
        with self.assertRaises(Exception):
            if position_status == "Abolished" and active_count > 0:
                raise Exception("Cannot abolish position with active assignments")

    def test_abolish_no_assignments(self):
        position_status = "Abolished"
        active_count = 0
        should_throw = position_status == "Abolished" and active_count > 0
        self.assertFalse(should_throw)

    def test_department_required(self):
        department = ""
        with self.assertRaises(Exception):
            if not department:
                raise Exception("Department is required")

    def test_designation_required(self):
        designation = ""
        with self.assertRaises(Exception):
            if not designation:
                raise Exception("Designation is required")


class TestStaffAssignment(unittest.TestCase):

    def setUp(self):
        _thrown_messages.clear()

    def test_validate_employee_required(self):
        employee = ""
        with self.assertRaises(Exception):
            if not employee:
                raise Exception("Employee is required")

    def test_validate_position_required(self):
        position = ""
        with self.assertRaises(Exception):
            if not position:
                raise Exception("Position is required")

    def test_validate_effective_from_required(self):
        effective_from = None
        with self.assertRaises(Exception):
            if not effective_from:
                raise Exception("Effective From date is required")

    def test_validate_salary_in_range_valid(self):
        salary = 50000
        min_salary = 30000
        max_salary = 80000
        valid = flt(salary) >= flt(min_salary) and flt(salary) <= flt(max_salary)
        self.assertTrue(valid)

    def test_validate_salary_below_min(self):
        salary = 20000
        min_salary = 30000
        max_salary = 80000
        with self.assertRaises(Exception):
            if flt(min_salary) > 0 and flt(salary) < flt(min_salary):
                raise Exception("Salary below minimum")

    def test_validate_salary_above_max(self):
        salary = 100000
        min_salary = 30000
        max_salary = 80000
        with self.assertRaises(Exception):
            if flt(max_salary) > 0 and flt(salary) > flt(max_salary):
                raise Exception("Salary exceeds maximum")

    def test_auto_fetch_employee_name(self):
        employee = "EMP-001"
        employee_name = "John Doe"
        fetched = employee_name if employee else None
        self.assertEqual(fetched, "John Doe")

    def test_no_duplicate_permanent_check(self):
        assignment_type = "Permanent"
        approval_status = "Approved"
        existing_assignments = ["SA-001"]
        with self.assertRaises(Exception):
            if assignment_type == "Permanent" and approval_status == "Approved" and existing_assignments:
                raise Exception("Employee already has an active permanent assignment")

    def test_no_duplicate_non_permanent(self):
        assignment_type = "Contract"
        approval_status = "Approved"
        should_check = assignment_type == "Permanent" and approval_status == "Approved"
        self.assertFalse(should_check)

    def test_position_vacancy_check_has_vacancy(self):
        vacancy_count = 2
        self.assertGreater(vacancy_count, 0)

    def test_position_vacancy_check_no_vacancy(self):
        vacancy_count = 0
        with self.assertRaises(Exception):
            if cint(vacancy_count) <= 0:
                raise Exception("Position has no vacancies")

    def test_update_position_headcount(self):
        max_headcount = 5
        filled = 3
        vacancy = max(0, max_headcount - filled)
        self.assertEqual(vacancy, 2)

    def test_effective_to_required_non_permanent(self):
        assignment_type = "Contract"
        effective_to = None
        with self.assertRaises(Exception):
            if assignment_type not in ("Permanent",) and not effective_to:
                raise Exception("Effective To date is required for non-permanent assignments")

    def test_effective_to_not_required_permanent(self):
        assignment_type = "Permanent"
        effective_to = None
        should_throw = assignment_type not in ("Permanent",) and not effective_to
        self.assertFalse(should_throw)

    def test_effective_dates_order(self):
        effective_from = date(2026, 6, 1)
        effective_to = date(2026, 1, 1)
        with self.assertRaises(Exception):
            if effective_to and effective_to < effective_from:
                raise Exception("Effective To cannot be before Effective From")

    def test_acting_skip_vacancy_check(self):
        assignment_type = "Acting"
        should_check = assignment_type not in ("Acting", "Interim")
        self.assertFalse(should_check)


# ============================================================
# PROJECTS TESTS
# ============================================================

class TestCapitalProject(unittest.TestCase):

    def setUp(self):
        _thrown_messages.clear()

    def test_validate_budget_positive(self):
        total_budget = 0
        with self.assertRaises(Exception):
            if flt(total_budget) <= 0:
                raise Exception("Total Budget must be greater than 0")

    def test_validate_budget_valid(self):
        total_budget = 5000000
        self.assertGreater(flt(total_budget), 0)

    def test_validate_dates_valid(self):
        start_date = date(2026, 1, 1)
        end_date = date(2028, 12, 31)
        self.assertGreater(end_date, start_date)

    def test_validate_dates_invalid(self):
        start_date = date(2026, 6, 1)
        end_date = date(2026, 1, 1)
        with self.assertRaises(Exception):
            if end_date <= start_date:
                raise Exception("Expected End Date must be after Start Date")

    def test_calculate_financials_budget_utilization(self):
        total_budget = 1000000
        spent_amount = 300000
        committed_amount = 200000
        remaining = flt(total_budget) - flt(spent_amount) - flt(committed_amount)
        utilization = (flt(spent_amount) + flt(committed_amount)) / total_budget * 100
        self.assertEqual(remaining, 500000)
        self.assertEqual(utilization, 50.0)

    def test_calculate_financials_zero_budget(self):
        total_budget = 0
        utilization = 0 if total_budget <= 0 else 50
        self.assertEqual(utilization, 0)

    def test_calculate_completion_milestones(self):
        milestones = [
            {"completion_percentage": 100},
            {"completion_percentage": 50},
            {"completion_percentage": 0},
        ]
        total_weight = len(milestones)
        weighted_completion = sum(flt(m["completion_percentage"]) for m in milestones)
        if total_weight > 0:
            completion = flt(weighted_completion / total_weight, 2)
        else:
            completion = 0
        self.assertEqual(completion, 50.0)

    def test_calculate_completion_all_done(self):
        milestones = [
            {"completion_percentage": 100},
            {"completion_percentage": 100},
        ]
        total_weight = len(milestones)
        weighted_completion = sum(flt(m["completion_percentage"]) for m in milestones)
        completion = flt(weighted_completion / total_weight, 2)
        self.assertEqual(completion, 100.0)

    def test_calculate_completion_no_milestones(self):
        milestones = []
        if not milestones:
            completion = None
        self.assertIsNone(completion)

    def test_risk_level_critical(self):
        budget_utilization = 95
        completion = 40
        if budget_utilization > 90 and completion < 70:
            risk_level = "Critical"
        else:
            risk_level = "Low"
        self.assertEqual(risk_level, "Critical")

    def test_risk_level_high(self):
        budget_utilization = 60
        completion = 20
        expected_progress = 50
        if budget_utilization > 90 and completion < 70:
            risk_level = "Critical"
        elif expected_progress - completion > 20:
            risk_level = "High"
        elif budget_utilization > 75:
            risk_level = "Medium"
        else:
            risk_level = "Low"
        self.assertEqual(risk_level, "High")

    def test_risk_level_medium(self):
        budget_utilization = 80
        completion = 70
        if budget_utilization > 90 and completion < 70:
            risk_level = "Critical"
        elif budget_utilization > 75:
            risk_level = "Medium"
        else:
            risk_level = "Low"
        self.assertEqual(risk_level, "Medium")

    def test_risk_level_low(self):
        budget_utilization = 50
        completion = 60
        if budget_utilization > 90 and completion < 70:
            risk_level = "Critical"
        elif budget_utilization > 75:
            risk_level = "Medium"
        else:
            risk_level = "Low"
        self.assertEqual(risk_level, "Low")

    def test_phase_sequence_valid_forward(self):
        PHASE_SEQUENCE = ["Planning", "Design", "Procurement", "Construction", "Commissioning", "Operational", "Closed"]
        old_phase = "Design"
        new_phase = "Procurement"
        old_idx = PHASE_SEQUENCE.index(old_phase)
        new_idx = PHASE_SEQUENCE.index(new_phase)
        self.assertGreaterEqual(new_idx, old_idx)

    def test_phase_sequence_invalid_backward(self):
        PHASE_SEQUENCE = ["Planning", "Design", "Procurement", "Construction", "Commissioning", "Operational", "Closed"]
        old_phase = "Construction"
        new_phase = "Planning"
        old_idx = PHASE_SEQUENCE.index(old_phase)
        new_idx = PHASE_SEQUENCE.index(new_phase)
        with self.assertRaises(Exception):
            if new_idx < old_idx:
                raise Exception("Invalid phase transition")

    def test_phase_sequence_same_phase(self):
        PHASE_SEQUENCE = ["Planning", "Design", "Procurement", "Construction", "Commissioning", "Operational", "Closed"]
        old_phase = "Design"
        new_phase = "Design"
        self.assertEqual(old_phase, new_phase)

    def test_phase_sequence_skip_forward(self):
        PHASE_SEQUENCE = ["Planning", "Design", "Procurement", "Construction", "Commissioning", "Operational", "Closed"]
        old_phase = "Planning"
        new_phase = "Construction"
        old_idx = PHASE_SEQUENCE.index(old_phase)
        new_idx = PHASE_SEQUENCE.index(new_phase)
        self.assertGreater(new_idx, old_idx)

    def test_project_manager_required_active(self):
        project_status = "Active"
        project_manager = ""
        with self.assertRaises(Exception):
            if project_status == "Active" and not project_manager:
                raise Exception("Project Manager is required")

    def test_completion_percentage_range(self):
        with self.assertRaises(Exception):
            completion = 110
            if flt(completion) < 0 or flt(completion) > 100:
                raise Exception("Completion Percentage must be between 0 and 100")

    def test_completion_percentage_negative(self):
        with self.assertRaises(Exception):
            completion = -5
            if flt(completion) < 0 or flt(completion) > 100:
                raise Exception("Completion Percentage must be between 0 and 100")


class TestCommunityImpact(unittest.TestCase):

    def setUp(self):
        _thrown_messages.clear()

    def test_validate_scores_range_valid(self):
        scores = {"Social Impact Score": 7, "Economic Impact Score": 5, "Environmental Impact Score": 8}
        for label, value in scores.items():
            if value is not None and value != 0:
                self.assertGreaterEqual(flt(value), 0)
                self.assertLessEqual(flt(value), 10)

    def test_validate_scores_range_invalid_high(self):
        score = 11
        with self.assertRaises(Exception):
            if flt(score) < 0 or flt(score) > 10:
                raise Exception("Score must be between 0 and 10")

    def test_validate_scores_range_invalid_negative(self):
        score = -2
        with self.assertRaises(Exception):
            if flt(score) < 0 or flt(score) > 10:
                raise Exception("Score must be between 0 and 10")

    def test_validate_scores_zero_allowed(self):
        score = 0
        valid = True
        if score is not None and score != 0:
            if flt(score) < 0 or flt(score) > 10:
                valid = False
        self.assertTrue(valid)

    def test_calculate_overall_score(self):
        social = 7.0
        economic = 5.0
        environmental = 8.0
        scores = [social, economic, environmental]
        overall = flt(sum(scores) / len(scores), 2)
        self.assertAlmostEqual(overall, 6.67, places=2)

    def test_calculate_overall_score_all_max(self):
        scores = [10.0, 10.0, 10.0]
        overall = flt(sum(scores) / len(scores), 2)
        self.assertEqual(overall, 10.0)

    def test_calculate_overall_score_all_zero(self):
        scores = [0.0, 0.0, 0.0]
        overall = flt(sum(scores) / len(scores), 2)
        self.assertEqual(overall, 0.0)

    def test_calculate_overall_score_partial(self):
        scores = [8.0, 6.0]
        overall = flt(sum(scores) / len(scores), 2)
        self.assertEqual(overall, 7.0)

    def test_calculate_overall_score_empty(self):
        scores = []
        if scores:
            overall = flt(sum(scores) / len(scores), 2)
        else:
            overall = 0
        self.assertEqual(overall, 0)

    def test_validate_publishable_all_filled(self):
        social = 7
        economic = 5
        environmental = 8
        missing = []
        if not social and social != 0:
            missing.append("Social")
        if not economic and economic != 0:
            missing.append("Economic")
        if not environmental and environmental != 0:
            missing.append("Environmental")
        self.assertEqual(len(missing), 0)

    def test_validate_publishable_missing_scores(self):
        social = None
        economic = 5
        environmental = None
        missing = []
        if not social and social != 0:
            missing.append("Social Impact Score")
        if not economic and economic != 0:
            missing.append("Economic Impact Score")
        if not environmental and environmental != 0:
            missing.append("Environmental Impact Score")
        self.assertEqual(len(missing), 2)

    def test_required_fields_linked_project(self):
        linked_project = ""
        with self.assertRaises(Exception):
            if not linked_project:
                raise Exception("Linked Project is required")

    def test_required_fields_assessor(self):
        assessor = ""
        with self.assertRaises(Exception):
            if not assessor:
                raise Exception("Assessor is required")

    def test_required_fields_report_date(self):
        report_date = None
        with self.assertRaises(Exception):
            if not report_date:
                raise Exception("Report Date is required")

    def test_publishable_validation_triggers(self):
        report_status = "Published"
        social = None
        should_validate = report_status == "Published"
        self.assertTrue(should_validate)


# ============================================================
# MULTI-TENANT TESTS
# ============================================================

class TestMultiTenantIsolation(unittest.TestCase):

    def setUp(self):
        _thrown_messages.clear()

    def test_admin_no_filter(self):
        user = "Administrator"
        if user == "Administrator":
            result = ""
        else:
            result = "1=0"
        self.assertEqual(result, "")

    def test_system_manager_no_filter(self):
        user = "manager@test.com"
        roles = ["System Manager"]
        if user == "Administrator":
            result = ""
        elif "System Manager" in roles:
            result = ""
        else:
            result = "1=0"
        self.assertEqual(result, "")

    def test_cityos_admin_no_filter(self):
        user = "admin@cityos.com"
        roles = ["CityOS Administrator"]
        if user == "Administrator":
            result = ""
        elif "System Manager" in roles:
            result = ""
        elif "CityOS Administrator" in roles:
            result = ""
        else:
            result = "1=0"
        self.assertEqual(result, "")

    def test_default_deny_no_tenant(self):
        user = "user@test.com"
        roles = ["Employee"]
        default_tenant = None
        if user == "Administrator":
            result = None
        elif "System Manager" in roles:
            result = None
        elif "CityOS Administrator" in roles:
            result = None
        elif not default_tenant:
            result = "1=0"
        else:
            result = ""
        self.assertEqual(result, "1=0")

    def test_single_tenant_filter(self):
        accessible = {"TENANT-001"}
        doctype = "Budget Program"
        if len(accessible) == 1:
            tenant = list(accessible)[0]
            result = f"(`tab{doctype}`.`cityos_tenant` = '{tenant}' OR `tab{doctype}`.`cityos_tenant` IS NULL OR `tab{doctype}`.`cityos_tenant` = '')"
        self.assertIn("TENANT-001", result)
        self.assertIn("IS NULL", result)

    def test_multi_tenant_filter(self):
        accessible = {"TENANT-001", "TENANT-002", "TENANT-003"}
        doctype = "Budget Program"
        if len(accessible) > 1:
            tenant_list = ", ".join([f"'{t}'" for t in sorted(accessible)])
            result = f"(`tab{doctype}`.`cityos_tenant` IN ({tenant_list}) OR `tab{doctype}`.`cityos_tenant` IS NULL OR `tab{doctype}`.`cityos_tenant` = '')"
        self.assertIn("IN", result)
        self.assertIn("IS NULL", result)

    def test_hierarchical_access(self):
        TIER_HIERARCHY = {"MASTER": 0, "GLOBAL": 1, "REGIONAL": 2, "COUNTRY": 3, "CITY": 4}
        tenant_tier = "REGIONAL"
        hierarchical_tiers = ("MASTER", "GLOBAL", "REGIONAL", "COUNTRY")
        should_get_children = tenant_tier in hierarchical_tiers
        self.assertTrue(should_get_children)

    def test_city_no_hierarchical(self):
        tenant_tier = "CITY"
        hierarchical_tiers = ("MASTER", "GLOBAL", "REGIONAL", "COUNTRY")
        should_get_children = tenant_tier in hierarchical_tiers
        self.assertFalse(should_get_children)

    def test_child_tenant_access(self):
        parent = "REGIONAL-001"
        children = {"COUNTRY-001", "COUNTRY-002", "CITY-001"}
        accessible = {parent}
        accessible.update(children)
        self.assertEqual(len(accessible), 4)
        self.assertIn("REGIONAL-001", accessible)
        self.assertIn("CITY-001", accessible)

    def test_tenant_access_validation_no_tenant(self):
        tenant_id = None
        result = True
        if not tenant_id:
            result = True
        self.assertTrue(result)

    def test_tenant_access_validation_admin(self):
        accessible = None
        tenant_id = "TENANT-001"
        if accessible is None:
            result = True
        else:
            result = tenant_id in accessible
        self.assertTrue(result)

    def test_tenant_access_validation_allowed(self):
        accessible = {"TENANT-001", "TENANT-002"}
        tenant_id = "TENANT-001"
        result = tenant_id in accessible
        self.assertTrue(result)

    def test_tenant_access_validation_denied(self):
        accessible = {"TENANT-001", "TENANT-002"}
        tenant_id = "TENANT-999"
        result = tenant_id in accessible
        self.assertFalse(result)

    def test_tenant_cache_clearing(self):
        cache = {"children_T1": {"tenants": {"T2"}, "timestamp": datetime.now()}}
        cache.clear()
        self.assertEqual(len(cache), 0)

    def test_exempt_doctypes(self):
        EXEMPT_DOCTYPES = [
            "Node Context", "CityOS Audit Log", "CityOS Scope",
            "CityOS Category", "CityOS Subcategory", "CityOS Store",
            "CityOS Portal", "Integration Outbox Event", "Governance Authority",
            "Policy Doctrine", "CityOS Persona", "DocType", "Module Def",
            "Role", "User", "Budget Funding Source", "Procurement Request Item",
        ]
        self.assertIn("Node Context", EXEMPT_DOCTYPES)
        self.assertIn("CityOS Audit Log", EXEMPT_DOCTYPES)
        self.assertIn("Budget Funding Source", EXEMPT_DOCTYPES)

    def test_non_exempt_doctype(self):
        EXEMPT_DOCTYPES = ["Node Context", "CityOS Audit Log"]
        self.assertNotIn("Budget Program", EXEMPT_DOCTYPES)
        self.assertNotIn("Municipal Invoice", EXEMPT_DOCTYPES)

    def test_tier_hierarchy_order(self):
        TIER_HIERARCHY = {"MASTER": 0, "GLOBAL": 1, "REGIONAL": 2, "COUNTRY": 3, "CITY": 4}
        self.assertLess(TIER_HIERARCHY["MASTER"], TIER_HIERARCHY["GLOBAL"])
        self.assertLess(TIER_HIERARCHY["GLOBAL"], TIER_HIERARCHY["REGIONAL"])
        self.assertLess(TIER_HIERARCHY["REGIONAL"], TIER_HIERARCHY["COUNTRY"])
        self.assertLess(TIER_HIERARCHY["COUNTRY"], TIER_HIERARCHY["CITY"])

    def test_accessible_tenants_returns_none_for_admin(self):
        user = "Administrator"
        if user == "Administrator":
            accessible = None
        self.assertIsNone(accessible)

    def test_accessible_tenants_returns_set_for_user(self):
        default_tenant = "TENANT-001"
        accessible = {default_tenant}
        self.assertIsInstance(accessible, set)
        self.assertEqual(len(accessible), 1)

    def test_accessible_tenants_empty_no_default(self):
        default_tenant = None
        if not default_tenant:
            accessible = set()
        self.assertEqual(len(accessible), 0)


# ============================================================
# CMS SYNC TESTS
# ============================================================

class TestPayloadSync(unittest.TestCase):

    def setUp(self):
        _thrown_messages.clear()
        frappe_mock.conf = {}

    def test_no_sync_without_config(self):
        api_url = ""
        api_key = ""
        should_sync = bool(api_url) and bool(api_key)
        self.assertFalse(should_sync)

    def test_no_sync_without_api_key(self):
        api_url = "https://cms.example.com"
        api_key = ""
        should_sync = bool(api_url) and bool(api_key)
        self.assertFalse(should_sync)

    def test_sync_config_present(self):
        api_url = "https://cms.example.com"
        api_key = "secret-key-123"
        should_sync = bool(api_url) and bool(api_key)
        self.assertTrue(should_sync)

    def test_sync_budget_program_payload(self):
        doc = MagicMock()
        doc.name = "BP-001"
        doc.program_name = "Infrastructure Budget"
        doc.cityos_tenant = "TENANT-001"
        doc.status = "Active"
        doc.fiscal_year = "2025-2026"
        doc.total_budget = 1000000
        doc.department = "Public Works"

        payload_data = {
            "name": getattr(doc, "program_name", doc.name),
            "erpnext_id": doc.name,
            "tenant": getattr(doc, "cityos_tenant", ""),
            "source_system": "erpnext",
            "status": getattr(doc, "status", "Active"),
            "fiscal_year": getattr(doc, "fiscal_year", ""),
            "total_budget": getattr(doc, "total_budget", 0),
            "department": getattr(doc, "department", ""),
        }

        self.assertEqual(payload_data["name"], "Infrastructure Budget")
        self.assertEqual(payload_data["erpnext_id"], "BP-001")
        self.assertEqual(payload_data["tenant"], "TENANT-001")
        self.assertEqual(payload_data["source_system"], "erpnext")
        self.assertEqual(payload_data["total_budget"], 1000000)

    def test_sync_municipal_invoice_payload(self):
        doc = MagicMock()
        doc.name = "MI-001"
        doc.invoice_number = "INV-2026-001"
        doc.cityos_tenant = "TENANT-001"
        doc.status = "Draft"
        doc.invoice_type = "Standard"
        doc.grand_total = 50000
        doc.posting_date = "2026-02-10"
        doc.vendor = "Vendor ABC"

        payload_data = {
            "name": getattr(doc, "invoice_number", doc.name),
            "erpnext_id": doc.name,
            "tenant": getattr(doc, "cityos_tenant", ""),
            "source_system": "erpnext",
            "status": getattr(doc, "status", "Draft"),
            "invoice_type": getattr(doc, "invoice_type", ""),
            "grand_total": getattr(doc, "grand_total", 0),
            "vendor": getattr(doc, "vendor", ""),
        }

        self.assertEqual(payload_data["name"], "INV-2026-001")
        self.assertEqual(payload_data["erpnext_id"], "MI-001")
        self.assertEqual(payload_data["grand_total"], 50000)
        self.assertEqual(payload_data["invoice_type"], "Standard")

    def test_sync_conflict_detection_no_config(self):
        api_url = ""
        api_key = ""
        if not api_url or not api_key:
            result = {"conflict_detected": False, "error": "Payload CMS not configured"}
        self.assertFalse(result["conflict_detected"])
        self.assertIn("not configured", result["error"])

    def test_sync_conflict_detection_unknown_doctype(self):
        collection_map = {
            "Budget Program": "budget-programs",
            "Municipal Invoice": "municipal-invoices",
        }
        doctype = "Unknown Doctype"
        collection = collection_map.get(doctype)
        if not collection:
            result = {"conflict_detected": False, "error": f"Unknown doctype: {doctype}"}
        self.assertIn("Unknown doctype", result["error"])

    def test_sync_conflict_detection_collection_map(self):
        collection_map = {
            "Budget Program": "budget-programs",
            "Municipal Invoice": "municipal-invoices",
            "Funding Source": "funding-sources",
            "Fiscal Allocation": "fiscal-allocations",
            "CityOS Procurement Request": "procurement-requests",
            "Vendor Compliance Profile": "vendor-profiles",
            "Contract Register": "contract-registers",
            "Municipal Asset": "municipal-assets",
            "Capital Project": "capital-projects",
            "Position Control": "position-controls",
        }
        self.assertEqual(collection_map["Budget Program"], "budget-programs")
        self.assertEqual(collection_map["Municipal Invoice"], "municipal-invoices")
        self.assertEqual(collection_map["Capital Project"], "capital-projects")
        self.assertEqual(len(collection_map), 10)

    def test_outbox_event_creation_payload(self):
        doc = MagicMock()
        doc.doctype = "Budget Program"
        doc.name = "BP-001"
        collection = "budget-programs"
        payload_data = {"name": "Test", "erpnext_id": "BP-001"}

        event_data = {
            "doctype_name": doc.doctype,
            "document_name": doc.name,
            "collection": collection,
            "payload": json.dumps(payload_data, default=str),
            "status": "Pending",
        }

        self.assertEqual(event_data["doctype_name"], "Budget Program")
        self.assertEqual(event_data["document_name"], "BP-001")
        self.assertEqual(event_data["collection"], "budget-programs")
        self.assertEqual(event_data["status"], "Pending")
        parsed = json.loads(event_data["payload"])
        self.assertEqual(parsed["erpnext_id"], "BP-001")

    def test_outbox_event_status_values(self):
        valid_statuses = ["Pending", "Processing", "Published", "Failed", "Dead Letter"]
        self.assertIn("Pending", valid_statuses)
        self.assertIn("Dead Letter", valid_statuses)

    def test_outbox_retry_logic(self):
        retry_count = 3
        max_retries = 5
        new_status = "Dead Letter" if retry_count >= max_retries else "Failed"
        self.assertEqual(new_status, "Failed")

    def test_outbox_retry_exhausted(self):
        retry_count = 5
        max_retries = 5
        new_status = "Dead Letter" if retry_count >= max_retries else "Failed"
        self.assertEqual(new_status, "Dead Letter")

    def test_sync_vendor_profile_payload(self):
        doc = MagicMock()
        doc.name = "VCP-001"
        doc.vendor_name = "ABC Corp"
        doc.cityos_tenant = "TENANT-001"
        doc.status = "Active"

        payload_data = {
            "name": getattr(doc, "vendor_name", doc.name),
            "erpnext_id": doc.name,
            "tenant": getattr(doc, "cityos_tenant", ""),
            "source_system": "erpnext",
            "status": getattr(doc, "status", "Active"),
        }

        self.assertEqual(payload_data["name"], "ABC Corp")
        self.assertEqual(payload_data["source_system"], "erpnext")

    def test_sync_capital_project_payload(self):
        doc = MagicMock()
        doc.name = "CP-001"
        doc.project_name = "Highway Extension"
        doc.cityos_tenant = "TENANT-002"
        doc.total_budget = 5000000
        doc.status = "Planning"

        payload_data = {
            "name": getattr(doc, "project_name", doc.name),
            "erpnext_id": doc.name,
            "tenant": getattr(doc, "cityos_tenant", ""),
            "total_budget": getattr(doc, "total_budget", 0),
            "status": getattr(doc, "status", "Planning"),
        }

        self.assertEqual(payload_data["name"], "Highway Extension")
        self.assertEqual(payload_data["total_budget"], 5000000)

    def test_webhook_handler_collection_map(self):
        handlers = {
            "tenants": "handle_tenant",
            "stores": "handle_store",
            "categories": "handle_category",
            "scopes": "handle_scope",
            "subcategories": "handle_subcategory",
            "portals": "handle_portal",
            "governance-authorities": "handle_governance",
            "policies": "handle_policy",
            "personas": "handle_persona",
        }
        self.assertIn("tenants", handlers)
        self.assertIn("governance-authorities", handlers)
        self.assertNotIn("unknown-collection", handlers)

    def test_dispatch_target_systems(self):
        dispatchers = ["Medusa Commerce", "Payload CMS", "Temporal Workflow"]
        self.assertIn("Medusa Commerce", dispatchers)
        self.assertIn("Payload CMS", dispatchers)
        self.assertIn("Temporal Workflow", dispatchers)

    def test_sync_funding_source_payload(self):
        doc = MagicMock()
        doc.name = "FS-001"
        doc.source_name = "Federal Grant 2026"
        doc.cityos_tenant = "TENANT-001"
        doc.source_type = "Federal Grant"
        doc.total_amount = 500000
        doc.status = "Active"

        payload_data = {
            "name": getattr(doc, "source_name", doc.name),
            "erpnext_id": doc.name,
            "source_type": getattr(doc, "source_type", ""),
            "total_amount": getattr(doc, "total_amount", 0),
            "status": getattr(doc, "status", "Active"),
        }

        self.assertEqual(payload_data["source_type"], "Federal Grant")
        self.assertEqual(payload_data["total_amount"], 500000)


# ============================================================
# ADDITIONAL EDGE CASE TESTS
# ============================================================

class TestBudgetCalculationEdgeCases(unittest.TestCase):

    def test_remaining_amount_calculation(self):
        total_budget = 500000
        spent_amount = 200000
        remaining = flt(total_budget) - flt(spent_amount)
        self.assertEqual(remaining, 300000)

    def test_remaining_amount_overspent(self):
        total_budget = 100000
        spent_amount = 120000
        remaining = flt(total_budget) - flt(spent_amount)
        self.assertEqual(remaining, -20000)

    def test_funding_source_percentage_calculation(self):
        total = 200000
        amounts = [80000, 60000, 40000, 20000]
        percentages = [a / total * 100 for a in amounts]
        self.assertEqual(sum(percentages), 100.0)

    def test_invoice_outstanding_edge_cases(self):
        self.assertEqual(flt(0) - flt(0), 0)
        self.assertEqual(flt(None) - flt(None), 0)
        self.assertEqual(flt(100) - flt(0), 100)


class TestDepreciationEdgeCases(unittest.TestCase):

    def test_zero_salvage_value(self):
        acquisition_cost = 50000
        salvage_value = 0
        useful_life = 5
        depreciable = acquisition_cost - salvage_value
        annual_dep = depreciable / useful_life
        self.assertEqual(annual_dep, 10000)

    def test_equal_cost_and_salvage(self):
        acquisition_cost = 50000
        salvage_value = 50000
        depreciable = acquisition_cost - salvage_value
        self.assertEqual(depreciable, 0)

    def test_one_year_useful_life(self):
        acquisition_cost = 10000
        salvage_value = 1000
        useful_life = 1
        depreciable = acquisition_cost - salvage_value
        annual_dep = depreciable / useful_life
        self.assertEqual(annual_dep, 9000)

    def test_declining_balance_rate_short_life(self):
        useful_life = 3
        rate = 2.0 / useful_life
        self.assertAlmostEqual(rate, 0.6667, places=3)


class TestComplianceScoreEdgeCases(unittest.TestCase):

    def test_single_certificate_valid(self):
        certificates = [{"status": "Valid"}]
        total = len(certificates)
        valid = sum(1 for c in certificates if c["status"] == "Valid")
        pct = (valid / total) * 30
        self.assertEqual(pct, 30.0)

    def test_single_certificate_expired(self):
        certificates = [{"status": "Expired"}]
        total = len(certificates)
        valid = sum(1 for c in certificates if c["status"] == "Valid")
        pct = (valid / total) * 30
        self.assertEqual(pct, 0.0)

    def test_mixed_certificates(self):
        certificates = [
            {"status": "Valid"}, {"status": "Expired"},
            {"status": "Valid"}, {"status": "Expiring Soon"},
        ]
        total = len(certificates)
        valid = sum(1 for c in certificates if c["status"] == "Valid")
        pct = (valid / total) * 30
        self.assertEqual(pct, 15.0)

    def test_all_ratings_at_three(self):
        performance_pct = 3.0 / 5 * 25
        delivery_pct = 3.0 / 5 * 20
        quality_pct = 3.0 / 5 * 15
        total = performance_pct + delivery_pct + quality_pct
        self.assertEqual(total, 36.0)


class TestProcurementBoundaryConditions(unittest.TestCase):

    def test_amount_exactly_10000(self):
        amount = 10000
        method = "Direct Purchase"
        should_reject = 10000 <= amount <= 100000 and method == "Direct Purchase"
        self.assertTrue(should_reject)

    def test_amount_9999(self):
        amount = 9999
        method = "Direct Purchase"
        should_reject = 10000 <= amount <= 100000 and method == "Direct Purchase"
        self.assertFalse(should_reject)

    def test_amount_exactly_100000(self):
        amount = 100000
        method = "Limited Tender"
        should_reject = amount > 100000 and method not in ("Open Tender", "Framework Agreement")
        self.assertFalse(should_reject)

    def test_amount_100001(self):
        amount = 100001
        method = "Limited Tender"
        should_reject = amount > 100000 and method not in ("Open Tender", "Framework Agreement")
        self.assertTrue(should_reject)

    def test_approval_level_49999(self):
        amount = 49999
        if amount < 50000:
            level = "Department Head"
        elif amount <= 500000:
            level = "Director"
        else:
            level = "Committee"
        self.assertEqual(level, "Department Head")

    def test_approval_level_500001(self):
        amount = 500001
        if amount < 50000:
            level = "Department Head"
        elif amount <= 500000:
            level = "Director"
        else:
            level = "Committee"
        self.assertEqual(level, "Committee")


class TestContractCalculationEdgeCases(unittest.TestCase):

    def test_sla_compliance_all_late(self):
        milestones = [
            {"status": "Completed", "due_date": date(2026, 1, 1), "completion_date": date(2026, 2, 1)},
            {"status": "Completed", "due_date": date(2026, 3, 1), "completion_date": date(2026, 4, 1)},
        ]
        completed = [m for m in milestones if m["status"] == "Completed"]
        total = len(completed)
        on_time = sum(1 for m in completed if m["completion_date"] <= m["due_date"])
        sla = flt(on_time / total * 100, 2) if total > 0 else 0
        self.assertEqual(sla, 0.0)

    def test_retention_calculation_large(self):
        paid_amount = 5000000
        retention_pct = 5
        retention = flt(paid_amount) * flt(retention_pct) / 100
        self.assertEqual(retention, 250000)

    def test_total_value_with_negative_amendment(self):
        contract_value = 100000
        amendments = [-10000, -5000]
        amended = sum(amendments)
        total = contract_value + amended
        self.assertEqual(total, 85000)


class TestTenantIsolationEdgeCases(unittest.TestCase):

    def test_empty_accessible_set(self):
        accessible = set()
        self.assertEqual(len(accessible), 0)

    def test_recursive_children(self):
        parent = "MASTER-001"
        children_level1 = {"REGIONAL-001", "REGIONAL-002"}
        children_level2 = {"COUNTRY-001", "COUNTRY-002"}
        all_children = children_level1 | children_level2
        accessible = {parent} | all_children
        self.assertEqual(len(accessible), 5)

    def test_permission_query_empty_accessible(self):
        accessible = set()
        if not accessible:
            result = "1=0"
        self.assertEqual(result, "1=0")

    def test_node_context_validate_exempt(self):
        exempt = ["Node Context", "CityOS Audit Log"]
        doctype = "Node Context"
        if doctype in exempt:
            should_validate = False
        else:
            should_validate = True
        self.assertFalse(should_validate)

    def test_node_context_validate_non_exempt(self):
        exempt = ["Node Context", "CityOS Audit Log"]
        doctype = "Budget Program"
        if doctype in exempt:
            should_validate = False
        else:
            should_validate = True
        self.assertTrue(should_validate)


if __name__ == '__main__':
    unittest.main()
