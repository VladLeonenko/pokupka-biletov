#!/bin/bash

# Настройка удобных алиасов для Git

echo "Настраиваю Git алиасы..."

# Добавляем алиасы в .gitconfig
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual '!gitk'

# Полезные алиасы для работы с ветками
git config --global alias.new-feature '!f() { git checkout main && git pull origin main && git checkout -b feature/$1; }; f'
git config --global alias.new-fix '!f() { git checkout main && git pull origin main && git checkout -b fix/$1; }; f'

echo "Алиасы настроены!"
echo ""
echo "Теперь можно использовать:"
echo "  git st          - статус"
echo "  git co          - checkout"
echo "  git br          - branch"
echo "  git ci          - commit"
echo "  git last        - последний коммит"
