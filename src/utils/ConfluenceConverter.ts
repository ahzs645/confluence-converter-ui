// src/utils/ConfluenceConverter.ts
import TurndownService from 'turndown';
import { ElementDetector } from './ElementDetector';
import { TableProcessor } from './TableProcessor';
import { PanelProcessor } from './PanelProcessor';
import { BreadcrumbProcessor } from './BreadcrumbProcessor';
import { ConversionOptions, DocumentMetadata } from './types';

/**
 * Enhanced Confluence to Markdown converter with specialized processing
 * for complex Confluence structures
 */
export class EnhancedConfluenceConverter {
  private turndown: TurndownService;
  private options: ConversionOptions;
  private tableProcessor: TableProcessor;
  private panelProcessor: PanelProcessor;
  private breadcrumbProcessor: BreadcrumbProcessor;
  private processedElements: WeakSet<Element>;

  /**
   * Constructor
   * @param options Conversion options
   */
  constructor(options: Partial<ConversionOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: this.options.codeBlockStyle as any,
    });
    
    this.tableProcessor = new TableProcessor();
    this.panelProcessor = new PanelProcessor(this.options.panelStyle);
    this.breadcrumbProcessor = new BreadcrumbProcessor(this.options);
    this.processedElements = new WeakSet<Element>();
    
    this.setupCustomRules();
  }

  /**
   * Set up Turndown custom rules and overrides
   */
  private setupCustomRules(): void {
    // Panel/admonition rule
    this.turndown.addRule('panel', {
      filter: (node: Node) => {
        const element = node as HTMLElement;
        return ElementDetector.isPanel(element);
      },
      replacement: (content: string, node: Node) => {
        const element = node as HTMLElement;
        this.processedElements.add(element);
        return this.panelProcessor.processPanel(element);
      }
    });

    // Table rule with enhanced handling
    this.turndown.addRule('table', {
      filter: 'table',
      replacement: (content: string, node: Node) => {
        const element = node as HTMLElement;
        
        // Skip if already processed
        if (this.processedElements.has(element)) {
          return '';
        }
        
        this.processedElements.add(element);
        
        // Use the specialized table processor
        return this.tableProcessor.processTable(element, element.ownerDocument as Document);
      }
    });

    // Code block rule
    this.turndown.addRule('code', {
      filter: ['pre', 'code'],
      replacement: (content: string, node: Node) => {
        const element = node as HTMLElement;
        
        // Skip if already processed
        if (this.processedElements.has(element)) {
          return '';
        }
        
        this.processedElements.add(element);
        
        if (element.nodeName === 'PRE' || 
            (element.nodeName === 'CODE' && element.parentElement?.nodeName === 'PRE')) {
          const language = element.getAttribute('data-lang') || 
                         element.className.match(/language-(\S+)/)?.[1] || '';
          
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

    // Image rule with better alt text handling
    this.turndown.addRule('image', {
      filter: 'img',
      replacement: (content: string, node: Node) => {
        const element = node as HTMLElement;
        
        // Skip if already processed
        if (this.processedElements.has(element)) {
          return '';
        }
        
        this.processedElements.add(element);
        
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

    // Expand macro rule
    this.turndown.addRule('expand', {
      filter: (node: Node) => {
        const element = node as HTMLElement;
        return element.classList?.contains('expand-container');
      },
      replacement: (content: string, node: Node) => {
        const element = node as HTMLElement;
        
        // Skip if already processed
        if (this.processedElements.has(element)) {
          return '';
        }
        
        this.processedElements.add(element);
        
        return this.panelProcessor.processExpandMacro(element);
      }
    });

    // TOC macro rule
    this.turndown.addRule('toc', {
      filter: (node: Node) => {
        const element = node as HTMLElement;
        return element.classList?.contains('toc-macro') || 
               element.getAttribute('data-macro-name') === 'toc';
      },
      replacement: (content: string, node: Node) => {
        const element = node as HTMLElement;
        
        // Skip if already processed
        if (this.processedElements.has(element)) {
          return '';
        }
        
        this.processedElements.add(element);
        
        return this.panelProcessor.processTocMacro(element);
      }
    });

    // Status macro rule
    this.turndown.addRule('status', {
      filter: (node: Node) => {
        const element = node as HTMLElement;
        return element.classList?.contains('status-macro') || 
               element.getAttribute('data-macro-name') === 'status';
      },
      replacement: (content: string, node: Node) => {
        const element = node as HTMLElement;
        
        // Skip if already processed
        if (this.processedElements.has(element)) {
          return '';
        }
        
        this.processedElements.add(element);
        
        return this.panelProcessor.processStatusMacro(element);
      }
    });
  }

  /**
   * Convert HTML to Markdown with enhanced processing
   * @param html HTML content to convert
   * @returns string Markdown content
   */
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

      // Extract metadata
      const metadata = this.breadcrumbProcessor.extractMetadata(document);

      // Generate YAML frontmatter
      let markdown = this.breadcrumbProcessor.generateFrontmatter(metadata);

      // Add visible breadcrumb navigation if there are breadcrumbs
      if (metadata.breadcrumbs.length > 0) {
        markdown += this.breadcrumbProcessor.generateBreadcrumbTrail(metadata.breadcrumbs);
      }

      // Add title
      markdown += `# ${metadata.title}\n\n`;

      // Find the main content element
      const mainContent = ElementDetector.findMainContent(document);
      if (!mainContent) {
        throw new Error('Could not find main content in the HTML');
      }

      // Process the main content using Turndown
      const content = this.processContent(mainContent);
      markdown += content;

      // Add version history if present and not already processed
      const historyTable = document.querySelector('#page-history-container, .tableview, table.pageHistory');
      if (historyTable && !this.processedElements.has(historyTable as HTMLElement)) {
        const historyMarkdown = this.tableProcessor.processTable(historyTable as HTMLElement, document);
        markdown += historyMarkdown;
      }

      // Process attachments if enabled
      if (this.options.includeAttachments) {
        const attachments = this.extractAttachments(document);
        if (attachments.length > 0) {
          markdown += '\n## Attachments\n\n';
          for (const attachment of attachments) {
            markdown += `* [${attachment.name}](${attachment.href})\n`;
          }
          markdown += '\n';
        }
      }

      // Clean up and format the final markdown
      markdown = this.cleanupMarkdown(markdown);

      return markdown;
    } catch (error) {
      console.error('Conversion error:', error);
      throw new Error(`Error converting HTML to Markdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract attachments from the document
   * @param document The HTML document
   * @returns Array of attachment objects
   */
  private extractAttachments(document: Document): Array<{name: string, href: string}> {
    const attachments: Array<{name: string, href: string}> = [];
    
    // Find attachment links
    const attachmentLinks = document.querySelectorAll('a[data-linked-resource-type="attachment"]');
    for (const link of Array.from(attachmentLinks)) {
      const name = link.textContent?.trim() || '';
      const href = link.getAttribute('href') || '';
      
      if (name && href) {
        attachments.push({ name, href });
      }
    }
    
    // Find image attachments
    const imageAttachments = document.querySelectorAll('img[data-linked-resource-type="attachment"]');
    for (const img of Array.from(imageAttachments)) {
      const name = img.getAttribute('alt') || img.getAttribute('title') || '';
      const href = img.getAttribute('src') || '';
      
      if (name && href) {
        attachments.push({ name, href });
      }
    }
    
    return attachments;
  }

  /**
   * Process content with Turndown, handling special elements
   * @param element Element to process
   * @returns string Markdown content
   */
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

  /**
   * Clean up and format the generated markdown
   * @param markdown Markdown content to clean up
   * @returns string Cleaned markdown
   */
  public cleanupMarkdown(markdown: string): string {
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
    
    // Fix duplicate headers that sometimes appear as "# # Heading"
    cleaned = cleaned.replace(/^# #\s+/gm, '## ');
    cleaned = cleaned.replace(/^## #\s+/gm, '### ');
    
    // Clean up excessive delimiters in tables
    cleaned = this.cleanupExcessiveTableDelimiters(cleaned);
    
    return cleaned;
  }

  /**
   * Clean up tables with excessive delimiter rows
   * @param markdown Markdown content
   * @returns string Cleaned markdown
   */
  private cleanupExcessiveTableDelimiters(markdown: string): string {
    // Fix tables with excessive delimiter rows
    const excessiveDelimitersPattern = /(\| --- \| --- \| --- \| --- \| --- \| --- \| --- \| --- \| --- \| --- \|(?:\s*?\| --- \|)+)/g;
    let cleaned = markdown.replace(excessiveDelimitersPattern, '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    
    // Handle tables with many duplicate rows of delimiters
    const manyDelimitersPattern = /(\| (?:---|:?---:?|---:) \|(?:(?: (?:---|:?---:?|---:) \|)+)\n+)(?:\| (?:---|:?---:?|---:) \|(?:(?: (?:---|:?---:?|---:) \|)+)\n+)+/g;
    cleaned = cleaned.replace(manyDelimitersPattern, '$1');
    
    return cleaned;
  }
}

export const defaultOptions: ConversionOptions = {
  // Content inclusion options
  includeBreadcrumbs: true,
  includeLastModified: true,
  includeAttachments: false,
  includeComments: false,
  includePageInfo: true,
  includeTableOfContents: true,
  includeVersionHistory: true,
  includeLabels: true,
  includeMetadata: true,
  includeMacros: true,
  includeImages: true,
  includeLinks: true,
  includeCodeBlocks: true,
  includeTables: true,
  includeLists: true,
  includeBlockquotes: true,
  includeHorizontalRules: true,
  includeHeadings: true,
  includeParagraphs: true,
  includeInlineFormatting: true,
  includeSpecialCharacters: true,
  includeEmojis: true,

  // Style options
  panelStyle: 'blockquote',
  tableStyle: 'github',
  codeBlockStyle: 'fenced',
  imageStyle: 'markdown',
  linkStyle: 'markdown',
  headingStyle: 'atx',

  // Macro and attachment handling
  macroHandling: 'convert',
  attachmentOption: 'hidden',

  // Custom processing options
  includeCustomStyles: true,
  includeCustomClasses: true,
  includeCustomIds: true,
  includeCustomAttributes: true,
  includeCustomElements: true,
  includeCustomMacros: true,
  includeCustomContent: true,
  includeCustomMetadata: true,
  includeCustomLabels: true,
  includeCustomComments: true,
  includeCustomVersionHistory: true,
  includeCustomPageInfo: true,
  includeCustomTableOfContents: true,
  includeCustomBreadcrumbs: true,
  includeCustomLastModified: true
};