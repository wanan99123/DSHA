package com.deepseekharness.app.ui;

import android.content.Context;
import androidx.fragment.app.Fragment;

/** Explicit allowlist: Web settings may only open these local UI destinations. */
final class WorkspaceSettingsRoute {
    private WorkspaceSettingsRoute() { }
    static boolean isAllowed(String key) {
        return create(null, key) != null;
    }
    static Fragment create(Context context, String key) {
        if (key == null) return null;
        switch (key) {
            case "runtime": return new LaunchFragment();
            case "plugins": return new PluginFragment();
            case "terminal": return context != null && PtyTerminalFragment.preferred(context)
                    ? new PtyTerminalFragment() : new TerminalFragment();
            case "install": return new InstallFragment();
            case "config": return new ConfigFragment();
            case "backup": return new WorkspaceFragment();
            case "grants": return new DeviceGrantsFragment();
            default: return null;
        }
    }
}
