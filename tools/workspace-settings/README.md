# Workspace settings v10 — persistent APK change

## User-visible behavior

- Settings stays a centered card (`90vw × 76dvh`, bounded by `540px × 680px`).
- A **工作台** navigation button is inserted immediately after **通用设置**.
- Its seven native entries are on an independent page, not appended below general settings.
- Switching back restores the original settings content and scroll position.
- The existing close handler and native routes remain in use. This patch does not clear application data.

## Why the live fix disappeared

The previously demonstrated change was evaluated in an already-running WebView through CDP. It changed only that document. The device was still running the v8 APK (`3470d07f40db39a1d222f09762c829fe83ce9d1f65e7d169a5ee287e41fd2f90`). Restarting therefore loaded the v8 script again.

The permanent chain in this build is:

`APK assets/web-integration/workspace-settings.js`
→ `WebPageScripts.compatibility()`
→ `WebPreviewActivity` document-start injection (or its existing page-finished fallback)
→ an observer for `[data-shortcut-modal="settings"][role="dialog"]`.

The APK must actually be updated. A GitHub commit by itself does not change an installed application.

## Packaging gate

`Navigation fix APK` overlays these changes onto the published `v0.1.7-rc2` source and matching official runtime assets. It copies the modified scripts into `app/build/generated/standardAssets/web-integration/` **after** recovering the official assets.

The build fails unless the packaged scripts are byte-for-byte identical to the submitted versions and the native integration/logging markers are present in dex:

```sh
python3 tools/workspace-settings/verify-packaged.py \
  app/build/outputs/apk/standard/debug/app-standard-debug.apk \
  --output PACKAGE-VERIFICATION.json
```

If Gradle uses a different output name, supply the actual APK path.

## Logging

The script emits bounded `[DSHA_SETTINGS]` events: `installed`, `attached`, `geometry`, `page`, `route`, and failures. `WebPreviewActivity` stores these under `WEB_SETTINGS` in the existing diagnostic log. Events record layout and route names, not conversation contents, API keys, or configuration values.

After installation, open settings and look for:

- `installed`: script started in the new document;
- `attached`, `placement=separate-page`, `routes=7`;
- `geometry`, `pageOutsideOptions=true`;
- `page`, `name=workspace` when its button is selected.

## Verification status

On the physical device's WebView 134, the exact v10 script passed 11 live DOM/hit-test checks: independent page, general-page restoration, scroll preservation, model-tab restoration, return to workspace, centered bounds, all seven entries visible/hit-testable, close-button bounds, original close handler, single tab after reopening, and independence after reopening. No script `error` events were recorded. These were **live-script tests on the installed v8 base**, not proof of a v10 installation.

`live-regression.js` reproduces those checks against an open settings modal. Run it only in a local test page: it clicks navigation/close buttons but does not invoke the seven native actions.

Final installation regression:

1. Install the newly built APK without erasing existing data; verify its SHA-256.
2. Open Settings → 工作台. Check all seven entries and return from a native page.
3. Close and reopen the settings card. There must be one workspace button and no tools appended to general settings.
4. Fully exit and relaunch the application, then repeat step 2 **without any CDP injection**.
5. Verify Back no longer starts the setup screen, and Home does not enter PiP.

The newly built APK's cold-start/install tests remain separate from live-script and packaging checks; do not report them passed without running them.

## Stable signing

From v10, this workflow uses the private Actions secret `DSHA_WORKSPACE_DEBUG_KEYSTORE_B64`, rather than a randomly generated CI debug key. It refuses to build if the secret is missing. The private key is not committed or included in artifacts.

Public certificate SHA-256:

`589176b7c825da46cb0a2be9ccb3293d99f2aac73f2814bdcfcff3bb4abfaf27`

This certificate **does not match v8**. An ordinary Android install cannot retain-data upgrade from v8 using this different key. Do not uninstall or clear data merely to test. Recover the old signer or perform a separately verified backup/migration. Once using v10, subsequent builds of this workflow keep the same signing identity.
