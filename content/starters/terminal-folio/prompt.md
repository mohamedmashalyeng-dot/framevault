# Build an interactive retro terminal portfolio (single HTML file)

## Role
You are a creative developer. Produce ONE self-contained `index.html` (inline CSS and JS, no frameworks, no external fonts, images or network requests) that presents a personal portfolio as a retro phosphor terminal.

Replace the placeholder person below with your own details before generating:
- Name: Ada Okafor · Role: creative developer · Location: Lagos → Lisbon
- Projects (name, year, one line): tidepool 2025 generative ocean soundscape (WebAudio + WebGL); ledger.css 2024 tiny CSS framework for printable invoices; nightbus 2024 real-time night bus tracker; paperwall 2023 extension that turns articles into print-ready zines.
- Skills grouped as Languages / Front end / Back end / Practice.
- Contact: an email link and one website link.

## Look and feel
- Green phosphor theme: background #071a0e, text #39ff88, dim #1f9b55, highlight #d6ffe6, a soft text-shadow glow.
- Amber alternative theme on `:root[data-theme="amber"]`: #1a1205 / #ffb547 / #a8701f / #fff0d6.
- Monospace stack: "IBM Plex Mono", "Cascadia Mono", SFMono-Regular, Consolas, monospace; 16px / 1.55.
- Subtle fixed scanline overlay (repeating-linear-gradient, multiply blend, pointer-events none).
- Content column max 980px with responsive padding.
- Top status bar with a dashed bottom border: "ada@folio:~" on the left and a live HH:MM clock on the right (updated every 30s).
- An ASCII-art banner of the name in a `<pre>` (aria-hidden) that scales with `clamp()` and never causes horizontal scrolling.

## Interaction
- Output area: `role="log"`, `aria-live="polite"`.
- A row of quick-command buttons (about, projects, skills, contact, theme, help) inside `<nav aria-label="Quick commands">` so the site is fully usable without typing; they invert colours on hover.
- A prompt form: label "guest@folio:~$" bound to a borderless text input with spellcheck off; Enter runs the command. ArrowUp/ArrowDown walk through command history.
- Commands: help, about, projects, `open <name>` (details for one project or a friendly error), skills, contact (rendered as real links), theme (toggles green/amber), clear. Unknown input prints "command not found: x. Type help."
- Echo each command in dim text, then "type" the response lines quickly (2 characters every 8ms). On load, type a welcome line and a "Last login" line, then run `about` automatically.
- Smooth-scroll to the bottom after each command.

## Accessibility and motion
- A visually hidden h1 describing the page.
- With prefers-reduced-motion: no typing animation (print instantly), no scanlines, no blinking cursor, instant scrolling.
- Visible dashed focus outlines on buttons and links. All text meets contrast requirements on both themes.
- Build every line with textContent; only the contact links use trusted static HTML.

## Deliverable
Return the complete `index.html` in one code block, ready to open in a browser or deploy as a static file.
