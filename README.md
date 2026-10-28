# Blue-violet edition

# Srivikram MV (SV) · AI Research

A custom, static personal research portfolio. All fonts, papers, the CV, and PDF reader dependencies are included locally. No build step or backend is required.

## Open it

The separately supplied **Srivikram_Portfolio_Blue_Updated_Preview.html** is a self-contained copy. Download it and open it in a modern browser to explore the site and read the embedded PDFs.

For editing this source folder, serve it over HTTP because JavaScript modules and the hosted PDF reader load local assets. From this folder run:

```bash
python -m http.server 8000
```

On Windows, `py -m http.server 8000` also works when Python is installed. Open `http://localhost:8000` in your browser.

## Host on GitHub

Place the **contents of this folder** at the root of your repository, including `index.html`, `assets`, and `.nojekyll`. Configure GitHub Pages to serve that root. You do not need a build or npm packages.

All internal asset URLs are relative, supporting both a username site and a repository/project site. Use these modular source files for hosting and future edits. The standalone HTML is a convenient preview.

## What is included

- A personal introduction with name, research interests and motivation, and direct CV and profile links.
- Research, Projects, Education, Work experience, and Contact sections, in that order.
- A typography-led AI research theme: brief word-by-word text reveals, a moving caret, subtle inline token highlights, background threads, and small document-boundary details. The background threads drift slowly while the introduction is visible. These are decorative gestures, not a model demonstration.
- A reading-progress line and active navigation. Motion respects the system preference and can be disabled using the footer control. Text is present in the page from the start, with no loading screen or interaction required.
- Three research presentations with short descriptions and full PDFs.
- Figures extracted directly from the monitoring and fairness research. Clicking a figure opens its original page in the document reader.
- A local PDF.js reader with selectable text, page navigation, zoom, downloads, and fullscreen. If native fullscreen is unavailable, it expands within the browser window.
- Six project links: CUDA and NLP remain visible, with a prominent button revealing the murder mystery, AKI prediction, graph learning, and generative-model projects. Each has its own vector thumbnail.
- Responsive phone layouts, keyboard-accessible controls, and reduced-motion support.

## Edit the content

- **index.html**: personal copy, research summaries, experience, projects, education, and links.
- **main.js**: document names and paths, document-page links, navigation, and section reveals. The document mapping is at the top.
- **style.css**: base type, colours, shared components, and responsive styles. Theme variables are near the top.
- **profile.css**: the personal introduction and revised section layouts.
- **research-theme.js** and **research-theme.css**: the full-width introduction, typographic motion, inline highlights, page boundaries, reading progress, and motion preference.
- **reader.js** and **reader.css**: the PDF reading experience.
- **assets/docs/**: the original research papers and CV. Replace a PDF using the same filename to update it, then check any figure-page links.
- **assets/previews/trace-excerpt.png**: opening-page excerpt of the ARR paper, including its anonymous submission heading.
- **assets/previews/monitor-figure.png**: monitoring Figure 4.7, PDF page 35 (printed page 31).
- **assets/previews/fairness-figure.png**: fairness Figure 4.3, PDF page 37 (printed page 35).
- **assets/favicon.svg**: the SV mark.

The figure buttons use `data-page` for their PDF page number, which can differ from a document’s printed page number.

When adding a project, duplicate a `project-card` in `index.html` and change its link and content. Update the project count on the “Show all” button as well.

The ARR status currently reads **under review**, matching the supplied information. Update it when the status changes. The included ARR PDF is the supplied anonymous submission version. All research PDFs and the CV retain their original contents.

## Validation

Reviewed in Chromium at desktop width and in 390px and 320px phone viewport frames. Checked navigation, typographic effects and the motion preference, mobile menu, document loading, and figure-page links. The standalone preview was also checked with its embedded PDF assets.

Native fullscreen availability depends on browser permissions. A full-window fallback is included. Testing does not cover every browser or physical device.

## Third-party notices

PDF.js 5.6.205 is included under Apache-2.0. Its license and the notices for its fonts and codecs are in `assets/vendor/pdfjs/`. The locally converted URW Base35 fonts retain their distribution license in `assets/fonts/LICENSE.txt`. Research documents retain their authors’ rights.

The site does not contact external services until a visitor follows an external project, profile, dataset, or email link.

## Latest polish

Supporting labels use at least 12px, with 16px main body copy. The desktop navigation has a sliding selection. Mobile navigation is used below 950px. The hero uses gently flowing lines, without decorative token brackets. Intro paragraphs, section headings, research titles and project titles have a brief word-generation effect on first appearance. The footer motion toggle disables these effects, background motion and navigation transitions. Reduced-motion preferences are respected.

## Expandable content

About uses “Read more about me”. Each research card has a Show more / Show less panel. While expanded, a single collapse control appears after the longer text. The ARR label supports hover, keyboard focus and tap. Page order is About, Research, Projects, Education, Work experience, Contact. Disclosures respect the motion toggle and reduced-motion preferences.

## Reading layout refinement

The About continuation balances across two columns on wider screens and returns to a single column on phones. Research disclosures sit directly after their summaries, ahead of topics and paper links. Expanded research gives more width to text, keeps the figure visible alongside it on desktop, and brings the title into view. Full-width section backgrounds alternate dark and light in page order. Work experience includes the expanded pipeline and evaluation descriptions. Project summaries remain concise.

## Interaction polish

Expanded sections show a single collapse button at the end. Closing returns to the About introduction or the relevant paper heading. Research figures retain their large desktop footprint while expanded. Text-generation and boundary effects re-arm on viewport re-entry and disclosure reopening. The SV monogram has a long, tapered blue stroke that travels around the letter contours with smooth acceleration and deceleration. The motion switch and reduced-motion preferences disable these animations.

## Teaching and monogram update

Work experience includes the Newcastle Teaching Assistant role for January and June 2024 visiting Wuhan University cohorts. The SV header monogram uses vector paths from the site typeface, with a travelling light on the exact letter contours. The motion control and reduced-motion preference disable the contour animation.

## Extended projects and research resources

The ARR paper links separately to its source-report experiments repository and Hugging Face benchmark. The four additional project descriptions are based on their repository READMEs. The murder mystery is identified as a personal project; the other three are Imperial 2026 projects. The custom thumbnails are schematic illustrations, not measured results or screenshots of model outputs. Expanding the collection brings its first new card into view; collapsing returns to the Projects heading. The collection retains one visible control and replays text effects when reopened.
