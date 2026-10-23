# Salita ng Buhay — XAMPP Edition

Plain HTML, CSS, JavaScript, PHP and MySQL/MariaDB for XAMPP. No Node.js, React, Supabase, or Composer is required.

## Features

- Registration, login and logout using PHP sessions.
- Passwords stored using PHP `password_hash()` and checked using `password_verify()`.
- Bible passage lookup using bible-api.com (World English Bible).
- Keyword search proxied through PHP to a public getBible search endpoint.
- Per-user saved verses and recent search history in MySQL.
- English display and a machine-translation fallback to Tagalog.
- Prepared SQL statements and ownership checks on saved data.

## Install on XAMPP

1. Start **Apache** and **MySQL** from the XAMPP Control Panel.
2. Copy the `bible-system-xampp` folder into your XAMPP `htdocs` directory. Example on Windows: `C:\xampp\htdocs\bible-system\`.
3. Open `http://localhost/phpmyadmin`.
4. Choose **Import**, select `database.sql` from this folder, and click **Import/Go**. Alternatively, paste the SQL into phpMyAdmin's SQL tab.
5. Check the database connection settings in `api/config.php`. Typical local XAMPP values are database `bible_system`, user `root`, blank password. If your MySQL root account has a password, enter it as `DB_PASS`.
6. Open `http://localhost/bible-system/` in your browser.
7. Create an account, sign in, and try searching for `John 3:16`, `Psalm 23`, or `Romans 8:28`.

## APIs and Tagalog

- Passage lookup: `https://bible-api.com/John%203%3A16?translation=web`
- Keyword search: proxied from `api/search.php` to `https://search.getbible.net/v2/web/QUERY`
- Tagalog fallback: MyMemory machine translation (`en|tl`).

**Tagalog is machine-translated, not an official Bible edition.** It may be inaccurate or unavailable. For a real Bible application, integrate a Tagalog translation whose provider allows your intended use and display the edition name.

Public APIs may change, rate-limit, or impose terms. Internet access is required.

## Troubleshooting

- **Database connection error:** verify MySQL is running, import `database.sql`, and check `api/config.php`.
- **404 for PHP files:** ensure the folder is inside `htdocs` and Apache is running.
- **JSON/PHP errors:** make sure you visit the app through `http://localhost/...`, not by opening `index.html` directly as a file.
- **Keyword search fails:** the public search endpoint can change or be rate-limited; passage reference lookup may still work.
- **Tagalog translation fails:** third-party translation services may be unavailable; select English or connect a licensed Tagalog Bible API.

## Security before public deployment

This is intended as a local XAMPP starter. Before putting it on the public internet, add CSRF protection, login throttling, HTTPS, secure cookie settings, security headers, and review the third-party APIs' terms/privacy. Do not expose database credentials. Keep PHP and XAMPP updated. The default local XAMPP root account often has a blank password; never use that configuration on a public server.
