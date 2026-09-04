"""Spec section 11: personalization must NEVER hide a severe safety warning. This test
guards the `has_severe_alert()` invariant directly so a future change to the scoring engine
or alert generation can never silently regress it."""
from app.models.alerts import WeatherAlert, has_severe_alert


def make_alert(severity: str) -> WeatherAlert:
    return WeatherAlert(
        id=f"test-{severity}",
        title="Test Alert",
        description="Test",
        severity=severity,
        alert_type="storm",
        source="derived",
        issued_at="2026-01-01T00:00:00Z",
    )


def test_no_severe_flag_when_all_alerts_are_minor_or_moderate():
    alerts = [make_alert("minor"), make_alert("moderate")]
    assert has_severe_alert(alerts) is False


def test_severe_flag_true_when_any_alert_is_severe():
    alerts = [make_alert("minor"), make_alert("severe")]
    assert has_severe_alert(alerts) is True


def test_severe_flag_true_when_any_alert_is_extreme():
    assert has_severe_alert([make_alert("extreme")]) is True


def test_severe_flag_false_for_empty_alert_list():
    assert has_severe_alert([]) is False


def test_severe_flag_is_independent_of_alert_source():
    """A severe alert must trigger the override whether it's official (IMD/NWS) or a
    rule-based derived advisory - safety cannot depend on which provider produced it."""
    official_severe = WeatherAlert(
        id="imd-1", title="IMD Warning", description="Test", severity="severe",
        alert_type="storm", source="IMD", issued_at="2026-01-01T00:00:00Z",
    )
    derived_severe = make_alert("severe")
    assert has_severe_alert([official_severe]) is True
    assert has_severe_alert([derived_severe]) is True
