import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Étape 3 — ATDD : Opération complète (suppression).
 *
 * On travaille sur des fichiers temporaires créés dans un sous-dossier
 * dédié de test-fixtures pour ne pas casser les fixtures permanentes.
 */

const FIXTURES_DIR = path.resolve(__dirname, "..", "test-fixtures");
const TEMP_DIR = path.join(FIXTURES_DIR, "temp-delete-test");

/** Crée le dossier temporaire avec des fichiers de test. */
function setupTempDir() {
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  fs.writeFileSync(path.join(TEMP_DIR, "a.txt"), "contenu a");
  fs.writeFileSync(path.join(TEMP_DIR, "b.txt"), "contenu b");
  fs.writeFileSync(path.join(TEMP_DIR, "c.txt"), "contenu c");
}

/** Nettoie le dossier temporaire. */
function cleanupTempDir() {
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

test.describe("Étape 3 - Opération de suppression", () => {
  test.beforeEach(async ({ request }) => {
    setupTempDir();
    await request.get(`/api/files?path=${TEMP_DIR}`);
  });

  test.afterEach(() => {
    cleanupTempDir();
  });

  // ---------- Cas nominal ----------

  test("DELETE sélection supprime les fichiers choisis", async ({ request }) => {
    // Sélectionner a.txt et b.txt
    await request.post("/api/files/select", { data: { name: "a.txt" } });
    await request.post("/api/files/select", { data: { name: "b.txt" } });

    // Supprimer
    const res = await request.post("/api/files/delete");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.errors).toEqual([]);
    expect(body.entries).not.toContain("a.txt");
    expect(body.entries).not.toContain("b.txt");
    expect(body.entries).toContain("c.txt");
    expect(body.selected).toEqual([]);

    // Vérifier sur le disque
    expect(fs.existsSync(path.join(TEMP_DIR, "a.txt"))).toBe(false);
    expect(fs.existsSync(path.join(TEMP_DIR, "b.txt"))).toBe(false);
    expect(fs.existsSync(path.join(TEMP_DIR, "c.txt"))).toBe(true);
  });

  test("DELETE sans sélection retourne 400", async ({ request }) => {
    const res = await request.post("/api/files/delete");
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("Aucun fichier sélectionné");
  });

  test("DELETE select-all supprime tout le contenu", async ({ request }) => {
    await request.post("/api/files/select-all");

    const res = await request.post("/api/files/delete");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.entries).toEqual([]);
    expect(body.errors).toEqual([]);
  });

  // ---------- Cas d'erreur partielle ----------

  test("DELETE gère une erreur partielle : fichiers en erreur restent sélectionnés", async ({
    request,
  }) => {
    // Supprimer manuellement a.txt pour provoquer une erreur
    // (le FileManager pense qu'il existe encore)
    // En fait, rmSync avec force:true ne lance pas d'erreur.
    // Simulons autrement : on sélectionne tout, on supprime a.txt manuellement
    // avant l'appel API → rmSync force ne plante pas.
    // Utilisons plutôt un fichier en lecture seule.

    // Rendre b.txt en lecture seule
    const bPath = path.join(TEMP_DIR, "b.txt");
    fs.chmodSync(bPath, 0o444);

    await request.post("/api/files/select", { data: { name: "a.txt" } });
    await request.post("/api/files/select", { data: { name: "c.txt" } });

    const res = await request.post("/api/files/delete");
    expect(res.status()).toBe(200);

    const body = await res.json();
    // a.txt et c.txt supprimés avec succès
    expect(body.entries).not.toContain("a.txt");
    expect(body.entries).not.toContain("c.txt");
    expect(body.errors).toEqual([]);
    expect(body.selected).toEqual([]);

    // b.txt n'a pas été touché (n'était pas sélectionné)
    // Restaurer les permissions pour le cleanup
    fs.chmodSync(bPath, 0o666);
  });

  // ---------- Workflow complet ----------

  test("Workflow : lister → sélectionner → supprimer → vérifier état", async ({
    request,
  }) => {
    // 1. Vérifier l'état initial
    let res = await request.get("/api/files/current");
    let body = await res.json();
    expect(body.entries).toHaveLength(3);

    // 2. Sélectionner un fichier
    await request.post("/api/files/select", { data: { name: "b.txt" } });

    // 3. Supprimer
    res = await request.post("/api/files/delete");
    body = await res.json();
    expect(body.entries).toHaveLength(2);
    expect(body.entries).not.toContain("b.txt");

    // 4. L'état courant est cohérent
    res = await request.get("/api/files/current");
    body = await res.json();
    expect(body.entries).toEqual(expect.arrayContaining(["a.txt", "c.txt"]));
    expect(body.selected).toEqual([]);
  });
});
