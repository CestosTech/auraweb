# Aura connectivity and media strategy

## Goal

Keep Aura usable on expensive or unreliable connections by reusing public media,
fetching feed pages only when needed, and showing useful cached content during
short outages. The mobile and web clients use the same safety rules: only public
content is persisted, private/account data is not cached, and large videos are
never prefetched.

## What is implemented

### Mobile

- Public listing images and thumbnails use a disk cache with a 180-day freshness
  window and a 500-object cap. Repeated views of the same versioned image URL
  reuse the local file. The image widget still decodes to the rendered size to
  reduce memory use.
- Public catalog collections and anonymous service/event/community GET responses
  are cached locally. Fresh catalog lists are reused for six hours; public API
  responses are considered fresh for six hours and may be used as stale fallback
  for up to 30 days. Pull-to-refresh bypasses the fresh copy. Cache/storage errors
  do not prevent a live request.
- The service marketplace uses 50-record server pages. It fetches the next page
  as the user nears the end of the scroll and keeps a manual retry/load-more
  control available.
- Marketplace product grids render in 24-item increments as they approach the
  viewport. Existing sliver/list builders defer image widgets until they are
  close to view.
- Videos remain tap/visibility driven. A full offline video download is not
  automatic: it can use substantially more data than playing a short segment.
  Video posters and gallery photos use the persistent image cache.

### Web

- `Photo` uses browser lazy loading and asynchronous image decoding. The service
  worker stores public image requests in a separate cache, up to 240 images, for
  up to 180 days. It serves a cached image without a network request and falls
  back to it when offline. Browser storage can still be evicted by the OS.
- The service worker may cache a complete public video only when the response is
  a normal full response with a known size no greater than 8 MiB. It bypasses
  range requests, larger videos, API routes, and paths marked as chat, receipt,
  private, or identity media. Gallery video sources use `preload="none"` and
  begin playback only when visible.
- Public Events, Community and Services API responses use IndexedDB. A fresh
  response is reused for six hours; stale content can serve as an offline
  fallback for up to 30 days. Authenticated requests and mutations are excluded.
- Catalog API pages already use server cursors; catalog screens now fetch the
  next page automatically near the end of the feed, with the existing button as
  a manual fallback. Social feeds also load cursor pages on scroll. Services use
  50-record backend pages and load more on scroll.

## Data and privacy rules

- Persisted data is restricted to published/public catalog and feed responses.
  Authenticated API calls, business portal data, chat messages/media, receipts,
  uploads and account details do not enter these caches.
- Published media should use a new URL when the underlying image/video changes.
  This keeps cache-first images correct without checking the network every time.
- A public feed cache is best-effort. Users can refresh while online; the app
  must remain functional when browser or OS storage is cleared or evicted.
- No list response is treated as proof that an item is still available. Orders,
  prices, merchant state and permissions must always be checked by the backend
  at the moment of the action.

## Follow-up opportunities

- Add responsive image variants (small card, medium detail, original) at upload
  time, then request the smallest variant for each display size.
- Add a user-controlled “save video for offline” action with file-size estimate,
  cellular-data warning and storage management. Keep it separate from autoplay.
- Add a data-saver setting that disables autoplay, lowers image variants and
  reduces feed prefetch distance.
- Measure cache hit rate, bytes fetched per session, and page abandonment before
  tuning the six-hour TTL, image cap or page size.
- Consider API ETags/304 responses and compression for JSON feed pages so refresh
  checks transfer only changes.

## Validation notes

Static analysis and production builds are the validation targets for this change.
No test suites are run unless requested. Video caching is intentionally limited
to small complete web responses; streamed/range-based and mobile videos remain
on-demand to avoid silently downloading large media over cellular data.
