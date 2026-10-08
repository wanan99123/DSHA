package com.deepseekharness.app.ui;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import com.deepseekharness.app.bridge.LocalNetworkAccess;
import com.deepseekharness.app.util.Constants;

/**
 * 去掉首屏后的权限引导：只提示一次，逐项给出系统入口，不阻断使用。
 *
 * <p>通知权限走运行时申请；存储与后台保活属于特殊授权，只能跳系统页面由用户确认，
 * 因此不在第一次启动就弹出无法完成的对话框。
 */
final class WorkspaceEntryPermissions {
  private static final String ASKED = "workspace_entry_permissions_asked";
  private static final int REQUEST_NOTIFICATIONS = 71;

  private WorkspaceEntryPermissions() {}

  static void offer(Activity activity) {
    if (activity == null || activity.isFinishing() || activity.isDestroyed()) return;
    SharedPreferences prefs = activity.getSharedPreferences(Constants.PREFS, Activity.MODE_PRIVATE);
    if (prefs.getBoolean(ASKED, false)) return;
    prefs.edit().putBoolean(ASKED, true).apply();
    StringBuilder missing = new StringBuilder();
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
        && activity.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED) {
      missing.append(com.deepseekharness.app.util.UiText.choose(
          "• 通知：申请后 DSH 后台运行时才有状态提示与停止入口。\n",
          "• Notifications: needed for the background status and stop action.\n"));
    }
    if (!Environment.isExternalStorageManager()) {
      missing.append(com.deepseekharness.app.util.UiText.choose(
          "• 所有文件访问：工作区需要读写手机存储。\n",
          "• All files access: the workspace reads and writes device storage.\n"));
    }
    if (!LocalNetworkAccess.granted(activity)) {
      missing.append(com.deepseekharness.app.util.UiText.choose(
          "• 局域网访问：只在用 LAN / 无线 ADB 时需要。\n",
          "• Local network: only needed for LAN / wireless ADB.\n"));
    }
    if (missing.length() == 0) return;
    new DshaDialogBuilder(activity)
        .setTitle(com.deepseekharness.app.util.UiText.choose("建议授予的权限", "Recommended permissions"))
        .setMessage(com.deepseekharness.app.util.UiText.choose(
            "这些权限不是使用前必须，但缺了会限制对应功能。可随时在系统设置里调整：\n\n",
            "These are optional but limit features when missing. You can change them anytime:\n\n")
            + missing)
        .setPositiveButton(com.deepseekharness.app.util.UiText.choose("去授权", "Grant"),
            (dialog, which) -> requestNotifications(activity))
        .setNegativeButton(com.deepseekharness.app.util.UiText.choose("稍后", "Later"), null)
        .show();
  }

  private static void requestNotifications(Activity activity) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
        && activity.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED) {
      activity.requestPermissions(
          new String[] {android.Manifest.permission.POST_NOTIFICATIONS}, REQUEST_NOTIFICATIONS);
      return;
    }
    openAppSettings(activity);
  }

  private static void openAppSettings(Activity activity) {
    try {
      activity.startActivity(
          new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
              .setData(Uri.fromParts("package", activity.getPackageName(), null)));
    } catch (RuntimeException ignored) {
    }
  }
}
