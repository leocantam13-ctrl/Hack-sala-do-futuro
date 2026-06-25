// Cloudflare Worker - Proxy para Sala do Futuro
// Deploy gratuito em: workers.cloudflare.com

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return new Response('URL não fornecida', { status: 400 });
    }

    try {
        // Busca a página real
        let response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            },
            redirect: 'follow'
        });

        // Modifica headers para permitir iframe
        let headers = new Headers(response.headers);
        headers.delete('x-frame-options');
        headers.delete('content-security-policy');
        headers.delete('X-Content-Security-Policy');
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        
        // Se for HTML, injeta script
        let contentType = headers.get('content-type') || '';
        let body = response.body;

        if (contentType.includes('text/html')) {
            let html = await response.text();
            
            // Remove headers que bloqueiam iframe
            html = html.replace(/<meta[^>]*http-equiv=["']X-Frame-Options[^>]*>/gi, '');
            
            // Injeta script de comunicação
            const injectionScript = `
                <script>
                    // Lionel Injection Script
                    window.lionelInjected = true;
                    
                    window.addEventListener('message', function(event) {
                        if (event.data.action === 'scan') {
                            scanTasks();
                        } else if (event.data.action === 'answer') {
                            answerTask(event.data.taskIndex, event.data.answer);
                        }
                    });
                    
                    function scanTasks() {
                        const tasks = [];
                        
                        const radioGroups = {};
                        document.querySelectorAll('input[type="radio"]').forEach(r => {
                            if (!radioGroups[r.name]) radioGroups[r.name] = [];
                            radioGroups[r.name].push(r);
                        });
                        
                        Object.entries(radioGroups).forEach(([name, radios]) => {
                            const parent = radios[0].closest('form, div, fieldset');
                            const question = parent?.querySelector('h1,h2,h3,h4,p,label,legend')?.textContent?.trim() || 'Pergunta';
                            
                            tasks.push({
                                type: 'radio',
                                text: question.substring(0, 100),
                                name: name,
                                optionsCount: radios.length
                            });
                        });
                        
                        document.querySelectorAll('textarea, input[type="text"]').forEach(input => {
                            tasks.push({
                                type: 'text',
                                text: input.placeholder || 'Campo de texto'
                            });
                        });
                        
                        window.parent.postMessage({ action: 'tasksFound', tasks }, '*');
                    }
                    
                    function answerTask(index, answer) {
                        const radioGroups = {};
                        document.querySelectorAll('input[type="radio"]').forEach(r => {
                            if (!radioGroups[r.name]) radioGroups[r.name] = [];
                            radioGroups[r.name].push(r);
                        });
                        
                        const groups = Object.values(radioGroups);
                        if (groups[index]) {
                            const letterIndex = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(answer.toUpperCase());
                            if (letterIndex >= 0 && letterIndex < groups[index].length) {
                                groups[index][letterIndex].click();
                                groups[index][letterIndex].dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }
                    }
                    
                    window.parent.postMessage({ action: 'scriptReady' }, '*');
                </script>
            `;
            
            html = html.replace('</body>', injectionScript + '</body>');
            
            return new Response(html, {
                status: response.status,
                headers: headers
            });
        }

        return new Response(body, {
            status: response.status,
            headers: headers
        });

    } catch (error) {
        return new Response(`Erro ao acessar a página: ${error.message}`, { status: 500 });
    }
}
