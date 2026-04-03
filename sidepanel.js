import { Editor } from './editor.js';

let rootHandle = null;
let currentFileHandle = null;
let currentFileContent = '';
let editor = null;

const fileTree = document.getElementById('file-tree');
const openFolderBtn = document.getElementById('open-folder');
const newFolderBtn = document.getElementById('new-folder');
const newFileBtn = document.getElementById('new-file');
const saveFileBtn = document.getElementById('save-file');
const filenameDisplay = document.getElementById('current-filename');
const fileInfo = document.getElementById('file-info');
const saveStatus = document.getElementById('save-status');
const editorTextarea = document.getElementById('editor');
const resizer = document.getElementById('resizer');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');

// IndexedDB Storage Helpers
async function setStoredHandle(handle) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('handles', 'readwrite');
        const request = tx.objectStore('handles').put(handle, 'root');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getStoredHandle() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('handles', 'readonly');
        const request = tx.objectStore('handles').get('root');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('Mini-IDE', 1);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains('handles')) {
                request.result.createObjectStore('handles');
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    editor = new Editor('editor', 'highlighting', 'line-numbers');

    // Sidebar Resizing Logic
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
        document.documentElement.style.setProperty('--sidebar-width', savedWidth + 'px');
    }

    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.classList.add('resizing');
    });

    window.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        // Sidebar is on the right, so width is distance from right edge
        let newWidth = window.innerWidth - e.clientX;
        
        // Clamp width
        if (newWidth < 150) newWidth = 150;
        if (newWidth > 600) newWidth = 600;
        
        document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
    });

    window.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.classList.remove('resizing');
            const finalWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width'));
            localStorage.setItem('sidebarWidth', finalWidth);
        }
    });
    
    // Sidebar Toggle
    const isHidden = localStorage.getItem('sidebarHidden') === 'true';
    if (isHidden) {
        document.body.classList.add('sidebar-hidden');
        toggleSidebarBtn.classList.add('active');
    }

    toggleSidebarBtn.addEventListener('click', () => {
        const currentlyHidden = document.body.classList.toggle('sidebar-hidden');
        toggleSidebarBtn.classList.toggle('active', currentlyHidden);
        localStorage.setItem('sidebarHidden', currentlyHidden);
    });
    
    // Check for stored handle
    try {
        const storedHandle = await getStoredHandle();
        if (storedHandle) {
            showRestoreUI(storedHandle);
        }
    } catch (err) {
        console.error('Failed to load stored handle:', err);
    }

    // Listen for editor changes
    editorTextarea.addEventListener('input', () => {
        const isDirty = editorTextarea.value !== currentFileContent;
        updateSaveState(isDirty);
    });
});

function showRestoreUI(handle) {
    const emptyState = fileTree.querySelector('.empty-state');
    if (!emptyState) return;

    const div = document.createElement('div');
    div.className = 'restore-container';
    div.innerHTML = `
        <div class="recent-label">Recent Folder</div>
        <button class="btn-restore" id="btn-restore">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z"></path></svg>
            Restore ${handle.name}
        </button>
    `;
    emptyState.appendChild(div);

    document.getElementById('btn-restore').addEventListener('click', async () => {
        try {
            // Request permission to re-activate the handle
            const options = { mode: 'readwrite' };
            if (await handle.requestPermission(options) === 'granted') {
                rootHandle = handle;
                newFileBtn.disabled = false;
                newFolderBtn.disabled = false;
                fileInfo.textContent = `Restored: ${rootHandle.name}`;
                await renderFileTree();
            }
        } catch (err) {
            console.error('Failed to restore folder:', err);
            alert('Access denied or folder no longer exists.');
        }
    });
}

// Open Folder
openFolderBtn.addEventListener('click', async () => {
    try {
        rootHandle = await window.showDirectoryPicker();
        await setStoredHandle(rootHandle); // Save for next session
        newFileBtn.disabled = false;
        newFolderBtn.disabled = false;
        fileInfo.textContent = `Scanning: ${rootHandle.name}`;
        await renderFileTree();
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error selecting directory:', err);
            fileInfo.textContent = 'Error selecting folder';
        }
    }
});

// Render File Tree
async function renderFileTree() {
    fileTree.innerHTML = '';
    if (!rootHandle) return;

    const entries = [];
    for await (const entry of rootHandle.values()) {
        entries.push(entry);
    }

    // Sort: Directories first, then alphabetical
    entries.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
        const item = createFileTreeItem(entry, rootHandle);
        fileTree.appendChild(item);
    }
    
    if (fileTree.children.length === 0) {
        fileTree.innerHTML = '<div class="empty-state">No files in folder</div>';
    }
}

function createFileTreeItem(entry, parentHandle) {
    const div = document.createElement('div');
    div.className = 'tree-item';
    
    let childrenContainer = null;
    let isLoaded = false;
    
    // Chevron for folders
    if (entry.kind === 'directory') {
        const chevron = document.createElement('div');
        chevron.className = 'chevron';
        chevron.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path></svg>';
        div.appendChild(chevron);
        
        childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';
    } else {
        // Spacer for files to align with folders that have chevrons
        const spacer = document.createElement('div');
        spacer.style.width = '20px';
        div.appendChild(spacer);
    }
    
    const icon = document.createElement('div');
    icon.className = 'tree-icon';
    if (entry.kind === 'directory') {
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M216,72H131.31L104,44.69A15.86,15.86,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72Zm0,128H40V56H92.69l27.31,27.31A15.86,15.86,0,0,0,131.31,88H216Z"></path></svg>';
    } else {
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM152,168a8,8,0,0,1-11.32,11.32L120,158.63,99.31,179.32a8,8,0,0,1-11.32-11.32L114.34,142,88,115.66a8,8,0,0,1,11.32-11.32L120,125.37l20.69-20.69a8,8,0,0,1,11.32,11.32L125.66,142ZM160,88V44l44,44Z"></path></svg>';
    }
    div.appendChild(icon);
    
    const span = document.createElement('span');
    span.textContent = entry.name;
    div.appendChild(span);
    
    // Actions
    const actions = document.createElement('div');
    actions.className = 'tree-actions';
    
    // Directory specific actions: Add File, Add Folder
    if (entry.kind === 'directory') {
        const addFileBtn = document.createElement('div');
        addFileBtn.className = 'action-btn add';
        addFileBtn.title = 'New File';
        addFileBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48Zm-40-72a8,8,0,0,1-8,8H136v16a8,8,0,0,1-16,0V152H104a8,8,0,0,1,0-16h16V120a8,8,0,0,1,16,0v16h16A8,8,0,0,1,160,144Z"></path></svg>';
        addFileBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!div.classList.contains('expanded')) {
                div.click(); // Expand first
            }
            showInlineInput(entry, childrenContainer, 'file');
        });
        
        const addFolderBtn = document.createElement('div');
        addFolderBtn.className = 'action-btn add';
        addFolderBtn.title = 'New Folder';
        addFolderBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M216,72H131.31L104,44.69A15.86,15.86,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72Zm0,128H40V56H92.69l27.31,27.31A15.86,15.86,0,0,0,131.31,88H216Z"></path></svg>';
        addFolderBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!div.classList.contains('expanded')) {
                div.click(); // Expand first
            }
            showInlineInput(entry, childrenContainer, 'directory');
        });
        
        actions.appendChild(addFileBtn);
        actions.appendChild(addFolderBtn);
    }
    
    const renameBtn = document.createElement('div');
    renameBtn.className = 'action-btn rename';
    renameBtn.title = 'Rename';
    renameBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM192,108,148,64l24-24,44,44ZM92.69,208H48V163.31l88-88L180.69,120Z"></path></svg>';
    renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Inline Rename
        const currentName = span.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'tree-item-input';
        input.value = currentName;
        
        div.replaceChild(input, span);
        input.focus();
        input.select();
        
        let isFinishing = false;
        const finishRename = async (confirm) => {
            if (isFinishing) return;
            isFinishing = true;
            
            if (input.parentNode !== div) return; // Already removed
            const newName = input.value.trim();
            if (confirm && newName && newName !== currentName) {
                try {
                    await entry.move(newName);
                    if (currentFileHandle && currentFileHandle.name === entry.name) {
                        filenameDisplay.textContent = newName;
                    }
                    await renderFileTree();
                } catch (err) {
                    console.error('Rename error:', err);
                    alert('Could not rename: ' + err.message);
                    div.replaceChild(span, input);
                    isFinishing = false; // Allow retry
                }
            } else {
                div.replaceChild(span, input);
            }
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finishRename(true);
            if (e.key === 'Escape') finishRename(false);
        });
        
        input.addEventListener('blur', () => finishRename(true)); // Save on blur
    });

    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'action-btn delete';
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteEntry(entry, parentHandle);
    });

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);
    div.appendChild(actions);
    
    div.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (entry.kind === 'file') {
            document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            loadFile(entry);
        } else {
            // Toggle Folder
            div.classList.toggle('expanded');
            childrenContainer.classList.toggle('visible');
            
            if (!isLoaded) {
                const sortedEntries = [];
                for await (const childEntry of entry.values()) {
                    sortedEntries.push(childEntry);
                }
                // Sort directories first, then alphabetically
                sortedEntries.sort((a, b) => {
                    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
                    return a.name.localeCompare(b.name);
                });
                
                for (const childEntry of sortedEntries) {
                    childrenContainer.appendChild(createFileTreeItem(childEntry, entry));
                }
                isLoaded = true;
            }
        }
    });
    
    if (childrenContainer) {
        const wrapper = document.createElement('div');
        wrapper.appendChild(div);
        wrapper.appendChild(childrenContainer);
        return wrapper;
    }
    
    return div;
}

// Load File
async function loadFile(handle) {
    try {
        const file = await handle.getFile();
        
        // Basic check for non-text files
        const binaryExts = ['pdf', 'zip', 'exe', 'bin', 'png', 'jpg', 'jpeg', 'gif', 'mp4', 'mp3', 'woff', 'woff2', 'ttf', 'mov', 'docx'];
        const ext = handle.name.split('.').pop().toLowerCase();
        const isBinaryMime = file.type && (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/'));
        
        if (binaryExts.includes(ext) || isBinaryMime) {
            currentFileHandle = handle;
            currentFileContent = '';
            editor.setContent('// Cannot read file: This is a binary or unsupported file format.', handle.name);
            filenameDisplay.textContent = handle.name;
            fileInfo.textContent = 'Unsupported file format';
            saveFileBtn.disabled = true;
            updateSaveState(false);
            return;
        }

        currentFileContent = await file.text();
        currentFileHandle = handle;
        
        editor.setContent(currentFileContent, handle.name);
        filenameDisplay.textContent = handle.name;
        fileInfo.textContent = `Full path: ${handle.name}`;
        updateSaveState(false);
        saveFileBtn.disabled = false;
    } catch (err) {
        console.error('Error loading file:', err);
        fileInfo.textContent = 'Error loading file';
    }
}

// Save File
saveFileBtn.addEventListener('click', async () => {
    if (!currentFileHandle) return;
    
    try {
        const writable = await currentFileHandle.createWritable();
        const content = editorTextarea.value;
        await writable.write(content);
        await writable.close();
        
        currentFileContent = content;
        updateSaveState(false);
        fileInfo.textContent = `Saved: ${currentFileHandle.name}`;
        saveStatus.className = 'status-indicator saved';
        setTimeout(() => saveStatus.className = 'status-indicator', 2000);
    } catch (err) {
        console.error('Error saving file:', err);
        fileInfo.textContent = 'Error saving (permission?)';
    }
});

// New Folder (Header)
newFolderBtn.addEventListener('click', () => {
    if (!rootHandle) return;
    showInlineInput(rootHandle, fileTree, 'directory');
});

// New File (Header)
newFileBtn.addEventListener('click', () => {
    if (!rootHandle) return;
    showInlineInput(rootHandle, fileTree, 'file');
});

async function deleteEntry(handle, parentHandle) {
    const type = handle.kind === 'directory' ? 'folder' : 'file';
    if (!confirm(`Are you sure you want to delete this ${type}: "${handle.name}"?`)) return;

    try {
        if (!parentHandle) {
            throw new Error('Parent handle not found for deletion.');
        }
        
        await parentHandle.removeEntry(handle.name, { recursive: true });
        
        if (currentFileHandle && currentFileHandle.name === handle.name) {
            currentFileHandle = null;
            currentFileContent = '';
            editor.setContent('', '');
            filenameDisplay.textContent = 'No file open';
            fileInfo.textContent = 'File deleted';
            saveFileBtn.disabled = true;
            updateSaveState(false);
        }
        
        await renderFileTree();
    } catch (err) {
        console.error('Error deleting:', err);
        alert('Could not delete: ' + err.message);
    }
}

function showInlineInput(parentHandle, container, type) {
    const tempItem = document.createElement('div');
    tempItem.className = 'tree-item';
    
    // Spacer for depth alignment
    const spacer = document.createElement('div');
    spacer.style.width = '20px';
    tempItem.appendChild(spacer);
    
    const icon = document.createElement('div');
    icon.className = 'tree-icon';
    if (type === 'directory') {
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M216,72H131.31L104,44.69A15.86,15.86,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72Zm0,128H40V56H92.69l27.31,27.31A15.86,15.86,0,0,0,131.31,88H216Z"></path></svg>';
    } else {
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256"><path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48Zm-40-72a8,8,0,0,1-8,8H136v16a8,8,0,0,1-16,0V152H104a8,8,0,0,1,0-16h16V120a8,8,0,0,1,16,0v16h16A8,8,0,0,1,160,144Z"></path></svg>';
    }
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tree-item-input';
    input.placeholder = type === 'directory' ? 'folder name' : 'file name';
    
    tempItem.appendChild(icon);
    tempItem.appendChild(input);
    
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) emptyState.style.display = 'none';
    
    container.prepend(tempItem);
    input.focus();
    
    let isFinishing = false;
    const finish = async (confirm) => {
        if (isFinishing) return;
        isFinishing = true;
        
        const name = input.value.trim();
        if (confirm && name) {
            try {
                if (type === 'directory') {
                    await parentHandle.getDirectoryHandle(name, { create: true });
                } else {
                    const newHandle = await parentHandle.getFileHandle(name, { create: true });
                    if (container === fileTree) {
                        loadFile(newHandle);
                    }
                }
                await renderFileTree();
            } catch (err) {
                console.error('Error creating:', err);
                alert('Could not create: ' + err.message);
                tempItem.remove();
                isFinishing = false;
            }
        } else {
            tempItem.remove();
            if (emptyState && container.children.length === 0) emptyState.style.display = 'block';
        }
    };

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
}

function updateSaveState(isDirty) {
    if (isDirty) {
        saveStatus.className = 'status-indicator dirty';
        saveFileBtn.disabled = false;
    } else {
        saveStatus.className = 'status-indicator';
        // Don't disable save button completely if a file is open, just visual state
    }
}
