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

function noteHasSpoilers(content) {
    return typeof content === 'string' && /\|\|.*?\|\|/.test(content);
}

function loadActiveNote() {
    const note = vault[activeNoteKey];
    if (!note) return;

    if (noteHasSpoilers(note.content) && viewMode !== 'reading') {
        setViewMode('reading', false);
    }

    const breadcrumb = document.getElementById('breadcrumb-filename');
    if (breadcrumb) breadcrumb.innerText = note.title + ".md";
    
    const tabTitle = document.getElementById('active-tab-title');
    if (tabTitle) tabTitle.innerText = note.title;
    
    const titleInput = document.getElementById('note-title-input');
    if (titleInput) titleInput.value = note.title;

    const textarea = document.getElementById('markdown-textarea');
    if (textarea) textarea.value = note.content;

    renderActiveNote();
}
window.loadActiveNote = loadActiveNote;

function renderActiveNote() {
    const note = vault[activeNoteKey];
    if (!note) return;

    const markdownHTML = renderMarkdown(note.content);
    const preview = document.getElementById('rendered-preview');
    if (preview) preview.innerHTML = markdownHTML;

    const hybridBackdrop = document.getElementById('hybrid-backdrop');
    if (hybridBackdrop) hybridBackdrop.innerHTML = markdownHTML;

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
    const hybridBackdrop = document.getElementById('hybrid-backdrop');
    if (!textarea || !overlays) return;

    const text = textarea.value;
    const caretPos = textarea.selectionStart;
    const activeLineIndex = text.substring(0, caretPos).split('\n').length - 1;

    if (viewMode === 'hybrid' && hybridBackdrop) {
        // 1. Reset all backdrop lines to visible
        const renderedLines = hybridBackdrop.querySelectorAll('.rendered-line-block');
        renderedLines.forEach(el => {
            el.style.visibility = 'visible';
            el.classList.remove('active-edit');
        });

        const activeRenderedLine = hybridBackdrop.querySelector(`.rendered-line-block[data-line-index="${activeLineIndex}"]`);
        
        if (activeRenderedLine) {
            // 2. Hide the rendered version of the current line in backdrop
            activeRenderedLine.style.visibility = 'hidden';
            activeRenderedLine.classList.add('active-edit');

            // 3. Position the "Source Portal" overlay exactly over the gap
            overlays.style.position = 'absolute';
            overlays.style.top = (activeRenderedLine.offsetTop) + 'px';
            overlays.style.left = activeRenderedLine.offsetLeft + 'px';
            overlays.style.width = activeRenderedLine.offsetWidth + 'px';
            overlays.style.height = activeRenderedLine.offsetHeight + 'px';
            overlays.style.zIndex = '45';
            overlays.style.display = 'flex';
            overlays.style.alignItems = 'center';
            overlays.style.color = '#e2e8f0'; 
            overlays.style.backgroundColor = 'transparent';
            overlays.style.pointerEvents = 'none';
            overlays.style.opacity = '1';
            
            const rawLine = text.split('\n')[activeLineIndex] || '';
            overlays.innerHTML = `<div class="font-mono text-sm leading-6 w-full whitespace-pre-wrap break-words border-l-2 border-obsidian-accent/30 pl-2 bg-obsidian-active/20 rounded-r">${escapeHTML(rawLine)}</div>`;
            
            // Textarea is invisible input layer on top
            textarea.style.color = 'transparent';
            textarea.style.caretColor = 'var(--accent-color)';
        }
    } else {
        // Fallback for Edit mode
        textarea.style.color = '#e2e8f0';
        overlays.style.opacity = '0';
        overlays.innerHTML = '';
        
        if (hybridBackdrop) {
            const renderedLines = hybridBackdrop.querySelectorAll('.rendered-line-block');
            renderedLines.forEach(el => el.style.visibility = 'visible');
        }
    }
};

function syncScroll(source) {
    if (isScrolling) return;
    isScrolling = true;

    const textarea = document.getElementById('markdown-textarea');
    const preview = document.getElementById('preview-container');
    const hybridBackdrop = document.getElementById('hybrid-backdrop');
    const lineNumbers = document.getElementById('line-numbers');

    if (source === 'editor') {
        const scrollTop = textarea.scrollTop;
        const scrollHeight = textarea.scrollHeight;
        const clientHeight = textarea.clientHeight;
        const pct = scrollTop / (scrollHeight - clientHeight);
        
        if (viewMode === 'hybrid' && hybridBackdrop) {
            // 1:1 scroll sync for Hybrid mode backdrop
            hybridBackdrop.scrollTop = scrollTop;
        } else {
            if (preview && preview.scrollHeight > preview.clientHeight) {
                preview.scrollTop = pct * (preview.scrollHeight - preview.clientHeight);
            }
        }
        if (lineNumbers) lineNumbers.scrollTop = scrollTop;
    } else {
        if (viewMode !== 'hybrid') {
            const pct = preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
            textarea.scrollTop = pct * (textarea.scrollHeight - textarea.clientHeight);
        }
        if (lineNumbers) lineNumbers.scrollTop = textarea.scrollTop;
    }
    
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

