"""Run the whole final verification suite against the frozen production
snapshot and write docs/personal-learning/evidence/final/results.md.

Usage:
    set IELTS_BASE_URL=http://127.0.0.1:4340/ielts-website   (Windows)
    python run_final.py [base_url]

The default base URL is the frozen snapshot at
http://127.0.0.1:4340/ielts-website (no trailing slash; the site 404s on
one). Nothing on that server can hot reload, so every result is
trustworthy: there is no dev-server dependency-optimizer to blame a failure
on, unlike the stage-2 suite in this folder.

Each scenario opens its own fresh browser context and seeds its own
labelled SYNTHETIC data. One scenario crashing does not stop the rest: the
crash is written into results.md as a FAIL with its traceback, because a
scenario that cannot even run is a finding.
"""
import sys
import traceback

import final_helpers

import f01_new_student
import f02_opposite_profiles
import f03_target_and_minima
import f04_one_hour
import f05_busy_day
import f06_seven_days_and_missed
import f07_one_current_session
import f08_real_learning
import f09_exposure
import f10_override_and_direct_entry
import f11_reliability
import f12_accounts
import f13_assessment_boundary
import f14_coverage
import f15_language_and_access
import f16_progress
import f17_audit_findings
import f18_writing_evidence
import f19_report_widths

SCENARIOS = [
    f01_new_student,
    f02_opposite_profiles,
    f03_target_and_minima,
    f04_one_hour,
    f05_busy_day,
    f06_seven_days_and_missed,
    f07_one_current_session,
    f08_real_learning,
    f09_exposure,
    f10_override_and_direct_entry,
    f11_reliability,
    f12_accounts,
    f13_assessment_boundary,
    f14_coverage,
    f15_language_and_access,
    f16_progress,
    f17_audit_findings,
    f18_writing_evidence,
    f19_report_widths,
]


def main():
    base_url = sys.argv[1] if len(sys.argv) > 1 else final_helpers.BASE_URL
    final_helpers.reset_results()
    for mod in SCENARIOS:
        print(f"\n=== running {mod.__name__} ===", flush=True)
        try:
            mod.run(base_url)
        except Exception:
            tb = traceback.format_exc()
            final_helpers.write_row(
                f"{mod.__name__} ran to completion", False,
                "the scenario script itself crashed, which is a finding in its own right: "
                + tb.replace("\n", " ")[-900:],
            )
            print(tb, flush=True)
    print(f"\nDone. Results: {final_helpers.RESULTS_PATH}", flush=True)


if __name__ == "__main__":
    main()
