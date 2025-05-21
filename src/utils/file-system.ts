import * as fs from 'fs/promises';
import * as path from 'path';
import { AttachmentInfo } from './types';

export class FileSystem {
  /**
   * Process attachments by copying them to the output directory
   */
  async processAttachments(
    sourceDir: string,
    targetDir: string,
    attachments: Map<string, AttachmentInfo>
  ): Promise<void> {
    try {
      // Create attachments directory if it doesn't exist
      const attachmentsDir = path.join(targetDir, 'attachments');
      await fs.mkdir(attachmentsDir, { recursive: true });

      // Process each attachment
      for (const [id, info] of attachments) {
        const sourcePath = path.join(sourceDir, 'attachments', info.containerId, id + path.extname(info.filename));
        const targetPath = path.join(attachmentsDir, info.filename);

        try {
          // Copy the file
          await fs.copyFile(sourcePath, targetPath);
          console.log(`Copied attachment: ${info.filename}`);
        } catch (err) {
          console.error(`Error copying attachment ${info.filename}:`, err);
        }
      }
    } catch (err) {
      console.error('Error processing attachments:', err);
      throw err;
    }
  }

  /**
   * Ensure a directory exists, creating it if necessary
   */
  async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
      console.error(`Error creating directory ${dirPath}:`, err);
      throw err;
    }
  }

  /**
   * Write content to a file
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await this.ensureDirectoryExists(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf8');
    } catch (err) {
      console.error(`Error writing file ${filePath}:`, err);
      throw err;
    }
  }

  /**
   * Read a file's contents
   */
  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (err) {
      console.error(`Error reading file ${filePath}:`, err);
      throw err;
    }
  }

  /**
   * List all files in a directory recursively
   */
  async listFiles(dirPath: string, fileExtension?: string): Promise<string[]> {
    try {
      const files: string[] = [];
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip special directories
          if (['attachments', 'images'].includes(entry.name)) {
            continue;
          }
          files.push(...await this.listFiles(fullPath, fileExtension));
        } else if (!fileExtension || entry.name.endsWith(fileExtension)) {
          files.push(fullPath);
        }
      }

      return files;
    } catch (err) {
      console.error(`Error listing files in ${dirPath}:`, err);
      throw err;
    }
  }

  /**
   * Sanitize a filename to be safe for all operating systems
   */
  sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters
      .replace(/\s+/g, '_')          // Replace spaces with underscores
      .replace(/^\.+/, '')           // Remove leading dots
      .replace(/\.+$/, '')           // Remove trailing dots
      .substring(0, 255);            // Limit length
  }
} 