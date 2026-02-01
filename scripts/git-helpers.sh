#!/bin/bash

# Git helper scripts для безопасной работы

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция для создания новой feature ветки
new_feature() {
    if [ -z "$1" ]; then
        echo -e "${RED}Ошибка: укажи название фичи${NC}"
        echo "Использование: new_feature название-фичи"
        return 1
    fi
    
    BRANCH_NAME="feature/$1"
    
    echo -e "${YELLOW}Обновляю main...${NC}"
    git checkout main
    git pull origin main
    
    echo -e "${YELLOW}Создаю ветку $BRANCH_NAME...${NC}"
    git checkout -b "$BRANCH_NAME"
    
    echo -e "${GREEN}Готово! Ты в ветке $BRANCH_NAME${NC}"
    echo -e "${YELLOW}Теперь можешь работать над фичей${NC}"
}

# Функция для создания fix ветки
new_fix() {
    if [ -z "$1" ]; then
        echo -e "${RED}Ошибка: укажи описание бага${NC}"
        echo "Использование: new_fix описание-бага"
        return 1
    fi
    
    BRANCH_NAME="fix/$1"
    
    echo -e "${YELLOW}Обновляю main...${NC}"
    git checkout main
    git pull origin main
    
    echo -e "${YELLOW}Создаю ветку $BRANCH_NAME...${NC}"
    git checkout -b "$BRANCH_NAME"
    
    echo -e "${GREEN}Готово! Ты в ветке $BRANCH_NAME${NC}"
}

# Функция для безопасного коммита
safe_commit() {
    if [ -z "$1" ]; then
        echo -e "${RED}Ошибка: укажи сообщение коммита${NC}"
        echo "Использование: safe_commit 'сообщение'"
        return 1
    fi
    
    CURRENT_BRANCH=$(git branch --show-current)
    
    if [ "$CURRENT_BRANCH" = "main" ]; then
        echo -e "${RED}ВНИМАНИЕ: ты в main ветке!${NC}"
        read -p "Продолжить? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi
    
    echo -e "${YELLOW}Добавляю изменения...${NC}"
    git add .
    
    echo -e "${YELLOW}Создаю коммит...${NC}"
    git commit -m "$1"
    
    echo -e "${GREEN}Коммит создан!${NC}"
    echo -e "${YELLOW}Текущая ветка: $CURRENT_BRANCH${NC}"
}

# Функция для безопасного push
safe_push() {
    CURRENT_BRANCH=$(git branch --show-current)
    
    if [ "$CURRENT_BRANCH" = "main" ]; then
        echo -e "${RED}ВНИМАНИЕ: ты собираешься запушить в main!${NC}"
        read -p "Продолжить? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi
    
    echo -e "${YELLOW}Отправляю изменения...${NC}"
    git push origin "$CURRENT_BRANCH"
    
    echo -e "${GREEN}Изменения отправлены!${NC}"
}

# Функция для мержа feature ветки в main
merge_feature() {
    if [ -z "$1" ]; then
        CURRENT_BRANCH=$(git branch --show-current)
        if [[ $CURRENT_BRANCH == feature/* ]] || [[ $CURRENT_BRANCH == fix/* ]]; then
            BRANCH_NAME="$CURRENT_BRANCH"
        else
            echo -e "${RED}Ошибка: укажи название ветки или переключись на feature/fix ветку${NC}"
            echo "Использование: merge_feature [название-ветки]"
            return 1
        fi
    else
        BRANCH_NAME="$1"
    fi
    
    echo -e "${YELLOW}Переключаюсь на main...${NC}"
    git checkout main
    git pull origin main
    
    echo -e "${YELLOW}Мержу $BRANCH_NAME в main...${NC}"
    git merge "$BRANCH_NAME"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Мерж успешен!${NC}"
        echo -e "${YELLOW}Отправляю изменения в main...${NC}"
        git push origin main
        
        read -p "Удалить ветку $BRANCH_NAME? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git branch -d "$BRANCH_NAME"
            git push origin --delete "$BRANCH_NAME" 2>/dev/null
            echo -e "${GREEN}Ветка удалена${NC}"
        fi
    else
        echo -e "${RED}Конфликты при мерже! Исправь их вручную${NC}"
        return 1
    fi
}

# Функция для отката к последнему рабочему состоянию main
reset_to_main() {
    echo -e "${RED}ВНИМАНИЕ: это откатит все локальные изменения!${NC}"
    read -p "Продолжить? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 1
    fi
    
    echo -e "${YELLOW}Откатываю к последнему состоянию main...${NC}"
    git checkout main
    git fetch origin
    git reset --hard origin/main
    
    echo -e "${GREEN}Готово! Проект в последнем рабочем состоянии${NC}"
}

# Функция для показа статуса
show_status() {
    CURRENT_BRANCH=$(git branch --show-current)
    echo -e "${GREEN}Текущая ветка: $CURRENT_BRANCH${NC}"
    echo ""
    echo -e "${YELLOW}Статус:${NC}"
    git status -s
    echo ""
    echo -e "${YELLOW}Последние коммиты:${NC}"
    git log --oneline -5
}

# Показываем доступные команды
if [ "$1" = "help" ] || [ -z "$1" ]; then
    echo -e "${GREEN}Доступные команды:${NC}"
    echo "  new_feature название     - создать новую feature ветку"
    echo "  new_fix описание         - создать новую fix ветку"
    echo "  safe_commit 'сообщение'  - безопасный коммит"
    echo "  safe_push                - безопасный push"
    echo "  merge_feature [ветка]    - мерж feature ветки в main"
    echo "  reset_to_main            - откат к последнему main"
    echo "  show_status              - показать статус"
fi
