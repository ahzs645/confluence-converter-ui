// src/utils/ConfluenceConverter.ts
import TurndownService from 'turndown';
import type { Node } from 'turndown';

export interface ConversionOptions {
  // Panel conversion options
  panelStyle: 'blockquote' | 'div' | 'section';
  
  // Table conversion options
  tableStyle: 'github' | 'simple' | 'html';
  
  // Code block options
  codeBlockStyle: 'fenced' | 'indented';
  
  // Image handling
  imageStyle: 'markdown' | 'html';
  
  // Macro conversion options
  macroHandling: {
    info: 'blockquote' | 'div' | 'section';
    warning: 'blockquote' | 'div' | 'section';
    note: 'blockquote' | 'div' | 'section';
    code: 'fenced' | 'indented';
  };
}

export const defaultOptions: ConversionOptions = {
  panelStyle: 'blockquote',
  tableStyle: 'github',
  codeBlockStyle: 'fenced',
  imageStyle: 'markdown',
  macroHandling: {
    info: 'blockquote',
    warning: 'blockquote',
    note: 'blockquote',
    code: 'fenced'
  }
};

interface ProcessedElements extends Set<Element> {}

export class ConfluenceConverter {
  private turndown: TurndownService;
  private options: ConversionOptions;

  constructor(options: Partial<ConversionOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: this.options.codeBlockStyle as any,
    });

    this.setupCustomRules();
  }

  private setupCustomRules(): void {
    // Panel conversion
    this.turndown.addRule('panel', {
      filter: (node: Node) => {
        if (node.nodeName === 'DIV') {
          const element = node as HTMLElement;
          return element.classList?.contains('panel') || 
                 element.classList?.contains('confluence-information-macro') ||
                 element.classList?.contains('aui-message') ||
                 element.classList?.contains('admonition') ||
                 element.classList?.contains('expand-container');
        }
        return false;
      },
      replacement: (content: string, node: Node) => {
        const element = node as HTMLElement;
        const panelType = element.getAttribute('data-macro-name') || 'info';
        const title = element.querySelector('.panelHeader')?.textContent || '';
        
        switch (this.options.panelStyle) {
          case 'blockquote':
            return `> **${title}**\n> ${content.replace(/\n/g, '\n> ')}`;
          case 'div':
            return `<div class="panel ${panelType}">\n<h3>${title}</h3>\n${content}\n</div>`;
          case 'section':
            return `## ${title}\n\n${content}`;
          default:
            return content;
        }
      }
    });

    // Table conversion with enhanced handling
    this.turndown.addRule('table', {
      filter: 'table',
      replacement: (content: string, node: Node) => {
        const element = node as HTMLElement;
        
        // Check for special table types
        if (this.isLayoutTable(element) || this.isHistoryTable(element)) {
          return this.processSpecialTable(element);
        }
        
        // Check for complex tables that need special handling
        if (this.isComplexTable(element)) {
          return this.processComplexTable(element);
        }
        
        switch (this.options.tableStyle) {
          case 'github':
            return this.processGithubTable(element);
          case 'simple':
            return content.replace(/\|/g, ' ').trim();
          case 'html':
            return element.outerHTML;
          default:
            return content;
        }
      }
    });

    // Code block conversion with improved formatting
    this.turndown.addRule('code', {
      filter: ['pre', 'code'],
      replacement: (content: string, node: Node) => {
        const element = node as HTMLElement;
        const language = element.getAttribute('data-lang') || 
                         element.className.match(/language-(\S+)/)?.[1] || '';
        
        if (element.nodeName === 'PRE' || 
            (element.nodeName === 'CODE' && element.parentElement?.nodeName === 'PRE')) {
          switch (this.options.codeBlockStyle) {
            case 'fenced':
              return `\`\`\`${language}\n${content}\n\`\`\`\n\n`;
            case 'indented':
              return content.split('\n').map((line: string) => `    ${line}`).join('\n') + '\n\n';
            default:
              return content;
          }
        } else {
          // Inline code
          return `\`${content}\``;
        }
      }
    });

    // Image conversion with better alt text handling
    this.turndown.addRule('image', {
      filter: 'img',
      replacement: (content: string, node: Node) => {
        const element = node as HTMLElement;
        const src = element.getAttribute('src') || '';
        const alt = element.getAttribute('alt') || '';
        const title = element.getAttribute('title') || '';

        if (this.options.imageStyle === 'html') {
          return element.outerHTML;
        } else {
          return `![${alt}](${src}${title ? ` "${title}"` : ''})`;
        }
      }
    });

    // Add macro conversion
    this.turndown.addRule('macro', {
      filter: (node: Node) => {
        if (node.nodeName === 'DIV') {
          const element = node as HTMLElement;
          return element.classList?.contains('confluence-information-macro') ||
                 element.classList?.contains('confluence-warning-macro') ||
                 element.classList?.contains('confluence-note-macro') ||
                 element.classList?.contains('confluence-code-macro');
        }
        return false;
      },
      replacement: (content: string, node: Node) => {
        const element = node as HTMLElement;
        const macroType = element.getAttribute('data-macro-name') || 'info';
        const title = element.querySelector('.panelHeader')?.textContent || '';
        
        if (macroType === 'code') {
          return this.processCodeMacro(element, content);
        } else {
          return this.processInfoMacro(element, content, macroType as keyof typeof this.options.macroHandling, title);
        }
      }
    });

    // Add more specialized rules for Confluence elements
    this.addConfluenceSpecificRules();
  }

  private addConfluenceSpecificRules(): void {
    // Handle Confluence layouts
    this.turndown.addRule('layout', {
      filter: (node: Node) => {
        if (node.nodeName === 'DIV') {
          const element = node as HTMLElement;
          return element.classList?.contains('contentLayout') ||
                 element.classList?.contains('columnLayout') ||
                 element.classList?.contains('section');
        }
        return false;
      },
      replacement: (content: string) => {
        // Simply preserve content for layouts, maintaining the structure
        return content;
      }
    });

    // Handle Confluence expand macros
    this.turndown.addRule('expand', {
      filter: (node: Node) => {
        const element = node as HTMLElement;
        return element.classList?.contains('expand-container');
      },
      replacement: (content: string, node: Node) => {
        const element = node as HTMLElement;
        const titleElement = element.querySelector('.expand-control-text');
        const title = titleElement?.textContent || 'Details';
        
        // Use HTML details/summary for expand macros
        return `<details>\n<summary>${title}</summary>\n\n${content}\n</details>\n\n`;
      }
    });
  }

  public convert(html: string): string {
    try {
      if (!html || typeof html !== 'string') {
        throw new Error('Invalid HTML input: Input must be a non-empty string');
      }

      // Parse HTML with browser's DOMParser
      const parser = new DOMParser();
      const document = parser.parseFromString(html, 'text/html');

      // Check for parsing errors
      const parserError = document.querySelector('parsererror');
      if (parserError) {
        throw new Error('Failed to parse HTML: Invalid HTML structure');
      }

      // Extract title and metadata
      const title = this.extractTitle(document);
      const lastModified = this.extractLastModified(document);

      // Generate frontmatter
      let markdown = `---\ntitle: "${this.escapeYaml(title)}"\nlastModified: "${lastModified}"\n---\n\n# ${title}\n\n`;

      // Find and process the main content
      const mainContent = this.findMainContent(document);
      if (!mainContent) {
        throw new Error('Could not find main content in the HTML');
      }

      // Process the content
      const content = this.processContent(mainContent);
      markdown += content;

      // Clean up the markdown
      markdown = this.cleanupMarkdown(markdown);

      return markdown;
    } catch (error) {
      console.error('Conversion error:', error);
      throw new Error(`Error converting HTML to Markdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private processContent(element: Element): string {
    try {
      // Use turndown directly on the element
      return this.turndown.turndown(element.innerHTML);
    } catch (error) {
      console.error('Error processing content:', error);
      // Fallback to a simpler approach if turndown fails
      return element.textContent || '';
    }
  }

  private extractTitle(document: Document): string {
    const titleElement = document.querySelector('#title-text') || 
                        document.querySelector('.pagetitle') ||
                        document.querySelector('#title-heading .page-title') ||
                        document.querySelector('#title-heading') ||
                        document.querySelector('h1');
    
    let title = '';
    if (titleElement) {
      const titleTextElement = titleElement.querySelector('#title-text');
      title = titleTextElement?.textContent?.trim() || titleElement.textContent?.trim() || '';
      title = title.replace(/^.*\s*:\s*/, '');
    } else if (document.title) {
      title = document.title.trim().replace(/^.*\s*:\s*/, '');
    } else {
      title = 'Untitled Page';
    }
    
    const txt = document.createElement('textarea');
    txt.innerHTML = title;
    return txt.value;
  }

  private extractLastModified(document: Document): string {
    const selectors = [
      '.last-modified', 
      '.page-metadata .editor',
      '.page-metadata'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        if (selector === '.page-metadata') {
          const text = element.textContent?.trim() || '';
          const match = text.match(/last updated by\s+(.*?)(?:\s+on\s+(.*))?$/i);
          if (match) {
            return match[1].trim();
          }
        } else {
          return element.textContent?.trim() || '';
        }
      }
    }
    
    return '';
  }

  private findMainContent(document: Document): Element | null {
    const contentOptions = [
      '#main-content',
      '#content .wiki-content',
      '.wiki-content',
      '#content',
      '.view',
      'body'
    ];

    for (const selector of contentOptions) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }

    return document.body;
  }

  private escapeYaml(text: string): string {
    return text.replace(/"/g, '\\"');
  }

  private cleanupMarkdown(markdown: string): string {
    // Remove multiple blank lines
    let cleaned = markdown.replace(/\n{3,}/g, '\n\n');
    
    // Fix spacing around headings
    cleaned = cleaned.replace(/([^\n])\n#/g, '$1\n\n#');
    
    // Fix spacing around lists
    cleaned = cleaned.replace(/([^\n])\n[-*+]/g, '$1\n\n-');
    
    // Fix spacing around blockquotes
    cleaned = cleaned.replace(/([^\n])\n>/g, '$1\n\n>');
    
    // Fix heading levels (make sure there's a space after #)
    cleaned = cleaned.replace(/^(#+)([^#\s])/gm, '$1 $2');
    
    // Clean up excessive delimiters in tables
    cleaned = this.cleanupExcessiveTableDelimiters(cleaned);
    
    return cleaned;
  }

  private cleanupExcessiveTableDelimiters(markdown: string): string {
    // Fix tables with excessive delimiter rows
    const excessiveDelimitersPattern = /(\| --- \| --- \| --- \| --- \| --- \| --- \| --- \| --- \| --- \| --- \|(?:\s*?\| --- \|)+)/g;
    let cleaned = markdown.replace(excessiveDelimitersPattern, '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    
    // Handle tables with many duplicate rows of delimiters
    const manyDelimitersPattern = /(\| (?:---|:?---:?|---:) \|(?:(?: (?:---|:?---:?|---:) \|)+)\n+)(?:\| (?:---|:?---:?|---:) \|(?:(?: (?:---|:?---:?|---:) \|)+)\n+)+/g;
    cleaned = cleaned.replace(manyDelimitersPattern, '$1');
    
    return cleaned;
  }

  // Helper methods for specialized Confluence elements
  
  private isLayoutTable(table: HTMLElement): boolean {
    if (!table) return false;
    
    if (table.classList && 
        (table.classList.contains('layout') || 
         table.classList.contains('contentLayoutTable') || 
         table.classList.contains('layout-table'))) {
      return true;
    }
    
    if (table.closest && 
        (table.closest('.contentLayout2') || 
         table.closest('.columnLayout') || 
         table.closest('.section') || 
         table.closest('.panelContent'))) {
      const border = table.getAttribute('border');
      if (border === '0' || (!border && table.style.borderStyle === 'none')) {
        return true;
      }
    }
    
    return false;
  }

  private isHistoryTable(table: HTMLElement): boolean {
    // Check if it's a history table by looking at headers
    const headers = Array.from(table.querySelectorAll('th, thead td'))
      .map(th => (th as HTMLElement).textContent?.trim().toLowerCase() || '');
    
    if ((headers.includes('version') || headers.includes('v.')) && 
        (headers.includes('changed by') || headers.includes('published'))) {
      return true;
    }
    return false;
  }

  private isComplexTable(table: HTMLElement): boolean {
    // Check if table has any complex cells
    const cells = table.querySelectorAll('td, th');
    for (const cell of Array.from(cells)) {
      if (this.isComplexTableCell(cell as HTMLElement)) {
        return true;
      }
    }
    return false;
  }

  private isComplexTableCell(cell: HTMLElement): boolean {
    if (!cell) return false;
    
    // Check for complex elements that don't work well in Markdown tables
    if (cell.querySelector('h1, h2, h3, h4, h5, h6, img, ul, ol, table, .panel, .confluence-information-macro')) {
      return true;
    }
    
    // Check for multiple paragraphs
    const paragraphs = cell.querySelectorAll('p');
    if (paragraphs.length > 1) {
      return true;
    }
    
    // Check for content with line breaks that need to be preserved
    if (cell.innerHTML && cell.innerHTML.includes('<br') && cell.innerHTML.split('<br').length > 2) {
      return true;
    }
    
    return false;
  }

  // Methods for processing different types of tables
  
  private processSpecialTable(table: HTMLElement): string {
    if (this.isHistoryTable(table)) {
      return this.processHistoryTable(table);
    } else {
      return this.processLayoutTable(table);
    }
  }

  private processHistoryTable(table: HTMLElement): string {
    // Extract headers and format as a markdown table
    const headers = Array.from(table.querySelectorAll('th, thead td'))
      .map(th => (th as HTMLElement).textContent?.trim() || '');
    
    if (headers.length === 0) {
      headers.push('Version', 'Published', 'Changed By', 'Comment');
    }

    // Process rows
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const rowsContent = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td'))
        .map(td => {
          const tdElement = td as HTMLElement;
          // Simplify cell content and escape pipes
          let content = tdElement.textContent?.trim().replace(/\n/g, ' ').replace(/\|/g, '\\|') || '';
          
          // If it has a link, preserve it
          const link = tdElement.querySelector('a');
          if (link) {
            const href = link.getAttribute('href') || '';
            const text = link.textContent?.trim() || '';
            content = `[${text}](${href})`;
          }
          
          return content;
        });
      return `| ${cells.join(' | ')} |`;
    });

    // Combine everything
    return `\n| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rowsContent.join('\n')}\n`;
  }

  private processLayoutTable(table: HTMLElement): string {
    let markdown = '\n';
    
    // Process each cell as regular content
    const rows = Array.from((table as HTMLTableElement).rows);
    for (let i = 0; i < rows.length; i++) {
      const cells = Array.from(rows[i].cells);
      for (let j = 0; j < cells.length; j++) {
        const cell = cells[j];
        markdown += this.processContent(cell);
        if (j < cells.length - 1) {
          markdown += '\n\n';
        }
      }
      if (i < rows.length - 1) {
        markdown += '\n\n';
      }
    }
    return markdown;
  }

  private processComplexTable(table: HTMLElement): string {
    let markdown = '\n';
    
    const rows = Array.from((table as HTMLTableElement).rows);
    for (let i = 0; i < rows.length; i++) {
      const cells = Array.from(rows[i].cells);
      if (cells.length === 0) continue;
      
      markdown += '| ';
      for (let j = 0; j < cells.length; j++) {
        const cell = cells[j];
        let content = cell.textContent?.trim().replace(/\n/g, ' ').replace(/\|/g, '\\|') || '';
        
        // Handle cell formatting
        if (cell.querySelector('strong, b')) {
          content = `**${content}**`;
        } else if (cell.querySelector('em, i')) {
          content = `*${content}*`;
        }
        
        markdown += content;
        if (j < cells.length - 1) {
          markdown += ' | ';
        }
      }
      markdown += ' |\n';
      
      // Add separator after header row
      if (i === 0) {
        markdown += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
      }
    }
    return markdown;
  }

  private processGithubTable(table: HTMLElement): string {
    let markdown = '\n';
    
    const rows = Array.from((table as HTMLTableElement).rows);
    
    if (rows.length === 0) return '';
    
    // Get the maximum number of cells in any row
    const maxCells = Math.max(...rows.map(row => row.cells.length));
    
    if (maxCells === 0) return '';
    
    // Process each row
    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.cells);
      let rowMarkdown = '|';
      
      // Add cells
      for (let i = 0; i < maxCells; i++) {
        if (i < cells.length) {
          // Process cell content - simplify and escape pipes
          const cell = cells[i];
          let content = cell.textContent?.trim().replace(/\n/g, ' ').replace(/\|/g, '\\|') || '';
          
          // Check for formatting
          if (cell.querySelector('strong, b')) {
            content = `**${content}**`;
          } else if (cell.querySelector('em, i')) {
            content = `*${content}*`;
          }
          
          rowMarkdown += ` ${content} |`;
        } else {
          rowMarkdown += ' |';
        }
      }
      
      markdown += rowMarkdown + '\n';
      
      // Add separator after header row
      if (rowIndex === 0) {
        markdown += '|' + Array(maxCells).fill('---').join('|') + '|\n';
      }
    });
    
    return markdown;
  }

  private processCodeMacro(element: HTMLElement, content: string): string {
    const codeStyle = this.options.macroHandling.code;
    
    switch (codeStyle) {
      case 'fenced':
        // Extract language if available
        const language = element.getAttribute('data-macro-parameters')?.match(/language=([a-zA-Z0-9]+)/)?.[1] || '';
        return `\`\`\`${language}\n${content.trim()}\n\`\`\`\n\n`;
      case 'indented':
        return content.split('\n').map(line => `    ${line}`).join('\n') + '\n\n';
      default:
        return content;
    }
  }

  private processInfoMacro(element: HTMLElement, content: string, macroType: keyof typeof this.options.macroHandling, title: string): string {
    const style = this.options.macroHandling[macroType];
    
    switch (style) {
      case 'blockquote':
        return `> **${title || macroType.toUpperCase()}**\n> ${content.replace(/\n/g, '\n> ')}\n\n`;
      case 'div':
        return `<div class="macro ${macroType}">\n<h3>${title || macroType.toUpperCase()}</h3>\n${content}\n</div>\n\n`;
      case 'section':
        return `## ${title || macroType.toUpperCase()}\n\n${content}\n\n`;
      default:
        return content;
    }
  }

  public updateOptions(newOptions: Partial<ConversionOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.setupCustomRules();
  }
}