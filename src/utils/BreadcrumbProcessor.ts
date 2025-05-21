// src/utils/BreadcrumbProcessor.ts
import { ConversionOptions, Breadcrumb, DocumentMetadata } from './types';

/**
 * Specialized processor for extracting and formatting breadcrumbs and metadata
 */
export class BreadcrumbProcessor {
  private options: ConversionOptions;

  constructor(options: ConversionOptions) {
    this.options = options;
  }

  /**
   * Extract breadcrumbs from Confluence HTML
   * @param document The parsed HTML document
   * @returns Breadcrumb[] Array of breadcrumb items
   */
  public extractBreadcrumbs(document: Document): Breadcrumb[] {
    if (!this.options.includeBreadcrumbs) {
      return [];
    }

    const breadcrumbs: Breadcrumb[] = [];
    
    // Try to find breadcrumbs in the standard location
    const breadcrumbItems = document.querySelectorAll('#breadcrumbs li, .breadcrumb-section ol li');
    
    if (breadcrumbItems && breadcrumbItems.length > 0) {
      for (const item of Array.from(breadcrumbItems)) {
        const link = item.querySelector('a');
        if (link) {
          let href = link.getAttribute('href') || '#';
          
          // Normalize URL
          if (href.startsWith('/')) {
            href = `.${href}`;
          } else if (!href.startsWith('./') && !href.startsWith('../') && !href.startsWith('#') && !href.includes('://')) {
            href = `./${href}`;
          }
          
          breadcrumbs.push({
            text: link.textContent?.trim() || '',
            href
          });
        } else if (item.textContent?.trim()) {
          // Current page (often doesn't have a link)
          breadcrumbs.push({
            text: item.textContent.trim(),
            href: '#'
          });
        }
      }
    }
    
    // If no breadcrumbs found, try to extract from the title
    if (breadcrumbs.length === 0) {
      const title = document.title;
      const parts = title.split(' : ');
      
      if (parts.length > 1) {
        // Create breadcrumbs from title segments
        for (let i = 0; i < parts.length; i++) {
          breadcrumbs.push({
            text: parts[i].trim(),
            href: i === parts.length - 1 ? '#' : undefined
          });
        }
      }
    }
    
    return breadcrumbs;
  }
  
  /**
   * Extract comprehensive metadata from the document
   * @param document The parsed HTML document
   * @returns DocumentMetadata Metadata object
   */
  public extractMetadata(document: Document): DocumentMetadata {
    // Always extract all metadata fields
    const title = this.extractTitle(document);
    let lastModified = '';
    let createdBy = '';
    let createdDate = '';

    // Extract last modified date if present
    const lastModifiedElements = [
      document.querySelector('.last-modified'),
      document.querySelector('.page-metadata .editor'),
      document.querySelector('.page-metadata')
    ].filter(Boolean);
    if (lastModifiedElements.length > 0) {
      const element = lastModifiedElements[0];
      if (element && element.className.includes('page-metadata')) {
        const text = element.textContent?.trim() || '';
        const match = text.match(/last updated by\s+(.*?)(?:\s+on\s+(.*))?$/i);
        if (match) {
          lastModified = match[1].trim();
        }
      } else if (element) {
        lastModified = element.textContent?.trim() || '';
      }
    }

    // Extract creation information if present
    const pageMetadata = document.querySelector('.page-metadata');
    if (pageMetadata) {
      const metadataContent = pageMetadata.textContent?.trim() || '';
      // Extract author
      const authorMatch = metadataContent.match(/Created by\s+(.*?)(?:,|\s+on|\s+last)/i);
      if (authorMatch && authorMatch[1]) {
        createdBy = authorMatch[1].trim();
      }
      // Extract date
      const dateMatch = metadataContent.match(/on\s+([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}|[A-Z][a-z]{2}\s+\d{1,2}\s+\d{4})/i);
      if (dateMatch && dateMatch[1]) {
        createdDate = dateMatch[1].trim();
      }
    }

    // Always extract breadcrumbs (option controls output, not extraction)
    const breadcrumbs = this.extractBreadcrumbs(document);

    return {
      title,
      lastModified,
      createdBy,
      createdDate,
      breadcrumbs
    };
  }
  
  /**
   * Helper to extract the document title
   * @param document The parsed HTML document
   * @returns string The document title
   */
  private extractTitle(document: Document): string {
    const titleElement = document.querySelector('#title-text') || 
                        document.querySelector('.pagetitle') ||
                        document.querySelector('#title-heading .page-title') ||
                        document.querySelector('#title-heading') ||
                        document.querySelector('h1');
    
    let title = '';
    if (titleElement) {
      const titleTextElement = titleElement.querySelector('#title-text');
      title = titleTextElement ? titleTextElement.textContent?.trim() || '' : titleElement.textContent?.trim() || '';
      title = title.replace(/^.*\s*:\s*/, '');
    } else if (document.title) {
      title = document.title.trim().replace(/^.*\s*:\s*/, '');
    } else {
      title = 'Untitled Page';
    }
    return title;
  }
  
  /**
   * Generate YAML frontmatter from metadata
   * @param metadata Document metadata
   * @returns string YAML frontmatter
   */
  public generateFrontmatter(metadata: DocumentMetadata): string {
    // Only generate frontmatter if metadata or breadcrumbs are included
    if (!this.options.includeMetadata && !this.options.includeBreadcrumbs && !this.options.includeLastModified) {
        return '';
    }

    let frontmatter = '---\n';
    
    // Escape special characters in YAML strings
    const escapeYaml = (text: string): string => {
      return text.replace(/"/g, '\\"');
    };
    
    // Add title (always include title if generating frontmatter)
    frontmatter += `title: "${escapeYaml(metadata.title)}"\n`;
    
    // Add creator info if available and metadata is included
    if (this.options.includeMetadata && metadata.createdBy) {
      frontmatter += `created_by: "${escapeYaml(metadata.createdBy)}"\n`;
    }
    
    if (this.options.includeMetadata && metadata.createdDate) {
      frontmatter += `created_date: "${escapeYaml(metadata.createdDate)}"\n`;
    }
    
    // Add last modified info if available and includeLastModified is included
    if (this.options.includeLastModified && metadata.lastModified) {
      frontmatter += `last_modified: "${escapeYaml(metadata.lastModified)}"\n`;
    }
    
    // Add breadcrumbs if available and includeBreadcrumbs is included
    if (this.options.includeBreadcrumbs && metadata.breadcrumbs && metadata.breadcrumbs.length > 0) {
      frontmatter += 'breadcrumbs:\n';
      
      for (const crumb of metadata.breadcrumbs) {
        frontmatter += `  - title: "${escapeYaml(crumb.text)}"\n`;
        
        if (crumb.href) {
          // Clean up URL for YAML
          let href = crumb.href;
          href = href.split('?')[0]; // Remove query parameters
          
          frontmatter += `    url: "${escapeYaml(href)}"\n`;
        }
      }
    }
    
    frontmatter += '---\n\n';
    return frontmatter;
  }
  
  /**
   * Generate a visible breadcrumb trail in Markdown
   * @param breadcrumbs Array of breadcrumb items
   * @returns string Markdown breadcrumb trail
   */
  public generateBreadcrumbTrail(breadcrumbs: Breadcrumb[]): string {
    if (!this.options.includeBreadcrumbs || !breadcrumbs || breadcrumbs.length === 0) {
      return '';
    }
    
    let trail = '> ';
    
    trail += breadcrumbs.map(crumb => {
      // Normalize URL
      let href = crumb.href || '#';
      href = href.split('?')[0]; // Remove query parameters
      
      return `[${crumb.text}](${href})`;
    }).join(' > ');
    
    return trail + '\n\n';
  }
}