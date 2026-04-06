#!/usr/bin/env python3
"""Читает backend/scripts/faq-sheet.tsv (4 колонки через TAB) → catalog-2026-faq.json."""
import json
import re
from pathlib import Path

DIR = Path(__file__).resolve().parent

SERVICE_TO_SLUG = {
    'Сайт-визитка': 'sajt-vizitka',
    'Сайт на WordPress': 'sajt-na-wordpress',
    'Лендинг': 'landing-page',
    'Корпоративный сайт': 'korporativnyj-sajt',
    'Сайт на Tilda': 'razrabotka-sajta-na-tilda',
    'Сайт на 1С-Битрикс': 'sajt-na-1s-bitriks',
    'Интернет-магазин': 'internet-magazin',
    'UI/UX Дизайн': 'ui-ux-dizajn',
    'SEO-аудит': 'seo-audit',
    'Техподдержка сайтов': 'tekhpodderzhka',
    'SEO-продвижение': 'seo-prodvizhenie',
    'Контекстная реклама': 'kontekstnaya-reklama',
    'Реклама у блогеров': 'reklama-u-blogerov',
    'AI Boost Team': 'ai-boost-team',
    'Маркетинг под ключ': 'marketing-prodazhi',
    'Контент-маркетинг': 'kontent-smm',
    'Мобильное приложение': 'mobilnoe-prilozhenie',
    'DevOps/VPS': 'devops-vps',
    'React-приложение': 'react-prilozhenie',
    'Скорость сайта': 'skorost-sayta',
    'Реклама-аудит': 'reklama-audit',
    'Аналитика setup': 'analitika-setup',
    'WP-миграция': 'wp-migratsiya',
    'AI продвижение': 'ai-prodvizhenie',
    'PWA + мобильное app': 'pwa-mobilnoe-app',
    'Чат-боты': 'chat-boty',
}


def normalize_answer(text: str) -> str:
    text = text.replace('₪', '₽')
    text = text.replace('автоレイアウт', 'Auto Layout')
    return text


def parse_tsv(path: Path) -> dict[str, list[list[str]]]:
    by_svc: dict[str, list[list[str]]] = {}
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        parts = line.split('\t', 3)
        if len(parts) < 4:
            continue
        svc, _n, q, a = parts
        a = normalize_answer(a)
        by_svc.setdefault(svc, []).append([q, a])
    return by_svc


def main():
    tsv = DIR / 'faq-sheet.tsv'
    if not tsv.is_file():
        raise SystemExit(f'Нет {tsv}. Сгенерируйте из транскрипта или положите TSV вручную.')

    by_svc = parse_tsv(tsv)
    out: dict[str, list[list[str]]] = {}
    unknown = []
    for svc, pairs in by_svc.items():
        slug = SERVICE_TO_SLUG.get(svc)
        if not slug:
            unknown.append(svc)
            continue
        out[slug] = pairs

    expected = set(SERVICE_TO_SLUG.values())
    if unknown:
        print('WARN неизвестная услуга в TSV:', unknown)
    if expected - out.keys():
        print('WARN нет блока FAQ для slug:', sorted(expected - out.keys()))
    if out.keys() - expected:
        print('WARN лишние slug в выходе:', sorted(out.keys() - expected))

    out_path = DIR / 'catalog-2026-faq.json'
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('OK', out_path, 'услуг (slug):', len(out))


if __name__ == '__main__':
    main()
