# Gamer's Vault

> **Seu santuário pessoal e social de jogos para Desktop.**

[![React](https://img.shields.io/badge/React-18.3-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Electron](https://img.shields.io/badge/Electron-34.2-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![RAWG API](https://img.shields.io/badge/RAWG_API-Games_Database-black?style=flat-square)](https://rawg.io/apidocs)

---

## Sobre o Projeto

Na era das bibliotecas digitais repletas de promoções na Steam, Game Pass, PlayStation e Epic Games, muitos jogadores enfrentam a famosa "paralisia de escolha" e o acúmulo de backlogs infinitos. Com frequência, zeramos títulos marcantes, mas a experiência se perde na rotina sem um registro especial.

O **Gamer's Vault** nasceu para resgatar o valor de cada jornada gamer. Mais do que um simples catálogo, ele funciona como uma **sala de troféus e diário interativo**, onde cada jogo finalizado é imortalizado com seu tempo dedicado, nota crítica, análise detalhada, capturas de tela e até sua trilha sonora oficial.

### O Fator Social e Incentivo Mútuo
Jogar e vencer desafios fica muito mais empolgante quando compartilhado. O Gamer's Vault conta com o sistema de **Guilda**, permitindo que você adicione seus amigos por ID de Piloto. Pelo feed social e pela inspeção de perfis, você acompanha em tempo real o que seus amigos estão jogando e finalizando, gerando um incentivo saudável para retomar aquele jogo parado na estante, trocar recomendações genuínas e celebrar conquistas em conjunto.

---

## Principais Recursos

### 1. Cofre Pessoal e Flexibilidade de Visualização
* **Coleções por Ano:** Agrupamento automático dos jogos pela data em que foram finalizados (ex: Coleção 2026, 2025, 2024), com métricas individuais de horas totais e média de notas daquele período.
* **Rankings Globais Unificados:** Ordene todo o seu acervo de ponta a ponta por **Tempo de Jogo** (descubra seus jogos mais jogados da vida), **Nota Pessoal**, **Metacritic** ou **Título (A-Z)**.
* **Lista de Desejos e Backlog:** Filtros rápidos entre jogos *Finalizados*, *Quero Jogar* e visualização geral da biblioteca.

### 2. Trilha Sonora de Fundo & Player de Tema dos Jogos
* **Ambiente Estilo EA Trax:** Player de música embutido com playlist embaralhada automaticamente (shuffle inteligente), transições suaves e notificação deslizante no canto da tela informando a faixa e artista.
* **Player In-App de Temas de Jogos:** Ao abrir os detalhes de um jogo, você pode reproduzir a música tema oficial (via links do YouTube ou arquivos de áudio) com equalizador animado, pausando a música ambiente automaticamente sem necessidade de abrir abas externas no navegador.
* **Controle de Som Fluído:** Ajuste de volume e mute diretamente na barra superior, projetado com tolerância e sem engasgos de cursor.

### 3. Descoberta de Jogos (Aba Descobrir)
* Integração direta com a base de dados da **RAWG API** (mais de 500.000 jogos).
* Carrossel de destaques e filtros por categorias curadas: *Ação & RPG*, *Mundo Aberto*, *Indies*, *Melhores Avaliados* e lançamentos recentes.
* Paginação numérica instantânea e indicador visual inteligente para jogos que você já possui cadastrados no seu cofre.

### 4. Guilda e Feed Social
* **Feed de Atividades:** Acompanhe os jogos que seus amigos zeraram recentemente com notas, horas e datas.
* **Inspecionar Vault do Amigo:** Clique no perfil de qualquer amigo da guilda para abrir a biblioteca dele em modo leitura, com acesso a notas, análises e tempo de jogo.
* **Ranking de Membros:** Estatísticas combinadas da guilda, exibindo os maiores exploradores e recordistas de horas.

### 5. Estatísticas & Métricas Pessoais
* Painel analítico consolidando total de horas registradas, taxa de conclusão de backlog, nota média geral, título favorito e gráfico de distribuição de gêneros mais jogados.

### 6. Personalização & Abertura Cinemática
* **5 Paletas Visuais Gamer:** Alterne instantaneamente entre os temas *Cyber Emerald*, *Electric Cyan*, *Solar Amber*, *Synthwave Void* e *Blood Crimson*.
* **Intro em Vídeo:** Suporte a vídeo de abertura cinemático (`public/intro.mp4`) com fallback para logo holográfica e possibilidade de pular a qualquer momento (`ESC`, `Espaço` ou clique).

---

## Configuração das APIs e Serviços

O Gamer's Vault utiliza o **Firebase** para autenticação e sincronização de dados em nuvem, e a **RAWG API** para busca e enriquecimento de capas e metadados.

### 1. Configurando o Firebase (Gratuito)
1. Acesse o [Firebase Console](https://console.firebase.google.com/) e crie um novo projeto.
2. No menu lateral, acesse **Authentication** > **Sign-in method** e ative o provedor **Email/Senha**.
3. Em **Firestore Database**, clique em **Criar banco de dados** (inicie em modo de teste ou configure as regras de leitura e escrita para usuários autenticados).
4. Acesse as **Configurações do Projeto** (ícone de engrenagem) e, na seção *Seus aplicativos*, crie um aplicativo Web (`</>`) para obter as credenciais do SDK.

### 2. Obtendo a Chave da RAWG API (Gratuito)
1. Crie uma conta gratuita no [RAWG.io](https://rawg.io/).
2. Acesse a página de [RAWG API Docs](https://rawg.io/apidocs) e solicite uma **API Key** de desenvolvedor.

### 3. Inserindo as Credenciais no Projeto

Você pode configurar as credenciais de duas maneiras:

#### Opção A: Via Arquivo `.env` (Recomendado para Desenvolvimento)
Crie um arquivo `.env` na raiz do projeto preenchendo as variáveis conforme o `.env.example`:

```env
# Firebase Firestore & Authentication
VITE_FIREBASE_API_KEY=sua_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id

# RAWG API Key
VITE_RAWG_API_KEY=sua_chave_rawg_aqui
```

#### Opção B: Diretamente pela Interface do App
Se você já estiver executando o aplicativo ou utilizando o `.exe` compilado, clique no ícone de engrenagem (**Configurações**) na barra superior e cole suas chaves nos campos correspondentes. Elas serão salvas localmente no cliente com segurança.

---

## Como Executar Localmente

### Pré-requisitos
* [Node.js](https://nodejs.org/) (versão 18.x ou superior recomendada)
* Gerenciador de pacotes `npm`

### Instalação
```bash
# 1. Clone o repositório
git clone https://github.com/Felipe-G03/GamerVault.git
cd GamerVault

# 2. Instale as dependências
npm install

# 3. Inicie o ambiente de desenvolvimento web (Vite)
npm run dev

# Ou inicie diretamente na janela do Electron com Hot-Reload
npm run electron:dev
```

### Gerando o Executável Desktop (`.exe`)
Para empacotar o Gamer's Vault como um instalador nativo do Windows:
```bash
npm run electron:build
```
Os arquivos gerados estarão disponíveis no diretório `dist-electron/`:
* `Gamer's Vault Setup X.X.X.exe` (Instalador NSIS autônomo)
* `win-unpacked/` (Executável descompactado pronto para uso)

---

## Músicas de Fundo Personalizadas

Para personalizar a trilha sonora ambiente do seu Gamer's Vault:
1. Adicione seus arquivos no formato `.mp3` dentro da pasta `public/bgm/`.
2. Configure os títulos e artistas no arquivo `src/config/bgmPlaylist.js`.

---

## Estrutura de Dados no Firestore

* `/profiles/{userId}`: Perfil do jogador (nickname, email, lista de amigos por ID).
* `/users/{userId}/games/{gameId}`: Dados dos jogos salvos (título, horas jogadas, nota, análise crítica, screenshots, data de conclusão, metacritic, tema musical).

---

## Licença

Distribuído sob a licença **MIT**. Consulte o arquivo `LICENSE` para mais detalhes.
