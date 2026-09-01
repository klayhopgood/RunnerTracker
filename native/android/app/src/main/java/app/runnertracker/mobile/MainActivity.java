package app.runnertracker.mobile;

import android.webkit.WebView;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSExport;
import com.getcapacitor.Logger;
import com.getcapacitor.PluginHandle;
import com.getcapacitor.WebViewListener;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    /**
     * Plugins whose JS stubs must exist on the remote page. Must mirror the
     * plugins registered with the bridge (core plugins + capacitor.plugins.json).
     */
    private static final String[] BRIDGED_PLUGINS = {
        "CapacitorCookies",
        "WebView",
        "CapacitorHttp",
        "SystemBars",
        "BackgroundGeolocation",
    };

    private String bridgeScript;

    @Override
    public void onStart() {
        super.onStart();
        if (bridgeScript != null) {
            return;
        }
        try {
            bridgeScript = buildGuardedBridgeScript();
        } catch (Exception ex) {
            Logger.error("RunnerTracker: unable to build Capacitor bridge script", ex);
            return;
        }

        // Capacitor registers its document-start script only for the appUrl
        // origin, and several Android paths are known to leave remote
        // server.url pages without window.Capacitor (capacitor#7454, #7957,
        // #7269: doc-start scoping bugs, and the stream injector cannot
        // rewrite compressed HTML). Register the script ourselves for every
        // allowed origin; the guard makes double injection a no-op.
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            try {
                WebViewCompat.addDocumentStartJavaScript(bridge.getWebView(), bridgeScript, bridge.getAllowedOriginRules());
            } catch (IllegalArgumentException ex) {
                Logger.warn("RunnerTracker: document-start bridge registration failed: " + ex);
            }
        }

        // Last-resort fallback that works regardless of DOCUMENT_START_SCRIPT
        // support, response compression or service workers: after every page
        // load, inject the bridge if it is still missing. The web app listens
        // for the capacitor-bridge-ready event and re-checks isNativeApp().
        bridge.addWebViewListener(
            new WebViewListener() {
                @Override
                public void onPageLoaded(WebView webView) {
                    webView.post(() -> webView.evaluateJavascript(bridgeScript, null));
                }
            }
        );
    }

    /**
     * Rebuilds the exact script Capacitor injects (global shell, server URL,
     * native-bridge.js runtime, plugin method stubs), wrapped in a guard so it
     * only runs when window.Capacitor is not already present.
     */
    private String buildGuardedBridgeScript() throws Exception {
        String serverUrl = bridge.getServerUrl();
        String origin = serverUrl != null ? serverUrl : "https://localhost";

        List<PluginHandle> handles = new ArrayList<>();
        for (String pluginId : BRIDGED_PLUGINS) {
            PluginHandle handle = bridge.getPlugin(pluginId);
            if (handle != null) {
                handles.add(handle);
            } else {
                Logger.warn("RunnerTracker: plugin not registered, skipping JS stub: " + pluginId);
            }
        }

        String script =
            JSExport.getGlobalJS(this, false, false) +
            "\nwindow.WEBVIEW_SERVER_URL = '" +
            origin +
            "';\n" +
            JSExport.getBridgeJS(this) +
            "\n" +
            JSExport.getPluginJS(handles);

        return (
            "(function(){try{" +
            "if(window.Capacitor&&window.Capacitor.isNativePlatform){return;}\n" +
            script +
            "\n;document.dispatchEvent(new Event('capacitor-bridge-ready'));" +
            "}catch(e){console.error('RunnerTracker bridge injection failed',e);}})();"
        );
    }
}
