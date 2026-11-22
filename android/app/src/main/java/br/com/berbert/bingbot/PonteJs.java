package br.com.berbert.bingbot;

import android.webkit.JavascriptInterface;

/**
 * Métodos que o painel (JavaScript) pode chamar, como {@code BingBotNativo.pesquisar(url)}.
 *
 * Os métodos com {@link JavascriptInterface} rodam numa thread do WebView, então cada um
 * repassa o trabalho para a thread principal com {@code runOnUiThread}.
 * Esta ponte só é ligada ao WebView do painel (arquivos locais do app), nunca ao do Bing.
 */
public class PonteJs {

    private final MainActivity tela;

    PonteJs(MainActivity tela) {
        this.tela = tela;
    }

    /** Abre uma página de resultados do Bing no WebView de baixo. */
    @JavascriptInterface
    public void pesquisar(final String url) {
        tela.runOnUiThread(() -> tela.pesquisar(url));
    }

    /** Mostra ou esconde a página do Bing (escondida, o painel ocupa a tela toda). */
    @JavascriptInterface
    public void mostrarBing(final boolean visivel) {
        tela.runOnUiThread(() -> tela.mostrarBing(visivel));
    }

    /** Liga/desliga a economia de dados (não carregar imagens). */
    @JavascriptInterface
    public void definirEconomia(final boolean ligada) {
        tela.runOnUiThread(() -> tela.definirEconomia(ligada));
    }
}
