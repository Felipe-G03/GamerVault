# Gamer's Vault

> Um espaço pessoal e colaborativo para organizar sua jornada nos jogos, celebrar conquistas e redescobrir o prazer de jogar.

[![React](https://img.shields.io/badge/React-18.3-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Electron](https://img.shields.io/badge/Electron-34.2-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![RAWG API](https://img.shields.io/badge/RAWG_API-Games_Database-black?style=flat-square)](https://rawg.io/apidocs)
[![YouTube API](https://img.shields.io/badge/YouTube_API-v3-red?style=flat-square&logo=youtube&logoColor=white)](https://developers.google.com/youtube/v3)

---

## O Propósito: Por que criamos o Gamer's Vault?

A rotina da maioria das pessoas hoje é acelerada e cansativa. Depois de passar o dia trabalhando, estudando e resolvendo pendências, o momento do descanso muitas vezes acaba virando outra fonte de frustração. Quem nunca sentou na frente do computador com uma biblioteca cheia de opções na Steam, Game Pass ou PlayStation, abriu a lista de jogos, ficou olhando a tela por vinte minutos e acabou fechando tudo sem jogar nada?

Esse sentimento comum tem explicações conhecidas na psicologia:

* **O Paradoxo da Escolha (estudo do psicólogo Barry Schwartz):** Ter opções infinitas à disposição muitas vezes não traz liberdade, mas sim paralisia. Quando temos jogos demais na fila, o cérebro se cansa só de tentar decidir por onde começar.
* **O Efeito Zeigarnik (pesquisa da psicóloga Bluma Zeigarnik):** Nossa mente tende a guardar um desconforto sutil com atividades que deixamos pela metade. Uma lista cheia de títulos começados e nunca terminados passa a parecer uma lista de obrigações em vez de um momento de lazer.

O **Gamer's Vault** nasceu justamente para transformar essa relação com os jogos em algo leve e recompensador. 

A ideia não é correr para zerar o máximo de títulos possíveis, mas sim valorizar cada experiência vivida. Quando você organiza seu backlog com clareza, encerra um ciclo ao finalizar uma história e anota suas próprias impressões, você resgata o valor daquele tempo que dedicou a si mesmo. Ver sua evolução ao longo dos anos cria uma sensação gostosa de nostalgia e realização.

---

## O Que o Aplicativo Faz

### 1. Sua Sala de Recordações e Conquistas
* **Coleções Organizadas por Ano:** Cada jogo finalizado vai para a coleção do respectivo ano (ex: Coleção 2026, 2025, 2024), mostrando o total de horas dedicadas e a média das suas avaliações naquele período.
* **Classificação Livre da Sua Biblioteca:** Ordene todo o seu acervo por tempo de jogo (para relembrar quais mundos mais prenderam sua atenção), nota pessoal, pontuação do Metacritic ou ordem alfabética.
* **Status Intuitivos:** Separe claramente o que você está jogando no momento, o que finalizou com sucesso, o que está na fila com prioridade e o que decidiu pausar.

### 2. A Guilda: Companheirismo Sem Pressão
Jogar fica muito mais legal quando você pode trocar impressões com amigos. O sistema de Guilda foi feito para incentivar e aproximar:
* **Feed de Conquistas em Tempo Real:** Veja quando alguém da sua guilda zerou um título, a nota que deu e o que achou da experiência.
* **Espiar a Coleção do Amigo:** Abra o perfil de um amigo em modo leitura para ver as avaliações dele e pegar recomendações sinceras para a sua próxima aventura.
* **Sem Competição Tóxica:** Não se trata de quem joga mais rápido, mas de celebrar as histórias que cada um viveu.

### 3. Descoberta Curada de Jogos
* **Catálogo Global (RAWG API):** Navegação por mais de 500 mil jogos com carrosséis temáticos de RPG, Ação, Indies, Mundos Abertos e Clássicos.
* **Trailers Direto no App (YouTube Data API v3):** Busque e assista aos trailers e gameplays oficiais direto na tela de detalhes do jogo, sem precisar abrir navegadores externos.
* **Tradução Automática para Português:** Sinopses e informações traduzidas dinamicamente para o português brasileiro, facilitando a leitura e a escolha do próximo título.

---

## Tem Isso Aqui Também (Detalhes que Fazem a Diferença)

Além das ferramentas principais, o aplicativo conta com pequenos toques pensados para deixar o ambiente aconchegante:

* **Música Ambiente Personalizável:** Player de áudio embutido que toca faixas com transição suave e notificação discreta no canto da tela. Você pode colocar as suas próprias músicas favoritas em formato `.mp3` na pasta `public/bgm/`.
* **Tema Musical Individual do Jogo:** Cada ficha de jogo pode ter sua música tema oficial vinculada (via YouTube ou áudio), pausando a música ambiente automaticamente enquanto você escuta.
* **6 Opções de Temas Visuais:** Escolha entre cores diferentes para combinar com o seu estilo (Midnight Violet, Cyber Emerald, Electric Cyan, Solar Amber, Synthwave Void e Blood Crimson).
* **Configuração Fácil pela Própria Tela:** Todas as chaves de integração podem ser preenchidas direto no menu de Configurações do app, sem precisar mexer em linhas de código.

---

## Arquitetura e Tecnologias Utilizadas

O projeto foi construído pensando em estabilidade, segurança e independência para quem quiser executá-lo:

* **Electron 34:** Aplicação desktop nativa com isolamento de contexto e comunicação segura via IPC.
* **React 18 + Vite:** Interface moderna, rápida e com carregamento instantâneo.
* **TailwindCSS:** Estilização responsiva e paletas com transições suaves.
* **Firebase (Firestore & Authentication):** Banco de dados em nuvem para sincronizar seus jogos e perfis com regras de segurança ativas.
* **Automação de Deploy (Python + Dropbox API):** Script interno para envio de instaladores para nuvem e atualização imediata de versões no banco de dados.

---

## Como Executar o Projeto no Seu Computador

### 1. Pré-requisitos
* [Node.js](https://nodejs.org/) (versão 18 ou superior instalada)
* Gerenciador de pacotes `npm`

### 2. Instalação Passo a Passo

```bash
# Clone o repositório
git clone https://github.com/Felipe-G03/GamerVault.git
cd GamerVault

# Instale as dependências
npm install

# Inicie o ambiente de desenvolvimento
npm run dev

# Ou inicie a janela do aplicativo no Electron
npm run electron:dev
```

### 3. Configurando Suas Próprias Chaves (Gratuito)

Para que o aplicativo funcione com seus próprios dados e buscas, você pode obter as chaves gratuitas dos serviços:

1. **Firebase:** Crie um projeto no [Firebase Console](https://console.firebase.google.com/), ative o **Authentication** (Email/Senha) e o **Firestore Database**. Pegue os dados de conexão do seu app web.
2. **RAWG API:** Crie uma conta gratuita em [RAWG.io](https://rawg.io/apidocs) e gere sua API Key para busca de jogos.
3. **YouTube Data API v3:** No Google Cloud Console, ative a YouTube Data API v3 e crie uma chave de API para carregar trailers.

Você pode colar essas chaves diretamente na janela de **Configurações** do aplicativo (no ícone de engrenagem) ou criar um arquivo `.env` na raiz do projeto com base no modelo `.env.example`:

```env
VITE_FIREBASE_API_KEY=sua_chave
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id

VITE_RAWG_API_KEY=sua_chave_rawg
VITE_YOUTUBE_API_KEY=sua_chave_youtube
```

### 4. Gerando o Instalador Executável (`.exe`)

Se quiser compilar um instalador `.exe` para instalar no seu Windows:
```bash
npm run electron:build
```
O arquivo gerado ficará disponível na pasta `dist-electron/`.

---

## Histórico de Versões

* **v2.1.5:**
  * Busca integrada de trailers e gameplays com a YouTube Data API v3.
  * Tradução dinâmica de descrições da RAWG para português.
  * Novo tema visual Midnight Violet e persistência aprimorada de configurações.
  * Pipeline automatizado de empacotamento e sincronização de atualizações.
* **v2.1.4:**
  * Sistema de notificação e download de atualizações diretamente pela barra superior.
* **v2.1.0:**
  * Feed de atividades da guilda, inspeção de perfis de amigos e melhorias na listagem anual.
* **v2.0.0:**
  * Reformulação da interface em React com suporte nativo ao Electron e sincronização em nuvem.

---

## Licença

Este projeto é distribuído sob a licença **MIT**. Veja o arquivo `LICENSE` para mais detalhes.
