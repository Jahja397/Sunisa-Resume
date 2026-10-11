# Sellora automated tests

**English** | [ภาษาไทย](README_TH.md)

These tests open the app in Chrome without a window (headless) and use it the way a real person would:
signing up, creating orders, using coupons, recording expenses and switching to a phone-sized screen. Then they check that the results are right.

## Setup (once)

You need Python 3.8 or newer. Type these commands in Terminal or Command Prompt:

```
pip install playwright pillow
python -m playwright install chromium
```

## Run everything

Go into the `tests` folder and type:

```
python run_all.py
```

It takes about 6–8 minutes, then shows how many of the 19 suites passed.

To run only some of them, add the first and last suite number, for example `python run_all.py 12 19`.

## Run one suite

The suite starting with `01` and the bug-check suites (`03`, `05`, `07`, `08`, `10`) need the app's location at the end, for example:

```
python 01_end_to_end.py ../Sellora_Seller_Center.html
python 05_review2_bugs_19-38.py ../Sellora_Seller_Center.html
```

The others run on their own, for example `python 16_income_and_expenses.py`.

## What each suite checks

| File | What it checks |
|---|---|
| `01_end_to_end.py` | Every page and the main forms (run a second time in old-browser layout mode with `force_gap.js`) |
| `02_browser_environments.py` | Private mode, no Web Crypto, the LINE in-app browser, JavaScript turned off, backup / restore |
| `03`, `05`, `07`, `08`, `10` | Follow the steps from each bug report; they must show "bugs still present: 0" |
| `04`, `06`, `09` | New behaviour, such as editing orders, the Back button and keyboard focus in dialogs |
| `11_part_payments.py` | Part payments, paying the rest, and refunds |
| `12_refunds_and_hints.py` | Refund totals and the hint under the discount box |
| `13_login_and_preview_windows.py` | Logging in inside a preview window, the demo shop buttons, and the login page at different screen sizes |
| `14_sample_data_audit.py` | The sample data fits together: stock, product sales, coupons and shipping fees |
| `15_month_view.py` | The Month view and choosing a month |
| `16_income_and_expenses.py` | Income, expenses, net profit and recording expenses |
| `17_year_view.py` | The Year view, its 12-month chart and the year summary |
| `18_review6_no_future_data.py` | No future-dated data, plus the small fixes from review round 6 |

`preview_frame.html` imitates a preview window that blocks form submission. Screenshots taken by the tests are saved in the `shots` folder.
