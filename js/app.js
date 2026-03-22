// js/app.js
let currentUser = null;
let currentQRType = 'url';
let qrCodeObj = null;
let currentLogo = null;
let currentFrame = 'none';
let userQRs = [];
let isGradient = false;
let currentEditSlug = null; // Para saber si estamos creando o editando

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initQRPreview();
});

function checkAuth() {
    const token = localStorage.getItem('youqr_token');
    const email = localStorage.getItem('youqr_email');
    if (token && email) {
        currentUser = { email, token };
        document.getElementById('nav-auth').classList.add('hidden');
        document.getElementById('nav-user').classList.remove('hidden');
        document.getElementById('user-email').textContent = email;
        showSection('dashboard');
    } else {
        showSection('landing');
    }
}

function showSection(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    if (id === 'dashboard' && currentUser) loadUserQRs();
    window.scrollTo(0,0);
}

// Inicializar la librería qr-code-styling
function initQRPreview() {
    const container = document.getElementById('qrcode');
    container.innerHTML = '';
    
    qrCodeObj = new QRCodeStyling({
        width: 250,
        height: 250,
        type: "svg", // Renderiza en vector nativo para alta calidad en pantalla
        data: "https://youqr.app",
        imageOptions: { crossOrigin: "anonymous", margin: 5 }
    });
    qrCodeObj.append(container);
}

// Función central: Re-dibuja el QR con las configuraciones actuales
function updateQRPreview() {
    if (!qrCodeObj) return;
    
    // 1. Resolver el contenido
    let content = 'https://youqr.app';
    switch(currentQRType) {
        case 'url': content = document.getElementById('qr-url').value || content; break;
        case 'text': content = document.getElementById('qr-text').value || 'Hola Mundo'; break;
        case 'instagram': content = `https://instagram.com/${(document.getElementById('qr-instagram').value || '').replace('@', '')}`; break;
        case 'whatsapp': content = `https://wa.me/${document.getElementById('qr-wa-phone').value}?text=${encodeURIComponent(document.getElementById('qr-wa-text').value)}`; break;
        case 'vcard':
            const n = document.getElementById('qr-vcard-name').value;
            const p = document.getElementById('qr-vcard-phone').value;
            const e = document.getElementById('qr-vcard-email').value;
            content = `BEGIN:VCARD\nVERSION:3.0\nN:${n}\nTEL:${p}\nEMAIL:${e}\nEND:VCARD`;
            break;
    }

    // 2. Extraer parámetros visuales
    const color = document.getElementById('qr-color').value;
    const bgColor = document.getElementById('qr-bg-color').value;
    const dotType = document.getElementById('qr-dot-type').value;
    const cornerType = document.getElementById('qr-corner-type').value;
    const logoSize = parseFloat(document.getElementById('qr-logo-size').value);

    // 3. Configurar Puntos (Gradiente vs Sólido)
    let dotsOptions = { type: dotType };
    if (isGradient) {
        const start = document.getElementById('gradient-start').value;
        const end = document.getElementById('gradient-end').value;
        const dir = document.getElementById('gradient-direction').value;
        let rotation = 0;
        if (dir === 'to bottom') rotation = Math.PI / 2;
        if (dir === '135deg') rotation = Math.PI / 4;
        
        dotsOptions.gradient = {
            type: "linear",
            rotation: rotation,
            colorStops: [{ offset: 0, color: start }, { offset: 1, color: end }]
        };
    } else {
        dotsOptions.color = color;
    }

    // 4. Aplicar actualización nativa
    qrCodeObj.update({
        data: content,
        dotsOptions: dotsOptions,
        backgroundOptions: { color: bgColor },
        cornersSquareOptions: { type: cornerType, color: isGradient ? '#000000' : color },
        image: currentLogo || undefined,
        imageOptions: { margin: 5, imageSize: logoSize, crossOrigin: "anonymous" }
    });
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentLogo = e.target.result;
            document.getElementById('file-label').innerHTML = `<i class="fas fa-check text-green-600"></i> Logo Listo`;
            updateQRPreview();
        };
        reader.readAsDataURL(file);
    }
}

function setFrame(frame) {
    currentFrame = frame;
    document.querySelectorAll('.frame-selector').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-frame="${frame}"]`).classList.add('active');
    
    const container = document.getElementById('qr-frame-container');
    container.className = 'qr-frame mx-auto';
    if (frame !== 'none') container.classList.add(frame);
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

function toggleGradient() {
    isGradient = document.getElementById('use-gradient').checked;
    document.getElementById('gradient-colors').classList.toggle('hidden', !isGradient);
    document.getElementById('normal-colors').classList.toggle('hidden', isGradient);
    updateQRPreview();
}

function applyTemplate(template) {
    const t = {
        techRed: { color: '#ff0000', bgColor: '#000000', frame: 'neon', gradient: true, gradientStart: '#ff0000', gradientEnd: '#ff6600', dotType: 'dots', cornerType: 'extra-rounded' },
        clean: { color: '#000000', bgColor: '#ffffff', frame: 'none', gradient: false, dotType: 'square', cornerType: 'square' }
    }[template] || { color: '#0066ff', bgColor: '#ffffff', frame: 'none', gradient: false };

    document.getElementById('qr-color').value = t.color;
    document.getElementById('qr-bg-color').value = t.bgColor;
    
    isGradient = t.gradient;
    document.getElementById('use-gradient').checked = t.gradient;
    if (t.gradient) {
        document.getElementById('gradient-start').value = t.gradientStart;
        document.getElementById('gradient-end').value = t.gradientEnd;
    }
    
    document.getElementById('qr-dot-type').value = t.dotType || 'square';
    document.getElementById('qr-corner-type').value = t.cornerType || 'square';
    
    toggleGradient();
    setFrame(t.frame);
    updateQRPreview();
}

// Guardado (Integra currentEditSlug)
async function saveQR() {
    const spinner = document.getElementById('save-spinner');
    const icon = document.getElementById('save-icon');
    
    // Extraer target crudo para guardar
    let target = document.getElementById('qr-url').value; 
    
    spinner.classList.remove('hidden'); icon.classList.add('hidden');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/links`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.token}` },
            body: JSON.stringify({
                slug: currentEditSlug, // Si es nulo, el Worker creará uno nuevo
                target,
                type: currentQRType,
                name: document.getElementById('qr-name').value,
                color: document.getElementById('qr-color').value,
                bgColor: document.getElementById('qr-bg-color').value,
                frame: currentFrame,
                isGradient: isGradient,
                gradientStart: isGradient ? document.getElementById('gradient-start').value : null,
                gradientEnd: isGradient ? document.getElementById('gradient-end').value : null,
                dotType: document.getElementById('qr-dot-type').value,
                cornerType: document.getElementById('qr-corner-type').value
            })
        });
        
        const data = await response.json();
        if (response.ok) {
            showToast('Guardado exitosamente');
            closeCreateModal();
            loadUserQRs();
        }
    } catch (e) { showToast('Error al guardar'); }
    finally { spinner.classList.add('hidden'); icon.classList.remove('hidden'); }
}

// Descargas
function downloadNativeQR() {
    const format = document.getElementById('export-format').value;
    const name = document.getElementById('qr-name').value || 'YouQR';
    qrCodeObj.download({ name: name, extension: format });
}

async function downloadFullQR() {
    const name = document.getElementById('qr-name').value || 'YouQR';
    const blob = await qrCodeObj.getRawData("png");
    const url = URL.createObjectURL(blob);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 2;
    const width = 600; const height = 700;
    
    canvas.width = width * scale; canvas.height = height * scale;
    ctx.scale(scale, scale);
    
    // Fondo y marco
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#e5e7eb'; ctx.strokeRect(30, 30, width-60, height-60);
    
    // Nombre
    ctx.fillStyle = '#1f2937'; ctx.font = 'bold 32px Inter';
    ctx.textAlign = 'center'; ctx.fillText(name, width/2, 100);
    
    // Dibujar el QR generado encima
    const img = new Image();
    img.onload = () => {
        const qrSize = 400;
        ctx.drawImage(img, (width-qrSize)/2, 140, qrSize, qrSize);
        
        ctx.fillStyle = '#9ca3af'; ctx.font = '16px Inter';
        ctx.fillText('Scan me', width/2, height - 80);
        
        const link = document.createElement('a');
        link.download = `${name}-full.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        URL.revokeObjectURL(url);
    };
    img.src = url;
}

// Funciones de UI
function openCreateModal() { document.getElementById('create-modal').classList.remove('hidden'); updateQRPreview(); }
function closeCreateModal() { 
    document.getElementById('create-modal').classList.add('hidden'); 
    currentEditSlug = null; // Limpiar edición
}
function setQRType(type) { currentQRType = type; updateQRPreview(); /* lógica para ocultar/mostrar divs ignorada por brevedad, usa la de tu código original */ }

// Cargar en el editor (EDICIÓN)
function loadQRIntoEditor(slug) {
    const qr = userQRs.find(q => q.slug === slug);
    if (!qr) return;
    
    currentEditSlug = qr.slug;
    document.getElementById('create-modal').classList.remove('hidden');
    
    document.getElementById('qr-name').value = qr.name || '';
    setQRType(qr.type || 'url');
    document.getElementById('qr-url').value = qr.target || ''; // Asume URL por simplicidad
    
    document.getElementById('qr-color').value = qr.color || '#000000';
    document.getElementById('qr-bg-color').value = qr.bgColor || '#ffffff';
    
    isGradient = qr.isGradient || false;
    document.getElementById('use-gradient').checked = isGradient;
    
    if (isGradient) {
        document.getElementById('gradient-start').value = qr.gradientStart;
        document.getElementById('gradient-end').value = qr.gradientEnd;
    }
    
    document.getElementById('qr-dot-type').value = qr.dotType || 'square';
    document.getElementById('qr-corner-type').value = qr.cornerType || 'square';
    
    setFrame(qr.frame || 'none');
    toggleGradient();
    updateQRPreview();
}

async function loadUserQRs() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/my-links`, { headers: { 'Authorization': `Bearer ${currentUser.token}` } });
        const data = await response.json();
        userQRs = data.links || [];
        renderQRsList();
    } catch (e) { console.log(e); }
}

function renderQRsList() {
    const container = document.getElementById('qrs-list');
    container.innerHTML = userQRs.map(qr => `
        <div class="p-4 flex justify-between border-b hover:bg-gray-50">
            <div><p class="font-bold">${qr.name}</p><p class="text-sm text-gray-500">${qr.target}</p></div>
            <div>
                <button onclick="loadQRIntoEditor('${qr.slug}')" class="px-2 text-purple-600"><i class="fas fa-edit"></i></button>
            </div>
        </div>
    `).join('');
}

function showToast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toast-message').textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}