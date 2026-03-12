# 🔐 Proteção de Chaves - QUICK START

## Resumo da Solução

✅ **Chaves são carregadas de forma segura**
✅ **Local (.env.local) - não é commitado**  
✅ **Produção - via GitHub Secrets (seguro)**

---

## 1️⃣ Para Desenvolvimento Local

Seu arquivo `.env.local` já existe com as chaves. Ele **NÃO será commitado** porque está no `.gitignore`.

Para usar localmente, edite conforme necessário:
```bash
# Editar .env.local com suas chaves
nano .env.local   # ou abra no editor
```

---

## 2️⃣ Para GitHub Pages (Produção)

### Passo 1: Push para GitHub
```bash
git add .
git commit -m "Secret management setup"
git push -u origin main
```

### Passo 2: Adicione GitHub Secrets
1. Vá em seu repositório → **Settings**
2. **Secrets and variables → Actions**
3. Clique **New repository secret** e adicione cada linha do `.env.example`:
   - `SHEET_ID`
   - `SHEET_TAB`
   - `RAWG_API_KEY`
   - `THEGAMEDB_API_KEY`
   - `APPS_SCRIPT_URL`
   - `APP_TOKEN`

### Passo 3: Ative GitHub Pages
1. **Settings → Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `main`, **Folder**: `/ (root)`
4. **Save**

Seu site estará em: `https://seu-usuario.github.io/seu-repositorio/`

---

## 3️⃣ O Que Mudou

| Antes | Depois |
|-------|--------|
| Chaves no `config.js` (exposto) | Chaves carregadas de variáveis |
| `config.js` foi commitado | `config.js` seguro (sem secrets) |
| Difícil compartilhar | `.env.example` mostra estrutura |

---

## 4️⃣ Segurança Checklist

- [ ] `.env` e `.env.local` estão no `.gitignore` ✓
- [ ] `config.js` foi atualizado com `getConfig()` ✓
- [ ] `.env.example` criado ✓
- [ ] GitHub Secrets adicionados
- [ ] GitHub Pages ativado

---

## 📖 Documentação Completa

Veja `DEPLOY.md` para instruções detalhadas e troubleshooting.
