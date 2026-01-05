# My Dashboard

A Self-hosted personal productivity dashboard with multi-timezone clocks, Todoist integration, Pomodoro timer, interrupt logging, Monaco editor for notes, and news feeds.
Disclaimer: About 90% of the code at this stage of the commit is AI-generated.

## Features

- **Multi-timezone Clocks**: Display 4 configurable time zones
- **Today's Intention**: Large text area for your daily focus
- **Todoist Integration**: View tasks organized by Due Today, Overdue, and Next Action
- **Pomodoro Timer**: 
  - Attach to Todoist tasks
  - Track interruptions
  - Configurable durations (15/25/30/45 min)
- **Interrupt Log**: One-click interrupt tracking with optional notes
- **Daily Summary**: Pomodoros completed, focus time, tasks done, interruptions
- **Monaco Editor**: Full-featured code/markdown editor with local file system integration
- **News Feeds**: Hacker News top 10.
- **Keyboard Shortcuts**:
  - `Alt+P`: Start/Stop Pomodoro
  - `Alt+T`: Add Task
  - `Alt+E`: Focus Editor
  - `Alt+F`: Toggle Feeds
  - `Alt+M`: Toggle Focus Mode
- **Focus Mode**: Hide distracting feeds with one keypress

## Setup

### Prerequisites

- A Todoist account and API key
- All features run entirely in the browser.

### Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

   The app will run on http://localhost:5173

### Notes Folder

When you first use the Monaco editor, you'll be prompted to select a folder for your notes. This folder will be remembered for future sessions. All notes are stored as `.md` files in this folder.

**Note**: The File System Access API requires a Chromium-based browser (Chrome, Edge, Brave, etc.).

## Data Storage

- **API tokens (Todoist)**: Encrypted client-side vault stored in your browser using the Web Crypto API (never sent to any server)
- **Notes**: Local file system via File System Access API
- **Pomodoro & Interrupt Logs**: IndexedDB (persisted locally)
- **Settings & Layout**: LocalStorage (timezones, shortcuts, panel positions/sizes, feed visibility, focus mode)
- **Tasks**: Fetched directly from the Todoist REST API from the browser (no local caching, no backend proxy)

### Building for Production

```bash
cd frontend
npm run build
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+P` | Start/Stop Pomodoro |
| `Alt+T` | Add new task |
| `Alt+E` | Focus Monaco editor |
| `Alt+F` | Toggle news feeds |
| `Alt+M` | Toggle focus mode |

## Browser Compatibility

- **Recommended**: Helium, Chrome, Edge (Chromium-based)
- The File System Access API for notes requires a Chromium browser
- Other features work in Firefox/Safari, but notes will be disabled

## License

MIT
