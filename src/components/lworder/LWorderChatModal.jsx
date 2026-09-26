import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  X,
  Key,
  Flame,
  Bookmark,
  Dices,
  ExternalLink,
  Sparkles,
  Check,
  AlertCircle
} from 'lucide-react';
import { askLWorder, getLWorderApiKey, saveLWorderApiKey, testGeminiApiKey } from '../../services/lworderService';
import { addRouletteItem } from '../../services/rouletteStorageService';
import DiscoverGameModal from '../discover/DiscoverGameModal';
import { isWishlist } from '../../utils/gameUtils';

export default function LWorderChatModal({
  isOpen,
  onClose,
  userName = 'Gamer',
  games = [],
  hubGames = [],
  onAddToWishlist
}) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Fala aí, ${userName}. Desembucha: qual é a dúvida ou o jogo que você tá enrolando pra jogar? Só não me venha com choradeira ou assunto que não seja de videogame.`,
      cards: []
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLarpDismissing, setIsLarpDismissing] = useState(false);

  // Modal de API Key & Status
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [activeKey, setActiveKey] = useState(() => getLWorderApiKey());
  const [tempApiKey, setTempApiKey] = useState(() => getLWorderApiKey());
  const [testStatus, setTestStatus] = useState(null); // { loading: boolean, success: boolean, msg: string }

  // Modal de Detalhes do Jogo selecionado em um Card
  const [selectedGameForModal, setSelectedGameForModal] = useState(null);

  // Notificações de ação nos cards (toast rápido)
  const [cardToast, setCardToast] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const showToast = (text) => {
    setCardToast(text);
    setTimeout(() => setCardToast(null), 2500);
  };

  const handleTestKey = async () => {
    const keyToTest = tempApiKey.trim();
    if (!keyToTest) {
      setTestStatus({ success: false, msg: 'Cole uma chave antes de testar.' });
      return;
    }
    setTestStatus({ loading: true, msg: 'Testando conexão com os servidores...' });
    const res = await testGeminiApiKey(keyToTest);
    if (res.ok) {
      setTestStatus({
        success: true,
        loading: false,
        msg: '✓ Conexão bem-sucedida! O L.Worder está online com a IA ativada.'
      });
    } else {
      setTestStatus({
        success: false,
        loading: false,
        msg: `✕ Erro retornado: ${res.error}`
      });
    }
  };

  const handleSaveKey = () => {
    const clean = tempApiKey.trim();
    saveLWorderApiKey(clean);
    setActiveKey(clean);
    setShowKeyModal(false);
    showToast(clean ? 'Chave de IA salva com sucesso!' : 'Chave removida. Usando motor local.');
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const query = inputVal.trim();
    if (!query || isLoading || isLarpDismissing) return;

    const userMessage = { role: 'user', text: query };
    setMessages(prev => [...prev, userMessage]);
    setInputVal('');
    setIsLoading(true);

    try {
      // Separa os jogos de backlog do Firestore
      const backlogList = games.filter(g => isWishlist(g.status));

      const response = await askLWorder({
        message: query,
        userName,
        hubGames,
        backlogGames: backlogList,
        history: messages
      });

      // Se o gatilho LARP foi acionado
      if (response.isLarpTriggered) {
        setIsLarpDismissing(true);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            text: response.text,
            isLarp: true,
            cards: []
          }
        ]);

        // Fecha na cara do usuário após 1.4 segundos
        setTimeout(() => {
          setIsLarpDismissing(false);
          onClose();
        }, 1400);
        return;
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: response.text,
          cards: response.cards || [],
          apiWarning: response.apiWarning || null,
          isOnline: response.isOnline
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'Tive um pequeno soluço de conexão, mas não se acostume. Tente de novo se ainda tiver coragem.',
          cards: []
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToRoulette = (card) => {
    const success = addRouletteItem({
      id: card.id,
      title: card.title,
      imageUrl: card.imageUrl,
      metacritic: card.metacritic,
      rating: card.rating
    });
    if (success) {
      showToast(`"${card.title}" enviado para o Larga de Frescura!`);
    } else {
      showToast(`"${card.title}" já está na Roleta!`);
    }
  };

  const handleAddToBacklog = (card) => {
    if (onAddToWishlist) {
      onAddToWishlist({
        id: card.id,
        title: card.title,
        imageUrl: card.imageUrl,
        metacritic: card.metacritic,
        status: 'Desejo'
      });
      showToast(`"${card.title}" adicionado ao seu Backlog!`);
    }
  };

  return (
    <>
      <div className={`fixed bottom-20 left-6 z-50 w-[380px] sm:w-[420px] h-[520px] max-h-[85vh] bg-surface-low/95 backdrop-blur-2xl border ${isLarpDismissing ? 'border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.6)] animate-pulse' : 'border-border/80 shadow-[0_12px_45px_rgba(0,0,0,0.85)]'} rounded-2xl flex flex-col overflow-hidden text-slate-100 transition-all duration-300 font-sans`}>
        
        {/* Header do L.Worder */}
        <header className="h-14 px-4 bg-surface-default/90 border-b border-border/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-accent-glow/20 border border-accent-bright/30 flex items-center justify-center text-accent-bright shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-black ${activeKey ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-gamer font-bold text-white tracking-wide">
                  L.Worder
                </h3>
                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono uppercase font-semibold ${activeKey ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                  {activeKey ? 'Ativado' : 'Local'}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">
                melhor que o davy jones btw
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setShowKeyModal(!showKeyModal);
                setTestStatus(null);
                setTempApiKey(getLWorderApiKey());
              }}
              title="Configurações de IA"
              className={`p-1.5 rounded-lg transition-colors ${activeKey ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-gray-400 hover:bg-surface-high hover:text-white'}`}
            >
              <Key className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              title="Fechar L.Worder"
              className="p-1.5 rounded-lg hover:bg-surface-high text-gray-400 hover:text-rose-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Modal Inline de Configuração de Chave */}
        {showKeyModal && (
          <div className="p-3 bg-surface-container border-b border-border/80 space-y-2.5 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-accent-bright" />
                Chave de API (IA)
              </span>
              <button onClick={() => setShowKeyModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-gray-400 leading-tight">
              Gere gratuitamente sua chave em{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-accent-bright underline hover:text-accent-bright/80 inline-flex items-center gap-0.5"
              >
                aistudio.google.com <ExternalLink className="w-2.5 h-2.5" />
              </a>
              . Com a chave ativa, o L.Worder opera no modo online completo.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={tempApiKey}
                onChange={e => {
                  setTempApiKey(e.target.value);
                  setTestStatus(null);
                }}
                placeholder="AIzaSy..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-surface-low border border-border text-xs text-white focus:outline-none focus:border-accent-bright font-mono"
              />
              <button
                onClick={handleSaveKey}
                className="px-3 py-1.5 bg-accent-bright text-surface-low font-bold rounded-lg text-xs hover:bg-accent-bright/90 transition-all shrink-0"
              >
                Salvar
              </button>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                disabled={testStatus?.loading || !tempApiKey.trim()}
                onClick={handleTestKey}
                className="text-[11px] px-2.5 py-1 rounded bg-surface-high hover:bg-surface-high/80 text-slate-200 disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                {testStatus?.loading ? (
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-accent-bright border-t-transparent rounded-full" />
                ) : (
                  <Sparkles className="w-3 h-3 text-accent-bright" />
                )}
                {testStatus?.loading ? 'Testando conexão...' : 'Testar Conexão'}
              </button>

              {tempApiKey.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setTempApiKey('');
                    saveLWorderApiKey('');
                    setActiveKey('');
                    setTestStatus({ success: false, msg: 'Chave removida. Usando motor local.' });
                    showToast('Chave removida!');
                  }}
                  className="text-[10px] text-rose-400 hover:underline"
                >
                  Remover Chave
                </button>
              )}
            </div>

            {testStatus && (
              <div
                className={`p-2 rounded-lg text-[11px] leading-tight flex items-start gap-1.5 ${
                  testStatus.success
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}
              >
                {testStatus.success ? (
                  <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                <span>{testStatus.msg}</span>
              </div>
            )}
          </div>
        )}

        {/* Toast Notifier */}
        {cardToast && (
          <div className="bg-accent-bright text-surface-low text-xs font-semibold px-3 py-1.5 flex items-center justify-center gap-1.5 shadow-md">
            <Check className="w-3.5 h-3.5" />
            <span>{cardToast}</span>
          </div>
        )}

        {/* Feed de Conversa */}
        <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 text-xs">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-accent-bright text-surface-low font-medium rounded-br-xs'
                    : msg.isLarp
                    ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40 rounded-bl-xs'
                    : 'bg-surface-default border border-border/80 text-gray-200 rounded-bl-xs shadow-sm'
                }`}
              >
                {msg.text}
              </div>

              {msg.apiWarning && (
                <div className="mt-1 max-w-[88%] p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 leading-tight flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    Aviso: Conexão remota indisponível ({msg.apiWarning}). Respondendo via motor local. Clique em 🔑 para verificar.
                  </span>
                </div>
              )}

              {/* Cards Interativos de Jogos Recomendados */}
              {msg.cards && msg.cards.length > 0 && (
                <div className="w-full mt-2 space-y-2">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block ml-1">
                    Jogos Sugeridos pelo L.Worder:
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {msg.cards.map((card, cIdx) => (
                      <div
                        key={cIdx}
                        className="p-2.5 rounded-xl bg-surface-default/90 border border-border/70 hover:border-accent-bright/40 transition-all flex items-center justify-between gap-2.5 shadow-sm group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {card.imageUrl ? (
                            <img
                              src={card.imageUrl}
                              alt={card.title}
                              className="w-11 h-11 rounded-lg object-cover border border-white/10 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-surface-high border border-border flex items-center justify-center text-gray-500 shrink-0">
                              🎮
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate group-hover:text-accent-bright transition-colors">
                              {card.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400 font-mono">
                              {card.metacritic && (
                                <span className={`px-1 rounded font-bold ${card.metacritic >= 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                  {card.metacritic}
                                </span>
                              )}
                              <span className="truncate">{card.genres?.split(',')[0]}</span>
                            </div>
                          </div>
                        </div>

                        {/* Botões de Ação do Card */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setSelectedGameForModal(card)}
                            title="Ver Detalhes do Jogo"
                            className="p-1.5 rounded-lg bg-surface-high hover:bg-surface-higher text-gray-300 hover:text-white transition-colors border border-border/50"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleAddToRoulette(card)}
                            title="Mandar pro Larga de Frescura (Roleta)"
                            className="p-1.5 rounded-lg bg-surface-high hover:bg-accent-bright/20 text-accent-bright transition-colors border border-border/50"
                          >
                            <Dices className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleAddToBacklog(card)}
                            title="Salvar no Backlog (Desejos)"
                            className="p-1.5 rounded-lg bg-surface-high hover:bg-rose-500/20 text-rose-400 transition-colors border border-border/50"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-accent-bright p-2 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>L.Worder está julgando suas opções de jogo...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input de Chat */}
        <form onSubmit={handleSend} className="p-3 bg-surface-default/90 border-t border-border/60 flex gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            disabled={isLoading || isLarpDismissing}
            placeholder={isLarpDismissing ? 'Larp detectado. Encerrando...' : 'Pergunte sobre jogos ou hardware ao L.Worder...'}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-low border border-border/80 focus:border-accent-bright focus:outline-none text-xs text-white placeholder-gray-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputVal.trim() || isLarpDismissing}
            className="px-3.5 py-2.5 bg-accent-bright text-surface-low font-bold rounded-xl text-xs hover:bg-accent-bright/90 disabled:opacity-40 transition-colors flex items-center justify-center shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Modal de Detalhes Completo quando o usuário clica em "Ver Detalhes" */}
      {selectedGameForModal && (
        <DiscoverGameModal
          game={selectedGameForModal}
          isOwned={false}
          isWishlist={false}
          onClose={() => setSelectedGameForModal(null)}
          onAddToWishlist={() => {
            handleAddToBacklog(selectedGameForModal);
            setSelectedGameForModal(null);
          }}
          onRegisterFull={() => {}}
        />
      )}
    </>
  );
}
