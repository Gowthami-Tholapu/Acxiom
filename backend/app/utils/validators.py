import re
from datetime import date, datetime, timezone
from typing import Optional, Tuple


EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
# Phone regex: requires 10-15 digits, can have leading +, spaces, hyphens, or parentheses
PHONE_REGEX = re.compile(r"^\+?[\d\s\-()]{10,20}$")


def validate_email_format(email: str) -> bool:
    if not email or len(email) > 150:
        return False
    return bool(EMAIL_REGEX.match(email.strip()))


def validate_phone_format(phone: str) -> bool:
    if not phone or len(phone) > 30:
        return False
    clean = re.sub(r"[\s\-\(\)\+]", "", phone)
    if not clean.isdigit() or len(clean) < 10 or len(clean) > 15:
        return False
    return bool(PHONE_REGEX.match(phone.strip()))


def validate_opportunity_rules(
    amount: float,
    probability: float,
    expected_close_date: date,
    stage: str
) -> Tuple[bool, Optional[str]]:
    # Opportunity Amount cannot be negative; active opportunities must require Amount > 0
    if amount < 0:
        return False, "Opportunity Amount cannot be negative."
    if stage not in ["Won", "Lost"] and amount <= 0:
        return False, "Opportunity Amount must be greater than 0 for active opportunities."

    # Probability must be between 0 and 100 inclusive
    if probability < 0 or probability > 100:
        return False, "Probability must be between 0 and 100."

    # Expected Close Date cannot be in the past for active opportunities
    today = date.today()
    if stage not in ["Won", "Lost"] and expected_close_date < today:
        return False, "Expected Close Date cannot be in the past for active opportunities."

    return True, None


def validate_follow_up_date(follow_up_date: datetime, is_historical_allowed: bool = False) -> Tuple[bool, Optional[str]]:
    if is_historical_allowed:
        return True, None
    # Cannot be earlier than today for a new/planned follow-up
    # Extract date
    target_date = follow_up_date.date() if isinstance(follow_up_date, datetime) else follow_up_date
    today = date.today()
    if target_date < today:
        return False, "Follow-up date cannot be earlier than today."
    return True, None
