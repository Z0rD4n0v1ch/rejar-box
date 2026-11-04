#!/usr/bin/env bash
# Отправка Rejar Box на GitHub одной командой.
#   ./sync.sh                 — сообщение коммита с датой
#   ./sync.sh "Новая игра"    — своё сообщение
set -e

REPO_URL="https://github.com/Z0rD4n0v1ch/rejar-box.git"
BRANCH="main"

cd "$(dirname "$0")"

if [ ! -d .git ]; then
  echo "Первый запуск: создаю репозиторий"
  git init -q
  git checkout -q -b "$BRANCH"
  git remote add origin "$REPO_URL"
fi

# Без этого Git для Windows ругается на CRLF
git config core.autocrlf false

git add -A
if git diff --cached --quiet; then
  echo "Новых изменений нет"
else
  MSG="${1:-Обновление $(date '+%Y-%m-%d %H:%M')}"
  git commit -q -m "$MSG"
  echo "Коммит: $MSG"
fi

# Если на GitHub уже есть коммиты — сначала забираем их
if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  git pull -q --rebase origin "$BRANCH"
fi

git push -q -u origin "$BRANCH"
echo "Готово. Сайт: https://z0rd4n0v1ch.github.io/rejar-box/"
