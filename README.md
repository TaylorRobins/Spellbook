# ✦ Spellbook

A desktop grimoire for Pathfinder 2e players. Browse, search, and organize every spell in the system — built for speed at the table.

![Electron](https://img.shields.io/badge/Electron-31-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

<!-- Add a screenshot of your app here: -->
<!-- ![Spellbook Screenshot](./screenshots/main.png) -->

---

## Features

### Spell Browser
All 1,139 Pathfinder 2e Remaster spells, sourced from the [Foundry VTT PF2e system](https://github.com/foundryvtt/pf2e). Full-text search with autocomplete, filterable by tradition (Arcane, Divine, Occult, Primal), spell level, favorites, or custom tags. Select any spell to view the full stat block — cast time, components, range, area, duration, saving throw, formatted description, and heightened effects.

### Characters & Spellbooks
Create named characters with class, level, and tradition. Build a personal spellbook for each character — add spells from the browser, mark them as prepared or unprepared, and favorite spells globally. Quick-switch between characters from the sidebar.

### Custom Tags
Create color-coded tags (Combat, Utility, Healing, Buff, Debuff, etc.) and apply them to any spell. Tags appear as colored dots on spell cards and as filters in the sidebar. Select multiple tags to narrow results. Manage tags from the Settings page.

### Settings
Dark Grimoire and Light Parchment themes, adjustable font size, animation toggle, default view preferences, spell database updates, app update checks, JSON data export/import, and full database reset.

### Layout Options
Split view (spell list + detail panel side by side) or full-width detail view. Resizable panels with drag handle. Keyboard-driven navigation throughout.

---

## Installation

### Download (Recommended)

1. Go to the [Releases](../../releases) page
2. Download the latest `Spellbook-Setup-x.x.x.exe` file
3. Run the installer
4. Launch Spellbook from your Start Menu or Desktop

The app will check for updates automatically on launch.

### Build from Source

**Prerequisites:**
- [Node.js](https://nodejs.org/) 18 or higher
- [Git](https://git-scm.com/)

**Steps:**

```bash
# Clone the repository
git clone https://github.com/TaylorRobins/Spellbook.git
cd spellbook

# Install dependencies
npm install

# Run in development mode (hot reload + DevTools)
npm run dev

# Type-check without building
npm run typecheck

# Build for production
npm run build

# Package into a distributable installer
npm run package
```

**Output:**
- `npm run build` → compiled files in `out/`
- `npm run package` → installer in `dist/Spellbook Setup x.x.x.exe`

---

## Importing the Full Spell Database

The app ships with all 1,139 PF2e Remaster spells pre-seeded. To update the spell database with the latest data from Foundry VTT:

**From the app:** Open Settings (gear icon in sidebar) → click "Update Spell Database."

**Manually:**

```bash
# Clone just the spell data from the Foundry VTT PF2e repo
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/foundryvtt/pf2e foundry-pf2e
cd foundry-pf2e && git sparse-checkout set packs/spells && cd ..

# Run the import script
node scripts/import-spells.js
```

Your characters, spellbooks, and favorites are never affected by spell data updates.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+K` / `Cmd+K` | Focus search bar |
| `Escape` | Clear search / go back from full view |
| `↑` / `↓` | Navigate spell list |
| `Enter` | Open selected spell detail |
| `Ctrl+F` | Toggle favorite on selected spell |
| `Ctrl+P` | Toggle prepared (in spellbook view) |
| `Ctrl+1–4` | Filter by tradition (Arcane/Divine/Occult/Primal) |
| `Ctrl+0` | Reset to All Spells |
| `?` | Show keyboard shortcut overlay |

---

## Data Storage

- **Database:** `%APPDATA%\spellbook\spellbook.db` (production) or `spellbook-dev.db` (development)
- **Settings:** Persisted to localStorage and SQLite
- **Backups:** Use Settings → Export Data to save characters, spellbooks, favorites, and tags as a JSON file

---

## Tech Stack

- **Electron 31** — desktop shell
- **React 18** — UI framework
- **SQLite** via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — local database with FTS5 full-text search
- **electron-vite** — build tooling
- **electron-updater** — auto-updates from GitHub Releases

---

## Spell Data

Spell data is sourced from the [Foundry VTT PF2e system](https://github.com/foundryvtt/pf2e), which is licensed under the [ORC License](https://paizo.com/community/blog/v5748dyo6si7o). Pathfinder is a trademark of Paizo Inc. This app is not affiliated with or endorsed by Paizo.

---

## Contributing

Contributions are welcome! Feel free to open issues for bugs or feature requests, or submit a pull request.

---

## License

MIT
