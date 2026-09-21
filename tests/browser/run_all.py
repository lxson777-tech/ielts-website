"""Run every stage-2 scenario script in order against a given base URL and
write one combined docs/personal-learning/evidence/stage2/results.md.

Usage:
    python run_all.py [base_url]

Defaults to helpers.BASE_URL (http://127.0.0.1:4331/ielts-website).
"""
import sys

import helpers
import s1_new_student_intake
import s2_one_hour_persists
import s3_explicit_settings_survive
import s4_audit_contradiction
import s5_expired_exam_date
import s6_seven_day_fifteen_minutes
import s7_refresh_stability
import s8_russian_phone
import s9_keyboard_accessibility

SCENARIOS = [
    s1_new_student_intake,
    s2_one_hour_persists,
    s3_explicit_settings_survive,
    s4_audit_contradiction,
    s5_expired_exam_date,
    s6_seven_day_fifteen_minutes,
    s7_refresh_stability,
    s8_russian_phone,
    s9_keyboard_accessibility,
]


def main():
    base_url = sys.argv[1] if len(sys.argv) > 1 else helpers.BASE_URL
    helpers.reset_results()
    for mod in SCENARIOS:
        print(f"\n=== running {mod.__name__} ===")
        mod.run(base_url)
    print(f"\nDone. Results: {helpers.RESULTS_PATH}")


if __name__ == "__main__":
    main()
