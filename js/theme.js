(function() {
    const savedTheme = localStorage.getItem('caderno_theme_accent') || 'purple';
    const palettes = {
        purple: { color: '#a855f7', hover: '#c084fc', muted: '#d8b4fe', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)', gradientStart: '#a855f7', gradientEnd: '#6366f1' },
        emerald: { color: '#10b981', hover: '#34d399', muted: '#a7f3d0', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', gradientStart: '#10b981', gradientEnd: '#3b82f6' },
        indigo: { color: '#6366f1', hover: '#818cf8', muted: '#c7d2fe', bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.3)', gradientStart: '#6366f1', gradientEnd: '#ec4899' },
        amber: { color: '#f59e0b', hover: '#fbbf24', muted: '#fde68a', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', gradientStart: '#f59e0b', gradientEnd: '#ef4444' },
        rose: { color: '#f43f5e', hover: '#fb7185', muted: '#fecdd3', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.3)', gradientStart: '#f43f5e', gradientEnd: '#a855f7' }
    };
    const palette = palettes[savedTheme] || palettes.purple;
    const root = document.documentElement;
    root.style.setProperty('--accent-color', palette.color);
    root.style.setProperty('--accent-hover', palette.hover);
    root.style.setProperty('--accent-muted', palette.muted);
    root.style.setProperty('--accent-bg', palette.bg);
    root.style.setProperty('--accent-border', palette.border);
    root.style.setProperty('--accent-gradient-start', palette.gradientStart);
    root.style.setProperty('--accent-gradient-end', palette.gradientEnd);
})();

window.toggleThemeDropdown = function(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('theme-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
};

window.changeTheme = function(themeKey) {
    const palettes = {
        purple: { color: '#a855f7', hover: '#c084fc', muted: '#d8b4fe', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)', gradientStart: '#a855f7', gradientEnd: '#6366f1' },
        emerald: { color: '#10b981', hover: '#34d399', muted: '#a7f3d0', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', gradientStart: '#10b981', gradientEnd: '#3b82f6' },
        indigo: { color: '#6366f1', hover: '#818cf8', muted: '#c7d2fe', bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.3)', gradientStart: '#6366f1', gradientEnd: '#ec4899' },
        amber: { color: '#f59e0b', hover: '#fbbf24', muted: '#fde68a', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', gradientStart: '#f59e0b', gradientEnd: '#ef4444' },
        rose: { color: '#f43f5e', hover: '#fb7185', muted: '#fecdd3', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.3)', gradientStart: '#f43f5e', gradientEnd: '#a855f7' }
    };
    const palette = palettes[themeKey] || palettes.purple;
    const root = document.documentElement;
    root.style.setProperty('--accent-color', palette.color);
    root.style.setProperty('--accent-hover', palette.hover);
    root.style.setProperty('--accent-muted', palette.muted);
    root.style.setProperty('--accent-bg', palette.bg);
    root.style.setProperty('--accent-border', palette.border);
    root.style.setProperty('--accent-gradient-start', palette.gradientStart);
    root.style.setProperty('--accent-gradient-end', palette.gradientEnd);
    localStorage.setItem('caderno_theme_accent', themeKey);
    
    const dropdown = document.getElementById('theme-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
    
    showToast(currentLang === 'pt-br' ? "Tema alterado com sucesso!" : "Theme accent updated successfully!", "success");
};

window.addEventListener('click', function(e) {
    const dropdown = document.getElementById('theme-dropdown');
    const pickerBtn = document.getElementById('btn-theme-picker');
    if (dropdown && pickerBtn && !pickerBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});
