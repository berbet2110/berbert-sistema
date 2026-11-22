# Mantém os métodos chamados pelo JavaScript (addJavascriptInterface) no build de release.
-keepclassmembers class br.com.berbert.bingbot.PonteJs {
    @android.webkit.JavascriptInterface <methods>;
}
