import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useVault } from '../../state/VaultContext';
import { useSettings } from '../../state/SettingsContext';
import {
  buildSettingsTransferBundle,
  parseSettingsTransferBundle,
} from '../../state/settings';
import type { EncryptedPayload } from '../../utils/secureVault';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const {
    getToken,
    setServiceToken,
    clearServiceToken,
    clearVault,
    exportVaultPayload,
    importVaultPayload,
  } = useVault();
  const {
    settings,
    resetPanelLayout,
    applyViewportLayout,
    deleteViewportLayout,
    replaceAllSettings,
    activeViewportLayoutKey,
  } = useSettings();
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // Todoist state
  const [todoistToken, setTodoistToken] = useState('');
  const [hasTodoistToken, setHasTodoistToken] = useState(false);
  const [savingTodoist, setSavingTodoist] = useState(false);
  const [todoistError, setTodoistError] = useState<string | null>(null);

  // Webex state
  const [webexToken, setWebexToken] = useState('');
  const [hasWebexToken, setHasWebexToken] = useState(false);
  const [savingWebex, setSavingWebex] = useState(false);
  const [webexError, setWebexError] = useState<string | null>(null);
  const [transferStatus, setTransferStatus] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Todoist
    const currentTodoist = getToken('todoist');
    setHasTodoistToken(!!currentTodoist);
    setTodoistToken('');
    setTodoistError(null);

    // Webex
    const currentWebex = getToken('webex');
    setHasWebexToken(!!currentWebex);
    setWebexToken('');
    setWebexError(null);
    setTransferStatus(null);
    setTransferError(null);
  }, [open, getToken]);

  if (!open) return null;

  const handleSaveTodoist = async () => {
    try {
      setSavingTodoist(true);
      setTodoistError(null);
      const value = todoistToken.trim();
      if (!value) {
        await clearServiceToken('todoist');
        setHasTodoistToken(false);
      } else {
        await setServiceToken('todoist', value);
        setHasTodoistToken(true);
      }
      setTodoistToken('');
    } catch (e) {
      console.error('Failed to save Todoist token:', e);
      setTodoistError('Failed to save Todoist token');
    } finally {
      setSavingTodoist(false);
    }
  };

  const handleRemoveTodoist = async () => {
    try {
      setSavingTodoist(true);
      setTodoistError(null);
      await clearServiceToken('todoist');
      setTodoistToken('');
      setHasTodoistToken(false);
    } catch (e) {
      console.error('Failed to remove Todoist token:', e);
      setTodoistError('Failed to remove Todoist token');
    } finally {
      setSavingTodoist(false);
    }
  };

  const handleSaveWebex = async () => {
    try {
      setSavingWebex(true);
      setWebexError(null);
      const value = webexToken.trim();
      if (!value) {
        await clearServiceToken('webex');
        setHasWebexToken(false);
      } else {
        await setServiceToken('webex', value);
        setHasWebexToken(true);
      }
      setWebexToken('');
    } catch (e) {
      console.error('Failed to save Webex token:', e);
      setWebexError('Failed to save Webex token');
    } finally {
      setSavingWebex(false);
    }
  };

  const handleRemoveWebex = async () => {
    try {
      setSavingWebex(true);
      setWebexError(null);
      await clearServiceToken('webex');
      setWebexToken('');
      setHasWebexToken(false);
    } catch (e) {
      console.error('Failed to remove Webex token:', e);
      setWebexError('Failed to remove Webex token');
    } finally {
      setSavingWebex(false);
    }
  };

  const handleClearVault = async () => {
    clearVault();
    onClose();
  };

  const handleExportSettings = () => {
    try {
      setTransferError(null);
      const bundle = buildSettingsTransferBundle(exportVaultPayload());
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateSuffix = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.download = `dashboard-settings-${dateSuffix}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setTransferStatus('Settings exported successfully.');
    } catch (error) {
      console.error('Failed to export settings:', error);
      setTransferError('Failed to export settings');
    }
  };

  const handleImportSettingsClick = () => {
    setTransferError(null);
    importInputRef.current?.click();
  };

  const handleImportSettings = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const parsed = parseSettingsTransferBundle(content);
      replaceAllSettings(parsed.settings);

      if (Object.prototype.hasOwnProperty.call(parsed, 'vaultPayload')) {
        importVaultPayload((parsed.vaultPayload ?? null) as EncryptedPayload | null);
      }

      setTransferError(null);
      setTransferStatus('Settings imported. If credentials were included, unlock with your existing dashboard password.');
    } catch (error) {
      console.error('Failed to import settings:', error);
      setTransferStatus(null);
      setTransferError('Invalid settings file');
    } finally {
      event.target.value = '';
    }
  };

  const savedViewportLayouts = Object.entries(settings.viewportLayouts || {}).sort((a, b) => {
    const dateA = new Date(a[1].updatedAt).getTime();
    const dateB = new Date(b[1].updatedAt).getTime();
    return dateB - dateA;
  });

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-panel-bg border border-panel-border rounded-lg p-4 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="btn btn-ghost text-xs">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Connections */}
          <section>
            <h3 className="text-xs text-slate-400 uppercase tracking-wide mb-2">
              Connections
            </h3>

            {/* Todoist */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-200">Todoist</span>
                <span className="text-xs text-slate-500">
                  {hasTodoistToken ? 'Saved' : 'Not configured'}
                </span>
              </div>
              <input
                type="password"
                value={todoistToken}
                onChange={(e) => setTodoistToken(e.target.value)}
                placeholder={hasTodoistToken ? '••••••••' : 'Todoist API token'}
                className="input text-sm"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveTodoist}
                  className="btn btn-primary text-xs"
                  disabled={savingTodoist}
                >
                  {hasTodoistToken ? 'Update' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveTodoist}
                  className="btn btn-secondary text-xs"
                  disabled={savingTodoist}
                >
                  Remove
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                The token is encrypted with your dashboard password and stored locally in your browser.
              </p>
              {todoistError && <p className="text-xs text-danger mt-1">{todoistError}</p>}
            </div>

            {/* Webex */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-200">Webex</span>
                <span className="text-xs text-slate-500">
                  {hasWebexToken ? 'Saved' : 'Not configured'}
                </span>
              </div>
              <input
                type="password"
                value={webexToken}
                onChange={(e) => setWebexToken(e.target.value)}
                placeholder={hasWebexToken ? '••••••••' : 'Webex API token'}
                className="input text-sm"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveWebex}
                  className="btn btn-primary text-xs"
                  disabled={savingWebex}
                >
                  {hasWebexToken ? 'Update' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveWebex}
                  className="btn btn-secondary text-xs"
                  disabled={savingWebex}
                >
                  Remove
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Get your Webex token from{' '}
                <a
                  href="https://developer.webex.com/docs/getting-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  developer.webex.com
                </a>
                . Token is encrypted with your dashboard password.
              </p>
              {webexError && <p className="text-xs text-danger mt-1">{webexError}</p>}
            </div>
          </section>

          {/* World Clock */}
          <section>
            <h3 className="text-xs text-slate-400 uppercase tracking-wide mb-2">
              World Clock
            </h3>
            <div className="space-y-1">
              {settings.timezones.map((tz) => (
                <div key={tz.id} className="flex items-center justify-between text-xs text-slate-300">
                  <span>{tz.label}</span>
                  <span className="text-slate-500">{tz.tz}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Edit timezones directly from the World Clock panel.
            </p>
          </section>

          {/* Security */}
          <section>
            <h3 className="text-xs text-slate-400 uppercase tracking-wide mb-2">
              Security
            </h3>
            <p className="text-[11px] text-slate-500 mb-2">
              Your dashboard password and API tokens are never sent to a server. Clearing credentials will remove all encrypted data from this browser.
            </p>
            <button
              type="button"
              className="btn btn-ghost text-xs text-danger border border-danger/40"
              onClick={handleClearVault}
            >
              Clear all stored credentials
            </button>
          </section>

          {/* Backup */}
          <section>
            <h3 className="text-xs text-slate-400 uppercase tracking-wide mb-2">
              Backup
            </h3>
            <p className="text-[11px] text-slate-500 mb-2">
              Export or import all local dashboard settings offline, including encrypted credentials.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={handleExportSettings}
              >
                Export all settings
              </button>
              <button
                type="button"
                className="btn btn-primary text-xs"
                onClick={handleImportSettingsClick}
              >
                Import settings
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportSettings}
              />
            </div>
            {transferStatus && <p className="text-[11px] text-slate-400 mt-2">{transferStatus}</p>}
            {transferError && <p className="text-[11px] text-danger mt-2">{transferError}</p>}
            <p className="text-[11px] text-slate-500 mt-2">
              Imports and exports use local files only. No online sync is used.
            </p>
          </section>

          {/* Layout */}
          <section>
            <h3 className="text-xs text-slate-400 uppercase tracking-wide mb-2">
              Layout
            </h3>
            <p className="text-[11px] text-slate-500 mb-2">
              Reset all dashboard panels to their default size and move them back to the top-left so you can rearrange from a clean slate.
            </p>
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={resetPanelLayout}
            >
              Reset panel layout
            </button>

            <div className="mt-4">
              <h4 className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">
                Saved resolutions
              </h4>
              {savedViewportLayouts.length === 0 ? (
                <p className="text-[11px] text-slate-500">
                  No saved layouts yet. Move or resize a panel to save one for your current window size.
                </p>
              ) : (
                <div className="space-y-2">
                  {savedViewportLayouts.map(([key, layout]) => {
                    const isActive = activeViewportLayoutKey === key;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded border border-panel-border px-2 py-1"
                      >
                        <div>
                          <p className="text-xs text-slate-200">
                            {layout.viewportWidth}×{layout.viewportHeight}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {new Date(layout.updatedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className={`btn text-xs ${isActive ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => applyViewportLayout(key)}
                          >
                            {isActive ? 'Active' : 'Apply'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost text-xs text-danger disabled:opacity-50"
                            onClick={() => deleteViewportLayout(key)}
                            disabled={isActive}
                            title={isActive ? 'Active layout cannot be deleted' : 'Delete this saved layout'}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-slate-500 mt-2">
                Selected layout stays active until you choose another one or resize the window.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
