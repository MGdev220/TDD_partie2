import express, { Request, Response } from "express";
import { FileManager } from "./FileManager";
import {
  RealFileSystemExplorer,
  RealFileSystemManipulator,
  RealRandomProvider,
} from "./RealFileSystem";

const app = express();
app.use(express.json());

// FileManager avec les implémentations réelles
const fm = new FileManager(
  new RealFileSystemExplorer(),
  new RealFileSystemManipulator(),
  new RealRandomProvider()
);

/** Helper : construit la réponse JSON d'état courant. */
function currentState() {
  return {
    currentDirectory: fm.getCurrentDirectory(),
    entries: fm.getEntries(),
    selected: fm.getSelectedEntries(),
  };
}

// ==================== Routes API ====================

/**
 * GET /api/files?path=<directory>
 * Liste les entrées d'un répertoire.
 */
app.get("/api/files", (req: Request, res: Response) => {
  const dirPath = req.query.path as string;
  if (!dirPath) {
    return res.status(400).json({ error: "Le paramètre 'path' est requis." });
  }
  try {
    const entries = fm.listEntries(dirPath);
    return res.json(currentState());
  } catch (e: any) {
    return res.status(404).json({ error: e.message });
  }
});

/**
 * GET /api/files/current
 * Retourne l'état courant (entrées + sélection).
 */
app.get("/api/files/current", (_req: Request, res: Response) => {
  return res.json(currentState());
});

/**
 * POST /api/files/select   { "name": "fichier.txt" }
 */
app.post("/api/files/select", (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Le champ 'name' est requis." });
  }
  try {
    fm.select(name);
    return res.json({ selected: fm.getSelectedEntries() });
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/files/deselect  { "name": "fichier.txt" }
 */
app.post("/api/files/deselect", (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Le champ 'name' est requis." });
  }
  fm.deselect(name);
  return res.json({ selected: fm.getSelectedEntries() });
});

/** POST /api/files/select-all */
app.post("/api/files/select-all", (_req: Request, res: Response) => {
  fm.selectAll();
  return res.json({ selected: fm.getSelectedEntries() });
});

/** POST /api/files/deselect-all */
app.post("/api/files/deselect-all", (_req: Request, res: Response) => {
  fm.deselectAll();
  return res.json({ selected: fm.getSelectedEntries() });
});

/**
 * POST /api/files/copy   { "destination"?: "chemin" }
 */
app.post("/api/files/copy", (req: Request, res: Response) => {
  try {
    const result = fm.copySelection(req.body?.destination);
    return res.json({
      destinationPath: result.destinationPath,
      errors: result.errors,
      ...currentState(),
    });
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

/**
 * POST /api/files/move   { "destination"?: "chemin" }
 */
app.post("/api/files/move", (req: Request, res: Response) => {
  try {
    const result = fm.moveSelection(req.body?.destination);
    return res.json({
      destinationPath: result.destinationPath,
      errors: result.errors,
      ...currentState(),
    });
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

/** POST /api/files/delete */
app.post("/api/files/delete", (_req: Request, res: Response) => {
  try {
    const result = fm.deleteSelection();
    return res.json({
      errors: result.errors,
      ...currentState(),
    });
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }
});

// ==================== Démarrage ====================

export { app };

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
  });
}
