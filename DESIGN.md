# GamerVault Design System (Impeccable Standard)

Este documento estabelece as regras, tokens e diretrizes estéticas do **GamerVault**, alinhado ao padrão de qualidade e refinamento do **Impeccable** ([impeccable.style](https://impeccable.style)).

---

## 1. Princípios de Design & Anti-Slop

1. **Autenticidade Gamer & Profissionalismo**:
   - Evitar os clichês de UI gerada por IA (*AI Slop*), como gradientes roxo-para-ciano repetitivos, cards com bordas laterais coloridas unilaterais (`border-l-2`), e efeitos de vidro genéricos sem propósito.
   - Cada detalhe deve remeter à estética de hardware e interfaces gamers de ponta (Steam Deck OS, Battle.net, Discord, Cyberpunk HUDs).

2. **Movimento & Microinterações**:
   - **Proibido `animate-bounce`**: Objetos reais desaceleram suavemente. Usar desaceleração exponencial (`cubic-bezier(0.16, 1, 0.3, 1)` ou `cubic-bezier(0.4, 0, 0.2, 1)`).
   - Efeitos táteis de clique com `active-press` (`scale(0.975)` com transição ágil de `120ms`).
   - Equalizadores de áudio e pulsações usam curvas de onda harmônicas (`eq-wave-*`).

3. **Regras Rígidas de Contraste**:
   - **Nunca texto cinza sobre fundo colorido**: Texto sobre fundos saturados (verde, ciano, âmbar, vermelho) deve ser preto de alto contraste (`text-black font-extrabold`) ou branco nítido (`text-white font-bold`).
   - Contraste mínimo para leitura contínua: $\ge 4.5:1$.

4. **Polimento de Superfícies do Navegador**:
   - `::selection`: Seleção de texto temática personalizada com verde esmeralda translúcido (`rgba(16, 185, 129, 0.35)`).
   - Barra de rolagem esbelta (`width: 6px`), fundo transparente e thumb translúcido com cantos arredondados, reagindo ao hover com a cor de destaque.
   - Anéis de foco nítidos (`:focus-visible` com outline de 2px e offset de 2px).

---

## 2. Paleta de Cores & Tokens Semânticos

| Token | Propósito | Valor / Referência |
|---|---|---|
| `--bg-primary` | Fundo principal da aplicação | `#040a07` (Cyber Emerald) até `#0a0a0a` (Obsidian) |
| `--surface-low` | Superfícies mais profundas / trilhas | `#06100b` |
| `--surface-default` | Cards e painéis padrão | `#0b1711` |
| `--surface-container` | Modais e popovers | `#102119` |
| `--surface-high` | Botões secundários e inputs | `#173024` |
| `--border-default` | Bordas e divisores suaves | `#193829` (1px sutil) |
| `--accent-bright` | Ações principais e destaques ativos | `#3dd69b` |
| `amber-400 / 500` | Moeda, descontos, Radar de Ofertas | Ouro / Dourado tático |
| `cyan-400 / 500` | Rede, links sociais, updates | Ciano elétrico |
| `rose-500 / 600` | Alertas, perigo, encerrar stream | Vermelho carmesim |

---

## 3. Tipografia

- **Títulos & Display (`font-gamer`)**: `Chakra Petch`, `Orbitron`, sans-serif. Utilizado em nomes de jogos, estatísticas de destaque, títulos de modais e identificadores do sistema.
- **Corpo do Texto (`font-sans`)**: `Inter`, system-ui, sans-serif. Escala de 12px a 14px com entrelinha relaxada para leitura de descrições, resenhas e listas.
- **Métricas, Preços & Código (`font-mono`)**: `Geist Mono`, monospace. Utilizado para valores em Reais (BRL), porcentagens de desconto, FPS, bitrate e atalhos de teclado.

---

## 4. Auditoria Contínua com Impeccable

Para garantir que novos componentes ou modificações não introduzam regressões ou anti-patterns:

```bash
# Rodar verificação em todos os arquivos de UI do src:
npx impeccable detect src

# Verificar componentes de uma pasta específica:
npx impeccable detect src/components/deals
```

Meta contínua: **0 anti-patterns encontrados**.
