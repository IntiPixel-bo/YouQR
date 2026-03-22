// Global State
let currentUser = null;
let currentQRType = 'url';
let qrCodeObj = null;
let currentLogo = null;
let currentLogoShape = 'circle';
let currentFrame = 'none';
let userQRs = [];
let isGradient = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initQRPreview();
});

// Navigation
function showSection(sectionId) {
    document.querySelectorAll('section').forEach(section => {
        section.classList.add('hidden');
    });
    
    document.getElementById(sectionId).classList.remove('hidden');
    
    if (sectionId === 'dashboard' && !currentUser) {
        showSection('login');
        return;
    }
    
    if (sectionId === 'dashboard' && currentUser) {
        loadUserQRs();
        loadStats();
    }
    window.scrollTo(0, 0);
}

// Auth Functions
function checkAuth() {
    const token = localStorage.getItem('youqr_token');
    const email = localStorage.getItem('youqr_email');
    if (token && email) {
        currentUser = { email, token };
        updateNavForAuth();
        showSection('dashboard');
    } else {
        showSection('landing');
    }
}

function updateNavForAuth() {
    document.getElementById('nav-auth').classList.add('hidden');
    document.getElementById('nav-user').classList.remove('hidden');
    document.getElementById('user-email').textContent = currentUser.email;
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const spinner = document.getElementById('login-spinner');
    const errorDiv = document.getElementById('login-error');
    
    spinner.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        
        if (response.ok && data.success) {
            localStorage.setItem('youqr_token', data.token);
            localStorage.setItem('youqr_email', email);
            currentUser = { email, token: data.token };
            updateNavForAuth();
            showToast('Inicio de sesión exitoso');
            showSection('dashboard');
        } else {
            errorDiv.textContent = data.error || 'Error al iniciar sesión';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'Error de conexión. Verifica tu conexión a internet.';
        errorDiv.classList.remove('hidden');
    } finally {
        spinner.classList.add('hidden');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    const spinner = document.getElementById('register-spinner');
    const errorDiv = document.getElementById('register-error');
    const successDiv = document.getElementById('register-success');
    
    if (password !== passwordConfirm) {
        errorDiv.textContent = 'Las contraseñas no coinciden';
        errorDiv.classList.remove('hidden');
        return;
    }
    spinner.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        
        if (response.ok && data.success) {
            successDiv.textContent = 'Cuenta creada exitosamente. Redirigiendo...';
            successDiv.classList.remove('hidden');
            setTimeout(() => showSection('login'), 1500);
        } else {
            errorDiv.textContent = data.error || 'Error al crear cuenta';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'Error de conexión. Intenta de nuevo.';
        errorDiv.classList.remove('hidden');
    } finally {
        spinner.classList.add('hidden');
    }
}

function logout() {
    localStorage.removeItem('youqr_token');
    localStorage.removeItem('youqr_email');
    currentUser = null;
    document.getElementById('nav-auth').classList.remove('hidden');
    document.getElementById('nav-user').classList.add('hidden');
    showSection('landing');
    showToast('Sesión cerrada');
}

// Templates
function applyTemplate(template) {
    document.querySelectorAll('.template-card').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-template="${template}"]`).classList.add('active');
    
    const templates = {
        iron: { color: '#ff0000', bgColor: '#000000', frame: 'neon', gradient: true, gradientStart: '#ff0000', gradientEnd: '#ff6600' },
        ocean: { color: '#0066ff', bgColor: '#ffffff', frame: 'glow', gradient: true, gradientStart: '#0066ff', gradientEnd: '#00ccff' },
        forest: { color: '#006600', bgColor: '#f0fdf4', frame: 'rounded', gradient: true, gradientStart: '#006600', gradientEnd: '#00cc66' },
        sunset: { color: '#ff0066', bgColor: '#fff7ed', frame: 'glow', gradient: true, gradientStart: '#ff0066', gradientEnd: '#ffcc00' },
        purple: { color: '#6600cc', bgColor: '#faf5ff', frame: 'neon', gradient: true, gradientStart: '#6600cc', gradientEnd: '#cc00ff' },
        clean: { color: '#000000', bgColor: '#ffffff', frame: 'none', gradient: false }
    };
    
    const t = templates[template];
    document.getElementById('qr-color').value = t.color;
    document.getElementById('qr-bg-color').value = t.bgColor;
    document.getElementById('color-value').textContent = t.color;
    document.getElementById('bg-color-value').textContent = t.bgColor;
    
    isGradient = t.gradient;
    document.getElementById('use-gradient').checked = t.gradient;
    document.getElementById('gradient-colors').classList.toggle('hidden', !t.gradient);
    document.getElementById('normal-colors').classList.toggle('hidden', t.gradient);
    
    if (t.gradient) {
        document.getElementById('gradient-start').value = t.gradientStart;
        document.getElementById('gradient-end').value = t.gradientEnd;
    }
    
    setFrame(t.frame);
    updateQRPreview();
    showToast(`Plantilla "${template}" aplicada`);
}

function toggleGradient() {
    isGradient = document.getElementById('use-gradient').checked;
    document.getElementById('gradient-colors').classList.toggle('hidden', !isGradient);
    document.getElementById('normal-colors').classList.toggle('hidden', isGradient);
    updateQRPreview();
}

// Modals and Forms
function openCreateModal() {
    document.getElementById('create-modal').classList.remove('hidden');
    initQRPreview();
}

function closeCreateModal() {
    document.getElementById('create-modal').classList.add('hidden');
    resetCreateForm();
}

function resetCreateForm() {
    // Resetear todos los inputs
    const inputs = ['qr-name', 'qr-url', 'qr-text', 'qr-spotify', 'qr-maps-search', 'qr-instagram', 'qr-wa-phone', 'qr-wa-text', 'qr-vcard-name', 'qr-vcard-phone', 'qr-vcard-email', 'qr-vcard-company'];
    inputs.forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = ''; });
    
    document.getElementById('qr-color').value = '#000000';
    document.getElementById('qr-bg-color').value = '#ffffff';
    document.getElementById('color-value').textContent = '#000000';
    document.getElementById('bg-color-value').textContent = '#ffffff';
    document.getElementById('qr-display-name').classList.add('hidden');
    document.getElementById('file-label').classList.remove('has-file');
    document.getElementById('file-label').innerHTML = '<i class="fas fa-cloud-upload-alt text-lg"></i><span>Seleccionar imagen del logo</span>';
    
    isGradient = false;
    document.getElementById('use-gradient').checked = false;
    document.getElementById('gradient-colors').classList.add('hidden');
    document.getElementById('normal-colors').remove('hidden');
    
    currentLogo = null;
    currentFrame = 'none';
    currentLogoShape = 'circle';
    document.getElementById('qr-logo').classList.add('hidden');
    document.getElementById('qr-logo-img').src = '';
    
    document.querySelectorAll('.template-card, .frame-selector, .shape-selector').forEach(el => el.classList.remove('active'));
    document.querySelector('[data-frame="none"]').classList.add('active');
    document.querySelector('.shape-selector.rounded-full').classList.add('active');
    
    setQRType('url');
    updateQRPreview();
}

function setQRType(type) {
    currentQRType = type;
    document.querySelectorAll('.qr-tab').forEach(tab => {
        if (tab.dataset.type === type) {
            tab.classList.add('tab-active');
            tab.classList.remove('text-gray-500');
        } else {
            tab.classList.remove('tab-active');
            tab.classList.add('text-gray-500');
        }
    });
    
    // Ocultar todos los inputs primero
    const types = ['url', 'text', 'spotify', 'maps', 'instagram', 'whatsapp', 'vcard'];
    types.forEach(t => document.getElementById(`input-${t}`).classList.add('hidden'));
    
    // Mostrar el seleccionado
    document.getElementById(`input-${type}`).classList.remove('hidden');
    updateQRPreview();
}

function updateQRName() {
    const name = document.getElementById('qr-name').value;
    const display = document.getElementById('qr-display-name');
    if (name) {
        display.textContent = name;
        display.classList.remove('hidden');
    } else {
        display.classList.add('hidden');
    }
}

function setLogoShape(shape) {
    currentLogoShape = shape;
    document.querySelectorAll('.shape-selector').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    const logoContainer = document.getElementById('qr-logo');
    logoContainer.className = 'qr-logo-container';
    
    if (shape === 'circle') logoContainer.style.borderRadius = '50%';
    else if (shape === 'rounded') logoContainer.style.borderRadius = '12px';
    else if (shape === 'square') logoContainer.style.borderRadius = '4px';
}

function setFrame(frame) {
    currentFrame = frame;
    document.querySelectorAll('.frame-selector').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-frame="${frame}"]`).classList.add('active');
    
    const container = document.getElementById('qr-frame-container');
    container.className = 'qr-frame mx-auto';
    if (frame !== 'none') container.classList.add(frame);
}

// QR Engine Logic
function initQRPreview() {
    const container = document.getElementById('qrcode');
    container.innerHTML = '';
    qrCodeObj = new QRCode(container, {
        text: 'https://youqr.app',
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
    });
}

function updateQRPreview() {
    if (!qrCodeObj) return;
    
    let content = '';
    switch(currentQRType) {
        case 'url':
            content = document.getElementById('qr-url').value || 'https://ejemplo.com';
            break;
        case 'text':
            content = document.getElementById('qr-text').value || 'Texto de ejemplo';
            break;
        case 'spotify':
            content = document.getElementById('qr-spotify').value || 'https://open.spotify.com';
            break;
        case 'maps':
            const lat = document.getElementById('qr-maps-lat').value || '40.7128';
            const lng = document.getElementById('qr-maps-lng').value || '-74.0060';
            content = `https://www.google.com/maps?q=${lat},${lng}`;
            break;
        case 'instagram':
            const igUser = document.getElementById('qr-instagram').value || 'instagram';
            content = `https://instagram.com/${igUser.replace('@', '')}`;
            break;
        case 'whatsapp':
            const waPhone = document.getElementById('qr-wa-phone').value || '';
            const waText = encodeURIComponent(document.getElementById('qr-wa-text').value || '');
            content = `https://wa.me/${waPhone}?text=${waText}`;
            break;
        case 'vcard':
            const vName = document.getElementById('qr-vcard-name').value || 'Nombre';
            const vPhone = document.getElementById('qr-vcard-phone').value || '';
            const vEmail = document.getElementById('qr-vcard-email').value || '';
            const vCompany = document.getElementById('qr-vcard-company').value || '';
            content = `BEGIN:VCARD\nVERSION:3.0\nN:${vName}\nTEL:${vPhone}\nEMAIL:${vEmail}\nORG:${vCompany}\nEND:VCARD`;
            break;
    }
    
    const color = document.getElementById('qr-color').value;
    const bgColor = document.getElementById('qr-bg-color').value;
    
    document.getElementById('color-value').textContent = color;
    document.getElementById('bg-color-value').textContent = bgColor;
    
    const container = document.getElementById('qrcode');
    container.innerHTML = '';
    
    const qrColor = isGradient ? '#000000' : color;
    // Nivel de corrección dinámico para aguantar más texto (Especialmente para VCard o Párrafos)
    const correctionLevel = content.length > 50 ? QRCode.CorrectLevel.M : QRCode.CorrectLevel.H;
    
    qrCodeObj = new QRCode(container, {
        text: content,
        width: 200,
        height: 200,
        colorDark: qrColor,
        colorLight: bgColor,
        correctLevel: correctionLevel
    });
    
    if (isGradient) {
        setTimeout(applyGradientToQR, 50);
    }
    
    if (currentLogo) {
        setTimeout(() => {
            const logoContainer = document.getElementById('qr-logo');
            document.getElementById('qr-logo-img').src = currentLogo;
            logoContainer.classList.remove('hidden');
        }, 100);
    }
}

// Nueva forma confiable de aplicar gradiente
function applyGradientToQR() {
    const canvas = document.querySelector('#qrcode canvas');
    if (!canvas) {
        setTimeout(applyGradientToQR, 50); // Reintentar si el canvas no ha renderizado aún
        return; 
    }
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const width = canvas.width;
    const height = canvas.height;
    
    const gradientStart = document.getElementById('gradient-start').value;
    const gradientEnd = document.getElementById('gradient-end').value;
    const direction = document.getElementById('gradient-direction').value;
    
    let gradient = ctx.createLinearGradient(0, 0, width, height);
    if (direction === '135deg') gradient = ctx.createLinearGradient(0, 0, width, height);
    if (direction === 'to right') gradient = ctx.createLinearGradient(0, 0, width, 0);
    if (direction === 'to bottom') gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (direction === '45deg') gradient = ctx.createLinearGradient(0, height, width, 0);
    
    gradient.addColorStop(0, gradientStart);
    gradient.addColorStop(1, gradientEnd);
    
    // Proceso de composición
    const qrImage = new Image();
    qrImage.onload = function() {
        ctx.clearRect(0, 0, width, height);
        
        // 1. Dibujar el color de fondo original
        ctx.fillStyle = document.getElementById('qr-bg-color').value;
        ctx.fillRect(0, 0, width, height);
        
        // 2. Dibujar la caja del gradiente sobre todo el canvas
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // 3. Enmascarar el gradiente para que solo quede donde está el QR original (parte negra)
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(qrImage, 0, 0);
        
        ctx.globalCompositeOperation = "source-over"; // Restaurar el modo normal
    };
    qrImage.src = canvas.toDataURL();
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentLogo = e.target.result;
            const label = document.getElementById('file-label');
            label.classList.add('has-file');
            label.innerHTML = `<i class="fas fa-check-circle text-lg text-green-600"></i><span>${file.name}</span>`;
            updateQRPreview();
        };
        reader.readAsDataURL(file);
    }
}

// Map Search Mock
function searchMaps() {
    const query = document.getElementById('qr-maps-search').value;
    if (!query) return;
    showToast('Buscando ubicación...');
    setTimeout(() => {
        document.getElementById('qr-maps-lat').value = '40.7128';
        document.getElementById('qr-maps-lng').value = '-74.0060';
        document.getElementById('maps-preview').classList.remove('hidden');
        updateQRPreview();
    }, 1000);
}

// Saves & Downloads
async function saveQR() {
    const spinner = document.getElementById('save-spinner');
    const icon = document.getElementById('save-icon');
    
    // Lógica para rescatar el "target" actual
    let target = '';
    switch(currentQRType) {
        case 'url': target = document.getElementById('qr-url').value; break;
        case 'text': target = document.getElementById('qr-text').value; break;
        case 'spotify': target = document.getElementById('qr-spotify').value; break;
        case 'maps':
            const lat = document.getElementById('qr-maps-lat').value;
            const lng = document.getElementById('qr-maps-lng').value;
            target = `https://www.google.com/maps?q=${lat},${lng}`; break;
        case 'instagram': 
            target = `https://instagram.com/${document.getElementById('qr-instagram').value.replace('@', '')}`; break;
        case 'whatsapp': 
            target = `https://wa.me/${document.getElementById('qr-wa-phone').value}`; break;
        case 'vcard': target = 'vcard_data'; break; // Placeholder para la DB
    }
    
    if (!target) {
        showToast('Por favor ingresa un contenido válido');
        return;
    }
    
    spinner.classList.remove('hidden');
    icon.classList.add('hidden');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/links`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify({
                target,
                type: currentQRType,
                color: document.getElementById('qr-color').value,
                bgColor: document.getElementById('qr-bg-color').value,
                name: document.getElementById('qr-name').value,
                frame: currentFrame,
                logoShape: currentLogoShape,
                isGradient: isGradient,
                gradientStart: isGradient ? document.getElementById('gradient-start').value : null,
                gradientEnd: isGradient ? document.getElementById('gradient-end').value : null
            })
        });
        
        const data = await response.json();
        if (response.ok && data.success) {
            showToast('QR guardado en tu cuenta');
            loadUserQRs();
        } else {
            showToast(data.error || 'Error al guardar QR');
        }
    } catch (error) {
        showToast('Error de conexión al guardar');
    } finally {
        spinner.classList.add('hidden');
        icon.classList.remove('hidden');
    }
}

// Full Canvas Builder
async function downloadFullQR() {
    const name = document.getElementById('qr-name').value || 'YouQR';
    showToast('Generando imagen completa...');
    
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scale = 2; // Alta resolución
        const width = 600;
        const height = 700;
        
        canvas.width = width * scale;
        canvas.height = height * scale;
        ctx.scale(scale, scale);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;
        
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        roundRect(ctx, 30, 30, width - 60, height - 60, 20);
        ctx.fill();
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        
        if (name) {
            ctx.font = 'bold 32px Inter, sans-serif';
            ctx.fillStyle = '#1f2937';
            ctx.textAlign = 'center';
            ctx.fillText(name, width / 2, 100);
        }
        
        const qrSize = 400;
        const qrX = (width - qrSize) / 2;
        const qrY = name ? 140 : 120;
        
        ctx.save();
        if (currentFrame === 'glow') {
            ctx.shadowColor = 'rgba(102, 126, 234, 0.5)';
            ctx.shadowBlur = 30;
        } else if (currentFrame === 'neon') {
            ctx.shadowColor = '#667eea';
            ctx.shadowBlur = 20;
        }
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, currentFrame === 'circle' ? qrSize / 2 + 20 : 20);
        ctx.fill();
        ctx.restore();
        
        const qrCanvas = document.querySelector('#qrcode canvas');
        if (qrCanvas) {
            ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
            
            const finalizeDownload = () => {
                ctx.font = '16px Inter, sans-serif';
                ctx.fillStyle = '#9ca3af';
                ctx.textAlign = 'center';
                ctx.fillText('Scan me', width / 2, height - 80);
                ctx.font = '14px Inter, sans-serif';
                ctx.fillText('powered by YouQR', width / 2, height - 60);
                
                const link = document.createElement('a');
                link.download = `youqr-${name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                showToast('¡Imagen descargada con éxito!');
            };

            if (currentLogo) {
                const logoSize = 80;
                const logoX = qrX + (qrSize - logoSize) / 2;
                const logoY = qrY + (qrSize - logoSize) / 2;
                
                ctx.fillStyle = document.getElementById('logo-bg-transparent').checked ? 'rgba(255,255,255,0.9)' : '#ffffff';
                ctx.beginPath();
                if (currentLogoShape === 'circle') ctx.arc(qrX + qrSize/2, qrY + qrSize/2, logoSize/2 + 5, 0, 2 * Math.PI);
                else if (currentLogoShape === 'rounded') roundRect(ctx, logoX - 5, logoY - 5, logoSize + 10, logoSize + 10, 15);
                else ctx.rect(logoX - 5, logoY - 5, logoSize + 10, logoSize + 10);
                ctx.fill();
                
                const logoImg = new Image();
                logoImg.onload = function() {
                    ctx.save();
                    ctx.beginPath();
                    if (currentLogoShape === 'circle') ctx.arc(qrX + qrSize/2, qrY + qrSize/2, logoSize/2, 0, 2 * Math.PI);
                    else if (currentLogoShape === 'rounded') roundRect(ctx, logoX, logoY, logoSize, logoSize, 12);
                    else ctx.rect(logoX, logoY, logoSize, logoSize);
                    ctx.clip();
                    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
                    ctx.restore();
                    finalizeDownload();
                };
                logoImg.src = currentLogo;
            } else {
                finalizeDownload();
            }
        }
    } catch (error) {
        showToast('Error al generar imagen');
    }
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function downloadQR(format) {
    const canvas = document.querySelector('#qrcode canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `youqr-qr-only-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// User QRs & Stats Loaders
async function loadUserQRs() {
    const listContainer = document.getElementById('qrs-list');
    try {
        const response = await fetch(`${API_BASE_URL}/api/my-links`, {
            headers: { 'Authorization': `Bearer ${currentUser.token}` }
        });
        const data = await response.json();
        if (response.ok && data.success) {
            userQRs = data.links || [];
            renderQRsList();
        } else {
            listContainer.innerHTML = '<div class="p-8 text-center text-gray-500">Error al cargar QRs</div>';
        }
    } catch (error) {
        userQRs = [];
        renderQRsList();
    }
}

function renderQRsList() {
    const container = document.getElementById('qrs-list');
    if (userQRs.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <i class="fas fa-qrcode text-4xl mb-4 text-gray-300"></i>
                <p>No tienes códigos QR aún</p>
                <button onclick="openCreateModal()" class="mt-4 text-purple-600 hover:text-purple-700 font-medium">Crea tu primer QR</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userQRs.map(qr => `
        <div class="p-6 flex items-center justify-between hover:bg-gray-50 transition">
            <div class="flex items-center space-x-4">
                <div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    <i class="fas ${getIconForType(qr.type)} text-2xl text-gray-400"></i>
                </div>
                <div>
                    <h3 class="text-lg font-semibold text-gray-900">${qr.name || 'QR #' + qr.slug}</h3>
                    <p class="text-sm text-gray-500 truncate max-w-xs">${qr.target}</p>
                    <div class="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span><i class="fas fa-eye mr-1"></i>${qr.scans} escaneos</span>
                        <span class="text-xs bg-gray-200 px-2 py-1 rounded">${qr.type}</span>
                    </div>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <button onclick="showQRDetails('${qr.slug}')" class="p-2 text-gray-400 hover:text-blue-600 transition" title="Estadísticas"><i class="fas fa-chart-bar"></i></button>
                <button onclick="openEditModal('${qr.slug}', '${qr.target}')" class="p-2 text-gray-400 hover:text-purple-600 transition" title="Editar"><i class="fas fa-edit"></i></button>
                <button onclick="deleteQR('${qr.slug}')" class="p-2 text-gray-400 hover:text-red-600 transition" title="Eliminar"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function getIconForType(type) {
    const icons = { 'url': 'fa-link', 'text': 'fa-align-left', 'spotify': 'fa-spotify', 'maps': 'fa-map-marker-alt', 'instagram': 'fa-instagram', 'whatsapp': 'fa-whatsapp', 'vcard': 'fa-id-card' };
    return icons[type] || 'fa-qrcode';
}

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/stats`, { headers: { 'Authorization': `Bearer ${currentUser.token}` } });
        const data = await response.json();
        if (response.ok && data.success) {
            document.getElementById('stat-total-qrs').textContent = data.totalQRs || 0;
            document.getElementById('stat-total-scans').textContent = data.totalScans || 0;
            document.getElementById('stat-top-qr').textContent = data.topQR || '-';
        }
    } catch (error) {
        document.getElementById('stat-total-qrs').textContent = userQRs.length;
        document.getElementById('stat-total-scans').textContent = userQRs.reduce((sum, qr) => sum + (qr.scans || 0), 0);
    }
}

// Misc functions
function openEditModal(slug, target) {
    document.getElementById('edit-slug').value = slug;
    document.getElementById('edit-target').value = target;
    document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() { document.getElementById('edit-modal').classList.add('hidden'); }

async function updateQR() {
    const slug = document.getElementById('edit-slug').value;
    const newTarget = document.getElementById('edit-target').value;
    try {
        const response = await fetch(`${API_BASE_URL}/api/update-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.token}` },
            body: JSON.stringify({ slug, target: newTarget })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            showToast('Destino actualizado exitosamente');
            closeEditModal();
            loadUserQRs();
        } else showToast(data.error || 'Error al actualizar');
    } catch (error) { showToast('Error de conexión'); }
}

function showQRDetails(slug) {
    const qr = userQRs.find(q => q.slug === slug);
    if (!qr) return;
    const content = document.getElementById('qr-details-content');
    content.innerHTML = `
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="bg-gray-50 p-4 rounded-lg"><p class="text-sm text-gray-600">Total Escaneos</p><p class="text-2xl font-bold text-gray-900">${qr.scans}</p></div>
            <div class="bg-gray-50 p-4 rounded-lg"><p class="text-sm text-gray-600">Último Escaneo</p><p class="text-lg font-semibold text-gray-900">${qr.lastScan ? new Date(qr.lastScan).toLocaleDateString() : 'Nunca'}</p></div>
        </div>
        <div class="space-y-2"><p class="text-sm text-gray-600">URL Corta:</p>
            <div class="flex items-center gap-2 bg-gray-100 p-3 rounded-lg"><code class="text-sm flex-1">${API_BASE_URL}/${qr.slug}</code><button onclick="copyToClipboard('${API_BASE_URL}/${qr.slug}')" class="text-purple-600 hover:text-purple-700"><i class="fas fa-copy"></i></button></div>
        </div>
    `;
    document.getElementById('details-modal').classList.remove('hidden');
}

function closeDetailsModal() { document.getElementById('details-modal').classList.add('hidden'); }

async function deleteQR(slug) {
    if (!confirm('¿Estás seguro de eliminar este QR? Esta acción no se puede deshacer.')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/delete-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.token}` },
            body: JSON.stringify({ slug })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            showToast('QR eliminado');
            loadUserQRs();
        } else showToast(data.error || 'Error al eliminar');
    } catch (error) { showToast('Error de conexión'); }
}

function copyToClipboard(text) { navigator.clipboard.writeText(text).then(() => showToast('Copiado al portapapeles')); }
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}
function showDemo() { openCreateModal(); }

window.onclick = function(event) {
    if (event.target.id === 'create-modal') closeCreateModal();
    if (event.target.id === 'edit-modal') closeEditModal();
    if (event.target.id === 'details-modal') closeDetailsModal();
}
