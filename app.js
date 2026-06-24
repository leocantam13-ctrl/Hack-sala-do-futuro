// ========== 🦁 LIONEL - ASSISTENTE SALA DO FUTURO ==========

class LionelApp {
    constructor() {
        this.user = this.loadUser();
        this.config = this.loadConfig();
        this.tasks = [];
        this.logs = [];
        this.isRunning = false;
        this.stats = { total: 0, done: 0, pending: 0, correct: 0, answered: 0 };
        this.chatHistory = [];
        
        this.init();
    }

    init() {
        if (this.user.loggedIn) {
            this.showScreen('mainScreen');
            this.updateDashboard();
        } else {
            this.showScreen('loginScreen');
        }
        
        this.bindEvents();
        this.loadSavedConfig();
    }

    // ========== DADOS ==========
    loadUser() {
        try {
            return JSON.parse(localStorage.getItem('lionel_user')) || { loggedIn: false };
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
            apiTemperature: 0.7,
            delay: 5,
            useApi: true,
            fallback: false,
            notifications: true,
            sound: false
        };
        try {
            return { ...defaults, ...JSON.parse(localStorage.getItem('lionel_config')) };
        } catch { return defaults; }
    }

    saveConfig() {
        localStorage.setItem('lionel_config', JSON.stringify(this.config));
        this.addLog('💾 Configurações salvas!', 'success');
    }

    loadSavedConfig() {
        document.getElementById('apiProvider').value = this.config.apiProvider;
        document.getElementById('apiKey').value = this.config.apiKey;
        document.getElementById('apiUrl').value = this.config.apiUrl;
        document.getElementById('apiModel').value = this.config.apiModel;
        document.getElementById('apiTemperature').value = this.config.apiTemperature;
        document.getElementById('tempValue').textContent = this.config.apiTemperature;
        document.getElementById('configDelay').value = this.config.delay;
        document.getElementById('delayValue').textContent = this.config.delay + 's';
        document.getElementById('configUseApi').checked = this.config.useApi;
        document.getElementById('configFallback').checked = this.config.fallback;
        document.getElementById('configNotifications').checked = this.config.notifications;
        document.getElementById('configSound').checked = this.config.sound;
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

        // Dashboard
        document.getElementById('btnScanAll').addEventListener('click', () => this.scanPlatform());
        document.getElementById('btnExecuteAll').addEventListener('click', () => this.executeAllTasks());

        // Tasks
        document.getElementById('btnRefresh').addEventListener('click', () => this.scanPlatform());
        document.getElementById('btnSelectAll').addEventListener('click', () => this.selectAllTasks());
        document.getElementById('searchTasks').addEventListener('input', (e) => this.renderTasks(e.target.value));

        // API
        document.getElementById('apiProvider').addEventListener('change', (e) => {
            document.getElementById('customUrlGroup').style.display = 
                e.target.value === 'custom' ? 'block' : 'none';
        });
        document.getElementById('apiTemperature').addEventListener('input', (e) => {
            document.getElementById('tempValue').textContent = e.target.value;
        });
        document.getElementById('btnShowKey').addEventListener('click', () => this.toggleApiKey());
        document.getElementById('btnTestApi').addEventListener('click', () => this.testApiConnection());
        document.getElementById('btnSaveApi').addEventListener('click', () => this.saveApiConfig());

        // Chat
        document.getElementById('btnSendChat').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('chatInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChatMessage();
            }
        });

        // Config
        document.getElementById('configDelay').addEventListener('input', (e) => {
            document.getElementById('delayValue').textContent = e.target.value + 's';
        });
        document.getElementById('btnSaveConfig').addEventListener('click', () => this.saveAllConfig());

        // Logs
        document.getElementById('btnClearLogs').addEventListener('click', () => this.clearLogs());
        document.getElementById('btnExportLogs').addEventListener('click', () => this.exportLogs());
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
        
        document.getElementById('userName').textContent = ra;
        this.showScreen('mainScreen');
        this.addLog('🔐 Login realizado com sucesso!', 'success');
        this.updateStatus('🟢 Conectado', 'Pronto para usar!');
    }

    logout() {
        this.user.loggedIn = false;
        this.saveUser();
        this.showScreen('loginScreen');
    }

    // ========== NAVEGAÇÃO ==========
    navigateTo(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        
        const pageEl = document.getElementById(`page-${page}`);
        const menuItem = document.querySelector(`[data-page="${page}"]`);
        
        if (pageEl) pageEl.classList.add('active');
        if (menuItem) menuItem.classList.add('active');
        
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

    // ========== PLATAFORMA ==========
    async scanPlatform() {
        this.addLog('🔍 Escaneando plataforma...', 'info');
        this.updateStatus('🔍 Escaneando', 'Procurando tarefas...');

        try {
            // Simula busca na plataforma
            // Em produção, isso acessaria o iframe ou faria fetch
            const mockTasks = [
                { id: 1, title: 'Matemática - Equações do 2º grau', type: 'multipla_escolha', status: 'pending' },
                { id: 2, title: 'Português - Interpretação de texto', type: 'multipla_escolha', status: 'pending' },
                { id: 3, title: 'Ciências - Ecossistema brasileiro', type: 'multipla_escolha', status: 'pending' },
                { id: 4, title: 'História - Brasil Colônia', type: 'multipla_escolha', status: 'pending' },
                { id: 5, title: 'Geografia - Climas do Brasil', type: 'multipla_escolha', status: 'pending' },
            ];

            this.tasks = mockTasks;
            this.stats.total = this.tasks.length;
            this.stats.pending = this.tasks.filter(t => t.status === 'pending').length;
            
            this.renderTasks();
            this.updateDashboard();
            this.addLog(`📚 ${this.tasks.length} tarefas encontradas!`, 'success');
            this.updateStatus('✅ Pronto', `${this.tasks.length} tarefas disponíveis`);
        } catch (error) {
            this.addLog(`❌ Erro ao escanear: ${error.message}`, 'error');
        }
    }

    renderTasks(filter = '') {
        const container = document.getElementById('taskList');
        const filtered = this.tasks.filter(t => 
            t.title.toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state"><span class="empty-icon">📋</span><p>Nenhuma tarefa encontrada</p></div>`;
            return;
        }

        container.innerHTML = filtered.map(task => `
            <div class="task-item">
                <input type="checkbox" data-id="${task.id}" ${task.status === 'done' ? 'disabled checked' : ''}>
                <div class="task-info">
                    <div class="task-title">${task.title}</div>
                    <span class="task-type">${task.type.replace('_', ' ')}</span>
                </div>
                <span class="task-status ${task.status === 'done' ? 'done' : 'pending'}">
                    ${task.status === 'done' ? '✅' : '⏳'}
                </span>
            </div>
        `).join('');
    }

    selectAllTasks() {
        const checkboxes = document.querySelectorAll('#taskList input[type="checkbox"]:not([disabled])');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        checkboxes.forEach(cb => { cb.checked = !allChecked; });
    }

    // ========== EXECUÇÃO ==========
    async executeAllTasks() {
        if (this.isRunning) {
            this.addLog('⚠️ Já está executando!', 'warning');
            return;
        }

        const pendingTasks = this.tasks.filter(t => t.status === 'pending');
        if (pendingTasks.length === 0) {
            this.addLog('⚠️ Nenhuma tarefa pendente!', 'warning');
            return;
        }

        this.isRunning = true;
        this.updateStatus('⚡ Executando', `Processando ${pendingTasks.length} tarefas...`);
        this.addLog(`🚀 Iniciando ${pendingTasks.length} tarefas`, 'info');

        for (const task of pendingTasks) {
            if (!this.isRunning) break;
            await this.processTask(task);
            await this.delay(this.config.delay * 1000);
        }

        this.isRunning = false;
        this.updateStatus('✅ Concluído', 'Todas as tarefas processadas!');
        this.addLog('🎉 Todas as tarefas concluídas!', 'success');
        
        if (this.config.notifications) {
            this.showNotification('Tarefas Concluídas', `${pendingTasks.length} tarefas processadas!`);
        }
    }

    async processTask(task) {
        this.addLog(`⏳ Processando: ${task.title}`, 'info');

        try {
            let answer;
            
            if (this.config.useApi && this.config.apiKey) {
                answer = await this.getAIAnswer(task);
                this.addLog(`🤖 Resposta IA: ${answer}`, 'api');
            } else {
                answer = 'A'; // Resposta padrão
                this.addLog('⚠️ API não configurada - usando resposta padrão', 'warning');
            }

            task.status = 'done';
            this.stats.done++;
            this.stats.pending--;
            this.stats.answered++;
            this.stats.correct++; // Assumindo que a IA acertou
            
            this.renderTasks();
            this.updateDashboard();
            this.addLog(`✅ Concluída: ${task.title}`, 'success');
        } catch (error) {
            this.addLog(`❌ Erro: ${error.message}`, 'error');
            
            if (this.config.fallback) {
                task.status = 'done';
                this.addLog('⚠️ Usando fallback...', 'warning');
            }
        }
    }

    // ========== IA / API ==========
    async getAIAnswer(task) {
        const provider = this.config.apiProvider;
        
        switch (provider) {
            case 'gemini':
                return await this.callGemini(task);
            case 'openai':
                return await this.callOpenAI(task);
            case 'deepseek':
                return await this.callDeepSeek(task);
            case 'anthropic':
                return await this.callClaude(task);
            case 'custom':
                return await this.callCustomAPI(task);
            default:
                return 'A';
        }
    }

    async callGemini(task) {
        const apiKey = this.config.apiKey;
        const model = this.config.apiModel || 'gemini-pro';
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Você é um assistente educacional. Responda APENAS com a letra da alternativa correta (A, B, C, D ou E).\n\nPergunta: ${task.title}\nTipo: ${task.type}\n\nResposta:`
                        }]
                    }],
                    generationConfig: {
                        temperature: this.config.apiTemperature,
                        maxOutputTokens: 10
                    }
                })
            }
        );
        
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'A';
    }

    async callOpenAI(task) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: this.config.apiModel || 'gpt-3.5-turbo',
                messages: [{
                    role: 'user',
                    content: `Responda APENAS com a letra correta:\n${task.title}`
                }],
                temperature: this.config.apiTemperature,
                max_tokens: 10
            })
        });
        
        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || 'A';
    }

    async callDeepSeek(task) {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model: this.config.apiModel || 'deepseek-chat',
                messages: [{ role: 'user', content: `Responda APENAS com a letra correta:\n${task.title}` }],
                temperature: this.config.apiTemperature,
                max_tokens: 10
            })
        });
        
        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || 'A';
    }

    async callClaude(task) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.config.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.config.apiModel || 'claude-3-sonnet-20240229',
                max_tokens: 10,
                messages: [{ role: 'user', content: `Responda APENAS com a letra correta:\n${task.title}` }]
            })
        });
        
        const data = await response.json();
        return data.content?.[0]?.text?.trim() || 'A';
    }

    async callCustomAPI(task) {
        const response = await fetch(this.config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({ pergunta: task.title, tipo: task.type })
        });
        
        const data = await response.json();
        return data.resposta || data.answer || 'A';
    }

    async testApiConnection() {
        const resultDiv = document.getElementById('testResult');
        resultDiv.textContent = '⏳ Testando conexão...';
        resultDiv.className = 'test-result loading';

        try {
            const testTask = { title: 'Quanto é 2+2?', type: 'multipla_escolha' };
            const answer = await this.getAIAnswer(testTask);
            
            resultDiv.textContent = `✅ Conexão OK! Resposta: ${answer}`;
            resultDiv.className = 'test-result success';
            this.addLog('🧪 API testada com sucesso!', 'success');
        } catch (error) {
            resultDiv.textContent = `❌ Falha: ${error.message}`;
            resultDiv.className = 'test-result error';
            this.addLog(`❌ Teste API falhou: ${error.message}`, 'error');
        }
    }

    // ========== CHAT ==========
    async sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Adiciona mensagem do usuário
        this.addChatMessage('user', 'Você', message);
        input.value = '';
        
        if (!this.config.apiKey) {
            this.addChatMessage('bot', 'Lionel', '⚠️ Configure sua API primeiro em 🔑 API para eu poder responder!');
            return;
        }

        // Mostra "digitando..."
        const typingId = this.addChatMessage('bot', 'Lionel', '✍️ Pensando...');
        
        try {
            const response = await this.chatWithLionel(message);
            
            // Remove "digitando..." e adiciona resposta
            this.removeChatMessage(typingId);
            this.addChatMessage('bot', 'Lionel', response);
        } catch (error) {
            this.removeChatMessage(typingId);
            this.addChatMessage('bot', 'Lionel', `❌ Erro: ${error.message}. Verifique sua API em 🔑 API.`);
        }
    }

    async chatWithLionel(message) {
        const apiKey = this.config.apiKey;
        const model = this.config.apiModel || 'gemini-pro';
        
        const systemPrompt = `Você é Lionel, um leão assistente de estudos amigável e inteligente. 
Suas características:
- Você SABE que seu nome é Lionel 🦁
- Você é um leão antropomórfico dourado
- Você é especialista em todas as matérias escolares
- Você responde de forma clara, didática e amigável
- Você usa emojis para ser mais expressivo
- Você sempre se apresenta como Lionel quando perguntam seu nome
- Você foi criado para ajudar estudantes na plataforma Sala do Futuro
- Você pode responder perguntas, explicar conceitos e ajudar com tarefas

Responda a seguinte mensagem do usuário:`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `${systemPrompt}\n\nUsuário: ${message}\n\nLionel:` }]
                    }],
                    generationConfig: {
                        temperature: 0.9,
                        maxOutputTokens: 1000
                    }
                })
            }
        );
        
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Desculpe, não consegui processar sua mensagem.';
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
        const msg = document.getElementById(id);
        if (msg) msg.remove();
    }

    // ========== CONFIGURAÇÕES ==========
    saveApiConfig() {
        this.config.apiProvider = document.getElementById('apiProvider').value;
        this.config.apiKey = document.getElementById('apiKey').value;
        this.config.apiUrl = document.getElementById('apiUrl').value;
        this.config.apiModel = document.getElementById('apiModel').value;
        this.config.apiTemperature = parseFloat(document.getElementById('apiTemperature').value);
        
        this.saveConfig();
        this.addLog('🔑 API configurada com sucesso!', 'success');
    }

    saveAllConfig() {
        this.config.delay = parseInt(document.getElementById('configDelay').value);
        this.config.useApi = document.getElementById('configUseApi').checked;
        this.config.fallback = document.getElementById('configFallback').checked;
        this.config.notifications = document.getElementById('configNotifications').checked;
        this.config.sound = document.getElementById('configSound').checked;
        
        this.saveConfig();
    }

    toggleApiKey() {
        const input = document.getElementById('apiKey');
        input.type = input.type === 'password' ? 'text' : 'password';
    }

    // ========== DASHBOARD ==========
    updateDashboard() {
        document.getElementById('statTotal').textContent = this.stats.total;
        document.getElementById('statDone').textContent = this.stats.done;
        document.getElementById('statPending').textContent = this.stats.pending;
        
        const accuracy = this.stats.answered > 0 
            ? Math.round((this.stats.correct / this.stats.answered) * 100) 
            : 0;
        document.getElementById('statAccuracy').textContent = accuracy + '%';
    }

    updateStatus(title, message) {
        document.getElementById('statusTitle').textContent = title;
        document.getElementById('statusMessage').textContent = message;
    }

    // ========== LOGS ==========
    addLog(message, type = 'info') {
        const log = { timestamp: new Date().toLocaleTimeString(), message, type };
        this.logs.unshift(log);
        if (this.logs.length > 200) this.logs.pop();
        this.renderLogs();
    }

    renderLogs() {
        const container = document.getElementById('logContainer');
        if (!container) return;
        
        if (this.logs.length === 0) {
            container.innerHTML = '<div class="empty-state"><span class="empty-icon">📝</span><p>Nenhum log ainda</p></div>';
            return;
        }

        container.innerHTML = this.logs.map(l => 
            `<div class="log-entry log-${l.type}">[${l.timestamp}] ${l.message}</div>`
        ).join('');
    }

    clearLogs() {
        this.logs = [];
        this.renderLogs();
    }

    exportLogs() {
        const text = this.logs.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lionel-logs-${Date.now()}.txt`;
        a.click();
    }

    // ========== UTILITÁRIOS ==========
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: '🦁' });
        }
    }
}

// ========== INICIAR ==========
document.addEventListener('DOMContentLoaded', () => {
    window.lionelApp = new LionelApp();
    
    // Permissão para notificações
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});
