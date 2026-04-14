# Codebase issue triage: proposed tasks

## 1) Typo fix task
**Task:** In `shop_buy_view`, change the error response string from `"POST only"` to `"GET only"` (or, preferably, after the HTTP-method bug is fixed, align this message to the actual accepted method).

- **Why:** The function currently processes purchases on `GET`, but the fallback message says `POST only`, which is a typo/inaccurate user-facing message.
- **Evidence:** `backendHub/Sledgepong/views.py` (`if request.method == 'GET': ... else: return HttpResponse('POST only')`).

## 2) Bug fix task
**Task:** Make texture purchases use `POST` instead of `GET` end-to-end (Django view + frontend fetch call), and reject non-POST requests with 405.

- **Why:** `shop_buy_view` mutates server state (`user.coins -= 10`, adds to collection) on `GET`, which is unsafe and can be triggered unintentionally (prefetch/caching/bookmarks).
- **Evidence:**
  - Backend mutation in `backendHub/Sledgepong/views.py` inside `if request.method == 'GET'`.
  - Frontend call uses `method: 'GET'` in `backendHub/static/Sledgepong/js/shop.js`.

## 3) Code comment / documentation discrepancy task
**Task:** Fix the "Forgot password?" UI text or destination so it matches behavior (either implement/reset-password route, or relabel the link to something accurate).

- **Why:** The page copy implies password recovery, but the link sends users back to the login page.
- **Evidence:** `backendHub/DaHub/templates/DaHub/login.html` has `Forgot password?` linking to `{% url 'user_login' %}`.

## 4) Test improvement task
**Task:** Add focused unit/integration tests for auth and shop flows, starting with:
- `shop_buy_view` rejects wrong methods and updates coins + collection only on valid requests.
- `shop_equip_view` only equips owned textures.
- Login/signup happy-path and invalid credentials.

- **Why:** Both test modules are effectively empty, so critical flows are unprotected.
- **Evidence:**
  - `backendHub/Sledgepong/tests.py` contains only scaffold content.
  - `backendHub/DaHub/tests.py` contains only scaffold content.
