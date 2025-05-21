import { JSDOM } from 'jsdom';
import { AttachmentInfo, Breadcrumb, ConversionOptions, defaultOptions } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class HtmlParser {
  private readonly dom: JSDOM;
  private readonly options: ConversionOptions;

  constructor(htmlContent: string, options: ConversionOptions = defaultOptions) {
    this.dom = new JSDOM(htmlContent);
    this.options = options;
  }

  /**
   * Parse an HTML file and return a JSDOM document
   */
  async parseFile(filePath: string): Promise<Document> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const dom = new JSDOM(content);
      return dom.window.document;
    } catch (err) {
      console.error(`Error parsing HTML file ${filePath}:`, err);
      throw err;
    }
  }

  /**
   * Extract the document title from parsed HTML
   */
  extractTitle(document: Document): string {
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

  /**
   * Extract the last modified date from parsed HTML
   */
  extractLastModified(document: Document): string {
    if (!this.options.includeLastModified) {
      return "";
    }
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

  /**
   * Find the main content element in parsed HTML
   */
  findMainContent(document: Document): Element | null {
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

  /**
   * Extract attachment information from parsed HTML
   */
  extractAttachmentInfo(document: Document): Map<string, AttachmentInfo> {
    if (!this.options.includeAttachments) {
      return new Map<string, AttachmentInfo>();
    }
    const attachments = new Map<string, AttachmentInfo>();
    
    try {
      // Find all attachment links
      const attachmentLinks = document.querySelectorAll('a[data-linked-resource-type="attachment"]');
      
      for (const link of Array.from(attachmentLinks)) {
        const id = link.getAttribute('data-linked-resource-id');
        const filename = link.textContent?.trim() || '';
        const containerId = link.getAttribute('data-linked-resource-container-id');
        const href = link.getAttribute('href');
        
        if (id && filename) {
          attachments.set(id, {
            id,
            filename,
            containerId: containerId || '',
            href: href || `attachments/${containerId}/${id}${path.extname(filename)}`
          });
        }
      }
      
      // Also collect image attachments
      const imageLinks = document.querySelectorAll('img[data-linked-resource-type="attachment"]');
      for (const img of Array.from(imageLinks)) {
        const id = img.getAttribute('data-linked-resource-id');
        const filename = img.getAttribute('alt') || img.getAttribute('title') || '';
        const containerId = img.getAttribute('data-linked-resource-container-id');
        const src = img.getAttribute('src');
        
        if (id && filename) {
          attachments.set(id, {
            id,
            filename,
            containerId: containerId || '',
            href: src || `attachments/${containerId}/${id}${path.extname(filename)}`
          });
        }
      }
    } catch (err) {
      console.error('Error extracting attachment info:', err);
    }
    
    return attachments;
  }

  /**
   * Extract breadcrumbs from the document
   */
  extractBreadcrumbs(document: Document): Breadcrumb[] {
    if (!this.options.includeBreadcrumbs) {
      return [];
    }
    const breadcrumbs: Breadcrumb[] = [];
    
    try {
      // Try to find breadcrumbs in the standard Confluence location
      const breadcrumbElement = document.querySelector('#breadcrumb-section');
      if (breadcrumbElement) {
        const links = breadcrumbElement.querySelectorAll('a');
        for (const link of Array.from(links)) {
          breadcrumbs.push({
            text: link.textContent?.trim() || '',
            href: link.getAttribute('href') || undefined
          });
        }
      }
      
      // If no breadcrumbs found, try to extract from the page title
      if (breadcrumbs.length === 0) {
        const title = this.extractTitle(document);
        const parts = title.split(' : ');
        if (parts.length > 1) {
          parts.forEach(part => {
            breadcrumbs.push({ text: part.trim() });
          });
        }
      }
    } catch (err) {
      console.error('Error extracting breadcrumbs:', err);
    }
    
    return breadcrumbs;
  }
} 