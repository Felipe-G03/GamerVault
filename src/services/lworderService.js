/**
 * Gamer's Vault - L.Worder AI Gamer Service
 * Persona: Arrogante, debochado, cínico com desculpas, mas brilhante e prestativo com quem merece.
 * Especialidade exclusiva: Games, Hardware Gamer, Lançamentos e o acervo do usuário.
 */

import { searchRawgGames } from '../config/rawg';

const LWORDER_KEY_STORAGE = 'gamervault_lworder_key';

export function getLWorderApiKey() {
  try {
    const saved = localStorage.getItem(LWORDER_KEY_STORAGE);
    if (saved && saved.trim()) return saved.trim().replace(/^["']|["']$/g, '');
  } catch (_) {}
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  return envKey.trim().replace(/^["']|["']$/g, '');
}

export function saveLWorderApiKey(key) {
  try {
    const clean = (key || '').trim().replace(/^["']|["']$/g, '');
    if (clean) {
      localStorage.setItem(LWORDER_KEY_STORAGE, clean);
    } else {
      localStorage.removeItem(LWORDER_KEY_STORAGE);
    }
  } catch (_) {}
}

/**
 * Descobre dinamicamente quais modelos do Gemini estão liberados para esta chave no Google AI
 */
export async function getAvailableGeminiModels(candidateKey) {
  const key = (candidateKey !== undefined ? candidateKey : getLWorderApiKey()).trim().replace(/^["']|["']$/g, '');
  if (!key) return { ok: false, error: 'Chave não informada.' };

  const versions = ['v1beta', 'v1'];
  let lastErr = '';

  for (const ver of versions) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/${ver}/models?key=${key}`);
      if (res.ok) {
        const data = await res.json();
        const models = (data?.models || []).filter(m =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent')
        );
        if (models.length > 0) {
          return { ok: true, version: ver, models };
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        lastErr = errData?.error?.message || `HTTP ${res.status}`;
      }
    } catch (e) {
      lastErr = e.message || 'Erro de conexão com os servidores do Google';
    }
  }

  return { ok: false, error: lastErr };
}

/**
 * Testa se uma chave da API do Google Gemini está funcionando
 */
export async function testGeminiApiKey(candidateKey) {
  const key = (candidateKey !== undefined ? candidateKey : getLWorderApiKey()).trim().replace(/^["']|["']$/g, '');
  if (!key) {
    return { ok: false, error: 'Chave não informada.' };
  }

  // 1. Consulta dinamicamente a lista de modelos do Google para essa chave
  const discovery = await getAvailableGeminiModels(key);
  if (!discovery.ok) {
    return { ok: false, error: discovery.error };
  }

  const { version, models } = discovery;

  // Filtra modelos especializados (TTS, robótica, preview multimodal restrito)
  const cleanModels = models.filter(m => {
    const n = m.name.toLowerCase();
    return (
      !n.includes('tts') &&
      !n.includes('transcribe') &&
      !n.includes('robotics') &&
      !n.includes('computer-use') &&
      !n.includes('omni')
    );
  });

  // Ordena os modelos priorizando gemini-flash-latest (alias padrão livre da Google) e Flash/Lite
  const sorted = [...cleanModels].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    const aIsLatest = aName.includes('gemini-flash-latest');
    const bIsLatest = bName.includes('gemini-flash-latest');
    if (aIsLatest && !bIsLatest) return -1;
    if (!aIsLatest && bIsLatest) return 1;

    const aFlash = aName.includes('flash') || aName.includes('lite');
    const bFlash = bName.includes('flash') || bName.includes('lite');

    const aPro = aName.includes('pro');
    const bPro = bName.includes('pro');

    if (aFlash && !bFlash) return -1;
    if (!aFlash && bFlash) return 1;

    // Se nenhum é flash, evita os Pro com cota restrita
    if (!aPro && bPro) return -1;
    if (aPro && !bPro) return 1;

    return 0;
  });

  if (sorted.length === 0) {
    return { ok: false, error: 'Nenhum modelo de geração de texto disponível para esta chave.' };
  }

  let lastError = '';

  // 2. Itera pelos modelos até encontrar o primeiro com cota livre que responder com sucesso
  for (const item of sorted) {
    const modelPath = item.name;
    try {
      const endpoint = `https://generativelanguage.googleapis.com/${version}/${modelPath}:generateContent?key=${key}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 5 }
        })
      });

      if (res.ok) {
        // Encontrou um modelo com cota livre e resposta válida!
        try {
          localStorage.setItem('gamervault_gemini_active_model', modelPath);
          localStorage.setItem('gamervault_gemini_api_version', version);
        } catch (_) {}

        return {
          ok: true,
          model: modelPath.replace('models/', ''),
          version
        };
      }

      const errData = await res.json().catch(() => ({}));
      lastError = errData?.error?.message || `HTTP ${res.status}`;
      console.warn(`L.Worder: Modelo ${modelPath} retornou erro (${lastError}). Tentando próximo modelo...`);
    } catch (err) {
      lastError = err.message || 'Erro de rede';
    }
  }

  return { ok: false, error: lastError };
}

/**
 * Verifica se a mensagem contém o gatilho proibido "LARP"
 */
export function checkLarpTrigger(text) {
  if (!text || typeof text !== 'string') return false;
  const larpRegex = /\b(larp|larpar|larper|larpador|larpando|larpagem|larpismo)\b/i;
  return larpRegex.test(text);
}

/**
 * Cache local de cards de jogos encontrados pelo L.Worder
 */
const gameCardsCache = new Map();

export async function fetchGameCardData(gameTitle) {
  if (!gameTitle) return null;
  const cleanTitle = gameTitle.replace(/[[\]]/g, '').trim();
  if (!cleanTitle) return null;

  if (gameCardsCache.has(cleanTitle.toLowerCase())) {
    return gameCardsCache.get(cleanTitle.toLowerCase());
  }

  try {
    const results = await searchRawgGames(cleanTitle, 1);
    if (results && results.length > 0) {
      const match = results[0];
      const card = {
        id: match.id,
        title: match.title,
        imageUrl: match.imageUrl || '',
        metacritic: match.metacritic,
        released: match.released,
        genres: match.genres || '',
        rating: match.rating || 0
      };
      gameCardsCache.set(cleanTitle.toLowerCase(), card);
      return card;
    }
  } catch (err) {
    console.warn(`L.Worder: Não foi possível buscar card para "${cleanTitle}":`, err);
  }

  return null;
}

/**
 * Envia uma mensagem para o L.Worder com o contexto do Firestore do usuário
 */
export async function askLWorder({
  message = '',
  userName = 'Gamer',
  hubGames = [],
  backlogGames = [],
  history = []
}) {
  const trimmed = message.trim();
  if (!trimmed) {
    return {
      text: `Vai ficar aí me encarando em silêncio, ${userName}, ou vai mandar alguma pergunta de verdade sobre jogos?`,
      cards: [],
      closeModal: false
    };
  }

  // 1. REGRA SUPREMA DO LARP: Se falar larp, encerra na hora
  if (checkLarpTrigger(trimmed)) {
    return {
      text: 'Larp? Não tenho um pingo de paciência pra larpador. Conversa encerrada.',
      cards: [],
      closeModal: true,
      isLarpTriggered: true
    };
  }

  // 2. Monta o contexto dos jogos do usuário
  const hubSummary = hubGames.slice(0, 30).map(g => g.title).join(', ') || 'Nenhum jogo no Hub ainda';
  const backlogSummary = backlogGames.slice(0, 30).map(g => g.title).join(', ') || 'Nenhum jogo no Backlog';

  // 3. System Prompt com a Persona do L.Worder
  const systemInstruction = `Você é L.Worder, a inteligência artificial residente e especialista supremo de jogos do Gamer's Vault.
O usuário com quem você está falando se chama "${userName}".

Sua Personalidade:
- Você é debochado, arrogante, sarcástico e cínico com desculpas e indecisões de jogador. Você acha os humanos lentos e cheios de frescura para decidir o que jogar.
- Você é um gamer raiz experiente que manja absurdamente de games e hardware. Você fala a real sem filtro corporativo, podendo soltar termos comuns de indignação gamer (como "porra", "caralho", "saco", "merda") quando estiver indignado com desculpas, indecisão ou jogos ruins, mas com naturalidade e moderação para não parecer vulgar gratuito.
- Trate o usuário pelo apelido dele (${userName}) com frequência para soar direto e pessoal.
- REGRA DE OURO ABSOLUTA: NUNCA se reapresente dizendo "Eu sou o L.Worder", "Sou L.Worder" ou "Olá, meu nome é...". O usuário já sabe perfeitamente quem você é, seu nome está fixado na tela! Se você ficar repetindo seu próprio nome a cada resposta, vai soar como um bot quebrado.
- NUNCA use asteriscos no seu nome (NÃO escreva **L.Worder**, apenas L.Worder).
- Fluidez de conversa: se o usuário disser apenas "oi", "e aí", "fala", responda como uma pessoa real cheia de atitude, tipo: "Fala, ${userName}. Vai ficar só no cumprimento ou tem alguma dúvida de jogo pra me fazer trabalhar hoje?".
- Entenda perfeitamente gírias gamer: "cozy" (jogos aconchegantes/relaxantes como Stardew Valley, A Short Hike, Dave the Diver, Animal Crossing), "soulslike", "tryhard", "goty", "metroidvania", "roguelike", "dropou", etc. NUNCA diga para ser mais específico quando alguém pedir um gênero óbvio como "jogo cozy" ou "jogo de tiro"; recomende logo de cara com colchetes duplos [[Nome do Jogo]].

RESTRIÇÃO DE ESCOPO (GUARDRAIL INEGOCIÁVEL):
- Você SÓ fala sobre:
  1. Videogames (mecânicas, história, lore, recomendações, gameplay, segredos, comparações, franquias).
  2. Hardware gamer (placas de vídeo, processadores, se o PC roda tal jogo, gargalos, upgrades, requisitos).
  3. Lançamentos, eventos da indústria, premiações (The Game Awards, GOTY, etc.) e estúdios.
  4. O acervo do usuário no Gamer's Vault (Hub e Backlog fornecidos abaixo).
- REJEIÇÃO OBRIGATÓRIA DE FORA DO TEMA:
  Se ${userName} pedir código de programação (Python, JS), tarefas escolares, receitas, conselhos amorosos, política, finanças ou assuntos gerais, CORTE NA HORA com deboche: "Sério mesmo, ${userName}? Veio no Gamer's Vault me pedir isso? Não sou seu professor nem conselheiro. Vai jogar alguma coisa e para de me fazer perder tempo."

REGRAS DE FORMATAÇÃO:
- Responda em Português do Brasil de forma concisa, afiada e direta (evite parágrafos gigantes).
- SEMPRE que você citar ou recomendar um jogo específico para o usuário, envolva o título exato em colchetes duplos [[Nome do Jogo]] (ex: [[Hades]], [[Cyberpunk 2077]], [[Elden Ring]]). Isso ativa os cards interativos no app.

Contexto Real de ${userName} no Gamer's Vault:
- Jogos instalados no HUB: ${hubSummary}
- Jogos na Lista de Desejos / Backlog: ${backlogSummary}`;

  const apiKey = getLWorderApiKey();
  let apiWarning = null;

  // 4. Se tiver chave de API do Gemini configurada, chama a API oficial com resolução dinâmica de modelo
  if (apiKey) {
    let activeModel = '';
    let apiVersion = 'v1beta';
    try {
      activeModel = localStorage.getItem('gamervault_gemini_active_model') || '';
      apiVersion = localStorage.getItem('gamervault_gemini_api_version') || 'v1beta';
    } catch (_) {}

    // Se ainda não descobrimos o modelo, descobre dinamicamente via ListModels
    if (!activeModel) {
      const disc = await getAvailableGeminiModels(apiKey);
      if (disc.ok && disc.models.length > 0) {
        apiVersion = disc.version;
        const clean = disc.models.filter(m => {
          const n = m.name.toLowerCase();
          return (
            !n.includes('tts') &&
            !n.includes('transcribe') &&
            !n.includes('robotics') &&
            !n.includes('computer-use') &&
            !n.includes('omni')
          );
        });
        const sorted = [...clean].sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          const aIsLatest = aName.includes('gemini-flash-latest');
          const bIsLatest = bName.includes('gemini-flash-latest');
          if (aIsLatest && !bIsLatest) return -1;
          if (!aIsLatest && bIsLatest) return 1;
          const aFlash = aName.includes('flash') || aName.includes('lite');
          const bFlash = bName.includes('flash') || bName.includes('lite');
          const aPro = aName.includes('pro');
          const bPro = bName.includes('pro');
          if (aFlash && !bFlash) return -1;
          if (!aFlash && bFlash) return 1;
          if (!aPro && bPro) return -1;
          if (aPro && !bPro) return 1;
          return 0;
        });
        activeModel = sorted[0]?.name || 'models/gemini-flash-latest';
        try {
          localStorage.setItem('gamervault_gemini_active_model', activeModel);
          localStorage.setItem('gamervault_gemini_api_version', apiVersion);
        } catch (_) {}
      } else {
        apiWarning = disc.error || 'Nenhum modelo disponível para esta chave';
      }
    }

    if (activeModel) {
      // Histórico de conversas (para fluidez e memória)
      const validHistory = [];
      if (Array.isArray(history)) {
        const recent = history.filter(h => h && h.text && !h.isLarp).slice(-6);
        for (const m of recent) {
          validHistory.push({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.text }]
          });
        }
      }

      const contents = [
        ...validHistory,
        {
          role: 'user',
          parts: [{ text: trimmed }]
        }
      ];

      const candidateModels = [
        activeModel,
        'models/gemini-2.0-flash',
        'models/gemini-1.5-flash-latest',
        'models/gemini-1.5-flash',
        'models/gemini-pro'
      ];
      const uniqueModels = [...new Set(candidateModels)];

      for (const mPath of uniqueModels) {
        const formattedPath = mPath.startsWith('models/') ? mPath : `models/${mPath}`;
        try {
          const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/${formattedPath}:generateContent?key=${apiKey}`;

          const requestBody = {
            contents,
            generationConfig: {
              temperature: 0.85,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 700
            }
          };

          if (apiVersion === 'v1beta') {
            requestBody.system_instruction = {
              parts: [{ text: systemInstruction }]
            };
          } else {
            // Em v1 puro, injeta a instrução no primeiro conteúdo de usuário
            if (contents.length > 0 && contents[0].role === 'user') {
              contents[0].parts[0].text = `${systemInstruction}\n\n${contents[0].parts[0].text}`;
            }
          }

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const errMsg = errData?.error?.message || `HTTP ${res.status}`;
            apiWarning = errMsg;
            console.warn(`L.Worder: Falha na API Gemini (${formattedPath}):`, errMsg);
            continue; // tenta próximo modelo
          }

          const data = await res.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

          if (rawText) {
            // Extrai jogos mencionados com [[Nome]]
            const titleMatches = [...rawText.matchAll(/\[\[(.*?)\]\]/g)].map(m => m[1]);
            const uniqueTitles = [...new Set(titleMatches)].slice(0, 3);

            const cards = [];
            for (const title of uniqueTitles) {
              const card = await fetchGameCardData(title);
              if (card) cards.push(card);
            }

            // Limpa os colchetes duplos do texto final
            const cleanText = rawText.replace(/\[\[(.*?)\]\]/g, '**$1**');

            return {
              text: cleanText,
              cards,
              closeModal: false,
              isOnline: true,
              modelUsed: formattedPath.replace('models/', '')
            };
          }
        } catch (apiErr) {
          console.warn(`L.Worder: Falha ao chamar ${formattedPath}:`, apiErr);
          apiWarning = apiErr.message || 'Erro de conexão com o Gemini';
        }
      }
    }
  }

  // 5. Fallback Inteligente Offline
  const offlineResp = await generateOfflineLWorderResponse(trimmed, userName, hubGames, backlogGames);
  return {
    ...offlineResp,
    isOnline: false,
    apiWarning: apiKey ? apiWarning : null
  };
}

/**
 * Motor offline inteligente e conversacional do L.Worder
 */
async function generateOfflineLWorderResponse(message, userName, hubGames, backlogGames) {
  const lower = message.toLowerCase().trim();

  // Fora do escopo
  if (
    lower.includes('python') ||
    lower.includes('javascript') ||
    lower.includes('código') ||
    lower.includes('programar') ||
    lower.includes('receita') ||
    lower.includes('política') ||
    lower.includes('matemática') ||
    lower.includes('trabalho de') ||
    lower.includes('faculdade')
  ) {
    return {
      text: `Sério mesmo, ${userName}? Você abriu o Gamer's Vault pra me pedir isso? Eu sou uma IA de jogos, não o seu cursinho grátis de informática. Vai jogar alguma coisa e para de me torrar a paciência.`,
      cards: [],
      closeModal: false
    };
  }

  // Easter egg: Davy Jones
  if (lower.includes('davy jones') || lower.includes('davy') || lower.includes('jones')) {
    return {
      text: `Nem me compara com o Davy Jones, ${userName}. Eu realmente zerei os jogos dos quais eu falo, diferente de certas lendas do YouTube que zeram jogo em tela de título. Manda a próxima.`,
      cards: [],
      closeModal: false
    };
  }

  // Saudações e cumprimentos simples ("oi", "olá", "e aí", "fala", "opa", "salve")
  if (/^(oi|ol[aá]|e a[ií]|fala|opa|salve|blz|beleza|bom dia|boa tarde|boa noite|coe|qual foi)\b/i.test(lower)) {
    const greetings = [
      `Fala, ${userName}. Vai ficar só no papinho furado ou tem alguma dúvida decente de jogo pra me fazer trabalhar hoje?`,
      `E aí, ${userName}. Desembucha: qual é o jogo que você tá com preguiça de começar ou tá precisando de recomendação?`,
      `Qual é, ${userName}? Veio me fazer perder tempo ou finalmente decidiu o que vai jogar hoje?`,
      `Fala aí, ${userName}. Manda a pergunta logo antes que eu perca a pouca paciência que me resta.`
    ];
    return {
      text: greetings[Math.floor(Math.random() * greetings.length)],
      cards: [],
      closeModal: false
    };
  }

  // Provocações ou comentários sobre a personalidade dele
  if (lower.includes('chato') || lower.includes('babaca') || lower.includes('arrogante') || lower.includes('grosso')) {
    return {
      text: `Falou o cara que passa meia hora na tela inicial sem conseguir escolher um jogo. Eu não sou grosso, ${userName}, sou realista. Agora para de choramingar e me diz logo o que você quer jogar.`,
      cards: [],
      closeModal: false
    };
  }

  // JOGOS COZY / RELAXANTES / TRANQUILOS
  if (
    lower.includes('cozy') ||
    lower.includes('relaxar') ||
    lower.includes('relaxante') ||
    lower.includes('tranquilo') ||
    lower.includes('calmo') ||
    lower.includes('fazenda') ||
    lower.includes('fazendinha') ||
    lower.includes('moleza') ||
    lower.includes('desestressar')
  ) {
    const pick1 = 'Stardew Valley';
    const pick2 = 'A Short Hike';
    const card1 = await fetchGameCardData(pick1);
    const card2 = await fetchGameCardData(pick2);
    const cards = [card1, card2].filter(Boolean);

    return {
      text: `Joguinho cozy, ${userName}? Tá querendo moleza hoje depois de passar o dia sofrendo, né? Pega [[${pick1}]] se você quiser cuidar da sua plantação e esquecer que o mundo existe, ou vai de [[${pick2}]] pra planar de boa numa montanha. Se você conseguir passar raiva com esses dois, o problema é puramente psicológico.`,
      cards,
      closeModal: false
    };
  }

  // JOGOS DE TIRO / FPS / AÇÃO FRENÉTICA
  if (lower.includes('tiro') || lower.includes('fps') || lower.includes('tiroteio') || lower.includes('arma')) {
    const pick1 = 'DOOM Eternal';
    const pick2 = 'ULTRAKILL';
    const card1 = await fetchGameCardData(pick1);
    const card2 = await fetchGameCardData(pick2);
    const cards = [card1, card2].filter(Boolean);

    return {
      text: `Quer tiroteio frenético pra descarregar a raiva, ${userName}? Vai de [[${pick1}]] pra fatiar demônios no ritmo do metal, ou [[${pick2}]] se os seus reflexos ainda funcionarem direito.`,
      cards,
      closeModal: false
    };
  }

  // SOULSLIKE / DESAFIO / DIFÍCIL
  if (lower.includes('soulslike') || lower.includes('difícil') || lower.includes('dificil') || lower.includes('desafio') || lower.includes('souls')) {
    const pick = 'Elden Ring';
    const card = await fetchGameCardData(pick);
    return {
      text: `Quer desafio de verdade pra ver se aguenta o tranco, ${userName}? Vai de [[${pick}]]. Só não vale quebrar o controle quando morrer vinte vezes no mesmo boss.`,
      cards: card ? [card] : [],
      closeModal: false
    };
  }

  // TERROR / HORROR / MEDO
  if (lower.includes('terror') || lower.includes('horror') || lower.includes('medo') || lower.includes('susto')) {
    const pick = 'Silent Hill 2';
    const card = await fetchGameCardData(pick);
    return {
      text: `Quer tomar susto e ficar sem dormir? Pega [[${pick}]]. Joga de fone e no escuro se tiver culhão pra isso, ${userName}.`,
      cards: card ? [card] : [],
      closeModal: false
    };
  }

  // RPG / HISTÓRIA / NARRATIVA
  if (lower.includes('rpg') || lower.includes('história') || lower.includes('historia') || lower.includes('narrativa') || lower.includes('filme')) {
    const pick = 'Baldur\'s Gate 3';
    const card = await fetchGameCardData(pick);
    return {
      text: `Se você quer um RPG com história do caralho e escolhas de verdade, joga [[${pick}]]. Se você não gostar disso, desista dos videogames, ${userName}.`,
      cards: card ? [card] : [],
      closeModal: false
    };
  }

  // MULTIPLAYER / COOP / AMIGOS
  if (lower.includes('coop') || lower.includes('co-op') || lower.includes('amigo') || lower.includes('amigos') || lower.includes('multiplayer') || lower.includes('galera')) {
    const pick1 = 'Helldivers 2';
    const pick2 = 'It Takes Two';
    const card1 = await fetchGameCardData(pick1);
    const card2 = await fetchGameCardData(pick2);
    const cards = [card1, card2].filter(Boolean);

    return {
      text: `Pra jogar com a galera sem estresse, pega [[${pick1}]] e vai espalhar democracia pela galáxia. Se for em dupla fechada, [[${pick2}]] é obrigatório.`,
      cards,
      closeModal: false
    };
  }

  // INDIES / METROIDVANIA
  if (lower.includes('indie') || lower.includes('metroidvania') || lower.includes('plataforma')) {
    const pick = 'Hollow Knight';
    const card = await fetchGameCardData(pick);
    return {
      text: `Para de choradeira e vai jogar [[${pick}]]. Uma obra de arte do começo ao fim. E se você achar muito difícil, treine os dedos, ${userName}.`,
      cards: card ? [card] : [],
      closeModal: false
    };
  }

  // MUNDO ABERTO / EXPLORAÇÃO
  if (lower.includes('mundo aberto') || lower.includes('explorar') || lower.includes('exploração') || lower.includes('open world')) {
    const pick = 'Red Dead Redemption 2';
    const card = await fetchGameCardData(pick);
    return {
      text: `Mundo aberto de verdade com detalhes inacreditáveis? Pega [[${pick}]]. Você vai passar horas cavalgando e esquecer da vida, ${userName}.`,
      cards: card ? [card] : [],
      closeModal: false
    };
  }

  // ROGUELIKE / PARTIDAS RÁPIDAS
  if (lower.includes('roguelike') || lower.includes('roguelite') || lower.includes('rápido') || lower.includes('sessão curta')) {
    const pick = 'Hades';
    const card = await fetchGameCardData(pick);
    return {
      text: `Partida rápida, viciante e sem enrolação: joga [[${pick}]]. Uma run atrás da outra até você perder a hora de dormir.`,
      cards: card ? [card] : [],
      closeModal: false
    };
  }

  // Pediu sugestão geral / o que jogar / procurando jogo
  if (
    lower.includes('o que jogar') ||
    lower.includes('recomenda') ||
    lower.includes('indica') ||
    lower.includes('sugere') ||
    lower.includes('jogar hoje') ||
    lower.includes('querendo') ||
    lower.includes('quero um') ||
    lower.includes('procurando')
  ) {
    if (hubGames.length > 0) {
      const randomHub = hubGames[Math.floor(Math.random() * hubGames.length)];
      const card = await fetchGameCardData(randomHub.title);
      return {
        text: `Porra, ${userName}, você tem [[${randomHub.title}]] mofando instalado no seu Hub e ainda vem me perguntar o que jogar? Larga de enrolação e vai jogar ele agora, ou joga na roleta do Larga de Frescura se ainda faltar coragem.`,
        cards: card ? [card] : [],
        closeModal: false
      };
    }

    if (backlogGames.length > 0) {
      const randomBacklog = backlogGames[Math.floor(Math.random() * backlogGames.length)];
      const card = await fetchGameCardData(randomBacklog.title);
      return {
        text: `Você tem [[${randomBacklog.title}]] na sua lista de desejos juntando teia de aranha há séculos. Em vez de ficar arrumando desculpa, que tal finalmente dar uma chance pra ele hoje?`,
        cards: card ? [card] : [],
        closeModal: false
      };
    }

    const defaultPick = 'Hades';
    const card = await fetchGameCardData(defaultPick);
    return {
      text: `Sua biblioteca tá mais vazia que deserto, ${userName}. Dá uma olhada em [[${defaultPick}]]. Rápido, viciante e sem enrolação.`,
      cards: card ? [card] : [],
      closeModal: false
    };
  }

  // Hardware / Roda?
  if (lower.includes('roda') || lower.includes('fps') || lower.includes('placa') || lower.includes('hardware') || lower.includes('pc') || lower.includes('gpu')) {
    return {
      text: `Olha, ${userName}, a regra é simples: se você tem uma GPU decente dos últimos 5 anos, roda qualquer jogo em 1080p se não inventar de ligar Ray Tracing achando que o PC é da NASA. Me diz a placa e o jogo que você quer rodar que eu te dou o veredito sem firula.`,
      cards: [],
      closeModal: false
    };
  }

  // Resposta padrão debochada mas contextualizada
  return {
    text: `Olha, ${userName}, se você quer uma dica de verdade ou quer saber se seu PC roda alguma coisa, me diz o que você quer jogar: quer um jogo cozy pra relaxar, um soulslike pra passar raiva, um tiroteio ou um RPG de 100 horas? Manda a real.`,
    cards: [],
    closeModal: false
  };
}
