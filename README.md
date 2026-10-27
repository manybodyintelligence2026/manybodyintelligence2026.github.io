# Many-Body Intelligence: event website

A static site (plain HTML, CSS and a little JavaScript, with no build step) for the Materials Theory AI hackathon on 26 November 2026.

| File | Page |
|---|---|
| `index.html` | Landing page: what it is, date/time/place, sign-up button |
| `faq.html` | Questions and answers |
| `code-of-conduct.html` | Working together, AI use, logs and data, authorship, ownership |
| `resources.html` | Placeholder for the resource pack (not linked yet) |
| `assets/style.css` | Paper-and-ink styles, light and dark |
| `assets/wordart.js` | Word-art engine: shapes filled with repeated words, animated at ~10 fps (pauses off screen; static for reduced motion); PNG export |
| `assets/site.js` | Torn edges on the label tape, and the animated mbi logo on the home page (plays once on load; click to replay; scales to the page width) |
| `assets/mbi-logo.js` | The Fermi-sea logo: mbi (MAGNON, PHONON, SPIN) rising out of an ELECTRON sea over a vibrating LATTICE; the i's dot is an excited electron that leaves a hole |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

## Look

- **Palette:** taken from the reference video still.
  - Paper `#e3ddd5`, ink `#141210`, sepia `#2a1a10`, faded `#8d847a`.
  - The rose `#d4506c` is used only for the small dot marking the current page and for link hovers.
- **Typeface:** IBM Plex Mono throughout (Google Fonts).
- **Logo:** `assets/mbi-logo.js` (the wave and letters) drawn by `assets/wordart.js`; see `../logo/README.md`.

## Before publishing: fill in the placeholders

Search for `REPLACE_WITH_` and replace each occurrence:

- `REPLACE_WITH_FORM_LINK`: the expression-of-interest form (index.html)
- `REPLACE_WITH_CONTACT_EMAIL`: the organisers' contact address (index.html, faq.html)

Once the room is confirmed, also change "room to be confirmed" in index.html.

## Publishing on GitHub Pages

1. The organisation is https://github.com/manybodyintelligence2026 (all four organisers as owners).
2. The repository is `manybodyintelligence2026.github.io` (public); push this folder to `main`.
3. In the repository, go to **Settings → Pages** and set **Source** to "Deploy from a branch", with branch `main` and folder `/ (root)`.
4. The site appears at https://manybodyintelligence2026.github.io within a minute or two.

Team repositories created later in the same organisation should be **private**.

`logo-lab.html` (the logo experiments page) is kept locally but excluded from the repository via `.gitignore`.
