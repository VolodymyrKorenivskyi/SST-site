# Налаштування Git для роботи з двома GitHub акаунтами

## Проблема
У вас два GitHub акаунти:
- `VolodymyrKorenivskyi` - для цього репозиторію
- `Volodymyr120473` - для інших репозиторіїв

## Рішення: Локальна конфігурація для кожного репозиторію

### Варіант 1: Локальна конфігурація + Personal Access Token (Рекомендовано)

#### Для репозиторію SST-site (VolodymyrKorenivskyi):

```bash
# Встановити локальну конфігурацію для цього репозиторію
git config --local user.name "VolodymyrKorenivskyi"
git config --local user.email "ваш_email_для_VolodymyrKorenivskyi@example.com"

# Переконатися, що remote правильний
git remote set-url origin https://github.com/VolodymyrKorenivskyi/SST-site.git
```

#### Для інших репозиторіїв (Volodymyr120473):

```bash
# В кожному репозиторії встановити локальну конфігурацію
git config --local user.name "Volodymyr120473"
git config --local user.email "ваш_email_для_Volodymyr120473@example.com"
```

#### При push використовувати токени:

1. **Для VolodymyrKorenivskyi:**
   - Створіть токен: https://github.com/settings/tokens
   - При `git push` введіть:
     - Username: `VolodymyrKorenivskyi`
     - Password: ваш Personal Access Token

2. **Для Volodymyr120473:**
   - Створіть окремий токен для цього акаунту
   - При `git push` введіть:
     - Username: `Volodymyr120473`
     - Password: ваш Personal Access Token

### Варіант 2: SSH ключі для кожного акаунту (Найкраще для безпеки)

#### Крок 1: Створити два SSH ключі

```bash
# Для VolodymyrKorenivskyi
ssh-keygen -t ed25519 -C "email_для_VolodymyrKorenivskyi@example.com" -f ~/.ssh/id_ed25519_korenivskyi

# Для Volodymyr120473
ssh-keygen -t ed25519 -C "email_для_Volodymyr120473@example.com" -f ~/.ssh/id_ed25519_120473
```

#### Крок 2: Додати ключі в SSH agent

```bash
# Запустити ssh-agent
Start-Service ssh-agent

# Додати ключі
ssh-add ~/.ssh/id_ed25519_korenivskyi
ssh-add ~/.ssh/id_ed25519_120473
```

#### Крок 3: Додати публічні ключі на GitHub

1. Скопіювати публічний ключ:
```bash
Get-Content ~/.ssh/id_ed25519_korenivskyi.pub | Set-Clipboard
```

2. Додати на GitHub:
   - Для VolodymyrKorenivskyi: https://github.com/settings/keys
   - Для Volodymyr120473: https://github.com/settings/keys (увійти під цим акаунтом)

#### Крок 4: Налаштувати SSH config

Створіть/відредагуйте файл `~/.ssh/config`:

```
# Акаунт VolodymyrKorenivskyi
Host github.com-korenivskyi
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_korenivskyi
    IdentitiesOnly yes

# Акаунт Volodymyr120473
Host github.com-120473
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_120473
    IdentitiesOnly yes
```

#### Крок 5: Змінити remote URL для SST-site

```bash
git remote set-url origin git@github.com-korenivskyi:VolodymyrKorenivskyi/SST-site.git
```

Для інших репозиторіїв використовуйте:
```bash
git remote set-url origin git@github.com-120473:Volodymyr120473/назва-репо.git
```

### Варіант 3: Git Credential Manager з різними токенами

Windows Credential Manager може зберігати різні credentials для різних URL.

1. Видалити старі credentials:
```powershell
# Відкрити Credential Manager
cmdkey /list

# Видалити старі GitHub credentials
cmdkey /delete:git:https://github.com
```

2. При першому push ввести правильні credentials для кожного репозиторію.

## Перевірка конфігурації

```bash
# Перевірити локальну конфігурацію
git config --local --list

# Перевірити глобальну конфігурацію
git config --global --list

# Перевірити remote
git remote -v
```

## Швидкий скрипт для налаштування нового репозиторію

Створіть файл `setup-repo.ps1`:

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$Account,  # "korenivskyi" або "120473"
    
    [Parameter(Mandatory=$true)]
    [string]$RepoName,
    
    [Parameter(Mandatory=$true)]
    [string]$Email
)

$username = if ($Account -eq "korenivskyi") { "VolodymyrKorenivskyi" } else { "Volodymyr120473" }
$hostAlias = "github.com-$Account"

git config --local user.name $username
git config --local user.email $Email
git remote set-url origin "git@${hostAlias}:${username}/${RepoName}.git"

Write-Host "✅ Репозиторій налаштовано для акаунту $username"
```

Використання:
```powershell
.\setup-repo.ps1 -Account "korenivskyi" -RepoName "SST-site" -Email "your@email.com"
```
