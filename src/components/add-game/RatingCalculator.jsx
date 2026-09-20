import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Gamepad2, 
  BookOpen, 
  Palette, 
  Music, 
  Cpu, 
  Check, 
  Plus, 
  CheckCircle2, 
  FileText,
  HelpCircle,
  X
} from 'lucide-react';

export default function RatingCalculator({ currentRating, onApplyRating, onAppendReview, onClose }) {
  // 5 Pilares Fundamentais (Escala de 1 a 5)
  const [scores, setScores] = useState({
    gameplay: 4,
    narrative: 4,
    graphics: 4,
    sound: 4,
    performance: 4
  });

  const [ignoreNarrative, setIgnoreNarrative] = useState(false);

  // Parâmetros Extras (Bônus Step-up)
  const [bonus, setBonus] = useState({
    innovation: false, // +0.3
    replay: false,     // +0.3
    value: false,      // +0.2
    pacing: false      // +0.2
  });

  const [copiedReview, setCopiedReview] = useState(false);

  // Descrições rápidas de 1 a 5
  const getRatingLabel = (val) => {
    if (val >= 5) return 'Obra-prima';
    if (val >= 4) return 'Excelente';
    if (val >= 3) return 'Bom / Sólido';
    if (val >= 2) return 'Abaixo da Média';
    return 'Ruim / Fraco';
  };

  // Cálculo da Média Ponderada
  const { finalScore, baseScore10, totalBonus } = useMemo(() => {
    let weightedSum = 0;
    
    if (ignoreNarrative) {
      // Redistribui os 25% da história
      weightedSum += scores.gameplay * 0.45;
      weightedSum += scores.graphics * 0.20;
      weightedSum += scores.sound * 0.20;
      weightedSum += scores.performance * 0.15;
    } else {
      weightedSum += scores.gameplay * 0.35;
      weightedSum += scores.narrative * 0.25;
      weightedSum += scores.graphics * 0.15;
      weightedSum += scores.sound * 0.15;
      weightedSum += scores.performance * 0.10;
    }

    // Converte de escala 1-5 para 1-10
    const rawBase10 = weightedSum * 2;

    // Soma os bônus
    let b = 0;
    if (bonus.innovation) b += 0.3;
    if (bonus.replay) b += 0.3;
    if (bonus.value) b += 0.2;
    if (bonus.pacing) b += 0.2;

    const calculated = Math.min(10, Math.max(1, rawBase10 + b));
    
    return {
      finalScore: Number(calculated.toFixed(1)),
      baseScore10: Number(rawBase10.toFixed(1)),
      totalBonus: Number(b.toFixed(1))
    };
  }, [scores, ignoreNarrative, bonus]);

  const handleApply = () => {
    onApplyRating(finalScore);
    if (onClose) onClose();
  };

  const handleAppendReviewText = () => {
    let breakdown = `\n\n--- Avaliação por Critérios ---`;
    breakdown += `\n• Gameplay: ${scores.gameplay}/5`;
    if (!ignoreNarrative) {
      breakdown += `\n• História: ${scores.narrative}/5`;
    }
    breakdown += `\n• Arte & Gráficos: ${scores.graphics}/5`;
    breakdown += `\n• Som & Trilha: ${scores.sound}/5`;
    breakdown += `\n• Performance: ${scores.performance}/5`;

    const activeBadges = [];
    if (bonus.innovation) activeBadges.push('Inovador');
    if (bonus.replay) activeBadges.push('Alta Rejogabilidade');
    if (bonus.value) activeBadges.push('Custo-Benefício');
    if (bonus.pacing) activeBadges.push('Ritmo Impecável');

    if (activeBadges.length > 0) {
      breakdown += `\n• Destaques: ${activeBadges.join(', ')}`;
    }

    breakdown += `\n• Nota Calculada: ${finalScore}/10`;
    breakdown += `\n-------------------------------`;

    if (onAppendReview) {
      onAppendReview(breakdown);
      setCopiedReview(true);
      setTimeout(() => setCopiedReview(false), 2500);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#11131c] border border-cyan-500/30 shadow-[0_4px_25px_rgba(0,0,0,0.5)] space-y-5 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          <span>Calculadora de Nota Sugerida (1 a 5)</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-high text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 5 Pilares Fundamentais */}
      <div className="space-y-4">
        <span className="text-[11px] font-mono text-gray-400 uppercase tracking-widest font-semibold block">
          1. Pilares Fundamentais (35% Gameplay, 25% História, etc.)
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. GAMEPLAY */}
          <div className="p-3 rounded-xl bg-surface/50 border border-border/60 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-200 flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
                Gameplay & Controles
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {scores.gameplay} <span className="text-[10px] text-gray-400 font-normal">({getRatingLabel(scores.gameplay)})</span>
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={scores.gameplay}
              onChange={(e) => setScores({ ...scores, gameplay: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-surface-high rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          {/* 2. HISTÓRIA COM TOGGLE DE IGNORAR */}
          <div className={`p-3 rounded-xl bg-surface/50 border border-border/60 space-y-2 transition-opacity ${ignoreNarrative ? 'opacity-50' : 'opacity-100'}`}>
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-200 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                História & Narrativa
              </span>
              {!ignoreNarrative && (
                <span className="font-mono text-blue-400 font-bold">
                  {scores.narrative} <span className="text-[10px] text-gray-400 font-normal">({getRatingLabel(scores.narrative)})</span>
                </span>
              )}
            </div>

            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              disabled={ignoreNarrative}
              value={scores.narrative}
              onChange={(e) => setScores({ ...scores, narrative: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-surface-high rounded-lg appearance-none cursor-pointer accent-blue-400 disabled:cursor-not-allowed"
            />

            <label className="flex items-center gap-2 pt-1 text-[11px] font-mono text-gray-400 cursor-pointer hover:text-gray-300">
              <input
                type="checkbox"
                checked={ignoreNarrative}
                onChange={(e) => setIgnoreNarrative(e.target.checked)}
                className="rounded border-border bg-surface text-cyan-500 focus:ring-0 cursor-pointer"
              />
              <span>Não se aplica (Jogo focado em arcade/multiplayer)</span>
            </label>
          </div>

          {/* 3. ARTE E GRÁFICOS */}
          <div className="p-3 rounded-xl bg-surface/50 border border-border/60 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-200 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-purple-400" />
                Direção de Arte & Gráficos
              </span>
              <span className="font-mono text-purple-400 font-bold">
                {scores.graphics} <span className="text-[10px] text-gray-400 font-normal">({getRatingLabel(scores.graphics)})</span>
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={scores.graphics}
              onChange={(e) => setScores({ ...scores, graphics: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-surface-high rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
          </div>

          {/* 4. SOM E TRILHA SONORA */}
          <div className="p-3 rounded-xl bg-surface/50 border border-border/60 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-200 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-amber-400" />
                Trilha Sonora & Efeitos
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {scores.sound} <span className="text-[10px] text-gray-400 font-normal">({getRatingLabel(scores.sound)})</span>
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={scores.sound}
              onChange={(e) => setScores({ ...scores, sound: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-surface-high rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* 5. PERFORMANCE */}
          <div className="p-3 rounded-xl bg-surface/50 border border-border/60 space-y-2 md:col-span-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-200 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                Desempenho Técnico & Polimento (Bugs, FPS, Loading)
              </span>
              <span className="font-mono text-cyan-400 font-bold">
                {scores.performance} <span className="text-[10px] text-gray-400 font-normal">({getRatingLabel(scores.performance)})</span>
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={scores.performance}
              onChange={(e) => setScores({ ...scores, performance: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-surface-high rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* 2. Parâmetros Extras (Bônus Step-up) */}
      <div className="space-y-2.5 pt-1">
        <span className="text-[11px] font-mono text-gray-400 uppercase tracking-widest font-semibold block">
          2. Destaques Opcionais (Step-Up Bônus na Nota)
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
          {/* Bônus 1: Inovação */}
          <button
            type="button"
            onClick={() => setBonus({ ...bonus, innovation: !bonus.innovation })}
            className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
              bonus.innovation 
                ? 'bg-amber-950/30 border-amber-500/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]' 
                : 'bg-surface/40 border-border/60 text-gray-400 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">💡</span>
              <div>
                <span className="font-bold block text-[11px] text-white">Inovação Marcante</span>
                <span className="text-[10px] text-gray-400">Trouxe algo inédito ao gênero</span>
              </div>
            </div>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${bonus.innovation ? 'bg-amber-500/20 text-amber-300' : 'bg-surface-high text-gray-500'}`}>
              +0.3
            </span>
          </button>

          {/* Bônus 2: Rejogabilidade */}
          <button
            type="button"
            onClick={() => setBonus({ ...bonus, replay: !bonus.replay })}
            className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
              bonus.replay 
                ? 'bg-cyan-950/30 border-cyan-500/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]' 
                : 'bg-surface/40 border-border/60 text-gray-400 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">🔄</span>
              <div>
                <span className="font-bold block text-[11px] text-white">Alta Rejogabilidade</span>
                <span className="text-[10px] text-gray-400">Dá vontade de zerar de novo</span>
              </div>
            </div>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${bonus.replay ? 'bg-cyan-500/20 text-cyan-300' : 'bg-surface-high text-gray-500'}`}>
              +0.3
            </span>
          </button>

          {/* Bônus 3: Custo-benefício */}
          <button
            type="button"
            onClick={() => setBonus({ ...bonus, value: !bonus.value })}
            className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
              bonus.value 
                ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]' 
                : 'bg-surface/40 border-border/60 text-gray-400 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">💰</span>
              <div>
                <span className="font-bold block text-[11px] text-white">Custo-Benefício Notável</span>
                <span className="text-[10px] text-gray-400">Valeu cada centavo e minuto</span>
              </div>
            </div>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${bonus.value ? 'bg-emerald-500/20 text-emerald-300' : 'bg-surface-high text-gray-500'}`}>
              +0.2
            </span>
          </button>

          {/* Bônus 4: Ritmo */}
          <button
            type="button"
            onClick={() => setBonus({ ...bonus, pacing: !bonus.pacing })}
            className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
              bonus.pacing 
                ? 'bg-purple-950/30 border-purple-500/60 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]' 
                : 'bg-surface/40 border-border/60 text-gray-400 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">⏳</span>
              <div>
                <span className="font-bold block text-[11px] text-white">Ritmo Impecável</span>
                <span className="text-[10px] text-gray-400">Prende do começo ao fim</span>
              </div>
            </div>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${bonus.pacing ? 'bg-purple-500/20 text-purple-300' : 'bg-surface-high text-gray-500'}`}>
              +0.2
            </span>
          </button>
        </div>
      </div>

      {/* Painel de Resultado & Ações */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-surface to-emerald-950/40 border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase text-gray-400 tracking-wider">
            Nota Sugerida Calculada
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-gamer text-white tracking-wider">
              {finalScore}
            </span>
            <span className="text-sm font-mono text-cyan-400 font-bold">/ 10</span>
            {totalBonus > 0 && (
              <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full ml-1">
                +{totalBonus} bônus
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            Base: {baseScore10}/10 {totalBonus > 0 ? `+ ${totalBonus} bônus` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onAppendReview && (
            <button
              type="button"
              onClick={handleAppendReviewText}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface hover:bg-surface-high border border-border text-gray-300 hover:text-white font-mono text-xs transition-colors"
              title="Cola as notas de cada critério dentro do seu texto de análise"
            >
              {copiedReview ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Colado na Review!</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Colar na Análise</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleApply}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-black font-bold font-mono text-xs tracking-wide transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Aplicar no Slider</span>
          </button>
        </div>
      </div>
    </div>
  );
}
