import React, { useState, useEffect } from 'react';
import { 
  Rocket, 
  X, 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  ExternalLink,
  Sparkles
} from 'lucide-react';

export default function UpdateModal({ updateInfo, onClose }) {
  const [downloadState, setDownloadState] = useState('idle'); // 'idle' | 'downloading' | 'ready' | 'error'
  const [progress, setProgress] = useState({ percent: 0, downloadedBytes: 0, totalBytes: 0 });
  const [errorMessage, setErrorMessage] = useState(null);

  const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;

    const cleanupProgress = window.electronAPI.onUpdateProgress((data) => {
      setProgress(data);
    });

    const cleanupReady = window.electronAPI.onUpdateReady(() => {
      setDownloadState('ready');
    });

    const cleanupError = window.electronAPI.onUpdateError((err) => {
      setDownloadState('error');
      setErrorMessage(typeof err === 'string' ? err : 'Ocorreu um erro ao baixar a atualização.');
    });

    return () => {
      if (cleanupProgress) cleanupProgress();
      if (cleanupReady) cleanupReady();
      if (cleanupError) cleanupError();
    };
  }, [isElectron]);

  const handleStartDownload = () => {
    if (!updateInfo?.downloadUrl) {
      setErrorMessage('Link de download indisponível no momento.');
      setDownloadState('error');
      return;
    }

    if (isElectron && window.electronAPI?.startUpdateDownload) {
      setDownloadState('downloading');
      setErrorMessage(null);
      window.electronAPI.startUpdateDownload(updateInfo.downloadUrl);
    } else {
      // Se estiver no browser, abre direto a URL de download
      window.open(updateInfo.downloadUrl, '_blank');
    }
  };

  const formatMB = (bytes) => {
    if (!bytes) return '0';
    return (bytes / (1024 * 1024)).toFixed(1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0d0f16] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col">
        {/* Glow Header */}
        <div className="relative px-6 py-5 border-b border-border/80 bg-gradient-to-r from-cyan-950/40 via-surface to-surface-container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Rocket className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                  Atualização do Sistema
                </span>
                {updateInfo?.releaseDate && (
                  <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.5 rounded bg-surface border border-border">
                    {updateInfo.releaseDate}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-gamer font-bold text-white tracking-wide">
                Nova Versão Disponível!
              </h2>
            </div>
          </div>

          {downloadState !== 'downloading' && downloadState !== 'ready' && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-surface hover:bg-surface-high text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-6 space-y-5">
          {/* Comparativo de Versões */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface/60 border border-border/70 font-mono text-xs">
            <div className="flex flex-col">
              <span className="text-gray-400 text-[10px] uppercase">Sua versão atual</span>
              <span className="text-gray-300 font-semibold text-sm">v{updateInfo?.currentVersion || '2.0.0'}</span>
            </div>

            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <ArrowRight className="w-4 h-4 animate-pulse" />
            </div>

            <div className="flex flex-col text-right">
              <span className="text-cyan-400 text-[10px] uppercase font-bold">Nova versão</span>
              <span className="text-cyan-300 font-bold text-sm drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                v{updateInfo?.latestVersion}
              </span>
            </div>
          </div>

          {/* Changelog / Notas da Versão */}
          {updateInfo?.changelog && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-gray-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>O QUE HÁ DE NOVO:</span>
              </div>
              <div className="max-h-36 overflow-y-auto p-3.5 rounded-xl bg-black/40 border border-border/60 text-xs text-gray-300 font-mono whitespace-pre-line leading-relaxed scrollbar-thin">
                {updateInfo.changelog}
              </div>
            </div>
          )}

          {/* Estado: Baixando */}
          {downloadState === 'downloading' && (
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-300 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  Baixando instalador...
                </span>
                <span className="text-white font-bold">{progress.percent}%</span>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-cyan-500/20">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              {progress.totalBytes > 0 && (
                <div className="text-right text-[11px] font-mono text-gray-400">
                  {formatMB(progress.downloadedBytes)} MB de {formatMB(progress.totalBytes)} MB
                </div>
              )}
            </div>
          )}

          {/* Estado: Pronto para Instalar */}
          {downloadState === 'ready' && (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div className="text-xs font-mono leading-relaxed">
                <p className="font-bold text-white">Download concluído!</p>
                <p className="text-gray-300">Iniciando instalador e reiniciando o Gamer's Vault...</p>
              </div>
            </div>
          )}

          {/* Estado: Erro */}
          {downloadState === 'error' && (
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/40 space-y-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Falha no download</span>
              </div>
              <p className="text-gray-300 leading-relaxed">{errorMessage}</p>
              {updateInfo?.downloadUrl && (
                <button
                  onClick={() => window.open(updateInfo.downloadUrl, '_blank')}
                  className="mt-2 inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Baixar manualmente pelo navegador
                </button>
              )}
            </div>
          )}
        </div>

        {/* Rodapé / Ações */}
        <div className="px-6 py-4 border-t border-border/80 bg-surface/40 flex items-center justify-end gap-3 font-mono text-xs">
          {downloadState === 'idle' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-high border border-border text-gray-400 hover:text-white transition-colors"
              >
                Lembrar Mais Tarde
              </button>
              <button
                onClick={handleStartDownload}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Baixar e Atualizar Agora</span>
              </button>
            </>
          )}

          {downloadState === 'error' && (
            <button
              onClick={() => setDownloadState('idle')}
              className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-high border border-border text-white transition-colors"
            >
              Tentar Novamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
