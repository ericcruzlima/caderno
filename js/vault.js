/* CORE VAULT & APP STATE */
window.vault = {};
window.activeNoteKey = "";
window.viewMode = "hybrid"; 
window.searchFilter = "";
window.isScrolling = false;
window.deleteCandidateKey = null;

window.blameMap = {};
window.blameModeEnabled = false;

window.userMentions = [];

window.initializeVaultState = function() {
    if (window.vaultInitialized) return;
    if (window.initLanguageSystem) window.initLanguageSystem();

    const savedVault = localStorage.getItem("caderno_vault");
    if (savedVault) {
        try {
            window.vault = JSON.parse(savedVault);
        } catch(e) {
            loadDefaultVault(currentLang);
        }
    } else {
        loadDefaultVault(currentLang);
    }

    const savedActiveKey = localStorage.getItem("caderno_active_key");
    if (savedActiveKey && window.vault[savedActiveKey]) {
        window.activeNoteKey = savedActiveKey;
    } else {
        window.activeNoteKey = Object.keys(window.vault)[0] || "";
    }

    const savedBlame = localStorage.getItem("caderno_blame_map");
    if (savedBlame) {
        try { window.blameMap = JSON.parse(savedBlame); } catch(e){}
    }

    const savedMentions = localStorage.getItem("caderno_mentions");
    if (savedMentions) {
        try { window.userMentions = JSON.parse(savedMentions); } catch(e){}
    }
    if (window.updateMentionsUI) window.updateMentionsUI();

    window.vaultInitialized = true;
};

window.findNoteKeyByTitle = function(title) {
    return Object.keys(window.vault).find(key => window.vault[key].title.toLowerCase() === title.trim().toLowerCase());
};

function loadDefaultVault(lang) {
    window.vault = {
        "project_roadmap": {
            title: lang === 'pt-br' ? "Roteiro do Projeto & Tarefas" : "Project Roadmap & Tasks",
            content: getRoadmapMarkdown(lang)
        },
        "welcome_guide": {
            title: lang === 'pt-br' ? "Bem-vindo ao Caderno" : "Welcome to Caderno",
            content: getWelcomeGuideMarkdown(lang)
        }
    };
    saveVaultLocalOnly();
}

window.saveVaultLocalOnly = function() {
    localStorage.setItem("caderno_vault", JSON.stringify(window.vault));
    localStorage.setItem("caderno_active_key", window.activeNoteKey);
    localStorage.setItem("caderno_blame_map", JSON.stringify(window.blameMap));
    localStorage.setItem("caderno_mentions", JSON.stringify(window.userMentions));
    if (window.updateGlobalProgressTracker) window.updateGlobalProgressTracker();
};

window.saveVaultStructure = function() {
    window.saveVaultLocalOnly();
    if (window.triggerP2PVaultStructureUpdate) {
        window.triggerP2PVaultStructureUpdate();
    }
};

window.updateBlameTracking = function(noteKey, oldText, newText, author) {
    if (!window.blameMap[noteKey]) {
        window.blameMap[noteKey] = [];
    }

    let currentMap = window.blameMap[noteKey];

    if (currentMap.length === 0 && oldText.length > 0) {
        currentMap.push({
            authorId: 'system',
            name: 'Origin',
            color: '#475569',
            length: oldText.length
        });
    }

    const diffs = window.dmp.diff_main(oldText, newText);
    window.dmp.diff_cleanupSemantic(diffs);

    let newMap = [];
    let oldMapIndex = 0;

    diffs.forEach(diff => {
        const op = diff[0]; 
        const text = diff[1];
        let length = text.length;

        if (op === 0) { 
            while (length > 0 && oldMapIndex < currentMap.length) {
                const segment = currentMap[oldMapIndex];
                const available = segment.length;

                if (available <= length) {
                    newMap.push({ ...segment });
                    length -= available;
                    oldMapIndex++;
                } else {
                    newMap.push({
                        authorId: segment.authorId,
                        name: segment.name,
                        color: segment.color,
                        length: length
                    });
                    segment.length -= length;
                    length = 0;
                }
            }
        } else if (op === 1) { 
            newMap.push({
                authorId: author.id,
                name: author.name,
                color: author.color,
                length: length
            });
        } else if (op === -1) { 
            while (length > 0 && oldMapIndex < currentMap.length) {
                const segment = currentMap[oldMapIndex];
                const available = segment.length;

                if (available <= length) {
                    length -= available;
                    oldMapIndex++;
                } else {
                    segment.length -= length;
                    length = 0;
                }
            }
        }
    });

    let consolidatedMap = [];
    newMap.forEach(seg => {
        if (seg.length === 0) return;
        const last = consolidatedMap[consolidatedMap.length - 1];
        if (last && last.authorId === seg.authorId) {
            last.length += seg.length;
        } else {
            consolidatedMap.push(seg);
        }
    });

    window.blameMap[noteKey] = consolidatedMap;
    window.saveVaultLocalOnly();
};

window.createNewNote = function() {
    const id = "note_" + Date.now();
    const noteTitle = currentLang === 'pt-br' ? "Nota Sem Título" : "Untitled Note";
    const noteContent = currentLang === 'pt-br' 
        ? "# Nota Sem Título\n\n- [ ] Novas tarefas aqui\n- [ ] Dê um duplo-clique no título no menu lateral para renomear!" 
        : "# Untitled Note\n\n- [ ] New objectives go here\n- [ ] Double click the title in explorer to rename";
    
    window.vault[id] = {
        title: noteTitle,
        content: noteContent
    };

    window.updateBlameTracking(id, "", noteContent, {
        id: localUser.id,
        name: localUser.name,
        color: localUser.color
    });

    window.activeNoteKey = id;
    
    window.saveVaultLocalOnly();
    if (window.triggerP2PVaultStructureUpdate) {
        window.triggerP2PVaultStructureUpdate();
    }

    if (window.renderVaultList) window.renderVaultList();
    if (window.loadActiveNote) window.loadActiveNote();
    if (window.showToast) window.showToast(i18n[currentLang].toastCreated, "success");
};

function getRoadmapMarkdown(lang) {
    if (lang === 'pt-br') {
        return `# 🚀 Roteiro de Lançamento do Projeto\n\n## 📅 Fase 1: Pesquisa & Descoberta\n- [ ] **Definir requisitos** e o escopo do MVP do projeto.\n- [ ] **Criar wireframes** e esboços de design para revisão da equipe.\n- [ ] **Alinhar a stack tecnológica** e os modelos de banco de dados.\n\n## 💻 Fase 2: Design & Desenvolvimento\n- [ ] **Configurar a estrutura do código** e roteamento básico.\n- [ ] **Implementar motores de colaboração em tempo real** (sincronização P2P).\n- [ ] **Otimizar métricas de performance** para melhor experiência do usuário.\n\n## 🚀 Fase 3: Lançamento & Iteração\n- [ ] **Realizar testes beta** com usuários internos.\n- [ ] **Coletar feedback dos usuários** e priorizar melhorias.\n- [ ] **Implantar o projeto Caderno v1.0** em produção!`;
    } else {
        return `# 🚀 Project Launch Roadmap\n\n## 📅 Phase 1: Research & Discovery\n- [ ] **Define requirements** and scope the project MVP.\n- [ ] **Create wireframes** and design mockups for team review.\n- [ ] **Align on the tech stack** and database models.\n\n## 💻 Phase 2: Design & Development\n- [ ] **Set up codebase structure** and basic routing.\n- [ ] **Implement real-time collaboration engines** (P2P synchronization).\n- [ ] **Optimize performance metrics** for peak user interaction.\n\n## 🚀 Phase 3: Launch & Iteration\n- [ ] **Conduct beta testing** with internal users.\n- [ ] **Gather user feedback** and prioritize enhancements.\n- [ ] **Deploy project Caderno v1.0** to production!`;
    }
}

function getWelcomeGuideMarkdown(lang) {
    if (lang === 'pt-br') {
        return `# Bem-vindo ao Caderno 📓\n\nEste é o seu novo espaço de trabalho colaborativo, agora muito mais potente e elegante. Explore as funcionalidades abaixo:\n\n### ✨ Modo Híbrido (O Novo Padrão)\n- **O melhor dos dois mundos:** Linhas inativas são renderizadas com estilo, enquanto a linha que você está editando volta ao Markdown puro para não atrapalhar sua escrita.\n- **Edição Direta:** Basta clicar em qualquer linha para transformá-la em código-fonte instantaneamente.\n\n### 👥 Sincronização P2P & Presença\n1. **Sessão Compartilhada:** Use o botão **Share** no topo para convidar sua equipe via WebRTC.\n2. **Cursores Inteligentes:** Veja onde seus colegas estão com cursores coloridos e indicadores de navegação.\n3. **Foco no Contexto:** Os cursores dos colegas só aparecem se vocês estiverem editando a *mesma* nota.\n\n### 🔗 Conectividade Obsidian\n- **Wikilinks:** Navegue entre notas usando \`[[Título da Nota]]\`.\n- **Links de Seção:** Use [[Roteiro do Projeto & Tarefas#Fase 2|este link de exemplo]] para pular direto para uma seção específica.\n- **Apelidos:** Personalize o texto do link com a sintaxe \`[[Nota|Nome Exibido]]\`.\n\n### 🤫 Spoilers & Segredos\n- **Mascaramento Automático:** Spoilers como ||este aqui|| agora se escondem automaticamente em linhas inativas. Eles só se revelam quando você move o cursor para a linha deles.\n\n### ⚙️ Interface Refinada\n- **Menu de Engrenagem:** Centralizamos o Idioma, Temas e modo Blame no ícone ⚙️.\n- **Menu de Usuário:** Clique no indicador de pares para gerenciar seu perfil e ver menções.\n- **Busca Central:** Pressione \`Ctrl + P\` para buscar em todo o seu caderno instantaneamente.\n\n--- \n*Dica: Experimente o modo **Split** (Dividido) se preferir a visualização clássica lado-a-lado!*`;
    } else {
        return `# Welcome to Caderno 📓\n\nThis is your new collaborative workspace, now significantly more powerful and polished. Explore the core features below:\n\n### ✨ Hybrid View (The New Standard)\n- **Best of Both Worlds:** Inactive lines are beautifully rendered, while the active line you're typing on stays in raw Markdown for distraction-free editing.\n- **Direct Interaction:** Just click any line to instantly reveal its source code.\n\n### 👥 P2P Sync & Presence\n1. **Shared Sessions:** Use the **Share** button at the top to invite your team via WebRTC.\n2. **Smart Cursors:** See exactly where your peers are with color-coded cursors and navigation alerts.\n3. **Contextual Focus:** Peer cursors are only visible when you are working on the *same* document.\n\n### 🔗 Obsidian Connectivity\n- **Wikilinks:** Navigate between your thoughts using \`[[Note Title]]\`.\n- **Heading Links:** Use [[Project Launch Roadmap#Phase 2|this example link]] to jump directly to a specific section.\n- **Aliases:** Customize link text using the \`[[Note|Display Name]]\` syntax.\n\n### 🤫 Spoilers & Secrets\n- **Auto-Masking:** Spoilers like ||this secret right here|| now automatically hide on inactive lines. They only reveal themselves when you move your cursor to their specific line.\n\n### ⚙️ Refined Interface\n- **Settings Cog:** We've centralized Language, Themes, and Blame mode under the ⚙️ icon.\n- **User Menu:** Click the peer indicator to manage your profile and check your mentions.\n- **Quick Search:** Press \`Ctrl + P\` to search through all notes and headings instantly.\n\n--- \n*Tip: Try the **Split** mode if you prefer the classic side-by-side preview!*`;
    }
}
