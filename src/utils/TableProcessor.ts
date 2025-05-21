// src/utils/TableProcessor.ts
import { ElementDetector } from './ElementDetector';

/**
 * Specialized processor for Confluence tables with enhanced handling
 */
export class TableProcessor {
  /**
   * Map to track processed elements to avoid duplication
   */
  private processedElements: WeakSet<Element>;

  constructor() {
    this.processedElements = new WeakSet<Element>();
  }

  /**
   * Process a table element, determining its type and applying appropriate conversion
   * @param table The table element to process
   * @param document The parent document
   * @returns string Markdown representation of the table
   */
  public processTable(table: HTMLElement, document: Document): string {
    if (this.processedElements.has(table)) {
      return '';
    }
    
    this.processedElements.add(table);
    
    // Ensure we're working with a table element
    if (!(table instanceof HTMLTableElement)) {
      return '';
    }
    
    // Determine table type and process accordingly
    if (ElementDetector.isHistoryTable(table)) {
      return this.processHistoryTable(table);
    }
    
    if (ElementDetector.isLayoutTable(table)) {
      return this.processLayoutTable(table);
    }
    
    if (ElementDetector.isComplexTable(table)) {
      return this.processComplexTable(table);
    }
    
    // Default: process as a standard GitHub-style markdown table
    return this.processGithubTable(table);
  }
  
  /**
   * Processes a history/version table
   * @param table The history table element
   * @returns string Markdown representation
   */
  private processHistoryTable(table: HTMLElement): string {
    let markdown = '\n### Page History\n\n';
    
    // Define standard headers for history tables
    const headers = ['Version', 'Published', 'Changed By', 'Comment'];
    
    // Start the table header
    markdown += '| ' + headers.join(' | ') + ' |\n';
    markdown += '|' + headers.map(() => '---').join('|') + '|\n';
    
    // Process rows
    const rows = Array.from(table.querySelectorAll('tbody tr, tr:not(:first-child)'));
    for (const row of rows) {
      if (this.processedElements.has(row)) continue;
      this.processedElements.add(row);
      
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 3) continue;
      
      // Extract data from each column
      let versionText = cells[0].textContent?.trim() || '';
      const versionLink = cells[0].querySelector('a');
      if (versionLink) {
        const href = versionLink.getAttribute('href') || '';
        versionText = `[${versionLink.textContent?.trim() || versionText}](${href})`;
      } else {
        versionText = versionText.replace(/\n/g, ' ').replace(/\|/g, '\\|');
      }
      
      const publishedText = (cells[1].textContent?.trim() || '').replace(/\n/g, ' ').replace(/\|/g, '\\|');
      
      let changedByText = '';
      const userIcon = cells[2].querySelector('img.userLogo');
      const userName = cells[2].querySelector('.page-history-contributor-name a, .page-history-contributor-name span');
      
      if (userIcon) {
        const src = userIcon.getAttribute('src') || '';
        const alt = userIcon.getAttribute('alt') || 'User';
        changedByText += `![${alt}](${src}) `;
      }
      
      if (userName) {
        const userLink = userName.tagName.toLowerCase() === 'a' ? userName as HTMLAnchorElement : null;
        if (userLink) {
          const href = userLink.getAttribute('href') || '';
          changedByText += `[${userLink.textContent?.trim() || ''}](${href})`;
        } else {
          changedByText += userName.textContent?.trim() || '';
        }
      } else {
        changedByText += (cells[2].textContent?.trim() || '').replace(/\n/g, ' ').replace(/\|/g, '\\|');
      }
      
      const commentText = (cells.length > 3 ? cells[3].textContent?.trim() || '' : '')
        .replace(/\n/g, ' ').replace(/\|/g, '\\|');
      
      markdown += `| ${versionText} | ${publishedText} | ${changedByText} | ${commentText} |\n`;
    }
    
    return markdown + '\n';
  }
  
  /**
   * Process a layout table which should be treated as content blocks
   * @param table The layout table element
   * @returns string Markdown representation
   */
  private processLayoutTable(table: HTMLTableElement): string {
    let markdown = '';
    
    // Extract content from each cell, preserving block structure
    const rows = Array.from(table.rows);
    for (const row of rows) {
      if (this.processedElements.has(row)) continue;
      this.processedElements.add(row);
      
      const cells = Array.from(row.cells);
      for (const cell of cells) {
        if (this.processedElements.has(cell)) continue;
        this.processedElements.add(cell);
        
        // Process this cell's content without table constraints
        let cellContent = '';
        for (const child of Array.from(cell.childNodes)) {
          if (child.nodeType === Node.TEXT_NODE) {
            cellContent += child.textContent;
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const el = child as HTMLElement;
            if (ElementDetector.shouldBeIgnored(el)) continue;
            
            if (el.tagName === 'BR') {
              cellContent += '\n';
            } else if (el.tagName === 'P') {
              cellContent += el.textContent?.trim() + '\n\n';
            } else if (el.tagName.match(/^H[1-6]$/)) {
              const level = parseInt(el.tagName.substring(1), 10);
              cellContent += '#'.repeat(level) + ' ' + el.textContent?.trim() + '\n\n';
            } else {
              cellContent += el.textContent?.trim() + '\n';
            }
          }
        }
        
        if (cellContent.trim()) {
          markdown += cellContent.trim() + '\n\n';
        }
      }
    }
    
    return markdown;
  }
  
  /**
   * Process a complex table as sections with headings
   * @param table The complex table element
   * @returns string Markdown representation
   */
  private processComplexTable(table: HTMLTableElement): string {
    let markdown = '\n';
    
    const rows = Array.from(table.rows);
    for (const row of rows) {
      if (this.processedElements.has(row)) continue;
      this.processedElements.add(row);
      
      const cells = Array.from(row.cells);
      if (cells.length === 0) continue;
      
      // Use first cell as heading, rest as content
      const firstCell = cells[0];
      
      // Extract heading text
      let sectionTitle = firstCell.textContent?.trim() || '';
      
      // Create a heading if there's content
      if (sectionTitle) {
        markdown += `## ${sectionTitle}\n\n`;
      }
      
      // Process remaining cells as content
      for (let i = 1; i < cells.length; i++) {
        const cell = cells[i];
        if (this.processedElements.has(cell)) continue;
        this.processedElements.add(cell);
        
        let content = cell.innerHTML
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
          .replace(/<\/?[^>]+(>|$)/g, '');
        
        if (content.trim()) {
          markdown += content.trim() + '\n\n';
        }
      }
    }
    
    return markdown;
  }
  
  /**
   * Process a standard table using GitHub-style markdown
   * @param table The table element
   * @returns string Markdown representation
   */
  private processGithubTable(table: HTMLTableElement): string {
    let markdown = '\n';
    
    const rows = Array.from(table.rows);
    if (rows.length === 0) return '';
    
    // Find the maximum number of cells in any row
    const maxCells = Math.max(...rows.map(row => row.cells.length));
    if (maxCells === 0) return '';
    
    // Process each row
    rows.forEach((row, rowIndex) => {
      if (this.processedElements.has(row)) return;
      this.processedElements.add(row);
      
      const cells = Array.from(row.cells);
      const isHeader = rowIndex === 0 || row.querySelector('th') !== null;
      let rowMarkdown = '|';
      
      // Process each cell
      for (let i = 0; i < maxCells; i++) {
        if (i < cells.length) {
          const cell = cells[i];
          this.processedElements.add(cell);
          
          // Process cell content
          let content = cell.textContent?.trim() || '';
          
          // Check for basic formatting
          const strong = cell.querySelector('strong, b');
          const em = cell.querySelector('em, i');
          
          if (strong) {
            content = `**${content}**`;
          } else if (em) {
            content = `*${content}*`;
          }
          
          // Escape pipe characters
          content = content.replace(/\|/g, '\\|');
          
          rowMarkdown += ` ${content} |`;
        } else {
          rowMarkdown += ' |';
        }
      }
      
      markdown += rowMarkdown + '\n';
      
      // Add separator after header row
      if (isHeader) {
        markdown += '|' + Array(maxCells).fill('---').join('|') + '|\n';
      }
    });
    
    return markdown + '\n';
  }
  
  /**
   * Helper method to clean up and simplify complex cell content
   * @param cell The complex cell
   * @returns string Simplified content
   */
  private simplifyComplexCell(cell: HTMLElement): string {
    // Check for headings
    const heading = cell.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      return `**${heading.textContent?.trim()}**`;
    }
    
    // Check for images
    const image = cell.querySelector('img');
    if (image) {
      const alt = image.getAttribute('alt') || 'image';
      return `[${alt}]`;
    }
    
    // Check for lists
    const list = cell.querySelector('ul, ol');
    if (list) {
      const items = list.querySelectorAll('li');
      if (items.length <= 2) {
        return Array.from(items)
          .map(item => `• ${item.textContent?.trim()}`)
          .join(' ');
      } else {
        return `[List with ${items.length} items]`;
      }
    }
    
    // Check for nested tables
    if (cell.querySelector('table')) {
      return '[Nested table]';
    }
    
    // Check for panels
    if (cell.querySelector('.panel, .confluence-information-macro')) {
      return '[Panel content]';
    }
    
    // Default: just use shortened text
    let text = cell.textContent?.trim().replace(/\s+/g, ' ') || '';
    if (text.length > 50) {
      text = text.substring(0, 47) + '...';
    }
    
    return text;
  }
}