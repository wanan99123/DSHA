#!/usr/bin/env python3
"""Fail packaging if the submitted workspace scripts or native hooks are missing."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('apk', type=Path)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    report = {'apk':args.apk.name, 'scripts':{}, 'revision':'workspace-tab-v10'}
    with zipfile.ZipFile(args.apk) as archive:
        for name in ('workspace-settings.js', 'page.js'):
            expected = (args.root/'app/src/main/assets/web-integration'/name).read_bytes()
            packaged = archive.read('assets/web-integration/'+name)
            if expected != packaged:
                raise SystemExit('PACKAGED_SCRIPT_MISMATCH: '+name)
            report['scripts'][name] = {'bytes':len(packaged), 'sha256':hashlib.sha256(packaged).hexdigest()}
        source = archive.read('assets/web-integration/workspace-settings.js').decode()
        for marker in ('workspace-tab-v10', 'data-dsha-workspace-tab', 'data-dsha-workspace-page',
                       'DshaNativeSettings', 'DSHA_SETTINGS'):
            if marker not in source:
                raise SystemExit('MISSING_WORKSPACE_MARKER: '+marker)
        if 'sidebarSettings' in source or 'body:has([data-dsha-workspace-tools])' in source:
            raise SystemExit('STALE_WORKSPACE_IMPLEMENTATION')
        dexes = [archive.read(n) for n in archive.namelist() if re.fullmatch(r'classes\d*\.dex', n)]
        for marker in (b'web-integration/workspace-settings.js', b'DshaNativeSettings', b'WEB_SETTINGS'):
            if not any(marker in dex for dex in dexes):
                raise SystemExit('NATIVE_HOOK_MISSING: '+marker.decode())
        if archive.testzip() is not None:
            raise SystemExit('APK_ZIP_CRC_ERROR')
    digest = hashlib.sha256()
    with args.apk.open('rb') as stream:
        for block in iter(lambda: stream.read(1 << 20), b''):
            digest.update(block)
    report['apkSha256'] = digest.hexdigest()
    report['pass'] = True
    rendered = json.dumps(report, indent=2, ensure_ascii=False)+'\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered)
    print(rendered)


if __name__ == '__main__':
    main()
