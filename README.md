# YES Full Circle Solutions — website redesign (full site, preview branch)

This `full-site` branch holds all 11 pages from the **YFC Website Pagewise Content** document. It is **not live**. The live GitHub Pages site deploys from `main`, which currently publishes Home, Our Story, Impact and Stories, Solutions, Technology and Industries.

| Page | File |
|---|---|
| Home | `index.html` |
| Our Story | `our-story.html` |
| Impact and Stories | `impact.html` (stories, evidence, programmes, sorting activity, quiz, Impact Pledge) |
| Solutions | `solutions.html` |
| Technology | `technology.html` |
| Industries | `industries.html` |
| YFC Re-Nu | `re-nu.html` |
| Partnerships | `partnerships.html` |
| Insights | `insights.html` |
| Recognition | `recognition.html` |
| Contact | `contact.html` |

## Editing
Pages are built from `src/pages/*.html` with the shared header, footer and icons in `src/partials/`.

- `python3 build.py` builds every page (this branch).
- `python3 build.py --live` builds only the pages listed in `LIVE` in build.py (currently Home, Our Story, Impact and Stories, Solutions, Technology and Industries). Links to pages that are not live yet point at homepage sections or show a "coming in the next phase" notice. This is what `main` publishes.

Styles: `css/styles.css` (shared and homepage) and `css/pages.css` (inner pages). Scripts: `js/main.js` (shared) and `js/pages.js` (inner-page interactions).

## Going live with all pages
Add pages to `LIVE` in build.py one at a time, or merge this branch into `main` and run `python3 build.py` there instead of `--live`.

## Before launch
Figures, ratings, certificates, awards, story details, partner roles, biographies and photographs are drafts from the company profile, the current website and press coverage, and are marked "Pending approval" or "Pending verification" on the pages.
