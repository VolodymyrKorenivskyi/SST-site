# Покрокова інструкція - Налаштування Git

## ✅ Крок 1: Локальна конфігурація - ВИКОНАНО
- ✅ user.name = VolodymyrKorenivskyi
- ✅ user.email = volodymyr.korenivskyi@fintech-farm.com

## 🔄 Крок 2: Створення Personal Access Token

1. Відкрийте в браузері: https://github.com/settings/tokens
2. Натисніть кнопку **"Generate new token"** → **"Generate new token (classic)"**
3. Заповніть форму:
   - **Note**: `SST-site` (або будь-яка назва)
   - **Expiration**: оберіть термін дії (рекомендую 90 днів або більше)
   - **Select scopes**: оберіть **`repo`** (це дасть повний доступ до репозиторіїв)
4. Прокрутіть вниз і натисніть **"Generate token"**
5. ⚠️ **ВАЖЛИВО**: Скопіюйте токен зараз! Він показується тільки один раз.
   - Токен виглядає приблизно так: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## ✅ Крок 3: Push на GitHub - ВИКОНАНО
- ✅ Старі credentials видалено
- ✅ Код успішно запушено на GitHub
- ✅ Репозиторій доступний: https://github.com/VolodymyrKorenivskyi/SST-site

Всі наступні push будуть працювати автоматично зі збереженими credentials.
