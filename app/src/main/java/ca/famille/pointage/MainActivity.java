package ca.famille.pointage;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.os.Build;
import android.provider.Settings;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int REQ_EXPORT = 41;
    private static final int REQ_IMPORT = 42;
    private WebView web;
    private String pendingExport;
    static final String RELEASES_API = "https://raw.githubusercontent.com/rogerotisqc-spec/pointage/main/update/version.json";
    static final String ACTION_INSTALL = "ca.famille.pointage.INSTALL_STATUS";
    private volatile boolean installing = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor("#1f5c45"));
        w.setNavigationBarColor(Color.parseColor("#000000"));

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setTextZoom(100);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                String scheme = u.getScheme();
                if ("http".equals(scheme) || "https".equals(scheme)) {
                    openExternal(u.toString());
                    return true;
                }
                return false;
            }
        });
        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        setContentView(web);
        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl("file:///android_asset/index.html");
        }
        handleInstallIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleInstallIntent(intent);
    }

    /** Résultat de l'installation (PackageInstaller) : on affiche la confirmation d'Android. */
    private void handleInstallIntent(Intent intent) {
        if (intent == null || !ACTION_INSTALL.equals(intent.getAction())) return;
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -999);
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) {
                try { startActivity(confirm); } catch (Exception e) { updateError("Impossible d'ouvrir l'installation."); }
            }
        } else if (status == PackageInstaller.STATUS_SUCCESS) {
            js("window.onUpdateDone && window.onUpdateDone()");
        } else {
            String msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
            updateError(status == PackageInstaller.STATUS_FAILURE_ABORTED ? "Installation annulée." : "Installation refusée" + (msg != null ? " : " + msg : "."));
        }
        installing = false;
    }

    private void updateError(String msg) {
        installing = false;
        js("window.onUpdateError && window.onUpdateError(" + JSONObject.quote(msg) + ")");
    }

    private void checkUpdate() {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    HttpURLConnection c = (HttpURLConnection) new URL(RELEASES_API + "?t=" + System.currentTimeMillis()).openConnection(); // contourne le cache de GitHub
                    c.setUseCaches(false);
                    c.setRequestProperty("Cache-Control", "no-cache");
                    c.setRequestProperty("User-Agent", "Pointage-Android");
                    c.setConnectTimeout(15000);
                    c.setReadTimeout(15000);
                    int code = c.getResponseCode();
                    if (code == 404) { js("window.onUpdateInfo && window.onUpdateInfo(null)"); return; }
                    if (code != 200) { updateError("GitHub ne répond pas (code " + code + ")."); return; }
                    BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), StandardCharsets.UTF_8));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = r.readLine()) != null) sb.append(line).append('\n');
                    r.close();
                    js("window.onUpdateInfo && window.onUpdateInfo(" + JSONObject.quote(sb.toString()) + ")");
                } catch (Exception e) {
                    updateError("Pas de connexion Internet, ou GitHub est inaccessible.");
                }
            }
        }).start();
    }

    private void downloadAndInstall(final String apkUrl) {
        if (installing) return;
        if (Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
            js("window.onUpdateNeedsPermission && window.onUpdateNeedsPermission()");
            try {
                startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName())));
            } catch (Exception ignored) { }
            return;
        }
        installing = true;
        new Thread(new Runnable() {
            @Override
            public void run() {
                PackageInstaller.Session session = null;
                try {
                    HttpURLConnection c = (HttpURLConnection) new URL(apkUrl + (apkUrl.contains("?") ? "&" : "?") + "t=" + System.currentTimeMillis()).openConnection();
                    c.setUseCaches(false);
                    c.setInstanceFollowRedirects(true);
                    c.setRequestProperty("User-Agent", "Pointage-Android");
                    c.setConnectTimeout(20000);
                    c.setReadTimeout(30000);
                    int code = c.getResponseCode();
                    if (code != 200) { updateError("Téléchargement impossible (code " + code + ")."); return; }
                    long len = c.getContentLength();
                    PackageInstaller pi = getPackageManager().getPackageInstaller();
                    PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                    params.setAppPackageName(getPackageName());
                    int id = pi.createSession(params);
                    session = pi.openSession(id);
                    InputStream in = c.getInputStream();
                    OutputStream out = session.openWrite("pointage.apk", 0, len > 0 ? len : -1);
                    byte[] buf = new byte[65536];
                    long done = 0; int n, lastPct = -1;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        done += n;
                        if (len > 0) {
                            int pct = (int) (done * 100 / len);
                            if (pct != lastPct) { lastPct = pct; js("window.onUpdateProgress && window.onUpdateProgress(" + pct + ")"); }
                        }
                    }
                    session.fsync(out);
                    out.close();
                    in.close();
                    Intent i = new Intent(MainActivity.this, MainActivity.class).setAction(ACTION_INSTALL);
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? 0x02000000 /* FLAG_MUTABLE */ : 0);
                    PendingIntent p = PendingIntent.getActivity(MainActivity.this, 7, i, flags);
                    js("window.onUpdateProgress && window.onUpdateProgress(100)");
                    session.commit(p.getIntentSender());
                    session.close();
                } catch (Exception e) {
                    if (session != null) try { session.abandon(); } catch (Exception ignored) { }
                    updateError("Le téléchargement a échoué. Vérifiez la connexion et réessayez.");
                }
            }
        }).start();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.handleBack ? window.handleBack() : false", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String value) {
                if (!"true".equals(value)) {
                    MainActivity.super.onBackPressed();
                }
            }
        });
    }

    private void openExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ignored) {
        }
    }

    private void js(final String code) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                web.evaluateJavascript(code, null);
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        Uri uri = (resultCode == RESULT_OK && data != null) ? data.getData() : null;
        if (requestCode == REQ_EXPORT) {
            boolean ok = false;
            if (uri != null && pendingExport != null) {
                try {
                    OutputStream os = getContentResolver().openOutputStream(uri, "wt");
                    os.write(pendingExport.getBytes(StandardCharsets.UTF_8));
                    os.close();
                    ok = true;
                } catch (Exception e) {
                    ok = false;
                }
            }
            pendingExport = null;
            js("window.onExportDone && window.onExportDone(" + ok + ")");
        } else if (requestCode == REQ_IMPORT && uri != null) {
            try {
                InputStream is = getContentResolver().openInputStream(uri);
                BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = r.readLine()) != null) sb.append(line).append('\n');
                r.close();
                js("window.onImportData(" + JSONObject.quote(sb.toString()) + ")");
            } catch (Exception e) {
                js("window.onImportData('')");
            }
        }
    }

    class Bridge {
        @JavascriptInterface
        public void exportData(String json, String fileName) {
            pendingExport = json;
            Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("application/json");
            i.putExtra(Intent.EXTRA_TITLE, fileName);
            startActivityForResult(i, REQ_EXPORT);
        }

        @JavascriptInterface
        public void importData() {
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("*/*");
            startActivityForResult(i, REQ_IMPORT);
        }

        @JavascriptInterface
        public String getVersion() {
            try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return "0"; }
        }

        @JavascriptInterface
        public void checkUpdate() { MainActivity.this.checkUpdate(); }

        @JavascriptInterface
        public void installUpdate(String url) { downloadAndInstall(url); }

        @JavascriptInterface
        public void openUrl(String url) {
            openExternal(url);
        }

        @JavascriptInterface
        public void keepScreenOn(final boolean on) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            });
        }
    }
}
