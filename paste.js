class EnhancedCodeEditor {
            constructor() {
                this.editor = null;
                this.settings = this.loadSettings();
                this.snippets = this.loadSnippets();
                this.searchResults = [];
                this.currentSearchIndex = -1;
                this.autoSaveTimer = null;
                this.lastSavedContent = '';
                
                this.initEditor();
                this.setupEventListeners();
                this.loadEditorContent();
                this.startAutoSave();
                this.updateEditorStats();
            }
            
            initEditor() {
                const textarea = document.getElementById('code-editor');
                
                this.editor = CodeMirror.fromTextArea(textarea, {
                    mode: this.settings.language,
                    theme: this.settings.theme,
                    lineNumbers: this.settings.lineNumbers,
                    indentUnit: parseInt(this.settings.tabSize),
                    tabSize: parseInt(this.settings.tabSize),
                    indentWithTabs: this.settings.useTabs,
                    smartIndent: true,
                    lineWrapping: false,
                    matchBrackets: true,
                    autoCloseBrackets: this.settings.autoCloseBrackets,
                    autoCloseTags: true,
                    styleActiveLine: this.settings.highlightActiveLine,
                    extraKeys: {
                        "Ctrl-Space": "autocomplete",
                        "Ctrl-/": "toggleComment",
                        "Ctrl-S": () => this.saveContent(),
                        "Tab": (cm) => {
                            if (cm.somethingSelected()) {
                                cm.indentSelection("add");
                            } else {
                                if (this.settings.useTabs) {
                                    cm.replaceSelection("\t");
                                } else {
                                    cm.replaceSelection(" ".repeat(cm.getOption("indentUnit")));
                                }
                            }
                        }
                    }
                });
                
                // Aplicar configurações de estilo
                this.updateEditorStyle();
                
                // Outros métodos init...
                this.editor.on('change', () => {
                    this.updateEditorStats();
                });
                
                this.editor.on('cursorActivity', () => {
                    this.updateCursorPosition();
                });
            }
            
            setupEventListeners() {
                // Botões da barra de ferramentas
                document.getElementById('save-btn').addEventListener('click', () => this.saveContent());
                document.getElementById('undo-btn').addEventListener('click', () => this.editor.undo());
                document.getElementById('redo-btn').addEventListener('click', () => this.editor.redo());
                document.getElementById('format-btn').addEventListener('click', () => this.formatCode());
                
                // Busca e substituição
                document.getElementById('search-btn').addEventListener('click', () => this.search());
                document.getElementById('prev-btn').addEventListener('click', () => this.navigateSearch(-1));
                document.getElementById('next-btn').addEventListener('click', () => this.navigateSearch(1));
                document.getElementById('replace-btn').addEventListener('click', () => this.replace());
                document.getElementById('replace-all-btn').addEventListener('click', () => this.replaceAll());
                
                document.getElementById('search-input').addEventListener('input', () => this.search());
                document.getElementById('search-input').addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.navigateSearch(1);
                    }
                });
                
                // Seletores de linguagem e tema
                document.getElementById('language-select').addEventListener('change', (e) => {
                    this.changeLanguage(e.target.value);
                });
                
                document.getElementById('theme-select').addEventListener('change', (e) => {
                    this.changeTheme(e.target.value);
                });
                
                // Snippets
                document.getElementById('snippets-btn').addEventListener('click', () => this.toggleSnippetsPanel());
                
                // Configurações
                document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
                document.getElementById('close-settings').addEventListener('click', () => this.closeSettings());
                document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());
                document.getElementById('reset-settings').addEventListener('click', () => this.resetSettings());
                
                // Inicializar valores dos selects
                document.getElementById('language-select').value = this.settings.language;
                document.getElementById('theme-select').value = this.settings.theme;
                
                // Atalhos de teclado
                document.addEventListener('keydown', (e) => {
                    // Ctrl+F para busca
                    if (e.ctrlKey && e.key === 'f') {
                        e.preventDefault();
                        document.getElementById('search-input').focus();
                    }
                    
                    // F3 para próxima ocorrência
                    if (e.key === 'F3') {
                        e.preventDefault();
                        this.navigateSearch(e.shiftKey ? -1 : 1);
                    }
                });
            }
            
            // Métodos de busca
            search() {
                const query = document.getElementById('search-input').value;
                if (!query) {
                    this.searchResults = [];
                    this.currentSearchIndex = -1;
                    this.updateSearchCount();
                    return;
                }
                
                // Usar o cursor de busca do CodeMirror
                this.searchResults = [];
                this.currentSearchIndex = -1;
                
                const cursor = this.editor.getSearchCursor(query, null, { caseFold: true });
                while (cursor.findNext()) {
                    this.searchResults.push({
                        from: cursor.from(),
                        to: cursor.to()
                    });
                }
                
                if (this.searchResults.length > 0) {
                    this.currentSearchIndex = 0;
                    this.highlightCurrentMatch();
                }
                
                this.updateSearchCount();
            }
            
            navigateSearch(direction) {
                if (this.searchResults.length === 0) return;
                
                this.currentSearchIndex += direction;
                
                // Navegação circular
                if (this.currentSearchIndex < 0) {
                    this.currentSearchIndex = this.searchResults.length - 1;
                } else if (this.currentSearchIndex >= this.searchResults.length) {
                    this.currentSearchIndex = 0;
                }
                
                this.highlightCurrentMatch();
                this.updateSearchCount();
            }
            
            highlightCurrentMatch() {
                if (this.currentSearchIndex === -1 || !this.searchResults.length) return;
                
                const match = this.searchResults[this.currentSearchIndex];
                this.editor.setSelection(match.from, match.to);
                this.editor.scrollIntoView({
                    from: match.from,
                    to: match.to
                }, 50);
            }
            
            updateSearchCount() {
                const countElement = document.getElementById('search-count');
                if (this.searchResults.length === 0) {
                    countElement.textContent = '0/0';
                } else {
                    countElement.textContent = `${this.currentSearchIndex + 1}/${this.searchResults.length}`;
                }
            }
            
            replace() {
                if (this.currentSearchIndex === -1 || !this.searchResults.length) return;
                
                const replaceValue = document.getElementById('replace-input').value;
                const match = this.searchResults[this.currentSearchIndex];
                
                // Faz a substituição
                this.editor.replaceRange(replaceValue, match.from, match.to);
                
                // Atualiza os resultados de busca após a substituição
                this.search();
            }
            
            replaceAll() {
                const searchValue = document.getElementById('search-input').value;
                const replaceValue = document.getElementById('replace-input').value;
                
                if (!searchValue) return;
                
                // Substituir todas as ocorrências
                const text = this.editor.getValue();
                const newText = text.replaceAll(new RegExp(this.escapeRegExp(searchValue), 'gi'), replaceValue);
                this.editor.setValue(newText);
                
                // Atualiza a busca
                this.search();
                
                // Mostra feedback
                alert(`Todas as ocorrências foram substituídas.`);
            }
            
            escapeRegExp(string) {
                return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }
            
            // Outras funções
            formatCode() {
                const code = this.editor.getValue();
                const mode = this.editor.getOption('mode');
                let formattedCode = code;
                
                const options = {
                    indent_size: parseInt(this.settings.tabSize),
                    indent_char: this.settings.useTabs ? '\t' : ' ',
                    wrap_line_length: 0,
                    preserve_newlines: true,
                    max_preserve_newlines: 2,
                    end_with_newline: true
                };
                
                if (mode === 'javascript' || mode === 'application/json') {
                    formattedCode = js_beautify(code, options);
                } else if (mode === 'htmlmixed' || mode === 'xml') {
                    formattedCode = html_beautify(code, options);
                } else if (mode === 'css') {
                    formattedCode = css_beautify(code, options);
                }
                
                this.editor.setValue(formattedCode);
                this.editor.setCursor(0, 0);
            }
            
            changeLanguage(language) {
                this.editor.setOption('mode', language);
                this.settings.language = language;
                this.saveSettings();
            }
            
            changeTheme(theme) {
                this.editor.setOption('theme', theme);
                this.settings.theme = theme;
                this.saveSettings();
            }
            
            // Atualização da interface
            updateEditorStats() {
                const content = this.editor.getValue();
                const charCount = content.length;
                const lineCount = this.editor.lineCount();
                
                document.getElementById('char-count').textContent = `${charCount} caracteres`;
                document.getElementById('line-count').textContent = `${lineCount} linhas`;
            }
            
            updateCursorPosition() {
                const cursor = this.editor.getCursor();
                const selection = this.editor.getSelection();
                
                document.getElementById('cursor-position').textContent = `Ln: ${cursor.line + 1}, Col: ${cursor.ch + 1}`;
                
                if (selection && selection.length > 0) {
                    document.getElementById('selection-info').textContent = `Seleção: ${selection.length} caracteres`;
                } else {
                    document.getElementById('selection-info').textContent = '';
                }
            }
            
            updateEditorStyle() {
                const cmElement = this.editor.getWrapperElement();
                cmElement.style.fontSize = this.settings.fontSize;
            }
            
            // Gerenciamento de configurações
            loadSettings() {
                const defaultSettings = {
                    language: 'javascript',
                    theme: 'default',
                    fontSize: '14px',
                    tabSize: '4',
                    useTabs: false,
                    autoCloseBrackets: true,
                    lineWrapping: true,
                    lineNumbers: true,
                    highlightActiveLine: true,
                    autoSave: true,
                    autoSaveInterval: 30
                };
                
                try {
                    const saved = localStorage.getItem('codeEditorSettings');
                    return saved ? JSON.parse(saved) : defaultSettings;
                } catch (e) {
                    console.error('Erro ao carregar configurações:', e);
                    return defaultSettings;
                }
            }
            
            saveSettings() {
                // Coletar configurações do modal
                this.settings.fontSize = document.getElementById('font-size').value;
                this.settings.tabSize = document.getElementById('tab-size').value;
                this.settings.useTabs = document.getElementById('use-tabs').checked;
                this.settings.autoCloseBrackets = document.getElementById('auto-close-brackets').checked;
                this.settings.lineWrapping = document.getElementById('line-wrapping').checked;
                this.settings.lineNumbers = document.getElementById('line-numbers').checked;
                this.settings.highlightActiveLine = document.getElementById('highlight-active-line').checked;
                this.settings.autoSave = document.getElementById('auto-save').checked;
                this.settings.autoSaveInterval = document.getElementById('auto-save-interval').value;
                
                // Aplicar configurações ao editor
                this.editor.setOption('indentUnit', parseInt(this.settings.tabSize));
                this.editor.setOption('tabSize', parseInt(this.settings.tabSize));
                this.editor.setOption('indentWithTabs', this.settings.useTabs);
                this.editor.setOption('autoCloseBrackets', this.settings.autoCloseBrackets);
                this.editor.setOption('lineWrapping', this.settings.lineWrapping);
                this.editor.setOption('lineNumbers', this.settings.lineNumbers);
                this.editor.setOption('styleActiveLine', this.settings.highlightActiveLine);
                
                // Atualizar status bar
                document.getElementById('indentation').textContent = this.settings.useTabs ? 
                    'Indentação: Tabs' : `Espaços: ${this.settings.tabSize}`;
                
                // Atualizar estilo
                this.updateEditorStyle();
                
                // Salvar no localStorage
                try {
                    localStorage.setItem('codeEditorSettings', JSON.stringify(this.settings));
                } catch (e) {
                    console.error('Erro ao salvar configurações:', e);
                }
                
                // Reiniciar autosave se necessário
                this.stopAutoSave();
                if (this.settings.autoSave) {
                    this.startAutoSave();
                }
                
                this.closeSettings();
            }
            
            resetSettings() {
                if (confirm('Deseja restaurar todas as configurações para os valores padrão?')) {
                    localStorage.removeItem('codeEditorSettings');
                    this.settings = this.loadSettings();
                    this.populateSettingsModal();
                    this.saveSettings();
                }
            }
            
            openSettings() {
                this.populateSettingsModal();
                document.getElementById('settings-modal').style.display = 'flex';
            }
            
            closeSettings() {
                document.getElementById('settings-modal').style.display = 'none';
            }
            
            populateSettingsModal() {
                document.getElementById('font-size').value = this.settings.fontSize;
                document.getElementById('tab-size').value = this.settings.tabSize;
                document.getElementById('use-tabs').checked = this.settings.useTabs;
                document.getElementById('auto-close-brackets').checked = this.settings.autoCloseBrackets;
                document.getElementById('line-wrapping').checked = this.settings.lineWrapping;
                document.getElementById('line-numbers').checked = this.settings.lineNumbers;
                document.getElementById('highlight-active-line').checked = this.settings.highlightActiveLine;
                document.getElementById('auto-save').checked = this.settings.autoSave;
                document.getElementById('auto-save-interval').value = this.settings.autoSaveInterval;
            }
            
            // Gerenciamento de snippets
            loadSnippets() {
                const defaultSnippets = [
                    {
                        name: 'Console Log',
                        language: 'javascript',
                        code: 'console.log("${1:mensagem}");'
                    },
                    {
                        name: 'Função JavaScript',
                        language: 'javascript',
                        code: 'function ${1:nomeFuncao}(${2:parametros}) {\n\t${3:// código}\n}'
                    },
                    {
                        name: 'HTML Boilerplate',
                        language: 'htmlmixed',
                        code: '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Título}</title>\n</head>\n<body>\n\t${2}\n</body>\n</html>'
                    },
                    {
                        name: 'CSS Reset',
                        language: 'css',
                        code: '* {\n\tmargin: 0;\n\tpadding: 0;\n\tbox-sizing: border-box;\n}'
                    },
                    {
                        name: 'PHP Classe',
                        language: 'php',
                        code: '<?php\n\nclass ${1:NomeClasse} {\n\tprivate $${2:propriedade};\n\n\tpublic function __construct(${3:$parametro}) {\n\t\t$this->${2:propriedade} = ${3:$parametro};\n\t}\n\n\tpublic function ${4:metodo}() {\n\t\t${5:// código}\n\t}\n}'
                    },
                    {
                        name: 'Python Função',
                        language: 'python',
                        code: 'def ${1:nome_funcao}(${2:parametros}):\n\t"""${3:Docstring}"""\n\t${4:pass}'
                    }
                ];
                
                try {
                    const saved = localStorage.getItem('codeEditorSnippets');
                    return saved ? JSON.parse(saved) : defaultSnippets;
                } catch (e) {
                    console.error('Erro ao carregar snippets:', e);
                    return defaultSnippets;
                }
            }
            
            saveSnippets() {
                try {
                    localStorage.setItem('codeEditorSnippets', JSON.stringify(this.snippets));
                } catch (e) {
                    console.error('Erro ao salvar snippets:', e);
                }
            }
            
            toggleSnippetsPanel() {
                const panel = document.getElementById('snippet-container');
                
                if (panel.style.display === 'block') {
                    panel.style.display = 'none';
                } else {
                    // Posicionar o painel
                    const button = document.getElementById('snippets-btn');
                    const rect = button.getBoundingClientRect();
                    panel.style.top = `${rect.bottom + 5}px`;
                    panel.style.left = `${rect.left}px`;
                    
                    // Mostrar snippets relevantes para a linguagem atual
                    this.showRelevantSnippets();
                    panel.style.display = 'block';
                }
            }
            
            showRelevantSnippets() {
                const currentMode = this.editor.getOption('mode');
                const container = document.getElementById('snippet-container');
                container.innerHTML = '';
                
                // Filtrar snippets pela linguagem atual ou mostrar todos
                const snippetsToShow = this.snippets.filter(snippet => 
                    snippet.language === currentMode || currentMode === 'all'
                );
                
                if (snippetsToShow.length === 0) {
                    container.innerHTML = '<div class="snippet-item">Nenhum snippet disponível para esta linguagem</div>';
                    return;
                }
                
                snippetsToShow.forEach((snippet, index) => {
                    const snippetElement = document.createElement('div');
                    snippetElement.className = 'snippet-item';
                    snippetElement.innerHTML = `
                        <div class="snippet-name">${snippet.name}</div>
                        <div class="snippet-preview">${this.snippetPreview(snippet.code)}</div>
                    `;
                    snippetElement.addEventListener('click', () => {
                        this.insertSnippet(snippet.code);
                        this.toggleSnippetsPanel();
                    });
                    
                    container.appendChild(snippetElement);
                });
            }
            
            snippetPreview(code) {
                // Limitar previews longos
                return code.length > 100 ? code.substring(0, 100) + '...' : code;
            }
            
            insertSnippet(code) {
                // Implementação básica (sem placeholders de momento)
                const cursor = this.editor.getCursor();
                this.editor.replaceRange(code, cursor);
            }
            
            // Gerenciamento de salvamento
            saveContent() {
                const content = this.editor.getValue();
                
                try {
                    localStorage.setItem('codeEditorContent', content);
                    this.lastSavedContent = content;
                    
                    // Feedback visual
                    const saveBtn = document.getElementById('save-btn');
                    const originalText = saveBtn.textContent;
                    saveBtn.textContent = 'Salvo ✓';
                    setTimeout(() => {
                        saveBtn.textContent = originalText;
                    }, 1000);
                } catch (e) {
                    console.error('Erro ao salvar conteúdo:', e);
                    alert('Erro ao salvar o conteúdo. O armazenamento local pode estar cheio.');
                }
            }
            
            loadEditorContent() {
                try {
                    const content = localStorage.getItem('codeEditorContent') || '';
                    this.editor.setValue(content);
                    this.lastSavedContent = content;
                } catch (e) {
                    console.error('Erro ao carregar conteúdo:', e);
                }
            }
            
            startAutoSave() {
                if (!this.settings.autoSave) return;
                
                this.autoSaveTimer = setInterval(() => {
                    const content = this.editor.getValue();
                    if (content !== this.lastSavedContent) {
                        this.saveContent();
                    }
                }, this.settings.autoSaveInterval * 1000);
            }
            
            stopAutoSave() {
                if (this.autoSaveTimer) {
                    clearInterval(this.autoSaveTimer);
                    this.autoSaveTimer = null;
                }
            }
        }

        // Inicializar o editor quando o documento estiver pronto
        document.addEventListener('DOMContentLoaded', () => {
            const codeEditor = new EnhancedCodeEditor();
            
            // Adicionar evento de beforeunload para alertar sobre alterações não salvas
            window.addEventListener('beforeunload', (e) => {
                const content = codeEditor.editor.getValue();
                if (content !== codeEditor.lastSavedContent) {
                    const message = 'Você tem alterações não salvas. Deseja realmente sair?';
                    e.returnValue = message;
                    return message;
                }
            });
        });