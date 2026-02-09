import * as path from "path";

/**
 * Interfaces pour l'injection de dépendances (Étape 2).
 * Permettent la simulation lors des tests.
 */

/** Exploration du système de fichiers. */
export interface IFileSystemExplorer {
  listEntries(directoryPath: string): string[];
  exists(filePath: string): boolean;
  isDirectory(filePath: string): boolean;
}

/** Manipulation des fichiers. */
export interface IFileSystemManipulator {
  copy(source: string, destination: string): void;
  move(source: string, destination: string): void;
  delete(filePath: string): void;
  createDirectory(dirPath: string): void;
}

/** Tirage aléatoire. */
export interface IRandomProvider {
  nextInt(max: number): number;
}

/**
 * Résultat d'une erreur sur un fichier.
 */
export interface FileOperationError {
  fileName: string;
  errorMessage: string;
  operationType: "copy" | "move" | "delete";
}

/**
 * Résultat d'une opération de manipulation.
 */
export interface OperationResult {
  destinationPath?: string;
  errors: FileOperationError[];
}

/**
 * Classe de sélection et manipulation de fichiers.
 */

const ADJECTIVES = [
  "grand", "petit", "rouge", "bleu", "vert",
  "rapide", "lent", "brillant", "sombre", "clair",
  "ancien", "nouveau", "fort", "doux", "vif",
  "calme", "noble", "simple", "rare", "libre",
];

const NOUNS = [
  "soleil", "lune", "etoile", "montagne", "riviere",
  "foret", "ocean", "desert", "jardin", "chateau",
  "dragon", "phoenix", "tigre", "aigle", "dauphin",
  "cristal", "diamant", "saphir", "rubis", "emeraude",
];

export { ADJECTIVES, NOUNS };

export class FileManager {
  private currentDirectory: string | null = null;
  private entries: string[] = [];
  private selectedEntries: Set<string> = new Set();

  private explorer: IFileSystemExplorer;
  private manipulator: IFileSystemManipulator;
  private random: IRandomProvider;

  constructor(
    explorer: IFileSystemExplorer,
    manipulator: IFileSystemManipulator,
    random: IRandomProvider
  ) {
    this.explorer = explorer;
    this.manipulator = manipulator;
    this.random = random;
  }

  // ==================== Énumération ====================

  /** Charge et retourne les entrées du répertoire donné. */
  listEntries(directoryPath: string): string[] {
    this.currentDirectory = directoryPath;
    this.entries = this.explorer.listEntries(directoryPath);
    this.selectedEntries.clear();
    return [...this.entries];
  }

  getEntries(): string[] {
    return [...this.entries];
  }

  getCurrentDirectory(): string | null {
    return this.currentDirectory;
  }

  // ==================== Sélection ====================

  /** Sélectionne une entrée par son nom. */
  select(entryName: string): void {
    if (!this.entries.includes(entryName)) {
      throw new Error(`L'entrée '${entryName}' n'existe pas dans le répertoire courant.`);
    }
    this.selectedEntries.add(entryName);
  }

  /** Désélectionne une entrée. */
  deselect(entryName: string): void {
    this.selectedEntries.delete(entryName);
  }

  /** Sélectionne toutes les entrées. */
  selectAll(): void {
    this.entries.forEach((e) => this.selectedEntries.add(e));
  }

  /** Désélectionne toutes les entrées. */
  deselectAll(): void {
    this.selectedEntries.clear();
  }

  getSelectedEntries(): string[] {
    return [...this.selectedEntries];
  }

  isSelected(entryName: string): boolean {
    return this.selectedEntries.has(entryName);
  }

  // ==================== Opérations ====================

  /** Copie les fichiers sélectionnés. Retourne les erreurs éventuelles. */
  copySelection(destinationPath?: string): OperationResult {
    if (this.selectedEntries.size === 0) {
      throw new Error("Aucun fichier sélectionné.");
    }

    const resolved = this.resolveDestination(destinationPath);
    this.manipulator.createDirectory(resolved);

    const errors: FileOperationError[] = [];
    const succeeded: string[] = [];

    for (const entry of [...this.selectedEntries]) {
      const source = path.join(this.currentDirectory!, entry);
      const target = path.join(resolved, entry);
      try {
        this.manipulator.copy(source, target);
        succeeded.push(entry);
      } catch (e: any) {
        errors.push({ fileName: entry, errorMessage: e.message, operationType: "copy" });
      }
    }

    // Les fichiers réussis sont désélectionnés, ceux en erreur restent sélectionnés
    for (const s of succeeded) {
      this.selectedEntries.delete(s);
    }

    return { destinationPath: resolved, errors };
  }

  /** Déplace les fichiers sélectionnés. Retourne les erreurs éventuelles. */
  moveSelection(destinationPath?: string): OperationResult {
    if (this.selectedEntries.size === 0) {
      throw new Error("Aucun fichier sélectionné.");
    }

    const resolved = this.resolveDestination(destinationPath);
    this.manipulator.createDirectory(resolved);

    const errors: FileOperationError[] = [];
    const succeeded: string[] = [];

    for (const entry of [...this.selectedEntries]) {
      const source = path.join(this.currentDirectory!, entry);
      const target = path.join(resolved, entry);
      try {
        this.manipulator.move(source, target);
        succeeded.push(entry);
        this.entries = this.entries.filter((e) => e !== entry);
      } catch (e: any) {
        errors.push({ fileName: entry, errorMessage: e.message, operationType: "move" });
      }
    }

    for (const s of succeeded) {
      this.selectedEntries.delete(s);
    }

    return { destinationPath: resolved, errors };
  }

  /** Supprime les fichiers sélectionnés. Retourne les erreurs éventuelles. */
  deleteSelection(): OperationResult {
    if (this.selectedEntries.size === 0) {
      throw new Error("Aucun fichier sélectionné.");
    }

    const errors: FileOperationError[] = [];
    const succeeded: string[] = [];

    for (const entry of [...this.selectedEntries]) {
      const fullPath = path.join(this.currentDirectory!, entry);
      try {
        this.manipulator.delete(fullPath);
        succeeded.push(entry);
        this.entries = this.entries.filter((e) => e !== entry);
      } catch (e: any) {
        errors.push({ fileName: entry, errorMessage: e.message, operationType: "delete" });
      }
    }

    for (const s of succeeded) {
      this.selectedEntries.delete(s);
    }

    return { errors };
  }

  // ==================== Méthodes privées ====================

  /**
   * Résout le chemin de destination.
   * Si aucun chemin fourni, génère un nom unique (adjectif-nom).
   * Réessaie jusqu'à 10 fois si le nom existe déjà.
   * Après 10 tentatives, numérote le dernier nom.
   */
  private resolveDestination(destinationPath?: string): string {
    if (destinationPath) {
      return destinationPath;
    }

    let name: string = "";
    for (let attempt = 0; attempt < 10; attempt++) {
      const adj = ADJECTIVES[this.random.nextInt(ADJECTIVES.length)];
      const noun = NOUNS[this.random.nextInt(NOUNS.length)];
      name = `${adj}-${noun}`;
      const fullPath = path.join(this.currentDirectory!, name);
      if (!this.explorer.exists(fullPath)) {
        return fullPath;
      }
    }

    // Après 10 tentatives, numéroter le dernier nom
    let counter = 1;
    let numberedName: string;
    do {
      numberedName = `${name}-${counter}`;
      counter++;
    } while (this.explorer.exists(path.join(this.currentDirectory!, numberedName)));

    return path.join(this.currentDirectory!, numberedName);
  }
}
