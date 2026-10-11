"""Run every Sellora test suite and print a summary.

Setup (once):
    pip install playwright pillow
    python -m playwright install chromium

Run:
    python run_all.py          (all 18 suites)
    python run_all.py 12 18    (only suites 12 to 18)
"""
import os
import re
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.abspath(os.path.join(HERE, "..", "Sellora_Seller_Center.html"))
GAP = os.path.join(HERE, "force_gap.js")

SUITES = [
    ("End-to-end: every page and form", "01_end_to_end.py", [APP]),
    ("End-to-end: old-browser layout mode", "01_end_to_end.py", [APP, GAP]),
    ("Browser environments", "02_browser_environments.py", []),
    ("Review 1: bugs 1-18 are gone", "03_review1_bugs_1-18.py", [APP]),
    ("Review 1: new behaviour", "04_review1_features.py", []),
    ("Review 2: bugs 19-38 are gone", "05_review2_bugs_19-38.py", [APP]),
    ("Review 2: new features", "06_review2_features.py", []),
    ("Review 3: bugs 39-43 are gone", "07_review3_bugs_39-43.py", [APP]),
    ("Review 4: bugs 44-49 are gone", "08_review4_bugs_44-49.py", [APP]),
    ("Review 4: editing orders", "09_review4_features.py", []),
    ("Review 5: bugs 50-51 are gone", "10_review5_bugs_50-51.py", [APP]),
    ("Part payments", "11_part_payments.py", []),
    ("Refunds and discount hints", "12_refunds_and_hints.py", []),
    ("Login, demo shop, preview windows", "13_login_and_preview_windows.py", []),
    ("Sample data audit", "14_sample_data_audit.py", []),
    ("Month view", "15_month_view.py", []),
    ("Income and expenses", "16_income_and_expenses.py", []),
    ("Year view", "17_year_view.py", []),
    ("Review 6: no future-dated data", "18_review6_no_future_data.py", []),
]


def verdict(output):
    """Return (ok, short summary) from a suite's printed output."""
    m = re.search(r"(\d+)/(\d+) passed", output)
    if m:
        return m.group(1) == m.group(2), m.group(0)
    m = re.search(r"(confirmed bugs|confirmed|still present): (\d+) / (\d+)", output)
    if m:
        return m.group(2) == "0", "bugs still present: %s of %s" % (m.group(2), m.group(3))
    last = output.strip().splitlines()[-1:] or ["no output"]
    return False, "did not finish: " + last[0][:120]


def main():
    if not os.path.exists(APP):
        sys.exit("Cannot find the app at " + APP)
    first, last = 1, len(SUITES)
    if len(sys.argv) == 3 and sys.argv[1].isdigit() and sys.argv[2].isdigit():
        first, last = max(1, int(sys.argv[1])), min(len(SUITES), int(sys.argv[2]))
    results = []
    start = time.time()
    for i, (name, script, args) in enumerate(SUITES, 1):
        if i < first or i > last:
            continue
        print("[%2d/%d] %s ..." % (i, len(SUITES), name), end=" ", flush=True)
        t = time.time()
        try:
            run = subprocess.run([sys.executable, os.path.join(HERE, script)] + args,
                                 cwd=HERE, capture_output=True, text=True, timeout=600)
            out = run.stdout + run.stderr
        except subprocess.TimeoutExpired:
            out = "timed out after 10 minutes"
        ok, summary = verdict(out)
        print(("PASS" if ok else "FAIL"), "-", summary, "(%.0fs)" % (time.time() - t))
        if not ok:
            failing = [l for l in out.splitlines() if l.startswith(("FAIL", "BUG"))]
            for line in failing[:5]:
                print("        " + line)
        results.append(ok)
    print()
    print("%d of %d suites passed in %.0f seconds." % (sum(results), len(results), time.time() - start))
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
