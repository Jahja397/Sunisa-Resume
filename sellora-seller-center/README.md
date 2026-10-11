# Sellora Seller Center

**English** | [ภาษาไทย](README_TH.md)

A back-office system for online sellers. It runs from a single HTML file, with nothing to install.

## What's in this folder

| File / folder | What it is |
|---|---|
| `Sellora_Seller_Center.html` | The app. Open this one file to use it |
| `README.md` / `README_TH.md` | This guide in English / Thai |
| `CHANGELOG.md` | Every bug found and fixed, plus the features added (in Thai) |
| `tests/` | 19 automated test suites (see `tests/README.md` for how to run them) |

## How to open it

1. Double-click `Sellora_Seller_Center.html` to open it in Chrome, Safari, Edge or Firefox.
2. Choose one of two ways in:
   - **Try with sample data** opens the demo shop "Lotus Demo Shop" right away, with no sign-up.
   - **Start from scratch** creates your own account with an empty shop.
3. You can also log in to the demo shop yourself with **demo@sellora.app** and the password **demo1234**.

> If you open the file in a preview window (for example, a file viewer inside a chat app), the app still works,
> but your data may be lost when the window closes. To keep your data, open the file directly in a browser.

## Sample data

- Income and expenses for **every month, from 1 January last year until today**, rising and falling from month to month.
- Last year has all **12 months, January to December**. The **Year** button opens on last year first (the latest full year);
  press › to see the current year so far, with % changes compared with last year.
- Nothing is dated in the future. Every order and expense happened before today.
- About 2,000 orders, 36 customers, 10 products and about 200 shop expenses.

## Main features

- **Dashboard**: sales, orders, customers, and charts by day, month or year
  - **Year**: income and expense bars for all 12 months. Pick any year; it opens on the latest full year, with a summary of the whole year
  - **Month**: a day-by-day chart for the chosen month, with income, expenses, net profit and "Where the money went"
  - **Income & Expenses by Month** table: every month, with a total for each year
- **Products**: products, cost prices, stock, low-stock alerts and photo upload (photos are resized automatically)
- **Orders**: create and edit orders, record past orders, coupons, cash on delivery and part payments
- **Customers**: each customer's purchase history and total spend
- **Shipping**: track parcels through To Ship / In Transit / Delivered
- **Payments**: money received, money still to come, refunds, and **recording the shop's expenses**
- **Marketing**: coupons and campaigns (both can be edited)
- **Reviews**: customer reviews and your replies
- **Analytics**: sales, gross profit, best sellers and the conversion funnel
- **Settings**: shop details, shipping fees, payment methods, account, **Backup / Restore**, and light / dark / system theme

## What the money figures mean

- **Income / Sales**: the total of all orders that were not cancelled, including the shipping fee charged to customers
- **Received**: money actually received (part payments included)
- **Expenses**: the cost of goods sold (from cost prices) plus the shop expenses you recorded
- **Net profit**: income minus expenses

## Supported browsers

Chrome, Edge, Opera and Samsung Internet (2017 or newer), Safari on iPhone / iPad / Mac (iOS 12 or newer), Firefox,
and the built-in browsers of LINE, Facebook, Instagram and TikTok.

Internet Explorer cannot run the app; it shows a message asking you to switch browsers instead of a blank page.

## Security (limits worth knowing)

All data is stored in the browser on that device (localStorage). Passwords are hashed with SHA-256, so the real password is never stored.
However, the shop data can still be viewed through the browser's DevTools, and the lock after too many wrong passwords can be cleared by deleting the site's data.
For real use with many people, the login and the data should move to a server, for example Firebase Authentication with Firestore.

Use **Download backup** in Settings from time to time, to keep a copy of your data or move it to another browser.
