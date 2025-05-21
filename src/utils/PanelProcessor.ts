// src/utils/PanelProcessor.ts
import { ElementDetector } from './ElementDetector';
import TurndownService from 'turndown'; // Add this import

/**
 * Type for panel style configuration
 */
export interface PanelStyle {
  blockquote: (title: string, content: string, type: string) => string;
  div: (title: string, content: string, type: string) => string;
  section: (title: string, content: string, type: string) => string;
}

/**
 * Configuration for panel styles
 */
const panelStyles: PanelStyle = {
  blockquote: (title: string, content: string, type: string) => {
    const formattedTitle = title || type.toUpperCase();
    return `> **${formattedTitle}**\n> ${content.replace(/\n/g, '\n> ')}\n\n`;
  },
  div: (title: string, content: string, type: string) => {
    const formattedTitle = title || type.toUpperCase();
    return `<div class="panel ${type}">\n<h3>${formattedTitle}</h3>\n${content}\n</div>\n\n`;
  },
  section: (title: string, content: string, type: string) => {
    const formattedTitle = title || type.toUpperCase();
    return `## ${formattedTitle}\n\n${content}\n\n`;
  }
};

/**
 * Specialized processor for Confluence panels, admonitions, and macros
 */
export class PanelProcessor {
  private processedElements: Set<HTMLElement>;
  private turndownService: TurndownService;
  private panelStyle: keyof PanelStyle;

  /**
   * @param turndownService The TurndownService instance for converting inner HTML
   */
  constructor(turndownService: TurndownService, panelStyle: keyof PanelStyle = 'blockquote') {
    this.turndownService = turndownService;
    this.processedElements = new Set<HTMLElement>();
    this.panelStyle = panelStyle;
  }

  /**
   * Change the panel style
   * @param panelStyle The style to use for panels
   */
  public setPanelStyle(panelStyle: 'blockquote' | 'div' | 'section'): void {
    // If panelStyle is still a concept you need, you can set it via a method
    // this.panelStyle = panelStyle;
  }
  
  /**
   * Process a panel element
   * @param panel The panel element to process
   * @returns string Markdown representation of the panel
   */
  public processPanel(panel: HTMLElement): string {
    if (this.processedElements.has(panel)) {
      return '';
    }
    this.processedElements.add(panel);
    // Determine panel type
    const panelType = ElementDetector.getPanelType(panel);
    // Extract panel title
    const titleElement = panel.querySelector('.panelHeader, .panel-header, .aui-message-header');
    const title = titleElement ? titleElement.textContent?.trim() || '' : '';
    // Extract panel content
    const contentElement = panel.querySelector('.panelContent, .panel-body, .aui-message-content');
    let content = '';
    if (contentElement && contentElement instanceof HTMLElement) {
      this.processedElements.add(contentElement);
      // Process the content
      for (const child of Array.from(contentElement.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          content += child.textContent || '';
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          if (ElementDetector.shouldBeIgnored(el)) continue;
          if (el.tagName === 'BR') {
            content += '\n';
          } else if (el.tagName === 'P') {
            content += el.textContent?.trim() + '\n\n';
          } else if (el.tagName.match(/^H[1-6]$/)) {
            const level = parseInt(el.tagName.substring(1), 10);
            content += '#'.repeat(level) + ' ' + el.textContent?.trim() + '\n\n';
          } else {
            content += el.textContent?.trim() + '\n';
          }
        }
      }
    } else {
      // If no specific content element, process all children except the title
      for (const child of Array.from(panel.childNodes)) {
        if (child === titleElement) continue;
        if (child.nodeType === Node.TEXT_NODE) {
          content += child.textContent || '';
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          if (ElementDetector.shouldBeIgnored(el)) continue;
          if (el.tagName === 'BR') {
            content += '\n';
          } else if (el.tagName === 'P') {
            content += el.textContent?.trim() + '\n\n';
          } else if (el.tagName.match(/^H[1-6]$/)) {
            const level = parseInt(el.tagName.substring(1), 10);
            content += '#'.repeat(level) + ' ' + el.textContent?.trim() + '\n\n';
          } else {
            content += el.textContent?.trim() + '\n';
          }
        }
      }
    }
    // Format according to the chosen style
    // When using:
    return panelStyles[this.panelStyle](title, content.trim(), panelType);
  }
  
  /**
   * Process an expand/collapse macro
   * @param expandElement The expand element to process
   * @returns string Markdown representation using HTML details/summary
   */
  public processExpandMacro(expandElement: HTMLElement): string {
    if (this.processedElements.has(expandElement)) {
      return '';
    }
    
    this.processedElements.add(expandElement);
    
    // Find the expand control text (summary)
    const titleElement = expandElement.querySelector('.expand-control-text');
    const title = titleElement ? titleElement.textContent?.trim() || 'Details' : 'Details';
    
    // Find the expand content
    const contentElement = expandElement.querySelector('.expand-content');
    let content = '';
    
    if (contentElement) {
      if (contentElement instanceof HTMLElement) {
        this.processedElements.add(contentElement);
      }
      
      // Process the content
      for (const child of Array.from(contentElement.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          content += child.textContent || '';
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          if (ElementDetector.shouldBeIgnored(el)) continue;
          
          if (el.tagName === 'BR') {
            content += '\n';
          } else if (el.tagName === 'P') {
            content += el.textContent?.trim() + '\n\n';
          } else if (el.tagName.match(/^H[1-6]$/)) {
            const level = parseInt(el.tagName.substring(1), 10);
            content += '#'.repeat(level) + ' ' + el.textContent?.trim() + '\n\n';
          } else {
            content += el.textContent?.trim() + '\n';
          }
        }
      }
    }
    
    // Use HTML details/summary elements for expand/collapse
    return `<details>\n<summary>${title}</summary>\n\n${content.trim()}\n</details>\n\n`;
  }
  
  /**
   * Process code macro
   * @param codeElement Code macro element
   * @param codeStyle 'fenced' or 'indented'
   * @returns string Markdown code block
   */
  public processCodeMacro(codeElement: HTMLElement, codeStyle: 'fenced' | 'indented' = 'fenced'): string {
    if (this.processedElements.has(codeElement)) {
      return '';
    }
    
    this.processedElements.add(codeElement);
    
    // Extract language from the element
    let language = '';
    const macroParams = codeElement.getAttribute('data-macro-parameters');
    if (macroParams) {
      const match = macroParams.match(/language=([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        language = match[1];
      }
    }
    
    // Get content
    const codeContent = codeElement.textContent?.trim() || '';
    
    // Format according to style
    if (codeStyle === 'fenced') {
      return `\`\`\`${language}\n${codeContent}\n\`\`\`\n\n`;
    } else {
      return codeContent.split('\n').map(line => `    ${line}`).join('\n') + '\n\n';
    }
  }
  
  /**
   * Process a table of contents macro
   * @param tocElement TOC element
   * @returns string Markdown representation
   */
  public processTocMacro(tocElement: HTMLElement): string {
    if (this.processedElements.has(tocElement)) {
      return '';
    }
    
    this.processedElements.add(tocElement);
    
    // For TOC, just add a header indicating it should be replaced by a TOC
    return `## Table of Contents\n\n[TOC]\n\n`;
  }
  
  /**
   * Process a Jira Issues macro
   * @param jiraMacroElement The Jira macro element
   * @returns string Markdown representation
   */
  public processJiraMacro(jiraMacroElement: HTMLElement): string {
    if (this.processedElements.has(jiraMacroElement)) {
      return '';
    }
    this.processedElements.add(jiraMacroElement);
  
    let markdown = '\n**Jira Issues:**\n';
    // Example: Assuming Jira issues are links within the macro
    // Adjust selectors based on your Jira macro's HTML structure
    const issueLinks = jiraMacroElement.querySelectorAll('a[href*="/browse/"]'); // Made selector more generic
    
    if (issueLinks.length > 0) {
      issueLinks.forEach(link => {
        const issueKey = link.textContent?.trim() || 'Jira Issue';
        const issueUrl = link.getAttribute('href') || '#';
        markdown += `* [${issueKey}](${issueUrl})\n`;
      });
    } else {
      // Fallback if no specific links found, or provide a placeholder
      // You might want to convert the inner content of the macro if it's complex
      // const innerContent = this.turndownService.turndown(jiraMacroElement.innerHTML);
      // markdown += `* (Could not extract specific Jira issues - check macro structure)\n${innerContent}\n`;
      markdown += '* (Jira macro content - further parsing might be needed)\n';
    }
    
    return markdown + '\n';
  }

  /**
   * Process a status macro
   * @param statusElement Status element
   * @returns string Markdown representation
   */
  public processStatusMacro(statusElement: HTMLElement): string {
    if (this.processedElements.has(statusElement)) {
      return '';
    }
    
    this.processedElements.add(statusElement);
    
    const statusText = statusElement.textContent?.trim() || '';
    const color = statusElement.getAttribute('data-color') || '';
    
    if (this.panelStyle === 'div') {
      return `<span class="status-macro${color ? ` ${color}` : ''}">${statusText}</span>`;
    } else {
      return `[${statusText}]`;
    }
  }
}