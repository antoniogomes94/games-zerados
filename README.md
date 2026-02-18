# Games Dashboard

Um dashboard simples para visualizar sua coleção de jogos zerados, baseado em uma planilha do Google Sheets.

## Funcionalidades

- Exibe jogos de uma planilha pública do Google Sheets
- Filtros por plataforma e ano
- Ordenação alfabética, por ano, ou plataforma
- Busca automática de capas via APIs (RAWG e TheGamesDB)
- Atualização de capas na planilha via Google Apps Script

## Configuração

1. **Planilha do Google Sheets**:
   - Crie uma planilha com colunas: Game, Ano, Plataforma, Condição, Capa
   - Publique a planilha como CSV (Arquivo > Publicar na web > Formato: CSV)
   - Copie o ID da planilha da URL (parte entre /d/ e /edit)

2. **Chaves de API** (opcionais, para busca de capas):
   - **RAWG**: Obtenha em https://rawg.io/apidocs
   - **TheGamesDB**: Registre em https://thegamesdb.net/

3. **Google Apps Script** (opcional, para atualizar capas):
   - Crie um script no Apps Script para atualizar células
   - Publique como web app

4. **Arquivo config.js**:
   - Edite `config.js` com suas chaves e IDs
   - **IMPORTANTE**: Não commite este arquivo no repositório público!

## Como Usar

1. Clone ou baixe o repositório
2. Configure `config.js` com suas credenciais
3. Abra `index.html` no navegador

## Hospedagem no GitHub Pages

1. Crie um repositório público no GitHub
2. Faça push do código (exceto `config.js`, que está no .gitignore)
3. Vá para Settings > Pages no repositório
4. Selecione branch `main` e pasta `/(root)`
5. Clique em Save
6. A página estará disponível em `https://<seu-usuario>.github.io/<nome-do-repo>/`

**Nota**: Para a funcionalidade completa, você precisará configurar `config.js` localmente ou via outro método seguro, pois as chaves não podem ser armazenadas publicamente.

## Estrutura do Projeto

- `index.html`: Página principal
- `script.js`: Lógica JavaScript
- `style.css`: Estilos CSS
- `config.js`: Configurações (não commitado)
- `.gitignore`: Arquivos ignorados pelo Git