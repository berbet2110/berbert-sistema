/**
 * termos.js — Gerador de termos de pesquisa aleatórios.
 *
 * Combina listas de palavras (temas, cidades, animais, comidas...) com modelos de frase
 * ("como fazer {x}", "história de {lugar}"...) para produzir milhares de pesquisas
 * diferentes e naturais em português. Não depende de rede nem de bibliotecas.
 *
 * Uso:  GeradorTermos.gerar()                -> "curiosidades sobre o polvo"
 *       GeradorTermos.gerarUnico(recentes)   -> termo que não está no conjunto `recentes`
 */
(function (global) {
  'use strict';

  // ---- Listas de palavras -------------------------------------------------------------
  const L = {
    cidade: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Fortaleza', 'Recife', 'Curitiba',
      'Porto Alegre', 'Manaus', 'Belém', 'Goiânia', 'Florianópolis', 'Natal', 'João Pessoa', 'Maceió', 'Vitória',
      'Campinas', 'Santos', 'Ouro Preto', 'Paraty', 'Gramado', 'Bonito', 'Foz do Iguaçu', 'Lisboa', 'Porto',
      'Madri', 'Barcelona', 'Paris', 'Roma', 'Londres', 'Tóquio', 'Nova York', 'Buenos Aires', 'Santiago',
      'Montevidéu', 'Cidade do México', 'Cairo', 'Istambul', 'Sydney', 'Toronto', 'Berlim', 'Amsterdã', 'Praga'],
    pais: ['Brasil', 'Portugal', 'Japão', 'Itália', 'França', 'Canadá', 'Austrália', 'Noruega', 'Islândia', 'Egito',
      'Marrocos', 'Peru', 'Chile', 'Argentina', 'México', 'Índia', 'Tailândia', 'Grécia', 'Irlanda', 'Escócia',
      'Nova Zelândia', 'Coreia do Sul', 'Vietnã', 'Quênia', 'África do Sul', 'Finlândia', 'Suíça', 'Croácia'],
    animal: ['polvo', 'golfinho', 'onça-pintada', 'arara-azul', 'tamanduá', 'capivara', 'bicho-preguiça', 'pinguim',
      'tubarão-baleia', 'elefante', 'girafa', 'camaleão', 'coruja', 'beija-flor', 'tartaruga marinha', 'lobo-guará',
      'axolote', 'ornitorrinco', 'baleia jubarte', 'abelha', 'formiga', 'cavalo-marinho', 'lontra', 'panda',
      'tucano', 'mico-leão-dourado', 'jacaré', 'água-viva', 'falcão-peregrino', 'raposa'],
    comida: ['pão de queijo', 'feijoada', 'moqueca', 'brigadeiro', 'lasanha', 'risoto', 'tapioca', 'coxinha',
      'bolo de cenoura', 'pudim', 'escondidinho', 'arroz carreteiro', 'pão caseiro', 'sopa de legumes', 'panqueca',
      'torta de limão', 'strogonoff', 'acarajé', 'vatapá', 'baião de dois', 'cuscuz', 'quiche', 'nhoque',
      'curry de grão-de-bico', 'salada de quinoa', 'pizza caseira', 'sushi', 'ramen', 'pão de banana', 'granola'],
    tema: ['astronomia', 'fotografia', 'jardinagem', 'xadrez', 'meditação', 'programação', 'marcenaria', 'origami',
      'violão', 'piano', 'desenho', 'aquarela', 'corrida', 'ciclismo', 'yoga', 'natação', 'escalada', 'culinária',
      'finanças pessoais', 'inteligência artificial', 'robótica', 'história antiga', 'filosofia', 'geologia',
      'ornitologia', 'cerâmica', 'crochê', 'escrita criativa', 'oratória', 'idiomas', 'café especial', 'astrofísica',
      'energia solar', 'reciclagem', 'compostagem', 'mitologia grega', 'arqueologia', 'botânica', 'música clássica'],
    conceito: ['buraco negro', 'fotossíntese', 'inflação', 'blockchain', 'efeito estufa', 'DNA', 'teoria da relatividade',
      'computação quântica', 'aurora boreal', 'placas tectônicas', 'sistema imunológico', 'juros compostos',
      'energia renovável', 'eclipse solar', 'metabolismo', 'algoritmo', 'biodiversidade', 'entropia', 'vacina de mRNA',
      'matéria escura', 'ciclo da água', 'neuroplasticidade', 'fusão nuclear', 'efeito placebo', 'marés',
      'big bang', 'antimatéria', 'seleção natural', 'microbioma', 'supercondutor'],
    planta: ['suculenta', 'orquídea', 'samambaia', 'manjericão', 'alecrim', 'lavanda', 'jiboia', 'costela-de-adão',
      'cacto', 'hortelã', 'tomate cereja', 'morango', 'bonsai', 'girassol', 'lírio-da-paz', 'zamioculca',
      'espada-de-são-jorge', 'pimenta', 'limoeiro', 'bananeira'],
    objeto: ['fone de ouvido', 'notebook', 'bicicleta', 'cafeteira', 'mochila', 'tênis de corrida', 'cadeira de escritório',
      'smartwatch', 'liquidificador', 'air fryer', 'barraca de camping', 'câmera fotográfica', 'teclado mecânico',
      'luminária', 'garrafa térmica', 'panela de pressão', 'impressora', 'roteador', 'caixa de som', 'telescópio'],
    pessoa: ['Santos Dumont', 'Machado de Assis', 'Clarice Lispector', 'Marie Curie', 'Albert Einstein', 'Leonardo da Vinci',
      'Isaac Newton', 'Ada Lovelace', 'Galileu Galilei', 'Carlos Drummond de Andrade', 'Tarsila do Amaral',
      'Oscar Niemeyer', 'Nikola Tesla', 'Charles Darwin', 'Frida Kahlo', 'Vinicius de Moraes', 'Cecília Meireles',
      'Alan Turing', 'Carl Sagan', 'Cora Coralina', 'Villa-Lobos', 'Portinari'],
    lugar: ['Machu Picchu', 'Pirâmides de Gizé', 'Coliseu', 'Grande Muralha da China', 'Petra', 'Stonehenge',
      'Cristo Redentor', 'Lençóis Maranhenses', 'Chapada Diamantina', 'Fernando de Noronha', 'Pantanal',
      'Amazônia', 'Monte Everest', 'Deserto do Atacama', 'Patagônia', 'Torre Eiffel', 'Angkor Wat', 'Capadócia',
      'Salar de Uyuni', 'Cataratas do Iguaçu', 'Jalapão', 'Ilha de Páscoa', 'Alhambra', 'Taj Mahal'],
    esporte: ['futebol', 'vôlei', 'basquete', 'tênis', 'surfe', 'skate', 'handebol', 'judô', 'jiu-jítsu', 'atletismo',
      'ginástica artística', 'canoagem', 'remo', 'badminton', 'tênis de mesa', 'beisebol', 'rúgbi', 'esgrima'],
    habilidade: ['aprender inglês', 'organizar a rotina', 'economizar dinheiro', 'dormir melhor', 'fazer pão',
      'cuidar de plantas', 'tirar fotos com o celular', 'aprender a programar', 'tocar violão', 'meditar',
      'fazer compostagem', 'montar um currículo', 'falar em público', 'estudar para provas', 'começar a correr',
      'fazer café coado', 'desenhar rostos', 'consertar uma torneira', 'pintar uma parede', 'fazer uma horta'],
    // Adjetivos que servem para masculino e feminino ("filmes fáceis", "receitas fáceis").
    adjetivo: ['fáceis', 'simples', 'incríveis', 'populares', 'imperdíveis', 'acessíveis', 'interessantes',
      'relaxantes', 'emocionantes', 'inesquecíveis', 'originais', 'essenciais'],
    plural: ['livros', 'filmes', 'documentários', 'jogos de tabuleiro', 'podcasts', 'séries', 'museus', 'parques',
      'praias', 'trilhas', 'aplicativos', 'receitas', 'exercícios', 'lugares para visitar', 'músicas', 'álbuns'],
    ano: ['de 2025', 'de 2026', 'dos anos 70', 'dos anos 80', 'dos anos 90', 'dos anos 2000', 'de todos os tempos'],
  };

  // ---- Modelos de frase ---------------------------------------------------------------
  // {chave} é trocado por um item aleatório da lista L[chave].
  const MODELOS = [
    'curiosidades sobre {animal}', 'habitat {animal}', 'expectativa de vida {animal}', '{animal} o que come',
    'receita de {comida}', 'como fazer {comida} fácil', '{comida} receita tradicional', 'origem {comida}',
    'previsão do tempo em {cidade}', 'o que fazer em {cidade}', 'pontos turísticos de {cidade}',
    'melhor época para visitar {cidade}', 'história de {cidade}', 'população de {cidade}',
    '{pais} cultura e tradições', 'comidas típicas {pais}', 'curiosidades {pais}', 'roteiro de viagem {pais}',
    'o que é {conceito}', '{conceito} explicação simples', 'como funciona {conceito}', '{conceito} para crianças',
    '{tema} para iniciantes', 'como começar em {tema}', 'cursos gratuitos de {tema}', 'livros sobre {tema}',
    '{tema} história e origem', 'dicas de {tema}',
    'como cuidar de {planta}', '{planta} rega e luz', 'como plantar {planta} em vaso',
    'como escolher {objeto}', '{objeto} custo benefício', 'como limpar {objeto}',
    'biografia de {pessoa}', 'frases de {pessoa}', 'obras de {pessoa}', 'quem foi {pessoa}',
    'história de {lugar}', 'como chegar em {lugar}', 'curiosidades sobre {lugar}', 'fotos de {lugar}',
    'regras de {esporte}', 'história de {esporte}', 'benefícios de praticar {esporte}',
    'como {habilidade}', 'dicas para {habilidade}', 'passo a passo para {habilidade}',
    'melhores {plural} {ano}', '{plural} {adjetivo}', '{plural} sobre {tema}', '{plural} {adjetivo} sobre {tema}',
    '{plural} em {cidade}',
  ];

  /** Item aleatório de uma lista. */
  function sortear(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
  }

  /** Gera um termo aleatório preenchendo um modelo. */
  function gerar() {
    return sortear(MODELOS).replace(/\{(\w+)\}/g, (_, chave) => sortear(L[chave]));
  }

  /** Forma normalizada (sem acento/maiúscula/espaço extra) para comparar repetições. */
  function normalizar(termo) {
    return termo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /**
   * Gera um termo que não esteja em `recentes` (Set de termos normalizados).
   * Tenta várias vezes; o espaço de combinações é grande, então quase sempre acha na 1ª ou 2ª.
   */
  function gerarUnico(recentes, tentativas = 50) {
    let termo = gerar();
    for (let i = 0; i < tentativas && recentes && recentes.has(normalizar(termo)); i++) termo = gerar();
    return termo;
  }

  /** Quantidade aproximada de combinações possíveis (informativo). */
  function totalCombinacoes() {
    return MODELOS.reduce((soma, m) => {
      const chaves = m.match(/\{(\w+)\}/g) || [];
      return soma + chaves.reduce((p, c) => p * L[c.slice(1, -1)].length, 1);
    }, 0);
  }

  global.GeradorTermos = { gerar, gerarUnico, normalizar, totalCombinacoes };
})(typeof window !== 'undefined' ? window : globalThis);
