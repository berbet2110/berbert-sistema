package br.com.berbert.bingbot;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;

import org.json.JSONObject;

/**
 * Tela única do app. Divide a tela em duas partes:
 *
 *  - em cima, o painel do bot ({@link #painel}): a interface HTML/JS que vem em assets/
 *    (a mesma pasta web/ usada no PWA). É ela que gera os termos, agenda e conta as pesquisas;
 *  - embaixo, a página do Bing ({@link #bing}): um WebView comum que abre
 *    https://www.bing.com/search?q=... — o site oficial, como um navegador faria.
 *
 * O painel conversa com o Java pela {@link PonteJs} e recebe avisos por
 * {@code window.bingBotEvento({...})}.
 *
 * Bateria e memória: sem serviços em segundo plano, sem wake lock. Quando o app sai da tela,
 * o bot é pausado e os temporizadores dos WebViews são congelados; ao voltar, ele continua.
 */
public class MainActivity extends Activity {

    private static final String ENDERECO_PAINEL = "file:///android_asset/index.html";

    private WebView painel;
    private WebView bing;
    private boolean pausada = false;

    @Override
    protected void onCreate(Bundle estadoSalvo) {
        super.onCreate(estadoSalvo);

        LinearLayout raiz = new LinearLayout(this);
        raiz.setOrientation(LinearLayout.VERTICAL);

        painel = criarPainel();
        bing = criarBing();

        View divisoria = new View(this);
        divisoria.setBackgroundColor(Color.parseColor("#0F6CBD"));

        raiz.addView(painel, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.1f));
        raiz.addView(divisoria, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(3)));
        raiz.addView(bing, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        bing.setTag(divisoria);  // para esconder a divisória junto com o Bing
        setContentView(raiz);

        painel.loadUrl(ENDERECO_PAINEL);
        bing.loadUrl("https://www.bing.com/");
    }

    /** WebView da interface do bot (conteúdo local e confiável, por isso recebe a ponte JS). */
    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private WebView criarPainel() {
        WebView w = new WebView(this);
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // localStorage: histórico e configurações
        s.setAllowFileAccess(false);           // só os assets do app (file:///android_asset continua liberado)
        s.setAllowContentAccess(false);
        w.addJavascriptInterface(new PonteJs(this), "BingBotNativo");
        w.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                // O painel nunca sai dos arquivos locais; links externos vão para o navegador do celular.
                String url = req.getUrl().toString();
                if (url.startsWith("file:///android_asset/")) return false;
                abrirFora(req.getUrl());
                return true;
            }
        });
        return w;
    }

    /** WebView da página do Bing. Não tem acesso à ponte JS nem a arquivos locais. */
    @SuppressLint("SetJavaScriptEnabled")
    private WebView criarBing() {
        WebView w = new WebView(this);
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);          // a página de resultados do Bing precisa de JS
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(true);  // nada de vídeo tocando sozinho
        w.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                // Páginas do Bing/Microsoft abrem aqui; resultados de outros sites vão para o navegador.
                Uri u = req.getUrl();
                if (ehDominioMicrosoft(u.getHost())) return false;
                abrirFora(u);
                return true;
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                verificarDesafio(v, url);
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError erro) {
                if (req.isForMainFrame()) {
                    enviarEvento("erro", String.valueOf(erro.getDescription()));
                }
            }
        });
        return w;
    }

    /**
     * Se a página carregada for uma verificação (captcha, desafio de segurança ou login),
     * avisa o painel para PAUSAR. O app não tenta resolver nem contornar a verificação:
     * quem resolve é o usuário, na própria página.
     */
    private void verificarDesafio(WebView v, String url) {
        String u = url == null ? "" : url.toLowerCase();
        if (u.contains("captcha") || u.contains("/challenge") || u.contains("login.live.com")) {
            enviarEvento("verificacao", null);
            return;
        }
        String js = "(function(){var d=document;"
                + "return !!(d.querySelector('#captcha,[id*=captcha],[class*=captcha],iframe[src*=captcha],iframe[src*=challenge]')"
                + "||/verifi(que|car)|captcha|are you human|não é um robô/i.test(d.title||''));})()";
        v.evaluateJavascript(js, resultado -> {
            if ("true".equals(resultado)) enviarEvento("verificacao", null);
        });
    }

    private static boolean ehDominioMicrosoft(String host) {
        if (host == null) return false;
        host = host.toLowerCase();
        return host.equals("bing.com") || host.endsWith(".bing.com")
                || host.endsWith(".microsoft.com") || host.endsWith(".live.com") || host.endsWith(".msn.com");
    }

    // ---- Chamado pela PonteJs (sempre já na thread principal) ------------------------------

    /** Carrega uma página de resultados do Bing. Só aceita endereços https do bing.com. */
    void pesquisar(String url) {
        Uri u = Uri.parse(url);
        if (!"https".equals(u.getScheme()) || !ehDominioMicrosoft(u.getHost())) return;
        bing.loadUrl(url);
    }

    void mostrarBing(boolean visivel) {
        int v = visivel ? View.VISIBLE : View.GONE;
        bing.setVisibility(v);
        ((View) bing.getTag()).setVisibility(v);
    }

    /** Economia de dados: não baixa imagens da página do Bing. */
    void definirEconomia(boolean ligada) {
        bing.getSettings().setBlockNetworkImage(ligada);
        bing.getSettings().setLoadsImagesAutomatically(!ligada);
    }

    // ---- Auxiliares --------------------------------------------------------------------------

    /** Envia {tipo, mensagem} para window.bingBotEvento no painel. */
    private void enviarEvento(String tipo, String mensagem) {
        if (painel == null) return;
        try {
            JSONObject ev = new JSONObject();
            ev.put("tipo", tipo);
            if (mensagem != null) ev.put("mensagem", mensagem);
            painel.evaluateJavascript("window.bingBotEvento && window.bingBotEvento(" + ev + ")", null);
        } catch (Exception ignorado) {
            // JSON simples: não falha na prática.
        }
    }

    private void abrirFora(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignorado) {
            // Nenhum navegador instalado: ignora o toque.
        }
    }

    private int dp(int valor) {
        return Math.round(valor * getResources().getDisplayMetrics().density);
    }

    // ---- Ciclo de vida: pausa tudo fora da tela para poupar bateria --------------------------

    @Override
    protected void onPause() {
        pausada = true;
        enviarEvento("segundo-plano", null);
        // Dá tempo do painel processar o aviso antes de congelar os temporizadores.
        painel.postDelayed(() -> {
            if (pausada && painel != null) painel.pauseTimers();  // vale para todos os WebViews do app
        }, 300);
        bing.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        pausada = false;
        painel.resumeTimers();
        bing.onResume();
        enviarEvento("primeiro-plano", null);
    }

    @Override
    public void onBackPressed() {
        // "Voltar" navega no Bing se der; senão, manda o app para o fundo (não fecha o bot à força).
        if (bing.getVisibility() == View.VISIBLE && bing.canGoBack()) {
            bing.goBack();
        } else {
            moveTaskToBack(true);
        }
    }

    @Override
    protected void onDestroy() {
        // Libera a memória dos WebViews.
        painel.removeJavascriptInterface("BingBotNativo");
        painel.destroy();
        bing.destroy();
        painel = null;
        bing = null;
        super.onDestroy();
    }
}
