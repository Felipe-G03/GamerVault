import React, { useState, useEffect } from 'react';
import {
  User,
  Copy,
  Check,
  UserPlus,
  Trash2,
  Loader2,
  Shield,
  Gamepad2,
  AlertCircle
} from 'lucide-react';
import { updateNickname, addFriend, removeFriend, getFriendsDetails } from '../../services/profileService';

export default function ProfileView({ user, profile, onProfileUpdated }) {
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [copiedPilotId, setCopiedPilotId] = useState(false);

  const [friendPilotId, setFriendPilotId] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [friendError, setFriendError] = useState(null);
  const [friendSuccess, setFriendSuccess] = useState(null);

  const [friendsList, setFriendsList] = useState([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);

  useEffect(() => {
    if (profile?.nickname) {
      setNickname(profile.nickname);
    }
    loadFriends();
  }, [profile]);

  const loadFriends = async () => {
    if (!profile?.friends || profile.friends.length === 0) {
      setFriendsList([]);
      return;
    }
    setIsLoadingFriends(true);
    try {
      const details = await getFriendsDetails(profile.friends);
      setFriendsList(details);
    } catch (e) {
      console.error('Erro ao buscar lista de amigos:', e);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const handleSaveNickname = async (e) => {
    e.preventDefault();
    if (!nickname.trim() || !user?.uid) return;
    setIsSavingNickname(true);
    try {
      await updateNickname(user.uid, nickname.trim());
      onProfileUpdated();
    } catch (e) {
      console.error('Erro ao salvar nickname:', e);
    } finally {
      setIsSavingNickname(false);
    }
  };

  const handleCopyPilotId = () => {
    if (!user?.uid) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedPilotId(true);
    setTimeout(() => setCopiedPilotId(false), 2500);
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!friendPilotId.trim() || !user?.uid) return;
    setIsAddingFriend(true);
    setFriendError(null);
    setFriendSuccess(null);
    try {
      await addFriend(user.uid, friendPilotId.trim());
      setFriendSuccess('Amigo adicionado com sucesso à Guilda!');
      setFriendPilotId('');
      onProfileUpdated();
    } catch (err) {
      setFriendError(err.message || 'Erro ao adicionar amigo.');
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Deseja realmente remover este amigo da sua Guilda?')) return;
    try {
      await removeFriend(user.uid, friendId);
      onProfileUpdated();
    } catch (err) {
      console.error('Erro ao remover amigo:', err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* SEÇÃO 1: Seu Perfil (Fiel à captura 5) */}
      <div className="p-6 rounded-2xl bg-[#0e1017] border border-border shadow-xl space-y-5">
        <h2 className="text-lg font-gamer font-bold text-white tracking-wide flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-400" />
          Seu Perfil
        </h2>

        {/* Formulário de Nickname */}
        <form onSubmit={handleSaveNickname} className="space-y-1.5">
          <label className="text-xs font-mono uppercase text-gray-300 font-semibold">
            Seu Nickname:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex: Felipão"
              className="flex-1 px-3.5 py-2.5 bg-[#151722] border border-[#272a3b] rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              type="submit"
              disabled={isSavingNickname}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-neon-green disabled:opacity-50"
            >
              {isSavingNickname ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </button>
          </div>
        </form>

        {/* ID de Piloto */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase text-gray-300 font-semibold">
            A sua ID de Piloto (Compartilhe com amigos):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={user?.uid || 'Não autenticado'}
              className="flex-1 px-3.5 py-2.5 bg-[#151722] border border-[#272a3b] rounded-xl text-xs font-mono text-gray-300 select-all cursor-text focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyPilotId}
              className="flex items-center justify-center px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-neon-cyan active:scale-95"
              title="Copiar ID de Piloto"
            >
              {copiedPilotId ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          {copiedPilotId && (
            <span className="text-[11px] text-emerald-400 font-mono block">
              ✓ ID de Piloto copiado para a área de transferência!
            </span>
          )}
        </div>
      </div>

      {/* SEÇÃO 2: Gerir Amigos (Fiel à captura 5) */}
      <div className="p-6 rounded-2xl bg-[#0e1017] border border-border shadow-xl space-y-5">
        <h2 className="text-lg font-gamer font-bold text-white tracking-wide flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          Gerir Amigos
        </h2>

        {/* Adicionar Amigo por ID */}
        <form onSubmit={handleAddFriend} className="space-y-1.5">
          <label className="text-xs font-mono uppercase text-gray-300 font-semibold">
            Adicionar Amigo por ID:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Cole a ID do seu amigo aqui..."
              value={friendPilotId}
              onChange={(e) => setFriendPilotId(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-[#151722] border border-[#272a3b] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              type="submit"
              disabled={isAddingFriend}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-neon-green disabled:opacity-50"
            >
              {isAddingFriend ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
            </button>
          </div>

          {friendError && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300 text-xs mt-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{friendError}</span>
            </div>
          )}

          {friendSuccess && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs mt-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{friendSuccess}</span>
            </div>
          )}
        </form>

        {/* Sua Lista de Amigos */}
        <div className="space-y-2 pt-3">
          <label className="text-xs font-mono uppercase text-gray-400 font-semibold block">
            Sua Lista de Amigos ({friendsList.length})
          </label>

          {isLoadingFriends ? (
            <div className="py-6 flex items-center justify-center text-gray-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className="text-xs font-mono">Carregando amigos...</span>
            </div>
          ) : friendsList.length > 0 ? (
            <div className="space-y-2">
              {friendsList.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#141620] border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-high border border-border flex items-center justify-center font-bold text-xs text-white">
                      {f.nickname?.[0]?.toUpperCase() || 'P'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight">
                        {f.nickname}
                      </h4>
                      <span className="text-[10px] font-mono text-gray-400">
                        {f.email || f.id}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveFriend(f.id)}
                    className="px-3 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-400 font-semibold text-xs transition-colors"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs font-mono text-gray-500 bg-[#12141c] rounded-xl border border-dashed border-border">
              Você ainda não adicionou nenhum amigo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
