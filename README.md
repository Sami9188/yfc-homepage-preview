# YES Full Circle Solutions — homepage redesign (live preview)

Live preview: https://sami9188.github.io/yfc-homepage-preview/

`main` publishes the **homepage only**, following the **YFC Website Pagewise Content** document (Page 1, sections 1–9): navigation with Home, impact-first sections, and the technology wording from the Technology page brief.

The other ten pages are built and kept on the [`full-site`](https://github.com/Sami9188/yfc-homepage-preview/tree/full-site) branch. They are not live yet, so on this homepage their links either scroll to the matching homepage section or show a "planned for the next phase" notice.

## Editing
The homepage is built from `src/pages/index.html` with the shared header, footer and icons in `src/partials/`:

    python3 build.py --live

Styles: `css/styles.css`, `css/pages.css`. Scripts: `js/main.js`, `js/pages.js`.

## Before launch
Figures, ratings, certificates and awards are drafts from the company profile and are marked "Pending approval" or "Pending verification" on the page. The contact form and newsletter show a confirmation state only.
