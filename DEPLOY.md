# 🚀 Instruções de Deploy para GitHub Pages

## 1. Setup Local (Desenvolvimento)

### Prerequisitos
- Git instalado
- Um repositório GitHub (público ou privado)

### Passos

1. **Clone ou configure seu repositório:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/seu-usuario/seu-repositorio.git
   ```

2. **Configure variáveis de ambiente locais:**
   - O arquivo `.env.local` já está criado com suas chaves
   - Este arquivo **NÃO será commitado** (está no `.gitignore`)
   - Para desenvolvimento local, ele será automaticamente carregado

3. **Teste localmente:**
   - Abra `index.html` no navegador ou use um servidor local:
     ```bash
     python -m http.server 8000
     # ou com Node.js
     npx http-server
     ```

---

## 2. Deploy no GitHub Pages

### Opção A: GitHub Pages com Branch Automático (Recomendado)

1. **Push para GitHub:**
   ```bash
   git branch -M main
   git push -u origin main
   ```

2. **Ative GitHub Pages:**
   - Vá em: **Settings → Pages**
   - Em "Source", selecione: **Deploy from a branch**
   - Escolha: **Branch: `main` → Folder: `/ (root)`**
   - Salve

3. **Adicione GitHub Secrets** (para produção):
   - Vá em: **Settings → Secrets and variables → Actions**
   - Clique em **New repository secret** e adicione:
     - `SHEET_ID`: seu ID da planilha
     - `SHEET_TAB`: nome da aba (ex: "Games Zerados")
     - `RAWG_API_KEY`: sua chave RAWG
     - `THEGAMEDB_API_KEY`: sua chave TheGamesDB
     - `APPS_SCRIPT_URL`: URL do seu Apps Script
     - `APP_TOKEN`: seu token

4. **Seu site estará em:**
   ```
   https://seu-usuario.github.io/seu-repositorio/
   ```

---

### Opção B: GitHub Actions + Injetar Secrets (Mais Seguro)

Se quer que as chaves sejam injetadas apenas em tempo de build:

1. **Crie a pasta `.github/workflows`:**
   ```bash
   mkdir -p .github/workflows
   ```

2. **Crie o arquivo `.github/workflows/deploy.yml`:**
   ```yaml
   name: Deploy to GitHub Pages
   
   on:
     push:
       branches: [ main ]
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         
         - name: Create config.js with secrets
           env:
             SHEET_ID: ${{ secrets.SHEET_ID }}
             SHEET_TAB: ${{ secrets.SHEET_TAB }}
             RAWG_API_KEY: ${{ secrets.RAWG_API_KEY }}
             THEGAMEDB_API_KEY: ${{ secrets.THEGAMEDB_API_KEY }}
             APPS_SCRIPT_URL: ${{ secrets.APPS_SCRIPT_URL }}
             APP_TOKEN: ${{ secrets.APP_TOKEN }}
           run: |
             cat > config-env.js << EOF
             window.__ENV__ = {
               SHEET_ID: '${{ env.SHEET_ID }}',
               SHEET_TAB: '${{ env.SHEET_TAB }}',
               RAWG_API_KEY: '${{ env.RAWG_API_KEY }}',
               THEGAMEDB_API_KEY: '${{ env.THEGAMEDB_API_KEY }}',
               APPS_SCRIPT_URL: '${{ env.APPS_SCRIPT_URL }}',
               APP_TOKEN: '${{ env.APP_TOKEN }}'
             };
             EOF
         
         - name: Deploy
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: .
   ```

3. **Adicione no `index.html`** (após `<head>`):
   ```html
   <script src="config-env.js"></script>
   ```

---

## 3. Segurança - Checklist

✅ **Antes de fazer push:**
- [ ] `.env` e `.env.local` estão no `.gitignore`
- [ ] `config.js` usa `getConfig()` para carregar valores
- [ ] Nenhuma chave real aparece no código commitado
- [ ] Todos os secrets foram adicionados ao GitHub (Settings → Secrets)

✅ **No repositório público:**
- [ ] Apenas `.env.example` mostra a estrutura
- [ ] Nenhuma chave real visível
- [ ] `.gitignore` está configurado

---

## 4. Atualizando Chaves no Futuro

1. **Para desenvolvimento local:**
   - Edite `.env.local`
   - Teste localmente
   - Não faça commit

2. **Para produção (GitHub Pages):**
   - Vá em: **Settings → Secrets and variables → Actions**
   - Clique na secret e clique em "Update"
   - O próximo push acionará um novo build com as chaves atualizadas

---

## 5. Troubleshooting

### Site está vazio ou não carrega dados
- Verifique se os Secrets foram adicionados corretamente
- Verifique o Console (F12) para erros de API
- Confira o `SHEET_ID` e `SHEET_TAB`

### Erro CORS
- Este projeto já tenta usar proxy CORS automático
- Se precisar de solução permanente, crie um backend simples com Vercel/Netlify

### GitHub Pages não atualiza
- Vá em **Actions** no GitHub e verifique se o deploy foi bem-sucedido
- Limpe o cache do navegador (Ctrl+Shift+Del)

---

## 📚 Referências

- [GitHub Pages Docs](https://docs.github.com/en/pages)
- [GitHub Secrets Docs](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Actions](https://docs.github.com/en/actions)
