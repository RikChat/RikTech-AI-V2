// RikTech AI - JavaScript Application
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const splashScreen = document.getElementById('splash-screen');
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');
    
    // Chat elements
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const generateBtn = document.getElementById('generate-btn');
    const aiModelSelect = document.getElementById('ai-model');
    
    // Code generation elements
    const codePrompt = document.getElementById('code-prompt');
    const codeLanguage = document.getElementById('code-language');
    const generateCodeBtn = document.getElementById('generate-code-btn');
    const codeOutput = document.getElementById('code-output');
    const copyCodeBtn = document.getElementById('copy-code-btn');
    
    // State
    let currentPage = 'home';
    
    // Initialize the app
    function init() {
        // Hide splash screen after 2 seconds
        setTimeout(() => {
            splashScreen.classList.add('fade-out');
            setTimeout(() => {
                splashScreen.style.display = 'none';
            }, 500);
        }, 2000);
        
        // Set up event listeners
        setupEventListeners();
        
        // Load any saved chat history from localStorage
        loadChatHistory();
    }
    
    // Set up all event listeners
    function setupEventListeners() {
        // Navigation
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const page = button.getAttribute('data-page');
                switchPage(page);
            });
        });
        
        // Chat functionality
        generateBtn.addEventListener('click', handleGenerate);
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
            }
        });
        
        // Code generation functionality
        generateCodeBtn.addEventListener('click', handleGenerateCode);
        copyCodeBtn.addEventListener('click', handleCopyCode);
        
        // Auto-resize textareas
        userInput.addEventListener('input', autoResizeTextarea);
        codePrompt.addEventListener('input', autoResizeTextarea);
    }
    
    // Switch between pages
    function switchPage(page) {
        // Update navigation buttons
        navButtons.forEach(button => {
            if (button.getAttribute('data-page') === page) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        // Show/hide pages
        pages.forEach(p => {
            if (p.id === `${page}-page`) {
                p.classList.add('active');
            } else {
                p.classList.remove('active');
            }
        });
        
        currentPage = page;
    }
    
    // Handle chat generation
    async function handleGenerate() {
        const prompt = userInput.value.trim();
        if (!prompt) return;
        
        // Add user message to chat
        addMessage(prompt, 'user');
        
        // Clear input
        userInput.value = '';
        autoResizeTextarea({ target: userInput });
        
        // Show loading indicator
        const loadingId = addLoadingMessage();
        
        try {
            // Get selected AI model
            const model = aiModelSelect.value;
            
            // Call the appropriate API
            let response;
            if (model === 'openai') {
                response = await callOpenAI(prompt);
            } else {
                response = await callGemini(prompt);
            }
            
            // Remove loading indicator
            removeLoadingMessage(loadingId);
            
            // Add AI response to chat
            addMessage(response, 'bot');
            
            // Save to chat history
            saveChatHistory();
            
        } catch (error) {
            console.error('Error generating response:', error);
            removeLoadingMessage(loadingId);
            addMessage('Maaf, terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi.', 'bot');
        }
    }
    
    // Handle code generation
    async function handleGenerateCode() {
        const prompt = codePrompt.value.trim();
        if (!prompt) {
            alert('Silakan masukkan deskripsi kode yang Anda inginkan.');
            return;
        }
        
        // Show loading state
        generateCodeBtn.disabled = true;
        generateCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        
        try {
            // Get selected language
            const language = codeLanguage.value;
            
            // Create a more specific prompt for code generation
            const codePromptText = `Buat kode ${language} untuk: ${prompt}. Berikan hanya kodenya tanpa penjelasan tambahan.`;
            
            // Call OpenAI API for code generation (more reliable for code)
            const response = await callOpenAI(codePromptText);
            
            // Update code output
            codeOutput.innerHTML = `<code>${escapeHtml(response)}</code>`;
            
            // Highlight code if possible
            if (window.hljs) {
                hljs.highlightElement(codeOutput.querySelector('code'));
            }
            
        } catch (error) {
            console.error('Error generating code:', error);
            codeOutput.innerHTML = `<code>// Error: ${error.message}</code>`;
        } finally {
            // Reset button state
            generateCodeBtn.disabled = false;
            generateCodeBtn.innerHTML = '<i class="fas fa-code"></i> Generate Kode';
        }
    }
    
    // Handle copying code to clipboard
    function handleCopyCode() {
        const code = codeOutput.textContent;
        navigator.clipboard.writeText(code).then(() => {
            // Show success feedback
            const originalText = copyCodeBtn.innerHTML;
            copyCodeBtn.innerHTML = '<i class="fas fa-check"></i> Disalin!';
            setTimeout(() => {
                copyCodeBtn.innerHTML = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy code: ', err);
        });
    }
    
    // Call OpenAI API
    async function callOpenAI(prompt) {
        const response = await fetch('/api/openai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Extract the response text from OpenAI's response format
        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content;
        } else {
            throw new Error('Invalid response format from OpenAI');
        }
    }
    
    // Call Gemini API
    async function callGemini(prompt) {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Extract the response text from Gemini's response format
        if (data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('Invalid response format from Gemini');
        }
    }
    
    // Add a message to the chat
    function addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message fade-in`;
        
        // Create avatar
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'user' ? 
            '<i class="fas fa-user"></i>' : 
            '<i class="fas fa-robot"></i>';
        
        // Create message content
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Check if content contains code blocks
        if (content.includes('```')) {
            // Simple code block detection and formatting
            const parts = content.split('```');
            parts.forEach((part, index) => {
                if (index % 2 === 0) {
                    // Regular text
                    const p = document.createElement('p');
                    p.textContent = part;
                    messageContent.appendChild(p);
                } else {
                    // Code block
                    const pre = document.createElement('pre');
                    pre.className = 'code-block';
                    const code = document.createElement('code');
                    code.textContent = part;
                    pre.appendChild(code);
                    messageContent.appendChild(pre);
                }
            });
        } else {
            // Regular text message
            const p = document.createElement('p');
            p.textContent = content;
            messageContent.appendChild(p);
        }
        
        // Assemble message
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        // Add to chat history
        const welcomeMessage = chatHistory.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        chatHistory.appendChild(messageDiv);
        
        // Scroll to bottom
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
    
    // Add loading message
    function addLoadingMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message fade-in';
        messageDiv.id = 'loading-message';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const loadingDots = document.createElement('div');
        loadingDots.className = 'loading-dots';
        loadingDots.innerHTML = '<div></div><div></div><div></div><div></div>';
        
        messageContent.appendChild(loadingDots);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        
        return 'loading-message';
    }
    
    // Remove loading message
    function removeLoadingMessage(id) {
        const loadingMessage = document.getElementById(id);
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }
    
    // Auto-resize textarea
    function autoResizeTextarea(e) {
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }
    
    // Save chat history to localStorage
    function saveChatHistory() {
        const messages = [];
        const messageElements = chatHistory.querySelectorAll('.message');
        
        messageElements.forEach(element => {
            const isUser = element.classList.contains('user-message');
            const content = element.querySelector('.message-content').textContent;
            messages.push({ isUser, content });
        });
        
        localStorage.setItem('riktech-ai-chat', JSON.stringify(messages));
    }
    
    // Load chat history from localStorage
    function loadChatHistory() {
        const savedChat = localStorage.getItem('riktech-ai-chat');
        if (savedChat) {
            const messages = JSON.parse(savedChat);
            
            // Clear welcome message
            const welcomeMessage = chatHistory.querySelector('.welcome-message');
            if (welcomeMessage && messages.length > 0) {
                welcomeMessage.remove();
            }
            
            // Add saved messages
            messages.forEach(msg => {
                addMessage(msg.content, msg.isUser ? 'user' : 'bot');
            });
        }
    }
    
    // Utility function to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Initialize PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }
    
    // Initialize the app
    init();
});
