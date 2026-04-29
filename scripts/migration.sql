-- ─── Cria a tabela exercises do zero ──────────────────────
CREATE TABLE IF NOT EXISTS exercises (
  id                BIGSERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  target_muscle     TEXT,
  secondary_muscles TEXT,
  equipment         TEXT,
  level             TEXT,
  force_type        TEXT,
  mechanic          TEXT,
  category          TEXT,
  gif_url           TEXT,
  image_url_2       TEXT,
  instructions      JSONB
);

-- Permite leitura pública (app usa a anon key)
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercises_read_public" ON exercises;
CREATE POLICY "exercises_read_public"
  ON exercises FOR SELECT
  USING (true);
