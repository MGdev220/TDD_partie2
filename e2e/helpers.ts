import * as path from "path";

/**
 * Helpers partagés pour les tests e2e.
 */

/** Chemin absolu vers le répertoire de fixtures déterministes. */
export const FIXTURES_DIR = path.resolve(__dirname, "..", "test-fixtures");

/** Charge un répertoire via l'API et retourne le body JSON. */
export async function loadDirectory(
  request: any,
  dirPath: string
): Promise<any> {
  const res = await request.get(`/api/files?path=${dirPath}`);
  return res.json();
}

/** Sélectionne un fichier via l'API. */
export async function selectFile(
  request: any,
  name: string
): Promise<any> {
  const res = await request.post("/api/files/select", {
    data: { name },
  });
  return res.json();
}
