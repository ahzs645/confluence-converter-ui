// src/utils/ElementDetector.ts
/**
 * Utility class for detecting and categorizing Confluence HTML elements
 */
export class ElementDetector {
  /**
   * Determines if a table is a layout table rather than a data table
   * @param table The table element to check
   * @returns boolean True if the table is a layout table
   */
  public static isLayoutTable(table: HTMLElement): boolean {
    if (!(table instanceof HTMLTableElement)) return false;
    
    // Check for layout classes
    if (table.classList && (
        table.classList.contains('layout') || 
        table.classList.contains('contentLayoutTable') || 
        table.classList.contains('layout-table'))) {
      return true;
    }
    
    // Check if the table is inside a layout container
    const parent = table.closest('.contentLayout2, .columnLayout, .section, .panelContent');
    if (parent) {
      const border = table.getAttribute('border');
      if (border === '0' || (!border && (table as HTMLTableElement).style.borderStyle === 'none')) {
        return true;
      }
    }
    
    // Check if it's a single-cell table containing block elements
    if (table.rows.length === 1) {
      const cells = table.rows[0].cells;
      if (cells.length === 1 && cells[0].querySelector('div, table, ul, ol, p')) {
        return true;
      }
    }
    
    // Check for wysiwyg macro tables
    if (table.classList && table.classList.contains('wysiwyg-macro')) {
      return true;
    }
    
    return false;
  }

  /**
   * Determines if a table is a history/version table
   * @param table The table element to check
   * @returns boolean True if the table is a history table
   */
  public static isHistoryTable(table: HTMLElement): boolean {
    if (!table) return false;
    
    // Check for specific history table IDs or classes
    if (table.id === 'page-history-container' || 
        (table.classList && table.classList.contains('tableview'))) {
      return true;
    }
    
    // Check headers for version/history columns
    const headers = Array.from(table.querySelectorAll('th, thead td'))
      .map(th => (th as HTMLElement).textContent?.trim().toLowerCase() || '');
    
    if ((headers.includes('version') || headers.includes('v.')) && 
        (headers.includes('changed by') || headers.includes('published'))) {
      return true;
    }
    
    // Check if table is in a history container
    let parent = table.parentElement;
    while (parent) {
      if (parent.id && (parent.id.includes('history') || parent.id.includes('version'))) {
        return true;
      }
      if (parent.classList && (parent.classList.contains('history') || parent.classList.contains('expand-content'))) {
        return true;
      }
      parent = parent.parentElement;
    }
    
    return false;
  }

  /**
   * Checks if a table cell contains complex content that can't work well in a Markdown table
   * @param cell The table cell to check
   * @returns boolean True if the cell contains complex content
   */
  public static isComplexTableCell(cell: HTMLElement): boolean {
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
    
    // Check if the text content is very long (over 100 chars)
    if (cell.textContent && cell.textContent.trim().length > 100) {
      return true;
    }
    
    return false;
  }

  /**
   * Checks if a table contains any complex cells
   * @param table The table to check
   * @returns boolean True if the table contains complex cells
   */
  public static isComplexTable(table: HTMLElement): boolean {
    if (!table) return false;
    
    // Check for complex cells in the table
    const cells = table.querySelectorAll('td, th');
    for (const cell of Array.from(cells)) {
      if (this.isComplexTableCell(cell as HTMLElement)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Detects if an element is a panel or admonition
   * @param element The element to check
   * @returns boolean True if the element is a panel
   */
  public static isPanel(element: HTMLElement): boolean {
    if (!element) return false;
    
    return element.classList.contains('panel') || 
           element.classList.contains('confluence-information-macro') ||
           element.classList.contains('aui-message') ||
           element.classList.contains('admonition') ||
           element.classList.contains('expand-container') ||
           element.getAttribute('data-macro-name') !== null;
  }

  /**
   * Detects the panel type (info, note, warning, etc.)
   * @param panel The panel element
   * @returns string The panel type or 'info' as default
   */
  public static getPanelType(panel: HTMLElement): string {
    if (!panel) return 'info';
    
    // Check data-macro-name attribute first
    const macroName = panel.getAttribute('data-macro-name');
    if (macroName) {
      return macroName;
    }
    
    // Check classes
    if (panel.classList.contains('note') || panel.classList.contains('confluence-information-macro-note')) {
      return 'note';
    }
    
    if (panel.classList.contains('warning') || panel.classList.contains('confluence-information-macro-warning')) {
      return 'warning';
    }
    
    if (panel.classList.contains('tip') || panel.classList.contains('confluence-information-macro-tip')) {
      return 'tip';
    }
    
    if (panel.classList.contains('code') || panel.classList.contains('confluence-information-macro-code')) {
      return 'code';
    }
    
    return 'info';
  }

  /**
   * Determines if an element should be ignored during content processing
   * @param element The element to check
   * @returns boolean True if the element should be ignored
   */
  public static shouldBeIgnored(element: HTMLElement): boolean {
    if (!element || !element.tagName) return true;
    
    const tagName = element.tagName.toUpperCase();
    
    // Skip script, style, etc.
    if (tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'NOSCRIPT' || tagName === 'BUTTON') {
      return true;
    }
    
    // Skip hidden elements
    if (element.getAttribute('aria-hidden') === 'true') {
      return true;
    }
    
    if (element.style && (element.style.display === 'none' || element.style.visibility === 'hidden')) {
      return true;
    }
    
    // Skip navigation, headers, footers, etc.
    const excludeClasses = [
      'breadcrumb-section', 'footer', 'aui-nav', 'pageSectionHeader', 
      'hidden', 'navigation', 'screenreader-only', 'hidden-xs', 
      'hidden-sm', 'aui-icon', 'aui-avatar-inner', 'expand-control'
    ];
    
    const excludeIds = [
      'breadcrumbs', 'footer', 'navigation', 'sidebar', 
      'page-sidebar', 'header', 'actions', 'likes-and-labels-container', 
      'page-metadata-secondary'
    ];
    
    for (const cls of excludeClasses) {
      if (element.classList.contains(cls)) {
        return true;
      }
    }
    
    if (element.id && excludeIds.includes(element.id)) {
      return true;
    }
    
    return false;
  }

  /**
   * Detects if an element is an expand macro
   * @param element The element to check
   * @returns boolean True if the element is an expand macro
   */
  public static isExpandMacro(element: HTMLElement): boolean {
    if (!element) return false;
    return (
      element.classList?.contains('expand-macro') ||
      element.getAttribute('data-macro-name') === 'expand'
    );
  }

  /**
   * Detects if an element is a Jira Issues macro
   * @param element The element to check
   * @returns boolean True if the element is a Jira Issues macro
   */
  public static isJiraMacro(element: HTMLElement): boolean {
    if (!element) return false;
    // Example detection: based on a class or data attribute
    // Adjust this selector based on how the Jira macro is rendered in your Confluence HTML
    return element.classList.contains('jira-issues') || 
           element.getAttribute('data-macro-name') === 'jira';
  }

  /**
   * Finds the main content element in the document
   * @param document The HTML document
   * @returns HTMLElement The main content element or document.body if not found
   */
  public static findMainContent(document: Document): HTMLElement {
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
        return element as HTMLElement;
      }
    }

    return document.body;
  }
}