import * as path from 'path';
import { ConversionOptions, ProcessedFile } from './types';
import { HtmlParser } from './html-parser';
import { FileSystem } from './file-system';
import { EnhancedConfluenceConverter, defaultOptions } from './ConfluenceConverter';

export class Converter {
  private htmlParser: HtmlParser;
  private fileSystem: FileSystem;
  private converter: EnhancedConfluenceConverter;

  constructor(options = defaultOptions) {
    this.htmlParser = new HtmlParser(options);
    this.fileSystem = new FileSystem();
    this.converter = new EnhancedConfluenceConverter(options);
  }

  /**
   * Process a single HTML file and convert it to Markdown
   */
  async processFile(
    inputFilePath: string,
    outputFilePath: string,
    attachmentOption: 'visible' | 'hidden' | 'xml',
    rootOutputDir: string
  ): Promise<void> {
    try {
      console.log(`Processing: ${inputFilePath} with attachment option: ${attachmentOption}`);
      
      // Read and parse HTML file
      const document = await this.htmlParser.parseFile(inputFilePath);
      
      // Extract attachments
      const attachments = this.htmlParser.extractAttachmentInfo(document);
      
      // Convert to Markdown
      const markdown = this.converter.convert(document.documentElement.outerHTML);
      
      // Ensure output directory exists
      await this.fileSystem.ensureDirectoryExists(path.dirname(outputFilePath));
      
      // Write markdown to file
      await this.fileSystem.writeFile(outputFilePath, markdown);
      
      // Process attachments if needed
      if (attachments.size > 0 && attachmentOption !== 'hidden') {
        await this.fileSystem.processAttachments(
          path.dirname(inputFilePath),
          path.dirname(outputFilePath),
          attachments
        );
      }
      
      console.log(`Converted: ${outputFilePath}`);
    } catch (err) {
      console.error(`Error processing file ${inputFilePath}:`, err);
      throw err;
    }
  }

  /**
   * Process a directory of HTML files recursively with breadcrumb-based structure
   */
  async processDirectory(
    inputDir: string,
    outputDir: string,
    attachmentOption: 'visible' | 'hidden' | 'xml'
  ): Promise<void> {
    try {
      // Create output directory
      await this.fileSystem.ensureDirectoryExists(outputDir);
      
      // First pass: Analyze all HTML files and extract breadcrumbs
      const filesToProcess: ProcessedFile[] = [];
      
      const analyzeEntries = async (dir: string, relativePath = '') => {
        const entries = await this.fileSystem.listFiles(dir, '.html');
        
        for (const filePath of entries) {
          const entryRelativePath = path.relative(inputDir, filePath);
          
          try {
            const document = await this.htmlParser.parseFile(filePath);
            const breadcrumbs = this.htmlParser.extractBreadcrumbs(document);
            
            filesToProcess.push({
              inputPath: filePath,
              relativePath: entryRelativePath,
              breadcrumbs
            });
          } catch (e) {
            console.error(`Error analyzing breadcrumbs for ${filePath}:`, e);
            filesToProcess.push({
              inputPath: filePath,
              relativePath: entryRelativePath,
              breadcrumbs: []
            });
          }
        }
      };
      
      // Analyze all files
      await analyzeEntries(inputDir);
      
      // Second pass: Process each file and create appropriate directories
      for (const file of filesToProcess) {
        // Determine output path based on breadcrumbs
        let outputPath = '';
        
        if (file.breadcrumbs && file.breadcrumbs.length > 0) {
          // Create a path based on breadcrumbs (excluding the last one which is the current page)
          const pathSegments = file.breadcrumbs
            .slice(0, -1)
            .map(crumb => this.fileSystem.sanitizeFilename(crumb.text));
          
          // Join the breadcrumb-based path with the output directory
          outputPath = path.join(outputDir, ...pathSegments);
        } else {
          // Use the original relative path if no breadcrumbs
          outputPath = path.join(outputDir, path.dirname(file.relativePath));
        }
        
        // Determine the output filename
        const baseName = path.basename(file.inputPath, '.html');
        const outputFilePath = path.join(outputPath, `${baseName}.md`);
        
        // Process the file
        await this.processFile(file.inputPath, outputFilePath, attachmentOption, outputDir);
      }
    } catch (err) {
      console.error(`Error processing directory ${inputDir}:`, err);
      throw err;
    }
  }

  /**
   * Post-process all markdown files to fix any remaining issues
   */
  async postProcessMarkdownFiles(outputDir: string): Promise<void> {
    try {
      console.log("Starting post-processing of markdown files...");
      
      const files = await this.fileSystem.listFiles(outputDir, '.md');
      
      for (const filePath of files) {
        try {
          // Read file
          let content = await this.fileSystem.readFile(filePath);
          
          // Apply cleanup
          content = this.converter.cleanupMarkdown(content);
          
          // Write back to file
          await this.fileSystem.writeFile(filePath, content);
          
          console.log(`Post-processed: ${filePath}`);
        } catch (err) {
          console.error(`Error processing file ${filePath}:`, err);
          // Continue with other files instead of failing the entire process
        }
      }
      
      console.log("Post-processing complete");
    } catch (err) {
      console.error(`Error post-processing markdown files:`, err);
      throw err;
    }
  }
} 