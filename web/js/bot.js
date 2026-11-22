/**
 * bot.js — Motor do bot: agenda as pesquisas, controla iniciar/pausar/parar,
 * evita repetições e guarda o histórico.
 *
 * O motor não sabe COMO a página do Bing é aberta: isso fica com um "navegador"
 * (ver Navegadores em app.js), que tem um único método `abrir(url)`:
 *   - no app Android, a página é carregada num WebView nativo, dentro do próprio app;
 *   - no navegador comum (PWA), ela é aberta numa aba separada, reaproveitada a cada pesquisa.
 *
 * Economia de bateria: existe no máximo UM temporizador ativo (a próxima pesquisa) e um
 * relógio de 1 s só para a contagem regressiva, que é desligado quando o bot não está rodando.
 */
(function (global) {
  'use strict';

  /** Limites que respeitam o uso normal do Bing. Não são configuráveis além disso. */
  const LIMITES = Object.freeze({
    quantidadeMin: 1,
    quantidadeMax: 100,     // máximo de pesquisas por execução
    intervaloMin: 10,       // segundos entre pesquisas (mínimo)
    intervaloMax: 600,      // segundos entre pesquisas (máximo)
    historicoMax: 300,      // itens guardados no histórico
    recentesMax: 200,       // quantas pesquisas recentes não podem se repetir
  });

  const CHAVE_HISTORICO = 'bingbot.historico';

  /** Lê/grava no localStorage sem quebrar se ele estiver indisponível (aba anônima etc.). */
  const armazenamento = {
    ler(chave, padrao) {
      try { const v = localStorage.getItem(chave); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; }
    },
    gravar(chave, valor) {
      try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* sem armazenamento: segue só em memória */ }
    },
  };

  /** Monta o endereço oficial de resultados do Bing para um termo. */
  function urlBing(termo) {
    return 'https://www.bing.com/search?q=' + encodeURIComponent(termo);
  }

  function limitar(valor, min, max) {
    const n = Math.round(Number(valor));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
  }

  class BotPesquisas {
    /**
     * @param {{abrir(url:string): boolean}} navegador  quem abre a página; `abrir` devolve false se não conseguiu.
     * @param {(evento:string, dados?:any) => void} aoMudar  avisa a interface de cada mudança.
     */
    constructor(navegador, aoMudar) {
      this.navegador = navegador;
      this.aoMudar = aoMudar || function () {};
      this.estado = 'parado';          // 'parado' | 'rodando' | 'pausado' | 'concluido'
      this.motivoPausa = '';
      this.feitas = 0;
      this.total = 10;
      this.intervaloSeg = 30;
      this.atual = '';
      this.proximaEm = 0;              // timestamp (ms) da próxima pesquisa
      this.restanteMs = 0;             // tempo que faltava quando pausou
      this._temporizador = null;
      this._relogio = null;
      this.historico = armazenamento.ler(CHAVE_HISTORICO, []);
    }

    /** Aplica a configuração (só vale para a próxima execução se já estiver rodando). */
    configurar({ quantidade, intervalo }) {
      if (quantidade !== undefined) this.total = limitar(quantidade, LIMITES.quantidadeMin, LIMITES.quantidadeMax);
      if (intervalo !== undefined) this.intervaloSeg = limitar(intervalo, LIMITES.intervaloMin, LIMITES.intervaloMax);
      this.aoMudar('config');
    }

    // ---- Controles ------------------------------------------------------------------

    /** Começa do zero e já faz a primeira pesquisa (precisa vir de um toque do usuário no PWA). */
    iniciar() {
      if (this.estado === 'rodando') return;
      if (this.estado === 'pausado') return this.continuar();
      this.feitas = 0;
      this.atual = '';
      this.motivoPausa = '';
      this._mudarEstado('rodando');
      this._pesquisar();
    }

    /** Pausa guardando quanto faltava para a próxima pesquisa. */
    pausar(motivo) {
      if (this.estado !== 'rodando') return;
      this.restanteMs = Math.max(0, this.proximaEm - Date.now());
      this._limparTemporizadores();
      this.motivoPausa = motivo || '';
      this._mudarEstado('pausado');
    }

    /** Retoma de onde parou. */
    continuar() {
      if (this.estado !== 'pausado') return;
      this.motivoPausa = '';
      this._mudarEstado('rodando');
      // Se a pausa aconteceu porque a página não abriu, tenta de novo já.
      if (!this.atual || this.restanteMs <= 0) this._pesquisar();
      else this._agendar(this.restanteMs);
    }

    /** Encerra a execução. O histórico continua guardado. */
    parar() {
      this._limparTemporizadores();
      this.motivoPausa = '';
      this.restanteMs = 0;
      this._mudarEstado('parado');
    }

    limparHistorico() {
      this.historico = [];
      armazenamento.gravar(CHAVE_HISTORICO, this.historico);
      this.aoMudar('historico');
    }

    /** Segundos até a próxima pesquisa (para a contagem regressiva). */
    segundosParaProxima() {
      if (this.estado === 'pausado') return Math.ceil(this.restanteMs / 1000);
      if (this.estado !== 'rodando' || !this.proximaEm) return 0;
      return Math.max(0, Math.ceil((this.proximaEm - Date.now()) / 1000));
    }

    // ---- Internos -------------------------------------------------------------------

    /** Termos que não podem se repetir agora: os últimos do histórico. */
    _recentes() {
      const N = GeradorTermos.normalizar;
      return new Set(this.historico.slice(0, LIMITES.recentesMax).map((h) => N(h.q)));
    }

    _pesquisar() {
      if (this.estado !== 'rodando') return;
      const termo = GeradorTermos.gerarUnico(this._recentes());
      const abriu = this.navegador.abrir(urlBing(termo));
      if (abriu === false) {
        // Ex.: o navegador bloqueou a aba. Não conta a pesquisa; espera o usuário tocar em Continuar.
        this.atual = '';
        this.restanteMs = 0;
        this._limparTemporizadores();
        this.motivoPausa = 'Não foi possível abrir o Bing. Toque em Continuar para tentar de novo.';
        this._mudarEstado('pausado');
        return;
      }
      this.atual = termo;
      this.feitas += 1;
      this.historico.unshift({ q: termo, t: Date.now() });
      if (this.historico.length > LIMITES.historicoMax) this.historico.length = LIMITES.historicoMax;
      armazenamento.gravar(CHAVE_HISTORICO, this.historico);
      this.aoMudar('pesquisa', termo);

      if (this.feitas >= this.total) {
        this._limparTemporizadores();
        this.proximaEm = 0;
        this._mudarEstado('concluido');
      } else {
        this._agendar(this.intervaloSeg * 1000);
      }
    }

    _agendar(ms) {
      this._limparTemporizadores();
      this.proximaEm = Date.now() + ms;
      this._temporizador = setTimeout(() => this._pesquisar(), ms);
      this._relogio = setInterval(() => this.aoMudar('tique'), 1000);
      this.aoMudar('tique');
    }

    _limparTemporizadores() {
      clearTimeout(this._temporizador);
      clearInterval(this._relogio);
      this._temporizador = this._relogio = null;
    }

    _mudarEstado(novo) {
      this.estado = novo;
      this.aoMudar('estado', novo);
    }
  }

  global.BotPesquisas = BotPesquisas;
  global.BotPesquisas.LIMITES = LIMITES;
  global.BotPesquisas.urlBing = urlBing;
})(typeof window !== 'undefined' ? window : globalThis);
