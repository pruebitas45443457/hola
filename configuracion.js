let config = {
    profile: {
        fullName: '',
        title: '',
        email: '',
        phone: '',
        bio: '',
        location: '',
        website: '',
        avatar: null
    },
    appearance: {
        theme: 'dark',
        primaryColor: '#3b82f6',
        showAnimation: true,
        showParticles: false
    },
    social: {
        github: '',
        linkedin: '',
        twitter: '',
        instagram: ''
    }
};

// --- Theme Management ---
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    config.appearance.theme = newTheme;
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.toggle('active', option.dataset.theme === newTheme);
    });
}
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    config.appearance.theme = theme;
    document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.toggle('active', option.dataset.theme === theme);
    });
}

// --- Color Management ---
function setPrimaryColor(color) {
    document.documentElement.style.setProperty('--primary-color', color);
    document.documentElement.style.setProperty('--primary-hover', adjustBrightness(color, -10));
    document.documentElement.style.setProperty('--primary-light', adjustBrightness(color, 80) + '20');
    config.appearance.primaryColor = color;
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.toggle('active', option.dataset.color === color);
    });
}
function adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
}

// --- Avatar Management ---
function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const avatarPreview = document.getElementById('avatar-preview');
            avatarPreview.src = e.target.result;
            config.profile.avatar = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// --- Form Data Collection ---
function collectFormData() {
    config.profile.fullName = document.getElementById('fullName').value;
    config.profile.title = document.getElementById('title').value;
    config.profile.email = document.getElementById('email').value;
    config.profile.phone = document.getElementById('phone').value;
    config.profile.bio = document.getElementById('bio').value;
    config.profile.location = document.getElementById('location').value;
    config.profile.website = document.getElementById('website').value;
    config.appearance.showAnimation = document.getElementById('showAnimation').checked;
    config.appearance.showParticles = document.getElementById('showParticles').checked;
    config.social.github = document.getElementById('github').value;
    config.social.linkedin = document.getElementById('linkedin').value;
    config.social.twitter = document.getElementById('twitter').value;
    config.social.instagram = document.getElementById('instagram').value;
}

// --- Save Configuration ---
function saveConfig() {
    collectFormData();
    const saveButton = document.getElementById('btnSave');
    const originalText = saveButton.innerHTML;
    saveButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6"></path></svg>Guardando...';
    saveButton.disabled = true;
    setTimeout(() => {
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
        showSuccessModal();
        window.portfolioConfig = { ...config };
        console.log('Configuración guardada:', config);
    }, 1500);
}

// --- Reset Configuration ---
function resetConfig() {
    if (confirm('¿Estás seguro de que quieres restablecer toda la configuración?')) {
        document.getElementById('fullName').value = '';
        document.getElementById('title').value = '';
        document.getElementById('email').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('bio').value = '';
        document.getElementById('location').value = '';
        document.getElementById('website').value = '';
        document.getElementById('avatar-preview').src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e2e8f0'/%3E%3Cpath d='M50 45c-8.284 0-15-6.716-15-15s6.716-15 15-15 15 6.716 15 15-6.716 15-15 15zm0 5c16.569 0 30 13.431 30 30v10H20V80c0-16.569 13.431-30 30-30z' fill='%23cbd5e1'/%3E%3C/svg%3E";
        document.getElementById('showAnimation').checked = true;
        document.getElementById('showParticles').checked = false;
        document.getElementById('github').value = '';
        document.getElementById('linkedin').value = '';
        document.getElementById('twitter').value = '';
        document.getElementById('instagram').value = '';
        setTheme('dark');
        setPrimaryColor('#3b82f6');
        config = {
            profile: {
                fullName: '',
                title: '',
                email: '',
                phone: '',
                bio: '',
                location: '',
                website: '',
                avatar: null
            },
            appearance: {
                theme: 'dark',
                primaryColor: '#3b82f6',
                showAnimation: true,
                showParticles: false
            },
            social: {
                github: '',
                linkedin: '',
                twitter: '',
                instagram: ''
            }
        };
    }
}

// --- Modal Management ---
function showSuccessModal() {
    document.getElementById('successModal').classList.add('show');
}
function closeModal() {
    document.getElementById('successModal').classList.remove('show');
}

// --- Navigation ---
function goBack() {
    alert('Navegando de vuelta al portafolio...\n\nEn una implementación real, esto redirigiría a la página principal del portafolio.');
}

// --- Initialize Application ---
function initializeApp() {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('avatar-input').addEventListener('change', handleAvatarChange);
    document.getElementById('btnTheme').addEventListener('click', toggleTheme);
    document.getElementById('btnBack').addEventListener('click', goBack);
    document.getElementById('btnSave').addEventListener('click', saveConfig);
    document.getElementById('btnReset').addEventListener('click', resetConfig);
    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', () => setTheme(option.dataset.theme));
    });
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => setPrimaryColor(option.dataset.color));
    });
    document.getElementById('btnChangeAvatar').addEventListener('click', () => {
        document.getElementById('avatar-input').click();
    });
    document.getElementById('successModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
    document.querySelectorAll('input, textarea').forEach(element => {
        element.addEventListener('blur', collectFormData);
    });
    console.log('Sistema de configuración inicializado correctamente');
}

// --- Load saved configuration (if exists) ---
function loadSavedConfig() {
    if (window.portfolioConfig) {
        const savedConfig = window.portfolioConfig;
        if (savedConfig.profile) {
            document.getElementById('fullName').value = savedConfig.profile.fullName || '';
            document.getElementById('title').value = savedConfig.profile.title || '';
            document.getElementById('email').value = savedConfig.profile.email || '';
            document.getElementById('phone').value = savedConfig.profile.phone || '';
            document.getElementById('bio').value = savedConfig.profile.bio || '';
            document.getElementById('location').value = savedConfig.profile.location || '';
            document.getElementById('website').value = savedConfig.profile.website || '';
            if (savedConfig.profile.avatar) {
                document.getElementById('avatar-preview').src = savedConfig.profile.avatar;
            }
        }
        if (savedConfig.appearance) {
            setTheme(savedConfig.appearance.theme || 'dark');
            setPrimaryColor(savedConfig.appearance.primaryColor || '#3b82f6');
            document.getElementById('showAnimation').checked = savedConfig.appearance.showAnimation !== false;
            document.getElementById('showParticles').checked = savedConfig.appearance.showParticles === true;
        }
        if (savedConfig.social) {
            document.getElementById('github').value = savedConfig.social.github || '';
            document.getElementById('linkedin').value = savedConfig.social.linkedin || '';
            document.getElementById('twitter').value = savedConfig.social.twitter || '';
            document.getElementById('instagram').value = savedConfig.social.instagram || '';
        }
        config = { ...savedConfig };
    }
}

// --- Start the application when DOM is loaded ---
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadSavedConfig();
});