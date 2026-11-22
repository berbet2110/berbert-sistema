# Bot de Pesquisas (Bing) — Android

Aplicativo que gera assuntos aleatórios e faz pesquisas sucessivas no Bing, com controle total do usuário
(iniciar, pausar, continuar, parar), quantidade e intervalo configuráveis, contador, histórico e sem repetir
pesquisas recentes.

## Como instalar no celular

**Opção 1: app Android (APK)**
1. No GitHub, abra **Actions → "APK do Bot de Pesquisas"**, entre na execução mais recente e baixe o
   artefato **bot-de-pesquisas-apk** (é um .zip com o `app-debug.apk` dentro).
2. Copie o APK para o celular e abra-o. O Android vai pedir para permitir "instalar apps desconhecidos"
   para o app de arquivos/navegador usado.
3. Para gerar de novo: Actions → "APK do Bot de Pesquisas" → **Run workflow**.

Para compilar no computador: abra `android/` no Android Studio, ou rode `./gradlew assembleDebug`
nessa pasta (precisa do Android SDK). O APK sai em `android/app/build/outputs/apk/debug/`.

**Opção 2: sem instalar nada (PWA)**
A pasta `web/` é publicada no GitHub Pages pelo workflow "Publicar versão web" a cada push no `main`
(endereço: https://berbet2110.github.io/berbert-sistema/). Abra no Chrome do Android.
Para ativar uma única vez: no GitHub, **Settings → Pages → Source: GitHub Actions**.
Dá para "Adicionar à tela inicial". Nesse modo o Bing abre numa aba separada (sempre a mesma);
o Chrome reduz os temporizadores de abas em segundo plano, então o app Android é a opção mais estável.

## Como usar

1. Escolha a **quantidade** (1 a 100) e o **intervalo** (10 a 600 segundos).
2. Toque em **Iniciar**. A primeira pesquisa sai na hora; as próximas, a cada intervalo.
3. **Pausar** guarda o tempo que faltava; **Continuar** retoma dali. **Parar** encerra.
4. No app Android, a tela fica dividida: painel em cima, página do Bing embaixo. Dá para esconder a
   página do Bing e ligar a **economia de dados** (não carrega imagens).

## Como funciona

```
web/                 interface (a mesma no PWA e dentro do app Android)
  index.html
  css/app.css        visual mobile, tema claro/escuro automático
  js/termos.js       gerador de termos: listas de palavras + modelos de frase (~10 mil combinações)
  js/bot.js          motor: agenda, iniciar/pausar/parar, evita repetições, histórico (localStorage)
  js/app.js          liga a interface ao motor e escolhe como abrir o Bing (app ou aba)
  sw.js, manifest.json, icone.svg   instalação como PWA
android/             app nativo (Java, sem bibliotecas extras)
  MainActivity.java  dois WebViews: painel (assets da pasta web/) e página do Bing
  PonteJs.java       métodos que o JavaScript chama (pesquisar, mostrar Bing, economia)
```

- **Sem repetições:** um termo novo é sorteado até não coincidir com nenhuma das últimas 200 pesquisas
  (comparação sem acentos/maiúsculas).
- **Histórico:** últimas 300 pesquisas com horário, guardadas no próprio aparelho. Botão "Limpar".
- **Bateria e memória:** um único temporizador ativo; o relógio da contagem só roda durante a execução.
  No app Android não há serviço em segundo plano nem wake lock: ao sair da tela o bot pausa e os
  WebViews são congelados; ao voltar, continua sozinho. Sem bibliotecas: o APK é pequeno.

## Uso responsável do Bing

- As pesquisas abrem a página oficial de resultados (`https://www.bing.com/search?q=...`), uma por vez,
  com no mínimo 10 segundos entre elas e no máximo 100 por execução.
- O app **não** muda o user agent, não esconde a automação, não usa proxies e não tenta resolver captchas.
  Se o Bing mostrar uma verificação (captcha, desafio ou login), o bot **pausa** e mostra a página para
  você resolver manualmente.
- A API oficial de pesquisa do Bing (Bing Search API) foi descontinuada pela Microsoft em agosto de 2025;
  por isso o app usa o site público de resultados, como um navegador comum.
- **Microsoft Rewards:** os termos do programa proíbem pesquisas feitas por bots ou automação para ganhar
  pontos, e a Microsoft pode cancelar a conta e os pontos. Não use este app para isso.
