# YES Full Circle Solutions — website redesign (live preview)

Live preview: https://sami9188.github.io/yfc-homepage-preview/

`main` publishes the **homepage** and **Our Story** page, following the **YFC Website Pagewise Content** document (Page 1 sections 1–9 and Page 2 sections 1–8).

The other nine pages are built and kept on the [`full-site`](https://github.com/Sami9188/yfc-homepage-preview/tree/full-site) branch. They are not live yet, so their links either scroll to the matching homepage section or show a "coming in the next phase" notice.

## Editing
Pages are built from `src/pages/` with the shared header, footer and icons in `src/partials/`. The pages published here are listed in `LIVE` in build.py:

    python3 build.py --live

Styles: `css/styles.css`, `css/pages.css`. Scripts: `js/main.js`, `js/pages.js`.

## Before launch
Figures, ratings, certificates and awards are drafts from the company profile and are marked "Pending approval" or "Pending verification" on the page. The contact form and newsletter show a confirmation state only.
