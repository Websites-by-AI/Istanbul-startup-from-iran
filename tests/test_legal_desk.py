"""Iran–Türkiye Startup Legal Desk logic."""

from __future__ import annotations

import pytest

from bot import legal_desk
from bot.models import Startup
from tests.conftest import GOOD_INTAKE, WEAK_INTAKE


def test_journey_has_six_steps_in_order():
    assert [s["step"] for s in legal_desk.JOURNEY] == [1, 2, 3, 4, 5, 6]
    titles = [s["title"] for s in legal_desk.JOURNEY]
    assert titles[0] == "Selection"
    assert titles[1] == "Pre-Landing Legal Assessment"
    assert titles[-1] == "Investment"
    # step 3 must carry the no-guarantee flag
    assert legal_desk.JOURNEY[2]["no_guarantee"] is True


def test_two_layer_model_covers_every_step():
    covered = set(legal_desk.LAYERS["layer1"]["steps"]) | set(legal_desk.LAYERS["layer2"]["steps"])
    assert covered == {2, 3, 4, 5, 6}
    assert legal_desk.LAYERS["layer1"]["name"] == "Market Entry Legal"
    assert legal_desk.LAYERS["layer2"]["name"] == "Investment & Growth Legal"


def test_four_commercial_models_exist():
    assert set(legal_desk.COMMERCIAL_MODELS) == {"A", "B", "C", "D"}
    assert legal_desk.COMMERCIAL_MODELS["B"]["name"] == "Preferred Legal Partner"


def test_intake_validation_reports_missing_fields():
    missing = legal_desk.validate_intake({"startup_name": "X"})
    assert "startup_name" not in missing
    assert "sector" in missing and "ip_owned_by_company" in missing
    assert legal_desk.validate_intake(GOOD_INTAKE) == []


def test_good_intake_scores_ready():
    a = legal_desk.pre_landing_assessment(GOOD_INTAKE)
    assert a.band == "ready"
    assert a.score >= 0.75
    assert a.layer == "layer2"          # has a funding target
    assert a.red_flags == []
    assert a.document_checklist and a.questions_for_lawyer


def test_weak_intake_is_not_ready():
    a = legal_desk.pre_landing_assessment(WEAK_INTAKE)
    assert a.band in {"not_ready", "needs_work"}
    assert a.score < 0.75
    assert len(a.red_flags) >= 3
    assert a.layer == "layer1"


def test_assessment_is_monotonic_in_quality():
    weak = legal_desk.pre_landing_assessment(WEAK_INTAKE).score
    good = legal_desk.pre_landing_assessment(GOOD_INTAKE).score
    assert good > weak


def test_missing_ip_adds_a_red_flag_and_a_document():
    intake = dict(GOOD_INTAKE, ip_owned_by_company=False)
    a = legal_desk.pre_landing_assessment(intake)
    assert any("IP" in f for f in a.red_flags)
    assert any("IP assignment" in d for d in a.document_checklist)


def test_fintech_and_healthtech_get_regulatory_note():
    a = legal_desk.pre_landing_assessment(dict(GOOD_INTAKE, sector="FinTech (where legally permitted)"))
    assert any("regulated" in d for d in a.document_checklist)


def test_structure_recommendations_are_options_not_decisions():
    opts = legal_desk.recommend_structures(GOOD_INTAKE)
    assert 1 <= len(opts) <= 3
    assert all(o.startswith("Model") for o in opts)
    # no entity → operating company first
    assert legal_desk.recommend_structures(dict(GOOD_INTAKE, has_iran_entity=False))[0].startswith("Model C")
    # entity + raise → subsidiary first
    assert opts[0].startswith("Model A")


def test_funnel_projection_scales_with_applications():
    base = legal_desk.funnel_projection(100)
    bigger = legal_desk.funnel_projection(500)
    assert base[0]["stage"].startswith("100+")
    assert bigger[2]["projected"] > base[2]["projected"]
    assert all(r["projected"] >= 1 for r in bigger)


def test_open_case_and_advance_through_journey():
    startup = legal_desk.startup_from_intake(GOOD_INTAKE, channel="telegram")
    a = legal_desk.pre_landing_assessment(GOOD_INTAKE)
    case = legal_desk.open_case(startup, GOOD_INTAKE, a, channel="telegram")
    assert case.step == 2 and case.assigned_to_human is True
    assert case.layer == "layer1"
    assert case.history and case.history[0]["event"] == "case_opened"

    for expected in (3, 4, 5, 6, 6):        # 6 is the ceiling
        legal_desk.advance(case)
        assert case.step == expected
    assert case.layer == "layer2"           # step 5/6 belong to layer 2
    assert len([h for h in case.history if h["event"] == "step_advanced"]) == 5


def test_startup_from_intake_maps_types():
    s = legal_desk.startup_from_intake({**GOOD_INTAKE, "team_size": "3", "funding_target_usd": "120000"})
    assert isinstance(s, Startup)
    assert s.team_size == 3 and s.funding_target_usd == 120000
    assert s.has_iran_entity is True and s.ip_owned_by_company is True


def test_rendering_helpers_are_non_empty_and_safe():
    assert "STEP 6" in legal_desk.journey_text()
    assert "No guaranteed immigration result" in legal_desk.journey_text()
    assert "TWO-LAYER" in legal_desk.layers_text()
    assert "Model D" in legal_desk.commercial_models_text()
    a = legal_desk.pre_landing_assessment(GOOD_INTAKE)
    text = legal_desk.assessment_text(a, "Pars Vision AI")
    assert "Pars Vision AI" in text and "Document checklist" in text


def test_pilot_numbers_match_the_deck():
    p = legal_desk.PILOT
    assert (p["teams"], p["team_size"], p["people"]) == (10, 3, 30)
    assert p["city"] == "Istanbul"
