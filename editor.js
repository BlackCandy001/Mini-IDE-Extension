export class Editor {
  constructor(textareaId, highlightId, lineNumbersId) {
    this.textarea = document.getElementById(textareaId);
    this.highlight = document.getElementById(highlightId).querySelector('code');
    this.highlightPre = document.getElementById(highlightId);
    this.lineNumbers = document.getElementById(lineNumbersId);
    
    this.textarea.addEventListener('input', () => this.update());
    this.textarea.addEventListener('scroll', () => {
      this.highlightPre.scrollTop = this.textarea.scrollTop;
      this.highlightPre.scrollLeft = this.textarea.scrollLeft;
      this.lineNumbers.scrollTop = this.textarea.scrollTop;
    });
    
    this.textarea.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  update() {
    let text = this.textarea.value;
    if (text[text.length - 1] === '\n') {
      text += ' ';
    }
    this.highlight.textContent = text;
    this.applyHighlighting();
    this.updateLineNumbers();
  }

  updateLineNumbers() {
    const lines = this.textarea.value.split('\n');
    const lineCount = lines.length;
    let html = '';
    for (let i = 1; i <= lineCount; i++) {
        html += `<div>${i}</div>`;
    }
    this.lineNumbers.innerHTML = html;
  }

  setContent(content, filename) {
    this.textarea.value = content;
    this.currentFilename = filename;
    this.update();
  }

  handleKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      this.textarea.value = this.textarea.value.substring(0, start) + '  ' + this.textarea.value.substring(end);
      this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
      this.update();
    }
  }

  applyHighlighting() {
    let html = this.highlight.textContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // IMPORTANT: Order matters to avoid "double-processing" HTML tags.
    // We process tokens from the code itself before we add our own <span> tags.
    
    // 1. Strings (Highest priority, highly protective)
    html = html.replace(/("(.*?)")/g, '<span style="color: #fbbf24">$1</span>')
               .replace(/('(.*?)')/g, '<span style="color: #fbbf24">$1</span>')
               .replace(/(`(.*?)`)/g, '<span style="color: #fbbf24">$1</span>');
    
    // 2. Comments (Protective)
    html = html.replace(/(\/\/.+)/g, '<span style="color: #94a3b8">$1</span>')
               .replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color: #94a3b8">$1</span>');

    // 3. Keywords (standard word boundaries)
    html = html.replace(/\b(const|let|var|function|return|if|else|for|while|import|export|from|class|await|async|try|catch|default|case|switch|await|async|type|interface|enum)\b/g, '<span style="color: #f472b6">$1</span>');
    
    // 4. CSS Selectors & properties (Simple but effective)
    // Run this BEFORE HTML tags because they contain 'style:' inside the span attributes.
    html = html.replace(/\b([a-z-]+):(?!\/\/)/g, '<span style="color: #9333ea">$1</span>:');
    
    // 5. HTML Tags
    // RUN THIS LAST. Once these spans are added, the highlighter stops.
    // This prevents other regexes from matching inside the <span> tags themselves.
    html = html.replace(/(&lt;\/?[a-z0-9]+)(.*?)&gt;/g, '<span style="color: #60a5fa">$1</span>$2<span style="color: #60a5fa">&gt;</span>');

    this.highlight.innerHTML = html;
  }
}
