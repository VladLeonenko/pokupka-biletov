#!/usr/bin/env python3
"""HOT search RKs under 75k/mo (~2500 ₽/day): Kabala, Gamlet, Bayaderka, Shelkonchik.

Rules: DailyBudget, Network OFF, exact phrase ON, autotarget 1–5 ₽, goal=purchase.
Does NOT resume campaigns — create/tune, then resume after money lands.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT / "backend" / ".env"


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env(ENV_PATH)

TOKEN = os.environ.get("YANDEX_DIRECT_TOKEN", "").strip()
LOGIN = os.environ.get("YANDEX_DIRECT_LOGIN", "").strip()
GOAL_ID = int(os.environ.get("YANDEX_METRIKA_PAYMENT_GOAL_ID", "558121293"))
COUNTER_ID = 109119282
RUB = 1_000_000

KABALA_CAMPAIGN_ID = 709742229
KABALA_GROUP_ID = 5749083212

BID_HOT = 90
BID_AUTO = 3
GOAL_VALUE = 3_000  # approx ticket CPA ceiling signal, not bid


def check_len(label: str, value: str, limit: int) -> str:
    if len(value) > limit:
        raise ValueError(f"{label} len={len(value)} > {limit}: {value}")
    return value


def call(service: str, method: str, params: dict):
    url = f"https://api.direct.yandex.com/json/v5/{service}"
    body = json.dumps({"method": method, "params": params}, ensure_ascii=False).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Accept-Language": "ru",
        "Content-Type": "application/json; charset=utf-8",
    }
    if LOGIN:
        headers["Client-Login"] = LOGIN
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code}: {raw[:1500]}") from e
    if "error" in data:
        raise RuntimeError(json.dumps(data["error"], ensure_ascii=False))
    return data.get("result") or {}


def print_add(label: str, result: dict) -> list[int]:
    ids = []
    for i, item in enumerate(result.get("AddResults") or []):
        if "Id" in item:
            ids.append(item["Id"])
            print(f"  OK {label}[{i}] id={item['Id']}")
        else:
            print(f"  FAIL {label}[{i}]: {json.dumps(item, ensure_ascii=False)}")
    return ids


def find_campaign(name: str) -> dict | None:
    res = call(
        "campaigns",
        "get",
        {
            "SelectionCriteria": {},
            "FieldNames": ["Id", "Name", "State", "Status", "DailyBudget", "EndDate"],
            "TextCampaignFieldNames": ["BiddingStrategy"],
        },
    )
    for c in res.get("Campaigns") or []:
        if c.get("Name") == name:
            return c
    return None


COMMON_NEG = [
    "бесплатно",
    "скачать",
    "торрент",
    "youtube",
    "ютуб",
    "википедия",
    "реферат",
    "сочинение",
    "краткое содержание",
    "смотреть онлайн",
    "фильм",
    "сериал",
    "официальный сайт",
    "официальные билеты",
]

def uniq(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in items:
        k = x.lower()
        if k in seen:
            continue
        seen.add(k)
        out.append(x)
    return out


NEG_KABALA = uniq(COMMON_NEG + ["книга", "анализ", "урок", "аудиокнига", "школьный"])
NEG_GAMLET = uniq(COMMON_NEG + ["шекспир текст", "перевод", "отелло", "король лир"])
NEG_BAYA = uniq(COMMON_NEG + ["история балета", "либретто", "партия", "вариация"])
NEG_SHELL = uniq(
    COMMON_NEG
    + [
        "мультфильм",
        "сказка читать",
        "ноты",
        "партия",
        "мариинский",
        "вахтангова",
        "сталинас",
    ]
)


def text_campaign_body(_daily_rub: int) -> dict:
    # TEXT_CAMPAIGN: HighestPosition без nested WeeklySpendLimit.
    # Потолок — DailyBudget на кампании (API предупреждает deprecate с 30.11).
    return {
        "BiddingStrategy": {
            "Search": {"BiddingStrategyType": "HIGHEST_POSITION"},
            "Network": {"BiddingStrategyType": "SERVING_OFF"},
        },
        "Settings": [
            {"Option": "CAMPAIGN_EXACT_PHRASE_MATCHING_ENABLED", "Value": "YES"},
            {"Option": "ADD_METRICA_TAG", "Value": "YES"},
            {"Option": "ENABLE_SITE_MONITORING", "Value": "YES"},
            {"Option": "ENABLE_AREA_OF_INTEREST_TARGETING", "Value": "NO"},
            {"Option": "ALTERNATIVE_TEXTS_ENABLED", "Value": "NO"},
        ],
        "CounterIds": {"Items": [COUNTER_ID]},
        "PriorityGoals": {
            "Items": [
                {
                    "GoalId": GOAL_ID,
                    "Value": GOAL_VALUE * RUB,
                    "IsMetrikaSourceOfValue": "NO",
                }
            ]
        },
        "TrackingParams": (
            "utm_source=yandex&utm_medium=cpc"
            "&utm_campaign={campaign_id}_{campaign_name}"
            "&utm_content={ad_id}_{phrase_id}&utm_term={keyword}"
        ),
        "AttributionModel": "AUTO",
    }


def create_campaign(name: str, start: str, end: str, daily: int, negatives: list[str]) -> int:
    print(f"\n=== CREATE {name} (DailyBudget {daily}₽) ===")
    existing = find_campaign(name)
    if existing:
        print(f"  exists id={existing['Id']} state={existing.get('State')}")
        return existing["Id"]
    campaign = {
        "Name": name,
        "StartDate": start,
        "EndDate": end,
        "TimeZone": "Europe/Moscow",
        "DailyBudget": {"Amount": daily * RUB, "Mode": "STANDARD"},
        "NegativeKeywords": {"Items": uniq(negatives)},
        "TextCampaign": text_campaign_body(daily),
    }
    ids = print_add("campaign", call("campaigns", "add", {"Campaigns": [campaign]}))
    if not ids:
        raise RuntimeError(f"campaign {name} not created")
    return ids[0]


def create_group(campaign_id: int, name: str, negatives: list[str], regions: list[int]) -> int:
    # reuse if already there
    existing = call(
        "adgroups",
        "get",
        {
            "SelectionCriteria": {"CampaignIds": [campaign_id]},
            "FieldNames": ["Id", "Name"],
        },
    ).get("AdGroups") or []
    for g in existing:
        if g.get("Name") == name:
            print(f"  group exists {name} id={g['Id']}")
            return g["Id"]
    ids = print_add(
        "adgroup",
        call(
            "adgroups",
            "add",
            {
                "AdGroups": [
                    {
                        "Name": name,
                        "CampaignId": campaign_id,
                        "RegionIds": regions,
                        "NegativeKeywords": {"Items": negatives},
                    }
                ]
            },
        ),
    )
    if not ids:
        raise RuntimeError(f"group {name} not created")
    return ids[0]


def add_keywords(group_id: int, keywords: list[str]) -> None:
    got = call(
        "keywords",
        "get",
        {
            "SelectionCriteria": {"AdGroupIds": [group_id]},
            "FieldNames": ["Id", "Keyword"],
        },
    ).get("Keywords") or []
    existing = {(k.get("Keyword") or "").strip().lower() for k in got}
    to_add = []
    for kw in keywords:
        if kw.lower() not in existing and kw.strip('"').lower() not in {
            x.strip('"') for x in existing
        }:
            to_add.append({"Keyword": kw, "AdGroupId": group_id, "Bid": BID_HOT * RUB})
    if to_add:
        print_add("keyword", call("keywords", "add", {"Keywords": to_add}))
    else:
        print("  keywords already present")

    # autotarget: ставка пола через KeywordBids (Keywords.update Bid больше не принимает)
    got2 = call(
        "keywords",
        "get",
        {
            "SelectionCriteria": {"AdGroupIds": [group_id]},
            "FieldNames": ["Id", "Keyword"],
        },
    ).get("Keywords") or []
    autos = [
        k["Id"]
        for k in got2
        if (k.get("Keyword") or "").lower().startswith("---autotargeting")
    ]
    if autos:
        call(
            "keywordbids",
            "set",
            {
                "KeywordBids": [
                    {
                        "KeywordId": i,
                        "SearchBid": BID_AUTO * RUB,
                    }
                    for i in autos
                ]
            },
        )
        print(f"  autotarget SearchBid={BID_AUTO}₽ n={len(autos)}")


def add_ads(group_id: int, ads: list[tuple[str, str, str, str, str]]) -> None:
    """(title, title2, text, href, path)"""
    existing = call(
        "ads",
        "get",
        {
            "SelectionCriteria": {"AdGroupIds": [group_id]},
            "FieldNames": ["Id", "State"],
            "TextAdFieldNames": ["Title", "Href"],
        },
    ).get("Ads") or []
    titles = {(a.get("TextAd") or {}).get("Title") for a in existing}
    payload = []
    for title, title2, text, href, path in ads:
        check_len("Title", title, 56)
        check_len("Title2", title2, 30)
        check_len("Text", text, 81)
        if title in titles:
            continue
        payload.append(
            {
                "AdGroupId": group_id,
                "TextAd": {
                    "Title": title,
                    "Title2": title2,
                    "Text": text,
                    "Href": href,
                    "DisplayUrlPath": path,
                },
            }
        )
    if payload:
        print_add("ad", call("ads", "add", {"Ads": payload}))
    else:
        print("  ads already present")


def tune_kabala() -> None:
    print("\n=== TUNE POISK_KABALA_SVYATOSH → DailyBudget 900 ===")
    call(
        "campaigns",
        "update",
        {
            "Campaigns": [
                {
                    "Id": KABALA_CAMPAIGN_ID,
                    "Name": "POISK_KABALA_SVYATOSH",
                    "EndDate": "2026-11-20",
                    "DailyBudget": {"Amount": 900 * RUB, "Mode": "STANDARD"},
                    "NegativeKeywords": {"Items": NEG_KABALA},
                    "TextCampaign": {
                        **{
                            k: v
                            for k, v in text_campaign_body(900).items()
                            if k != "PriorityGoals"
                        },
                        "PriorityGoals": {
                            "Items": [
                                {
                                    "Operation": "SET",
                                    "GoalId": GOAL_ID,
                                    "Value": GOAL_VALUE * RUB,
                                    "IsMetrikaSourceOfValue": "NO",
                                }
                            ]
                        },
                    },
                }
            ]
        },
    )
    add_keywords(
        KABALA_GROUP_ID,
        [
            '"кабала святош билеты"',
            '"кабала святош купить билет"',
            '"купить билеты кабала святош"',
            '"кабала святош мхт билеты"',
            '"кабала святош мхт купить билеты"',
            '"спектакль кабала святош билеты"',
            '"кабала святош купить билеты"',
        ],
    )
    add_ads(
        KABALA_GROUP_ID,
        [
            (
                "Купить билеты Кабала святош",
                "МХТ им. Чехова, 20.11",
                "Схема зала, места онлайн, оплата картой. Электронный билет на почту.",
                "https://biletvsem.com/ticket/kabala-svyatosh",
                "kabala-svyatosh",
            ),
            (
                "Кабала святош - билеты МХТ",
                "Выбор мест на схеме",
                "Агентский сервис билетов. Дата 20 ноября, оплата онлайн, e-билет.",
                "https://biletvsem.com/ticket/kabala-svyatosh",
                "kabala-mht",
            ),
        ],
    )
    print("  kabala tuned (still OFF until you resume)")


def setup_named(
    name: str,
    start: str,
    end: str,
    daily: int,
    negatives: list[str],
    group_name: str,
    keywords: list[str],
    ads: list[tuple[str, str, str, str, str]],
) -> int:
    cid = create_campaign(name, start, end, daily, negatives)
    gid = create_group(cid, group_name, negatives, [213])  # Moscow
    add_keywords(gid, keywords)
    add_ads(gid, ads)
    return cid


def main() -> int:
    if not TOKEN:
        print("No YANDEX_DIRECT_TOKEN", file=sys.stderr)
        return 1

    tune_kabala()

    setup_named(
        "POISK_GAMLET_MHT_HOT",
        "2026-11-11",
        "2026-11-25",
        700,
        NEG_GAMLET,
        "gamlet_buy",
        [
            '"гамлет мхт билеты"',
            '"мхт гамлет купить билеты"',
            '"гамлет мхт чехова билеты"',
            '"гамлет мхт чехова купить билеты"',
            '"купить билеты гамлет мхт"',
            '"билеты на гамлет мхт"',
        ],
        [
            (
                "Билеты на Гамлет - МХТ",
                "Чехова, схема зала",
                "Выбор мест онлайн, оплата картой, электронный билет на e-mail.",
                "https://biletvsem.com/ticket/gamlet",
                "gamlet-mht",
            ),
            (
                "Купить билеты Гамлет МХТ",
                "Дата 25 ноября",
                "Агентский сервис. Места на схеме, без очереди в кассу.",
                "https://biletvsem.com/ticket/gamlet",
                "gamlet-buy",
            ),
        ],
    )

    setup_named(
        "POISK_BAYADERKA_HOT",
        "2026-11-11",
        "2026-11-15",
        500,
        NEG_BAYA,
        "bayaderka_buy",
        [
            '"баядерка билеты"',
            '"баядерка купить билет"',
            '"баядерка балет билеты"',
            '"баядерка большой театр купить билеты"',
            '"балет баядерка большой театр"',
            '"купить билеты баядерка большой"',
        ],
        [
            (
                "Купить билеты Баядерка",
                "Большой, 13-15.11",
                "Историческая сцена. Зоны на схеме, оплата онлайн, e-билет.",
                "https://biletvsem.com/ticket/bayaderka-2026-11-13",
                "bayaderka",
            ),
            (
                "Баядерка - билеты Большой",
                "Историческая сцена",
                "Зоны на схеме, оплата онлайн, электронный билет на почту.",
                "https://biletvsem.com/ticket/bayaderka-2026-11-13",
                "bayaderka-bt",
            ),
        ],
    )

    setup_named(
        "POISK_SHELKUNCHIK_BOLSHOI_HOT",
        "2026-11-11",
        "2027-01-10",
        500,
        NEG_SHELL,
        "shelkunchik_buy",
        [
            '"щелкунчик большой театр билеты"',
            '"большой театр щелкунчик купить билет"',
            '"щелкунчик купить билеты"',
            '"щелкунчик балет купить билеты"',
            '"щелкунчик большой театр билеты 2026"',
            '"билеты на щелкунчик москва большой театр"',
            '"щелкунчик балет большой театр купить билеты"',
        ],
        [
            (
                "Купить билеты Щелкунчик",
                "Большой, Историческая",
                "Чайковский, 18 дек-10 янв. Схема зала, оплата онлайн, e-билет.",
                "https://biletvsem.com/ticket/novogodniy-balet-chaykovskogo-2026-12",
                "shelkunchik",
            ),
            (
                "Щелкунчик - билеты Большой",
                "Билетный сервис",
                "Выбор мест на схеме, оплата онлайн, электронный билет на почту.",
                "https://biletvsem.com/ticket/novogodniy-balet-chaykovskogo-2026-12",
                "shelk-bolshoi",
            ),
        ],
    )

    print("\n=== SUMMARY ===")
    for name in (
        "POISK_KABALA_SVYATOSH",
        "POISK_GAMLET_MHT_HOT",
        "POISK_BAYADERKA_HOT",
        "POISK_SHELKUNCHIK_BOLSHOI_HOT",
    ):
        c = find_campaign(name)
        if not c:
            print(f"  MISSING {name}")
            continue
        daily = (c.get("DailyBudget") or {}).get("Amount", 0) / RUB
        print(
            f"  {name}: id={c['Id']} state={c.get('State')} status={c.get('Status')} "
            f"daily={daily:.0f} end={c.get('EndDate')}"
        )
    print(
        "\nВключить после пополнения: Директ UI → Включить\n"
        "DailyBudget: Kabala 900 + Gamlet 700 + Bayaderka 500 + Shelkonchik 500 ≈ 2600 ₽/день\n"
        "Note: API deprecate DailyBudget с 30.11 — потом мигрировать на weekly/ЕПК"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
