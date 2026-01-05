import { useSettings } from '../../state/SettingsContext';

export function FocusModeIndicator() {
  const { settings, toggleFocusMode } = useSettings();

  if (!settings.focusModeEnabled) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={toggleFocusMode}
        className="flex items-center gap-2 px-3 py-1.5 bg-accent/20 border border-accent/50 rounded-full text-accent text-sm hover:bg-accent/30 transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        Focus Mode
        <span className="text-xs opacity-70">(click to exit)</span>
      </button>
    </div>
  );
}
