---
module: 01-10
title: Unix CLI & Bash, Filesystem, Permissões, Pipes, Scripting
stage: fundamentos
prereqs: [01-02]
gates:
  conceitual: { status: pending, date: null, attempts: 0, notes: null }
  pratico: { status: pending, date: null, attempts: 0, notes: null }
  conexoes: { status: pending, date: null, attempts: 0, notes: null }
status: locked
quiz:
  - q: "Por que `cmd >file 2>&1` produz resultado diferente de `cmd 2>&1 >file`?"
    options:
      - "Não há diferença; o shell normaliza ambas as formas internamente."
      - "Redirecionamentos são processados left-to-right: na 1ª, fd2 é duplicado APÓS fd1 ir pro file (ambos vão pro file); na 2ª, fd2 duplica fd1 ainda apontando ao terminal e só depois fd1 vai pro file (stderr fica no terminal)."
      - "A 2ª forma falha porque `2>&1` não pode preceder `>`."
      - "A 1ª manda stderr pro terminal; a 2ª manda tudo pro file."
    correct: 1
    explanation: "Bash aplica redirecionamentos da esquerda pra direita. `>file 2>&1` joga stdout no file e depois faz stderr apontar pra mesma destination (file). `2>&1 >file` faz stderr copiar a destination atual de stdout (terminal) e só depois redireciona stdout, deixando stderr no terminal."
  - q: "Qual a distinção fundamental entre hard link e symbolic link em filesystem Unix?"
    options:
      - "Hard link funciona só dentro do mesmo diretório; symlink atravessa diretórios."
      - "Hard link é uma entrada de diretório adicional apontando ao mesmo inode (mesmos dados); symlink é um arquivo cujo conteúdo é um path string e quebra se o alvo for movido."
      - "Symlinks são mais rápidos porque o kernel cacheia o inode."
      - "Hard links só funcionam pra binários executáveis."
    correct: 1
    explanation: "Hard link cria nome adicional pro mesmo inode, então deletar o original não afeta o conteúdo (refcount > 0). Symlink armazena o path como dado; se o alvo se move/deleta, o symlink fica dangling."
  - q: "Por que `set -euo pipefail` é considerado strict mode essencial em scripts Bash?"
    options:
      - "Aumenta performance ao desligar logging interno do shell."
      - "Faz exit em erro (`-e`), trata variável não-set como erro (`-u`), e propaga falhas em qualquer comando do pipe (`-o pipefail`), evitando que scripts continuem silenciosamente após bugs."
      - "Bloqueia uso de comandos externos não-listados em allowlist."
      - "Desabilita word splitting completamente."
    correct: 1
    explanation: "Sem essas flags, scripts Bash continuam rodando após erros (mascarando falhas), tratam typos de variável como string vazia, e ignoram falha de qualquer comando exceto o último num pipe. `set -euo pipefail` torna falhas explícitas."
  - q: "O que torna `find . | xargs grep pattern` problemático em arquivos com nomes contendo espaços ou newlines?"
    options:
      - "`xargs` quebra args por whitespace (incluindo espaços e \\n) por padrão, então um nome com espaço vira múltiplos args; use `find -print0 | xargs -0` ou `find -exec`."
      - "`grep` não suporta múltiplos arquivos como input."
      - "`find` não pode pipe pra outros comandos."
      - "O shell não permite chaining acima de 100 arquivos."
    correct: 0
    explanation: "Por padrão xargs split por whitespace, quebrando paths com espaço/newline. A solução canônica é `find -print0` (separa por null byte) com `xargs -0`, ou usar `find -exec ... +` que entrega args sem reparse."
  - q: "Qual o significado do bit setuid (`s` no execute do owner) em um binário como `/usr/bin/passwd`?"
    options:
      - "O binário só pode ser executado pelo owner."
      - "Quando executado, o processo herda o UID do owner do arquivo (geralmente root), permitindo operações privilegiadas como editar `/etc/shadow`."
      - "O binário é cacheado em memória pra acesso rápido."
      - "Apenas o usuário `root` pode modificar o arquivo, mas qualquer um executa com seu próprio UID."
    correct: 1
    explanation: "Setuid faz o processo rodar com o UID do owner em vez do invoker. Por isso `passwd` (owned by root, setuid) consegue ler/escrever `/etc/shadow` mesmo quando chamado por usuário comum. É vetor clássico de privilege escalation se mal aplicado."
---

# 01-10, Unix CLI & Bash

## 1. Problema de Engenharia

Unix CLI é a **linguagem natural de servidores**. Toda infra (Docker, K8s, CI/CD, servidores em produção, debugging em incident) acontece em terminal. Devs que dominam shell trabalham 5-10x mais rápido em tarefas de operação.

Sem domínio de shell:
- Você abre arquivo no VSCode pra fazer um `grep` quando `grep -rn 'pattern' .` resolve em 1s.
- Você não automatiza tarefas repetitivas (script de 20 linhas economiza 100 horas no ano).
- Você fica perdido em produção sem GUI, debug precisa ser via SSH + comandos.
- Você não entende erros de pipeline (CI failures, Dockerfile RUN errors).
- Você não consegue ler scripts de outros (e CI/CD pipelines são 90% scripts).

Este módulo te dá **fluência** em CLI Unix, não receitas, mas **modelo mental** das ferramentas e composição.

---

## 2. Teoria Hard

### 2.1 Filesystem Unix

**Hierarquia única** começando em `/`:

```
/
├── bin/         # binários essenciais (ls, cat, sh)
├── boot/        # kernel, initramfs
├── dev/         # device files (/dev/null, /dev/sda, /dev/random)
├── etc/         # configurações sistema
├── home/        # diretórios de usuários (/home/alice)
├── lib/         # bibliotecas compartilhadas
├── opt/         # software opcional
├── proc/        # filesystem virtual com info de processos
├── sys/         # filesystem virtual com info de kernel
├── tmp/         # arquivos temporários (limpo no boot ou via cron)
├── usr/         # programas de usuário (não-essenciais ao boot)
│   ├── bin/
│   ├── lib/
│   └── local/   # programas instalados manualmente
├── var/         # dados variáveis (logs, caches, mail)
└── root/        # home do root
```

**Tudo é arquivo.** Devices (`/dev/sda`), processos (`/proc/<pid>/`), sockets, FIFOs, links, diretórios, tudo é representado como entrada de FS.

**Inode**: estrutura de metadados que identifica um arquivo. Contém: tamanho, permissões, owner, timestamps, ponteiros pros blocos de dados. Nome do arquivo NÃO está no inode, está numa **entrada de diretório** que mapeia nome → inode.

**Hard link**: outra entrada de diretório apontando pro mesmo inode. `ln file link`.
**Symbolic link** (soft link): arquivo especial cujo conteúdo é um path. `ln -s file link`. Quebra se file move.

`ls -i` mostra inode. `ls -l` mostra detalhes.

### 2.2 Permissões

Cada inode tem:
- **owner UID** + **group GID**
- **9 bits de permissão**: `rwxrwxrwx` (owner / group / others)
- **bits especiais**: setuid, setgid, sticky

**Notação:**
- Letra: `rwxr-xr-x`
- Octal: `755` (rwx=7, r-x=5, r-x=5)

`chmod`:
- `chmod 755 file`
- `chmod u+x file` (add execute pro owner)
- `chmod -R go-w dir/` (recursivo, remove write de group/others)

`chown`:
- `chown user:group file`

**setuid (`s` no execute do owner)**: programa roda com UID do owner. Ex: `/usr/bin/passwd` é setuid root pra editar `/etc/shadow`.

**sticky bit (`t` no execute de others)**: em diretório (ex: `/tmp`), só owner pode deletar arquivos.

**umask**: máscara default que **subtrai** permissões em criação. `umask 022` faz arquivos novos serem `644`, dirs `755`.

### 2.3 Standard streams e redirecionamento

Cada processo tem 3 FDs default:
- **0** = stdin
- **1** = stdout
- **2** = stderr

**Redirecionamento:**
- `cmd > file`, stdout pra file (sobrescreve)
- `cmd >> file`, stdout pra file (append)
- `cmd 2> err.log`, stderr
- `cmd > out.log 2>&1`, stdout e stderr pra mesmo file (`2>&1` = "duplica fd 2 pra fd 1")
- `cmd < input`, stdin de file
- `cmd <<EOF ... EOF`, heredoc (string multilinha como stdin)

**Pipe:**
- `cmd1 | cmd2`, stdout do 1 vira stdin do 2.
- Sem temp file, kernel implementa via pipe (FD pareado).
- Permite composição: `cat file | grep pattern | sort | uniq -c | sort -rn | head`

### 2.4 Comandos essenciais

**Navegação:**
- `pwd` (print working dir)
- `cd <path>` (change)
- `ls -la` (listar)
- `tree` (árvore, pode precisar instalar)

**Arquivos:**
- `cp src dst` (copy)
- `mv src dst` (move/rename)
- `rm file` (remove). `rm -rf dir/` (recursivo, force).
- `mkdir -p path/with/parents`
- `touch file` (cria vazio ou atualiza timestamp)
- `cat file` (concatenate, mostra)
- `less file` (paginate)
- `head -n 20 file`, `tail -n 20 file`, `tail -f log` (follow)
- `wc -l file` (count lines)
- `du -sh dir/` (disk usage)
- `df -h` (disk free)

**Texto:**
- `grep -rn 'pattern' .`, busca recursiva, com line numbers
- `grep -E '...'`, extended regex
- `grep -v 'pattern'`, invert match
- `sed 's/foo/bar/g' file`, substitute
- `sed -i 's/foo/bar/g' file`, in place
- `awk '{print $2}' file`, column extraction (campo 2)
- `awk '$3 > 100 {print $1}' file`, condicional
- `cut -d, -f2,4 file.csv`, campos delimitado
- `sort file`, `sort -n` (numeric), `sort -k2,2`
- `uniq -c` (count consecutive)
- `tr 'A-Z' 'a-z'` (translate)
- `xargs`, converte stdin em args (use com `find ... | xargs cmd`)

**Procura:**
- `find . -name '*.ts' -type f`, busca por nome.
- `find . -mtime -7`, modificado nos últimos 7 dias.
- `find . -size +1M`, maior que 1 MB.
- `find . -name '*.tmp' -delete`
- `locate file` (precisa updatedb).

**Processos:**
- `ps aux` (todos processos)
- `ps -ef`, `pgrep`, `pidof`
- `top`, `htop`
- `kill <pid>` (envia SIGTERM), `kill -9 <pid>` (SIGKILL)
- `pkill -f 'pattern'` (kill por nome)
- `nohup cmd &` (detach + ignore SIGHUP)

**Rede:**
- `curl -v https://...`, HTTP request (use `-X POST`, `-H 'Header'`, `-d 'data'`).
- `wget url`, download.
- `dig example.com`, DNS query.
- `ping host`, `mtr host`, `traceroute host`.
- `ss -tlnp` (sockets TCP listening, com PID, moderno; substitui `netstat`).
- `nc -lvp 1234` (netcat: listener TCP).

**Compressão:**
- `tar czf out.tar.gz dir/`, create + gzip.
- `tar xzf in.tar.gz`, extract.
- `gzip file`, `gunzip file.gz`.
- `zstd file` (mais moderno).

**Permissões/users:**
- `whoami`, `id` (UID, GID, groups).
- `sudo cmd`, roda como root.
- `su - user`, switch.

### 2.5 Bash scripting essencial

**Shebang**: `#!/usr/bin/env bash` no topo. Torna executável: `chmod +x script.sh`.

**Variáveis:**
```bash
NAME=alice              # sem espaços!
echo "$NAME"
echo "${NAME}_suffix"
```

**Quoting:**
- `'literal'`, sem expansão.
- `"with $var"`, expande variáveis.
- `$(cmd)`, substitui com saída de comando.
- `` `cmd` ``, legacy, prefira `$(...)`.

**Condicionais:**
```bash
if [ "$x" -eq 0 ]; then
  echo "zero"
elif [ -f "$f" ]; then
  echo "file exists"
else
  echo "else"
fi
```

`[ ... ]` é o teste. `[[ ... ]]` é versão Bash mais segura (suporta `==` com glob, `&&`, `||`).

Operadores comuns:
- Numéricos: `-eq`, `-ne`, `-lt`, `-le`, `-gt`, `-ge`
- Strings: `=`, `!=`, `-z` (vazio), `-n` (não vazio)
- Arquivos: `-e` (existe), `-f` (regular), `-d` (dir), `-r/-w/-x` (perms), `-s` (não vazio)

**Loops:**
```bash
for f in *.txt; do
  echo "$f"
done

for i in {1..10}; do echo "$i"; done

while read -r line; do
  echo "$line"
done < file
```

**Funções:**
```bash
greet() {
  local name="$1"  # local!
  echo "Hi, $name"
}
greet "Alice"
```

**Argumentos do script:**
- `$0`, nome do script
- `$1`, `$2`, ..., args posicionais
- `$@`, todos args (lista)
- `$#`, quantidade de args
- `$?`, exit status do último comando (`0` = success)
- `$$`, PID do shell

**Set strict mode (recomendado):**
```bash
set -euo pipefail
# -e: exit on error
# -u: error on unset variable
# -o pipefail: fail if any command in pipe fails (não só o último)
IFS=$'\n\t'  # field separator: newline + tab (não space)
```

**Logs/erros:**
```bash
log() { echo "[$(date +'%Y-%m-%dT%H:%M:%S')] $*" >&2; }
fail() { log "FATAL: $*"; exit 1; }
```

### 2.6 Variáveis de ambiente

`env` lista todas. `printenv VAR`. `export VAR=value` torna disponível pra subprocessos.

`PATH` é onde shell procura executáveis. `~/.bashrc` ou `~/.zshrc` configuram.

`HOME`, `USER`, `SHELL`, `PWD`, `OLDPWD`, `LANG`, `TZ`, `EDITOR` são clássicas.

`$PATH:/new/path` adiciona.

### 2.7 SSH e remote

`ssh user@host`, login remoto.

**Chaves:**
- `ssh-keygen -t ed25519`, gerar (use ed25519, não RSA).
- `~/.ssh/id_ed25519` (private), `.pub` (public).
- `ssh-copy-id user@host`, copia pública pro `~/.ssh/authorized_keys` no host.

**Config (`~/.ssh/config`):**
```
Host myserver
  HostName 192.168.1.10
  User alice
  Port 2222
  IdentityFile ~/.ssh/myserver_key
```
Aí: `ssh myserver`.

**Port forwarding:**
- `ssh -L 8080:localhost:80 user@host`, local 8080 → host:80 (acessar serviço remoto via local).
- `ssh -R 9000:localhost:3000 user@host`, reverso.

**`scp`** e **`rsync`** pra transferir.

`rsync -av --delete src/ user@host:dst/`, sincroniza (incremental, robusto). Padrão pra deploy/backup.

**`tmux`** ou **`screen`**: multiplexador de terminal, sessão persiste após desconectar SSH.

### 2.8 Cron e scheduling

**Cron** roda jobs em horários. `crontab -e` edita.

```
# m h dom mon dow command
0 3 * * * /opt/backup.sh    # 3am todo dia
*/15 * * * * /opt/sync.sh    # cada 15 min
0 0 * * 0 /opt/weekly.sh     # domingo 00:00
```

`systemd timers` é alternativa moderna.

**`at`**: schedule único (ex: `at now + 1 hour`).

### 2.9 Logs

`/var/log/` contém logs do sistema. `journalctl` (systemd) é a interface moderna:
- `journalctl -u nginx`, logs do unit nginx.
- `journalctl -f`, follow.
- `journalctl --since '1 hour ago'`.
- `journalctl -p err`, errors.

`/var/log/syslog`, `/var/log/auth.log` (auth events), `/var/log/dmesg` (kernel).

### 2.10 Process control e sinais

`Ctrl+C` envia SIGINT.
`Ctrl+Z` envia SIGTSTP (pause).
`bg` (continua em background), `fg` (volta foreground), `jobs` (lista).
`disown` remove do controle do shell (sobrevive a logout).
`nohup cmd &` similar (ignora SIGHUP).

`trap 'echo "got SIGINT"' INT`, captura signal em script.

---

## 3. Threshold de Maestria

Pra passar o **Portão Conceitual**, sem consultar:

- [ ] Listar 5 padrões de redirecionamento e o que cada um faz.
- [ ] Distinguir **hard link** vs **symbolic link**.
- [ ] Explicar **inode** e por que `ls -l` mostra link count.
- [ ] Notação octal de permissões: traduzir `755` → letras e vice-versa.
- [ ] Explicar **setuid** e dar exemplo (`passwd`).
- [ ] Diferença entre `[ ... ]`, `[[ ... ]]` e `(( ... ))` em Bash.
- [ ] Entender `set -euo pipefail` linha por linha.
- [ ] Construir um pipeline pra responder: "quais 10 IPs mais frequentes em access.log?"
  - Resposta clássica: `awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -10`
- [ ] Explicar `cmd >file 2>&1` vs `cmd 2>&1 >file` (ordem importa! segundo redireciona stderr pra terminal).
- [ ] Diferença entre `cron` e `systemd timer`.
- [ ] Explicar `tmux`/`screen` em uma frase.

---

## 4. Desafio de Engenharia

**Implementar `lograt`, analizador de logs estruturados em Bash + (opcional) Node.**

### Especificação

`lograt` é uma CLI que analisa logs de uma aplicação web (formato JSON Lines, um por request) e gera relatórios.

#### Formato de log de entrada

Cada linha é JSON:
```json
{"ts":"2026-04-28T10:23:45Z","method":"GET","path":"/api/users","status":200,"latency_ms":42,"ip":"1.2.3.4","user_id":"u123"}
```

#### Comandos

1. `lograt summary <logfile>`, Imprime:
   - Total requests
   - Requests por status code (2xx, 3xx, 4xx, 5xx counts)
   - Average, p50, p95, p99 latency
   - Top 10 paths por count
   - Top 10 IPs por count
2. `lograt errors <logfile>`, só requests 5xx, com timestamp + path + IP.
3. `lograt slow <logfile> --threshold 1000`, requests > threshold ms.
4. `lograt user <user_id> <logfile>`, requests de um user específico, ordenadas por timestamp.
5. `lograt rate <logfile> --window 60`, RPS por janela de 60 segundos.

### Restrições

- **Implementar em Bash puro** (com `awk`, `sort`, `uniq`, `jq` permitido, **`jq` é a única dep externa**).
- **Sem Python, Node, Ruby** no caminho principal.
- Funcionar em arquivos de **1 milhão de linhas** em <30s no seu hardware.

### Opcional (Stretch)

- Reescrever em Node TS pra comparar performance.
- Suporte a leitura **streaming** (logfile = `-` → lê de stdin, pode pipe `tail -f log | lograt summary -`).
- Output em JSON ou Markdown table.

### Threshold

- Todos comandos funcionam corretamente em log de teste.
- Documenta no README:
  - Cada pipeline `awk | sort | uniq` que você usa, com explicação linha-a-linha.
  - Como você calcula percentis (sorted column → pega índice).
  - Por que Bash + `awk` é mais rápido que Python pra processar logs (less overhead, streaming nativo).

### Exemplo de uso final
```bash
$ lograt summary access.log
Total: 1,234,567
By status: 2xx=1,100,234 / 3xx=50,000 / 4xx=80,000 / 5xx=4,333
Latency (ms): avg=87, p50=42, p95=320, p99=1,234
Top paths:
  423,456 /api/users
  234,567 /api/orders
  ...
```

---

## 5. Extensões e Conexões

- **Conecta com [01-02, OS](01-02-operating-systems.md):** comandos shell são processos. Pipes são FDs. Permissões são features do kernel.
- **Conecta com [01-09, Git Internals](01-09-git-internals.md):** `gitignore`, `find`, `xargs` pra operações em massa em repos.
- **Conecta com [03-02, Docker](../03-producao/03-02-docker.md):** Dockerfile é shell + comandos. Entrypoint é shell.
- **Conecta com [03-04, CI/CD](../03-producao/03-04-cicd.md):** GitHub Actions runs shell. Workflows são scripts.
- **Conecta com [03-07, Observability](../03-producao/03-07-observability.md):** análise de logs com `awk`/`jq` é a porta de entrada antes de Loki/Grafana.

### Ferramentas satélites

- **`ripgrep` (`rg`)**: substitui `grep`, muito mais rápido.
- **`fd`**: substitui `find`, sintaxe melhor.
- **`bat`**: substitui `cat` com syntax highlight.
- **`exa`/`eza`**: substitui `ls` com cores.
- **`fzf`**: fuzzy finder interativo (use em CLI, em vim, em shell history).
- **`tldr`**: examples curtos por comando (`tldr tar`).
- **`man`**: manual oficial (`man 7 signal`).
- **`shellcheck`**: lint pra Bash.

---

## 6. Referências de Elite

### Livros canônicos
- **The Linux Command Line** (William Shotts), free em [linuxcommand.org](https://linuxcommand.org/tlcl.php). Comprehensive, didático.
- **The Art of Unix Programming** (Eric Raymond), free em [catb.org/esr/writings/taoup](http://www.catb.org/esr/writings/taoup/). **Filosofia** Unix. Leia.
- **Advanced Programming in the UNIX Environment** (Stevens, "APUE"), bíblia.
- **The Linux Programming Interface** (Kerrisk), alternativa moderna.
- **bash Cookbook** (Albing & Vossen), receitas.

### Recursos online
- **[explainshell.com](https://explainshell.com/)**: cole um comando, mostra cada parte.
- **[Bash Manual](https://www.gnu.org/software/bash/manual/)**: oficial.
- **[Bash Reference (greg's wiki)](https://mywiki.wooledge.org/BashGuide)**: alternative reference.
- **[shellscript.sh](https://www.shellscript.sh/)**: referência prática.
- **[awk one-liners](https://www.pement.org/awk/awk1line.txt)**: collections de truques.
- **[sed one-liners](https://www.pement.org/sed/sed1line.txt)**.

### Repos
- **[busybox](https://www.busybox.net/)**: implementações minimal de comandos. Excelente pra ler.
- **[coreutils](https://github.com/coreutils/coreutils)**: implementação GNU.
- **[ohmyzsh](https://github.com/ohmyzsh/ohmyzsh)**: vasto repositório de aliases/funções.

### Talks
- **["Practical Tips and Tricks of Modern Bash"](https://www.youtube.com/watch?v=uh2FqejiTaE)**.
- **["Awk Master Class"](https://www.youtube.com/results?search_query=awk+master+class)**.

### Comunidade
- **[r/commandline](https://www.reddit.com/r/commandline)**.
- **[r/bash](https://www.reddit.com/r/bash)**.
- **[Hacker News + 'unix'](https://hn.algolia.com/?query=unix)**.

---

**Encerramento:** após 01-10 você é fluente em terminal, operação, debug, automação. Isso te transforma na sessão de prod a 3am, em CI/CD pipelines, em qualquer ambiente Linux. **Pratique diariamente.**
