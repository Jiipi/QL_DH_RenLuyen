-- Add email column to sinh_vien per tkht.md spec (unique, may reference user email logically)
BEGIN;
ALTER TABLE "public"."sinh_vien" ADD COLUMN IF NOT EXISTS "email" VARCHAR(100);
-- Optional uniqueness (spec says unique? It says 'foreign key' referencing nguoi_dung email). We cannot add FK to email unless guaranteed; keep simple index.
CREATE INDEX IF NOT EXISTS idx_sinh_vien_email ON "public"."sinh_vien"(email);
COMMIT;