---
module: N09
title: Git Interno — Objetos, Refs, Three Areas, Rebase vs Merge
stage: novice
prereqs: [N04]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
---

# N09 — Git Interno

## 1. Problema de Engenharia

A maioria dos devs usa Git como mágica. `git pull`, `git push`, copia comandos do Stack Overflow quando algo dá errado. Quando há merge conflict complexo, rebase interativo, ou precisa recuperar commits "perdidos", trava.

**Git é uma estrutura de dados** — uma DAG (directed acyclic graph) de **commits**, cada um apontando pra **trees**, que apontam pra **blobs**. Tudo identificado por **SHA-1** (em transição pra SHA-256). É um **sistema de versionamento de conteúdo distribuído** com modelo simples e operações compostas a partir desse modelo.

Entender Git por dentro significa:
- Você nunca mais "perde commits" — sabe usar `reflog`.
- Você consegue fazer **rebase interativo** com confiança (squash, edit, reorder).
- Você entende quando **`merge` é melhor** que rebase (e vice-versa).
- Você consegue recuperar trabalho de qualquer estado (mesmo "detached HEAD" intencional).
- Você lê erros e sabe o que cada um significa em termos de DAG.

---

## 2. Teoria Hard

### 2.1 Modelo: content-addressable storage

Tudo no Git é objeto identificado por **hash SHA-1** (40 chars hex) do **conteúdo**. Mesmo conteúdo → mesmo hash. Conteúdo diferente → hash diferente (com altíssima probabilidade — colisões SHA-1 são teoricamente possíveis, na prática negligenciáveis).

**3 tipos de objetos:**

1. **Blob**: conteúdo de arquivo. Sem nome, sem permissões. Só bytes.
   ```
   $ echo "hello" | git hash-object --stdin
   ce013625030ba8dba906f756967f9e9ca394464a
   ```
2. **Tree**: snapshot de diretório. Lista de entries: `(mode, type, hash, name)`. Aponta pra blobs (arquivos) e outras trees (subdiretórios).
3. **Commit**: snapshot do projeto. Aponta pra:
   - **1 tree** (root do projeto)
   - **N parents** (commits anteriores; merge = 2+ parents)
   - **author**, **committer**, **timestamp**, **message**

**Tudo armazenado em** `.git/objects/`:
```
.git/objects/ab/cdef1234...  # primeiros 2 chars como diretório
```

Conteúdo é **zlib-compressed**. Cabeçalho: `<type> <size>\0<content>`.

**Packfiles**: depois de N objetos soltos, Git compacta em packfiles (`.pack`) com **delta compression** (cada objeto codificado como diff de outro similar). Otimização de espaço/transferência.

### 2.2 Refs

**Refs** são ponteiros nomeados pra commits.

- **Branches**: refs em `refs/heads/<name>`. `main` é só o ponteiro `refs/heads/main` → commit X.
- **Tags**: refs em `refs/tags/<name>`. **Lightweight tag** = ref direto. **Annotated tag** = objeto tag com mensagem.
- **Remote tracking**: `refs/remotes/origin/main` → última posição conhecida do remote.
- **HEAD**: `.git/HEAD`. Aponta pra branch ativo (`ref: refs/heads/main`) ou direto pra commit (detached HEAD).

`git checkout <branch>` muda HEAD. `git checkout <commit>` deixa HEAD detached.

### 2.3 Three areas (working dir, index, HEAD)

Git rastreia mudanças em 3 lugares:

```
Working directory  ──add──►  Index (staging)  ──commit──►  HEAD
       ▲                            │                       │
       │                            │                       │
       └────checkout───reset────────┴───────reset HEAD──────┘
```

- **Working directory**: arquivos no FS.
- **Index (staging)**: snapshot intermediário do que vai virar próximo commit. Contém info de cada arquivo: hash blob, mode, nome.
- **HEAD**: último commit no branch ativo.

**Comandos:**
- `git add <file>`: WD → Index.
- `git commit`: Index → novo commit; HEAD avança.
- `git reset --soft <commit>`: HEAD muda; Index preservado; WD preservado.
- `git reset --mixed <commit>` (default): HEAD muda; Index reset; WD preservado.
- `git reset --hard <commit>`: HEAD, Index e WD resetam. **Destrutivo.**
- `git checkout -- <file>`: descarta mudanças de WD.

**`git status`** mostra diferenças entre os 3.

### 2.4 Branches e merging

**Branch é só um ponteiro mutável.** Criação é O(1) — só cria um ref novo.

**Merge** (default `--ff` quando possível): se branch atual está em ancestral do branch-alvo, **fast-forward** (move o ponteiro pra frente). Se há divergência, cria **merge commit** com 2 parents.

**`--no-ff`** força merge commit mesmo quando fast-forward seria possível — mantém histórico explícito de "houve um branch aqui".

**`--squash`**: combina mudanças em 1 commit linear. Não cria merge commit. Histórico fica mais limpo, mas perde info de branching.

### 2.5 Rebase

**`git rebase <base>`**: pega commits do branch atual desde divergência com `base`, e os **reaplica** em cima de `base`.

Resultado: histórico **linear**, sem merge commits. Bom pra branches de feature antes de merge na main.

```
Antes:
A---B---C---D (main)
     \
      E---F (feature)

Depois de `git rebase main` em feature:
A---B---C---D (main)
             \
              E'---F' (feature)
```

**E'** e **F'** são **novos commits** (hashes diferentes). E e F antigos viram lixo (coletado eventualmente).

**Regra de ouro:** **NUNCA** rebase commits que já foram pushados pra branch compartilhado. Você reescreve história, outros têm divergência.

**Rebase interativo (`git rebase -i <base>`):** abre editor com lista de commits. Você pode:
- `pick` (manter)
- `reword` (mudar message)
- `edit` (parar pra modificar)
- `squash` (juntar com anterior)
- `fixup` (squash sem manter message)
- `drop` (descartar)
- reordenar

Ferramenta poderosíssima pra limpar histórico antes de PR.

### 2.6 Merge vs Rebase — quando cada

**Merge:**
- Mantém histórico real (incluindo "este branch existiu").
- Não reescreve nada — seguro pra branches compartilhados.
- Histórico fica "ramificado", pode ficar visualmente complexo.

**Rebase:**
- Histórico linear, mais legível.
- Reescreve commits — perigoso em branches públicos.
- Bom pra atualizar feature branches privados com main antes de PR.

**Política comum em times maduros:**
- Feature branches: rebase em cima de main antes de abrir PR.
- Merge na main: usar `--no-ff` ou squash merge (preferência do time).
- **Nunca** rebase main, develop, release branches.

### 2.7 reflog — sua salvação

`git reflog` é log local de **toda movimentação de HEAD** (e de cada branch). Cada checkout, commit, reset, rebase é registrado por ~90 dias.

```
$ git reflog
abc1234 HEAD@{0}: rebase: ...
def5678 HEAD@{1}: checkout: moving from feature to main
...
```

Se você fez `git reset --hard` e perdeu commits: `git reflog` mostra. `git checkout <hash>` e você está de volta.

**reflog é a razão pela qual quase nada se perde de verdade no Git.** Os objetos só somem após GC (`git gc`), tipicamente >30-90 dias.

### 2.8 Stash

`git stash`: salva mudanças não-commitadas em uma pilha de stashes. Útil quando precisa trocar de branch.

- `git stash push -m "msg"`
- `git stash list`
- `git stash pop` (aplica e remove)
- `git stash apply` (aplica, não remove)
- `git stash drop`

Stash é **commit normal** com 2-3 parents (working tree + index, opcional untracked) em `refs/stash`.

### 2.9 Cherry-pick e revert

**`git cherry-pick <hash>`**: aplica as mudanças de um commit específico no branch atual. Cria novo commit. Útil pra portar bugfix entre branches.

**`git revert <hash>`**: cria **novo commit** que **desfaz** as mudanças. Não reescreve história. Seguro em branches públicos.

Diferente de `reset` que **apaga** o commit.

### 2.10 Remotes

`git remote -v` lista remotes. Cada remote tem ref `refs/remotes/<remote>/<branch>`.

`git fetch`: traz objetos do remote, atualiza `refs/remotes/`. **Não muda branches locais.**
`git pull` = `fetch` + `merge` (ou `--rebase`).
`git push`: envia commits locais ao remote.

**`git push --force`** sobrescreve remote — perigoso. **`git push --force-with-lease`**: só sobrescreve se remote ainda está onde você esperava (não houve push de outro entre seu fetch e push).

**Rule:** **NUNCA** `--force` em main/master/develop. **Use `--force-with-lease`** mesmo em feature branches.

### 2.11 Hooks

Scripts em `.git/hooks/` executados em eventos. Úteis: `pre-commit` (lint), `commit-msg` (validação de mensagem), `pre-push` (testes), `post-merge`.

**Husky** (Node) automatiza setup de hooks. **lint-staged** roda lint só em arquivos staged.

### 2.12 .gitignore e .gitattributes

`.gitignore`: padrões de paths a ignorar.
`.gitattributes`: metadados por path (line endings, diff personalizado, lock, filtros).

**Cuidado**: `.gitignore` **não** unstage arquivos já tracked. Use `git rm --cached <file>`.

### 2.13 GitHub PR workflow (clássico)

1. Fork (se externo) ou clone.
2. Branch local: `git checkout -b feat/x`.
3. Commits.
4. Rebase em main: `git fetch origin && git rebase origin/main`.
5. Push: `git push -u origin feat/x`.
6. Abrir PR.
7. CI roda. Reviewer pede mudanças.
8. Adiciona commits ou amend → push (`--force-with-lease` se rebased).
9. Aprovado → merge (squash ou rebase merge, conforme política).

---

## 3. Threshold de Maestria

Pra passar o **Portão Conceitual**, sem consultar:

- [ ] Listar os 3 tipos de objetos do Git e o que cada um contém.
- [ ] Explicar como Git é **content-addressable** e por que mesmo conteúdo dá mesmo hash.
- [ ] Desenhar a **DAG** de um repositório com 2 branches que divergiram e merge.
- [ ] Distinguir **fast-forward merge**, **merge commit**, **squash merge**.
- [ ] Explicar **rebase** em termos de DAG (commits viram cópias).
- [ ] Listar 3 cenários onde **rebase é errado**.
- [ ] Diferenciar `git reset --soft|--mixed|--hard`.
- [ ] Distinguir `git revert` vs `git reset` em termos de histórico.
- [ ] Explicar **HEAD detached** e quando ocorre.
- [ ] Explicar **reflog** e como recuperar `git reset --hard` perdido.
- [ ] Explicar **`--force-with-lease`** e por que é mais seguro que `--force`.
- [ ] Dar caso onde `cherry-pick` é melhor que merge/rebase.

---

## 4. Desafio de Engenharia

**Implementar `mygit` — uma versão minimalista do Git em TypeScript.**

### Especificação

CLI que suporta:

1. **`mygit init`**: cria diretório `.mygit/` com estrutura mínima (`objects/`, `refs/heads/`, `HEAD`).
2. **`mygit hash-object [-w] <file>`**: lê arquivo, computa hash SHA-1 (com cabeçalho `blob <size>\0<content>`), opcionalmente escreve em `.mygit/objects/`.
3. **`mygit cat-file -p <hash>`**: lê objeto, descomprime (zlib), imprime conteúdo.
4. **`mygit write-tree`**: pega o **index** (você implementa simples, ex: arquivo `index.json` com lista de paths + hashes), constrói tree object recursivamente, escreve.
5. **`mygit commit-tree <tree-hash> [-p <parent>] -m <msg>`**: cria commit object apontando pra tree, opcionalmente parent.
6. **`mygit log`**: percorre HEAD pra trás imprimindo commits.
7. **`mygit branch <name>`**: cria ref em `refs/heads/`.
8. **`mygit checkout <branch|hash>`**: muda HEAD; popula working dir baseado no tree do commit.

### Restrições

- Use **apenas** `node:fs`, `node:crypto`, `node:zlib`, `node:path`. Sem libs externas.
- Compatibilidade com Git real **não obrigatória**, mas **bonus** se `cat-file` consegue ler objetos do Git real.
- Suite de testes:
  - `init` cria estrutura.
  - `hash-object` é determinístico e bate com `git hash-object` real.
  - `write-tree` produz mesma tree pra mesmo conteúdo.
  - `commit-tree` cria commit consistente.
  - `log` percorre histórico em ordem.

### Threshold

- Você consegue criar um repo, hash-object alguns arquivos, write-tree, commit-tree, branch, checkout, log — e o estado é coerente.
- `mygit hash-object foo.txt` produz **mesmo SHA** que `git hash-object foo.txt`.
- Documenta no README:
  - Estrutura de objects e por que cabeçalho é `<type> <size>\0`.
  - Fluxo de `write-tree`: como recursa.
  - Como você fez `checkout` (escreve blobs como files, recria tree como dirs).
  - Limitações (ex: sem packfiles, sem merge, sem index real).

### Stretch goals

- **`mygit merge`** simples (3-way merge com diff conflito básico).
- **Packfile reader** (lê `.pack` do Git real).
- **Compatibilidade total**: `mygit init` + commits + `git status` mostra estado correto.

Esse desafio é particularmente valioso porque **você nunca mais vai mistificar Git** depois de ter implementado os 90% do core.

---

## 5. Extensões e Conexões

- **Conecta com [N04 — Data Structures](N04-data-structures.md):** Git é **DAG** + **Merkle tree** (cada commit é hash do tree, que é hash dos blobs). Mesma estrutura de blockchain.
- **Conecta com [N02 — OS](N02-operating-systems.md):** Git usa **file locks** (`*.lock`) pra serializar escritas. `fork`/`exec` ao chamar editor (`commit -m` vs sem -m).
- **Conecta com [N10 — Unix CLI](N10-unix-cli-bash.md):** Git é shell-friendly. Pipes (`git log --oneline | head`), aliases.
- **Conecta com [P04 — CI/CD](../03-professional/P04-cicd.md):** GitHub Actions triggers em commits/PRs. Branch protection rules.
- **Conecta com [S11 — Web3](../04-senior/S11-web3.md):** Merkle trees, content-addressable storage. Git foi inspiração pra muito de blockchain.

### Ferramentas satélites

- **`git log --graph --oneline --all`** — visualizar DAG.
- **[GitKraken](https://www.gitkraken.com/)**, **[Sourcetree](https://www.sourcetreeapp.com/)** — GUIs.
- **[lazygit](https://github.com/jesseduffield/lazygit)** — TUI excelente.
- **[git-extras](https://github.com/tj/git-extras)** — comandos extras.
- **[husky](https://typicode.github.io/husky/)** + **[lint-staged](https://github.com/okonet/lint-staged)** — hooks fáceis.
- **[gh CLI](https://cli.github.com/)** — GitHub via terminal.

---

## 6. Referências de Elite

### Livros canônicos
- **Pro Git** (Scott Chacon) — free em [git-scm.com/book](https://git-scm.com/book/en/v2). **Capítulo 10 ("Git Internals") é leitura obrigatória.**
- **Git Internals** (Scott Chacon, free PDF) — versão antiga focada em internos.

### Recursos online
- **[Atlassian Git Tutorials](https://www.atlassian.com/git/tutorials)** — bom didático.
- **[Git from the Bottom Up](https://jwiegley.github.io/git-from-the-bottom-up/)** — John Wiegley. Bottom-up, brilhante.
- **[Git Magic](http://www-cs-students.stanford.edu/~blynn/gitmagic/)** — alternativa.
- **[Oh Shit, Git!?!](https://ohshitgit.com/)** — receitas pra desastres comuns.
- **[Wyag (Write Yourself a Git)](https://wyag.thb.lt/)** — guia pra implementar git, em Python (vai te inspirar).

### Talks
- **["Deep Dive into Git"](https://www.youtube.com/watch?v=VjvcAxAy9_Y)** — Edward Thomson.
- **["Git from the inside out"](https://www.youtube.com/watch?v=fCtZWGhQBvo)** — Mary Rose Cook.
- **["Demystifying Git"](https://www.youtube.com/watch?v=lG90LZotrpo)**.

### Repos
- **[git source](https://github.com/git/git)** — `Documentation/technical/` tem docs internas excelentes.
- **[wyag](https://wyag.thb.lt/)** — minimal git em Python pra ler.
- **[gitoxide](https://github.com/Byron/gitoxide)** — implementação moderna em Rust.

### Comunidade
- **[Linus Torvalds talk on Git (2007)](https://www.youtube.com/watch?v=4XpnKHJAok8)** — só pra ver Linus xingar SVN. Vale.

---

**Encerramento:** após N09 você nunca mais "tem medo" de comandos Git. Você raciocina sobre o que cada operação faz no DAG, e operações antes "perigosas" (rebase interativo, force push com lease) viram ferramentas naturais.
