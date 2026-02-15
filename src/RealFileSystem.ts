import * as fs from "fs";
import {
  IFileSystemExplorer,
  IFileSystemManipulator,
  IRandomProvider,
} from "./FileManager";

/**
 * Implémentation réelle de IFileSystemExplorer utilisant le module fs.
 */
export class RealFileSystemExplorer implements IFileSystemExplorer {
  listEntries(directoryPath: string): string[] {
    return fs.readdirSync(directoryPath);
  }

  exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  isDirectory(filePath: string): boolean {
    return fs.existsSync(filePath) && fs.statSync(filePath).isDirectory();
  }
}

/**
 * Implémentation réelle de IFileSystemManipulator utilisant le module fs.
 */
export class RealFileSystemManipulator implements IFileSystemManipulator {
  copy(source: string, destination: string): void {
    const stat = fs.statSync(source);
    if (stat.isDirectory()) {
      fs.mkdirSync(destination, { recursive: true });
      for (const child of fs.readdirSync(source)) {
        this.copy(`${source}/${child}`, `${destination}/${child}`);
      }
    } else {
      fs.copyFileSync(source, destination);
    }
  }

  move(source: string, destination: string): void {
    fs.renameSync(source, destination);
  }

  delete(filePath: string): void {
    fs.rmSync(filePath, { recursive: true, force: true });
  }

  createDirectory(dirPath: string): void {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Implémentation réelle de IRandomProvider.
 */
export class RealRandomProvider implements IRandomProvider {
  nextInt(max: number): number {
    return Math.floor(Math.random() * max);
  }
}
