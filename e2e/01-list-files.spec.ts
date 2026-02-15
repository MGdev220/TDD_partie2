import { test, expect } from "@playwright/test";
import * as path from "path";

/**
 * Étape 1 — Premier test ATDD : lister les fichiers d'un répertoire prédéfini.
 *
 * Répertoire déterministe : test-fixtures/
 *   ├── fichier1.txt
 *   ├── fichier2.txt
 *   └── sous-dossier/
 */

const FIXTURES_DIR = path.resolve(__dirname, "..", "test-fixtures");

test.describe("Étape 1 - Liste des fichiers", () => {
  test("GET /api/files retourne les entrées du répertoire test-fixtures", async ({
    request,
  }) => {
    const response = await request.get(`/api/files?path=${FIXTURES_DIR}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.currentDirectory).toBe(FIXTURES_DIR);
    expect(body.entries).toContain("fichier1.txt");
    expect(body.entries).toContain("fichier2.txt");
    expect(body.entries).toContain("sous-dossier");
    expect(body.selected).toEqual([]);
  });

  test("GET /api/files sans paramètre retourne 400", async ({ request }) => {
    const response = await request.get("/api/files");
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test("GET /api/files avec chemin invalide retourne 404", async ({ request }) => {
    const response = await request.get("/api/files?path=/chemin/inexistant/xyz");
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});
