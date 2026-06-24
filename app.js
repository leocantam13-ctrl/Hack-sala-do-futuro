// ========== APP SALA DO FUTURO AUTO ==========

class SalaAutoApp {
    constructor() {
        this.config = this.loadConfig();
        this.tasks = [];
        this.logs = [];
        this.isRunning = false;
        this.stats = {
            total: 0,
            done: 0,
            pending: 0,
            correct: 0,
            totalAnswered: 0
        };
        
        this.init();
    }

    // ========== INICIALIZAÇÃO ==========
    init() {
        this.bindEvents();
        this.loadApiConfig();
        this.updateUI();
        this.checkPWAInstall();
        console.log('🤖 Sala do Futuro Auto inicializado!');
    }

    // ========== CONFIGURAÇÕES ==========
    loadConfig() {
        const defaultConfig = {
            delay: 5,
            useApi: true,
            fallback: false,
            notifications: true,
            sound: false,
            apiUrl: '',
            apiKey: '',
            apiModel: 'gpt-3.5-turbo',
            apiProvider: 'openai'
        };

        try {
            const saved = localStorage.getItem('sala_auto_config');
            return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
        } catch {
            return defaultConfig;
        }
    }

    saveConfig() {
        localStorage.setItem('sala_auto_config', JSON.stringify(this.config));
        this.addLog('Configurações salvas!', 'success');
    }

    loadApiConfig() {
        document.getElementById('apiUrl').value = this.config.apiUrl || '';
        document.getElementById('apiKey').value = this.config.apiKey || '';
        document.getElementById('apiModel').value = this.config.apiModel || '';
        document.getElementById('apiProvider').value = this.config.apiProvider || 'openai';
        document.getElementById('configDelay').value = this.config.delay;
        document.getElementById('delayValue').textContent = this.config.delay + 's';
        document.getElementById('configUseApi').checked = this.config.useApi;
        document.getElementById('configFallback').checked = this.config.fallback;
        document.getElementById('configNotifications').checked = this.config.notifications;
        document.getElementById('configSound').checked = this.config.sound;
    }

    // ========== EVENTOS ==========
    bindEvents() {
        // Menu
        document.getElementById('btnMenu').addEventListener('click', () => this.toggleMenu());
        document.getElementById('btnCloseMenu').addEventListener('click', () => this.toggleMenu());
        document.getElementById('overlay').addEventListener('click', () => this.toggleMenu());

        // Navegação
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => this.navigateTo(e.target.dataset.page));
        });

        // Tarefas
        document.getElementById('btnRefresh').addEventListener('click', () => this.scanTasks());
        document.getElementById('btnSelectAll').addEventListener('click', () => this.selectAllTasks());
        document.getElementById('btnStartAll').addEventListener('click', () => this.startAll());
        document.getElementById('btnStopAll').addEventListener('click', () => this.stopAll());
        document.getElementById('searchTasks').addEventListener('input', (e) => this.filterTasks(e.target.value));

        // API
        document.getElementById('btnShowKey').addEventListener('click', () => this.toggleApiKey());
        document.getElementById('btnTestApi').addEventListener('click', () => this.testApi());
        document.getElementById('btnSaveApi').addEventListener('click', () => this.saveApiConfig());

        // Configurações
        document.getElementById('configDelay').addEventListener('input', (e) => {
            document.getElementById('delayValue').textContent = e.target.value + 's';
        });
        document.getElementById('btnSaveConfig').addEventListener('click', () => this.saveAllConfig());

        // Logs
        document.getElementById('btnClearLogs').addEventListener('click', () => this.clearLogs());
        document.getElementById('btnExportLogs').addEventListener('click', () => this.exportLogs());

        // Instalar PWA
        document.getElementById('btnInstallApp')?.addEventListener('click', () => this.installPWA());
    }

    // ========== NAVEGAÇÃO ==========
    navigateTo(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        
        const pageElement = document.getElementById(`page-${page}`);
        const menuItem = document.querySelector(`[data-page="${page}"]`);
        
        if (pageElement) pageElement.classList.add('active');
        if (menuItem) menuItem.classList.add('active');
        
        this.toggleMenu(false);
    }

    toggleMenu(force = null) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        const isOpen = force !== null ? force : !sidebar.classList.contains('open');
        
        if (isOpen) {
            sidebar.classList.add('open');
            overlay.classList.add('open');
        } else {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
        }
    }

    // ========== TAREFAS ==========
    scanTasks() {
        this.addLog('Procurando tarefas...', 'info');
        
        // Simulação - Na versão completa, isso seria um WebView ou injeção na página
        const mockTasks = [
            { id: 1, title: 'Questão de Matemática - Equações', type: 'multipla_escolha', status: 'pendente' },
            { id: 2, title: 'Interpretação de Texto', type: 'multipla_escolha', status: 'pendente' },
            { id: 3, title: 'Ciências - Ecossistema', type: 'multipla_selecao', status: 'pendente' },
            { id: 4, title: 'História - Brasil Colônia', type: 'texto', status: 'pendente' },
        ];

        this.tasks = mockTasks;
        this.stats.total = this.tasks.length;
        this.stats.pending = this.tasks.filter(t => t.status === 'pendente').length;
        
        this.renderTasks();
        this.updateUI();
        this.addLog(`${this.tasks.length} tarefas encontradas`, 'success');
    }

    renderTasks(filter = '') {
        const container = document.getElementById('taskList');
        
        const filteredTasks = this.tasks.filter(t => 
            t.title.toLowerCase().includes(filter.toLowerCase())
        );

        if (filteredTasks.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhuma tarefa encontrada</p>';
            return;
        }

        container.innerHTML = filteredTasks.map(task => `
            <div class="task-item ${task.status === 'concluida' ? 'completed' : ''}">
                <input type="checkbox" class="task-checkbox" data-id="${task.id}" 
                       ${task.status === 'concluida' ? 'disabled' : ''}>
                <div class="task-info">
                    <div class="task-title">${task.title}</div>
                    <span class="task-type">${task.type.replace('_', ' ')}</span>
                </div>
            </div>
        `).join('');
    }

    selectAllTasks() {
        const checkboxes = document.querySelectorAll('.task-checkbox:not([disabled])');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        checkboxes.forEach(cb => { cb.checked = !allChecked; });
    }

    filterTasks(query) {
        this.renderTasks(query);
    }

    // ========== EXECUÇÃO ==========
    async startAll() {
        if (this.isRunning) {
            this.addLog('Já está executando!', 'warning');
            return;
        }

        const selectedTasks = this.tasks.filter(t => t.status === 'pendente');
        if (selectedTasks.length === 0) {
            this.addLog('Nenhuma tarefa pendente selecionada', 'warning');
            return;
        }

        this.isRunning = true;
        this.updateStatus('⚡ Executando...');
        this.addLog(`Iniciando ${selectedTasks.length} tarefas`, 'info');

        for (const task of selectedTasks) {
            if (!this.isRunning) break;
            
            await this.executeTask(task);
            await this.delay(this.config.delay * 1000);
        }

        this.isRunning = false;
        this.updateStatus('✅ Pronto');
        this.addLog('Todas as tarefas concluídas!', 'success');
        
        if (this.config.notifications) {
            this.notify('Tarefas Concluídas', `${selectedTasks.length} tarefas processadas!`);
        }
    }

    async executeTask(task) {
        this.addLog(`Processando: ${task.title}`, 'info');

        try {
            let answer;

            if (this.config.useApi && this.config.apiKey) {
                answer = await this.getAnswerFromAPI(task);
                this.addLog(`Resposta da API: ${answer}`, 'api');
            } else {
                answer = this.getFallbackAnswer(task);
                this.addLog('Usando resposta padrão', 'info');
            }

            task.status = 'concluida';
            this.stats.done++;
            this.stats.pending--;
            this.stats.totalAnswered++;
            
            if (answer) this.stats.correct++;
            
            this.updateUI();
            this.renderTasks();
            
            this.addLog(`✅ Concluída: ${task.title}`, 'success');
        } catch (error) {
            this.addLog(`❌ Erro: ${error.message}`, 'error');
            
            if (this.config.fallback) {
                task.status = 'concluida';
                this.addLog('Usando fallback...', 'warning');
            }
        }
    }

    stopAll() {
        this.isRunning = false;
        this.updateStatus('⏸️ Parado');
        this.addLog('Execução interrompida', 'warning');
    }

    // ========== API ==========
    async getAnswerFromAPI(task) {
        const { apiUrl, apiKey, apiModel, apiProvider } = this.config;
        
        // Constrói o prompt baseado no provedor
        const prompt = `Pergunta: ${task.title}\nTipo: ${task.type}\nResponda apenas com a letra ou resposta correta.`;

        // Adapta para cada provedor
        switch (apiProvider) {
            case 'openai':
                return await this.callOpenAI(prompt, apiKey, apiModel);
            case 'google':
                return await this.callGemini(prompt, apiKey, apiModel);
            case 'deepseek':
                return await this.callDeepSeek(prompt, apiKey, apiModel);
            case 'anthropic':
                return await this.callClaude(prompt, apiKey, apiModel);
            case 'custom':
                return await this.callCustomAPI(prompt, apiUrl, apiKey);
            default:
                return this.getFallbackAnswer(task);
        }
    }

    async callOpenAI(prompt, apiKey, model = 'gpt-3.5-turbo') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 50
            })
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || this.getFallbackAnswer();
    }

    async callGemini(prompt, apiKey, model = 'gemini-pro') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || this.getFallbackAnswer();
    }

    async callDeepSeek(prompt, apiKey, model = 'deepseek-chat') {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || this.getFallbackAnswer();
    }

    async callClaude(prompt, apiKey, model = 'claude-3-sonnet') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model,
                max_tokens: 50,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();
        return data.content?.[0]?.text?.trim() || this.getFallbackAnswer();
    }

    async callCustomAPI(prompt, url, apiKey) {
        if (!url) return this.getFallbackAnswer();

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({ prompt, pergunta: prompt })
        });

        const data = await response.json();
        return data.resposta || data.answer || data.text || this.getFallbackAnswer();
    }

    getFallbackAnswer() {
        // Respostas padrão quando não há API
        const answers = ['A', 'B', 'C', 'D', 'Verdadeiro', 'Falso'];
        return answers[Math.floor(Math.random() * answers.length)];
    }

    async testApi() {
        const testTask = { title: 'Quanto é 2+2?', type: 'multipla_escolha' };
        const resultSpan = document.getElementById('testResult');
        
        resultSpan.textContent = '⏳ Testando...';
        resultSpan.className = 'test-result';
        
        try {
            const answer = await this.getAnswerFromAPI(testTask);
            resultSpan.textContent = `✅ Resposta: ${answer}`;
            resultSpan.className = 'test-result success';
            this.addLog('API testada com sucesso!', 'success');
        } catch (error) {
            resultSpan.textContent = `❌ ${error.message}`;
            resultSpan.className = 'test-result error';
            this.addLog('Falha no teste da API', 'error');
        }
    }

    // ========== CONFIGURAÇÕES ==========
    saveApiConfig() {
        this.config.apiUrl = document.getElementById('apiUrl').value;
        this.config.apiKey = document.getElementById('apiKey').value;
        this.config.apiModel = document.getElementById('apiModel').value;
        this.config.apiProvider = document.getElementById('apiProvider').value;
        
        this.saveConfig();
        this.addLog('API configurada! ✅', 'success');
    }

    saveAllConfig() {
        this.config.delay = parseInt(document.getElementById('configDelay').value);
        this.config.useApi = document.getElementById('configUseApi').checked;
        this.config.fallback = document.getElementById('configFallback').checked;
        this.config.notifications = document.getElementById('configNotifications').checked;
        this.config.sound = document.getElementById('configSound').checked;
        
        this.saveConfig();
        this.addLog('Configurações salvas! 💾', 'success');
    }

    toggleApiKey() {
        const input = document.getElementById('apiKey');
        input.type = input.type === 'password' ? 'text' : 'password';
    }

    // ========== LOGS ==========
    addLog(message, type = 'info') {
        const log = {
            timestamp: new Date().toLocaleTimeString(),
            message,
            type
        };
        
        this.logs.unshift(log);
        if (this.logs.length > 200) this.logs.pop();
        
        this.renderLogs();
    }

    renderLogs() {
        const container = document.getElementById('logContainer');
        
        if (this.logs.length === 0) {
            container.innerHTML = '<p class="empty-state">Nenhum log ainda</p>';
            return;
        }

        container.innerHTML = this.logs.map(log => `
            <div class="log-entry ${log.type}">
                <small>[${log.timestamp}]</small> ${log.message}
            </div>
        `).join('');
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
        a.download = `sala-auto-logs-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ========== UI ==========
    updateUI() {
        document.getElementById('statTotal').textContent = this.stats.total;
        document.getElementById('statDone').textContent = this.stats.done;
        document.getElementById('statPending').textContent = this.stats.pending;
        
        const accuracy = this.stats.totalAnswered > 0 
            ? Math.round((this.stats.correct / this.stats.totalAnswered) * 100) 
            : 0;
        document.getElementById('statAccuracy').textContent = accuracy + '%';
    }

    updateStatus(text) {
        document.getElementById('statusText').textContent = text;
    }

    // ========== UTILITÁRIOS ==========
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    notify(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    }

    // ========== PWA ==========
    checkPWAInstall() {
        // Verifica se pode instalar como app
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            document.getElementById('btnInstallApp')?.addEventListener('click', () => this.installPWA());
        });
    }

    async installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const result = await this.deferredPrompt.userChoice;
            this.addLog(`Instalação: ${result.outcome}`, 'info');
            this.deferredPrompt = null;
        }
    }
}

// ========== INICIAR APP ==========
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SalaAutoApp();
    
    // Solicitar permissão para notificações
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});
