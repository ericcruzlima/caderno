window.onload = function() {
    initSidebars();
    window.initializeVaultState();
    if (window.setViewMode) {
        const preferredView = window.getPreferredViewMode ? window.getPreferredViewMode() : 'split';
        window.setViewMode(preferredView);
    }
    if (window.renderVaultList) window.renderVaultList();
    if (window.loadActiveNote) window.loadActiveNote();
    window.initP2PEngine();

    const textarea = document.getElementById('markdown-textarea');
    if (textarea) {
        textarea.addEventListener('focus', () => { if (window.updateEditorOverlays) window.updateEditorOverlays(); });
        textarea.addEventListener('blur', () => { if (window.updateEditorOverlays) window.updateEditorOverlays(); });

        new ResizeObserver(() => {
            if (window.updateLineNumbers) window.updateLineNumbers();
            if (window.updateEditorOverlays) window.updateEditorOverlays();
        }).observe(textarea);
    }

    window.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeCommandPalette();
            closeDeleteModal();
            closeProfileModal();
            if (window.hideMentionAutocomplete) window.hideMentionAutocomplete();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            openCommandPalette();
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            toggleSidebar('left-sidebar');
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
            e.preventDefault();
            toggleSidebar('right-sidebar');
        }
    });

    document.addEventListener('click', function(e) {
        const mentionsDropdown = document.getElementById('mentions-dropdown');
        const mentionsBell = document.getElementById('btn-mentions-bell');
        if (mentionsDropdown && mentionsBell && !mentionsBell.contains(e.target) && !mentionsDropdown.contains(e.target)) {
            mentionsDropdown.classList.add('hidden');
        }
    });
};

function toggleSidebar(id) {
    const bar = document.getElementById(id);
    if (!bar) return;
    const isLeft = id === 'left-sidebar';
    const isCollapsed = bar.classList.contains('w-0');
    
    if (isCollapsed) {
        bar.classList.remove('w-0', 'overflow-hidden', isLeft ? 'border-r-0' : 'border-l-0');
        bar.classList.add('w-64', isLeft ? 'border-r' : 'border-l');
        localStorage.setItem(`sidebar_${id}_collapsed`, 'false');
    } else {
        bar.classList.remove('w-64', isLeft ? 'border-r' : 'border-l');
        bar.classList.add('w-0', 'overflow-hidden', isLeft ? 'border-r-0' : 'border-l-0');
        localStorage.setItem(`sidebar_${id}_collapsed`, 'true');
    }
    updateToggleButtonState(id, !isCollapsed);
}
window.toggleSidebar = toggleSidebar;

function initSidebars() {
    applySidebarState('left-sidebar', localStorage.getItem('sidebar_left-sidebar_collapsed') !== 'false');
    applySidebarState('right-sidebar', localStorage.getItem('sidebar_right-sidebar_collapsed') !== 'false');
}

function applySidebarState(id, collapsed) {
    const bar = document.getElementById(id);
    if (!bar) return;
    const isLeft = id === 'left-sidebar';
    if (collapsed) {
        bar.classList.remove('w-64', isLeft ? 'border-r' : 'border-l');
        bar.classList.add('w-0', 'overflow-hidden', isLeft ? 'border-r-0' : 'border-l-0');
    } else {
        bar.classList.remove('w-0', 'overflow-hidden', isLeft ? 'border-r-0' : 'border-l-0');
        bar.classList.add('w-64', isLeft ? 'border-r' : 'border-l');
    }
    updateToggleButtonState(id, collapsed);
}

function updateToggleButtonState(id, isCollapsed) {
    const btn = document.getElementById(id === 'left-sidebar' ? 'btn-toggle-left' : 'btn-toggle-right');
    if (!btn) return;
    btn.className = isCollapsed 
        ? "p-1.5 hover:bg-obsidian-active rounded transition-all border border-transparent text-obsidian-textMuted hover:text-white"
        : "p-1.5 bg-obsidian-active rounded transition-all border border-obsidian-border text-obsidian-accent hover:text-obsidian-accentHover";
}

function openCommandPalette() {
    document.getElementById('command-palette').classList.remove('hidden');
    document.getElementById('command-palette').classList.add('flex');
    const searchInput = document.getElementById('palette-search');
    searchInput.value = ''; searchInput.focus();
    handlePaletteSearch();
}
window.openCommandPalette = openCommandPalette;

function closeCommandPalette() {
    document.getElementById('command-palette').classList.add('hidden');
    document.getElementById('command-palette').classList.remove('flex');
}
window.closeCommandPalette = closeCommandPalette;

function handlePaletteSearch() {
    const query = document.getElementById('palette-search').value.toLowerCase();
    const container = document.getElementById('palette-results');
    container.innerHTML = '';
    let matches = 0;

    Object.keys(vault).forEach(key => {
        if (vault[key].title.toLowerCase().includes(query)) {
            matches++;
            const row = document.createElement('div');
            row.className = 'p-2.5 hover:bg-obsidian-active rounded-lg cursor-pointer transition-colors text-sm flex items-center justify-between text-white';
            row.onclick = () => { selectNote(key); closeCommandPalette(); };
            row.innerHTML = `<div class="flex items-center gap-2"><i class="fa-regular fa-file-lines text-obsidian-accent"></i><span>${escapeHTML(vault[key].title)}</span></div><span class="text-[10px] text-obsidian-textMuted uppercase font-mono">${i18n[currentLang].selectFile}</span>`;
            container.appendChild(row);
        }
    });

    if (vault[activeNoteKey]) {
        vault[activeNoteKey].content.split('\n').forEach((line, index) => {
            let level = 0;
            if (line.startsWith('# ')) level = 1; else if (line.startsWith('## ')) level = 2; else if (line.startsWith('### ')) level = 3; else if (line.startsWith('#### ')) level = 4;

            if (level > 0) {
                const headingText = line.replace(/^#+\s+/, '');
                if (headingText.toLowerCase().includes(query)) {
                    matches++;
                    const row = document.createElement('div');
                    row.className = 'p-2.5 hover:bg-obsidian-active rounded-lg cursor-pointer transition-colors text-sm flex items-center justify-between text-neutral-300';
                    row.onclick = () => { scrollEditorToLine(index); closeCommandPalette(); };
                    row.innerHTML = `<div class="flex items-center gap-2 pl-4"><i class="fa-solid fa-list-ul text-neutral-500"></i><span>${escapeHTML(headingText)}</span></div><span class="text-[10px] text-neutral-500 uppercase font-mono">${i18n[currentLang].jumpToSec} (H${level})</span>`;
                    container.appendChild(row);
                }
            }
        });
    }

    if (matches === 0) container.innerHTML = `<p class="text-neutral-500 italic text-xs text-center p-4">${i18n[currentLang].noMatches}</p>`;
}
window.handlePaletteSearch = handlePaletteSearch;

function getPreferredViewMode() {
    const savedMode = localStorage.getItem('caderno_view_mode');
    if (savedMode === 'edit' || savedMode === 'reading' || savedMode === 'split') return savedMode;
    return 'split';
}
window.getPreferredViewMode = getPreferredViewMode;

function setViewMode(mode, persist = true) {
    if (mode === 'hybrid') mode = 'split';
    viewMode = mode;
    if (persist && ['edit', 'reading', 'split'].includes(mode)) {
        localStorage.setItem('caderno_view_mode', mode);
    }
    const editor = document.getElementById('editor-container');
    const preview = document.getElementById('preview-container');
    const splitter = document.getElementById('pane-splitter');
    const hybridBackdrop = document.getElementById('hybrid-backdrop');
    const textarea = document.getElementById('markdown-textarea');
    
    ['btn-edit-mode', 'btn-reading-mode', 'btn-split-mode'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.className = "px-2.5 py-1 text-xs font-medium rounded transition-colors text-obsidian-textMuted hover:text-white";
    });

    // Reset base styles
    if (textarea) {
        textarea.style.color = '#e2e8f0';
        textarea.style.top = '0';
    }
    if (hybridBackdrop) {
        hybridBackdrop.style.opacity = '0';
        hybridBackdrop.classList.add('pointer-events-none');
    }

    if (mode === 'edit') {
        editor.classList.remove('hidden'); preview.classList.add('hidden'); splitter.classList.add('hidden');
        const btn = document.getElementById('btn-edit-mode');
        if (btn) btn.classList.add('bg-obsidian-active', 'text-white');
    } else if (mode === 'hybrid') {
        editor.classList.remove('hidden'); preview.classList.add('hidden'); splitter.classList.add('hidden');
        if (hybridBackdrop) {
            hybridBackdrop.style.opacity = '1';
            hybridBackdrop.classList.remove('pointer-events-none');
        }
        if (textarea) textarea.style.color = 'transparent';
        const btn = document.getElementById('btn-hybrid-mode');
        if (btn) btn.classList.add('bg-obsidian-active', 'text-obsidian-accent');
    } else if (mode === 'reading') {
        editor.classList.add('hidden'); preview.classList.remove('hidden'); splitter.classList.add('hidden');
        const btn = document.getElementById('btn-reading-mode');
        if (btn) btn.classList.add('bg-obsidian-active', 'text-white');
    } else {
        editor.classList.remove('hidden'); preview.classList.remove('hidden'); splitter.classList.remove('hidden');
        const btn = document.getElementById('btn-split-mode');
        if (btn) btn.classList.add('bg-obsidian-active', 'text-obsidian-accent');
    }
    
    if (window.updateEditorOverlays) window.updateEditorOverlays();
}
window.setViewMode = setViewMode;

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `p-3 rounded-lg shadow-2xl flex items-center justify-between text-xs font-semibold transition-all duration-300 transform translate-y-2 opacity-0 select-none ${type === 'success' ? 'bg-obsidian-accentBg text-obsidian-accentMuted border border-obsidian-accentBorder shadow-xl shadow-obsidian-accent/10' : 'bg-neutral-800/90 text-neutral-200 border border-neutral-700'}`;
    toast.innerHTML = `<span>${message}</span><button class="ml-3 hover:text-white" onclick="this.parentElement.remove()">&times;</button>`;
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.remove('opacity-0', 'translate-y-2'), 10);
    setTimeout(() => { toast.classList.add('opacity-0', 'translate-y-2'); setTimeout(() => toast.remove(), 300); }, 4000);
}
window.showToast = showToast;

window.showNavigationToast = function(peerId, peerName, targetNoteKey) {
    const existingId = `toast-nav-${peerId}`;
    let toast = document.getElementById(existingId);
    
    if (toast) {
        clearTimeout(parseInt(toast.dataset.timeoutId));
        toast.remove();
    }
    
    const targetNoteName = vault[targetNoteKey]?.title || "another note";
    const container = document.getElementById('toast-container');
    toast = document.createElement('div');
    toast.id = existingId;
    toast.dataset.targetNote = targetNoteKey;
    toast.className = `p-3.5 rounded-lg shadow-2xl flex flex-col gap-2 text-xs font-semibold transition-all duration-300 transform translate-y-2 opacity-0 select-none bg-obsidian-active text-white border border-obsidian-accent/60 shadow-xl shadow-obsidian-accent/10 z-[200]`;
    
    const msg = currentLang === 'pt-br' ? 
        `<span class="truncate"><b>${escapeHTML(peerName)}</b> foi para <br><span class="text-obsidian-accent">${escapeHTML(targetNoteName)}</span></span>` : 
        `<span class="truncate"><b>${escapeHTML(peerName)}</b> moved to <br><span class="text-obsidian-accent">${escapeHTML(targetNoteName)}</span></span>`;
        
    const btnLabel = currentLang === 'pt-br' ? 'Acompanhar' : 'Follow';
        
    toast.innerHTML = `
        <div class="flex items-start justify-between gap-4">
            <span class="flex items-center gap-3 overflow-hidden"><i class="fa-solid fa-person-walking-arrow-right text-obsidian-accent shrink-0 text-base"></i> <div class="leading-tight">${msg}</div></span>
            <button class="text-gray-400 hover:text-white shrink-0 -mt-1 -mr-1 p-1" onclick="this.closest('[id^=toast-nav-]').remove()"><i class="fa-solid fa-times text-sm"></i></button>
        </div>
        <button onclick="joinPeerNote('${targetNoteKey}', '${existingId}')" class="w-full py-2 mt-1.5 bg-obsidian-accent hover:bg-obsidian-accentHover text-white rounded transition-colors font-bold tracking-wide uppercase text-[10px]">${btnLabel}</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.remove('opacity-0', 'translate-y-2'), 10);
    
    const timeout = setTimeout(() => {
        if (document.getElementById(existingId)) {
            toast.classList.add('opacity-0', 'translate-y-2'); 
            setTimeout(() => toast.remove(), 300);
        }
    }, 20000);
    
    toast.dataset.timeoutId = timeout;
};

window.joinPeerNote = function(noteKey, toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        clearTimeout(parseInt(toast.dataset.timeoutId));
        toast.remove();
    }
    if (vault[noteKey]) {
        selectNote(noteKey);
    }
};

window.toggleMentionsDropdown = function(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('mentions-dropdown');
    dropdown.classList.toggle('hidden');
};

window.scanForMentions = function(text, noteKey, authorName) {
    const pattern = new RegExp(`@${escapeRegExp(localUser.name)}\\b`, 'i');
    if (pattern.test(text)) {
        const isDuplicate = userMentions.some(m => m.noteKey === noteKey && m.authorName === authorName && (Date.now() - m.timestamp < 10000));
        if (!isDuplicate) {
            userMentions.unshift({
                noteKey: noteKey,
                authorName: authorName,
                text: vault[noteKey]?.title || "Caderno",
                timestamp: Date.now(),
                read: false
            });
            saveVaultLocalOnly();
            updateMentionsUI();
            showToast(`Você foi mencionado por ${authorName}!`, 'success');
        }
    }
};

window.toggleSettingsDropdown = function(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('settings-dropdown');
    const userDropdown = document.getElementById('user-dropdown');
    if (userDropdown) userDropdown.classList.add('hidden');
    if (dropdown) dropdown.classList.toggle('hidden');
};

window.toggleUserMenu = function(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('user-dropdown');
    const settingsDropdown = document.getElementById('settings-dropdown');
    if (settingsDropdown) settingsDropdown.classList.add('hidden');
    if (dropdown) dropdown.classList.toggle('hidden');
};

window.addEventListener('click', function(e) {
    const settingsDropdown = document.getElementById('settings-dropdown');
    const userDropdown = document.getElementById('user-dropdown');
    const cogBtn = document.getElementById('btn-settings-cog');
    const userBtn = document.getElementById('collab-status-container');
    
    if (settingsDropdown && cogBtn && !cogBtn.contains(e.target) && !settingsDropdown.contains(e.target)) {
        settingsDropdown.classList.add('hidden');
    }
    if (userDropdown && userBtn && !userBtn.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.classList.add('hidden');
    }
});

function updateMentionsUI() {
    const unreadCount = userMentions.filter(m => !m.read).length;
    const badge = document.getElementById('mention-badge');
    if (badge) {
        if (unreadCount > 0) {
            badge.innerText = unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    const listContainer = document.getElementById('mentions-list-mini');
    if (!listContainer) return;

    if (userMentions.length === 0) {
        listContainer.innerHTML = `<p class="text-[9px] text-neutral-500 italic text-center py-4">No mentions yet.</p>`;
        return;
    }

    listContainer.innerHTML = '';
    userMentions.forEach((m, idx) => {
        const item = document.createElement('div');
        item.className = `p-1.5 hover:bg-obsidian-active cursor-pointer transition-colors flex flex-col gap-0.5 rounded ${!m.read ? 'bg-obsidian-accentBg/30 border-l-2 border-obsidian-accent' : ''}`;
        item.onclick = () => {
            m.read = true;
            saveVaultLocalOnly();
            updateMentionsUI();
            selectNote(m.noteKey);
            const dropdown = document.getElementById('user-dropdown');
            if (dropdown) dropdown.classList.add('hidden');
        };
        
        const dateStr = new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        item.innerHTML = `
            <div class="flex justify-between text-[9px] text-neutral-400">
                <span class="font-bold text-gray-200">@${escapeHTML(m.authorName)}</span>
                <span>${dateStr}</span>
            </div>
            <span class="text-[10px] text-gray-300 truncate">${escapeHTML(m.text)}</span>
        `;
        listContainer.appendChild(item);
    });
}
window.updateMentionsUI = updateMentionsUI;

window.clearMentions = function() {
    userMentions = [];
    saveVaultLocalOnly();
    updateMentionsUI();
};

window.toggleOwnCursorFlag = function() {
    ownCursorFlagEnabled = !ownCursorFlagEnabled;
    const icon = document.getElementById('btn-own-cursor-icon');
    if (ownCursorFlagEnabled) {
        if (icon) icon.className = "fa-solid fa-toggle-on text-obsidian-accent";
    } else {
        if (icon) icon.className = "fa-solid fa-toggle-off text-neutral-500";
    }
    
    // Force cursor position sync & render
    const textarea = document.getElementById('markdown-textarea');
    if (textarea) localUser.cursorPos = textarea.selectionStart;
    if (window.renderRemoteCursors) window.renderRemoteCursors();
};

window.toggleBlameMode = function() {
    blameModeEnabled = !blameModeEnabled;
    const label = document.getElementById('blame-status-label');
    const btnCog = document.getElementById('btn-blame-toggle-cog');
    
    if (blameModeEnabled) {
        if (label) { label.innerText = 'ON'; label.className = "text-[9px] px-1 bg-obsidian-accent rounded text-white font-bold"; }
        if (btnCog) btnCog.classList.add('bg-obsidian-active');
    } else {
        if (label) { label.innerText = 'OFF'; label.className = "text-[9px] px-1 bg-neutral-800 rounded text-neutral-500"; }
        if (btnCog) btnCog.classList.remove('bg-obsidian-active');
    }
    if (window.renderActiveNote) window.renderActiveNote();
};

window.openProfileModal = function() {
    document.getElementById('profile-nickname-input').value = localUser.name;
    selectProfileColor(localUser.color);
    document.getElementById('profile-modal').classList.remove('hidden');
    document.getElementById('profile-modal').classList.add('flex');
};
window.closeProfileModal = function() {
    document.getElementById('profile-modal').classList.add('hidden');
    document.getElementById('profile-modal').classList.remove('flex');
};

function selectProfileColor(colorHex) {
    document.querySelectorAll('.profile-color-dot').forEach(el => {
        el.classList.remove('border-white', 'scale-110');
        el.innerHTML = '';
    });

    const target = Array.from(document.querySelectorAll('.profile-color-dot')).find(el => el.getAttribute('data-color') === colorHex);
    if (target) {
        target.classList.add('border-white', 'scale-110');
        target.innerHTML = '<i class="fa-solid fa-check text-xs text-white absolute inset-0 m-auto flex items-center justify-center"></i>';
    }
    document.getElementById('profile-color-picker').value = colorHex;
    window.tempProfileColor = colorHex;
}
window.selectProfileColor = selectProfileColor;

window.saveProfile = function() {
    const nickname = document.getElementById('profile-nickname-input').value.trim();
    if (!nickname) return;

    localUser.name = nickname;
    localUser.color = window.tempProfileColor || localUser.color;

    localStorage.setItem('caderno_user_name', localUser.name);
    localStorage.setItem('caderno_user_color', localUser.color);

    closeProfileModal();
    if (window.renderPresenceList) window.renderPresenceList();
    if (window.renderRemoteCursors) window.renderRemoteCursors();
    
    if (myPeer && !myPeer.destroyed) {
        broadcastMessageToPeers({
            type: 'PRESENCE',
            name: localUser.name,
            color: localUser.color,
            isTyping: localUser.isTyping,
            activeNoteKey: window.activeNoteKey,
            cursorPos: localUser.cursorPos
        });
    }

    showToast(i18n[currentLang].toastProfileUpdated, "success");
};

function triggerAutocompleteCheck(textarea) {
    const text = textarea.value;
    const caretPos = textarea.selectionStart;
    
    const textBeforeCaret = text.substring(0, caretPos);
    const atIndex = textBeforeCaret.lastIndexOf('@');
    
    if (atIndex !== -1 && atIndex >= textBeforeCaret.lastIndexOf(' ') && atIndex >= textBeforeCaret.lastIndexOf('\n')) {
        const query = textBeforeCaret.substring(atIndex + 1);
        window.mentionStartIndex = atIndex;
        showMentionAutocomplete(query, textarea);
    } else {
        hideMentionAutocomplete();
    }
}
window.triggerAutocompleteCheck = triggerAutocompleteCheck;

function showMentionAutocomplete(query, textarea) {
    const menu = document.getElementById('mention-autocomplete');
    menu.innerHTML = '';

    const peers = [
        { id: localUser.id, name: localUser.name + " (Você)", color: localUser.color },
        ...Object.values(remotePeersData).map(p => ({ id: p.id, name: p.name, color: p.color }))
    ];

    const filtered = peers.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

    if (filtered.length === 0) {
        hideMentionAutocomplete();
        return;
    }

    filtered.forEach(p => {
        const item = document.createElement('button');
        item.className = 'w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-obsidian-active hover:text-white flex items-center gap-2 transition-colors';
        const rawName = p.name.replace(" (Você)", "");
        item.innerHTML = `<span class="w-2 h-2 rounded-full" style="background-color: ${p.color}"></span> ${escapeHTML(p.name)}`;
        item.onclick = () => insertMention(p.id, rawName, textarea);
        menu.appendChild(item);
    });

    try {
        const coords = getCaretCoordinates(textarea, window.mentionStartIndex);
        menu.style.top = (coords.top - textarea.scrollTop + coords.height + 15) + 'px';
        menu.style.left = Math.min(textarea.clientWidth - 200, coords.left) + 'px';
        menu.classList.remove('hidden');
    } catch(e) {
        menu.classList.add('hidden');
    }
}

function hideMentionAutocomplete() {
    const el = document.getElementById('mention-autocomplete');
    if (el) el.classList.add('hidden');
    window.mentionStartIndex = -1;
}
window.hideMentionAutocomplete = hideMentionAutocomplete;

function insertMention(peerId, peerName, textarea) {
    const text = textarea.value;
    const caretPos = textarea.selectionStart;
    
    const before = text.substring(0, window.mentionStartIndex);
    const after = text.substring(caretPos);
    
    const mentionToken = `@${peerName}`;
    const newText = before + mentionToken + " " + after;
    
    const oldText = vault[activeNoteKey].content;
    textarea.value = newText;
    vault[activeNoteKey].content = newText;

    if (window.updateBlameTracking) {
        window.updateBlameTracking(activeNoteKey, oldText, newText, {
            id: localUser.id,
            name: localUser.name,
            color: localUser.color
        });
    }

    saveVaultLocalOnly();
    if (window.broadcastNotePatch) {
        window.broadcastNotePatch(activeNoteKey, oldText, newText);
    }

    if (window.renderActiveNote) window.renderActiveNote();
    hideMentionAutocomplete();
    textarea.focus();
    
    const newCursorPos = window.mentionStartIndex + mentionToken.length + 1;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
}

window.handleEditorKeyDown = function(e) {
    const menu = document.getElementById('mention-autocomplete');
    if (menu && !menu.classList.contains('hidden')) {
        if (e.key === 'Escape' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') {
            if (e.key === 'Escape') {
                e.preventDefault();
                hideMentionAutocomplete();
            }
        }
    }
};

window.exportFullVaultBackup = function() {
    const backupPackage = {
        version: "2.0",
        exportedAt: Date.now(),
        vault: vault,
        blameMap: blameMap,
        mentions: userMentions
    };

    try {
        const jsonStr = JSON.stringify(backupPackage, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const dateStr = new Date().toISOString().split('T')[0];
        const tempLink = document.createElement('a');
        tempLink.href = url;
        tempLink.setAttribute('download', `caderno-backup-${dateStr}.json`);
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        URL.revokeObjectURL(url);

        showToast(currentLang === 'pt-br' ? "Backup exportado com sucesso!" : "Full backup exported successfully!", "success");
    } catch(e) {
        console.error("Backup export failed", e);
        showToast(currentLang === 'pt-br' ? "Falha ao exportar backup." : "Backup export failed.", "error");
    }
};

window.importFullVaultBackup = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            
            if (parsed && parsed.vault) {
                vault = parsed.vault;
                if (parsed.blameMap) blameMap = parsed.blameMap;
                if (parsed.mentions) userMentions = parsed.mentions;

                const keys = Object.keys(vault);
                if (keys.length > 0) {
                    activeNoteKey = keys[0];
                }

                saveVaultLocalOnly();
                
                if (window.triggerP2PVaultStructureUpdate) {
                    window.triggerP2PVaultStructureUpdate();
                }

                if (window.renderVaultList) window.renderVaultList();
                if (window.loadActiveNote) window.loadActiveNote();
                updateMentionsUI();

                showToast(currentLang === 'pt-br' ? "Caderno restaurado com sucesso!" : "Caderno restored successfully!", "success");
            } else {
                showToast(currentLang === 'pt-br' ? "Arquivo de backup inválido." : "Invalid backup file structure.", "error");
            }
        } catch(err) {
            console.error("Backup import error", err);
            showToast(currentLang === 'pt-br' ? "Erro ao decodificar arquivo JSON." : "Error decoding JSON backup file.", "error");
        }
        event.target.value = "";
    };
    reader.readAsText(file);
};

window.reportCursorMove = function() {
    const textarea = document.getElementById('markdown-textarea');
    if (!textarea || document.activeElement !== textarea) return;
    const pos = textarea.selectionStart;
    
    if (localUser.cursorPos !== pos) {
        localUser.cursorPos = pos;
        
        if (window.renderRemoteCursors) window.renderRemoteCursors();
        if (window.updateEditorOverlays) window.updateEditorOverlays();
        
        if (window.cursorMoveTimeout) clearTimeout(window.cursorMoveTimeout);
        window.cursorMoveTimeout = setTimeout(() => {
            if (!myPeer || myPeer.destroyed) return;
            broadcastMessageToPeers({
                type: 'CURSOR_MOVE',
                peerId: myPeer.id,
                pos: pos,
                noteKey: window.activeNoteKey
            });
        }, 100);
    }
};

function renderVaultList() {
    const container = document.getElementById('note-list');
    if (!container) return;
    container.innerHTML = '';

    Object.keys(vault).forEach(key => {
        const note = vault[key];
        if (searchFilter && !note.title.toLowerCase().includes(searchFilter.toLowerCase())) return;

        const isActive = key === activeNoteKey;
        const wrapper = document.createElement('div');
        wrapper.className = `group flex items-center justify-between px-2 py-1.5 rounded text-sm cursor-pointer transition-all ${isActive ? 'bg-obsidian-active border-l-2 border-obsidian-accent text-white font-medium' : 'text-gray-400 hover:bg-neutral-800/50 hover:text-white'}`;
        wrapper.setAttribute('data-note-key', key);

        const infoBlock = document.createElement('div');
        infoBlock.className = 'flex items-center gap-2 overflow-hidden flex-1';
        infoBlock.onclick = () => selectNote(key);
        infoBlock.ondblclick = (e) => startInlineRename(e, key);
        infoBlock.innerHTML = `<i class="fa-regular fa-file-lines shrink-0 text-neutral-500"></i><span class="truncate pr-1 text-xs select-none" id="label-${key}">${escapeHTML(note.title)}</span>`;

        const actions = document.createElement('div');
        actions.className = 'opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0';
        actions.innerHTML = `
            <button onclick="downloadNote(event, '${key}')" class="p-1 text-gray-400 hover:text-obsidian-accent hover:bg-neutral-700/50 rounded" title="${i18n[currentLang].downloadTooltip}"><i class="fa-solid fa-download text-[10px]"></i></button>
            <button onclick="startRenameFromIcon(event, '${key}')" class="p-1 text-gray-400 hover:text-obsidian-accent hover:bg-neutral-700/50 rounded" title="${currentLang === 'pt-br' ? 'Renomear Nota' : 'Rename Note'}"><i class="fa-solid fa-pen text-[10px]"></i></button>
            <button onclick="triggerDeleteNote(event, '${key}')" class="p-1 text-gray-400 hover:text-red-400 hover:bg-neutral-700/50 rounded" title="${currentLang === 'pt-br' ? 'Excluir Nota' : 'Delete Note'}"><i class="fa-solid fa-trash-can text-[10px]"></i></button>
        `;

        wrapper.appendChild(infoBlock);
        wrapper.appendChild(actions);
        container.appendChild(wrapper);
    });
    updateGlobalProgressTracker();
}
window.renderVaultList = renderVaultList;

window.handleWikilinkClick = function(noteKey, heading) {
    if (vault[noteKey]) {
        selectNote(noteKey);
        if (heading) {
            setTimeout(() => {
                const lines = vault[noteKey].content.split('\n');
                const h = heading.trim().toLowerCase();
                const idx = lines.findIndex(l => {
                    if (!l.startsWith('#')) return false;
                    return l.replace(/^#+\s+/, '').trim().toLowerCase() === h;
                });
                if (idx !== -1) {
                    if (window.scrollEditorToLine) window.scrollEditorToLine(idx);
                }
            }, 150);
        }
    }
};

function selectNote(key) {
    activeNoteKey = key;
    saveVaultLocalOnly(); 
    renderVaultList();
    if (window.loadActiveNote) window.loadActiveNote();
    
    document.querySelectorAll('[id^="toast-nav-"]').forEach(toast => {
        if (toast.dataset.targetNote === key) toast.remove();
    });
}
window.selectNote = selectNote;

function startInlineRename(event, key) {
    event.stopPropagation();
    const label = document.getElementById(`label-${key}`);
    const originalTitle = vault[key].title;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalTitle;
    input.className = 'bg-obsidian-bg border border-obsidian-accent text-white px-1 py-0.5 rounded outline-none text-xs w-full font-sans';
    
    input.onblur = () => finishInlineRename(key, input.value, originalTitle);
    input.onkeydown = (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = originalTitle; input.blur(); }
    };

    label.replaceWith(input);
    input.focus();
    input.select();
}

function startRenameFromIcon(event, key) {
    event.stopPropagation();
    startInlineRename(event, key);
}

function finishInlineRename(key, newTitle, originalTitle) {
    const cleanedTitle = newTitle.trim() || originalTitle;
    vault[key].title = cleanedTitle;
    
    saveVaultLocalOnly();
    if (window.triggerP2PVaultStructureUpdate) {
        window.triggerP2PVaultStructureUpdate();
    }

    renderVaultList();
    if (activeNoteKey === key && window.loadActiveNote) window.loadActiveNote();
}

function updateWordCount(text) {
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const el = document.getElementById('word-count');
    if (el) el.innerText = `${words} ${i18n[currentLang].wordCount}`;
}
window.updateWordCount = updateWordCount;

function renderOutline(markdownText) {
    const lines = markdownText.split('\n');
    const container = document.getElementById('outline-container');
    if (!container) return;
    container.innerHTML = '';
    let outlineCount = 0;

    lines.forEach((line, index) => {
        let level = 0;
        let text = "";
        if (line.startsWith('# ')) { level = 1; text = line.slice(2); }
        else if (line.startsWith('## ')) { level = 2; text = line.slice(3); }
        else if (line.startsWith('### ')) { level = 3; text = line.slice(4); }
        else if (line.startsWith('#### ')) { level = 4; text = line.slice(5); }

        if (level > 0) {
            outlineCount++;
            const item = document.createElement('div');
            item.className = `cursor-pointer hover:text-white text-obsidian-textMuted transition-colors font-medium hover:underline py-0.5`;
            item.style.paddingLeft = `${(level - 1) * 12}px`;
            item.innerHTML = `<span class="text-obsidian-accent font-mono mr-1">H${level}</span> ${escapeHTML(text)}`;
            item.onclick = function() { if (window.scrollEditorToLine) window.scrollEditorToLine(index); };
            container.appendChild(item);
        }
    });

    if (outlineCount === 0) {
        container.innerHTML = `<p class="text-neutral-500 italic">${i18n[currentLang].noHeadings}</p>`;
    }
}
window.renderOutline = renderOutline;

function updateChecklistProgress(markdownText) {
    let total = 0;
    let checked = 0;

    markdownText.split('\n').forEach(line => {
        if (line.match(/^(\s*)-\s*\[\s*\]/)) total++;
        else if (line.match(/^(\s*)-\s*\[[xX]\]/)) { total++; checked++; }
    });

    const percentage = total > 0 ? Math.round((checked / total) * 100) : 0;
    const bar = document.getElementById('progress-bar-fill');
    const text = document.getElementById('progress-text');
    const header = document.getElementById('file-progress-header');

    if (!bar || !text || !header) return;

    if (total === 0) {
        header.classList.add('hidden');
    } else {
        header.classList.remove('hidden');
        bar.style.width = `${percentage}%`;
        text.innerHTML = currentLang === 'pt-br' 
            ? `<span class="text-white">${checked}</span> de <span class="text-gray-400">${total}</span> objetivos completados (${percentage}%)`
            : `<span class="text-white">${checked}</span> of <span class="text-gray-400">${total}</span> checklist objectives completed (${percentage}%)`;
    }
}
window.updateChecklistProgress = updateChecklistProgress;

function updateGlobalProgressTracker() {
    let grandTotal = 0;
    let grandChecked = 0;
    Object.values(vault).forEach(note => {
        note.content.split('\n').forEach(line => {
            if (line.match(/^(\s*)-\s*\[\s*\]/)) grandTotal++;
            else if (line.match(/^(\s*)-\s*\[[xX]\]/)) { grandTotal++; grandChecked++; }
        });
    });
    const percentage = grandTotal > 0 ? Math.round((grandChecked / grandTotal) * 100) : 0;
    const pctEl = document.getElementById('global-stats-pct');
    const barEl = document.getElementById('global-stats-bar');
    if (pctEl) pctEl.innerText = `${percentage}%`;
    if (barEl) barEl.style.width = `${percentage}%`;
}
window.updateGlobalProgressTracker = updateGlobalProgressTracker;

window.handleSourceInput = function() {
    const textarea = document.getElementById('markdown-textarea');
    const oldText = vault[activeNoteKey].content;
    const newText = textarea.value;
    
    vault[activeNoteKey].content = newText;
    
    if (window.updateBlameTracking) {
        window.updateBlameTracking(activeNoteKey, oldText, newText, {
            id: localUser.id,
            name: localUser.name,
            color: localUser.color
        });
    }

    saveVaultLocalOnly();
    if (window.broadcastNotePatch) {
        window.broadcastNotePatch(activeNoteKey, oldText, newText);
    }

    if (window.renderActiveNote) window.renderActiveNote();
    if (viewMode === 'hybrid' && window.updateEditorOverlays) window.updateEditorOverlays();
    if (window.triggerAutocompleteCheck) window.triggerAutocompleteCheck(textarea);
};

window.handleTitleInput = function() {
    const titleInput = document.getElementById('note-title-input');
    if (!titleInput) return;
    
    const title = titleInput.value.trim();
    if (title) {
        vault[activeNoteKey].title = title;
        if (window.saveVaultStructure) window.saveVaultStructure();
        if (window.renderVaultList) window.renderVaultList();
        
        const breadcrumb = document.getElementById('breadcrumb-filename');
        if (breadcrumb) breadcrumb.innerText = title + ".md";
        
        const tabTitle = document.getElementById('active-tab-title');
        if (tabTitle) tabTitle.innerText = title;
        
        if (viewMode === 'hybrid' && window.updateEditorOverlays) window.updateEditorOverlays();
    }
};

document.addEventListener('change', function(e) {
    if (e.target.classList.contains('obsidian-checkbox')) {
        const lineIndex = parseInt(e.target.getAttribute('data-line-index'));
        const isChecked = e.target.checked;

        const textarea = document.getElementById('markdown-textarea');
        const lines = textarea.value.split('\n');
        const targetLine = lines[lineIndex];

        if (isChecked) {
            lines[lineIndex] = targetLine.replace(/-\s*\[\s*\]/, '- [x]');
        } else {
            lines[lineIndex] = targetLine.replace(/-\s*\[[xX]\]/, '- [ ]');
        }

        const oldText = vault[activeNoteKey].content;
        const updatedContent = lines.join('\n');
        
        textarea.value = updatedContent;
        vault[activeNoteKey].content = updatedContent;

        if (window.updateBlameTracking) {
            window.updateBlameTracking(activeNoteKey, oldText, updatedContent, {
                id: localUser.id,
                name: localUser.name,
                color: localUser.color
            });
        }

        saveVaultLocalOnly();
        if (window.broadcastNotePatch) {
            window.broadcastNotePatch(activeNoteKey, oldText, updatedContent);
        }

        if (window.renderActiveNote) window.renderActiveNote();
        showToast(isChecked ? i18n[currentLang].toastQuestCompleted : i18n[currentLang].toastQuestReset, "success");
    }
});

window.shareSessionLink = function() {
    let roomId = new URLSearchParams(window.location.search).get('room') || (myPeer && myPeer.id);
    if (!roomId) return showToast(currentLang === 'pt-br' ? "Canal P2P não inicializado. Tente novamente em instantes." : "P2P channel not initialized yet. Try again in a moment.", "error");

    const tempInput = document.createElement("input");
    document.body.appendChild(tempInput);
    tempInput.value = window.location.origin + window.location.pathname + "?room=" + roomId;
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);

    showToast(currentLang === 'pt-br' ? "Link de sessão copiado! Envie para seus companheiros." : "Session link copied to clipboard! Share it with your friends.", "success");
};

window.downloadNote = function(event, key) {
    if (event) event.stopPropagation();
    const note = vault[key];
    if (!note) return;

    try {
        const blob = new Blob([note.content], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const tempLink = document.createElement('a');
        tempLink.href = url;
        tempLink.setAttribute('download', `${note.title || 'untitled'}.md`);
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        URL.revokeObjectURL(url);

        showToast(i18n[currentLang].toastDownloaded.replace("{title}", note.title), "success");
    } catch(e) {
        console.error("Markdown file download failed", e);
        showToast(currentLang === 'pt-br' ? "Falha ao baixar a nota." : "Failed to download note.", "error");
    }
};

window.downloadActiveNote = function() {
    if (activeNoteKey) {
        window.downloadNote(null, activeNoteKey);
    }
};

window.triggerDeleteNote = function(event, key) {
    event.stopPropagation();
    deleteCandidateKey = key;
    document.getElementById('delete-modal-note-title').innerText = vault[key].title;
    document.getElementById('delete-modal').classList.remove('hidden');
    document.getElementById('delete-modal').classList.add('flex');
};

window.closeDeleteModal = function() {
    deleteCandidateKey = null;
    document.getElementById('delete-modal').classList.add('hidden');
    document.getElementById('delete-modal').classList.remove('flex');
};

window.executeDeleteNote = function() {
    if (!deleteCandidateKey) return;
    const title = vault[deleteCandidateKey].title;
    delete vault[deleteCandidateKey];
    if (window.blameMap) delete blameMap[deleteCandidateKey];

    if (activeNoteKey === deleteCandidateKey) {
        const keys = Object.keys(vault);
        activeNoteKey = keys.length > 0 ? keys[0] : "";
    }

    closeDeleteModal();
    if (window.saveVaultStructure) window.saveVaultStructure();
    renderVaultList();
    if (window.loadActiveNote) window.loadActiveNote();
    showToast(i18n[currentLang].toastDeleted.replace("{title}", title), "info");
};
