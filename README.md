# 🎮 Gamer's Vault

> Um espaço pessoal e colaborativo para organizar sua jornada nos jogos, celebrar conquistas, transmitir suas gameplays e redescobrir o prazer de jogar.

[![React](https://img.shields.io/badge/React-18.3-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Electron](https://img.shields.io/badge/Electron-34.2-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![LiveKit](https://img.shields.io/badge/LiveKit-SFU_WebRTC-00D26A?style=flat-square&logo=webrtc&logoColor=white)](https://livekit.io/)
[![Windows WASAPI](https://img.shields.io/badge/Audio-WASAPI_Process_Loopback-0078D6?style=flat-square&logo=windows&logoColor=white)](https://docs.microsoft.com/en-us/windows/win32/coreaudio/wasapi)
[![RAWG API](https://img.shields.io/badge/RAWG_API-Games_Database-black?style=flat-square)](https://rawg.io/apidocs)
[![YouTube API](https://img.shields.io/badge/YouTube_API-v3-red?style=flat-square&logo=youtube&logoColor=white)](https://developers.google.com/youtube/v3)

---

## 💡 O Propósito: Por que Gamer's Vault?

A rotina da maioria dos gamers hoje é acelerada e muitas vezes cansativa. Depois de passar o dia trabalhando e estudando, o momento de lazer frequentemente se transforma em frustração: sentar na frente do PC com centenas de opções na Steam, Epic ou Game Pass, ficar rolando listas por meia hora e fechar tudo sem jogar nada.

Esse sentimento tem raízes psicológicas bem estudadas:
* **O Paradoxo da Escolha (Barry Schwartz):** O excesso de opções não traz liberdade, mas paralisia decisória.
* **O Efeito Zeigarnik (Bluma Zeigarnik):** Deixar dezenas de jogos inacabados gera um desconforto em segundo plano que transforma o lazer em uma lista de pendências.

O **Gamer's Vault** transforma sua relação com os jogos em algo leve, visual e realizador: um lugar para catalogar suas memórias, compartilhar transmissões ao vivo com seus amigos mais próximos e celebrar cada momento vivido.

---

## 🌟 Principais Recursos

### 1. 📡 VaultCast: Transmissões ao Vivo na Guilda
* **Streaming de Baixíssima Latência:** Transmissão de vídeo via WebRTC com suporte híbrido (LiveKit SFU de alta escala e Mesh P2P).
* **Áudio Exclusivo por Processo (WASAPI Nativo):** Captura isolada do áudio do jogo através de um helper nativo Windows (`get_window_pid.exe` em Win32 C#). Seus amigos ouvem apenas o som do jogo, sem eco de chamadas do Discord, vídeos de fundo ou notificações do sistema.
* **Notificação Automática via Webhook:** Avisos automáticos no canal do Discord da sua guilda quando alguém começa a transmitir.

### 2. 🕹️ Gamers Hub: Lançador Unificado de Jogos
* **Scanner Automático Multiplataforma:** Localiza seus jogos instalados na **Steam**, **Epic Games Store**, **EA App**, **Xbox Game Pass** e **Ubisoft Connect**.
* **Lançamento com 1 Clique:** Execute qualquer jogo diretamente do Gamer's Vault.
* **Atalho Global de Teclado (`Alt + Espaço`):** Abra o aplicativo instantaneamente de qualquer lugar, mesmo com outro jogo em tela cheia.
* **Modo Standby de Zero Consumo:** Quando minimizado na bandeja do sistema (System Tray), o app suspende todas as animações, áudios e renderizações para **0% de uso de CPU e GPU**.

### 3. 📚 Sala de Recordações & Backlog
* **Coleções Anuais:** Histórico organizado por ano de conclusão com total de horas investidas e médias de notas.
* **Coleção de Dropados / Abandonados:** Registre os títulos que você decidiu não continuar, com horas jogadas e motivo do abandono (sem julgamentos e sem exigência de nota).
* **Botão "Finalizei esse jogo!":** Retome um jogo dropado a qualquer momento e converta-o em finalizado com resenha e avaliação completa.
* **Filtros e Ordenações:** Classifique por tempo jogado, nota pessoal, pontuação do Metacritic ou ordem alfabética.

### 4. 🛡️ A Guilda Social
* **Feed de Atividades em Tempo Real:** Acompanhe o que seus amigos estão jogando, zerando ou abandonando.
* **Pódios Descontraídos:** Rankings dinâmicos de quem jogou mais horas, quem zerou mais jogos e quem acumulou mais drops.
* **Espiar Coleção:** Navegue pela biblioteca dos seus amigos para descobrir novas recomendações sinceras.

### 5. 🔍 Catálogo Global & Mídia
* **Base de Dados RAWG API:** Mais de 500 mil jogos com carrosséis temáticos e traduções automáticas para português.
* **Trailers Embutidos (YouTube Data API v3):** Assista a gameplays e trailers oficiais dentro do próprio aplicativo.
* **Trilhas Sonoras & BGM:** Player de música ambiente com suporte a faixas personalizadas (`public/bgm/`) e temas individuais por jogo.
* **6 Temas Visuais Personalizados:** Cyber Emerald, Electric Cyan, Midnight Violet, Solar Amber, Synthwave Void e Blood Crimson.

### 6. 🔄 Sistema de Atualizações Automáticas & Manuais
* **Detecção Automática:** Verificação de novas versões ao iniciar via Firebase Firestore.
* **Busca Manual a Qualquer Momento:** Botão de verificação instantânea na barra superior e na aba de Configurações do Sistema.
* **Download Transparente:** Atualização direta via Dropbox com barra de progresso e instalação automatizada.

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologia |
|---|---|
| **Ambiente Desktop** | Electron 34, Node.js N-API |
| **Interface & Estilo** | React 18, Vite 6, TailwindCSS, Lucide Icons |
| **Streaming & Áudio** | LiveKit Client & Server SDK, WebRTC, loopback-capture, WASAPI C# Native Helper |
| **Banco de Dados & Nuvem** | Firebase Firestore, Firebase Authentication, Firebase Hosting |
| **APIs Externas** | RAWG Video Games Database API, YouTube Data API v3 |
| **Automação de Deploy** | Python 3, Dropbox SDK API, electron-builder (NSIS) |

---

## 🚀 Como Executar o Projeto Localmente

### 1. Pré-requisitos
* [Node.js](https://nodejs.org/) (versão 18 ou superior)
* Gerenciador de pacotes `npm`
* [Python 3](https://www.python.org/) (opcional, para deploys e automações)

### 2. Instalação e Execução

```bash
# Clone o repositório
git clone https://github.com/Felipe-G03/GamerVault.git
cd GamerVault

# Instale as dependências
npm install

# Inicie no modo de desenvolvimento com Electron
npm run electron:dev
```

### 3. Variáveis de Ambiente (`.env`)

Crie um arquivo `.env` na raiz do projeto com base no modelo abaixo:

```env
# Firebase
VITE_FIREBASE_API_KEY=sua_chave_firebase
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id

# APIs de Conteúdo
VITE_RAWG_API_KEY=sua_chave_rawg
VITE_YOUTUBE_API_KEY=sua_chave_youtube

# LiveKit (VaultCast)
VITE_LIVEKIT_URL=wss://seu-projeto.livekit.cloud
LIVEKIT_API_KEY=sua_livekit_api_key
LIVEKIT_API_SECRET=sua_livekit_api_secret

# Discord Webhook (Notificações do VaultCast)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Dropbox (Publicação de Releases)
DROPBOX_REFRESH_TOKEN=seu_refresh_token
DROPBOX_APP_KEY=seu_app_key
DROPBOX_APP_SECRET=seu_app_secret
```

### 4. Compilando o Instalador Windows (`.exe`)

```bash
npm run electron:build
```
O instalador standalone `.exe` será gerado automaticamente na pasta `dist-electron/`.

---

## 📜 Histórico de Versões

* **v2.3.5 (Atual):**
  * **Isolamento de Áudio por Processo (WASAPI):** Helper nativo Win32 (`get_window_pid.exe`) com resolução de processo em <15ms para qualquer tipo de janela/jogo.
  * **3 Modos de Áudio no VaultCast:** Áudio Exclusivo da Janela, Áudio do PC Inteiro ou Mudo.
  * **Busca Manual de Atualizações:** Verificação sob demanda adicionada na Barra de Título e nas Configurações.
  * **Enumeração Rápida de Fontes:** Eliminação de travamentos ao listar telas e janelas.
* **v2.3.0 - v2.3.4:**
  * Integração de streaming ao vivo com LiveKit SFU e suporte a Webhook no Discord.
  * Deep Linking nativo (`gamervault://cast`).
  * Gamers Hub para escaneamento de plataformas e execução de jogos.
  * Atalho global `Alt + Espaço` e modo Standby de zero consumo.
* **v2.1.6:**
  * Coleção de Jogos Dropados / Abandonados com fluxo de retomada.
  * Pódios de drops na Guilda.
* **v2.1.5:**
  * Busca integrada de trailers oficiais com a YouTube Data API v3.
  * Tradução dinâmica de descrições da RAWG para português.
* **v2.0.0:**
  * Reformulação total da interface em React 18, Vite e Electron 34 com sincronização em nuvem via Firebase.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja o arquivo `LICENSE` para mais detalhes.
