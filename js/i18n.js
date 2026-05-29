const i18n = {
    'en': {
        vaultTitle: "CADERNO",
        breadcrumbFolder: "notebook",
        collabConnecting: "Connecting live...",
        collabActive: "Peer(s) Active",
        collabAwaiting: "Awaiting Peers",
        shareBtn: "Share Live Session",
        quickSearch: "Quick Search",
        searchNotes: "Search notes...",
        campaignNotes: "My Notes",
        overallCompletion: "Task Completion",
        modeEdit: "Edit",
        modeHybrid: "Hybrid",
        modeReading: "Reading",
        modeSplit: "Split",
        campaignTracker: "Task Progress Tracker",
        calculating: "Calculating objectives...",
        titlePlaceholder: "Untitled Note",
        wordCount: "words",
        localMode: "LOCAL STORAGE ONLY",
        p2pMode: "P2P SYNC ACTIVE",
        documentOutline: "Document Outline",
        noHeadings: "No headings found in document.",
        noContent: "No content in this note. Write something to begin!",
        palettePlaceholder: "Type to search notes and headings...",
        selectFile: "Select File",
        jumpToSec: "Jump to Sec",
        noMatches: "No matching titles or headings found.",
        deleteTitle: "Delete Note?",
        deleteDescBefore: "Are you sure you want to permanently delete",
        deleteDescAfter: "This action cannot be undone.",
        cancel: "Cancel",
        delete: "Delete",
        toastCreated: "Created a new note",
        toastDeleted: "Deleted \"{title}\"",
        toastQuestCompleted: "Task completed!",
        toastQuestReset: "Task reset",
        toastSyncHost: "Notebook initialized from Host!",
        toastCollabConnected: "Connected successfully with a collaborator!",
        toastCollabDisconnected: "Collaborator disconnected.",
        toastP2PError: "P2P Signalling Error. Operating in offline fallback mode.",
        toastP2PReachHostError: "Could not reach host. Starting standalone session.",
        toastDownloaded: "Downloaded \"{title}\"",
        downloadTooltip: "Download note as .md file",
        downloadBtnLabel: "Download .md",
        
        profileBtn: "Profile",
        profileTitle: "Configure Profile",
        profileDesc: "Set your permanent identifier and nickname for this notebook. Changes take effect immediately across all connected peers.",
        profileLabelNick: "Nickname",
        profileLabelColor: "Cursor & Avatar Color",
        toastProfileUpdated: "Profile updated successfully!"
    },
    'pt-br': {
        vaultTitle: "CADERNO",
        breadcrumbFolder: "caderno",
        collabConnecting: "Conectando ao vivo...",
        collabActive: "Par(es) Ativo(s)",
        collabAwaiting: "Aguardando Pares",
        shareBtn: "Compartilhar Sessão",
        quickSearch: "Busca Rápida",
        searchNotes: "Buscar notas...",
        campaignNotes: "Minhas Notas",
        overallCompletion: "Progresso de Tarefas",
        modeEdit: "Editar",
        modeHybrid: "Híbrido",
        modeReading: "Leitura",
        modeSplit: "Dividido",
        campaignTracker: "Rastreador de Tarefas",
        calculating: "Calculando objetivos...",
        titlePlaceholder: "Nota sem Título",
        wordCount: "palavras",
        localMode: "APENAS STORAGE LOCAL",
        p2pMode: "SINCRONIZAÇÃO P2P ATIVA",
        documentOutline: "Sumário do Documento",
        noHeadings: "Nenhum cabeçalho encontrado no documento.",
        noContent: "Nenhum conteúdo nesta nota. Escreva algo para começar!",
        palettePlaceholder: "Digite para buscar notas e cabeçalhos...",
        selectFile: "Selecionar Arquivo",
        jumpToSec: "Ir para Seção",
        noMatches: "Nenhum título ou cabeçalho encontrado.",
        deleteTitle: "Excluir Nota?",
        deleteDescBefore: "Tem certeza de que deseja excluir permanentemente",
        deleteDescAfter: "Esta ação não pode ser desfeita.",
        cancel: "Cancelar",
        delete: "Excluir",
        toastCreated: "Nova nota criada",
        toastDeleted: "Excluir \"{title}\"",
        toastQuestCompleted: "Tarefa concluída!",
        toastQuestReset: "Tarefa reiniciada!",
        toastSyncHost: "Caderno inicializado pelo Hospedeiro!",
        toastCollabConnected: "Conectado com sucesso a um colaborador!",
        toastCollabDisconnected: "Colaborador desconectado.",
        toastP2PError: "Erro de Sinalização P2P. Operando em modo offline.",
        toastP2PReachHostError: "Não foi possível alcançar o hospedeiro. Iniciando sessão autônoma.",
        toastDownloaded: "\"{title}\" baixado com sucesso!",
        downloadTooltip: "Baixar nota como arquivo .md",
        downloadBtnLabel: "Baixar .md",
        
        profileBtn: "Perfil",
        profileTitle: "Personalizar Perfil",
        profileDesc: "Defina seu identificador permanente e apelido para este caderno. Mudanças tomam efeito imediato entre todos os participantes.",
        profileLabelNick: "Apelido / Nickname",
        profileLabelColor: "Sua Cor de Cursor & Avatar",
        toastProfileUpdated: "Perfil atualizado com sucesso!"
    }
};

const svgBr = `<svg class="w-5 h-3.5 rounded shadow-sm border border-neutral-700/50 shrink-0" viewBox="0 0 720 500" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="720" height="500" fill="#009c3b"/><polygon points="360,80 80,250 360,420 640,250" fill="#ffdf00"/><circle cx="360" cy="250" r="120" fill="#002171"/><path d="M 240,250 A 120,120 0 0,0 480,250" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round"/></svg>`;
const svgEn = `<svg class="w-5 h-3.5 rounded shadow-sm border border-neutral-700/50 shrink-0" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="14" fill="#B91C1C"/><path d="M0 1H20M0 3H20M0 5H20M0 7H20M0 9H20M0 11H20M0 13H20" stroke="#FFFFFF" stroke-width="1"/><rect width="9" height="7" fill="#1E3A8A"/><circle cx="2" cy="2" r="0.4" fill="white"/><circle cx="4" cy="2" r="0.4" fill="white"/><circle cx="6" cy="2" r="0.4" fill="white"/><circle cx="3" cy="3.5" r="0.4" fill="white"/><circle cx="5" cy="3.5" r="0.4" fill="white"/><circle cx="2" cy="5" r="0.4" fill="white"/><circle cx="4" cy="5" r="0.4" fill="white"/><circle cx="6" cy="5" r="0.4" fill="white"/></svg>`;

window.currentLang = 'en';

window.initLanguageSystem = function() {
    const savedLanguage = localStorage.getItem("caderno_language");
    if (savedLanguage === 'en' || savedLanguage === 'pt-br') {
        window.currentLang = savedLanguage;
    } else {
        const browserLocale = (navigator.language || navigator.userLanguage || "").toLowerCase();
        window.currentLang = browserLocale.startsWith("pt") ? 'pt-br' : 'en';
    }
    applyUILanguage(window.currentLang);
};

window.toggleLanguage = function() {
    const nextLang = window.currentLang === 'en' ? 'pt-br' : 'en';
    window.currentLang = nextLang;
    localStorage.setItem("caderno_language", nextLang);
    applyUILanguage(nextLang);
    if (window.showToast) window.showToast(nextLang === 'pt-br' ? "Idioma alterado para Português!" : "Language changed to English!", "info");
};

window.applyUILanguage = function(lang) {
    const t = i18n[lang];
    
    document.getElementById('vault-logo-text').innerText = t.vaultTitle;
    document.getElementById('share-btn-text').innerText = t.shareBtn;
    document.getElementById('quick-search-text').innerText = t.quickSearch;
    document.getElementById('note-search').placeholder = t.searchNotes;
    document.getElementById('campaign-notes-title').innerText = t.campaignNotes;
    document.getElementById('overall-completion-title').innerText = t.overallCompletion;
    document.getElementById('campaign-tracker-title').innerText = t.campaignTracker;
    document.getElementById('title-header-label').innerText = lang === 'pt-br' ? 'TÍTULO' : 'TITLE';
    document.getElementById('outline-panel-title').innerText = t.documentOutline;
    document.getElementById('palette-search').placeholder = t.palettePlaceholder;
    
    document.getElementById('delete-modal-header').innerText = t.deleteTitle;
    document.getElementById('delete-modal-desc-before').innerText = t.deleteDescBefore;
    document.getElementById('delete-modal-desc-after').innerText = t.deleteDescAfter;
    document.getElementById('delete-modal-cancel-btn').innerText = t.cancel;
    document.getElementById('delete-modal-confirm-btn').innerText = t.delete;

    document.getElementById('btn-edit-mode').innerHTML = `<i class="fa-solid fa-code mr-1"></i> ` + t.modeEdit;
    const hybridBtn = document.getElementById('btn-hybrid-mode');
    if (hybridBtn) hybridBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles mr-1"></i> ` + t.modeHybrid;
    document.getElementById('btn-reading-mode').innerHTML = `<i class="fa-solid fa-book-open mr-1"></i> ` + t.modeReading;
    document.getElementById('btn-split-mode').innerHTML = `<i class="fa-solid fa-columns mr-1"></i> ` + t.modeSplit;

    const profileBtnText = document.getElementById('profile-btn-text');
    if (profileBtnText) profileBtnText.innerText = t.profileBtn;
    
    const profileModalHeader = document.getElementById('profile-modal-header');
    if (profileModalHeader) profileModalHeader.innerText = t.profileTitle;
    
    const profileModalDesc = document.getElementById('profile-modal-desc');
    if (profileModalDesc) profileModalDesc.innerText = t.profileDesc;
    
    const profileLabelNick = document.getElementById('profile-label-nick');
    if (profileLabelNick) profileLabelNick.innerText = t.profileLabelNick;
    
    const profileLabelColor = document.getElementById('profile-label-color');
    if (profileLabelColor) profileLabelColor.innerText = t.profileLabelColor;

    const flagContainer = document.getElementById('active-flag-container');
    const langCodeLabel = document.getElementById('active-lang-code');
    if (flagContainer && langCodeLabel) {
        if (lang === 'pt-br') {
            flagContainer.innerHTML = svgBr;
            langCodeLabel.innerText = 'PT-BR';
        } else {
            flagContainer.innerHTML = svgEn;
            langCodeLabel.innerText = 'EN';
        }
    }

    const collabStatusText = document.getElementById('collab-status-text');
    if (collabStatusText) {
        if (window.connections && connections.length > 0) {
            collabStatusText.innerText = `${connections.length} ${t.collabActive}`;
        } else {
            const isConnecting = myPeer && !myPeer.destroyed;
            collabStatusText.innerText = isConnecting ? t.collabConnecting : t.collabAwaiting;
        }
    }

    const badge = document.getElementById("connection-mode-badge");
    if (badge) {
        if (badge.innerText.includes("ACTIVE") || badge.innerText.includes("ATIVA") || badge.innerText.includes("HOST")) {
            badge.innerText = t.p2pMode;
        } else {
            badge.innerText = t.localMode;
        }
    }

    const downloadBtnText = document.getElementById('download-btn-text');
    if (downloadBtnText) {
        downloadBtnText.innerText = t.downloadBtnLabel;
        downloadBtnText.parentElement.title = t.downloadTooltip;
    }

    if (window.renderVaultList) window.renderVaultList();
    if (window.renderActiveNote) window.renderActiveNote();
};
