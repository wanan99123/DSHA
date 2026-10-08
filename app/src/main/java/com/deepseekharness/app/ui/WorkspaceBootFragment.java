package com.deepseekharness.app.ui;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.deepseekharness.app.R;
import com.deepseekharness.app.core.HarnessController;

/**
 * 冷启动过渡页：自动启动 DSH 并在鉴权就绪后直接进入 Web 工作界面。
 *
 * <p>它是原启动控制台的替代品——只显示启动进度，不放启停按钮和日志；启动失败或超时后
 * 才提供入口跳到「设置 › 运行与日志」做排查，避免用户卡在无法操作的空白页。
 */
public class WorkspaceBootFragment extends Fragment {

    /** 启动超时：超过该时间仍未拿到鉴权链接就认为需要人工排查。 */
    private static final long STARTUP_TIMEOUT_MS = 90_000L;

    private HarnessController controller;
    private TextView status;
    private Button retry;
    private Button openSettings;
    private ProgressBar busy;
    private boolean entering;
    private boolean failed;
    private long request;
    private final android.os.Handler ui = new android.os.Handler(android.os.Looper.getMainLooper());

    private final Runnable watch = new Runnable() {
        @Override
        public void run() {
            if (!isAdded()) return;
            if (entering || failed) return;
            if (!controller.getWebAuthUrl().isEmpty()) {
                enterWeb();
                return;
            }
            if (startedAt > 0 && System.currentTimeMillis() - startedAt > STARTUP_TIMEOUT_MS) {
                showFailure(com.deepseekharness.app.util.UiText.text("启动超时，请到设置里的「运行与日志」查看日志"));
                return;
            }
            ui.postDelayed(this, 500);
        }
    };
    private long startedAt;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_workspace_boot, container, false);
        controller = HarnessController.get(requireContext());
        status = v.findViewById(R.id.boot_status);
        busy = v.findViewById(R.id.boot_busy);
        retry = v.findViewById(R.id.boot_retry);
        openSettings = v.findViewById(R.id.boot_settings);
        retry.setOnClickListener(x -> begin());
        retry.setText(com.deepseekharness.app.util.UiText.choose("重试", "Retry"));
        openSettings.setText(com.deepseekharness.app.util.UiText.choose("打开设置", "Open settings"));
        openSettings.setOnClickListener(x -> {
            if (requireActivity() instanceof MainActivity)
                ((MainActivity) requireActivity()).showSettingsEntry();
        });
        return v;
    }

    @Override
    public void onResume() {
        super.onResume();
        if (!entering && !failed) begin();
    }

    @Override
    public void onPause() {
        ui.removeCallbacks(watch);
        request++;
        entering = false;
        super.onPause();
    }

    @Override
    public void onDestroyView() {
        ui.removeCallbacks(watch);
        status = null;
        busy = null;
        retry = null;
        openSettings = null;
        super.onDestroyView();
    }

    private void begin() {
        final View root = getView();
        final Activity activity = getActivity();
        if (root == null || activity == null || activity.isFinishing() || activity.isDestroyed()) return;
        failed = false;
        entering = false;
        retry.setVisibility(View.GONE);
        openSettings.setVisibility(View.GONE);
        busy.setVisibility(View.VISIBLE);
        status.setText(com.deepseekharness.app.util.UiText.text("正在启动 DSH…"));
        // 已就绪（例如进程刚被系统回收但服务仍在）：不重复启动，直接进。
        if (!controller.getWebAuthUrl().isEmpty()) {
            enterWeb();
            return;
        }
        if (!controller.isStarting() && !controller.isStopping()) {
            startedAt = System.currentTimeMillis();
            boolean accepted = controller.startWeb(
                    msg -> activity.runOnUiThread(() -> {
                        TextView view = status;
                        if (view != null)
                            view.setText(com.deepseekharness.app.util.UiStateText.render(msg));
                    }));
            if (!accepted && controller.getWebAuthUrl().isEmpty()) {
                showFailure(com.deepseekharness.app.util.UiText.text("无法开始启动，请到设置里的「运行与日志」重试"));
                return;
            }
            if (accepted) startKeepAlive(activity);
        } else if (startedAt == 0) {
            startedAt = System.currentTimeMillis();
        }
        ui.removeCallbacks(watch);
        ui.postDelayed(watch, 300);
    }

    private void startKeepAlive(Activity activity) {
        try {
            Intent svc = new Intent(activity, com.deepseekharness.app.HarnessService.class);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                activity.startForegroundService(svc);
            } else {
                activity.startService(svc);
            }
        } catch (Throwable t) {
            android.util.Log.w("DSHA", com.deepseekharness.app.util.UiText.text("拉起保活服务失败: ") + t.getMessage());
        }
    }

    private void enterWeb() {
        final View root = getView();
        final Activity activity = getActivity();
        if (root == null || activity == null || !isResumed()
                || activity.isFinishing() || activity.isDestroyed()) return;
        final String url = controller.getWebAuthUrl();
        if (url.isEmpty()) return;
        final long generation = controller.getWebGeneration();
        final long ticket = ++request;
        entering = true;
        ui.removeCallbacks(watch);
        status.setText(com.deepseekharness.app.util.UiText.text("正在验证访问权限…"));
        new Thread(() -> {
            String cookie = null;
            String failure = null;
            try {
                cookie = controller.exchangeDshAuthCookie();
                if (cookie == null || cookie.isEmpty()) failure = controller.getWebAuthFailure();
            } catch (Exception error) {
                failure = com.deepseekharness.app.util.UiText.text("鉴权失败：")
                        + error.getClass().getSimpleName();
            }
            final String authCookie = cookie;
            final String authFailure = failure;
            ui.post(() -> {
                if (ticket != request || getView() != root || !isAdded() || !isResumed()
                        || activity.isFinishing() || activity.isDestroyed()) return;
                if (generation != controller.getWebGeneration()
                        || !url.equals(controller.getWebAuthUrl())) {
                    entering = false;
                    showFailure(com.deepseekharness.app.util.UiText.text("Web 状态已变化，请重试"));
                    return;
                }
                if (authFailure != null) {
                    entering = false;
                    showFailure(authFailure);
                    return;
                }
                try {
                    startActivity(WebPreviewActivity.intent(activity, url, authCookie));
                } catch (RuntimeException error) {
                    entering = false;
                    showFailure(com.deepseekharness.app.util.UiText.text("无法打开页面：")
                            + error.getClass().getSimpleName());
                }
            });
        }, "dsha-boot-cookie").start();
    }

    private void showFailure(String message) {
        failed = true;
        entering = false;
        ui.removeCallbacks(watch);
        TextView view = status;
        if (view != null) view.setText(com.deepseekharness.app.util.UiStateText.render(message));
        if (busy != null) busy.setVisibility(View.GONE);
        if (retry != null) retry.setVisibility(View.VISIBLE);
        if (openSettings != null) openSettings.setVisibility(View.VISIBLE);
    }
}
