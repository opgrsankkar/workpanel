# My Dashboard

A personal productivity dashboard with multi-timezone clocks, Todoist integration, Pomodoro timer, interrupt logging, Monaco editor for notes, and news feeds.

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
- **News Feeds**: Hacker News top 10 and Reuters headlines
- **Keyboard Shortcuts**:
  - `Alt+P`: Start/Stop Pomodoro
  - `Alt+T`: Add Task
  - `Alt+E`: Focus Editor
  - `Alt+F`: Toggle Feeds
  - `Alt+M`: Toggle Focus Mode
- **Focus Mode**: Hide distracting feeds with one keypress

## Setup

### Prerequisites

- Node.js 18+
- A Todoist account and API key

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and add your Todoist API key:
   ```
   TODOIST_API_KEY=your_api_key_here
   ```
   
   Get your API key from: https://todoist.com/prefs/integrations (scroll to "API token")

5. Start the backend server:
   ```bash
   npm run dev
   ```

   The backend will run on http://localhost:3001

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will run on http://localhost:5173

### Notes Folder

When you first use the Monaco editor, you'll be prompted to select a folder for your notes. This folder will be remembered for future sessions. All notes are stored as `.md` files in this folder.

**Note**: The File System Access API requires a Chromium-based browser (Chrome, Edge, Brave, etc.).

## Architecture

```
mydashboard/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── index.ts        # Server entry point
│   │   └── routes/
│   │       ├── todoist.ts  # Todoist API proxy
│   │       └── feeds.ts    # News feed fetching
│   └── package.json
│
├── frontend/                # React + Vite SPA
│   ├── src/
│   │   ├── App.tsx         # Main dashboard layout
│   │   ├── api/            # API client functions
│   │   ├── components/     # UI components
│   │   ├── db/             # IndexedDB repositories
│   │   ├── hooks/          # Custom React hooks
│   │   ├── state/          # Settings context & storage
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── package.json
│
└── README.md
```

## Data Storage

- **API Keys**: Backend environment variables (never exposed to frontend)
- **Notes**: Local file system via File System Access API
- **Pomodoro & Interrupt Logs**: IndexedDB (persisted locally)
- **Settings**: LocalStorage (timezones, shortcuts, feed visibility, focus mode)
- **Tasks**: Fetched from Todoist API (no local caching)

## Development

### Running Both Servers

Open two terminal windows:

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

The frontend is configured to proxy `/api` requests to the backend.

### Building for Production

```bash
# Backend
cd backend
npm run build

# Frontend
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

Shortcuts can be customized in the settings (stored in LocalStorage).

## Browser Compatibility

- **Recommended**: Chrome, Edge, Brave (Chromium-based)
- The File System Access API for notes requires a Chromium browser
- Other features work in Firefox/Safari, but notes will be disabled

## License

MIT
