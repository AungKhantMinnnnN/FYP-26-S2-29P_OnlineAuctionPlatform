# Admin CMS (Puck) — Implementation Plan

Greenfield against one existing table. Key finding from codebase review: the
`site_content` table already exists, but there is **zero** backend or frontend
code, and Puck is **not** installed.

## Current state
| Layer | What exists | What's missing |
|---|---|---|
| DB | `site_content(id, slug UNIQUE, content JSONB, updated_by, updated_at)` in `docker/postgres/init.sql:195` | — |
| Backend | Nothing | `SiteContent` model, schema, service, controller |
| Frontend | `LandingPage.tsx` (hardcoded React + live queries), admin routes guarded by `<ProtectedRoute roles={['admin']} />`, `/admin/:section` pattern | Puck dep, editor page, public renderer, shared config |

## Architecture & data flow
```
Admin editor (/admin/cms)                Public visitor (/)
   Puck <Editor> ──save JSON──► PUT /v1.0.0/cms/{slug}   GET /v1.0.0/cms/{slug} ──► Puck <Render>
        │                          (admin only)             (public)          │
        └──────────── shared puckConfig.tsx ─────────────────────────────────┘
                     (component definitions — the keystone)
```
The **one file both sides import** is `puckConfig.tsx`. The editor uses it to
render the drag-drop palette; the public page uses it to render the saved JSON.
They must never diverge — that's the whole point of Puck.

## The keystone: shared Puck config
`frontend/src/cms/puckConfig.tsx` — defines each editable block as a Puck
component: `render` fn + `fields` (the editable props). Start with a small, real
set that maps to the current landing page:

- `Hero` — heading, subheading, CTA label/link, plus a **custom video field** (upload/replace the marketing video from inside the editor — see below)
- `FeatureGrid` — array of {icon, title, text}
- `RichText` / `Banner`
- `TrendingAuctions` — **dynamic**: no editable data props, its `render` runs the existing `useQuery(getAuctions)`. This is how live data survives inside static JSON (see below).
- `TestimonialWall` — dynamic, wraps `getPublicFeedback`

## Content JSON shape & persistence
Puck serialises the whole page to a single `Data` object with a fixed shape:
`root` (props for the page shell), `content` (ordered array of block instances,
each `{type, props}` where `props.id` is a Puck-generated unique key), and
`zones` (nested drop-zones; `{}` when unused). The backend stores this object
**verbatim** in `site_content.content` — no reshaping, no per-field columns.
Puck owns the schema; the API is a dumb pipe.

Example row content for slug `landing`:
```json
{
  "root": { "props": { "title": "AuctionHub" } },
  "content": [
    {
      "type": "Hero",
      "props": {
        "id": "Hero-8a1f",
        "heading": "Bid. Win. Collect.",
        "subheading": "Transparent C2C auctions.",
        "ctaLabel": "Browse",
        "ctaLink": "/browse",
        "videoEnabled": true
      }
    },
    {
      "type": "FeatureGrid",
      "props": {
        "id": "FeatureGrid-2c7d",
        "features": [
          { "icon": "Shield", "title": "Escrow", "text": "Funds held safely." },
          { "icon": "Zap", "title": "Anti-snipe", "text": "Fair endings." }
        ]
      }
    },
    { "type": "TrendingAuctions", "props": { "id": "TrendingAuctions-4e2a" } }
  ],
  "zones": {}
}
```
Notes tying this to our design:
- **Dynamic blocks** (`TrendingAuctions`, `TestimonialWall`) store only `type` + `id` — no data props. Their live content is fetched at render time via React Query, never persisted here.
- **Marketing video** is not in the JSON — only `videoEnabled` (a bool). The bytes stay in MinIO; the Hero fetches the presigned URL at render.
- `props.id` is assigned by Puck, stable across edits — leave it alone.

### Save / load flow
This same `Data` object is what moves through every endpoint. It lives in two
columns — `content` (published) and `draft_content` (WIP) — and is snapshotted
into `site_content_versions.content` on publish. Full endpoint set and the
draft→publish→version transitions are in **"Versioning, draft-vs-published &
rollback"** below; the persistence mechanics are:
- **Persist:** SQLAlchemy binds the Python dict straight to the `JSONB` column — no `json.dumps`. Publish is one commit: `content = draft`, INSERT version snapshot, `draft_content = NULL`.
- **Empty/missing slug:** public `get_published` returns a default `{"root":{"props":{}},"content":[],"zones":{}}` so a fresh DB renders the hardcoded fallback instead of erroring.

Validation at the boundary: accept any JSON object, reject only if it exceeds a
size cap (~256 KB) or isn't a JSON object. Don't validate block shapes server-side
— the shared `puckConfig` is the single source of truth, and Puck ignores unknown
props gracefully.

## Versioning, draft-vs-published & rollback
Admins get: a **working draft** separate from what's live, an **append-only
history** of every publish, and one-click **rollback** to any past version.

### Data model
Keep the public read path a single-row lookup by slug — don't make visitors join
history. So `site_content` stays the "current state" row and gains a draft column;
a new table holds the publish history.

`site_content` (extend the existing table):
| column | purpose |
|---|---|
| `content JSONB` | **published** JSON — what the public GET returns (unchanged) |
| `draft_content JSONB NULL` | admin's work-in-progress; never public. NULL = no unpublished edits |
| `updated_by`, `updated_at` | last publish actor/time (unchanged) |

`site_content_versions` (new, append-only snapshot per publish):
```sql
CREATE TABLE site_content_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) NOT NULL,            -- which page (matches site_content.slug)
    content JSONB NOT NULL,                -- full snapshot as published
    note VARCHAR(200),                     -- e.g. "publish", "rollback to 2026-07-10"
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_site_content_versions_slug ON site_content_versions (slug, created_at DESC);
```
Manual SQL in `docker/postgres/init.sql` (no Alembic, per project). Only `backend/`
touches these — not duplicated into the other services.

### State model
- **Published** = `site_content.content`. The only thing the public ever sees.
- **Draft** = `site_content.draft_content`. Exists only while an admin has unpublished edits; `NULL` means draft == published.
- **History** = rows in `site_content_versions`, one per publish (and per rollback). Never mutated, only inserted.

### Flows
- **Editor loads:** `draft_content` if non-NULL (resume WIP), else `content` (start from live).
- **Save draft** — `PUT /cms/{slug}/draft` (admin): set `draft_content`. No public effect, no version row.
- **Publish** — `POST /cms/{slug}/publish` (admin): `content = draft_content` (or body), INSERT a `site_content_versions` snapshot (`note="publish"`), set `draft_content = NULL`, bump `updated_by/at`. All in one commit.
- **List history** — `GET /cms/{slug}/versions` (admin): `id, note, created_by, created_at` (no content — keep it light).
- **Preview a version** — `GET /cms/versions/{version_id}` (admin): full `content` to render in the editor preview.
- **Rollback** — `POST /cms/{slug}/rollback/{version_id}` (admin): copy that version's `content` into `site_content.content` **and** INSERT a new version row (`note="rollback to {created_at}"`). Rollback is itself recorded, so history stays append-only and auditable — never destructive.

`ponytail: rollback copies-forward + records a new version rather than deleting rows — history is a ledger, not a stack. Simpler and auditable.`

### Retention
History is unbounded in principle. FYP scale, JSONB payloads are small — leave it.
`ponytail: prune to last ~50 per slug on publish only if the table ever gets big.`

## Backend work (mirror the testimonials pattern exactly)
1. **Models** — add `SiteContent` (with `draft_content`) and `SiteContentVersion` to `backend/app/models/auction.py` (mirror `Testimonial`). Per the shared-DB invariant, models are duplicated across 3 services — **skip that here**: only `backend/` touches these tables. `ponytail: duplicate only when a second service reads it.`
2. **Schema** — `backend/app/schemas/cms.py`: `SiteContentUpdate {content: dict}` (draft + publish bodies), `SiteContentResponse {slug, content, updated_at}`, `VersionSummary {id, note, created_by, created_at}`, `VersionDetail {id, content, created_at}`.
3. **Service** — `backend/app/services/cms_service.py`:
   - `get_published(slug)` — public read of `content`; returns default empty `Data` if row absent (never 500).
   - `get_draft(slug)` — admin: `draft_content` if set, else `content`.
   - `save_draft(slug, content, admin_id)` — upsert row, set `draft_content`.
   - `publish(slug, content, admin_id)` — set `content`, INSERT version snapshot, clear `draft_content` — single commit.
   - `list_versions(slug)` / `get_version(version_id)` — history read.
   - `rollback(slug, version_id, admin_id)` — copy version content → `content`, INSERT a new "rollback" version — single commit.
4. **Controller** — `backend/app/api/v1/controller/cms.py`:
   - `GET /{slug}` — public, no guard (published only)
   - `GET /{slug}/draft` · `PUT /{slug}/draft` · `POST /{slug}/publish` — `get_admin_user`
   - `GET /{slug}/versions` · `GET /versions/{version_id}` · `POST /{slug}/rollback/{version_id}` — `get_admin_user`
5. **Router** — register in `backend/app/api/router.py` with `prefix="/cms"`.

Content validation: store the JSON as-is (Puck owns the shape). Only guard size
(reject > a few hundred KB) or non-object — the one real trust-boundary check,
applied on both draft-save and publish.

## Frontend work
1. **Dependency** — `npm i @measured/puck` (the one justified new dep; it *is* the CMS). Import its CSS once.
2. **Editor page** — `frontend/src/pages/AdminCmsPage.tsx`: loads the **draft** (`GET /cms/{slug}/draft`) into `<Puck config={puckConfig} data={draft}>`. Puck's built-in **Publish** button → `POST /cms/{slug}/publish`; add a **Save draft** action (Puck header override) → `PUT /cms/{slug}/draft`. Wire into admin routing — a `cms` case in `/admin/:section` or a dedicated `/admin/cms` route under the `roles={['admin']}` block in `App.tsx:84`.
3. **Live preview** — Puck's canvas is WYSIWYG for free; add a **Preview** button that renders the current unsaved `data` through `<Render>` inside `PublicLayout` (modal or `/admin/cms/preview`). No API, no save. See "Live preview" section.
4. **Version history panel** — a side panel/modal in the editor: `GET /cms/{slug}/versions` lists snapshots; each row has **Preview** (`GET /cms/versions/{id}` → render read-only in Puck) and **Restore** (`POST /cms/{slug}/rollback/{id}`, then reload). Small, admin-only.
5. **Public renderer** — `frontend/src/cms/CmsPage.tsx`: `GET /cms/{slug}` (published) → `<Render config={puckConfig} data={data} />`. Empty content → hardcoded default fallback so a fresh DB still shows a page.
6. **Swap the landing route** — `App.tsx:48` `/` → `<CmsPage slug="landing" />`. Keep old `LandingPage.tsx` as the fallback content source until parity, then delete.
7. **API client** — `cmsApi.ts`: `getPublished`, `getDraft`, `saveDraft`, `publish`, `listVersions`, `getVersion`, `rollback`. Axios interceptor supplies the admin token.

## Marketing video (edited from inside the CMS)
The hero marketing video already has endpoints — `GET /v1.0.0/marketing-video`
(public presigned URL) and `POST /v1.0.0/marketing-video` (admin upload to MinIO)
in `backend/app/api/v1/controller/marketing.py`. **No backend change.** The video
is a MinIO binary served by presigned URL — it must **not** be stored in the Puck
content JSON (the JSON only holds a small "show video" toggle / poster URL).

Integration is a **custom Puck field** on the `Hero` block (`type: "custom"` with
a render fn):
- Shows the current video via `GET /marketing-video`.
- An "Upload / Replace video" button that POSTs the file to `POST /marketing-video`
  (the existing admin endpoint; the axios interceptor supplies the admin token).
- On the public page, the `Hero` `render()` fetches the same `GET /marketing-video`
  presigned URL and plays it.

Result: the admin edits copy and swaps the hero video in one Puck editor, no
separate admin page. The video bytes live in MinIO, exactly as today.

`ponytail: reuse the existing marketing-video endpoints — a custom field wraps them, no new upload plumbing.`

## Live preview (before publish or draft-save)
Two layers, both client-side — **no backend, no persistence**. Preview shows the
current in-memory editor state, which is exactly the point: see it before it's
saved anywhere.

1. **In-editor WYSIWYG (free):** Puck's `<Puck>` center canvas already renders
   every block through the *same* `puckConfig.render` functions the public page
   uses, updating live as you drag/edit. This is native — nothing to build. Puck
   also ships viewport-width toggles (desktop/tablet/mobile) out of the box.
2. **"Preview as published" (small):** a **Preview** button that renders the
   current unsaved Puck `data` through the real public path — `<Render config={puckConfig} data={data} />` wrapped in `PublicLayout` (nav/footer/theme) — so the admin sees the true visitor view with site chrome, not editor chrome. Keep `data` current via Puck's `onChange`. Open it in a modal or a `/admin/cms/preview` route holding the data in memory (or `sessionStorage` to survive a new tab). Closing returns to the editor with edits intact.

Because both use the shared `puckConfig`, preview is byte-accurate to what
publish will produce — same render path, dynamic blocks (`TrendingAuctions`)
fetch live data in preview too.

`ponytail: preview is the public <Render> fed from editor state — reuse, don't build a second renderer. No API, no draft row.`

## Handling the live-data problem (the only real design risk)
The current landing page pulls auctions/testimonials at runtime; Puck stores
static JSON. Don't try to snapshot data into JSON. Instead: dynamic sections
become **Puck components with no data fields** whose `render()` calls the
existing React Query hooks. Admin can place/reorder them but not edit their
contents. Marketing copy (hero, features, CTAs) is fully editable. One render
path, live data preserved.

## Seeding
Add a `landing` row to `docker/postgres/init.sql` seed (or `scripts/seed_data.py`)
with the default Puck JSON, so a fresh `docker-compose up` shows the designed
page, not a blank one.

## Phasing (ship incrementally)
- **P1 — Backend CRUD + versioning:** models (`SiteContent` + `SiteContentVersion`), `draft_content` column + versions table SQL, schema, service, controller (public GET + draft/publish/versions/rollback), router. Test with curl. *Nothing visual yet, fully independent.*
- **P2 — Public renderer:** puckConfig with 2–3 static blocks + `CmsPage` + swap `/`. Landing renders from DB.
- **P3 — Admin editor (draft + publish + preview):** `AdminCmsPage` loads draft, Save-draft + Publish wired, live preview (native canvas + "preview as published" button). Full round-trip against the versioned backend.
- **P4 — Dynamic blocks:** `TrendingAuctions`/`TestimonialWall` Puck components; reach parity; delete old `LandingPage.tsx`.
- **P5 — Version history & rollback:** history panel + preview + restore. Backend version/rollback endpoints land in P1 alongside the rest; this phase is the UI.

## Deliberately NOT building (YAGNI — say the word if you want any)
- **Multi-page CMS / navbar editing** — one `landing` slug now; see "Scope boundaries" for how other pages and the navbar are handled.
- **Custom Puck field types / media library** — reuse the existing MinIO marketing-video upload; images via URL field.
- **Duplicating `SiteContent` into the other two services.**

## Scope boundaries (navbar & other pages)
Decided scope for what the CMS controls, and what it deliberately does not.

### Navbar — NOT Puck-editable
The navbar lives in `PublicLayout`/`DashboardLayout` and is a **functional,
auth-wired component** (login/logout state, role-based admin links, route
targets) — not static marketing content. Exposing it to drag-drop lets an admin
hide "Login" or break a route and lock users out: high blast radius, near-zero
marketing value. "Hide / reorder nav items" is explicitly out.

If limited control is wanted, do the narrow thing instead of Puck-ifying it: a
few flat fields on the CMS content (`brandName`, `promoLink`, `showPromoBanner`)
that the existing navbar component reads. ~10 lines, no drag-drop, cannot break
navigation. Not in P1–P4 — add only on request.

### Other pages' static content — supported, built page-by-page (on demand)
The `slug` column already makes this free architecturally: `about`, `faq`,
`terms` are each just another `site_content` row + `<CmsPage slug="...">`. But
each CMS-editable page costs its own `puckConfig` block set (plus any live-data
conversion, the P4 problem per page), so **don't build editors for pages that
don't exist yet**.

- **Now:** landing only (P1–P4).
- **On demand:** when a real static page needs editing, add its slug. Truly
  static pages (terms, faq) are *cheaper* than landing — no dynamic blocks to
  convert.

`ponytail: multi-page is a cheap documented extension, not P1–P4 work; navbar stays code.`

## Tests (CI needs them before merge, per CLAUDE.md)
`backend/tests/test_cms.py`:
- Draft round-trip: save draft → `GET /draft` returns it, public `GET /{slug}` still returns old published (draft is not public).
- Publish: `content` updated, a version row inserted, `draft_content` cleared.
- Rollback: after two publishes, rollback to v1 sets `content` to v1 and inserts a new version (history append-only, count grows).
- Auth: `get_admin_user` rejects non-admin on every write/history endpoint; public GET works unauthenticated.
- Missing slug returns default `Data`, not 500.

## Open decision (needed before P4)
P4 scope — full landing page Puck-editable (convert every live-data section into
a Puck block) vs. a marketing content band (hero/features/CTA editable, auction
grid stays a fixed React component). Plan assumes the former; the latter is
~half the P4 effort.
