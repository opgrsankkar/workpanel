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

type NoteFile = { name: string; handle: FileSystemFileHandle };

interface MonacoPanelProps {
  editorRef?: React.MutableRefObject<unknown>;
}

export function MonacoPanel({ editorRef }: MonacoPanelProps) {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [notes, setNotes] = useState<NoteFile[]>([]); // All files in folder
  const [openNotes, setOpenNotes] = useState<NoteFile[]>([]); // Currently open tabs
  const [activeNote, setActiveNote] = useState<NoteFile | null>(null);
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const monacoRef = useRef<unknown>(null);
  const filePickerRef = useRef<HTMLDivElement>(null);

  const sanitizeFilename = (title: string) => {
    // Replace characters that are not allowed in filenames on common filesystems
    const invalidChars = /[\\/:*?"<>|]/g;
    const sanitized = title.trim().replace(invalidChars, '_');
    return sanitized || 'untitled';
  };

  const maybeRenameActiveNoteFromContent = async (currentContent: string) => {
    if (!dirHandle || !activeNote) return;

    const firstLine = currentContent.split(/\r?\n/)[0]?.trim();
    if (!firstLine || !firstLine.startsWith('# ')) return;

    const rawTitle = firstLine.slice(2).trim();
    if (!rawTitle) return;

    const baseName = sanitizeFilename(rawTitle);
    const newName = baseName.endsWith('.md') ? baseName : `${baseName}.md`;

    // Enforce max length
    if (newName.length > 250) return;

    // No-op if name is unchanged
    if (newName === activeNote.name) return;

    // Avoid clashing with another existing note name
    if (notes.some((note) => note.name === newName && note.name !== activeNote.name)) return;

    try {
      const newHandle = await dirHandle.getFileHandle(newName, { create: true });
      await writeNote(newHandle, currentContent);
      await deleteNote(dirHandle, activeNote.name);

      const updatedNote: NoteFile = { name: newName, handle: newHandle };

      setNotes((prev) => prev.map((n) => (n.name === activeNote.name ? updatedNote : n)));
      setOpenNotes((prev) => prev.map((n) => (n.name === activeNote.name ? updatedNote : n)));
      setActiveNote(updatedNote);
    } catch (err) {
      console.error('Failed to rename note based on title:', err);
    }
  };

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
            setOpenNotes([files[0]]);
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

  // Close file picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filePickerRef.current && !filePickerRef.current.contains(event.target as Node)) {
        setShowFilePicker(false);
      }
    };

    if (showFilePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilePicker]);

  const refreshNotes = useCallback(async () => {
    if (!dirHandle) return;
    const files = await listNotes(dirHandle);
    setNotes(files);
  }, [dirHandle]);

  const openNote = async (note: NoteFile) => {
    // Save current note first if dirty
    if (isDirty && activeNote) {
      await saveCurrentNote();
    }

    try {
      const text = await readNote(note.handle);
      
      // Add to open notes if not already open
      setOpenNotes(prev => {
        if (prev.some(n => n.name === note.name)) {
          return prev;
        }
        return [...prev, note];
      });
      
      setActiveNote(note);
      setContent(text);
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to open note:', err);
    }
  };

  const closeNote = async (note: NoteFile, event?: React.MouseEvent) => {
    // Prevent triggering tab click when closing
    if (event) {
      event.stopPropagation();
    }

    // Auto-save if this note is active and dirty
    if (activeNote?.name === note.name && isDirty) {
      await saveCurrentNote();
    }

    // Remove from open notes
    setOpenNotes(prev => {
      const newOpenNotes = prev.filter(n => n.name !== note.name);
      
      // If closing the active note, switch to another open note
      if (activeNote?.name === note.name) {
        const closingIndex = prev.findIndex(n => n.name === note.name);
        if (newOpenNotes.length > 0) {
          // Prefer the next tab, or the previous if closing the last tab
          const nextIndex = Math.min(closingIndex, newOpenNotes.length - 1);
          const nextNote = newOpenNotes[nextIndex];
          // Open the next note asynchronously
          readNote(nextNote.handle).then(text => {
            setActiveNote(nextNote);
            setContent(text);
            setIsDirty(false);
          }).catch(err => {
            console.error('Failed to open next note:', err);
          });
        } else {
          setActiveNote(null);
          setContent('');
          setIsDirty(false);
        }
      }
      
      return newOpenNotes;
    });
  };

  const handleTabMiddleClick = (note: NoteFile, event: React.MouseEvent) => {
    if (event.button === 1) { // Middle click
      event.preventDefault();
      closeNote(note);
    }
  };

  const saveCurrentNote = async () => {
    if (!activeNote) return;
    
    try {
      await writeNote(activeNote.handle, content);
      await maybeRenameActiveNoteFromContent(content);
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
          await maybeRenameActiveNoteFromContent(value);
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
        setOpenNotes([]);
        setActiveNote(null);
        setContent('');
        
        if (files.length > 0) {
          setOpenNotes([files[0]]);
          await openNote(files[0]);
        }
      }
    } catch (err) {
      console.error('Failed to pick folder:', err);
    }
  };

  const generateNoteFilename = (existingNames: string[]) => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const baseName = `${day}-${month}-${year}_${hours}-${minutes}_note.md`;

    if (!existingNames.includes(baseName)) {
      return baseName;
    }

    // If a note with this timestamp already exists, prefix with an incrementing counter
    let counter = 2;
    // e.g., 2_21-Jan-2026_10-15_note.md, 3_21-Jan-2026_10-15_note.md, etc.
    // This avoids overwriting and keeps all files grouped by timestamp.
    while (existingNames.includes(`${counter}_${baseName}`)) {
      counter += 1;
    }

    return `${counter}_${baseName}`;
  };

  const handleCreateNote = async () => {
    if (!dirHandle) return;

    const filename = generateNoteFilename(notes.map((n) => n.name));
    try {
      const handle = await createNote(dirHandle, filename);
      await refreshNotes();
      
      // Open the new note (this will add it to openNotes)
      const newNote = { name: filename, handle };
      await openNote(newNote);
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleCleanFolder = async () => {
    if (!dirHandle || notes.length === 0) return;

    try {
      const emptyNotes: NoteFile[] = [];

      for (const note of notes) {
        const text = await readNote(note.handle);
        // Only delete files with no content at all
        if (text.length === 0) {
          emptyNotes.push(note);
        }
      }

      if (emptyNotes.length === 0) {
        return;
      }

      const namesToDelete = new Set(emptyNotes.map((n) => n.name));

      for (const note of emptyNotes) {
        await deleteNote(dirHandle, note.name);
      }

      // Update open notes and active note locally
      setOpenNotes((prev) => {
        const remaining = prev.filter((n) => !namesToDelete.has(n.name));

        if (activeNote && namesToDelete.has(activeNote.name)) {
          if (remaining.length > 0) {
            const nextNote = remaining[0];
            readNote(nextNote.handle)
              .then((text) => {
                setActiveNote(nextNote);
                setContent(text);
                setIsDirty(false);
              })
              .catch((err) => {
                console.error('Failed to open next note after clean:', err);
              });
          } else {
            setActiveNote(null);
            setContent('');
            setIsDirty(false);
          }
        }

        return remaining;
      });

      await refreshNotes();
    } catch (err) {
      console.error('Failed to clean empty notes:', err);
    }
  };

  // Get files that are in folder but not currently open
  const closedNotes = notes.filter(
    note => !openNotes.some(openNote => openNote.name === note.name)
  );

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
        {/* Tabs area - scrollable */}
        <div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1">
          {openNotes.map((note) => (
            <button
              key={note.name}
              onClick={() => openNote(note)}
              onMouseDown={(e) => handleTabMiddleClick(note, e)}
              className={`group px-2 py-0.5 text-xs rounded whitespace-nowrap flex items-center gap-1 ${
                activeNote?.name === note.name
                  ? 'bg-accent text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <span className="max-w-32 truncate">{note.name}</span>
              {activeNote?.name === note.name && isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-warning flex-shrink-0" />
              )}
              <span
                onClick={(e) => closeNote(note, e)}
                className={`ml-0.5 w-4 h-4 flex items-center justify-center rounded hover:bg-slate-500/50 flex-shrink-0 ${
                  activeNote?.name === note.name ? 'opacity-70 hover:opacity-100' : 'opacity-0 group-hover:opacity-70 hover:!opacity-100'
                }`}
                title="Close"
              >
                ×
              </span>
            </button>
          ))}
        </div>

        {/* Controls area - fixed on right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Open file dropdown */}
          <div className="relative" ref={filePickerRef}>
            <button
              onClick={() => setShowFilePicker(!showFilePicker)}
              className="text-xs text-slate-400 hover:text-white"
              title="Open file"
            >
              Open
            </button>
            {showFilePicker && (
              <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-600 rounded shadow-lg min-w-48 max-h-64 overflow-y-auto" style={{ zIndex: 9999 }}>
                {closedNotes.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-400">
                    All files are open
                  </div>
                ) : (
                  closedNotes.map((note) => (
                    <button
                      key={note.name}
                      onClick={() => {
                        openNote(note);
                        setShowFilePicker(false);
                      }}
                      className="w-full px-3 py-1.5 text-xs text-left text-slate-300 hover:bg-slate-700 truncate"
                    >
                      {note.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleCreateNote}
            className="text-xs text-slate-400 hover:text-white"
            title="New note"
          >
            New
          </button>

          <button
            onClick={handleCleanFolder}
            className="text-xs text-slate-400 hover:text-danger"
            title="Delete all empty notes in this folder"
          >
            Clean
          </button>
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
              : openNotes.length === 0
              ? 'Open a file or create a new note'
              : 'Select a note to edit'}
          </div>
        )}
      </div>
    </div>
  );
}
