// ========== 🦁 LIONEL - APP PRINCIPAL ==========

class LionelApp {
    constructor() {
        this.config = this.loadConfig();
        this.user = this.loadUser();
        this.tasks = [];
        this.logs = [];
        this.stats = { total: 0, done: 0, ai: 0 };
        this.proxyWorker = null; // URL do Cloudflare Worker
        
        this.init();
    }

    init() {
        if (this.user.loggedIn) {
            this.showScreen('mainScreen');
            this.loadPlatform();
        } else {
            this.showScreen('loginScreen');
        }
        
        this.bindEvents();
        this.loadSavedConfig();
    }

    // ========== DADOS ==========
    loadUser() {
        try {
            const saved = localStorage.getItem('lionel_user');
            return saved ? JSON.parse(saved) : { loggedIn: false };
        } catch { return { loggedIn: false }; }
    }

    saveUser() {
        localStorage.setItem('lionel_user', JSON.stringify(this.user));
    }

    loadConfig() {
        const defaults = {
            apiProvider: 'gemini',
            apiKey: '',
            apiUrl: '',
            apiModel: 'gemini-pro',
            delay: 3,
            useApi: true,
            notifications: true,
            proxyUrl: '' // URL do seu Cloudflare Worker
        };
        try {
            const saved = localStorage.getItem('lionel_config');
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch { return defaults; }
    }

    saveConfig() {
        localStorage.setItem('lionel_config', JSON.stringify(this.config));
        this.addLog('💾 Configurações salvas!', 'success');
    }

    loadSavedConfig() {
        document.getElementById('apiProvider').value = this.config.apiProvider || 'gemini';
        document.getElementById('apiKey').value = this.config.apiKey || '';
        document.getElementById('apiUrl').value = this.config.apiUrl || '';
    }

    // ========== TELAS ==========
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    // ========== EVENTOS ==========
    bindEvents() {
        // Login
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Logout
        document.getElementById('btnLogout').addEventListener('click', () => this.logout());

        // Menu
        document.getElementById('btnMenu').addEventListener('click', () => this.toggleMenu(true));
        document.getElementById('btnCloseMenu').addEventListener('click', () => this.toggleMenu(false));
        document.getElementById('overlay').addEventListener('click', () => this.toggleMenu(false));

        // Navegação
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => this.navigateTo(e.target.dataset.page));
        });

        // Plataforma
        document.getElementById('btnScanNow').addEventListener('click', () => this.scanPlatform());
        document.getElementById('btnAutoAnswer').addEventListener('click', () => this.autoAnswer());

        // API
        document.getElementById('apiProvider').addEventListener('change', (e) => {
            document.getElementById('customUrlGroup').style.display = 
                e.target.value === 'custom' ? 'block' : 'none';
        });
        document.getElementById('btnShowKey').addEventListener('click', () => {
            const input = document.getElementById('apiKey');
            input.type = input.type === 'password' ? 'text' : 'password';
        });
        document.getElementById('btnTestApi').addEventListener('click', () => this.testApi());
        document.getElementById('btnSaveApi').addEventListener('click', () => this.saveApiConfig());

        // Chat
        document.getElementById('btnSendChat').addEventListener('click', () => this.sendChat());
        document.getElementById('chatInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChat();
            }
        });

        // Iframe carregou
        const iframe = document.getElementById('platformFrame');
        iframe.addEventListener('load', () => {
            document.getElementById('iframeLoading').classList.add('hidden');
            document.getElementById('platformStatus').textContent = '✅ Conectado';
            this.addLog('✅ Plataforma carregada!', 'success');
            this.injectScript();
        });
    }

    // ========== LOGIN ==========
    login() {
        const ra = document.getElementById('raInput').value.trim();
        const senha = document.getElementById('senhaInput').value.trim();
        const url = document.getElementById('urlInput').value.trim();

        if (!ra || !senha || !url) {
            alert('Preencha todos os campos!');
            return;
        }

        this.user = { ra, senha, url, loggedIn: true };
        this.saveUser();
        
        this.showScreen('mainScreen');
        this.addLog('🔐 Login realizado!', 'success');
        this.loadPlatform();
    }

    logout() {
        this.user.loggedIn = false;
        this.saveUser();
        this.showScreen('loginScreen');
    }

    // ========== PLATAFORMA ==========
    loadPlatform() {
        const iframe = document.getElementById('platformFrame');
        const loading = document.getElementById('iframeLoading');
        
        loading.classList.remove('hidden');
        document.getElementById('platformStatus').textContent = '⏳ Carregando...';
        
        // Se tiver Cloudflare Worker configurado, usa ele como proxy
        if (this.config.proxyUrl) {
            iframe.src = `${this.config.proxyUrl}?url=${encodeURIComponent(this.user.url)}`;
        } else {
            // Tenta carregar direto (provavelmente será bloqueado)
            iframe.src = this.user.url;
            this.addLog('⚠️ Sem proxy configurado. O site pode não carregar no iframe.', 'warning');
            this.addLog('💡 Configure um Cloudflare Worker em 🔑 API', 'info');
        }
    }

    injectScript() {
        const iframe = document.getElementById('platformFrame');
        
        try {
            const script = `
                // Script injetado na Sala do Futuro
                window.lionelInjected = true;
                
                // Comunica com o app principal
                window.addEventListener('message', function(event) {
                    if (event.data.action === 'scan') {
                        scanTasks();
                    } else if (event.data.action === 'answer') {
                        answerTask(event.data.taskIndex, event.data.answer);
                    }
                });
                
                function scanTasks() {
                    const tasks = [];
                    
                    // Procura inputs de rádio (múltipla escolha)
                    const radioGroups = {};
                    document.querySelectorAll('input[type="radio"]').forEach(r => {
                        if (!radioGroups[r.name]) radioGroups[r.name] = [];
                        radioGroups[r.name].push(r);
                    });
                    
                    // Procura checkboxes
                    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                        tasks.push({
                            type: 'checkbox',
                            text: cb.closest('label')?.textContent || 'Checkbox',
                            element: cb
                        });
                    });
                    
                    // Procura campos de texto
                    document.querySelectorAll('textarea, input[type="text"]').forEach(input => {
                        tasks.push({
                            type: 'text',
                            text: input.placeholder || 'Campo de texto',
                            element: input
                        });
                    });
                    
                    // Adiciona grupos de rádio
                    Object.entries(radioGroups).forEach(([name, radios]) => {
                        const parent = radios[0].closest('form, div, fieldset');
                        const question = parent?.querySelector('h1,h2,h3,h4,p,label,legend')?.textContent?.trim() || 'Pergunta';
                        
                        tasks.push({
                            type: 'radio',
                            text: question.substring(0, 100),
                            radios: radios,
                            name: name
                        });
                    });
                    
                    // Envia pro app principal
                    window.parent.postMessage({
                        action: 'tasksFound',
                        tasks: tasks.map(t => ({
                            type: t.type,
                            text: t.text,
                            name: t.name,
                            optionsCount: t.radios?.length || 0
                        }))
                    }, '*');
                }
                
                function answerTask(index, answer) {
                    const radioGroups = {};
                    document.querySelectorAll('input[type="radio"]').forEach(r => {
                        if (!radioGroups[r.name]) radioGroups[r.name] = [];
                        radioGroups[r.name].push(r);
                    });
                    
                    const groups = Object.values(radioGroups);
                    if (groups[index] && groups[index][answer]) {
                        groups[index][answer].click();
                        groups[index][answer].dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
                
                // Notifica que está pronto
                window.parent.postMessage({ action: 'scriptReady' }, '*');
            `;
            
            iframe.contentWindow.eval(script);
            this.addLog('✅ Script injetado na plataforma!', 'success');
        } catch (e) {
            this.addLog(`⚠️ Não foi possível injetar script: ${e.message}`, 'error');
            this.addLog('💡 Isso acontece porque o site bloqueia iframes. Use o Cloudflare Worker!', 'info');
        }
    }

    scanPlatform() {
        this.addLog('🔍 Escaneando plataforma...', 'info');
        
        const iframe = document.getElementById('platformFrame');
        
        // Envia comando para o iframe
        iframe.contentWindow.postMessage({ action: 'scan' }, '*');
        
        // Escuta a resposta
        window.addEventListener('message', (event) => {
            if (event.data.action === 'tasksFound') {
                this.tasks = event.data.tasks.map((t, i) => ({
                    ...t,
                    id: i,
                    status: 'pending'
                }));
                
                this.stats.total = this.tasks.length;
                this.renderTasks();
                this.updateDashboard();
                this.addLog(`📚 ${this.tasks.length} tarefas encontradas!`, 'success');
            }
        });
    }

    async autoAnswer() {
        if (!this.config.apiKey) {
            this.addLog('⚠️ Configure sua API primeiro em 🔑 API', 'warning');
            return;
        }

        const pendingTasks = this.tasks.filter(t => t.status === 'pending');
        
        if (pendingTasks.length === 0) {
            this.addLog('⚠️ Nenhuma tarefa pendente. Escaneie primeiro!', 'warning');
            return;
        }

        this.addLog(`🤖 Iniciando auto-resposta para ${pendingTasks.length} tarefas...`, 'info');

        for (let i = 0; i < pendingTasks.length; i++) {
            const task = pendingTasks[i];
            
            try {
                // Pergunta pra API
                const answer = await this.askAI(task.text, task.type);
                this.addLog(`🤖 Tarefa ${i+1}: ${answer}`, 'api');
                
                // Envia resposta pro iframe
                const iframe = document.getElementById('platformFrame');
                iframe.contentWindow.postMessage({
                    action: 'answer',
                    taskIndex: i,
                    answer: answer
                }, '*');
                
                task.status = 'done';
                this.stats.done++;
                this.stats.ai++;
                
                await this.delay(this.config.delay * 1000);
            } catch (error) {
                this.addLog(`❌ Erro na tarefa ${i+1}: ${error.message}`, 'error');
            }
        }

        this.renderTasks();
        this.updateDashboard();
        this.addLog('✅ Auto-resposta concluída!', 'success');
    }

    // ========== API ==========
    async askAI(question, type) {
        const provider = this.config.apiProvider;
        const apiKey = this.config.apiKey;
        
        if (!apiKey) throw new Error('API não configurada');

        const prompt = `Responda APENAS com a letra da alternativa correta (A, B, C, D ou E).\n\nPergunta: ${question}\nTipo: ${type}\n\nResposta:`;

        switch (provider) {
            case 'gemini':
                return await this.callGemini(prompt);
            case 'openai':
                return await this.callOpenAI(prompt);
            case 'deepseek':
                return await this.callDeepSeek(prompt);
            case 'custom':
                return await this.callCustom(prompt);
            default:
                return 'A';
        }
    }

    async callGemini(prompt) {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/${this.config.apiModel || 'gemini-pro'}:generateContent?key=${this.config.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 10 }
                })
            }
        );
        
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().charAt(0).toUpperCase() || 'A';
    }

    async callOpenAI(prompt) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: this.config.apiModel || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 10,
                temperature: 0.3
            })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        
        return data.choices?.[0]?.message?.content?.trim().charAt(0).toUpperCase() || 'A';
    }

    async callDeepSeek(prompt) {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: this.config.apiModel || 'deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 10
            })
        });
        
        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim().charAt(0).toUpperCase() || 'A';
    }

    async callCustom(prompt) {
        const response = await fetch(this.config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({ prompt })
        });
        
        const data = await response.json();
        return data.resposta || data.answer || 'A';
    }

    async testApi() {
        const resultDiv = document.getElementById('testResult');
        resultDiv.textContent = '⏳ Testando...';
        resultDiv.className = 'test-result loading';

        try {
            const answer = await this.askAI('Quanto é 2+2?', 'multipla_escolha');
            resultDiv.textContent = `✅ Funcionando! Resposta: ${answer}`;
            resultDiv.className = 'test-result success';
            this.addLog('🧪 API testada com sucesso!', 'success');
        } catch (error) {
            resultDiv.textContent = `❌ ${error.message}`;
            resultDiv.className = 'test-result error';
            this.addLog(`❌ Teste falhou: ${error.message}`, 'error');
        }
    }

    saveApiConfig() {
        this.config.apiProvider = document.getElementById('apiProvider').value;
        this.config.apiKey = document.getElementById('apiKey').value;
        this.config.apiUrl = document.getElementById('apiUrl').value;
        this.config.proxyUrl = document.getElementById('apiUrl').value; // Worker URL
        
        this.saveConfig();
        this.addLog('🔑 API salva!', 'success');
    }

    // ========== CHAT ==========
    async sendChat() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (!message || !this.config.apiKey) return;

        this.addChatMessage('user', 'Você', message);
        input.value = '';

        const typingId = this.addChatMessage('bot', 'Lionel', '✍️ Pensando...');

        try {
            const response = await this.chatWithLionel(message);
            this.removeChatMessage(typingId);
            this.addChatMessage('bot', 'Lionel', response);
        } catch (error) {
            this.removeChatMessage(typingId);
            this.addChatMessage('bot', 'Lionel', `❌ ${error.message}`);
        }
    }

    async chatWithLionel(message) {
        const systemPrompt = `Você é Lionel, um leão assistente de estudos 🦁. 
Você SABE que seu nome é Lionel. Você é dourado, amigável e inteligente.
Responda de forma clara e didática. Use emojis.

Usuário: ${message}
Lionel:`;

        return await this.callGemini(systemPrompt);
    }

    addChatMessage(type, sender, text) {
        const container = document.getElementById('chatMessages');
        const id = 'msg-' + Date.now();
        
        const div = document.createElement('div');
        div.className = `chat-message ${type}`;
        div.id = id;
        div.innerHTML = `
            <div class="message-avatar">${type === 'bot' ? '🦁' : '👤'}</div>
            <div class="message-content">
                <strong>${sender}</strong>
                <p>${text}</p>
            </div>
        `;
        
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return id;
    }

    removeChatMessage(id) {
        document.getElementById(id)?.remove();
    }

    // ========== UI ==========
    navigateTo(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        
        document.getElementById(`page-${page}`)?.classList.add('active');
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
        
        this.toggleMenu(false);
    }

    toggleMenu(open) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        if (open) {
            sidebar.classList.add('open');
            overlay.classList.add('open');
        } else {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
        }
    }

    renderTasks() {
        const container = document.getElementById('taskList');
        
        if (this.tasks.length === 0) {
            container.innerHTML = '<div class="empty-state"><span class="empty-icon">🔍</span><p>Escaneie a plataforma</p></div>';
            return;
        }

        container.innerHTML = this.tasks.map(task => `
            <div class="task-item">
                <div class="task-info">
                    <div class="task-title">${task.text}</div>
                    <small style="color:#888;">${task.type} ${task.optionsCount ? `(${task.optionsCount} opções)` : ''}</small>
                </div>
                <span class="task-status ${task.status}">
                    ${task.status === 'done' ? '✅' : '⏳'}
                </span>
            </div>
        `).join('');
    }

    updateDashboard() {
        document.getElementById('statTotal').textContent = this.stats.total;
        document.getElementById('statDone').textContent = this.stats.done;
        document.getElementById('statAI').textContent = this.stats.ai;
    }

    addLog(message, type = 'info') {
        this.logs.unshift({ timestamp: new Date().toLocaleTimeString(), message, type });
        if (this.logs.length > 200) this.logs.pop();
        
        const container = document.getElementById('logContainer');
        if (container) {
            container.innerHTML = this.logs.map(l => 
                `<div class="log-entry log-${l.type}">[${l.timestamp}] ${l.message}</div>`
            ).join('');
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.lionelApp = new LionelApp();
    
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});
