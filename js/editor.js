function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderMarkdown(markdownText) {
    if (!markdownText) return `<p class="text-neutral-500 italic">${i18n[currentLang].noContent}</p>`;
    
    const lines = markdownText.split('\n');
    let html = '';
    let inCodeBlock = false;
    let codeBlockContent = '';
    let codeBlockStartLine = 0;

    let charIndex = 0;
    const currentBlame = blameMap[activeNoteKey] || [];

    function getHTMLWithBlame(text, startOffset) {
        if (!blameModeEnabled || currentBlame.length === 0) {
            return parseInlineElements(text);
        }

        let textLen = text.length;
        let processed = 0;
        let resultHTML = '';

        let accumulated = 0;
        let blameIdx = 0;

        while (blameIdx < currentBlame.length && accumulated + currentBlame[blameIdx].length <= startOffset) {
            accumulated += currentBlame[blameIdx].length;
            blameIdx++;
        }

        while (processed < textLen && blameIdx < currentBlame.length) {
            const seg = currentBlame[blameIdx];
            const segStartInText = Math.max(0, accumulated - startOffset);
            const segEndInText = Math.min(textLen, accumulated + seg.length - startOffset);
            const lenInSegment = segEndInText - segStartInText;

            if (lenInSegment > 0) {
                const subText = text.substring(processed, processed + lenInSegment);
                const safeSub = parseInlineElements(subText);
                
                const hexColor = seg.color;
                let r = 100, g = 100, b = 100;
                if (hexColor.startsWith('#')) {
                    const num = parseInt(hexColor.slice(1), 16);
                    r = (num >> 16) & 255;
                    g = (num >> 8) & 255;
                    b = num & 255;
                }

                resultHTML += `<span class="blame-highlight" style="background-color: rgba(${r}, ${g}, ${b}, 0.22);" title="Modificado por: ${seg.name}">${safeSub}</span>`;
                processed += lenInSegment;
            }

            accumulated += seg.length;
            blameIdx++;
        }

        if (processed < textLen) {
            resultHTML += parseInlineElements(text.substring(processed));
        }

        return resultHTML;
    }

    lines.forEach((line, index) => {
        const lineLengthIncludingNewline = line.length + 1;
        let lineHTML = '';

        if (line.trim().startsWith('```')) {
            if (inCodeBlock) {
                lineHTML = `<pre class="bg-neutral-900 border border-neutral-800 p-3 rounded-lg my-2 font-mono text-xs overflow-x-auto text-purple-300"><code>${escapeHTML(codeBlockContent)}</code></pre>`;
                codeBlockContent = '';
                inCodeBlock = false;
            } else {
                inCodeBlock = true;
                codeBlockStartLine = index;
            }
        } else if (inCodeBlock) {
            codeBlockContent += line + '\n';
        } else if (line.trim() === '---') {
            lineHTML = `<hr class="border-obsidian-border my-5" />`;
        } else if (line.startsWith('# ')) {
            lineHTML = `<h1 id="heading-${index}" class="text-white hover:text-obsidian-accent cursor-pointer transition-colors font-sans" onclick="scrollEditorToLine(${index})">${getHTMLWithBlame(line.slice(2), charIndex + 2)}</h1>`;
        } else if (line.startsWith('## ')) {
            lineHTML = `<h2 id="heading-${index}" class="text-white hover:text-obsidian-accent cursor-pointer transition-colors font-sans" onclick="scrollEditorToLine(${index})">${getHTMLWithBlame(line.slice(3), charIndex + 3)}</h2>`;
        } else if (line.startsWith('### ')) {
            lineHTML = `<h3 id="heading-${index}" class="text-white hover:text-obsidian-accent cursor-pointer transition-colors font-sans" onclick="scrollEditorToLine(${index})">${getHTMLWithBlame(line.slice(4), charIndex + 4)}</h3>`;
        } else if (line.startsWith('#### ')) {
            lineHTML = `<h4 id="heading-${index}" class="text-white hover:text-obsidian-accent cursor-pointer transition-colors font-sans" onclick="scrollEditorToLine(${index})">${getHTMLWithBlame(line.slice(5), charIndex + 5)}</h4>`;
        } else {
            const checkboxRegex = /^(\s*)-\s*\[([ xX])\]\s*(.*)$/;
            const checkboxMatch = line.match(checkboxRegex);
            if (checkboxMatch) {
                const spaces = checkboxMatch[1].length;
                const isChecked = checkboxMatch[2].toLowerCase() === 'x';
                const offsetStart = charIndex + spaces + 5;
                const mainTextWithBlame = getHTMLWithBlame(checkboxMatch[3], offsetStart);
                const paddingLeft = spaces * 8; 

                lineHTML = `
                <div class="task-item flex items-start gap-2.5 py-1 px-1.5 rounded-md hover:bg-neutral-800/30 transition-all font-sans" style="margin-left: ${paddingLeft}px">
                    <input type="checkbox" ${isChecked ? 'checked' : ''} data-line-index="${index}" class="obsidian-checkbox mt-1 flex-shrink-0">
                    <span class="text-gray-300 ${isChecked ? 'line-through text-neutral-500' : ''} text-sm leading-relaxed">${mainTextWithBlame}</span>
                </div>`;
            } else {
                const bulletRegex = /^(\s*)-\s*(.*)$/;
                const bulletMatch = line.match(bulletRegex);
                if (bulletMatch) {
                    const spaces = bulletMatch[1].length;
                    const offsetStart = charIndex + spaces + 2;
                    const mainTextWithBlame = getHTMLWithBlame(bulletMatch[2], offsetStart);
                    const paddingLeft = spaces * 8;

                    lineHTML = `
                    <div class="bullet-item flex items-start gap-2.5 py-0.5 font-sans" style="margin-left: ${paddingLeft}px">
                        <span class="text-obsidian-accent select-none mt-2 w-1.5 h-1.5 rounded-full bg-obsidian-accent flex-shrink-0"></span>
                        <span class="text-gray-300 text-sm leading-relaxed">${mainTextWithBlame}</span>
                    </div>`;
                } else if (line.trim() === '') {
                    lineHTML = `<div class="h-2"></div>`;
                } else {
                    lineHTML = `<p class="text-sm my-1 font-sans">${getHTMLWithBlame(line, charIndex)}</p>`;
                }
            }
        }

        if (lineHTML) {
            html += `<div data-line-index="${index}" class="rendered-line-block">${lineHTML}</div>`;
        }
        
        charIndex += lineLengthIncludingNewline;
    });

    return html;
}

function parseInlineElements(text) {
    let parsed = escapeHTML(text);
    
    const spoilerTitle = currentLang === 'pt-br' ? 'Spoiler: Clique para revelar' : 'Spoiler: Click to reveal';
    parsed = parsed.replace(/\|\|(.*?)\|\|/g, `<span class="markdown-spoiler" onclick="this.classList.toggle('revealed')" title="${spoilerTitle}">$1</span>`);

    // Obsidian Wikilinks [[Note#Heading|Alias]]
    parsed = parsed.replace(/\[\[((?:[^\]#|]*))(?:#([^\]|]*))?(?:\|([^\]]*))?\]\]/g, (match, noteName, heading, alias) => {
        const display = alias || (noteName + (heading ? '#' + heading : ''));
        const targetNoteKey = noteName.trim() ? findNoteKeyByTitle(noteName.trim()) : activeNoteKey;
        
        if (targetNoteKey) {
            return `<a href="javascript:void(0)" onclick="handleWikilinkClick('${targetNoteKey}', '${escapeHTML(heading || '')}')" class="text-obsidian-accent hover:underline font-semibold wikilink">${escapeHTML(display)}</a>`;
        } else {
            return `<span class="wikilink-broken text-red-400/80 italic" title="${currentLang === 'pt-br' ? 'Nota não encontrada' : 'Note not found'}">${escapeHTML(display)}</span>`;
        }
    });

    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
    parsed = parsed.replace(/__(.*?)__/g, '<strong class="font-bold text-white">$1</strong>');
    parsed = parsed.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    parsed = parsed.replace(/_(.*?)_/g, '<em class="italic">$1</em>');
    parsed = parsed.replace(/==(.*?)==/g, '<mark class="bg-purple-900/40 text-purple-300 border border-purple-800/40 px-1 py-0.5 rounded text-xs font-semibold">$1</mark>');
    parsed = parsed.replace(/`(.*?)`/g, '<code class="bg-neutral-800 border border-neutral-700 px-1.5 py-0.5 rounded font-mono text-xs text-purple-300">$1</code>');
    parsed = parsed.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-purple-400 hover:text-purple-300 font-semibold underline inline-flex items-center gap-1">$1 <i class="fa-solid fa-external-link text-[10px] opacity-70"></i></a>');
    
    // Render native @Name Mentions cleanly 
    parsed = parsed.replace(/@([A-Za-z0-9_À-ÿ]+(?: [A-Za-z0-9_À-ÿ]+)?)/g, (match, name) => {
        let color = 'var(--accent-color)';
        const peers = [localUser, ...Object.values(remotePeersData)];
        const found = peers.find(p => p.name === name);
        if (found) color = found.color;
        
        return `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-obsidian-active text-white border-l-2 shadow-sm" style="border-color: ${color}">${escapeHTML(match)}</span>`;
    });

    return parsed;
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}

function loadActiveNote() {
    const note = vault[activeNoteKey];
    if (!note) return;

    document.getElementById('breadcrumb-filename').innerText = note.title + ".md";
    document.getElementById('active-tab-title').innerText = note.title;
    document.getElementById('note-title-input').value = note.title;

    const textarea = document.getElementById('markdown-textarea');
    textarea.value = note.content;

    renderActiveNote();
}
window.loadActiveNote = loadActiveNote;

function renderActiveNote() {
    const note = vault[activeNoteKey];
    if (!note) return;

    const preview = document.getElementById('rendered-preview');
    preview.innerHTML = renderMarkdown(note.content);

    if (window.updateLineNumbers) window.updateLineNumbers();
    if (window.updateEditorOverlays) window.updateEditorOverlays();
    
    if (window.updateWordCount) window.updateWordCount(note.content);
    if (window.renderOutline) window.renderOutline(note.content);
    if (window.updateChecklistProgress) window.updateChecklistProgress(note.content);
    
    if (window.renderRemoteCursors) window.renderRemoteCursors();
}
window.renderActiveNote = renderActiveNote;

// Markdown Engine Extension: Textarea Overlay logic for Mentions and Spoilers
window.updateEditorOverlays = function() {
    const textarea = document.getElementById('markdown-textarea');
    const overlays = document.getElementById('editor-overlays');
    if (!textarea || !overlays) return;

    const text = textarea.value;
    const lines = text.split('\n');
    const caretPos = textarea.selectionStart;
    const activeLineIndex = text.substring(0, caretPos).split('\n').length - 1;

    let finalHTML = '';
    
    lines.forEach((line, index) => {
        const isActive = index === activeLineIndex && document.activeElement === textarea;
        let lineHTML = '';

        if (viewMode === 'hybrid' && !isActive) {
            // In Hybrid mode, parse inactive lines but keep them single-line for alignment
            lineHTML = parseHybridLine(line);
        } else {
            // Raw mode or active line: show visible text in overlay since textarea is transparent
            let rawLine = escapeHTML(line);
            
            // Highlight Mentions (visible color)
            rawLine = rawLine.replace(/@([A-Za-z0-9_À-ÿ]+(?: [A-Za-z0-9_À-ÿ]+)?)/g, (match) => {
                let color = 'var(--accent-color)';
                const peers = [localUser, ...Object.values(remotePeersData)];
                const found = peers.find(p => p.name === match.slice(1));
                if (found) color = found.color;
                return `<span class="bg-obsidian-active text-white border-l-2 px-1 rounded" style="border-color: ${color}">${match}</span>`;
            });

            // Mask/Hide Spoilers on inactive lines
            rawLine = rawLine.replace(/\|\|(.*?)\|\|/g, (match) => {
                if (isActive) {
                    // On active line, show markers and content
                    return `<span class="border border-obsidian-accent/50 rounded px-0.5 text-gray-200 bg-obsidian-active/30">${match}</span>`;
                } else {
                    // On inactive lines, mask content
                    const title = currentLang === 'pt-br' ? 'Spoiler: Ative a linha para editar' : 'Spoiler: Activate line to edit';
                    return `<span class="bg-neutral-900 text-neutral-900 rounded border border-neutral-700 select-none" title="${title}">${match}</span>`;
                }
            });

            lineHTML = `<span class="text-gray-200">${rawLine}</span>`;
        }

        finalHTML += `<div>${lineHTML || '&#8203;'}</div>`;
    });

    overlays.innerHTML = finalHTML;
    overlays.scrollTop = textarea.scrollTop;
};

function parseHybridLine(line) {
    if (!line.trim()) return '&#8203;';
    
    // Priority 1: Headers (styled to match line height)
    if (line.startsWith('# ')) {
        return `<span class="text-white font-bold border-b border-obsidian-border pb-0.5">${escapeHTML(line.slice(2))}</span>`;
    } else if (line.startsWith('## ')) {
        return `<span class="text-white font-bold">${escapeHTML(line.slice(3))}</span>`;
    } else if (line.startsWith('### ')) {
        return `<span class="text-gray-300 font-bold">${escapeHTML(line.slice(4))}</span>`;
    }

    // Priority 2: Checkboxes
    const checkboxRegex = /^(\s*)-\s*\[([ xX])\]\s*(.*)$/;
    const checkboxMatch = line.match(checkboxRegex);
    if (checkboxMatch) {
        const isChecked = checkboxMatch[2].toLowerCase() === 'x';
        const content = parseHybridInline(checkboxMatch[3]);
        return `<span class="inline-flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded border border-neutral-500 flex items-center justify-center ${isChecked ? 'bg-obsidian-accent border-obsidian-accent' : ''}">${isChecked ? '<i class="fa-solid fa-check text-[8px] text-white"></i>' : ''}</span> <span class="${isChecked ? 'line-through text-neutral-500' : 'text-gray-300'}">${content}</span></span>`;
    }

    // Priority 3: Bullets
    const bulletRegex = /^(\s*)-\s*(.*)$/;
    const bulletMatch = line.match(bulletRegex);
    if (bulletMatch) {
        const content = parseHybridInline(bulletMatch[2]);
        return `<span class="inline-flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-obsidian-accent"></span> <span class="text-gray-300">${content}</span></span>`;
    }

    return parseHybridInline(line);
}

function parseHybridInline(text) {
    let parsed = escapeHTML(text);
    
    // Spoilers (always masked on inactive lines in hybrid)
    parsed = parsed.replace(/\|\|(.*?)\|\|/g, `<span class="bg-neutral-900 text-neutral-900 rounded border border-neutral-700 select-none">||$1||</span>`);
    
    // Obsidian Wikilinks [[Note#Heading|Alias]]
    parsed = parsed.replace(/\[\[((?:[^\]#|]*))(?:#([^\]|]*))?(?:\|([^\]]*))?\]\]/g, (match, noteName, heading, alias) => {
        const display = alias || (noteName + (heading ? '#' + heading : ''));
        const targetNoteKey = noteName.trim() ? findNoteKeyByTitle(noteName.trim()) : activeNoteKey;
        
        if (targetNoteKey) {
            return `<span class="text-obsidian-accent font-semibold border-b border-obsidian-accent/30">${escapeHTML(display)}</span>`;
        } else {
            return `<span class="wikilink-broken text-red-400/80 italic">${escapeHTML(display)}</span>`;
        }
    });

    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
    parsed = parsed.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    parsed = parsed.replace(/==(.*?)==/g, '<mark class="bg-purple-900/40 text-purple-300 px-1 rounded">$1</mark>');
    parsed = parsed.replace(/`(.*?)`/g, '<code class="bg-neutral-800 border border-neutral-700 px-1 rounded text-purple-300">$1</code>');
    
    // Mentions
    parsed = parsed.replace(/@([A-Za-z0-9_À-ÿ]+(?: [A-Za-z0-9_À-ÿ]+)?)/g, (match, name) => {
        let color = 'var(--accent-color)';
        const peers = [localUser, ...Object.values(remotePeersData)];
        const found = peers.find(p => p.name === name);
        if (found) color = found.color;
        return `<span class="px-1 rounded bg-obsidian-active text-white border-l-2" style="border-color: ${color}">${match}</span>`;
    });

    return parsed;
}

// Markdown Engine Extension: Textarea Overlay logic for Mentions and Spoilers
window.updateEditorOverlays = function() {
    const textarea = document.getElementById('markdown-textarea');
    const overlays = document.getElementById('editor-overlays');
    const preview = document.getElementById('rendered-preview');
    if (!textarea || !overlays) return;

    const text = textarea.value;
    const caretPos = textarea.selectionStart;
    const activeLineIndex = text.substring(0, caretPos).split('\n').length - 1;

    // Reset all lines in preview to visible first
    const renderedLines = preview.querySelectorAll('.rendered-line-block');
    renderedLines.forEach(el => el.style.visibility = 'visible');

    if (viewMode === 'hybrid') {
        const activeRenderedLine = preview.querySelector(`.rendered-line-block[data-line-index="${activeLineIndex}"]`);
        
        if (activeRenderedLine) {
            // 1. Hide the rendered version of the current line
            activeRenderedLine.style.visibility = 'hidden';

            // 2. Position the "Edit Portal" (the overlay container) over the hidden line
            // Overlays container becomes the clipping window
            overlays.style.color = 'inherit';
            overlays.style.pointerEvents = 'none';
            overlays.style.backgroundColor = 'transparent';
            
            // Adjust overlays size and position to match the exact active line block
            overlays.style.position = 'absolute';
            overlays.style.top = (activeRenderedLine.offsetTop - preview.scrollTop) + 'px';
            overlays.style.left = '32px'; // Align with preview max-w mx-auto padding (approx)
            overlays.style.width = 'calc(100% - 64px)';
            overlays.style.height = activeRenderedLine.offsetHeight + 'px';
            overlays.style.overflow = 'hidden';
            overlays.style.zIndex = '45';
            overlays.innerHTML = ''; // Empty overlay text in hybrid mode

            // 3. Align the textarea within this portal
            // We shift the textarea UP so that its active line aligns with the portal's top
            const textareaLineHeight = 24; // Match leading-6 (1.5rem * 16px)
            const textareaOffset = -(activeLineIndex * textareaLineHeight) - 16; // 16px is textarea padding-top
            
            textarea.style.top = textareaOffset + 'px';
            textarea.style.left = '16px'; // Align horizontal
            textarea.style.width = 'calc(100% - 32px)';
            textarea.style.color = '#e2e8f0'; // Make text visible for editing
            textarea.style.backgroundColor = 'transparent';
            textarea.style.zIndex = '50';
            textarea.style.pointerEvents = 'auto';
            
            // Ensure caret is visible
            textarea.style.caretColor = 'var(--accent-color)';
        }
    } else {
        // Fallback for Edit mode or Split mode: standard behavior
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.width = '100%';
        textarea.style.color = '#e2e8f0';
        textarea.style.pointerEvents = 'auto';
        
        overlays.style.position = 'absolute';
        overlays.style.inset = '0';
        overlays.style.height = '100%';
        overlays.style.width = '100%';
        overlays.style.top = '0';
        overlays.style.left = '0';
        overlays.style.color = 'transparent'; // Standard overlay logic
        
        // Render traditional overlay for Edit mode
        const lines = text.split('\n');
        let finalHTML = '';
        lines.forEach((line, index) => {
            const isActive = index === activeLineIndex && document.activeElement === textarea;
            let rawLine = escapeHTML(line);
            rawLine = rawLine.replace(/\|\|(.*?)\|\|/g, (match) => {
                if (isActive) return `<span class="border border-obsidian-accent/50 rounded px-0.5 text-gray-200 bg-obsidian-active/30">${match}</span>`;
                return `<span class="bg-neutral-900 text-neutral-900 rounded border border-neutral-700 select-none">${match}</span>`;
            });
            finalHTML += `<div><span class="text-gray-200">${rawLine}</span></div>`;
        });
        overlays.innerHTML = finalHTML;
        overlays.scrollTop = textarea.scrollTop;
    }
};

function syncScroll(source) {
    if (isScrolling) return;
    isScrolling = true;

    const textarea = document.getElementById('markdown-textarea');
    const preview = document.getElementById('preview-container');
    const lineNumbers = document.getElementById('line-numbers');

    if (source === 'editor') {
        const pct = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight);
        if (preview.scrollHeight > preview.clientHeight) {
            preview.scrollTop = pct * (preview.scrollHeight - preview.clientHeight);
        }
        lineNumbers.scrollTop = textarea.scrollTop;
    } else {
        if (viewMode !== 'hybrid') {
            const pct = preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
            textarea.scrollTop = pct * (textarea.scrollHeight - textarea.clientHeight);
        }
        lineNumbers.scrollTop = textarea.scrollTop;
    }
    
    // Always refresh overlays on scroll
    if (window.updateEditorOverlays) window.updateEditorOverlays();

    setTimeout(() => { isScrolling = false; }, 50);
}
window.syncScroll = syncScroll;

function scrollEditorToLine(lineIndex) {
    const textarea = document.getElementById('markdown-textarea');
    const targetPct = lineIndex / textarea.value.split('\n').length;
    textarea.scrollTop = targetPct * (textarea.scrollHeight - textarea.clientHeight);

    const targetHeader = document.getElementById(`heading-${lineIndex}`);
    if (targetHeader) targetHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.scrollEditorToLine = scrollEditorToLine;

