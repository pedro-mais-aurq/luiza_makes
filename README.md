# Luíza Araújo — demonstração no navegador + SQLite local

Esta edição preserva a landing page, o portfólio, o agendamento e o painel. Ela funciona fora do ChatGPT/Sites: o frontend usa Vite/React com uma demonstração local no navegador. Opcionalmente, o servidor usa Node.js 24 com SQLite em arquivo e login próprio.

## Demonstração sem API (padrão no GitHub Pages)

Nesta versão, sem `VITE_API_URL`, a agenda usa **localStorage**. Agendamentos, bloqueios, clientes, preferências e notificações ficam salvos no navegador e reaparecem ao recarregar a página. Não há banco remoto, servidor ou senha no modo de demonstração. O painel tem acesso livre e todas as telas exibem um aviso de demonstração. Use dados fictícios.

```sh
npm ci
npm run dev
```

Abra **http://127.0.0.1:5173/** e faça uma reserva. Depois abra **http://127.0.0.1:5173/#/admin** para ver o pedido, confirmar, cancelar, bloquear horários e editar preferências. O acesso local por `/admin` também funciona. Os comandos `dev` e `dev:demo` forçam esse modo mesmo se `.env.local` estiver configurado para SQLite.

Para testar o site compilado: `npm run build` e `npm run preview` (a URL aparece no terminal). Sem `.env.local`/variáveis de backend, o build também usa a demonstração.

As abas na mesma origem e caminho de publicação compartilham os dados. Outro navegador, perfil, computador ou endereço de site terá uma agenda separada. Limpar os dados do site apaga a demonstração; no modo privado, eles podem desaparecer ao fechar a sessão. Nas **Preferências → Reiniciar demonstração**, é possível apagar os dados e restaurar a disponibilidade inicial. Reservas pendentes e bloqueios ocupam os horários; cancelamentos os liberam.

Os avisos são demonstrados no painel deste navegador. Nenhum pedido é enviado à maquiadora, e nenhum WhatsApp ou e-mail é enviado automaticamente. O login seguro e o SQLite continuam disponíveis no modo de servidor abaixo.

## Rodar com SQLite no computador

Instale **Node.js 24.13 ou mais recente da linha 24**. Dentro desta pasta:

```sh
npm ci
```

Copie `.env.example` para `.env.local`:

```sh
# macOS / Linux
cp .env.example .env.local
# Windows PowerShell
Copy-Item .env.example .env.local
```

Defina a senha (o terminal não exibe os caracteres):

```sh
npm run admin:password
npm run dev:sqlite
```

Abra **http://127.0.0.1:5173/**. A agenda fica em `/agendar` e o painel em `/admin`; esses endereços locais são normalizados para `/#/agendar` e `/#/admin`. Os links com hash continuam funcionando no GitHub Pages. O Vite encaminha `/api` para a porta 3001. Não é necessário Supabase, Cloudflare ou login do ChatGPT. Após alterar a senha ou as variáveis, reinicie os processos.

O SQLite é criado automaticamente em **data/luiza.sqlite**, com as migrações e tabelas. Reservas, bloqueios, clientes, preferências, notificações e sessões ficam nesse arquivo e sobrevivem à reinicialização. Não apague `data` ao atualizar o código. Não há dados de clientes no pacote; esta é uma nova base local, não uma exportação dos dados do site anterior.

### Servir a versão compilada

```sh
npm run build
npm start
```

Abra **http://127.0.0.1:3001/**. O mesmo servidor entrega o frontend e a API. O acesso direto por `/admin` ou `/admin/` redireciona para `/#/admin`; recarregar o painel preserva a rota.

### Backup consistente

```sh
npm run db:backup
```

Os backups ficam em `data/backups`. O comando usa o mecanismo de backup do SQLite, incluindo alterações ainda no WAL. Para restaurar: pare o servidor; preserve uma cópia dos dados existentes; substitua `data/luiza.sqlite` pelo backup; remova os arquivos auxiliares antigos `luiza.sqlite-wal` e `luiza.sqlite-shm` antes de reiniciar. Não substitua o banco com processos abertos.

## Publicar no GitHub Pages

1. Extraia o ZIP e coloque **o conteúdo desta pasta na raiz do repositório**, incluindo `.github`, `package.json` e `package-lock.json`.
2. Suba o código para a branch `main`.
3. Abra **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. `.github/workflows/deploy.yml` instala dependências, testa o backend, verifica TypeScript, gera o frontend e publica apenas `dist`.
5. Pull requests executam testes e build; somente push em `main` ou execução manual publica.

O workflow calcula `/<nome-do-repositório>/` automaticamente. Para `<usuario>.github.io`, usa `/`. Com domínio próprio, configure a variável de repositório `PAGES_BASE_PATH=/`; adicione o domínio em `public/CNAME` e configure o DNS se necessário.

### O que funciona no Pages

O workflow publica a **demonstração completa sem API por padrão**, incluindo reservas e painel com persistência neste navegador. Nenhuma variável adicional é necessária. Use as rotas `/#/agendar` e `/#/admin` dentro do caminho do repositório (por exemplo `/luiza-araujo/#/admin`); Pages não oferece acesso direto a `/admin`.

GitHub Pages hospeda apenas HTML, CSS e JavaScript. Ele **não executa Node.js nem mantém SQLite no servidor**. Para compartilhar reservas entre visitantes e a maquiadora em produção, é necessário o backend abaixo.

O site público não consegue acessar um SQLite que só está no seu computador. `localhost` no navegador da cliente aponta para o computador dela. Não configure `VITE_API_URL` com `localhost` para uso público.

### Conectar a agenda real e compartilhada

1. Execute este backend em um servidor com Node.js 24 e **disco persistente**. Defina `HOST=0.0.0.0`, `PORT`, `DB_PATH` e `ADMIN_PASSWORD_HASH` no ambiente desse servidor.
2. Coloque a API atrás de HTTPS. Use uma pasta persistente para SQLite; não use hospedagem que apaga arquivos a cada deploy. O backend deve ficar acessível durante o atendimento aos visitantes.
3. No backend, configure `ALLOWED_ORIGINS` com a origem exata do frontend: por exemplo `https://seu-usuario.github.io` ou `https://seu-dominio.com`, **sem caminho ou barra final**.
4. No repositório, abra **Settings → Secrets and variables → Actions → Variables** e crie **VITE_API_URL** com a origem HTTPS pública da API, por exemplo `https://api.seu-dominio.com`, sem `/api` no final.
5. Opcionalmente, configure `VITE_STORAGE_MODE=server`. Com `VITE_API_URL` definida, o workflow já seleciona esse modo automaticamente. Para manter a demonstração mesmo tendo uma URL, configure `VITE_STORAGE_MODE=demo`. Execute novamente o workflow. Essa URL é pública porque integra o frontend; não coloque senhas nela.

Não use `*` em `ALLOWED_ORIGINS`. A API só aceita gravações das origens autorizadas. O login verifica a senha com scrypt e emite uma sessão de 8 horas. O token fica na sessão do navegador, e o banco armazena somente seu hash. O logout revoga a sessão. A senha nunca entra no bundle.

## Configuração

| Variável | Função | Padrão |
| --- | --- | --- |
| `DB_PATH` | Arquivo SQLite do servidor | `./data/luiza.sqlite` |
| `HOST` | Interface do servidor | `127.0.0.1` |
| `PORT` | Porta do servidor | `3001` |
| `ADMIN_PASSWORD_HASH` | Hash scrypt gerado pelo comando de senha | Sem padrão |
| `ALLOWED_ORIGINS` | Origens do frontend autorizadas | Endereços locais nas portas 5173 e 3001 |
| `VITE_STORAGE_MODE` | `demo`: armazenamento no navegador; `server`: backend SQLite | Demonstração quando não há URL de API |
| `VITE_API_URL` | URL pública do backend no frontend | Vazio com modo `server`: chamadas locais para `/api` |
| `BASE_PATH` | Caminho da compilação Vite | `/`; calculado no workflow |
| `PAGES_BASE_PATH` | Variável do repositório que sobrepõe o caminho do Pages | Opcional |

`.env.local`, `data`, sessões e backups ficam no `.gitignore`. O workflow envia apenas `dist`, nunca o banco ou as credenciais.

## Verificações

```sh
npm test
npm run build
```

Os testes verificam o armazenamento demonstrativo (persistência, conflitos, cancelamentos, notificações, preferências e falha de gravação) e executam a API com banco temporário: autorização, login/logout, CORS, reservas concorrentes, bloqueios, cancelamento, persistência, preferências e validação de dados. Não acessam o banco real.

## Limites preservados

- Horários de Brasília e intervalos de 30 minutos.
- Pedidos públicos entram pendentes e ocupam o horário imediatamente.
- Notificações ficam no painel; avisos de navegador exigem o painel aberto.
- WhatsApp abre a conversa com a cliente; sem envio automático de mensagens ou e-mail.
- Serviços e durações editáveis; valores sob consulta.
