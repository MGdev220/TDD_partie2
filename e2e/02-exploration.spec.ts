import { test, expect } from "@playwright/test";
import * as path from "path";

/**
 * Étape 2 — ATDD : Exploration de répertoire et sélection de fichiers.
 */

const FIXTURES_DIR = path.resolve(__dirname, "..", "test-fixtures");

test.describe("Étape 2 - Exploration et sélection", () => {
  // Charger le répertoire de fixtures avant chaque test
  test.beforeEach(async ({ request }) => {
    await request.get(`/api/files?path=${FIXTURES_DIR}`);
  });

  // ---------- Sélection individuelle ----------

  test("POST /api/files/select sélectionne un fichier", async ({ request }) => {
    const res = await request.post("/api/files/select", {
      data: { name: "fichier1.txt" },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.selected).toContain("fichier1.txt");
  });

  test("POST /api/files/select sur fichier inexistant retourne 400", async ({
    request,
  }) => {
    const res = await request.post("/api/files/select", {
      data: { name: "nope.txt" },
    });
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  test("POST /api/files/select sans body retourne 400", async ({ request }) => {
    const res = await request.post("/api/files/select", { data: {} });
    expect(res.status()).toBe(400);
  });

  // ---------- Désélection ----------

  test("POST /api/files/deselect désélectionne un fichier", async ({
    request,
  }) => {
    await request.post("/api/files/select", { data: { name: "fichier1.txt" } });

    const res = await request.post("/api/files/deselect", {
      data: { name: "fichier1.txt" },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.selected).not.toContain("fichier1.txt");
  });

  // ---------- Tout sélectionner / désélectionner ----------

  test("POST /api/files/select-all sélectionne tout", async ({ request }) => {
    const res = await request.post("/api/files/select-all");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.selected).toContain("fichier1.txt");
    expect(body.selected).toContain("fichier2.txt");
    expect(body.selected).toContain("sous-dossier");
  });

  test("POST /api/files/deselect-all désélectionne tout", async ({
    request,
  }) => {
    await request.post("/api/files/select-all");

    const res = await request.post("/api/files/deselect-all");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.selected).toEqual([]);
  });

  // ---------- État courant ----------

  test("GET /api/files/current reflète la sélection", async ({ request }) => {
    await request.post("/api/files/select", { data: { name: "fichier2.txt" } });

    const res = await request.get("/api/files/current");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.currentDirectory).toBe(FIXTURES_DIR);
    expect(body.entries).toContain("fichier1.txt");
    expect(body.selected).toContain("fichier2.txt");
  });

  // ---------- Navigation dans un sous-dossier ----------

  test("Naviguer dans un sous-dossier réinitialise la sélection", async ({
    request,
  }) => {
    await request.post("/api/files/select", { data: { name: "fichier1.txt" } });

    const subDir = path.join(FIXTURES_DIR, "sous-dossier");
    const res = await request.get(`/api/files?path=${subDir}`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.currentDirectory).toBe(subDir);
    expect(body.entries).toContain("nested.txt");
    expect(body.selected).toEqual([]);
  });
});
