# New tab extension

The extension in `extension/` shows your Bercail instance on every new tab.

1. Download `bercail-extension.zip` from the latest release and unzip it. To build it yourself,
   run `bun run package:extension`, which writes `dist/bercail-extension.zip`.
2. In Chrome, open `chrome://extensions`, turn on Developer mode, then **Load unpacked** and pick
   the unzipped folder.
3. Open a new tab and set your Bercail URL, then allow access to that site when asked. With
   sign-in on, you sign in once in the tab that opens. When the session expires, a new tab sends
   you back to the sign-in page.

If you put Bercail behind an auth proxy (Pangolin, Cloudflare Access) instead of using its own
sign-in, let `/service-worker.js` through without auth. Browsers fetch that file without cookies,
so otherwise the cache never installs.

After the first visit the page is served from a service worker cache, so new tabs open without
waiting on the server.
