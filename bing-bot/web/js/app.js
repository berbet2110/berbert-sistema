/**
 * app.js — Interface: liga os botões e campos ao motor (bot.js) e escolhe
 * como a página do Bing será aberta.
 *
 * Dois "navegadores" possíveis:
 *  - NavegadorAndroid: quando a página roda dentro do app Android, o objeto `BingBotNativo`
 *    (injetado pelo Java) carrega o Bing num WebView na parte de baixo da tela. O app avisa
 *    de volta por `window.bingBotEvento(...)` quando a página carregou ou pediu verificação.
 *  - NavegadorAba: no Chrome/PWA, abre o Bing numa aba com nome fixo e reaproveita essa aba
 *    a cada pesquisa (uma aba só, sem acumular abas abertas).
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const LIM = BotPesquisas.LIMITES;
  const CHAVE_CONFIG = 'bingbot.config';
  const nativo = window.BingBotNativo || null;

  // ---- Navegadores --------------------------------------------------------------------

  const NavegadorAndroid = {
    abrir(url) { nativo.pesquisar(url); return true; },
  };

  const NavegadorAba = {
    aba: null,
    abrir(url) {
      try {
        if (this.aba && !this.aba.closed) {
          this.aba.location.href = url;   // reaproveita a mesma aba
          return true;
        }
      } catch (e) { /* aba inacessível: abre outra abaixo */ }
      this.aba = window.open(url, 'bingbot-pesquisa');
      return !!this.aba;                  // null = o navegador bloqueou a janela
    },
  };

  // ---- Configuração salva -------------------------------------------------------------

  function lerConfig() {
    try { return Object.assign({ quantidade: 10, intervalo: 30, economia: false, mostrarBing: true },
      JSON.parse(localStorage.getItem(CHAVE_CONFIG) || '{}')); }
    catch (e) { return { quantidade: 10, intervalo: 30, economia: false, mostrarBing: true }; }
  }
  function salvarConfig(cfg) {
    try { localStorage.setItem(CHAVE_CONFIG, JSON.stringify(cfg)); } catch (e) { /* ignora */ }
  }

  const config = lerConfig();
  const bot = new BotPesquisas(nativo ? NavegadorAndroid : NavegadorAba, atualizar);

  // ---- Elementos ----------------------------------------------------------------------

  const el = {
    estado: $('estado'), atual: $('atual'), feitas: $('feitas'), total: $('total'), proxima: $('proxima'),
    barra: $('barra'), barraPreenchida: $('barra-preenchida'), aviso: $('aviso'),
    iniciar: $('btn-iniciar'), pausar: $('btn-pausar'), parar: $('btn-parar'), limpar: $('btn-limpar'),
    quantidade: $('quantidade'), intervalo: $('intervalo'),
    historico: $('historico'), historicoVazio: $('historico-vazio'),
    mostrarBing: $('mostrar-bing'), economia: $('economia'),
  };

  const NOMES_ESTADO = { parado: 'Parado', rodando: 'Pesquisando', pausado: 'Pausado', concluido: 'Concluído' };
  const formatoHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatoData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

  // ---- Renderização -------------------------------------------------------------------

  /** Chamado pelo motor a cada mudança. Atualiza só o que precisa. */
  function atualizar(evento) {
    if (evento === 'tique') return mostrarContagem();
    if (evento === 'historico' || evento === 'pesquisa') mostrarHistorico();
    mostrarPainel();
  }

  function mostrarPainel() {
    const { estado } = bot;
    el.estado.textContent = NOMES_ESTADO[estado];
    el.estado.dataset.estado = estado;
    el.atual.textContent = bot.atual || 'Nenhuma ainda';
    el.feitas.textContent = bot.feitas;
    el.total.textContent = bot.total;
    el.barra.setAttribute('aria-valuemax', bot.total);
    el.barra.setAttribute('aria-valuenow', bot.feitas);
    el.barraPreenchida.style.width = Math.min(100, (bot.feitas / bot.total) * 100) + '%';

    const emExecucao = estado === 'rodando' || estado === 'pausado';
    el.iniciar.disabled = estado === 'rodando';
    el.iniciar.querySelector('span').textContent = estado === 'pausado' ? 'Continuar' : 'Iniciar';
    el.pausar.disabled = estado !== 'rodando';
    el.parar.disabled = !emExecucao;
    // Durante a execução a configuração fica travada para não confundir o progresso.
    document.querySelectorAll('#config input[type=number], .btn-passo').forEach((c) => { c.disabled = emExecucao; });

    if (bot.motivoPausa) { el.aviso.textContent = bot.motivoPausa; el.aviso.hidden = false; }
    else if (estado === 'concluido') { el.aviso.textContent = 'Todas as pesquisas foram feitas.'; el.aviso.hidden = false; }
    else el.aviso.hidden = true;

    mostrarContagem();
  }

  function mostrarContagem() {
    const s = bot.segundosParaProxima();
    el.proxima.textContent = (bot.estado === 'rodando' || bot.estado === 'pausado') && s > 0
      ? 'próxima em ' + (s >= 60 ? Math.floor(s / 60) + 'min ' + String(s % 60).padStart(2, '0') + 's' : s + 's')
      : '';
  }

  function mostrarHistorico() {
    const hoje = new Date().toDateString();
    const itens = bot.historico.slice(0, 100);  // a lista na tela mostra as 100 mais recentes
    const frag = document.createDocumentFragment();
    for (const h of itens) {
      const li = document.createElement('li');
      const termo = document.createElement('span');
      termo.className = 'termo';
      termo.textContent = h.q;
      const quando = document.createElement('time');
      const d = new Date(h.t);
      quando.dateTime = d.toISOString();
      quando.textContent = (d.toDateString() === hoje ? '' : formatoData.format(d) + ' ') + formatoHora.format(d);
      li.append(termo, quando);
      frag.append(li);
    }
    el.historico.replaceChildren(frag);
    el.historicoVazio.hidden = itens.length > 0;
    el.limpar.hidden = itens.length === 0;
  }

  // ---- Eventos da interface -----------------------------------------------------------

  function aplicarCampos() {
    bot.configurar({ quantidade: el.quantidade.value, intervalo: el.intervalo.value });
    el.quantidade.value = bot.total;
    el.intervalo.value = bot.intervaloSeg;
    config.quantidade = bot.total;
    config.intervalo = bot.intervaloSeg;
    salvarConfig(config);
  }

  el.quantidade.addEventListener('change', aplicarCampos);
  el.intervalo.addEventListener('change', aplicarCampos);
  document.querySelectorAll('.btn-passo').forEach((b) => b.addEventListener('click', () => {
    const campo = $(b.dataset.alvo);
    campo.value = Number(campo.value || 0) + Number(b.dataset.passo);
    aplicarCampos();
  }));

  el.iniciar.addEventListener('click', () => {
    if (bot.estado === 'pausado') return bot.continuar();
    aplicarCampos();
    bot.iniciar();
  });
  el.pausar.addEventListener('click', () => bot.pausar());
  el.parar.addEventListener('click', () => bot.parar());
  el.limpar.addEventListener('click', () => {
    if (confirm('Apagar todo o histórico de pesquisas?')) bot.limparHistorico();
  });

  // ---- Integração com o app Android ---------------------------------------------------

  if (nativo) {
    $('opcoes-android').hidden = false;
    el.mostrarBing.checked = config.mostrarBing;
    el.economia.checked = config.economia;
    nativo.mostrarBing(config.mostrarBing);
    nativo.definirEconomia(config.economia);
    el.mostrarBing.addEventListener('change', () => {
      config.mostrarBing = el.mostrarBing.checked; salvarConfig(config); nativo.mostrarBing(config.mostrarBing);
    });
    el.economia.addEventListener('change', () => {
      config.economia = el.economia.checked; salvarConfig(config); nativo.definirEconomia(config.economia);
    });
  }

  /**
   * Eventos enviados pelo app Android sobre o WebView do Bing.
   * { tipo: 'verificacao' } — o Bing pediu uma verificação (captcha/login): o bot PAUSA
   *                            e o usuário resolve manualmente. O bot não tenta contornar.
   * { tipo: 'erro', mensagem } — falha de rede ao carregar: pausa também.
   * { tipo: 'segundo-plano' | 'primeiro-plano' } — o app saiu/voltou para a tela: pausa e
   *                            retoma sozinho, para não gastar bateria em segundo plano.
   */
  const MSG_SEGUNDO_PLANO = 'Pausado porque o app saiu da tela. Continua sozinho quando você voltar.';
  window.bingBotEvento = function (ev) {
    if (!ev) return;
    if (ev.tipo === 'primeiro-plano') {
      // Voltou para o app: retoma só se a pausa foi causada por ter saído da tela.
      if (bot.estado === 'pausado' && bot.motivoPausa === MSG_SEGUNDO_PLANO) bot.continuar();
      return;
    }
    if (bot.estado !== 'rodando') return;
    if (ev.tipo === 'segundo-plano') {
      bot.pausar(MSG_SEGUNDO_PLANO);
    } else if (ev.tipo === 'verificacao') {
      bot.pausar('O Bing pediu uma verificação. Resolva na página abaixo e toque em Continuar.');
      if (nativo) { nativo.mostrarBing(true); el.mostrarBing.checked = true; config.mostrarBing = true; salvarConfig(config); }
    } else if (ev.tipo === 'erro') {
      bot.pausar('Não foi possível carregar o Bing (' + (ev.mensagem || 'sem conexão') + '). Toque em Continuar.');
    }
  };

  // ---- Início -------------------------------------------------------------------------

  el.quantidade.min = LIM.quantidadeMin; el.quantidade.max = LIM.quantidadeMax;
  el.intervalo.min = LIM.intervaloMin; el.intervalo.max = LIM.intervaloMax;
  el.quantidade.value = config.quantidade;
  el.intervalo.value = config.intervalo;
  bot.configurar({ quantidade: config.quantidade, intervalo: config.intervalo });
  $('dica-limites').textContent = `Até ${LIM.quantidadeMax} pesquisas por vez, com pelo menos ${LIM.intervaloMin} s entre elas.`
    + (nativo ? ' O bot pausa quando o app sai da tela e continua quando você volta, para poupar bateria.' : ' O Bing abre numa aba separada, sempre a mesma.');
  mostrarHistorico();
  mostrarPainel();

  // Instalação como app (PWA) quando servido por http(s). No app Android não é necessário.
  if (!nativo && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
