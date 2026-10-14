# ROMIX media migration: dry run only

The current catalog contains 1,499 image references to 801 distinct local paths.
No catalog image URL currently points to Supabase. Read-only inspection of the
Supabase project named Romix (`gpzeftandqgafxipqhnh`) found public `product-images`
and `banners` buckets, allowing JPEG/PNG/WebP/AVIF up to 10 MiB, but no objects.
There are therefore no proven remote equivalents to remove from Vercel.

Run `npm run storage:migration:dry-run` to produce a manifest of paths, product/color
references, sizes and SHA-256 hashes. Optionally supply `ROMIX_STORAGE_PUBLIC_BASE`
with the verified public bucket base URL. The script cannot upload, mutate catalog
data or delete originals. Matching hashes identify byte-identical content only.

Before migration:

1. Verify bucket ownership and authenticated admin upload/update policies; keep
   credentials server-side. This repository has no Supabase upload/admin wiring.
2. Upload a small representative sample, preserve source/color associations and
   compare downloaded SHA-256 hashes. Validate public HTTP 200, MIME, CORS from
   production and preview origins, and Cache-Control. Buckets are empty so these
   object-level checks cannot currently be performed.
3. Adapt image-utils thumbnail/mobile derivation: it currently rewrites local paths
   and strips query strings, which is unsafe for arbitrary CDN/signed URLs. Use
   explicit remote derivative URLs and retain the original as fallback.
4. Verify product primary, every color/gallery, admin upload/edit, product detail,
   search, catalogs, SEO and social crawlers using permanent public HTTPS URLs.
5. Update references in an isolated branch only after the sample works. Preserve
   IDs, prices and stock. Re-run the all-catalog reference audit and browser tests.
6. Compare net deployed bytes and CDN behavior. Keep originals and rollback mapping
   until separately approved for removal. Do not exclude products in .vercelignore.

Public URL format and CDN access: https://supabase.com/docs/guides/storage/serving/downloads
