import { useSettings } from '../../state/SettingsContext';

export function ShortcutsHelp() {
  const { settings } = useSettings();
  const shortcuts = settings.shortcuts;

  const items = [
    { label: 'Start/Stop Pomodoro', key: shortcuts.startStopPomodoro },
    { label: 'Add Task', key: shortcuts.addTask },
    { label: 'Focus Editor', key: shortcuts.focusEditor },
    { label: 'Toggle Feeds', key: shortcuts.toggleFeeds },
    { label: 'Focus Mode', key: shortcuts.toggleFocusMode },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="group relative">
        <button className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold">
          ?
        </button>
        
        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl min-w-[200px]">
            <h3 className="text-xs text-slate-400 uppercase tracking-wide mb-2">
              Keyboard Shortcuts
            </h3>
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-300">{item.label}</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-slate-400 font-mono">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
