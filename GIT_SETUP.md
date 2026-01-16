# Налаштування Git для GitHub

## Крок 1: Створіть Personal Access Token

1. Перейдіть на: https://github.com/settings/tokens
2. Натисніть **"Generate new token"** → **"Generate new token (classic)"**
3. Додайте назву: `SST-site`
4. Оберіть scope: **`repo`** (повний доступ до репозиторіїв)
5. Натисніть **"Generate token"**
6. **ВАЖЛИВО**: Скопіюйте токен зараз (він показується тільки один раз!)

## Крок 2: Налаштуйте Git Credential Manager

### Варіант A: Використати токен при push (рекомендовано)

```bash
git push -u origin main
```

Коли запитає:
- **Username**: `VolodymyrKorenivskyi`
- **Password**: вставте ваш Personal Access Token (НЕ пароль від GitHub!)

### Варіант B: Зберегти токен в Git Credential Manager

```bash
git config --global credential.helper wincred
```

Потім при першому push введіть токен, і він збережеться.

### Варіант C: Додати токен в URL (менш безпечно)

```bash
git remote set-url origin https://YOUR_TOKEN@github.com/VolodymyrKorenivskyi/SST-site.git
```

Замініть `YOUR_TOKEN` на ваш токен.

## Крок 3: Запушити код

```bash
git push -u origin main
```

## Альтернатива: SSH (якщо хочете)

1. Створіть SSH ключ:
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

2. Додайте публічний ключ на GitHub:
   - Скопіюйте вміст `~/.ssh/id_ed25519.pub`
   - Додайте на https://github.com/settings/keys

3. Змініть remote на SSH:
```bash
git remote set-url origin git@github.com:VolodymyrKorenivskyi/SST-site.git
```

4. Запушити:
```bash
git push -u origin main
```
