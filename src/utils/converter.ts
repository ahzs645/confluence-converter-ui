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

export class ConfluenceConverter {
  private turndown: TurndownService;
  private options: ConversionOptions;

  constructor(options: Partial<ConversionOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: this.options.codeBlockStyle,
    });

    this.setupCustomRules();
  }

  private setupCustomRules() {
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
            return `> **${title}**\n> ${content}`;
          case 'div':
            return `<div class="panel ${panelType}">\n<h3>${title}</h3>\n${content}\n</div>`;
          case 'section':
            return `## ${title}\n\n${content}`;
          default:
            return content;
        }
      }
    });

    // Table conversion
    this.turndown.addRule('table', {
      filter: 'table',
      replacement: (content: string, node: Node) => {
        const element = node as HTMLElement;
        switch (this.options.tableStyle) {
          case 'github':
            return this.turndown.turndown(element.outerHTML);
          case 'simple':
            return content.replace(/\|/g, ' ').trim();
          case 'html':
            return element.outerHTML;
          default:
            return content;
        }
      }
    });

    // Code block conversion
    this.turndown.addRule('code', {
      filter: ['pre', 'code'],
      replacement: (content: string, node: Node) => {
        const element = node as HTMLElement;
        const language = element.getAttribute('data-lang') || '';
        switch (this.options.codeBlockStyle) {
          case 'fenced':
            return `\`\`\`${language}\n${content}\n\`\`\``;
          case 'indented':
            return content.split('\n').map((line: string) => `    ${line}`).join('\n');
          default:
            return content;
        }
      }
    });

    // Image conversion
    this.turndown.addRule('image', {
      filter: 'img',
      replacement: (content: string, node: Node) => {
        const element = node as HTMLElement;
        const src = element.getAttribute('src') || '';
        const alt = element.getAttribute('alt') || '';
        const title = element.getAttribute('title') || '';

        switch (this.options.imageStyle) {
          case 'markdown':
            return `![${alt}](${src}${title ? ` "${title}"` : ''})`;
          case 'html':
            return element.outerHTML;
          default:
            return `![${alt}](${src})`;
        }
      }
    });

    // Macro conversion
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
        
        switch (macroType) {
          case 'info':
          case 'warning':
          case 'note':
            const style = this.options.macroHandling[macroType as keyof typeof this.options.macroHandling];
            switch (style) {
              case 'blockquote':
                return `> **${title}**\n> ${content}`;
              case 'div':
                return `<div class="macro ${macroType}">\n<h3>${title}</h3>\n${content}\n</div>`;
              case 'section':
                return `## ${title}\n\n${content}`;
              default:
                return content;
            }
          case 'code':
            const codeStyle = this.options.macroHandling.code;
            switch (codeStyle) {
              case 'fenced':
                return `\`\`\`\n${content}\n\`\`\``;
              case 'indented':
                return content.split('\n').map((line: string) => `    ${line}`).join('\n');
              default:
                return content;
            }
          default:
            return content;
        }
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

      // Start with frontmatter and title
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
      return this.cleanupMarkdown(markdown);
    } catch (error) {
      console.error('Conversion error:', error);
      throw new Error(`Error converting HTML to Markdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private processContent(element: Element): string {
    try {
      // Use turndown directly on the element instead of processing each node
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
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    
    // Fix spacing around headings
    markdown = markdown.replace(/([^\n])\n#/g, '$1\n\n#');
    
    // Fix spacing around lists
    markdown = markdown.replace(/([^\n])\n[-*+]/g, '$1\n\n-');
    
    // Fix spacing around blockquotes
    markdown = markdown.replace(/([^\n])\n>/g, '$1\n\n>');
    
    return markdown;
  }

  public updateOptions(newOptions: Partial<ConversionOptions>) {
    this.options = { ...this.options, ...newOptions };
    this.setupCustomRules();
  }
} 