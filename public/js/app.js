// ==========================================
// WhatsApp Bulk Sender - Main Application JS
// ==========================================

// Configuration
const API = '/api';
let token = localStorage.getItem('token');
let socket = null;
let user = null;
let currentTab = 'dashboard';

// Bulk send state
let bulkStats = { total: 0, sent: 0, failed: 0 };
let bulkSending = false;

// Selected states
let selectedMediaType = 'none';
let selectedRecipientType = 'groups';
let selectedCampaignTargetType = 'groups';
let selectedGroupColor = '#3B82F6';
let connectionType = 'personal';

// Charts
let dashboardChart = null;
let analyticsChart = null;
let deliveryChart = null;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] Initializing...');
    
    if (token) {
        checkAuth();
    }
    
    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Character count for message
    const msgText = document.getElementById('msg-text');
    if (msgText) {
        msgText.addEventListener('input', () => {
            document.getElementById('char-count').textContent = msgText.value.length + ' characters';
        });
    }
    
    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#user-menu')) {
            document.getElementById('user-dropdown')?.classList.add('hidden');
        }
    });
    
    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
}

// ==========================================
// AUTHENTICATION
// ==========================================
async function checkAuth() {
    try {
        showLoading('Checking authentication...');
        
        const res = await fetch(`${API}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
            user = data.user;
            console.log('[Auth] Authenticated as:', user.email);
            showMainApp();
            initSocket();
            loadAllData();
        } else {
            logout();
        }
    } catch (error) {
        console.error('[Auth] Error:', error);
        logout();
    } finally {
        hideLoading();
    }
}

async function login(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    try {
        showLoading('Signing in...');
        
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (data.success) {
            token = data.token;
            user = data.user;
            localStorage.setItem('token', token);
            
            showToast('Login successful!', 'success');
            showMainApp();
            initSocket();
            loadAllData();
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('[Login] Error:', error);
        showToast('Login failed. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

async function register(event) {
    event.preventDefault();
    
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone')?.value.trim();
    const password = document.getElementById('reg-password').value;
    
    if (!name || !email || !password) {
        showToast('Please fill in required fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        showLoading('Creating account...');
        
        const res = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });
        
        const data = await res.json();
        
        if (data.success) {
            token = data.token;
            user = data.user;
            localStorage.setItem('token', token);
            
            showToast('Account created successfully!', 'success');
            showMainApp();
            initSocket();
            loadAllData();
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('[Register] Error:', error);
        showToast('Registration failed. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

function logout() {
    localStorage.removeItem('token');
    token = null;
    user = null;
    
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('main-section').classList.add('hidden');
    
    // Clear forms
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
}

function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
}

function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
}

function showMainApp() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('main-section').classList.remove('hidden');
    
    // Update user info
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-initial').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('user-plan').textContent = user.Plan?.name || 'Free Plan';
    
    // Update credits badge
    if (user.credits > 0) {
        document.getElementById('credits-badge').classList.remove('hidden');
        document.getElementById('credits-count').textContent = (user.credits - user.creditsUsed).toLocaleString();
    }
    
    // Load settings
    document.getElementById('setting-name').value = user.name;
    document.getElementById('setting-email').value = user.email;
    document.getElementById('setting-phone').value = user.phone || '';
    document.getElementById('setting-company').value = user.company || '';
    
    if (user.settings) {
        document.getElementById('setting-min-delay').value = (user.settings.minDelay || 3000) / 1000;
        document.getElementById('setting-max-delay').value = (user.settings.maxDelay || 8000) / 1000;
        document.getElementById('setting-batch-size').value = user.settings.batchSize || 50;
        document.getElementById('setting-timezone').value = user.settings.timezone || 'UTC';
    }
    
    // Plan info
    document.getElementById('plan-name').textContent = user.Plan?.name || 'Free Plan';
    document.getElementById('plan-limits').textContent = `${user.dailyLimit} messages/day • ${user.monthlyLimit} messages/month`;
}

// ==========================================
// SOCKET.IO
// ==========================================
function initSocket() {
    if (socket) {
        socket.disconnect();
    }
    
    socket = io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
    });
    
    socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id);
        socket.emit('join-room', user.id);
    });
    
    socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
    });
    
    socket.on('connect_error', (error) => {
        console.error('[Socket] Error:', error.message);
    });
    
    // WhatsApp Events
    socket.on('qr-code', (data) => {
        console.log('[Socket] QR Code received');
        showQrCode(data.qr);
    });
    
    socket.on('connection-status', (data) => {
        console.log('[Socket] Connection status:', data.status);
        if (data.status === 'connected') {
            updateConnectionStatus(true, data.phone);
        } else {
            updateConnectionStatus(false);
        }
    });
    
    socket.on('connection-timeout', (data) => {
        hideQrLoading();
        showToast(data.message, 'warning');
    });
    
    // Message Events
    socket.on('message-sent', (data) => {
        bulkStats.sent++;
        updateBulkProgress();
        addBulkLog(`✓ Sent to ${data.phone}`, 'success');
    });
    
    socket.on('message-failed', (data) => {
        bulkStats.failed++;
        updateBulkProgress();
        addBulkLog(`✗ Failed: ${data.phone} - ${data.error}`, 'error');
    });
    
    socket.on('bulk-complete', (data) => {
        bulkSending = false;
        resetBulkUI();
        showToast(`Bulk send complete! Sent: ${data.sent}, Failed: ${data.failed}`, 'success');
        loadDashboard();
    });
    
    // Campaign Events
    socket.on('campaign-started', (data) => {
        showToast(`Campaign started with ${data.totalContacts} contacts`, 'success');
        loadCampaigns();
    });
    
    socket.on('campaign-progress', (data) => {
        updateCampaignProgress(data);
    });
    
    socket.on('campaign-batch-pause', (data) => {
        showToast(data.message, 'info');
    });
    
    socket.on('campaign-complete', (data) => {
        showToast(`Campaign completed! Sent: ${data.sent}, Failed: ${data.failed}`, 'success');
        loadCampaigns();
        loadDashboard();
    });
    
    // Admin broadcast
    socket.on('admin-broadcast', (data) => {
        showToast(data.message, 'info');
    });
}

// ==========================================
// NAVIGATION
// ==========================================
function showTab(tabName) {
    currentTab = tabName;
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tabName) {
            item.classList.add('active');
        }
    });
    
    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'connection': 'WhatsApp Connection',
        'send': 'Send Message',
        'bulk': 'Bulk Sender',
        'campaigns': 'Campaigns',
        'contacts': 'Contacts',
        'templates': 'Templates',
        'autoreply': 'Auto Reply',
        'scheduled': 'Scheduled Messages',
        'api': 'API Keys',
        'webhooks': 'Webhooks',
        'analytics': 'Analytics',
        'settings': 'Settings'
    };
    document.getElementById('page-title').textContent = titles[tabName] || tabName;
    
    // Load tab data
    switch (tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'connection':
            checkWhatsAppStatus();
            break;
        case 'campaigns':
            loadCampaigns();
            break;
        case 'contacts':
            loadContacts();
            loadGroups();
            break;
        case 'templates':
            loadTemplates();
            break;
        case 'autoreply':
            loadAutoReplies();
            break;
        case 'scheduled':
            loadScheduledMessages();
            break;
        case 'api':
            loadApiKeys();
            break;
        case 'webhooks':
            loadWebhooks();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'send':
        case 'bulk':
            loadTemplatesForSelect();
            loadGroupsForSelect();
            break;
    }
    
    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function toggleUserMenu() {
    document.getElementById('user-dropdown').classList.toggle('hidden');
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// ==========================================
// LOADING & TOAST
// ==========================================
function showLoading(text = 'Loading...') {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const iconWrapper = document.getElementById('toast-icon-wrapper');
    const icon = document.getElementById('toast-icon');
    const title = document.getElementById('toast-title');
    const msg = document.getElementById('toast-message');
    
    const config = {
        success: { bg: 'bg-green-500/20', icon: 'fa-check-circle', color: 'text-green-500', title: 'Success' },
        error: { bg: 'bg-red-500/20', icon: 'fa-times-circle', color: 'text-red-500', title: 'Error' },
        warning: { bg: 'bg-yellow-500/20', icon: 'fa-exclamation-circle', color: 'text-yellow-500', title: 'Warning' },
        info: { bg: 'bg-blue-500/20', icon: 'fa-info-circle', color: 'text-blue-500', title: 'Info' }
    };
    
    const c = config[type] || config.info;
    
    iconWrapper.className = `w-10 h-10 rounded-full flex items-center justify-center ${c.bg}`;
    icon.className = `fas ${c.icon} text-xl ${c.color}`;
    title.textContent = c.title;
    msg.textContent = message;
    
    toast.classList.remove('hidden');
    
    setTimeout(() => hideToast(), 4000);
}

function hideToast() {
    document.getElementById('toast').classList.add('hidden');
}

// ==========================================
// WHATSAPP CONNECTION
// ==========================================
async function checkWhatsAppStatus() {
    try {
        const res = await apiRequest('/whatsapp/status');
        
        if (res.status?.connected) {
            updateConnectionStatus(true, res.status.phone);
        } else if (res.status?.qrCode) {
            showQrCode(res.status.qrCode);
        }
    } catch (error) {
        console.error('[WA Status] Error:', error);
    }
}

async function connectWA() {
    showQrLoading();
    
    try {
        await apiRequest('/whatsapp/connect', 'POST');
    } catch (error) {
        hideQrLoading();
        showToast('Failed to connect: ' + error.message, 'error');
    }
}

async function disconnectWA() {
    try {
        await apiRequest('/whatsapp/disconnect', 'POST');
        updateConnectionStatus(false);
        showToast('WhatsApp disconnected', 'success');
    } catch (error) {
        showToast('Failed to disconnect: ' + error.message, 'error');
    }
}

function showQrLoading() {
    document.getElementById('qr-placeholder').classList.add('hidden');
    document.getElementById('qr-image').classList.add('hidden');
    document.getElementById('qr-loading').classList.remove('hidden');
    document.getElementById('connect-btn').disabled = true;
}

function hideQrLoading() {
    document.getElementById('qr-loading').classList.add('hidden');
    document.getElementById('qr-placeholder').classList.remove('hidden');
    document.getElementById('connect-btn').disabled = false;
}

function showQrCode(qrDataUrl) {
    document.getElementById('qr-placeholder').classList.add('hidden');
    document.getElementById('qr-loading').classList.add('hidden');
    document.getElementById('qr-image').classList.remove('hidden');
    document.getElementById('qr-image').src = qrDataUrl;
}

function updateConnectionStatus(connected, phone = '') {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const statusPhone = document.getElementById('status-phone');
    
    if (connected) {
        statusDot.classList.remove('bg-red-500');
        statusDot.classList.add('bg-green-500');
        statusText.textContent = 'Connected';
        statusPhone.textContent = '+' + phone;
        
        document.getElementById('wa-disconnected').classList.add('hidden');
        document.getElementById('wa-connected').classList.remove('hidden');
        document.getElementById('wa-number').textContent = '+' + phone;
    } else {
        statusDot.classList.remove('bg-green-500');
        statusDot.classList.add('bg-red-500');
        statusText.textContent = 'Disconnected';
        statusPhone.textContent = 'Click to connect';
        
        document.getElementById('wa-disconnected').classList.remove('hidden');
        document.getElementById('wa-connected').classList.add('hidden');
        hideQrLoading();
    }
}

function setConnectionType(type) {
    connectionType = type;
    
    document.getElementById('conn-personal').classList.toggle('active', type === 'personal');
    document.getElementById('conn-official').classList.toggle('active', type === 'official');
    
    document.getElementById('official-api-settings').classList.toggle('hidden', type !== 'official');
    document.getElementById('wa-disconnected').classList.toggle('hidden', type === 'official');
}

async function saveOfficialApi() {
    const accessToken = document.getElementById('meta-token').value.trim();
    const phoneNumberId = document.getElementById('meta-phone-id').value.trim();
    const businessId = document.getElementById('meta-business-id').value.trim();
    
    if (!accessToken || !phoneNumberId) {
        showToast('Access token and Phone Number ID are required', 'error');
        return;
    }
    
    try {
        await apiRequest('/auth/profile', 'PUT', {
            metaAccessToken: accessToken,
            metaPhoneNumberId: phoneNumberId,
            metaBusinessId: businessId,
            connectionType: 'official'
        });
        
        showToast('Official API settings saved!', 'success');
    } catch (error) {
        showToast('Failed to save: ' + error.message, 'error');
    }
}

// ==========================================
// SEND MESSAGE
// ==========================================
async function sendMessage(event) {
    event.preventDefault();
    
    const phone = document.getElementById('msg-phone').value.trim();
    const message = document.getElementById('msg-text').value.trim();
    const mediaUrl = document.getElementById('msg-media-url')?.value.trim();
    
    if (!phone || !message) {
        showToast('Phone number and message are required', 'error');
        return;
    }
    
    const btn = document.getElementById('send-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending...';
    
    try {
        await apiRequest('/whatsapp/send', 'POST', {
            phone,
            message,
            mediaType: selectedMediaType !== 'none' ? selectedMediaType : null,
            mediaUrl: selectedMediaType !== 'none' ? mediaUrl : null
        });
        
        showToast('Message sent successfully!', 'success');
        document.getElementById('msg-phone').value = '';
        document.getElementById('msg-text').value = '';
        document.getElementById('msg-media-url').value = '';
        
        loadDashboard();
    } catch (error) {
        showToast('Failed to send: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Send Message';
    }
}

async function checkNumber() {
    const phone = document.getElementById('msg-phone').value.trim();
    
    if (!phone) {
        showToast('Please enter a phone number', 'error');
        return;
    }
    
    try {
        const res = await apiRequest('/whatsapp/check-number', 'POST', { phone });
        
        if (res.exists) {
            showToast('Number is valid on WhatsApp!', 'success');
        } else {
            showToast('Number not found on WhatsApp', 'warning');
        }
    } catch (error) {
        showToast('Check failed: ' + error.message, 'error');
    }
}

function setMediaType(type) {
    selectedMediaType = type;
    
    document.querySelectorAll('.media-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    
    document.getElementById('media-url-input').classList.toggle('hidden', type === 'none');
}

async function loadTemplate() {
    const templateId = document.getElementById('msg-template').value;
    if (!templateId) return;
    
    try {
        const res = await apiRequest(`/templates/${templateId}`);
        document.getElementById('msg-text').value = res.template.content;
        
        if (res.template.mediaType !== 'none') {
            setMediaType(res.template.mediaType);
            document.getElementById('msg-media-url').value = res.template.mediaUrl || '';
        }
    } catch (error) {
        showToast('Failed to load template', 'error');
    }
}

// ==========================================
// BULK SENDER
// ==========================================
function setRecipientType(type) {
    selectedRecipientType = type;
    
    document.getElementById('recipient-groups').classList.toggle('active', type === 'groups');
    document.getElementById('recipient-manual').classList.toggle('active', type === 'manual');
    
    document.getElementById('groups-select').classList.toggle('hidden', type !== 'groups');
    document.getElementById('manual-input').classList.toggle('hidden', type !== 'manual');
}

function toggleBulkMedia() {
    const mediaType = document.getElementById('bulk-media-type').value;
    document.getElementById('bulk-media-url-input').classList.toggle('hidden', mediaType === 'none');
}

async function loadBulkTemplate() {
    const templateId = document.getElementById('bulk-template').value;
    if (!templateId) return;
    
    try {
        const res = await apiRequest(`/templates/${templateId}`);
        document.getElementById('bulk-message').value = res.template.content;
        
        document.getElementById('bulk-media-type').value = res.template.mediaType || 'none';
        toggleBulkMedia();
        
        if (res.template.mediaUrl) {
            document.getElementById('bulk-media-url').value = res.template.mediaUrl;
        }
        
        document.getElementById('use-spintax').checked = res.template.useSpintax || false;
    } catch (error) {
        showToast('Failed to load template', 'error');
    }
}

async function startBulkSend() {
    const message = document.getElementById('bulk-message').value.trim();
    
    if (!message) {
        showToast('Please enter a message', 'error');
        return;
    }
    
    // Get recipients
    let messages = [];
    
    if (selectedRecipientType === 'groups') {
        const selectedGroups = Array.from(document.getElementById('bulk-groups').selectedOptions).map(o => o.value);
        
        if (selectedGroups.length === 0) {
            showToast('Please select at least one group', 'error');
            return;
        }
        
        // Load contacts from selected groups
        try {
            for (const groupId of selectedGroups) {
                const res = await apiRequest(`/contacts?groupId=${groupId}&limit=10000`);
                res.contacts.forEach(contact => {
                    messages.push({
                        phone: contact.phone,
                        message,
                        variables: {
                            name: contact.name || '',
                            phone: contact.phone,
                            ...contact.variables
                        }
                    });
                });
            }
        } catch (error) {
            showToast('Failed to load contacts', 'error');
            return;
        }
    } else {
        const numbers = document.getElementById('bulk-numbers').value.split('\n').filter(n => n.trim());
        
        if (numbers.length === 0) {
            showToast('Please enter phone numbers', 'error');
            return;
        }
        
        messages = numbers.map(phone => ({
            phone: phone.trim(),
            message,
            variables: { phone: phone.trim() }
        }));
    }
    
    // Remove duplicates
    if (document.getElementById('skip-duplicates').checked) {
        const seen = new Set();
        messages = messages.filter(m => {
            const phone = m.phone.replace(/\D/g, '');
            if (seen.has(phone)) return false;
            seen.add(phone);
            return true;
        });
    }
    
    if (messages.length === 0) {
        showToast('No valid contacts found', 'error');
        return;
    }
    
    // Get settings
    const mediaType = document.getElementById('bulk-media-type').value;
    const mediaUrl = document.getElementById('bulk-media-url')?.value;
    
    if (mediaType !== 'none') {
        messages = messages.map(m => ({
            ...m,
            mediaType,
            mediaUrl
        }));
    }
    
    const settings = {
        minDelay: parseInt(document.getElementById('min-delay').value) * 1000,
        maxDelay: parseInt(document.getElementById('max-delay').value) * 1000,
        useSpintax: document.getElementById('use-spintax').checked
    };
    
    // Initialize progress
    bulkStats = { total: messages.length, sent: 0, failed: 0 };
    bulkSending = true;
    
    updateBulkProgress();
    clearBulkLog();
    addBulkLog(`Starting bulk send to ${messages.length} contacts...`, 'info');
    
    // Update UI
    document.getElementById('start-bulk-btn').classList.add('hidden');
    document.getElementById('pause-bulk-btn').classList.remove('hidden');
    document.getElementById('stop-bulk-btn').classList.remove('hidden');
    
    // Send request
    try {
        await apiRequest('/whatsapp/send-bulk', 'POST', { messages, settings });
    } catch (error) {
        showToast('Bulk send failed: ' + error.message, 'error');
        resetBulkUI();
    }
}

function pauseBulkSend() {
    // TODO: Implement pause functionality
    showToast('Pause functionality coming soon', 'info');
}

function stopBulkSend() {
    bulkSending = false;
    resetBulkUI();
    addBulkLog('Bulk send stopped by user', 'warning');
    showToast('Bulk send stopped', 'warning');
}

function updateBulkProgress() {
    const total = bulkStats.total;
    const sent = bulkStats.sent;
    const failed = bulkStats.failed;
    const remaining = total - sent - failed;
    const progress = total > 0 ? ((sent + failed) / total * 100) : 0;
    
    document.getElementById('bulk-total').textContent = total;
    document.getElementById('bulk-sent').textContent = sent;
    document.getElementById('bulk-failed').textContent = failed;
    document.getElementById('bulk-remaining').textContent = remaining;
    document.getElementById('progress-percent').textContent = progress.toFixed(0) + '%';
    
    // Update progress circle
    const circle = document.getElementById('progress-circle');
    const circumference = 402; // 2 * π * 64
    const offset = circumference - (progress / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

function addBulkLog(message, type = 'info') {
    const log = document.getElementById('bulk-log');
    const time = new Date().toLocaleTimeString();
    
    const entry = document.createElement('div');
    entry.className = `log-${type}`;
    entry.textContent = `[${time}] ${message}`;
    
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

function clearBulkLog() {
    document.getElementById('bulk-log').innerHTML = '';
}

function resetBulkUI() {
    document.getElementById('start-bulk-btn').classList.remove('hidden');
    document.getElementById('pause-bulk-btn').classList.add('hidden');
    document.getElementById('stop-bulk-btn').classList.add('hidden');
}

// ==========================================
// CAMPAIGNS
// ==========================================
async function loadCampaigns() {
    try {
        const res = await apiRequest('/campaigns');
        
        const container = document.getElementById('campaigns-list');
        
        if (!res.campaigns || res.campaigns.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <i class="fas fa-bullhorn text-5xl mb-4 opacity-30"></i>
                    <p>No campaigns yet. Create your first campaign!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = res.campaigns.map(campaign => `
            <div class="campaign-card mb-4">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3">
                            <h4 class="font-semibold text-lg">${escapeHtml(campaign.name)}</h4>
                            <span class="badge badge-${campaign.status}">${campaign.status}</span>
                        </div>
                        <div class="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                            <span><i class="fas fa-users mr-1"></i>${campaign.totalContacts || 0} contacts</span>
                            <span><i class="fas fa-check mr-1"></i>${campaign.sentCount || 0} sent</span>
                            <span><i class="fas fa-times mr-1"></i>${campaign.failedCount || 0} failed</span>
                            <span><i class="fas fa-clock mr-1"></i>${formatDate(campaign.createdAt)}</span>
                        </div>
                        ${campaign.status === 'running' ? `
                            <div class="mt-3">
                                <div class="w-full bg-gray-700 rounded-full h-2">
                                    <div class="bg-green-500 h-2 rounded-full transition-all" style="width: ${((campaign.sentCount + campaign.failedCount) / campaign.totalContacts * 100).toFixed(0)}%"></div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="flex space-x-2 ml-4">
                        ${campaign.status === 'draft' ? `
                            <button onclick="startCampaign('${campaign.id}')" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition" title="Start">
                                <i class="fas fa-play"></i>
                            </button>
                        ` : ''}
                        ${campaign.status === 'running' ? `
                            <button onclick="pauseCampaign('${campaign.id}')" class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition" title="Pause">
                                <i class="fas fa-pause"></i>
                            </button>
                        ` : ''}
                        ${campaign.status === 'paused' ? `
                            <button onclick="resumeCampaign('${campaign.id}')" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition" title="Resume">
                                <i class="fas fa-play"></i>
                            </button>
                        ` : ''}
                        <button onclick="viewCampaign('${campaign.id}')" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="deleteCampaign('${campaign.id}')" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showToast('Failed to load campaigns', 'error');
    }
}

function showCampaignModal() {
    loadGroupsForCampaign();
    document.getElementById('campaign-modal').classList.add('active');
}

async function loadGroupsForCampaign() {
    try {
        const res = await apiRequest('/contacts/groups');
        const select = document.getElementById('campaign-groups');
        
        if (res.groups && res.groups.length > 0) {
            select.innerHTML = res.groups.map(g => 
                `<option value="${g.id}">${escapeHtml(g.name)} (${g.contactCount || 0})</option>`
            ).join('');
        } else {
            select.innerHTML = '<option disabled>No groups available</option>';
        }
    } catch (error) {
        console.error('Failed to load groups for campaign:', error);
    }
}

function setCampaignTargetType(type) {
    selectedCampaignTargetType = type;
    
    document.getElementById('campaign-target-groups').classList.toggle('active', type === 'groups');
    document.getElementById('campaign-target-numbers').classList.toggle('active', type === 'numbers');
    
    document.getElementById('campaign-groups-select').classList.toggle('hidden', type !== 'groups');
    document.getElementById('campaign-numbers-input').classList.toggle('hidden', type !== 'numbers');
}

async function createCampaign(startNow) {
    const name = document.getElementById('campaign-name').value.trim();
    const message = document.getElementById('campaign-message').value.trim();
    
    if (!name || !message) {
        showToast('Name and message are required', 'error');
        return;
    }
    
    let targetGroups = [];
    let targetNumbers = '';
    
    if (selectedCampaignTargetType === 'groups') {
        targetGroups = Array.from(document.getElementById('campaign-groups').selectedOptions).map(o => o.value);
        if (targetGroups.length === 0) {
            showToast('Please select at least one group', 'error');
            return;
        }
    } else {
        targetNumbers = document.getElementById('campaign-numbers').value;
        if (!targetNumbers.trim()) {
            showToast('Please enter phone numbers', 'error');
            return;
        }
    }
    
    try {
        const res = await apiRequest('/campaigns', 'POST', {
            name,
            message,
            targetType: selectedCampaignTargetType,
            targetGroups,
            targetNumbers,
            settings: {
                minDelay: parseInt(document.getElementById('campaign-min-delay').value) * 1000,
                maxDelay: parseInt(document.getElementById('campaign-max-delay').value) * 1000
            }
        });
        
        closeModal('campaign-modal');
        showToast('Campaign created!', 'success');
        
        if (startNow && res.campaign) {
            await startCampaign(res.campaign.id);
        }
        
        loadCampaigns();
        
        // Reset form
        document.getElementById('campaign-name').value = '';
        document.getElementById('campaign-message').value = '';
        document.getElementById('campaign-numbers').value = '';
    } catch (error) {
        showToast('Failed to create campaign: ' + error.message, 'error');
    }
}

async function startCampaign(id) {
    try {
        await apiRequest(`/campaigns/${id}/start`, 'POST');
        showToast('Campaign started!', 'success');
        loadCampaigns();
    } catch (error) {
        showToast('Failed to start: ' + error.message, 'error');
    }
}

async function pauseCampaign(id) {
    try {
        await apiRequest(`/campaigns/${id}/pause`, 'POST');
        showToast('Campaign paused', 'success');
        loadCampaigns();
    } catch (error) {
        showToast('Failed to pause: ' + error.message, 'error');
    }
}

async function resumeCampaign(id) {
    try {
        await apiRequest(`/campaigns/${id}/resume`, 'POST');
        showToast('Campaign resumed!', 'success');
        loadCampaigns();
    } catch (error) {
        showToast('Failed to resume: ' + error.message, 'error');
    }
}

async function deleteCampaign(id) {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
        await apiRequest(`/campaigns/${id}`, 'DELETE');
        showToast('Campaign deleted', 'success');
        loadCampaigns();
    } catch (error) {
        showToast('Failed to delete: ' + error.message, 'error');
    }
}

function updateCampaignProgress(data) {
    // Update campaign card in real-time if visible
    loadCampaigns();
}

// ==========================================
// CONTACTS
// ==========================================
let contactsPage = 1;

async function loadContacts(page = 1) {
    contactsPage = page;
    
    try {
        const search = document.getElementById('contact-search')?.value || '';
        const groupId = document.getElementById('contact-group-filter')?.value || '';
        
        const res = await apiRequest(`/contacts?page=${page}&limit=50&search=${encodeURIComponent(search)}&groupId=${groupId}`);
        
        const tbody = document.getElementById('contacts-table');
        
        if (!res.contacts || res.contacts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-500">No contacts found</td></tr>';
            document.getElementById('contacts-count').textContent = '0 contacts';
            return;
        }
        
        tbody.innerHTML = res.contacts.map(contact => `
            <tr>
                <td class="px-4 py-3">
                    <input type="checkbox" class="contact-checkbox w-4 h-4" value="${contact.id}">
                </td>
                <td class="px-4 py-3 font-mono text-sm">${escapeHtml(contact.phone)}</td>
                <td class="px-4 py-3">${escapeHtml(contact.name || '-')}</td>
                <td class="px-4 py-3">
                    ${contact.ContactGroup ? `
                        <span class="px-2 py-1 rounded-full text-xs" style="background: ${contact.ContactGroup.color}20; color: ${contact.ContactGroup.color}">
                            ${escapeHtml(contact.ContactGroup.name)}
                        </span>
                    ` : '-'}
                </td>
                <td class="px-4 py-3">
                    <span class="badge ${contact.isValid ? 'badge-sent' : 'badge-failed'}">
                        ${contact.isValid ? 'Valid' : 'Invalid'}
                    </span>
                </td>
                <td class="px-4 py-3">
                    <button onclick="editContact('${contact.id}')" class="text-blue-500 hover:text-blue-400 mr-2" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteContact('${contact.id}')" class="text-red-500 hover:text-red-400" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        document.getElementById('contacts-count').textContent = `${res.pagination.total} contacts`;
        
        // Update group filter
        updateGroupFilter();
    } catch (error) {
        showToast('Failed to load contacts', 'error');
    }
}

async function loadGroups() {
    try {
        const res = await apiRequest('/contacts/groups');
        
        const grid = document.getElementById('groups-grid');
        
        let html = `
            <button onclick="showCreateGroupModal()" class="border-2 border-dashed border-gray-600 rounded-2xl p-8 flex flex-col items-center justify-center hover:border-green-500 hover:bg-green-500/5 transition min-h-[200px]">
                <i class="fas fa-plus text-3xl text-gray-400 mb-3"></i>
                <span class="text-gray-400">Create New Group</span>
            </button>
        `;
        
        if (res.groups && res.groups.length > 0) {
            html += res.groups.map(group => `
                <div class="group-card" style="--group-color: ${group.color}">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background: ${group.color}20">
                            <i class="fas fa-users text-xl" style="color: ${group.color}"></i>
                        </div>
                        <div class="flex space-x-2">
                            <button onclick="editGroup('${group.id}')" class="text-gray-400 hover:text-white transition">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="deleteGroup('${group.id}')" class="text-gray-400 hover:text-red-500 transition">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <h4 class="font-semibold text-lg">${escapeHtml(group.name)}</h4>
                    <p class="text-gray-400 text-sm mt-1">${group.contactCount || 0} contacts</p>
                    ${group.description ? `<p class="text-gray-500 text-sm mt-2 line-clamp-2">${escapeHtml(group.description)}</p>` : ''}
                </div>
            `).join('');
        }
        
        grid.innerHTML = html;
    } catch (error) {
        showToast('Failed to load groups', 'error');
    }
}

async function updateGroupFilter() {
    try {
        const res = await apiRequest('/contacts/groups');
        const select = document.getElementById('contact-group-filter');
        
        select.innerHTML = '<option value="">All Groups</option>';
        
        if (res.groups) {
            select.innerHTML += res.groups.map(g => 
                `<option value="${g.id}">${escapeHtml(g.name)}</option>`
            ).join('');
        }
    } catch (error) {
        console.error('Failed to update group filter:', error);
    }
}

function showContactsView(view) {
    document.getElementById('view-contacts-btn').classList.toggle('bg-green-600', view === 'contacts');
    document.getElementById('view-contacts-btn').classList.toggle('bg-gray-700', view !== 'contacts');
    document.getElementById('view-groups-btn').classList.toggle('bg-green-600', view === 'groups');
    document.getElementById('view-groups-btn').classList.toggle('bg-gray-700', view !== 'groups');
    
    document.getElementById('contacts-view').classList.toggle('hidden', view !== 'contacts');
    document.getElementById('groups-view').classList.toggle('hidden', view !== 'groups');
    
    if (view === 'groups') {
        loadGroups();
    }
}

function searchContacts() {
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => loadContacts(1), 300);
}

function filterContacts() {
    loadContacts(1);
}

function showAddContactModal() {
    loadGroupsForContactSelect();
    document.getElementById('contact-modal').classList.add('active');
}

async function loadGroupsForContactSelect() {
    try {
        const res = await apiRequest('/contacts/groups');
        
        const selects = ['contact-group', 'import-group'];
        selects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">No Group</option>';
                if (res.groups) {
                    select.innerHTML += res.groups.map(g => 
                        `<option value="${g.id}">${escapeHtml(g.name)}</option>`
                    ).join('');
                }
            }
        });
    } catch (error) {
        console.error('Failed to load groups for select:', error);
    }
}

async function addContact() {
    const phone = document.getElementById('contact-phone').value.trim();
    const name = document.getElementById('contact-name').value.trim();
    const groupId = document.getElementById('contact-group').value;
    
    if (!phone) {
        showToast('Phone number is required', 'error');
        return;
    }
    
    try {
        await apiRequest('/contacts', 'POST', {
            phone,
            name,
            groupId: groupId || null
        });
        
        closeModal('contact-modal');
        showToast('Contact added!', 'success');
        loadContacts();
        loadGroups();
        
        document.getElementById('contact-phone').value = '';
        document.getElementById('contact-name').value = '';
    } catch (error) {
        showToast('Failed to add contact: ' + error.message, 'error');
    }
}

async function deleteContact(id) {
    if (!confirm('Delete this contact?')) return;
    
    try {
        await apiRequest(`/contacts/${id}`, 'DELETE');
        showToast('Contact deleted', 'success');
        loadContacts(contactsPage);
    } catch (error) {
        showToast('Failed to delete: ' + error.message, 'error');
    }
}

function showCreateGroupModal() {
    document.getElementById('group-modal').classList.add('active');
}

function setGroupColor(color) {
    selectedGroupColor = color;
    document.getElementById('group-color').value = color;
    
    document.querySelectorAll('.group-color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === color);
    });
}

async function createGroup() {
    const name = document.getElementById('group-name').value.trim();
    const description = document.getElementById('group-description').value.trim();
    
    if (!name) {
        showToast('Group name is required', 'error');
        return;
    }
    
    try {
        await apiRequest('/contacts/groups', 'POST', {
            name,
            description,
            color: selectedGroupColor
        });
        
        closeModal('group-modal');
        showToast('Group created!', 'success');
        loadGroups();
        updateGroupFilter();
        
        document.getElementById('group-name').value = '';
        document.getElementById('group-description').value = '';
    } catch (error) {
        showToast('Failed to create group: ' + error.message, 'error');
    }
}

async function deleteGroup(id) {
    if (!confirm('Delete this group? Contacts will be moved to no group.')) return;
    
    try {
        await apiRequest(`/contacts/groups/${id}`, 'DELETE');
        showToast('Group deleted', 'success');
        loadGroups();
        loadContacts();
    } catch (error) {
        showToast('Failed to delete: ' + error.message, 'error');
    }
}

function showImportModal() {
    loadGroupsForContactSelect();
    document.getElementById('import-modal').classList.add('active');
}

function handleImportFile(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('import-file-info').classList.remove('hidden');
        document.getElementById('import-file-name').textContent = file.name;
    }
}

async function importContacts() {
    const fileInput = document.getElementById('import-file');
    const groupId = document.getElementById('import-group').value;
    
    if (!fileInput.files[0]) {
        showToast('Please select a file', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('groupId', groupId);
    
    try {
        showLoading('Importing contacts...');
        
        const res = await fetch(`${API}/contacts/import`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        const data = await res.json();
        
        if (data.success) {
            closeModal('import-modal');
            showToast(`Imported: ${data.results.success}, Duplicates: ${data.results.duplicates}, Failed: ${data.results.failed}`, 'success');
            loadContacts();
            loadGroups();
            
            document.getElementById('import-file').value = '';
            document.getElementById('import-file-info').classList.add('hidden');
        } else {
            showToast(data.error || 'Import failed', 'error');
        }
    } catch (error) {
        showToast('Import failed: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function exportContacts() {
    window.open(`${API}/contacts/export?token=${token}`, '_blank');
}

// ==========================================
// TEMPLATES
// ==========================================
async function loadTemplates() {
    try {
        const res = await apiRequest('/templates');
        
        const grid = document.getElementById('templates-grid');
        
        if (!res.templates || res.templates.length === 0) {
            grid.innerHTML = `
                <div class="text-center py-12 text-gray-500 col-span-full">
                    <i class="fas fa-file-alt text-5xl mb-4 opacity-30"></i>
                    <p>No templates yet. Create your first template!</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = res.templates.map(template => `
            <div class="template-card ${template.isLocked ? 'locked' : ''} relative">
                ${template.isLocked ? '<div class="absolute top-3 right-3 text-yellow-500"><i class="fas fa-lock"></i></div>' : ''}
                <div class="flex items-center justify-between mb-3">
                    <span class="px-2 py-1 bg-gray-700 rounded-lg text-xs">${escapeHtml(template.category)}</span>
                    ${!template.isLocked ? `
                        <div class="flex space-x-2">
                            <button onclick="editTemplate('${template.id}')" class="text-gray-400 hover:text-white"><i class="fas fa-edit"></i></button>
                            <button onclick="duplicateTemplate('${template.id}')" class="text-gray-400 hover:text-blue-500"><i class="fas fa-copy"></i></button>
                            <button onclick="deleteTemplate('${template.id}')" class="text-gray-400 hover:text-red-500"><i class="fas fa-trash"></i></button>
                        </div>
                    ` : ''}
                </div>
                <h4 class="font-semibold mb-2">${escapeHtml(template.name)}</h4>
                <p class="text-gray-400 text-sm line-clamp-3">${escapeHtml(template.content.substring(0, 150))}${template.content.length > 150 ? '...' : ''}</p>
                <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">
                    <span>
                        ${template.mediaType !== 'none' ? `<i class="fas fa-${template.mediaType === 'image' ? 'image' : template.mediaType === 'video' ? 'video' : 'file'} mr-1"></i>${template.mediaType}` : 'No media'}
                    </span>
                    <span>Used ${template.usageCount || 0} times</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showToast('Failed to load templates', 'error');
    }
}

async function loadTemplatesForSelect() {
    try {
        const res = await apiRequest('/templates');
        
        const selects = ['msg-template', 'bulk-template'];
        selects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">Select a template...</option>';
                if (res.templates) {
                    select.innerHTML += res.templates.map(t => 
                        `<option value="${t.id}">${escapeHtml(t.name)}</option>`
                    ).join('');
                }
            }
        });
    } catch (error) {
        console.error('Failed to load templates for select:', error);
    }
}

function showCreateTemplateModal() {
    document.getElementById('template-modal').classList.add('active');
}

function toggleTemplateMedia() {
    const mediaType = document.getElementById('template-media-type').value;
    document.getElementById('template-media-url-input').classList.toggle('hidden', mediaType === 'none');
}

async function createTemplate() {
    const name = document.getElementById('template-name').value.trim();
    const content = document.getElementById('template-content').value.trim();
    const category = document.getElementById('template-category').value;
    const mediaType = document.getElementById('template-media-type').value;
    const mediaUrl = document.getElementById('template-media-url')?.value.trim();
    const footer = document.getElementById('template-footer')?.value.trim();
    const useSpintax = document.getElementById('template-spintax').checked;
    
    if (!name || !content) {
        showToast('Name and content are required', 'error');
        return;
    }
    
    try {
        await apiRequest('/templates', 'POST', {
            name,
            content,
            category,
            mediaType,
            mediaUrl: mediaType !== 'none' ? mediaUrl : null,
            footer,
            useSpintax
        });
        
        closeModal('template-modal');
        showToast('Template created!', 'success');
        loadTemplates();
        
        // Reset form
        document.getElementById('template-name').value = '';
        document.getElementById('template-content').value = '';
        document.getElementById('template-footer').value = '';
        document.getElementById('template-spintax').checked = false;
    } catch (error) {
        showToast('Failed to create template: ' + error.message, 'error');
    }
}

async function deleteTemplate(id) {
    if (!confirm('Delete this template?')) return;
    
    try {
        await apiRequest(`/templates/${id}`, 'DELETE');
        showToast('Template deleted', 'success');
        loadTemplates();
    } catch (error) {
        showToast('Failed to delete: ' + error.message, 'error');
    }
}

async function duplicateTemplate(id) {
    try {
        await apiRequest(`/templates/${id}/duplicate`, 'POST');
        showToast('Template duplicated!', 'success');
        loadTemplates();
    } catch (error) {
        showToast('Failed to duplicate: ' + error.message, 'error');
    }
}

// ==========================================
// API KEYS
// ==========================================
async function loadApiKeys() {
    try {
        const res = await apiRequest('/external/keys');
        
        const container = document.getElementById('api-keys-list');
        
        if (!res.keys || res.keys.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-key text-4xl mb-4 opacity-30"></i>
                    <p>No API keys generated yet</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = res.keys.map(key => `
            <div class="flex items-center justify-between p-4 bg-gray-700/50 rounded-xl mb-4">
                <div class="flex-1">
                    <div class="flex items-center space-x-3">
                        <h4 class="font-semibold">${escapeHtml(key.name)}</h4>
                        <span class="badge ${key.isActive ? 'badge-sent' : 'badge-failed'}">${key.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div class="api-key-display mt-2">${key.key.substring(0, 30)}...</div>
                    <div class="text-xs text-gray-500 mt-2">
                        Created: ${formatDate(key.createdAt)} • Requests: ${key.requestCount || 0}
                        ${key.lastUsed ? ` • Last used: ${formatDate(key.lastUsed)}` : ''}
                    </div>
                </div>
                <div class="flex space-x-2 ml-4">
                    <button onclick="toggleApiKey('${key.id}', ${!key.isActive})" class="px-3 py-2 ${key.isActive ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} rounded-lg transition text-sm">
                        ${key.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onclick="deleteApiKey('${key.id}')" class="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition text-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showToast('Failed to load API keys', 'error');
    }
}

function showCreateApiKeyModal() {
    document.getElementById('api-key-modal').classList.add('active');
}

async function generateApiKey() {
    const name = document.getElementById('api-key-name').value.trim();
    const rateLimit = document.getElementById('api-rate-limit').value;
    const permissions = Array.from(document.querySelectorAll('.api-permission:checked')).map(cb => cb.value);
    
    if (!name) {
        showToast('Key name is required', 'error');
        return;
    }
    
    try {
        const res = await apiRequest('/external/keys', 'POST', {
            name,
            permissions,
            rateLimit: parseInt(rateLimit)
        });
        
        closeModal('api-key-modal');
        
        // Show result modal
        document.getElementById('generated-api-key').value = res.apiKey.key;
        document.getElementById('generated-api-secret').value = res.apiKey.secret;
        document.getElementById('api-key-result-modal').classList.add('active');
        
        document.getElementById('api-key-name').value = '';
    } catch (error) {
        showToast('Failed to generate API key: ' + error.message, 'error');
    }
}

async function toggleApiKey(id, isActive) {
    try {
        await apiRequest(`/external/keys/${id}`, 'PUT', { isActive });
        showToast(`API key ${isActive ? 'enabled' : 'disabled'}`, 'success');
        loadApiKeys();
    } catch (error) {
        showToast('Failed: ' + error.message, 'error');
    }
}

async function deleteApiKey(id) {
    if (!confirm('Revoke this API key?')) return;
    
    try {
        await apiRequest(`/external/keys/${id}`, 'DELETE');
        showToast('API key revoked', 'success');
        loadApiKeys();
    } catch (error) {
        showToast('Failed: ' + error.message, 'error');
    }
}

// ==========================================
// WEBHOOKS
// ==========================================
async function loadWebhooks() {
    try {
        const res = await apiRequest('/webhooks');
        
        const container = document.getElementById('webhooks-list');
        
        if (!res.webhooks || res.webhooks.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <i class="fas fa-globe text-5xl mb-4 opacity-30"></i>
                    <p>No webhooks configured</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = res.webhooks.map(webhook => `
            <div class="flex items-center justify-between p-4 bg-gray-700/50 rounded-xl mb-4">
                <div class="flex-1">
                    <div class="flex items-center space-x-3">
                        <span class="webhook-status ${webhook.isActive ? 'active' : 'inactive'}"></span>
                        <h4 class="font-semibold">${escapeHtml(webhook.name)}</h4>
                    </div>
                    <p class="text-sm text-gray-400 mt-1 truncate">${escapeHtml(webhook.url)}</p>
                    <div class="flex flex-wrap gap-2 mt-2">
                        ${webhook.events.map(e => `<span class="px-2 py-1 bg-gray-600 rounded text-xs">${e}</span>`).join('')}
                    </div>
                    <div class="text-xs text-gray-500 mt-2">
                        Success: ${webhook.successCalls || 0} • Failed: ${webhook.failedCalls || 0}
                    </div>
                </div>
                <div class="flex space-x-2 ml-4">
                    <button onclick="testWebhook('${webhook.id}')" class="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm" title="Test">
                        <i class="fas fa-bolt"></i>
                    </button>
                    <button onclick="deleteWebhook('${webhook.id}')" class="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition text-sm" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showToast('Failed to load webhooks', 'error');
    }
}

function showCreateWebhookModal() {
    document.getElementById('webhook-modal').classList.add('active');
}

async function createWebhook() {
    const name = document.getElementById('webhook-name').value.trim();
    const url = document.getElementById('webhook-url').value.trim();
    const secret = document.getElementById('webhook-secret')?.value.trim();
    const events = Array.from(document.querySelectorAll('.webhook-event:checked')).map(cb => cb.value);
    
    if (!name || !url) {
        showToast('Name and URL are required', 'error');
        return;
    }
    
    try {
        await apiRequest('/webhooks', 'POST', {
            name,
            url,
            secret,
            events
        });
        
        closeModal('webhook-modal');
        showToast('Webhook created!', 'success');
        loadWebhooks();
        
        document.getElementById('webhook-name').value = '';
        document.getElementById('webhook-url').value = '';
        document.getElementById('webhook-secret').value = '';
    } catch (error) {
        showToast('Failed to create webhook: ' + error.message, 'error');
    }
}

async function testWebhook(id) {
    try {
        await apiRequest(`/webhooks/${id}/test`, 'POST');
        showToast('Test webhook sent!', 'success');
    } catch (error) {
        showToast('Test failed: ' + error.message, 'error');
    }
}

async function deleteWebhook(id) {
    if (!confirm('Delete this webhook?')) return;
    
    try {
        await apiRequest(`/webhooks/${id}`, 'DELETE');
        showToast('Webhook deleted', 'success');
        loadWebhooks();
    } catch (error) {
        showToast('Failed: ' + error.message, 'error');
    }
}

// ==========================================
// AUTO REPLY
// ==========================================
async function loadAutoReplies() {
    try {
        const res = await apiRequest('/autoreply');
        
        const container = document.getElementById('autoreply-list');
        
        if (!res.rules || res.rules.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <i class="fas fa-robot text-5xl mb-4 opacity-30"></i>
                    <p>No auto-reply rules yet</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = res.rules.map(rule => `
            <div class="flex items-center justify-between p-4 bg-gray-700/50 rounded-xl mb-4">
                <div class="flex-1">
                    <div class="flex items-center space-x-3">
                        <span class="badge ${rule.isActive ? 'badge-sent' : 'badge-failed'}">${rule.isActive ? 'Active' : 'Inactive'}</span>
                        <h4 class="font-semibold">${escapeHtml(rule.name)}</h4>
                    </div>
                    <div class="text-sm text-gray-400 mt-2">
                        <span class="text-blue-400">${rule.triggerType}:</span> ${escapeHtml(rule.triggerValue || 'Any message')}
                    </div>
                    <p class="text-sm text-gray-500 mt-1 truncate">${escapeHtml(rule.responseContent?.substring(0, 100) || '')}</p>
                </div>
                <div class="flex space-x-2 ml-4">
                    <button onclick="toggleAutoReplyRule('${rule.id}', ${!rule.isActive})" class="px-3 py-2 ${rule.isActive ? 'bg-yellow-600' : 'bg-green-600'} rounded-lg transition text-sm">
                        ${rule.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onclick="deleteAutoReplyRule('${rule.id}')" class="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition text-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load auto-replies:', error);
    }
}

// ==========================================
// SCHEDULED MESSAGES
// ==========================================
async function loadScheduledMessages() {
    try {
        const res = await apiRequest('/scheduled');
        
        const container = document.getElementById('scheduled-list');
        
        if (!res.messages || res.messages.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <i class="fas fa-clock text-5xl mb-4 opacity-30"></i>
                    <p>No scheduled messages</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = res.messages.map(msg => `
            <div class="flex items-center justify-between p-4 bg-gray-700/50 rounded-xl mb-4">
                <div class="flex-1">
                    <div class="flex items-center space-x-3">
                        <span class="badge badge-${msg.status}">${msg.status}</span>
                        <span class="font-mono text-sm">${escapeHtml(msg.phone)}</span>
                    </div>
                    <p class="text-sm text-gray-400 mt-2 truncate">${escapeHtml(msg.message.substring(0, 100))}</p>
                    <div class="text-xs text-gray-500 mt-2">
                        <i class="fas fa-clock mr-1"></i>Scheduled: ${formatDateTime(msg.scheduledAt)}
                        ${msg.recurring ? '<span class="ml-2 text-blue-400"><i class="fas fa-sync mr-1"></i>Recurring</span>' : ''}
                    </div>
                </div>
                <div class="flex space-x-2 ml-4">
                    <button onclick="cancelScheduledMessage('${msg.id}')" class="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition text-sm">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load scheduled messages:', error);
    }
}

// ==========================================
// ANALYTICS
// ==========================================
async function loadAnalytics() {
    try {
        const res = await apiRequest('/analytics/dashboard');
        
        // Update stats
        document.getElementById('analytics-sent').textContent = res.stats?.messages?.total || 0;
        document.getElementById('analytics-delivered').textContent = res.stats?.messages?.breakdown?.find(b => b.status === 'delivered')?.count || 0;
        document.getElementById('analytics-read').textContent = res.stats?.messages?.breakdown?.find(b => b.status === 'read')?.count || 0;
        document.getElementById('analytics-failed').textContent = res.stats?.messages?.breakdown?.find(b => b.status === 'failed')?.count || 0;
        
        // Create charts
        createAnalyticsChart(res.stats?.dailyStats || []);
        createDeliveryChart(res.stats?.messages?.breakdown || []);
        
        // Load message history
        loadMessageHistory();
    } catch (error) {
        showToast('Failed to load analytics', 'error');
    }
}

function createAnalyticsChart(data) {
    const ctx = document.getElementById('analytics-chart')?.getContext('2d');
    if (!ctx) return;
    
    if (analyticsChart) {
        analyticsChart.destroy();
    }
    
    analyticsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'Messages',
                data: data.map(d => d.count),
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#374151' } },
                x: { grid: { color: '#374151' } }
            }
        }
    });
}

function createDeliveryChart(data) {
    const ctx = document.getElementById('delivery-chart')?.getContext('2d');
    if (!ctx) return;
    
    if (deliveryChart) {
        deliveryChart.destroy();
    }
    
    const colors = {
        sent: '#22c55e',
        delivered: '#3b82f6',
        read: '#8b5cf6',
        failed: '#ef4444',
        pending: '#f59e0b'
    };
    
    deliveryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.status),
            datasets: [{
                data: data.map(d => d.count),
                backgroundColor: data.map(d => colors[d.status] || '#6b7280')
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

async function loadMessageHistory() {
    try {
        const status = document.getElementById('history-filter')?.value || '';
        const res = await apiRequest(`/analytics/messages?status=${status}&limit=50`);
        
        const tbody = document.getElementById('history-table');
        
        if (!res.messages || res.messages.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-gray-500">No messages found</td></tr>';
            return;
        }
        
        tbody.innerHTML = res.messages.map(msg => `
            <tr>
                <td class="px-4 py-3 font-mono text-sm">${escapeHtml(msg.phone)}</td>
                <td class="px-4 py-3 text-sm truncate max-w-xs">${escapeHtml(msg.message?.substring(0, 50) || '')}...</td>
                <td class="px-4 py-3"><span class="badge badge-${msg.status}">${msg.status}</span></td>
                <td class="px-4 py-3 text-sm">${msg.source}</td>
                <td class="px-4 py-3 text-sm text-gray-400">${msg.sentAt ? formatDateTime(msg.sentAt) : '-'}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load message history:', error);
    }
}

// ==========================================
// DASHBOARD
// ==========================================
async function loadDashboard() {
    try {
        const res = await apiRequest('/analytics/dashboard');
        
        // Update stats
        document.getElementById('stat-today').textContent = res.stats?.messages?.today || 0;
        document.getElementById('stat-today-limit').textContent = `${res.stats?.limits?.usedToday || 0} / ${res.stats?.limits?.daily || 100} limit`;
        document.getElementById('stat-total').textContent = res.stats?.messages?.total || 0;
        document.getElementById('stat-contacts').textContent = res.stats?.contacts || 0;
        document.getElementById('stat-groups').textContent = `${res.stats?.groups || 0} groups`;
        document.getElementById('stat-credits').textContent = (user?.credits - user?.creditsUsed) || 0;
        document.getElementById('stat-credits-used').textContent = `${user?.creditsUsed || 0} used`;
        
        // Update usage bars
        const dailyPercent = ((res.stats?.limits?.usedToday || 0) / (res.stats?.limits?.daily || 100)) * 100;
        const monthlyPercent = ((res.stats?.limits?.usedMonth || 0) / (res.stats?.limits?.monthly || 3000)) * 100;
        
        document.getElementById('daily-usage-text').textContent = `${res.stats?.limits?.usedToday || 0} / ${res.stats?.limits?.daily || 100}`;
        document.getElementById('daily-usage-bar').style.width = `${Math.min(dailyPercent, 100)}%`;
        
        document.getElementById('monthly-usage-text').textContent = `${res.stats?.limits?.usedMonth || 0} / ${res.stats?.limits?.monthly || 3000}`;
        document.getElementById('monthly-usage-bar').style.width = `${Math.min(monthlyPercent, 100)}%`;
        
        // Create dashboard chart
        createDashboardChart(res.stats?.dailyStats || []);
        
        // Load recent messages
        loadRecentMessages();
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

function createDashboardChart(data) {
    const ctx = document.getElementById('dashboard-chart')?.getContext('2d');
    if (!ctx) return;
    
    if (dashboardChart) {
        dashboardChart.destroy();
    }
    
    dashboardChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => {
                const date = new Date(d.date);
                return date.toLocaleDateString('en-US', { weekday: 'short' });
            }),
            datasets: [{
                label: 'Messages',
                data: data.map(d => d.count),
                backgroundColor: 'rgba(34, 197, 94, 0.5)',
                borderColor: '#22c55e',
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#374151' } },
                x: { grid: { display: false } }
            }
        }
    });
}

async function loadRecentMessages() {
    try {
        const res = await apiRequest('/analytics/messages?limit=5');
        
        const container = document.getElementById('recent-messages');
        
        if (!res.messages || res.messages.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No recent messages</p>';
            return;
        }
        
        container.innerHTML = res.messages.map(msg => `
            <div class="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                        <i class="fas fa-user text-gray-400"></i>
                    </div>
                    <div>
                        <p class="font-medium">${escapeHtml(msg.phone)}</p>
                        <p class="text-sm text-gray-400 truncate max-w-xs">${escapeHtml(msg.message?.substring(0, 40) || '')}...</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="badge badge-${msg.status}">${msg.status}</span>
                    <p class="text-xs text-gray-500 mt-1">${formatTime(msg.createdAt)}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load recent messages:', error);
    }
}

// ==========================================
// SETTINGS
// ==========================================
async function updateProfile() {
    const name = document.getElementById('setting-name').value.trim();
    const phone = document.getElementById('setting-phone').value.trim();
    const company = document.getElementById('setting-company').value.trim();
    
    if (!name) {
        showToast('Name is required', 'error');
        return;
    }
    
    try {
        await apiRequest('/auth/profile', 'PUT', { name, phone, company });
        user.name = name;
        document.getElementById('user-name').textContent = name;
        showToast('Profile updated!', 'success');
    } catch (error) {
        showToast('Failed to update: ' + error.message, 'error');
    }
}

async function updateSettings() {
    const settings = {
        minDelay: parseInt(document.getElementById('setting-min-delay').value) * 1000,
        maxDelay: parseInt(document.getElementById('setting-max-delay').value) * 1000,
        batchSize: parseInt(document.getElementById('setting-batch-size').value),
        timezone: document.getElementById('setting-timezone').value
    };
    
    try {
        await apiRequest('/auth/profile', 'PUT', { settings });
        user.settings = settings;
        showToast('Settings saved!', 'success');
    } catch (error) {
        showToast('Failed to save: ' + error.message, 'error');
    }
}

async function changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        await apiRequest('/auth/password', 'PUT', { currentPassword, newPassword });
        showToast('Password changed!', 'success');
        
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
    } catch (error) {
        showToast('Failed: ' + error.message, 'error');
    }
}

// ==========================================
// LOAD ALL DATA
// ==========================================
async function loadAllData() {
    await checkWhatsAppStatus();
    loadDashboard();
    loadGroupsForSelect();
    loadTemplatesForSelect();
}

async function loadGroupsForSelect() {
    try {
        const res = await apiRequest('/contacts/groups');
        
        const select = document.getElementById('bulk-groups');
        if (select && res.groups) {
            select.innerHTML = res.groups.map(g => 
                `<option value="${g.id}">${escapeHtml(g.name)} (${g.contactCount || 0})</option>`
            ).join('');
        }
    } catch (error) {
        console.error('Failed to load groups for select:', error);
    }
}

// ==========================================
// UTILITIES
// ==========================================
async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API}${endpoint}`, options);
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.error || 'Request failed');
    }
    
    return result;
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    element.select();
    document.execCommand('copy');
    showToast('Copied to clipboard!', 'success');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
}

function formatTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K = Quick search (future feature)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // TODO: Open quick search
    }
    
    // Ctrl/Cmd + N = New message
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showTab('send');
    }
});

// Initialize first load when authenticated
console.log('[App] Ready');
