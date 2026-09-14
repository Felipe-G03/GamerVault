# 🎮 Gamer's Vault

> **Seu depósito pessoal e social de jogos para Desktop.**

O **Gamer's Vault** é um aplicativo desktop moderno construído com **Electron**, **React**, **Vite** e **Tailwind CSS**, integrado ao **Firebase Firestore** e à **RAWG API**. Ele permite rastrear todos os seus jogos zerados e em progresso, avaliar com notas e reviews críticas, salvar memórias/screenshots, ouvir trilhas sonoras temáticas diretamente no app e acompanhar as conquistas dos seus amigos na Guilda.

---

## ✨ Funcionalidades Principais

- 🏛️ **Vault & Acervo Pessoal**:
  - Cards visuais com capas em alta definição, tempo de jogo e badges de nota coloridas em neon.
  - Filtros rápidos por Status (*Finalizado*, *Quero Jogar*, *Jogando*, *Abandonado*).
  - Ordenação dinâmica por Nota, Data de Conclusão, Tempo de Jogo, Título (A-Z) ou Metacritic.
  - Busca textual instantânea por título e gênero.

- 🎬 **Visão Expandida Cinematográfica**:
  - Banner imersivo, análise crítica completa, dados do Metacritic e tags oficiais da RAWG.
  - Galeria de screenshots com lightbox (visualizador ampliado).
  - **Conversor inteligente de links do Google Drive**: converte automaticamente URLs de compartilhamento do Drive para carregamento direto.

- 🎵 **Player de Trilha Sonora Tema (In-App)**:
  - Reproduza a música tema do jogo (via YouTube ou links de áudio direto) sem abrir janelas externas no navegador!
  - Painel de áudio neon com botões Play/Pause, mudo, slider de volume e barras de equalizador animadas.

- 🔍 **Adicionar Jogo em 2 Passos**:
  - **Passo 1**: Busca instantânea no catálogo da RAWG API com prévias de capas, gêneros e notas Metacritic.
  - **Passo 2**: Formulário detalhado com Status, Data de Conclusão, Horas de Jogo, Nota (1 a 10), Análise, Screenshots e Trilha Sonora.

- 🛡️ **Guilda & Feed Social**:
  - Feed em tempo real com as atividades recentes dos amigos adicionados (quem finalizou qual jogo, data e nota).
  - **Inspecionar Vault do Amigo**: explore a coleção completa de qualquer amigo cadastrado em modo leitura!

- 📊 **Estatísticas Gamer**:
  - Painel com total de horas jogadas, quantidade de jogos zerados vs backlog, nota média pessoal, título favorito e ranking de gêneros mais jogados.

- 👤 **Perfil & Gerenciamento de Amigos**:
  - Definição de Nickname personalizado.
  - Seu **ID de Piloto** único com botão de cópia rápida.
  - Adição e remoção de amigos por ID.

---

## 🛠️ Tecnologias Utilizadas

- **Desktop**: [Electron](https://www.electronjs.org/) (Janela customizada com Titlebar Gamer)
- **Frontend**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/) (Tema Gamer Dark Neon)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Banco de Dados & Auth**: [Firebase Firestore & Firebase Authentication](https://firebase.google.com/)
- **Catálogo de Jogos**: [RAWG Video Games Database API](https://rawg.io/apidocs)

---

## 🚀 Como Executar o Projeto

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) versão 18 ou superior.

### 2. Clonar e Instalar Dependências
```bash
git clone https://github.com/SEU_USUARIO/gamervault.git
cd gamervault
npm install
```

### 3. Configurar Credenciais (Firebase & RAWG)
Você pode criar um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```env
# Firebase Firestore & Auth
VITE_FIREBASE_API_KEY=sua_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_project_id
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id

# RAWG API Key (Obtenha gratuitamente em https://rawg.io/apidocs)
VITE_RAWG_API_KEY=sua_rawg_api_key
```

> 💡 **Dica**: Caso prefira, você também pode inserir suas chaves diretamente dentro do aplicativo clicando no ícone de engrenagem ⚙️ (Configurações) na tela inicial.

---

## 💻 Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento web (Vite) em `http://localhost:5173` |
| `npm run build` | Compila o bundle de produção do React/Vite |
| `npm run electron:dev` | Inicia o Vite e abre a janela do aplicativo desktop Electron com Hot-Reload |
| `npm run electron:build` | Gera o executável/instalador `.exe` para Windows na pasta `dist-electron` |

---

## 📁 Estrutura do Firestore

O projeto mantém total compatibilidade com a estrutura existente:

- `/profiles/{userId}`:
  - `email`: string
  - `nickname`: string
  - `friends`: string[] (IDs de Piloto)

- `/users/{userId}/games/{gameId}`:
  - `title`: string
  - `status`: string ("Finalizado", "Quero Jogar", "Jogando", "Abandonado")
  - `rating`: number (1 a 10)
  - `playtime`: string (horas jogadas)
  - `dateFinished`: string ("YYYY-MM-DD")
  - `review`: string
  - `imageUrl`: string (URL da imagem RAWG)
  - `metacritic`: number
  - `genre`: string
  - `genre_slugs`: string[]
  - `tags`: string[]
  - `screenshots`: string[]
  - `themeUrl`: string | null
  - `createdAt`: Timestamp
