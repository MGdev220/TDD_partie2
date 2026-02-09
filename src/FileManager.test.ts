import * as path from "path";
import {
  FileManager,
  IFileSystemExplorer,
  IFileSystemManipulator,
  IRandomProvider,
  ADJECTIVES,
  NOUNS,
} from "./FileManager";

// ========================================================================
// Helpers : création de mocks
// ========================================================================

function createMockExplorer(): jest.Mocked<IFileSystemExplorer> {
  return {
    listEntries: jest.fn<string[], [string]>().mockReturnValue([]),
    exists: jest.fn<boolean, [string]>().mockReturnValue(false),
    isDirectory: jest.fn<boolean, [string]>().mockReturnValue(false),
  };
}

function createMockManipulator(): jest.Mocked<IFileSystemManipulator> {
  return {
    copy: jest.fn<void, [string, string]>(),
    move: jest.fn<void, [string, string]>(),
    delete: jest.fn<void, [string]>(),
    createDirectory: jest.fn<void, [string]>(),
  };
}

function createMockRandom(): jest.Mocked<IRandomProvider> {
  return {
    nextInt: jest.fn<number, [number]>().mockReturnValue(0),
  };
}

/** Construit un FileManager avec des mocks par défaut. */
function buildFileManager() {
  const explorer = createMockExplorer();
  const manipulator = createMockManipulator();
  const random = createMockRandom();
  const fm = new FileManager(explorer, manipulator, random);
  return { fm, explorer, manipulator, random };
}

const DIR = "/test/dir";

// ========================================================================
// Tests
// ========================================================================

describe("FileManager", () => {
  // ====================== Étape 3 : Tests avec mocks ======================

  // ---- Énumération ----

  describe("listEntries", () => {
    it("retourne les entrées du répertoire", () => {
      const { fm, explorer } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt", "b.txt", "sub"]);

      const result = fm.listEntries(DIR);

      expect(result).toEqual(["a.txt", "b.txt", "sub"]);
      expect(explorer.listEntries).toHaveBeenCalledWith(DIR);
    });

    it("met à jour le répertoire courant", () => {
      const { fm } = buildFileManager();
      fm.listEntries(DIR);
      expect(fm.getCurrentDirectory()).toBe(DIR);
    });

    it("retourne une copie (pas la référence interne)", () => {
      const { fm, explorer } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt"]);
      const result = fm.listEntries(DIR);
      result.push("intrus");
      expect(fm.getEntries()).toEqual(["a.txt"]);
    });

    it("réinitialise la sélection quand on change de répertoire", () => {
      const { fm, explorer } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt"]);
      fm.listEntries(DIR);
      fm.select("a.txt");

      explorer.listEntries.mockReturnValue(["b.txt"]);
      fm.listEntries("/autre/dir");

      expect(fm.getSelectedEntries()).toEqual([]);
    });

    it("gère un répertoire vide", () => {
      const { fm, explorer } = buildFileManager();
      explorer.listEntries.mockReturnValue([]);
      expect(fm.listEntries(DIR)).toEqual([]);
    });
  });

  // ---- Sélection ----

  describe("select / deselect", () => {
    it("sélectionne une entrée existante", () => {
      const { fm, explorer } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt", "b.txt"]);
      fm.listEntries(DIR);

      fm.select("a.txt");
      expect(fm.isSelected("a.txt")).toBe(true);
      expect(fm.isSelected("b.txt")).toBe(false);
    });

    it("lance une erreur si l'entrée n'existe pas", () => {
      const { fm, explorer } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt"]);
      fm.listEntries(DIR);

      expect(() => fm.select("inconnu.txt")).toThrow(
        "L'entrée 'inconnu.txt' n'existe pas"
      );
    });

    it("ne crée pas de doublons", () => {
      const { fm, explorer } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt"]);
      fm.listEntries(DIR);

      fm.select("a.txt");
      fm.select("a.txt");
      expect(fm.getSelectedEntries()).toEqual(["a.txt"]);
    });

    it("désélectionne une entrée", () => {
      const { fm, explorer } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt"]);
      fm.listEntries(DIR);
      fm.select("a.txt");

      fm.deselect("a.txt");
      expect(fm.isSelected("a.txt")).toBe(false);
    });

    it("désélectionner une entrée non sélectionnée est sans effet", () => {
      const { fm, explorer } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt"]);
      fm.listEntries(DIR);
      fm.deselect("a.txt"); // pas d'erreur
      expect(fm.getSelectedEntries()).toEqual([]);
    });
  });

  describe("selectAll / deselectAll", () => {
    it("sélectionne toutes les entrées", () => {
      const { fm, explorer } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt", "b.txt", "c.txt"]);
      fm.listEntries(DIR);

      fm.selectAll();
      expect(fm.getSelectedEntries().sort()).toEqual(["a.txt", "b.txt", "c.txt"]);
    });

    it("désélectionne toutes les entrées", () => {
      const { fm, explorer } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt", "b.txt"]);
      fm.listEntries(DIR);
      fm.selectAll();

      fm.deselectAll();
      expect(fm.getSelectedEntries()).toEqual([]);
    });
  });

  // ---- Copie ----

  describe("copySelection", () => {
    it("lance une erreur sans sélection", () => {
      const { fm, explorer } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt"]);
      fm.listEntries(DIR);

      expect(() => fm.copySelection("/dest")).toThrow("Aucun fichier sélectionné");
    });

    it("copie les fichiers sélectionnés vers la destination fournie", () => {
      const { fm, explorer, manipulator } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt", "b.txt"]);
      fm.listEntries(DIR);
      fm.select("a.txt");
      fm.select("b.txt");

      const result = fm.copySelection("/dest");

      expect(result.destinationPath).toBe("/dest");
      expect(manipulator.createDirectory).toHaveBeenCalledWith("/dest");
      expect(manipulator.copy).toHaveBeenCalledTimes(2);
      expect(manipulator.copy).toHaveBeenCalledWith(
        path.join(DIR, "a.txt"),
        path.join("/dest", "a.txt")
      );
      expect(manipulator.copy).toHaveBeenCalledWith(
        path.join(DIR, "b.txt"),
        path.join("/dest", "b.txt")
      );
    });

    it("désélectionne les fichiers copiés avec succès", () => {
      const { fm, explorer } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt"]);
      fm.listEntries(DIR);
      fm.select("a.txt");

      fm.copySelection("/dest");
      expect(fm.getSelectedEntries()).toEqual([]);
    });

    it("génère un nom aléatoire si aucune destination fournie", () => {
      const { fm, explorer, random } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt"]);
      fm.listEntries(DIR);
      fm.select("a.txt");

      // Premier appel → index 2 (adjectif), deuxième → index 5 (nom)
      random.nextInt
        .mockReturnValueOnce(2)
        .mockReturnValueOnce(5);

      const result = fm.copySelection();
      const expected = path.join(DIR, `${ADJECTIVES[2]}-${NOUNS[5]}`);
      expect(result.destinationPath).toBe(expected);
    });

    it("gère les erreurs partielles : fichiers en erreur restent sélectionnés", () => {
      const { fm, explorer, manipulator } = buildFileManager();
      explorer.listEntries.mockReturnValue(["ok.txt", "fail.txt"]);
      fm.listEntries(DIR);
      fm.selectAll();

      manipulator.copy.mockImplementation((src: string) => {
        if (src.includes("fail.txt")) {
          throw new Error("Permission refusée");
        }
      });

      const result = fm.copySelection("/dest");

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].fileName).toBe("fail.txt");
      expect(result.errors[0].operationType).toBe("copy");
      expect(result.errors[0].errorMessage).toBe("Permission refusée");
      // ok.txt a été désélectionné, fail.txt reste sélectionné
      expect(fm.isSelected("fail.txt")).toBe(true);
      expect(fm.isSelected("ok.txt")).toBe(false);
    });
  });

  // ---- Déplacement ----

  describe("moveSelection", () => {
    it("lance une erreur sans sélection", () => {
      const { fm, explorer } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt"]);
      fm.listEntries(DIR);

      expect(() => fm.moveSelection("/dest")).toThrow("Aucun fichier sélectionné");
    });

    it("déplace les fichiers sélectionnés", () => {
      const { fm, explorer, manipulator } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt", "b.txt"]);
      fm.listEntries(DIR);
      fm.selectAll();

      const result = fm.moveSelection("/dest");

      expect(result.destinationPath).toBe("/dest");
      expect(manipulator.move).toHaveBeenCalledTimes(2);
    });

    it("retire les fichiers déplacés de la liste des entrées", () => {
      const { fm, explorer, manipulator } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt", "b.txt", "c.txt"]);
      fm.listEntries(DIR);
      fm.select("a.txt");
      fm.select("c.txt");

      fm.moveSelection("/dest");

      expect(fm.getEntries()).toEqual(["b.txt"]);
      expect(fm.getSelectedEntries()).toEqual([]);
    });

    it("gère les erreurs partielles lors du déplacement", () => {
      const { fm, explorer, manipulator } = buildFileManager();
      explorer.listEntries.mockReturnValue(["ok.txt", "fail.txt"]);
      fm.listEntries(DIR);
      fm.selectAll();

      manipulator.move.mockImplementation((src: string) => {
        if (src.includes("fail.txt")) {
          throw new Error("Fichier verrouillé");
        }
      });

      const result = fm.moveSelection("/dest");

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].fileName).toBe("fail.txt");
      expect(result.errors[0].operationType).toBe("move");
      // fail.txt reste dans la liste ET reste sélectionné
      expect(fm.getEntries()).toContain("fail.txt");
      expect(fm.isSelected("fail.txt")).toBe(true);
      // ok.txt a été déplacé avec succès
      expect(fm.getEntries()).not.toContain("ok.txt");
    });
  });

  // ---- Suppression ----

  describe("deleteSelection", () => {
    it("lance une erreur sans sélection", () => {
      const { fm, explorer } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt"]);
      fm.listEntries(DIR);

      expect(() => fm.deleteSelection()).toThrow("Aucun fichier sélectionné");
    });

    it("supprime les fichiers sélectionnés", () => {
      const { fm, explorer, manipulator } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt", "b.txt"]);
      fm.listEntries(DIR);
      fm.selectAll();

      const result = fm.deleteSelection();

      expect(manipulator.delete).toHaveBeenCalledTimes(2);
      expect(fm.getEntries()).toEqual([]);
      expect(fm.getSelectedEntries()).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it("ne retourne pas de destinationPath pour la suppression", () => {
      const { fm, explorer } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt"]);
      fm.listEntries(DIR);
      fm.select("a.txt");

      const result = fm.deleteSelection();
      expect(result.destinationPath).toBeUndefined();
    });

    it("gère les erreurs partielles lors de la suppression", () => {
      const { fm, explorer, manipulator } = buildFileManager();
      explorer.listEntries.mockReturnValue(["ok.txt", "fail.txt"]);
      fm.listEntries(DIR);
      fm.selectAll();

      manipulator.delete.mockImplementation((p: string) => {
        if (p.includes("fail.txt")) {
          throw new Error("Accès refusé");
        }
      });

      const result = fm.deleteSelection();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].fileName).toBe("fail.txt");
      expect(result.errors[0].operationType).toBe("delete");
      expect(fm.isSelected("fail.txt")).toBe(true);
      expect(fm.getEntries()).toContain("fail.txt");
      expect(fm.getEntries()).not.toContain("ok.txt");
    });
  });

  // ====== Étape 4 : TDD – Génération de nom unique avec re-tentatives ======

  describe("resolveDestination (via copySelection sans chemin)", () => {
    it("utilise le premier nom généré quand il n'existe pas", () => {
      const { fm, explorer, random } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt"]);
      explorer.exists.mockReturnValue(false);
      fm.listEntries(DIR);
      fm.select("a.txt");

      random.nextInt.mockReturnValueOnce(0).mockReturnValueOnce(0);
      const result = fm.copySelection();

      const expected = path.join(DIR, `${ADJECTIVES[0]}-${NOUNS[0]}`);
      expect(result.destinationPath).toBe(expected);
      // exists appelé une seule fois pour le premier nom
      expect(explorer.exists).toHaveBeenCalledTimes(1);
    });

    it("réessaie quand le nom existe déjà", () => {
      const { fm, explorer, random } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt"]);
      fm.listEntries(DIR);
      fm.select("a.txt");

      // 1er nom existe → retry → 2e nom n'existe pas
      explorer.exists
        .mockReturnValueOnce(true)   // 1er nom existe
        .mockReturnValueOnce(false); // 2e nom libre

      random.nextInt
        .mockReturnValueOnce(0).mockReturnValueOnce(0)   // 1er essai
        .mockReturnValueOnce(1).mockReturnValueOnce(1);  // 2e essai

      const result = fm.copySelection();

      const expected = path.join(DIR, `${ADJECTIVES[1]}-${NOUNS[1]}`);
      expect(result.destinationPath).toBe(expected);
      expect(explorer.exists).toHaveBeenCalledTimes(2);
    });

    it("numérote le nom après 10 tentatives échouées", () => {
      const { fm, explorer, random } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt"]);
      fm.listEntries(DIR);
      fm.select("a.txt");

      // Les 10 tentatives échouent → exists retourne true
      // Puis le nom numéroté "-1" n'existe pas
      let callCount = 0;
      explorer.exists.mockImplementation((p: string) => {
        callCount++;
        if (callCount <= 10) return true;
        return false; // le nom numéroté est libre
      });

      // 10 tentatives × 2 appels à nextInt chacune
      for (let i = 0; i < 20; i++) {
        random.nextInt.mockReturnValueOnce(3);
      }

      const result = fm.copySelection();

      const expected = path.join(DIR, `${ADJECTIVES[3]}-${NOUNS[3]}-1`);
      expect(result.destinationPath).toBe(expected);
    });

    it("incrémente le compteur si le nom numéroté existe aussi", () => {
      const { fm, explorer, random } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt"]);
      fm.listEntries(DIR);
      fm.select("a.txt");

      let callCount = 0;
      explorer.exists.mockImplementation(() => {
        callCount++;
        if (callCount <= 10) return true;  // 10 tentatives aléatoires échouent
        if (callCount === 11) return true;  // nom-1 existe aussi
        return false;                       // nom-2 est libre
      });

      for (let i = 0; i < 20; i++) {
        random.nextInt.mockReturnValueOnce(5);
      }

      const result = fm.copySelection();

      const expected = path.join(DIR, `${ADJECTIVES[5]}-${NOUNS[5]}-2`);
      expect(result.destinationPath).toBe(expected);
    });
  });

  // ====== Étape 4 : TDD – Gestion avancée des erreurs ======

  describe("gestion avancée des erreurs", () => {
    it("retourne toutes les erreurs quand tous les fichiers échouent", () => {
      const { fm, explorer, manipulator } = buildFileManager();
      explorer.listEntries.mockReturnValue(["a.txt", "b.txt", "c.txt"]);
      fm.listEntries(DIR);
      fm.selectAll();

      manipulator.copy.mockImplementation(() => {
        throw new Error("Erreur disque");
      });

      const result = fm.copySelection("/dest");

      expect(result.errors).toHaveLength(3);
      // Tous restent sélectionnés
      expect(fm.getSelectedEntries().sort()).toEqual(["a.txt", "b.txt", "c.txt"]);
    });

    it("les erreurs contiennent le type d'opération correct pour delete", () => {
      const { fm, explorer, manipulator } = buildFileManager();
      explorer.listEntries.mockReturnValue(["f.txt"]);
      fm.listEntries(DIR);
      fm.select("f.txt");

      manipulator.delete.mockImplementation(() => {
        throw new Error("Lecture seule");
      });

      const result = fm.deleteSelection();

      expect(result.errors[0].operationType).toBe("delete");
      expect(result.errors[0].fileName).toBe("f.txt");
      expect(result.errors[0].errorMessage).toBe("Lecture seule");
    });

    it("les erreurs contiennent le type d'opération correct pour move", () => {
      const { fm, explorer, manipulator } = buildFileManager();
      explorer.listEntries.mockReturnValue(["f.txt"]);
      fm.listEntries(DIR);
      fm.select("f.txt");

      manipulator.move.mockImplementation(() => {
        throw new Error("Destination pleine");
      });

      const result = fm.moveSelection("/dest");

      expect(result.errors[0].operationType).toBe("move");
      expect(result.errors[0].errorMessage).toBe("Destination pleine");
    });

    it("mélange succès et erreurs dans les 3 opérations", () => {
      const { fm, explorer, manipulator } = buildFileManager();
      explorer.listEntries.mockReturnValue(["ok1.txt", "fail1.txt", "ok2.txt"]);
      fm.listEntries(DIR);
      fm.selectAll();

      manipulator.delete.mockImplementation((p: string) => {
        if (p.includes("fail1")) throw new Error("Erreur");
      });

      const result = fm.deleteSelection();

      expect(result.errors).toHaveLength(1);
      expect(fm.getEntries()).toEqual(["fail1.txt"]);
      expect(fm.isSelected("fail1.txt")).toBe(true);
    });
  });

  // ====== Vérifications des dictionnaires ======

  describe("dictionnaires", () => {
    it("contient 20 adjectifs", () => {
      expect(ADJECTIVES).toHaveLength(20);
    });

    it("contient 20 noms", () => {
      expect(NOUNS).toHaveLength(20);
    });

    it("tous les mots sont des chaînes non vides", () => {
      for (const w of [...ADJECTIVES, ...NOUNS]) {
        expect(typeof w).toBe("string");
        expect(w.length).toBeGreaterThan(0);
      }
    });
  });
});
