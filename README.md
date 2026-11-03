# YES Full Circle Solutions — website redesign (live preview)

Live preview: https://sami9188.github.io/yfc-homepage-preview/

`main` publishes all 11 pages: Home, Our Story, Impact and Stories, Solutions, Technology, Industries, YFC Re-Nu, Partnerships, Insights, Recognition and Contact. They follow the **YFC Website Pagewise Content** document, the client layout documents for Home, Impact and Our Story, and the Brand Positioning brief for the contact wording.

The 15 October version (Brand Positioning brief) is kept at `/oct-15/`.

## Editing
Pages are built from `src/pages/` with the shared header, footer and icons in `src/partials/`. The pages published here are listed in `LIVE` in build.py:

    python3 build.py --live

Styles: `css/styles.css`, `css/pages.css`. Scripts: `js/main.js`, `js/pages.js`.

## Before launch
Figures, ratings, certificates and awards are drafts from the company profile and are marked "Pending approval" or "Pending verification" on the page. The contact form and newsletter show a confirmation state only.
