// File System Access API utilities for notes folder management

const DIRECTORY_HANDLE_KEY = 'notes-directory-handle';

// Store directory handle in IndexedDB
async function storeDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('dashboard-fs', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles');
      }
    };
    
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('handles', 'readwrite');
      const store = tx.objectStore('handles');
      store.put(handle, DIRECTORY_HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
  });
}

// Retrieve directory handle from IndexedDB
async function retrieveDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('dashboard-fs', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles');
      }
    };
    
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('handles', 'readonly');
      const store = tx.objectStore('handles');
      const getRequest = store.get(DIRECTORY_HANDLE_KEY);
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result || null);
      };
      getRequest.onerror = () => reject(getRequest.error);
    };
  });
}

// Request permission to use the directory handle
async function verifyPermission(
  handle: FileSystemDirectoryHandle,
  readWrite: boolean = true
): Promise<boolean> {
  const options: FileSystemHandlePermissionDescriptor = readWrite
    ? { mode: 'readwrite' }
    : { mode: 'read' };

  // Check if permission is already granted
  if ((await handle.queryPermission(options)) === 'granted') {
    return true;
  }

  // Request permission
  if ((await handle.requestPermission(options)) === 'granted') {
    return true;
  }

  return false;
}

// Pick a new notes folder
export async function pickNotesFolder(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents',
    });
    
    await storeDirectoryHandle(handle);
    return handle;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return null; // User cancelled
    }
    throw error;
  }
}

// Get the current notes folder handle
export async function getNotesFolder(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await retrieveDirectoryHandle();
  
  if (!handle) {
    return null;
  }
  
  // Verify we still have permission
  const hasPermission = await verifyPermission(handle);
  if (!hasPermission) {
    return null;
  }
  
  return handle;
}

// List all files in the notes folder
export async function listNotes(
  dirHandle: FileSystemDirectoryHandle
): Promise<{ name: string; handle: FileSystemFileHandle }[]> {
  const files: { name: string; handle: FileSystemFileHandle }[] = [];
  
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'file' && (name.endsWith('.md') || name.endsWith('.txt'))) {
      files.push({ name, handle: handle as FileSystemFileHandle });
    }
  }
  
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

// Read a note file
export async function readNote(fileHandle: FileSystemFileHandle): Promise<string> {
  const file = await fileHandle.getFile();
  return file.text();
}

// Write to a note file
export async function writeNote(fileHandle: FileSystemFileHandle, content: string): Promise<void> {
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

// Create a new note file
export async function createNote(
  dirHandle: FileSystemDirectoryHandle,
  filename: string
): Promise<FileSystemFileHandle> {
  // Ensure .md extension
  const name = filename.endsWith('.md') ? filename : `${filename}.md`;
  const fileHandle = await dirHandle.getFileHandle(name, { create: true });
  
  // Initialize with empty content
  await writeNote(fileHandle, '');
  
  return fileHandle;
}

// Delete a note file
export async function deleteNote(
  dirHandle: FileSystemDirectoryHandle,
  filename: string
): Promise<void> {
  await dirHandle.removeEntry(filename);
}

// Check if File System Access API is supported
export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}
