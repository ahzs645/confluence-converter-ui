export interface ConversionOptions {
  // Content inclusion options
  includeBreadcrumbs: boolean;
  includeLastModified: boolean;
  includeAttachments: boolean;
  includeComments: boolean;
  includePageInfo: boolean;
  includeTableOfContents: boolean;
  includeVersionHistory: boolean;
  includeLabels: boolean;
  includeMetadata: boolean;
  includeMacros: boolean;
  includeImages: boolean;
  includeLinks: boolean;
  includeCodeBlocks: boolean;
  includeTables: boolean;
  includeLists: boolean;
  includeBlockquotes: boolean;
  includeHorizontalRules: boolean;
  includeHeadings: boolean;
  includeParagraphs: boolean;
  includeInlineFormatting: boolean;
  includeSpecialCharacters: boolean;
  includeEmojis: boolean;

  // Style options
  panelStyle: 'blockquote' | 'div' | 'section';
  tableStyle: 'github' | 'simple' | 'html';
  codeBlockStyle: 'fenced' | 'indented';
  imageStyle: 'markdown' | 'html';
  linkStyle: 'markdown' | 'html';
  headingStyle: 'atx' | 'setext';

  // Macro and attachment handling
  macroHandling: 'convert' | 'remove' | 'preserve';
  attachmentOption: 'visible' | 'hidden' | 'xml';

  // Custom processing options
  includeCustomStyles: boolean;
  includeCustomClasses: boolean;
  includeCustomIds: boolean;
  includeCustomAttributes: boolean;
  includeCustomElements: boolean;
  includeCustomMacros: boolean;
  includeCustomContent: boolean;
  includeCustomMetadata: boolean;
  includeCustomLabels: boolean;
  includeCustomComments: boolean;
  includeCustomVersionHistory: boolean;
  includeCustomPageInfo: boolean;
  includeCustomTableOfContents: boolean;
  includeCustomBreadcrumbs: boolean;
  includeCustomLastModified: boolean;
}

export interface Breadcrumb {
  text: string;
  href?: string;
}

export interface DocumentMetadata {
  title: string;
  lastModified?: string;
  createdBy?: string;
  createdDate?: string;
  breadcrumbs: Breadcrumb[];
}

export interface AttachmentInfo {
  id: string;
  filename: string;
  containerId: string;
  href: string;
}

export interface ProcessedFile {
  inputPath: string;
  relativePath: string;
  breadcrumbs: Breadcrumb[];
}

export interface ConversionResult {
  markdown: string;
  attachments: Map<string, AttachmentInfo>;
  breadcrumbs: Breadcrumb[];
}

export const defaultOptions: ConversionOptions = {
  // Content inclusion options
  includeBreadcrumbs: false,
  includeLastModified: false,
  includeAttachments: false,
  includeComments: false,
  includePageInfo: false,
  includeTableOfContents: false,
  includeVersionHistory: false,
  includeLabels: false,
  includeMetadata: false,
  includeMacros: false,
  includeImages: false,
  includeLinks: false,
  includeCodeBlocks: false,
  includeTables: false,
  includeLists: false,
  includeBlockquotes: false,
  includeHorizontalRules: false,
  includeHeadings: false,
  includeParagraphs: false,
  includeInlineFormatting: false,
  includeSpecialCharacters: false,
  includeEmojis: false,

  // Style options
  panelStyle: 'blockquote',
  tableStyle: 'github',
  codeBlockStyle: 'fenced',
  imageStyle: 'markdown',
  linkStyle: 'markdown',
  headingStyle: 'atx',

  // Macro and attachment handling
  macroHandling: 'convert',
  attachmentOption: 'visible',

  // Custom processing options
  includeCustomStyles: false,
  includeCustomClasses: false,
  includeCustomIds: false,
  includeCustomAttributes: false,
  includeCustomElements: false,
  includeCustomMacros: false,
  includeCustomContent: false,
  includeCustomMetadata: false,
  includeCustomLabels: false,
  includeCustomComments: false,
  includeCustomVersionHistory: false,
  includeCustomPageInfo: false,
  includeCustomTableOfContents: false,
  includeCustomBreadcrumbs: false,
  includeCustomLastModified: false
};