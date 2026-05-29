/* 
    DIFFERENTIAL SYNC & WebRTC ENGINE 
    This part handles the structural patching via DMP and P2P networking with PeerJS.
    RESORED TO PEAK PERFORMANCE FROM index_old.html
*/

// Initialize Global Diff-Match-Patch Instance for differential sync
window.dmp = new diff_match_patch();

// Algorithm to accurately shift a user's cursor dynamically when external patches alter the text
window.adjustCursorPos = function(cursorPos, diffs) {
    let newPos = cursorPos;
    let currentIdx = 0; 

    for (let i = 0; i < diffs.length; i++) {
        const op = diffs[i][0]; // 0: EQUAL, 1: INSERT, -1: DELETE
        const text = diffs[i][1];
        const len = text.length;

        if (op === 0) { 
            currentIdx += len;
            if (currentIdx >= cursorPos) break;
        } else if (op === 1) { 
            if (currentIdx <= cursorPos) {
                newPos += len;
            }
        } else if (op === -1) { 
            if (currentIdx < cursorPos) {
                const overlap = Math.min(len, cursorPos - currentIdx);
                newPos -= overlap;
            }
            currentIdx += len; 
        }
    }
    return newPos;
};

const randomNames = ["Astarion", "Shadowheart", "Gale", "Wyll", "Lae'zel", "Karlach", "Halsin", "Jaheira", "Minsc", "Minthara", "Volo", "Elminster", "Scratch", "Withers"];
const randomColors = ["#a855f7", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#84cc16", "#14b8a6"];

// 1. Permanent Peer ID & Profile Persistence Strategy
let persistedPeerId = localStorage.getItem('caderno_peer_id');
if (!persistedPeerId) {
    // Generate robust collision-free long peer ID signature for identification stability
    persistedPeerId = 'peer_' + Math.random().toString(36).substring(2, 9) + '_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('caderno_peer_id', persistedPeerId);
}

let persistedName = localStorage.getItem('caderno_user_name');
if (!persistedName) {
    persistedName = randomNames[Math.floor(Math.random() * randomNames.length)] + " " + Math.floor(100 + Math.random() * 900);
    localStorage.setItem('caderno_user_name', persistedName);
}

let persistedColor = localStorage.getItem('caderno_user_color');
if (!persistedColor) {
    persistedColor = randomColors[Math.floor(Math.random() * randomColors.length)];
    localStorage.setItem('caderno_user_color', persistedColor);
}

var localUser = {
    id: persistedPeerId,
    name: persistedName,
    color: persistedColor,
    isTyping: false,
    activeNoteKey: "",
    cursorPos: 0,
    mouseX: 0,
    mouseY: 0
};

let myPeer = null;
let connections = []; 
let remotePeersData = {}; 
var ownCursorFlagEnabled = false; 

// Standardized STUN servers to guarantee robust firewall hole-punching for WebRTC connections
const peerConfig = {
    config: {
        'iceServers': [
            { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
        ]
    }
};

function encodePayload(payload) {
    try {
        const jsonStr = JSON.stringify(payload);
        const utf8Bytes = new TextEncoder().encode(jsonStr);
        let binString = "";
        const len = utf8Bytes.length;
        for (let i = 0; i < len; i++) {
            binString += String.fromCharCode(utf8Bytes[i]);
        }
        return btoa(binString);
    } catch (err) {
        console.error("Payload encoding error:", err);
        return null;
    }
}

function decodePayload(b64) {
    try {
        const binString = atob(b64);
        const len = binString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binString.charCodeAt(i);
        }
        const jsonStr = new TextDecoder().decode(bytes);
        return JSON.parse(jsonStr);
    } catch (err) {
        console.error("Payload decoding error:", err);
        return null;
    }
}

window.initP2PEngine = function() {
    const params = new URLSearchParams(window.location.search || window.location.hash.substring(1));
    let roomId = params.get('room');
    
    // Clean trailing slashes from copy-pasting errors
    if (roomId) roomId = roomId.trim().replace(/\/$/, '');

    if (!roomId) {
        setupHostPeer();
    } else {
        setupClientPeer(roomId);
    }
};

function setupHostPeer() {
    myPeer = new Peer(localUser.id, peerConfig);
    myPeer.on('open', (id) => {
        const baseUrl = window.location.origin + window.location.pathname;
        window.history.replaceState(null, '', `?room=${id}`);
        updateP2PStatusIndicator(true, currentLang === 'pt-br' ? "Hospedeiro: Aguardando Pares" : "Host: Awaiting Peers");
        setupPresenceHeartbeat();
    });
    myPeer.on('connection', handleNewConnection);
    myPeer.on('error', (err) => {
        console.warn("Host engine setup error:", err);
        if (err.type === 'unavailable-id') {
            localStorage.removeItem('caderno_peer_id');
            localUser.id = 'peer_' + Math.random().toString(36).substring(2, 9) + '_' + Math.random().toString(36).substring(2, 9);
            localStorage.setItem('caderno_peer_id', localUser.id);
            setTimeout(setupHostPeer, 500);
        } else {
            if (window.showToast) window.showToast(i18n[currentLang].toastP2PError, "error");
        }
    });
}

function setupClientPeer(targetRoomId) {
    myPeer = new Peer(localUser.id, peerConfig);
    myPeer.on('open', (id) => {
        updateP2PStatusIndicator(true, currentLang === 'pt-br' ? "Conectando ao Hospedeiro..." : "Connecting to Host...");
        const conn = myPeer.connect(targetRoomId, { reliable: true });
        handleNewConnection(conn);
        setupPresenceHeartbeat();
    });
    
    myPeer.on('connection', handleNewConnection);

    myPeer.on('error', (err) => {
        console.error("PeerJS Connection Error:", err);
        if (err.type === 'unavailable-id') {
            localStorage.removeItem('caderno_peer_id');
            localUser.id = 'peer_' + Math.random().toString(36).substring(2, 9) + '_' + Math.random().toString(36).substring(2, 9);
            localStorage.setItem('caderno_peer_id', localUser.id);
            setTimeout(() => setupClientPeer(targetRoomId), 500);
            return;
        }
        
        if (window.showToast) window.showToast(i18n[currentLang].toastP2PReachHostError, "error");
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);
        updateP2PStatusIndicator(false);
        
        if (err.type === 'peer-unavailable' || err.type === 'network') {
            setTimeout(() => {
                if (!myPeer.destroyed) myPeer.destroy();
                setupHostPeer();
            }, 500);
        }
    });
}

function handleNewConnection(conn) {
    const onConnectionOpen = () => {
        if (connections.includes(conn)) return;
        connections.push(conn);
        const labelStatus = currentLang === 'pt-br' ? `${connections.length} Par(es) Ativo(s)` : `${connections.length} Peer(s) Active`;
        updateP2PStatusIndicator(true, labelStatus);
        if (window.showToast) window.showToast(i18n[currentLang].toastCollabConnected, "success");

        const params = new URLSearchParams(window.location.search || window.location.hash.substring(1));
        const isHost = !params.get('room') || myPeer.id === params.get('room');
        
        if (isHost) {
            const syncObj = {
                type: 'INITIAL_SYNC',
                vault: window.vault,
                activeNoteKey: window.activeNoteKey,
                blameMap: window.blameMap,
                mentions: window.userMentions
            };
            const safePayload = encodePayload(syncObj);
            if (safePayload) conn.send({ __safe_payload: safePayload });
        }
    };

    if (conn.open) {
        onConnectionOpen();
    } else {
        conn.on('open', onConnectionOpen);
    }

    conn.on('data', (data) => {
        let msg = data && data.__safe_payload ? decodePayload(data.__safe_payload) : data;
        handleIncomingMessage(msg, conn);
    });
    
    conn.on('error', (err) => console.error("Peer connection error:", err));

    conn.on('close', () => {
        connections = connections.filter(c => c !== conn);
        if (conn.peer) {
            delete remotePeersData[conn.peer];
            renderPresenceList();
            renderRemoteCursors();
            if(window.renderRemoteMice) window.renderRemoteMice();
        }
        const status = connections.length > 0 ? 
            (currentLang === 'pt-br' ? `${connections.length} Par(es) Ativo(s)` : `${connections.length} Peer(s) Active`) : 
            (currentLang === 'pt-br' ? "Aguardando Pares" : "Awaiting Peers");
        updateP2PStatusIndicator(connections.length > 0, status);
        if (window.showToast) window.showToast(i18n[currentLang].toastCollabDisconnected, "info");
    });
}

function handleIncomingMessage(msg, senderConn) {
    if (!msg || !msg.type) return;

    switch(msg.type) {
        case 'INITIAL_SYNC':
            if (msg.vault) {
                window.vault = msg.vault;
                if (msg.activeNoteKey) window.activeNoteKey = msg.activeNoteKey;
                if (msg.blameMap) window.blameMap = msg.blameMap;
                if (msg.mentions) window.userMentions = msg.mentions;
                window.saveVaultLocalOnly();
                window.renderVaultList();
                window.loadActiveNote();
                if (window.updateMentionsUI) window.updateMentionsUI();
                if (window.showToast) window.showToast(i18n[currentLang].toastSyncHost, "success");
            }
            break;

        case 'VAULT_UPDATE':
            if (msg.vault) {
                window.vault = msg.vault;
                if (msg.activeNoteKey && !window.vault[window.activeNoteKey]) {
                    window.activeNoteKey = msg.activeNoteKey;
                }
                if (msg.blameMap) window.blameMap = msg.blameMap;
                window.saveVaultLocalOnly();
                window.renderVaultList();
                window.loadActiveNote();
            }
            break;

        case 'NOTE_PATCH':
            if (window.vault[msg.noteKey]) {
                const currentText = window.vault[msg.noteKey].content;
                const [patchedText, results] = window.dmp.patch_apply(msg.patches, currentText);
                window.vault[msg.noteKey].content = patchedText;

                if (msg.authorId && msg.authorColor && msg.authorName) {
                    window.updateBlameTracking(msg.noteKey, currentText, patchedText, {
                        id: msg.authorId,
                        color: msg.authorColor,
                        name: msg.authorName
                    });
                }

                if (window.scanForMentions) window.scanForMentions(patchedText, msg.noteKey, msg.authorName || 'Um colaborador');

                window.saveVaultLocalOnly();

                if (window.activeNoteKey === msg.noteKey) {
                    const textarea = document.getElementById("markdown-textarea");
                    const focusActive = document.activeElement === textarea;
                    const startSelection = textarea ? textarea.selectionStart : 0;
                    const endSelection = textarea ? textarea.selectionEnd : 0;

                    const diffs = window.dmp.diff_main(currentText, patchedText);
                    window.dmp.diff_cleanupSemantic(diffs);

                    const newStart = window.adjustCursorPos(startSelection, diffs);
                    const newEnd = window.adjustCursorPos(endSelection, diffs);

                    if (textarea) textarea.value = patchedText;
                    window.renderActiveNote();

                    if (focusActive && textarea) {
                        textarea.focus();
                        try { textarea.setSelectionRange(newStart, newEnd); } catch(e){}
                        if (window.reportCursorMove) window.reportCursorMove();
                    }
                } else {
                    if (window.updateGlobalProgressTracker) window.updateGlobalProgressTracker();
                    window.renderVaultList();
                }
            }
            break;

        case 'PRESENCE':
            if (senderConn.peer) {
                const p = remotePeersData[senderConn.peer];
                const newNote = msg.activeNoteKey || window.activeNoteKey;
                
                if (p && p.activeNote && p.activeNote !== newNote) {
                    if (newNote === window.activeNoteKey) {
                        const existingToast = document.getElementById(`toast-nav-${senderConn.peer}`);
                        if (existingToast) existingToast.remove();
                    } else if (vault[newNote]) {
                        if (window.showNavigationToast) window.showNavigationToast(senderConn.peer, msg.name, newNote);
                    }
                }

                remotePeersData[senderConn.peer] = {
                    id: senderConn.peer,
                    name: msg.name,
                    color: msg.color,
                    isTyping: msg.isTyping,
                    activeNote: newNote, 
                    cursorPos: msg.cursorPos !== undefined ? msg.cursorPos : p?.cursorPos,
                    mouseX: msg.mouseX !== undefined ? msg.mouseX : p?.mouseX,
                    mouseY: msg.mouseY !== undefined ? msg.mouseY : p?.mouseY,
                    timestamp: Date.now()
                };
                renderPresenceList();
                renderRemoteCursors();
                if (window.renderRemoteMice) window.renderRemoteMice();
            }
            break;

        case 'CURSOR_MOVE':
            if (senderConn.peer && remotePeersData[senderConn.peer]) {
                const p = remotePeersData[senderConn.peer];
                const newNote = msg.noteKey;
                
                if (p.activeNote && p.activeNote !== newNote) {
                    if (newNote === window.activeNoteKey) {
                        const existingToast = document.getElementById(`toast-nav-${senderConn.peer}`);
                        if (existingToast) existingToast.remove();
                    } else if (vault[newNote]) {
                        if (window.showNavigationToast) window.showNavigationToast(senderConn.peer, p.name, newNote);
                    }
                }
                
                p.cursorPos = msg.pos;
                p.activeNote = newNote;
                p.timestamp = Date.now();
                renderRemoteCursors();
            }
            break;
            
        case 'MOUSE_MOVE':
            if (senderConn.peer && remotePeersData[senderConn.peer]) {
                const p = remotePeersData[senderConn.peer];
                p.mouseX = msg.x;
                p.mouseY = msg.y;
                p.timestamp = Date.now();
                if (window.renderRemoteMice) window.renderRemoteMice();
            }
            break;
    }

    const params = new URLSearchParams(window.location.search || window.location.hash.substring(1));
    const isHost = !params.get('room') || myPeer.id === params.get('room');
    if (isHost && msg.type !== 'PRESENCE' && msg.type !== 'CURSOR_MOVE' && msg.type !== 'MOUSE_MOVE') {
        broadcastMessageToPeers(msg, senderConn);
    }
}

function broadcastMessageToPeers(msg, excludeConn = null) {
    const safePayload = encodePayload(msg);
    if (!safePayload) return;
    connections.forEach(conn => {
        if (conn !== excludeConn && conn.open) {
            conn.send({ __safe_payload: safePayload });
        }
    });
}

function setupPresenceHeartbeat() {
    setInterval(() => {
        if (!myPeer || myPeer.destroyed) return;
        broadcastMessageToPeers({
            type: 'PRESENCE',
            name: localUser.name,
            color: localUser.color,
            isTyping: localUser.isTyping,
            activeNoteKey: window.activeNoteKey,
            cursorPos: localUser.cursorPos,
            mouseX: localUser.mouseX,
            mouseY: localUser.mouseY
        });

        const now = Date.now();
        let dirty = false;
        Object.keys(remotePeersData).forEach(peerId => {
            if (now - remotePeersData[peerId].timestamp > 25000) {
                delete remotePeersData[peerId];
                dirty = true;
            }
        });
        if (dirty) {
            renderPresenceList();
            renderRemoteCursors();
            if(window.renderRemoteMice) window.renderRemoteMice();
        }
    }, 5000);
}

/* Real-time Global Mouse Movement tracking Engine */
let mouseMoveTimeout;
let lastMousePos = { x: 0, y: 0 };

document.addEventListener('mousemove', (e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    
    if (Math.abs(lastMousePos.x - x) > 0.005 || Math.abs(lastMousePos.y - y) > 0.005) {
        lastMousePos = { x, y };
        localUser.mouseX = x;
        localUser.mouseY = y;
        
        if (!mouseMoveTimeout) {
            mouseMoveTimeout = setTimeout(() => {
                if (myPeer && !myPeer.destroyed && connections.length > 0) {
                    broadcastMessageToPeers({
                        type: 'MOUSE_MOVE',
                        peerId: myPeer.id,
                        x: x,
                        y: y
                    });
                }
                mouseMoveTimeout = null;
            }, 50); // 20 FPS throttling for performance
        }
    }
});

window.renderRemoteMice = function() {
    let layer = document.getElementById('mouse-cursors-layer');
    if (!layer) return;
    
    layer.innerHTML = '';
    
    Object.keys(remotePeersData).forEach(peerId => {
        const p = remotePeersData[peerId];
        // Only render mouse if peer is in the same note
        if (p.activeNote === window.activeNoteKey && p.mouseX !== undefined && p.mouseY !== undefined) {
            const x = p.mouseX * window.innerWidth;
            const y = p.mouseY * window.innerHeight;
            
            const mouseEl = document.createElement('div');
            mouseEl.className = 'absolute transition-all duration-75 ease-linear flex flex-col items-start';
            mouseEl.style.transform = `translate(${x}px, ${y}px)`;
            
            const arrow = `<svg width="14" height="14" viewBox="0 0 24 24" fill="${p.color}" stroke="white" stroke-width="2">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
            </svg>`;
            
            const initial = p.name ? p.name.substring(0, 2).toUpperCase() : '??';
            const badge = `<div class="mt-1 ml-3 flex items-center bg-obsidian-sidebar border-2 shadow-lg rounded-full px-1.5 py-0.5" style="border-color: ${p.color}">
                <div class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style="background-color: ${p.color}">${initial}</div>
                <span class="ml-1.5 text-[10px] font-bold text-white pr-1">${escapeHTML(p.name.split(' ')[0])}</span>
            </div>`;
            
            mouseEl.innerHTML = arrow + badge;
            layer.appendChild(mouseEl);
        }
    });
};

let cursorMoveTimeout;
window.reportCursorMove = function() {
    const textarea = document.getElementById('markdown-textarea');
    if (!textarea || document.activeElement !== textarea) return;
    const pos = textarea.selectionStart;
    
    if (localUser.cursorPos !== pos) {
        localUser.cursorPos = pos;
        
        // Immediately refresh local cursors and overlays
        if (window.renderRemoteCursors) window.renderRemoteCursors();
        if (window.updateEditorOverlays) window.updateEditorOverlays();
        
        clearTimeout(cursorMoveTimeout);
        cursorMoveTimeout = setTimeout(() => {
            if (!myPeer || myPeer.destroyed) return;
            broadcastMessageToPeers({
                type: 'CURSOR_MOVE',
                peerId: myPeer.id,
                pos: pos,
                noteKey: window.activeNoteKey
            });
        }, 40);
    }
};

window.renderRemoteCursors = function() {
    const editorContainer = document.getElementById('editor-cursors-layer');
    const previewContainer = document.getElementById('rendered-preview');
    const textarea = document.getElementById('markdown-textarea');
    if (!editorContainer || !textarea || !previewContainer) return;

    editorContainer.innerHTML = '';
    document.querySelectorAll('.preview-remote-cursor').forEach(el => el.remove());

    // Local user cursor feature properly fixed
    if (ownCursorFlagEnabled && document.activeElement === textarea) {
        try {
            const coords = getCaretCoordinates(textarea, localUser.cursorPos);
            const cursorEl = document.createElement('div');
            cursorEl.className = 'remote-cursor shadow-sm';
            cursorEl.style.backgroundColor = localUser.color;
            cursorEl.style.height = coords.height + 'px';
            
            // Adjust for scroll and portal shift
            const textareaTop = parseFloat(textarea.style.top) || 0;
            cursorEl.style.top = (coords.top + textareaTop - textarea.scrollTop) + 'px';
            cursorEl.style.left = coords.left + 'px';

            const flagEl = document.createElement('div');
            flagEl.className = 'remote-cursor-flag';
            flagEl.style.backgroundColor = localUser.color;
            flagEl.innerText = localUser.name.split(' ')[0] + (currentLang === 'pt-br' ? " (Você)" : " (You)");
            
            cursorEl.appendChild(flagEl);
            editorContainer.appendChild(cursorEl);
        } catch(e) {}
    }

    Object.keys(remotePeersData).forEach(peerId => {
        const p = remotePeersData[peerId];
        if (p.activeNote === activeNoteKey && p.cursorPos !== undefined) {
            
            try {
                const coords = getCaretCoordinates(textarea, p.cursorPos);
                const cursorEl = document.createElement('div');
                cursorEl.className = 'remote-cursor shadow-sm';
                cursorEl.style.backgroundColor = p.color;
                cursorEl.style.height = coords.height + 'px';
                
                const textareaTop = parseFloat(textarea.style.top) || 0;
                cursorEl.style.top = (coords.top + textareaTop - textarea.scrollTop) + 'px';
                cursorEl.style.left = coords.left + 'px';

                const flagEl = document.createElement('div');
                flagEl.className = 'remote-cursor-flag';
                flagEl.style.backgroundColor = p.color;
                flagEl.innerText = p.name.split(' ')[0]; 
                
                cursorEl.appendChild(flagEl);
                editorContainer.appendChild(cursorEl);
            } catch(e) {}

            try {
                const content = window.vault[activeNoteKey].content;
                let lineIndex = (content.substring(0, p.cursorPos).match(/\n/g) || []).length;
                
                let targetEl = previewContainer.querySelector(`[data-line-index="${lineIndex}"]`);
                if (!targetEl) {
                    for (let i = lineIndex; i >= 0; i--) {
                        targetEl = previewContainer.querySelector(`[data-line-index="${i}"]`);
                        if (targetEl) break;
                    }
                }

                if (targetEl) {
                    targetEl.classList.add('relative');
                    const indicator = document.createElement('div');
                    indicator.className = 'preview-remote-cursor absolute flex items-center justify-center text-[9px] font-bold text-white rounded shadow-md z-10 border border-obsidian-bg';
                    indicator.style.backgroundColor = p.color;
                    indicator.style.padding = '2px 6px';
                    indicator.style.top = '-6px';
                    indicator.style.right = '100%';
                    indicator.style.marginRight = '12px';
                    indicator.innerText = p.name.split(' ')[0];
                    indicator.title = p.name + " is editing here";
                    
                    targetEl.appendChild(indicator);
                }
            } catch(e) {}
        }
    });
};

function renderPresenceList() {
    const avatarContainer = document.getElementById("presence-avatars");
    const typingNotification = document.getElementById("typing-notification");
    const typingText = document.getElementById("typing-notification-text");
    if (!avatarContainer) return;

    avatarContainer.innerHTML = '';
    let typingNames = [];

    const localDiv = document.createElement("div");
    localDiv.className = `w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-obsidian-sidebar shrink-0 cursor-help`;
    localDiv.style.backgroundColor = localUser.color;
    localDiv.title = `${localUser.name} (${currentLang === 'pt-br' ? 'Você' : 'You'}) - ${currentLang === 'pt-br' ? 'Editando' : 'Editing'}: ${window.vault[window.activeNoteKey]?.title}`;
    localDiv.innerText = localUser.name.slice(0, 2).toUpperCase();
    avatarContainer.appendChild(localDiv);

    Object.keys(remotePeersData).forEach(peerId => {
        const p = remotePeersData[peerId];
        const div = document.createElement("div");
        div.className = `w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-obsidian-sidebar shrink-0 cursor-help`;
        div.style.backgroundColor = p.color;
        
        const noteName = window.vault[p.activeNote]?.title || "Unknown File";
        div.title = `${p.name} - ${currentLang === 'pt-br' ? 'Editando' : 'Editing'}: ${noteName}`;
        div.innerText = p.name.slice(0, 2).toUpperCase();
        avatarContainer.appendChild(div);

        if (p.isTyping) typingNames.push(p.name);
    });

    if (typingNotification && typingText) {
        if (typingNames.length > 0) {
            typingNotification.classList.remove("hidden");
            typingText.innerText = `${typingNames.join(', ')} ${currentLang === 'pt-br' ? 'escrevendo...' : 'typing...'}`;
        } else {
            typingNotification.classList.add("hidden");
        }
    }
}

function updateP2PStatusIndicator(active, statusText = "Ready") {
    const badge = document.getElementById("connection-mode-badge");
    const indicatorText = document.getElementById("collab-status-text");

    if (active) {
        if (badge) {
            badge.innerText = i18n[currentLang].p2pMode;
            badge.className = "px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-semibold text-[10px] border border-emerald-800/40";
        }
        if (indicatorText) {
            indicatorText.innerText = statusText;
            indicatorText.classList.remove("hidden");
        }
    } else {
        if (badge) {
            badge.innerText = i18n[currentLang].localMode;
            badge.className = "px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-semibold text-[10px]";
        }
        if (indicatorText) indicatorText.classList.add("hidden");
    }
}
