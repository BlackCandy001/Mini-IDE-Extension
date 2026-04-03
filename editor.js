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
    this.currentExtension = filename ? filename.split('.').pop().toLowerCase() : '';
    this.update();
  }

  format() {
    const code = this.textarea.value;
    if (!code) return;

    let formatted = '';
    
    // SMART DISPATCHER: Detect type by content or extension
    const isHTMLContent = code.trim().startsWith('<') || (code.includes('<') && code.includes('>'));
    const isBraceContent = code.includes('{') && code.includes('}');
    
    const braceExts = ['js', 'css', 'json', 'cs', 'java', 'cpp', 'c', 'ts'];
    const htmlExts = ['html', 'xml', 'aspx', 'cshtml', 'svg', 'php'];

    if (htmlExts.includes(this.currentExtension) || (isHTMLContent && !isBraceContent)) {
      formatted = this.formatHTML(code);
    } else if (braceExts.includes(this.currentExtension) || isBraceContent) {
      formatted = this.formatJS(code);
    } else {
      // For other files, just trim lines
      formatted = code.split('\n').map(line => line.trim()).join('\n');
    }

    this.textarea.value = formatted;
    this.update();
    
    // Trigger input event to notify sidepanel of changes (dirty state)
    this.textarea.dispatchEvent(new Event('input'));
  }

  formatJS(code) {
    const lines = code.split('\n');
    let indent = 0;
    const result = [];

    for (let line of lines) {
      let trimmed = line.trim();
      if (!trimmed) {
        result.push('');
        continue;
      }

      // Decrease indent if line starts with closing brace
      if (trimmed.startsWith('}') || trimmed.startsWith(']')) {
        indent = Math.max(0, indent - 1);
      }

      result.push('  '.repeat(indent) + trimmed);

      // Increase indent if line ends with opening brace
      // We look for { or [ that isn't followed by a closing one on the same line
      const openBraces = (trimmed.match(/\{|\[/g) || []).length;
      const closeBraces = (trimmed.match(/\}|\]/g) || []).length;
      indent += (openBraces - closeBraces);
      if (indent < 0) indent = 0;
    }

    return result.join('\n');
  }

  formatHTML(html) {
    // 1. Put tags and content on new lines
    let formatted = html
      .replace(/>\s*</g, '>\n<')
      .replace(/(<[^\/!].*?>)/g, '\n$1')
      .replace(/(<\/[^>]+?>)/g, '\n$1')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '')
      .join('\n');

    const lines = formatted.split('\n');
    let indent = 0;
    const result = [];
    const selfClosingTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

    for (let line of lines) {
      if (line.match(/^<\//)) {
        // Closing tag
        indent = Math.max(0, indent - 1);
      }

      result.push('  '.repeat(indent) + line);

      if (line.match(/^<[^\/!]/) && !line.match(/\/>$/)) {
        // Opening tag (that is not self-closing)
        const tagName = line.match(/^<([a-z0-9]+)/i)?.[1]?.toLowerCase();
        if (tagName && !selfClosingTags.includes(tagName)) {
          indent++;
        }
      }
    }

    return result.join('\n');
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
    let text = this.highlight.textContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // ARCHITECTURAL FIX: Token-based Placeholder System
    // We "pluck" sensitive items (Tags, Strings, Comments) out of the text
    // and replace them with placeholders. This prevents keywords/CSS rules
    // from matching INSIDE the HTML tags we add for highlighting.
    
    const tokens = [];
    let tokenIndex = 0;
    const addToken = (content, style) => {
        const id = `\x01${tokenIndex++}\x02`;
        tokens.push({ id, content, style });
        return id;
    };

    // 1. Extract Strings (Highest priority, protect quoted text with escape support)
    // Regex matches double, single, and backtick quotes including escaped chars like \"
    text = text.replace(/("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(`(?:[^`\\]|\\.)*`)/g, (match) => {
        return addToken(match, 'color: #fbbf24');
    });

    // 2. Extract Comments (Protective)
    text = text.replace(/(\/\/.+)|(\/\*[\s\S]*?\*\/)/g, (match) => {
        return addToken(match, 'color: #94a3b8');
    });

    // 3. Extract HTML Tags (Between &lt; and &gt;)
    text = text.replace(/(&lt;\/?[a-z0-9]+)(.*?)&gt;/g, (match, tagStart, tagAttrs) => {
        // We highlight the tag itself but protect its internal attributes (which may contain string tokens)
        const highlightedTag = `<span style="color: #60a5fa">${tagStart}</span>${tagAttrs}<span style="color: #60a5fa">&gt;</span>`;
        return addToken(highlightedTag, null); // null style because we already added spans
    });

    // 4. Highlight Keywords & CSS Properties on the CLEAN text
    // Now it's logically impossible for these to match inside a tag or string!
    text = text.replace(/\b(const|let|var|function|return|if|else|for|while|import|export|from|class|await|async|try|catch|default|case|switch|await|async|type|interface|enum)\b/g, '<span style="color: #f472b6">$1</span>');
    text = text.replace(/\b([a-z-]+):(?!\/\/)/g, '<span style="color: #9333ea">$1</span>:');

    // 5. Recursive/Safe Token Restoration
    // We restore tokens in reverse. If Token B was inside Token A, we must 
    // inject B's content into A's content BEFORE A is restored to the text.
    [...tokens].reverse().forEach(token => {
        const replacement = token.style ? `<span style="${token.style}">${token.content}</span>` : token.content;
        
        // 5a. Replace marker in the global text
        // Use split/join for literal replacement to avoid $ symbol issues in .replace()
        text = text.split(token.id).join(replacement);
        
        // 5b. IMPORTANT: Replace marker in ALL other tokens' content!
        // This handles nested tokens (e.g., a string inside an HTML tag attribute)
        tokens.forEach(otherToken => {
            if (otherToken.content.includes(token.id)) {
                otherToken.content = otherToken.content.split(token.id).join(replacement);
            }
        });
    });

    this.highlight.innerHTML = text;
  }
}
