import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { syncCatalogFromIGDB } from "@/lib/sync-catalog";

/**
 * Integration check for the incremental sweep. No network: the IGDB request
 * cache table is pre-seeded, so `fetchGamesByStatus` reads its page straight
 * out of Postgres. RAWG is unconfigured, so `fetchRawg` short-circuits.
 */

const STATUS_KEY = "game_statuses:all";
const PAGE_KEY = "games:status:5,8:o0:l250:enriched2";

type FakeGame = {
  id: number;
  name: string;
  slug: string;
  updated_at: number;
  status: number;
  platforms: Array<{ id: number; name: string; slug: string }>;
  genres: Array<{ id: number; name: string; slug: string }>;
};

function fakeGame(id: number, updatedAt: number, platformSlugs: string[]): FakeGame {
  return {
    id,
    name: `Test Game ${id}`,
    slug: `test-game-${id}`,
    updated_at: updatedAt,
    status: 8,
    // IGDB platform ids are stable per platform, not per game.
    platforms: platformSlugs.map((slug) => ({
      id: slug === "win" ? 6 : 48,
      name: slug === "win" ? "PC (Microsoft Windows)" : "PlayStation 4",
      slug,
    })),
    genres: [{ id: 5, name: "Shooter", slug: "shooter" }],
  };
}

async function seedPage(games: FakeGame[]) {
  const future = new Date(Date.now() + 60 * 60 * 1000);
  for (const [cacheKey, response] of [
    [STATUS_KEY, JSON.stringify([{ id: 8, description: "Delisted" }])],
    [PAGE_KEY, JSON.stringify(games)],
  ] as const) {
    await prisma.igdbRequest.upsert({
      where: { cacheKey },
      create: { cacheKey, endpoint: "games", query: "seeded", response, expiresAt: future },
      update: { response, expiresAt: future, fetchedAt: new Date() },
    });
  }
}

/** Counts every Prisma operation the sweep issues, via middleware. */
let opCount = 0;
let counting = false;

async function countQueries<T>(fn: () => Promise<T>): Promise<{ result: T; queries: number }> {
  opCount = 0;
  counting = true;
  try {
    return { result: await fn(), queries: opCount };
  } finally {
    counting = false;
  }
}

describe("syncCatalogFromIGDB", () => {
  beforeAll(async () => {
    await prisma.$connect();
    prisma.$use(async (params, next) => {
      if (counting) opCount += 1;
      return next(params);
    });
  });

  beforeEach(async () => {
    await prisma.gamePlatform.deleteMany({});
    await prisma.gameGenre.deleteMany({});
    await prisma.game.deleteMany({});
    await prisma.platform.deleteMany({});
    await prisma.genre.deleteMany({});
    await prisma.igdbRequest.deleteMany({});
  });

  it("creates records on the first sweep and skips unchanged ones after", async () => {
    const games = [
      fakeGame(1, 1_700_000_000, ["win"]),
      fakeGame(2, 1_700_000_100, ["ps4"]),
      fakeGame(3, 1_700_000_200, ["win", "ps4"]),
    ];
    await seedPage(games);

    const first = await syncCatalogFromIGDB();
    expect(first.errors).toEqual([]);
    expect(first.gamesSeen).toBe(3);
    expect(first.gamesCreated).toBe(3);
    expect(first.gamesSkipped).toBe(0);
    expect(first.linkRowsWritten).toBe(4 + 3); // platforms + genres

    expect(await prisma.game.count()).toBe(3);
    expect(await prisma.gamePlatform.count()).toBe(4);
    expect(await prisma.gameGenre.count()).toBe(3);
    expect(await prisma.platform.count()).toBe(2);

    // Second sweep: IGDB says nothing changed.
    const { result: second, queries } = await countQueries(() => syncCatalogFromIGDB());
    expect(second.gamesSkipped).toBe(3);
    expect(second.gamesUpserted).toBe(0);
    expect(second.dbWrites).toBe(0);
    expect(second.linkRowsWritten).toBe(0);
    // Whole no-op sweep: cache lookups + dictionaries + one page read.
    expect(queries).toBeLessThan(12);
  });

  it("rewrites only the records IGDB actually touched", async () => {
    const games = [
      fakeGame(1, 1_700_000_000, ["win"]),
      fakeGame(2, 1_700_000_100, ["ps4"]),
      fakeGame(3, 1_700_000_200, ["win"]),
    ];
    await seedPage(games);
    await syncCatalogFromIGDB();

    // Game 2 gets a newer IGDB timestamp, a new name and an extra platform.
    games[1].updated_at = 1_800_000_000;
    games[1].name = "Test Game 2 (Remastered)";
    games[1].platforms.push({ id: 6, name: "PC (Microsoft Windows)", slug: "win" });
    await seedPage(games);

    const run = await syncCatalogFromIGDB();
    expect(run.errors).toEqual([]);
    expect(run.gamesSkipped).toBe(2);
    expect(run.gamesUpserted).toBe(1);
    expect(run.gamesCreated).toBe(0);
    expect(run.linkRowsWritten).toBe(2); // only game 2's platform set was rewritten

    const updated = await prisma.game.findUnique({
      where: { igdbId: 2 },
      include: { platforms: true },
    });
    expect(updated?.name).toBe("Test Game 2 (Remastered)");
    expect(updated?.platforms).toHaveLength(2);
    expect(updated?.igdbUpdatedAt?.getTime()).toBe(1_800_000_000 * 1000);

    // Untouched records keep their original join rows.
    expect(await prisma.gamePlatform.count()).toBe(4);
  });

  it("force rewrites everything without touching identical join rows", async () => {
    await seedPage([fakeGame(1, 1_700_000_000, ["win"]), fakeGame(2, 1_700_000_100, ["ps4"])]);
    await syncCatalogFromIGDB();

    const run = await syncCatalogFromIGDB({ force: true });
    expect(run.gamesSkipped).toBe(0);
    expect(run.gamesUpserted).toBe(2);
    expect(run.linkRowsWritten).toBe(0); // sets unchanged → no join writes
    expect(await prisma.gamePlatform.count()).toBe(2);
  });

  it("survives a bad record without losing the rest of the chunk", async () => {
    const games = [fakeGame(1, 1_700_000_000, ["win"]), fakeGame(2, 1_700_000_100, ["ps4"])];
    // Two IGDB rows claiming the same slug → the second create violates the
    // unique constraint; the first must still land.
    games[1].slug = games[0].slug;
    await seedPage(games);

    const run = await syncCatalogFromIGDB();
    expect(run.gamesCreated).toBe(1);
    expect(run.errors).toHaveLength(1);
    expect(await prisma.game.count()).toBe(1);
  });
});
