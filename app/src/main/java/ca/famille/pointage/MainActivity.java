package ca.famille.pointage;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageInstaller;
import android.os.Build;
import android.provider.Settings;
import android.provider.DocumentsContract;
import android.content.SharedPreferences;
import android.database.Cursor;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import java.util.ArrayList;
import org.json.JSONArray;
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
    private static final int REQ_SPEECH = 43;
    private static final int REQ_TREE = 44;
    private WebView web;
    private TextToSpeech tts;
    private boolean ttsReady;
    private String ttsPending;
    private String ttsVoice;
    private float ttsRate = 1f;
    private boolean ttsListWanted;
    private String pendingExport;
    // API GitHub : à jour en moins d'une minute (le site « raw » garde une copie jusqu'à 5 minutes)
    static final String RELEASES_API = "https://api.github.com/repos/rogerotisqc-spec/pointage/contents/update/version.json";
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
        s.setMediaPlaybackRequiresUserGesture(false);
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
            String live = liveLink(getIntent());
            web.loadUrl("file:///android_asset/index.html" + (live != null ? "#suivre=" + live : ""));
        }
        if (savedInstanceState != null) openLive(getIntent());
        handleInstallIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openLive(intent);
        handleInstallIntent(intent);
    }

    /** Lien d'une partie en direct (pointage://suivre/ID.CLÉ) : renvoie « ID.CLÉ », ou null. */
    private String liveLink(Intent intent) {
        if (intent == null || intent.getData() == null || !"pointage".equals(intent.getData().getScheme())) return null;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("([A-Za-z0-9_-]{12}\\.[A-Za-z0-9_-]{22})").matcher(intent.getData().toString());
        return m.find() ? m.group(1) : null;
    }

    private void openLive(Intent intent) {
        final String live = liveLink(intent);
        if (live == null || web == null) return;
        web.post(new Runnable() { public void run() { web.evaluateJavascript("location.hash='#suivre=" + live + "'", null); } });
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

    private SharedPreferences prefs() { return getSharedPreferences("backup", MODE_PRIVATE); }

    private String folderName(Uri tree) {
        try {
            Uri doc = DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree));
            Cursor c = getContentResolver().query(doc, new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME}, null, null, null);
            if (c != null) { try { if (c.moveToFirst()) return c.getString(0); } finally { c.close(); } }
        } catch (Exception ignored) { }
        return "Dossier choisi";
    }

    /** Trouve (ou crée) un fichier dans le dossier choisi, puis le remplace par le contenu donné. */
    private void writeInTree(Uri tree, String fileName, byte[] data) throws Exception {
        String rootId = DocumentsContract.getTreeDocumentId(tree);
        Uri parent = DocumentsContract.buildDocumentUriUsingTree(tree, rootId);
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, rootId);
        Uri target = null;
        Cursor c = getContentResolver().query(children, new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME}, null, null, null);
        if (c != null) {
            try { while (c.moveToNext()) { if (fileName.equals(c.getString(1))) { target = DocumentsContract.buildDocumentUriUsingTree(tree, c.getString(0)); break; } } }
            finally { c.close(); }
        }
        if (target == null) target = DocumentsContract.createDocument(getContentResolver(), parent, "application/json", fileName);
        if (target == null) throw new Exception("création du fichier refusée");
        OutputStream os = getContentResolver().openOutputStream(target, "wt");
        os.write(data);
        os.close();
    }

    private void writeBackup(final String json) {
        final String t = prefs().getString("tree", null);
        if (t == null) return;
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    Uri tree = Uri.parse(t);
                    byte[] data = json.getBytes(StandardCharsets.UTF_8);
                    writeInTree(tree, "Pointage-sauvegarde.json", data);
                    String month = new SimpleDateFormat("yyyy-MM", Locale.CANADA).format(new Date());
                    writeInTree(tree, "Pointage-sauvegarde-" + month + ".json", data);
                    prefs().edit().putLong("last", System.currentTimeMillis()).apply();
                    js("window.onBackupDone && window.onBackupDone(true, '')");
                } catch (Exception e) {
                    js("window.onBackupDone && window.onBackupDone(false, " + JSONObject.quote("le dossier n'est plus accessible, choisissez-le de nouveau") + ")");
                }
            }
        }).start();
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
                    HttpURLConnection c = (HttpURLConnection) new URL(RELEASES_API).openConnection();
                    c.setUseCaches(false);
                    c.setRequestProperty("Accept", "application/vnd.github.raw+json");
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

    private void say(String text) {
        applyVoice();
        tts.setSpeechRate(ttsRate);
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "pointage");
    }

    // Meilleure voix française installée : fr-CA d'abord, puis la qualité, en évitant celles qui exigent Internet
    private Voice bestVoice() {
        Voice best = null; int bestScore = -1;
        try {
            for (Voice v : tts.getVoices()) {
                Locale l = v.getLocale();
                if (l == null || !"fr".equals(l.getLanguage())) continue;
                if (v.getFeatures() != null && v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
                int sc = ("CA".equals(l.getCountry()) ? 2000 : 1000) + v.getQuality() + (v.isNetworkConnectionRequired() ? -150 : 0);
                if (sc > bestScore) { bestScore = sc; best = v; }
            }
        } catch (Exception ignored) { }
        return best;
    }

    private void applyVoice() {
        try {
            if (ttsVoice != null) {
                for (Voice v : tts.getVoices()) if (v.getName().equals(ttsVoice)) { tts.setVoice(v); return; }
            }
            Voice b = bestVoice();
            if (b != null) tts.setVoice(b);
        } catch (Exception ignored) { }
    }

    private String voicesJson() {
        JSONArray out = new JSONArray();
        try {
            Voice b = bestVoice();
            for (Voice v : tts.getVoices()) {
                Locale l = v.getLocale();
                if (l == null || !"fr".equals(l.getLanguage())) continue;
                JSONObject o = new JSONObject();
                o.put("name", v.getName());
                o.put("lang", l.toLanguageTag());
                o.put("quality", v.getQuality());
                o.put("network", v.isNetworkConnectionRequired());
                o.put("installed", v.getFeatures() == null || !v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED));
                o.put("best", b != null && b.getName().equals(v.getName()));
                out.put(o);
            }
        } catch (Exception ignored) { }
        return out.toString();
    }

    private void ensureTts() {
        if (tts != null) return;
        tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                if (status != TextToSpeech.SUCCESS) {
                    tts = null;
                    js("window.onSpeakEnd && window.onSpeakEnd('Voix de lecture non disponible sur ce téléphone')");
                    js("window.onVoices && window.onVoices('[]')");
                    return;
                }
                int r = tts.setLanguage(Locale.CANADA_FRENCH);
                if (r < 0) tts.setLanguage(Locale.FRENCH);
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) { }
                    @Override public void onDone(String id) { js("window.onSpeakEnd && window.onSpeakEnd()"); }
                    @Override public void onError(String id) { js("window.onSpeakEnd && window.onSpeakEnd()"); }
                });
                ttsReady = true;
                if (ttsListWanted) { ttsListWanted = false; js("window.onVoices && window.onVoices(" + JSONObject.quote(voicesJson()) + ")"); }
                if (ttsPending != null) { say(ttsPending); ttsPending = null; }
            }
        });
    }

    private void speakNow(final String text) {
        if (ttsReady) say(text);
        else { ttsPending = text; ensureTts(); }
    }

    @Override
    protected void onDestroy() {
        if (tts != null) { tts.shutdown(); tts = null; }
        super.onDestroy();
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
        if (requestCode == REQ_TREE) {
            boolean ok = false;
            if (uri != null) {
                try {
                    getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                    prefs().edit().putString("tree", uri.toString()).putString("name", folderName(uri)).remove("last").apply();
                    ok = true;
                } catch (Exception ignored) { }
            }
            js("window.onBackupFolder && window.onBackupFolder(" + ok + ")");
            return;
        }
        if (requestCode == REQ_SPEECH) {
            if (resultCode == RESULT_OK && data != null) {
                ArrayList<String> res = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                JSONArray arr = new JSONArray();
                if (res != null) for (String r : res) arr.put(r);
                js("window.onSpeech && window.onSpeech(" + JSONObject.quote(arr.toString()) + ")");
            } else {
                js("window.onSpeechError && window.onSpeechError('Rien entendu')");
            }
            return;
        }
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
        public void postIssue(final String id, final String repo, final String key, final String payload) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        HttpURLConnection c = (HttpURLConnection) new URL("https://api.github.com/repos/" + repo + "/issues").openConnection();
                        c.setRequestMethod("POST");
                        c.setDoOutput(true);
                        c.setConnectTimeout(15000);
                        c.setReadTimeout(20000);
                        c.setRequestProperty("Authorization", "Bearer " + key);
                        c.setRequestProperty("Accept", "application/vnd.github+json");
                        c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                        c.setRequestProperty("User-Agent", "Pointage-Android");
                        OutputStream os = c.getOutputStream();
                        os.write(payload.getBytes(StandardCharsets.UTF_8));
                        os.close();
                        int code = c.getResponseCode();
                        if (code == 201) {
                            BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), StandardCharsets.UTF_8));
                            StringBuilder sb = new StringBuilder();
                            String line;
                            while ((line = r.readLine()) != null) sb.append(line);
                            r.close();
                            int num = new JSONObject(sb.toString()).optInt("number", 0);
                            js("window.onIssueResult && window.onIssueResult(" + JSONObject.quote(id) + ", true, " + num + ")");
                        } else {
                            js("window.onIssueResult && window.onIssueResult(" + JSONObject.quote(id) + ", false, " + JSONObject.quote("http " + code) + ")");
                        }
                    } catch (Exception e) {
                        js("window.onIssueResult && window.onIssueResult(" + JSONObject.quote(id) + ", false, \"reseau\")");
                    }
                }
            }).start();
        }

        @JavascriptInterface
        public void pickBackupFolder() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try { startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE), REQ_TREE); }
                    catch (Exception e) { js("window.onBackupFolder && window.onBackupFolder(false)"); }
                }
            });
        }

        @JavascriptInterface
        public String backupInfo() {
            try {
                JSONObject o = new JSONObject();
                SharedPreferences p = prefs();
                if (p.getString("tree", null) != null) o.put("folder", p.getString("name", "Dossier choisi"));
                if (p.getLong("last", 0) > 0) o.put("last", p.getLong("last", 0));
                return o.toString();
            } catch (Exception e) { return "{}"; }
        }

        @JavascriptInterface
        public void writeBackup(String json) { MainActivity.this.writeBackup(json); }

        @JavascriptInterface
        public void listen() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "fr-CA");
                        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
                        i.putExtra(RecognizerIntent.EXTRA_PROMPT, "Dites les dés gardés");
                        startActivityForResult(i, REQ_SPEECH);
                    } catch (Exception e) {
                        js("window.onSpeechError && window.onSpeechError('Reconnaissance vocale non disponible sur ce téléphone')");
                    }
                }
            });
        }

        @JavascriptInterface
        public void openUrl(String url) {
            openExternal(url);
        }

        @JavascriptInterface
        public String aiApps() {
            String[][] apps = {{"com.google.android.apps.bard", "Gemini"}, {"com.openai.chatgpt", "ChatGPT"},
                {"com.anthropic.claude", "Claude"}, {"com.microsoft.copilot", "Copilot"}, {"ai.perplexity.app.android", "Perplexity"}};
            JSONArray out = new JSONArray();
            for (String[] a : apps) {
                try {
                    getPackageManager().getPackageInfo(a[0], 0);
                    JSONObject o = new JSONObject();
                    o.put("pkg", a[0]); o.put("name", a[1]);
                    out.put(o);
                } catch (Exception ignored) { }
            }
            return out.toString();
        }

        @JavascriptInterface
        public void shareText(final String text) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Intent i = new Intent(Intent.ACTION_SEND);
                    i.setType("text/plain");
                    i.putExtra(Intent.EXTRA_TEXT, text);
                    try { startActivity(Intent.createChooser(i, "Partager Pointage")); } catch (Exception ignored) { }
                }
            });
        }

        @JavascriptInterface
        public void askAi(final String text, final String pkg) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Intent i = new Intent(Intent.ACTION_SEND);
                    i.setType("text/plain");
                    i.putExtra(Intent.EXTRA_TEXT, text);
                    if (pkg != null && pkg.length() > 0) {
                        i.setPackage(pkg);
                        try { startActivity(i); return; } catch (Exception e) { i.setPackage(null); }
                    }
                    try { startActivity(Intent.createChooser(i, "Demander à une IA")); } catch (Exception ignored) { }
                }
            });
        }

        @JavascriptInterface
        public void listVoices() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (ttsReady) js("window.onVoices && window.onVoices(" + JSONObject.quote(voicesJson()) + ")");
                    else { ttsListWanted = true; ensureTts(); }
                }
            });
        }

        @JavascriptInterface
        public void setVoice(final String name, final float rate) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() { ttsVoice = (name == null || name.length() == 0) ? null : name; ttsRate = rate > 0.3f && rate < 3f ? rate : 1f; }
            });
        }

        @JavascriptInterface
        public void speak(final String text) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() { speakNow(text); }
            });
        }

        @JavascriptInterface
        public void stopSpeaking() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() { ttsPending = null; if (tts != null) tts.stop(); }
            });
        }

        @JavascriptInterface
        public void setOrientation(final String mode) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    int o = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED;
                    if ("portrait".equals(mode)) o = ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT;
                    else if ("landscape".equals(mode)) o = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE;
                    setRequestedOrientation(o);
                }
            });
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
