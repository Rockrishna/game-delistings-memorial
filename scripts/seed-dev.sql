-- Dev-only seed for the local Docker stack. Populates ~60 synthetic catalogue
-- records so the UI surfaces have data without an IGDB sync.
-- Run: docker exec -i game-delistings-tracker-postgres-1 psql -U postgres -d game_delistings < scripts/seed-dev.sql

INSERT INTO "Platform" (id, slug, name, abbreviation, "createdAt", "updatedAt") VALUES
  ('pf_steam', 'win', 'PC (Microsoft Windows)', 'PC', now(), now()),
  ('pf_ps', 'ps4', 'PlayStation 4', 'PS4', now(), now()),
  ('pf_xbox', 'xboxone', 'Xbox One', 'XB1', now(), now()),
  ('pf_switch', 'switch', 'Nintendo Switch', 'NSW', now(), now()),
  ('pf_ios', 'ios', 'iOS', 'iOS', now(), now())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "Genre" (id, slug, name, "createdAt", "updatedAt") VALUES
  ('gn_action', 'action', 'Action', now(), now()),
  ('gn_adv', 'adventure', 'Adventure', now(), now()),
  ('gn_rpg', 'rpg', 'Role-playing (RPG)', now(), now()),
  ('gn_shoot', 'shooter', 'Shooter', now(), now()),
  ('gn_puzzle', 'puzzle', 'Puzzle', now(), now()),
  ('gn_racing', 'racing', 'Racing', now(), now())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "Game" (id, "igdbId", slug, name, "callNumber", summary, "releaseYear", decade,
                    rating, publisher, developer, "gameModes", themes, "playerPerspectives",
                    franchise, "statusLabel", nsfw, "createdAt", "updatedAt")
SELECT
  'seed' || lpad(n::text, 4, '0'),
  90000 + n,
  'seed-game-' || n,
  'Seed Game ' || n,
  'DG.' || (9000 + n) || '.' || (n % 10),
  'A synthetic record used for local development. Entry number ' || n || ' of the dev seed.',
  1990 + (n % 35),
  (1990 + (n % 35)) / 10 * 10 || 's',
  CASE WHEN n % 7 = 0 THEN NULL ELSE 40 + (n * 13 % 60) END,
  (ARRAY['Konami','Capcom','SEGA','Ubisoft','Activision','EA'])[(n % 6) + 1],
  (ARRAY['Studio Alpha','Studio Beta','Studio Gamma','Studio Delta'])[(n % 4) + 1],
  '["Single player"' || CASE WHEN n % 3 = 0 THEN ',"Multiplayer"' ELSE '' END || ']',
  '["' || (ARRAY['Horror','Fantasy','Science fiction','Comedy'])[(n % 4) + 1] || '"]',
  '["' || (ARRAY['First person','Third person','Bird view / Isometric'])[(n % 3) + 1] || '"]',
  CASE WHEN n % 9 = 0 THEN 'Seed Saga' ELSE NULL END,
  CASE WHEN n % 2 = 0 THEN 'delisted' ELSE 'offline' END,
  n % 17 = 0,
  now(), now()
FROM generate_series(1, 60) AS n
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "GamePlatform" ("gameId", "platformId")
SELECT 'seed' || lpad(n::text, 4, '0'),
       (ARRAY['pf_steam','pf_ps','pf_xbox','pf_switch','pf_ios'])[(n % 5) + 1]
FROM generate_series(1, 60) AS n
ON CONFLICT DO NOTHING;

INSERT INTO "GamePlatform" ("gameId", "platformId")
SELECT 'seed' || lpad(n::text, 4, '0'), 'pf_steam'
FROM generate_series(1, 60) AS n WHERE n % 3 = 0
ON CONFLICT DO NOTHING;

INSERT INTO "GameGenre" ("gameId", "genreId")
SELECT 'seed' || lpad(n::text, 4, '0'),
       (ARRAY['gn_action','gn_adv','gn_rpg','gn_shoot','gn_puzzle','gn_racing'])[(n % 6) + 1]
FROM generate_series(1, 60) AS n
ON CONFLICT DO NOTHING;
