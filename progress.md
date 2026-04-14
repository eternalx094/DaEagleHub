Original prompt: also, i would like public levels (kind of). make a model for saving levels to our database, where theres supposed to be a name, a date of creation, creator, public/not public, plays, likes, song url (because we want a song in the levels (like gd)), etc. also, lets refine the levels list. let there be something like geometry dash - "original levels", online levels, your own levels. with buttons leading to each, and make sure to maintain the look on each page.

- Added OnlineLevel model for public level storage (name, created_at, creator, is_public, plays, likes, song_url, level_data) and generated migration 0008_onlinelevel.
- Refined levels flow into a three-button hub (Original, Online, Your Levels) plus dedicated pages/templates and JS renderers.
- Updated levels styling to support hub cards, list panels, and detailed level rows.
- Ran docker compose up --build -d to start services.
- Playwright run: initial 404 from favicon resolved by inline SVG favicon; reran (headless=false) and confirmed levels hub screenshot.
- Tests: python manage.py test (passed).
- Added Django password reset flow (URLs + templates) and replaced login copy with a real "Forgot password?" link.
- Configured console email backend for local reset emails.
- Tests: manage.py test (passed). Docker: compose up --build -d.
