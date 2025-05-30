// src/utils/TableProcessor.ts
import { ElementDetector } from './ElementDetector';
import TurndownService from 'turndown'; // Add this import

/**
 * Specialized processor for Confluence tables with enhanced handling
 */
export class TableProcessor {
  /**
   * Map to track processed elements to avoid duplication
   */
  private processedElements: Set<HTMLElement>;
  private turndownService: TurndownService;

  constructor(processedElements: Set<HTMLElement>, turndownService: TurndownService) {
    this.processedElements = processedElements;
    this.turndownService = turndownService;
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
      const htmlRowElement = row as HTMLElement; // Cast to HTMLElement
      if (this.processedElements.has(htmlRowElement)) continue;
      this.processedElements.add(htmlRowElement);
      
      const cells = Array.from(htmlRowElement.querySelectorAll('td'));
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
      const htmlRowElement = row as HTMLTableRowElement;
      if (this.processedElements.has(htmlRowElement)) continue;
      this.processedElements.add(htmlRowElement);
      const cells = Array.from(htmlRowElement.cells);
      for (const cell of cells) {
        const htmlCellElement = cell as HTMLElement;
        if (this.processedElements.has(htmlCellElement)) continue;
        this.processedElements.add(htmlCellElement);
        // Process this cell's content without table constraints
        let cellContent = '';
        for (const child of Array.from((cell as HTMLElement).childNodes)) {
          if (child.nodeType === Node.TEXT_NODE) {
            cellContent += (child as Text).textContent;
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
      const htmlRowElement = row as HTMLTableRowElement;
      if (this.processedElements.has(htmlRowElement)) continue;
      this.processedElements.add(htmlRowElement);
      const cells = Array.from(htmlRowElement.cells);
      if (cells.length === 0) continue;
      // Use first cell as heading, rest as content
      const firstCell = cells[0];
      // Extract heading text
      let sectionTitle = firstCell.textContent?.trim() || '';
      // Create a heading if there's content
      if (sectionTitle) {
        markdown += `## ${sectionTitle}\n\n`;
      }
      // Add the rest of the cells as content
      for (let i = 1; i < cells.length; i++) {
        const cell = cells[i];
        markdown += (cell.textContent?.trim() || '') + '\n\n';
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
    if (this.processedElements.has(table)) {
      return '';
    }
    this.processedElements.add(table);

    const rows = Array.from(table.querySelectorAll('tr')); // Keep as 'tr' for all rows initially
    if (rows.length === 0) return '';

    let markdown = '\n';
    let headerProcessed = false;
    let maxCells = 0;

    // First pass to determine max cells for alignment
    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      if (cells.length > maxCells) {
        maxCells = cells.length;
      }
    });

    rows.forEach((row, rowIndex) => {
      // Cast row to HTMLElement
      const htmlRowElement = row as HTMLTableRowElement;
      const cells = Array.from(htmlRowElement.cells);
      let rowMarkdown = '|';
      let isHeaderRow = false;

      if (cells.length > 0 && cells[0].nodeName === 'TH' && !headerProcessed) {
        isHeaderRow = true;
        headerProcessed = true; 
      }
      
      for (let i = 0; i < maxCells; i++) {
        if (i < cells.length) {
          const cell = cells[i] as HTMLElement;
          // Ensure cell is not processed if it was part of a complex structure handled by another rule
          if (this.processedElements.has(cell) && cell !== htmlRowElement && cell !== table) { 
            // If cell was already processed by another rule (e.g. a panel inside a cell)
            // we might want to just get its text or a placeholder.
            // For now, we re-process, but this could be refined.
          }
          this.processedElements.add(cell); 
          
          let cellContent = this.turndownService.turndown(cell.innerHTML);
          cellContent = cellContent.replace(/\n+/g, ' ').trim();
          cellContent = cellContent.replace(/\|/g, '\\|');

          rowMarkdown += ` ${cellContent} |`;
        } else {
          rowMarkdown += '  |'; 
        }
      }
      markdown += rowMarkdown + '\n';

      if (isHeaderRow) {
        markdown += '|' + ' --- |'.repeat(maxCells) + '\n';
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