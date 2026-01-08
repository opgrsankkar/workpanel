import { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  isFileSystemAccessSupported,
  getNotesFolder,
  pickNotesFolder,
  listNotes,
  readNote,
  writeNote,
  createNote,
  deleteNote,
} from '../../utils/fileSystem';

interface MonacoPanelProps {
  editorRef?: React.MutableRefObject<unknown>;
}

export function MonacoPanel({ editorRef }: MonacoPanelProps) {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [notes, setNotes] = useState<{ name: string; handle: FileSystemFileHandle }[]>([]);
  const [activeNote, setActiveNote] = useState<{ name: string; handle: FileSystemFileHandle } | null>(null);
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<number | null>(null);
  const monacoRef = useRef<unknown>(null);

  // Initialize folder
  useEffect(() => {
    const init = async () => {
      if (!isFileSystemAccessSupported()) {
        setLoading(false);
        return;
      }

      try {
        const handle = await getNotesFolder();
        if (handle) {
          setDirHandle(handle);
          const files = await listNotes(handle);
          setNotes(files);
          
          // Open first note if available
          if (files.length > 0) {
            await openNote(files[0]);
          }
        }
      } catch (err) {
        console.error('Failed to initialize notes folder:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const refreshNotes = useCallback(async () => {
    if (!dirHandle) return;
    const files = await listNotes(dirHandle);
    setNotes(files);
  }, [dirHandle]);

  const openNote = async (note: { name: string; handle: FileSystemFileHandle }) => {
    // Save current note first if dirty
    if (isDirty && activeNote) {
      await saveCurrentNote();
    }

    try {
      const text = await readNote(note.handle);
      setActiveNote(note);
      setContent(text);
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to open note:', err);
    }
  };

  const saveCurrentNote = async () => {
    if (!activeNote) return;
    
    try {
      await writeNote(activeNote.handle, content);
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  const handleContentChange = (value: string | undefined) => {
    if (value === undefined) return;
    setContent(value);
    setIsDirty(true);

    // Debounced auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(async () => {
      if (activeNote) {
        try {
          await writeNote(activeNote.handle, value);
          setIsDirty(false);
        } catch (err) {
          console.error('Auto-save failed:', err);
        }
      }
    }, 2000);
  };

  const handlePickFolder = async () => {
    try {
      const handle = await pickNotesFolder();
      if (handle) {
        setDirHandle(handle);
        const files = await listNotes(handle);
        setNotes(files);
        setActiveNote(null);
        setContent('');
        
        if (files.length > 0) {
          await openNote(files[0]);
        }
      }
    } catch (err) {
      console.error('Failed to pick folder:', err);
    }
  };

  const generateNoteFilename = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year}_${hours}-${minutes}_note.md`;
  };

  const handleCreateNote = async () => {
    if (!dirHandle) return;

    const filename = generateNoteFilename();
    try {
      const handle = await createNote(dirHandle, filename);
      await refreshNotes();
      
      // Open the new note
      await openNote({ name: filename, handle });
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleDeleteNote = async (note: { name: string; handle: FileSystemFileHandle }) => {
    if (!dirHandle) return;
    if (!confirm(`Delete "${note.name}"?`)) return;

    try {
      await deleteNote(dirHandle, note.name);
      await refreshNotes();
      
      if (activeNote?.name === note.name) {
        setActiveNote(null);
        setContent('');
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleEditorMount = (editor: unknown) => {
    monacoRef.current = editor;
    if (editorRef) {
      editorRef.current = editor;
    }
  };

  if (!isFileSystemAccessSupported()) {
    return (
      <div className="panel h-full flex items-center justify-center">
        <p className="text-slate-400 text-center">
          File System Access API is not supported in this browser.
          <br />
          <span className="text-sm">Please use Chrome, Edge, or another Chromium-based browser.</span>
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="panel h-full flex items-center justify-center">
        <p className="text-slate-400">Loading notes...</p>
      </div>
    );
  }

  if (!dirHandle) {
    return (
      <div className="panel h-full flex flex-col items-center justify-center">
        <p className="text-slate-400 mb-4">Select a folder for your notes</p>
        <button onClick={handlePickFolder} className="btn btn-primary">
          Choose Notes Folder
        </button>
      </div>
    );
  }

  return (
    <div className="panel h-full flex flex-col p-0 overflow-hidden">
      {/* Header (drag handle) with tabs */}
      <div className="panel-header flex items-center justify-between px-2 py-1 gap-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {notes.map((note) => (
            <button
              key={note.name}
              onClick={() => openNote(note)}
              className={`px-2 py-0.5 text-xs rounded whitespace-nowrap flex items-center gap-1 ${
                activeNote?.name === note.name
                  ? 'bg-accent text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {note.name}
              {activeNote?.name === note.name && isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
              )}
            </button>
          ))}

          <button
            onClick={handleCreateNote}
            className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 rounded"
          >
            + New
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeNote && (
            <button
              onClick={() => handleDeleteNote(activeNote)}
              className="text-xs text-slate-400 hover:text-danger"
            >
              Delete
            </button>
          )}
          <button
            onClick={handlePickFolder}
            className="text-xs text-slate-400 hover:text-white"
          >
            Change Folder
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        {activeNote ? (
          <Editor
            height="100%"
            defaultLanguage="markdown"
            theme="vs-dark"
            value={content}
            onChange={handleContentChange}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              wordWrap: 'on',
              lineNumbers: 'on',
              folding: false,
              glyphMargin: false,
              lineDecorationsWidth: 8,
              lineNumbersMinChars: 3,
              padding: { top: 16, bottom: 16 },
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            {notes.length === 0
              ? 'Create a note to get started'
              : 'Select a note to edit'}
          </div>
        )}
      </div>
    </div>
  );
}
