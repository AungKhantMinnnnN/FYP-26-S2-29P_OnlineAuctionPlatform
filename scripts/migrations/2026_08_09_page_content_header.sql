-- Migration: Add header + contact fields to existing Privacy/Terms page content.
-- Date: 2026-08-09
--
-- The privacy/terms rows were seeded before the header/contact metadata existed.
-- This migration merges the default header/contact into each existing row's
-- `content` JSONB only where the key is missing (does not overwrite admin edits).
-- Safe to re-run (idempotent).

BEGIN;

DO $$
DECLARE
    r RECORD;
    new_content JSONB;
BEGIN
    FOR r IN SELECT slug, content::jsonb AS c FROM site_content
             WHERE slug IN ('privacy', 'terms')
    LOOP
        new_content := coalesce(r.c, '{}'::jsonb);

        IF NOT (new_content ? 'header') THEN
            new_content := jsonb_set(
                new_content,
                '{header}',
                jsonb_build_object(
                    'kicker', CASE WHEN r.slug = 'privacy' THEN 'Privacy Policy' ELSE 'Terms of Service' END,
                    'title', CASE WHEN r.slug = 'privacy' THEN 'Your Privacy Matters' ELSE 'How AuctionHub Works' END,
                    'subtitle', '',
                    'lastUpdatedLabel', 'Last updated'
                )
            );
        END IF;

        IF NOT (new_content ? 'contact') THEN
            new_content := jsonb_set(
                new_content,
                '{contact}',
                jsonb_build_object(
                    'title', 'Contact Us',
                    'text', '',
                    'email', 'support@auctionhub.sg'
                )
            );
        END IF;

        UPDATE site_content SET content = new_content, updated_at = NOW() WHERE slug = r.slug;
    END LOOP;
END $$;

COMMIT;

-- Verify
SELECT slug,
       content->'header'->>'title' AS header_title,
       content->'contact'->>'email' AS contact_email,
       jsonb_array_length(content->'sections') AS section_count
FROM site_content
WHERE slug IN ('privacy', 'terms')
ORDER BY slug;
