import React, { useState } from 'react';
import {
  Gamepad2,
  Lock,
  Mail,
  User,
  Key,
  LogIn,
  UserPlus,
  Loader2,
  AlertCircle
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';
import { auth } from '../../config/firebase';
import { ensureProfile } from '../../services/profileService';

export default function AuthModal({ onAuthSuccess, onOpenSettings }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [existingPilotId, setExistingPilotId] = useState('');
  const [usePilotIdDirectly, setUsePilotIdDirectly] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Opção de entrar diretamente com ID de Piloto do Firestore
      if (usePilotIdDirectly) {
        if (!existingPilotId.trim()) {
          throw new Error('Por favor, informe seu ID de Piloto.');
        }
        const cleanId = existingPilotId.trim();
        const customUser = {
          uid: cleanId,
          email: `${cleanId}@gamervault.local`,
          isCustomPilotId: true
        };
        const profile = await ensureProfile(cleanId, customUser.email, 'Piloto');
        onAuthSuccess(customUser, profile);
        return;
      }

      if (!auth) {
        throw new Error('Firebase não configurado. Clique no botão de configurações abaixo para inserir suas credenciais.');
      }

      let userCredential;
      if (isRegister) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const profile = await ensureProfile(user.uid, user.email, nickname || 'Gamer');
        onAuthSuccess(user, profile);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const profile = await ensureProfile(user.uid, user.email, 'Gamer');
        onAuthSuccess(user, profile);
      }
    } catch (err) {
      console.error('Erro de autenticação:', err);
      if (err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter no mínimo 6 caracteres.');
      } else {
        setError(err.message || 'Erro ao autenticar.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#0d0f16] border border-border rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header com Logo Gamer's Vault */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-500">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-gamer font-bold text-white tracking-wider">
            Gamer's Vault
          </h2>
          <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">
            Acesso ao Depósito de Jogos
          </p>
        </div>

        {/* Alternância: Login Convencional ou ID de Piloto */}
        <div className="flex rounded-xl bg-surface p-1 border border-border">
          <button
            type="button"
            onClick={() => setUsePilotIdDirectly(false)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              !usePilotIdDirectly ? 'bg-surface-high text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            Firebase Auth
          </button>
          <button
            type="button"
            onClick={() => setUsePilotIdDirectly(true)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              usePilotIdDirectly ? 'bg-surface-high text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            ID de Piloto
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleAuth} className="space-y-4">
          {usePilotIdDirectly ? (
            /* Entrar direto pelo ID do Firestore (Ex: hPFtPm8tK2TR9QSNuCnT3jcUq7A2) */
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-cyan-400 font-semibold">
                Seu ID de Piloto Existente:
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ex: 2VvYeX5nRYNSw0lti9hxA1OHrhy1"
                  value={existingPilotId}
                  onChange={(e) => setExistingPilotId(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#151722] border border-[#272a3b] rounded-xl text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
              <span className="text-[11px] text-gray-400 block mt-1">
                Conecta instantaneamente à sua conta e jogos existentes do Firestore.
              </span>
            </div>
          ) : (
            /* Login ou Cadastro normal via Firebase Auth */
            <>
              {isRegister && (
                <div className="space-y-1">
                  <label className="text-xs font-mono uppercase text-gray-300 font-semibold">
                    Nickname
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Seu nome gamer"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      required={isRegister}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#151722] border border-[#272a3b] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#151722] border border-[#272a3b] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono uppercase text-gray-300 font-semibold">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#151722] border border-[#272a3b] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-neon-green disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Criar Conta Gamer</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Entrar no Vault</span>
              </>
            )}
          </button>
        </form>

        {!usePilotIdDirectly && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              {isRegister
                ? 'Já tem uma conta? Faça Login'
                : 'Não tem conta? Cadastre-se agora'}
            </button>
          </div>
        )}

        <div className="border-t border-border pt-4 text-center">
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-[11px] font-mono text-cyan-400 hover:underline"
          >
            ⚙ Configurar chaves do Firebase & RAWG
          </button>
        </div>
      </div>
    </div>
  );
}
