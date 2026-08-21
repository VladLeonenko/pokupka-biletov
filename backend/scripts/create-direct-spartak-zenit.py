#!/usr/bin/env python3
"""HOT search RK: Спартак — Зенит (Лукойл Арена), 23.08.2026. FAN ID обязателен."""

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
HREF = "https://biletvsem.com/ticket/spartak-moskva-zenit-sankt-peterburg-futbol"
RUB = 1_000_000
DAILY_BUDGET_RUB = 5_000
BID_HOT_RUB = 90
BID_AUTO_RUB = 1


def check_len(label: str, value: str, limit: int) -> str:
    n = len(value)
    if n > limit:
        raise ValueError(f"{label} len={n} > {limit}: {value}")
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
        raise RuntimeError(f"HTTP {e.code}: {raw[:1200]}") from e
    if "error" in data:
        raise RuntimeError(json.dumps(data["error"], ensure_ascii=False))
    return data.get("result") or {}


def print_add_result(label: str, result: dict) -> list[int]:
    ids = []
    for i, item in enumerate(result.get("AddResults") or []):
        if "Id" in item:
            ids.append(item["Id"])
            print(f"  OK {label}[{i}] id={item['Id']}")
        else:
            print(f"  FAIL {label}[{i}]: {json.dumps(item, ensure_ascii=False)}")
    return ids


NEGATIVE = [
    "бесплатно",
    "скачать",
    "торрент",
    "трансляция",
    "смотреть онлайн",
    "онлайн",
    "ютуб",
    "youtube",
    "прогноз",
    "состав",
    "новости",
    "таблица",
    "ставки",
    "букмекер",
    "фэнтези",
    "видео",
    "обзор",
    "результат",
    "счёт",
    "счет",
    "цска",
    "динамо",
    "локомотив",
    "краснодар",
    "суперкубок",
    "кубок россии",
]


def create_campaign() -> int:
    print("=== CREATE CAMPAIGN ===")
    campaign = {
        "Name": "POISK_SPARTAK_ZENIT_HOT",
        "StartDate": "2026-08-21",
        "EndDate": "2026-08-23",
        "TimeZone": "Europe/Moscow",
        "DailyBudget": {"Amount": DAILY_BUDGET_RUB * RUB, "Mode": "STANDARD"},
        "TextCampaign": {
            "BiddingStrategy": {
                "Search": {"BiddingStrategyType": "HIGHEST_POSITION"},
                "Network": {"BiddingStrategyType": "SERVING_OFF"},
            },
            "Settings": [
                {"Option": "CAMPAIGN_EXACT_PHRASE_MATCHING_ENABLED", "Value": "YES"},
                {"Option": "ADD_METRICA_TAG", "Value": "YES"},
                {"Option": "ENABLE_SITE_MONITORING", "Value": "YES"},
                {"Option": "ENABLE_AREA_OF_INTEREST_TARGETING", "Value": "NO"},
            ],
            "CounterIds": {"Items": [COUNTER_ID]},
            "PriorityGoals": {
                "Items": [
                    {
                        "GoalId": GOAL_ID,
                        "Value": 4_000 * RUB,
                        "IsMetrikaSourceOfValue": "NO",
                    }
                ]
            },
            "TrackingParams": (
                "utm_source=yandex&utm_medium=cpc&utm_campaign={campaign_id}"
                "&utm_content={ad_id}_{phrase_id}&utm_term={keyword}"
            ),
            "AttributionModel": "AUTO",
        },
    }
    result = call("campaigns", "add", {"Campaigns": [campaign]})
    ids = print_add_result("campaign", result)
    if not ids:
        raise RuntimeError("campaign not created")
    return ids[0]


def create_groups(campaign_id: int) -> dict[str, int]:
    print("\n=== CREATE GROUPS ===")
    groups = [
        {
            "Name": "spartak_zenit_buy",
            "CampaignId": campaign_id,
            "RegionIds": [213, 10174],  # МСК, МСК+МО — Лукойл Арена
            "NegativeKeywords": {"Items": NEGATIVE},
            "TrackingParams": "utm_content=sz_buy",
        },
        {
            "Name": "spartak_zenit_date_venue",
            "CampaignId": campaign_id,
            "RegionIds": [213, 10174],
            "NegativeKeywords": {"Items": NEGATIVE},
            "TrackingParams": "utm_content=sz_date",
        },
    ]
    result = call("adgroups", "add", {"AdGroups": groups})
    ids = print_add_result("adgroup", result)
    if len(ids) < 2:
        raise RuntimeError("groups not created")
    return {"buy": ids[0], "date": ids[1]}


def create_keywords(group_ids: dict[str, int]) -> None:
    print("\n=== CREATE KEYWORDS ===")
    buy = [
        '"купить билеты спартак зенит"',
        '"купить билет спартак зенит"',
        '"билеты спартак зенит"',
        '"билеты на спартак зенит"',
        '"спартак зенит билеты"',
        '"спартак зенит купить билеты"',
        '"билеты спартак москва зенит"',
        '"купить билеты спартак зенит футбол"',
    ]
    date = [
        '"спартак зенит 23 августа билеты"',
        '"билеты спартак зенит 23 августа"',
        '"спартак зенит лукойл арена билеты"',
        '"билеты спартак зенит лукойл арена"',
        '"спартак зенит лукойл билеты"',
        '"купить билеты спартак зенит 23 августа"',
        '"спартак зенит завтра билеты"',
        '"матч спартак зенит билеты"',
    ]
    items = []
    for kw in buy:
        items.append({"Keyword": kw, "AdGroupId": group_ids["buy"], "Bid": BID_HOT_RUB * RUB})
    for kw in date:
        items.append({"Keyword": kw, "AdGroupId": group_ids["date"], "Bid": BID_HOT_RUB * RUB})
    result = call("keywords", "add", {"Keywords": items})
    print_add_result("keyword", result)

    # автотаргет: ставка пола
    autos = call(
        "keywords",
        "get",
        {
            "SelectionCriteria": {"AdGroupIds": list(group_ids.values())},
            "FieldNames": ["Id", "Keyword", "AdGroupId"],
        },
    )
    auto_ids = [
        k["Id"]
        for k in (autos.get("Keywords") or [])
        if (k.get("Keyword") or "").lower().startswith("---autotargeting")
    ]
    if auto_ids:
        call(
            "keywords",
            "update",
            {
                "Keywords": [{"Id": i, "Bid": BID_AUTO_RUB * RUB} for i in auto_ids],
            },
        )
        print(f"  autotarget bid={BID_AUTO_RUB}₽ ids={auto_ids}")


def create_ads(group_ids: dict[str, int]) -> None:
    print("\n=== CREATE ADS ===")
    # Title ≤56, Title2 ≤30, Text ≤81 (approx Direct limits)
    ads_spec = [
        (
            group_ids["buy"],
            "Спартак — Зенит: билеты онлайн",
            "Нужен FAN ID",
            "Лукойл Арена, 23 августа. Схема мест, оплата картой, e-билет на почту.",
            "utm_term=ad1_sz_buy",
        ),
        (
            group_ids["buy"],
            "Купить билеты Спартак — Зенит",
            "FAN ID обязателен",
            "Официальная продажа. Выберите места на схеме, оплата Т-Банк.",
            "utm_term=ad2_sz_buy",
        ),
        (
            group_ids["date"],
            "Спартак — Зенит 23 августа",
            "Лукойл Арена · FAN ID",
            "Билеты с местами. Оформление онлайн, электронный билет после оплаты.",
            "utm_term=ad1_sz_date",
        ),
        (
            group_ids["date"],
            "Билеты Спартак — Зенит сегодня",
            "Лукойл Арена",
            "Матч 23.08. Нужен FAN ID. Схема сектора, быстрая оплата картой.",
            "utm_term=ad2_sz_date",
        ),
    ]
    ads = []
    for gid, title, title2, text, utm in ads_spec:
        check_len("Title", title, 56)
        check_len("Title2", title2, 30)
        check_len("Text", text, 81)
        ads.append(
            {
                "AdGroupId": gid,
                "TextAd": {
                    "Title": title,
                    "Title2": title2,
                    "Text": text,
                    "Href": f"{HREF}?{utm}",
                    "Mobile": "NO",
                    "DisplayUrlPath": "spartak-zenit",
                },
            }
        )
    result = call("ads", "add", {"Ads": ads})
    print_add_result("ad", result)


def resume(campaign_id: int) -> None:
    print("\n=== RESUME ===")
    r = call("campaigns", "resume", {"SelectionCriteria": {"Ids": [campaign_id]}})
    print(json.dumps(r, ensure_ascii=False))


def verify(campaign_id: int) -> None:
    print("\n=== VERIFY ===")
    r = call(
        "campaigns",
        "get",
        {
            "SelectionCriteria": {"Ids": [campaign_id]},
            "FieldNames": ["Id", "Name", "State", "Status", "DailyBudget"],
            "TextCampaignFieldNames": ["BiddingStrategy", "PriorityGoals", "CounterIds", "Settings"],
        },
    )
    c = (r.get("Campaigns") or [])[0]
    settings = {s["Option"]: s["Value"] for s in (c.get("TextCampaign") or {}).get("Settings") or []}
    print(
        json.dumps(
            {
                "Id": c["Id"],
                "Name": c["Name"],
                "State": c["State"],
                "Status": c["Status"],
                "DailyBudgetRub": c["DailyBudget"]["Amount"] / RUB,
                "ExactPhrase": settings.get("CAMPAIGN_EXACT_PHRASE_MATCHING_ENABLED"),
                "Search": c["TextCampaign"]["BiddingStrategy"]["Search"]["BiddingStrategyType"],
                "Network": c["TextCampaign"]["BiddingStrategy"]["Network"]["BiddingStrategyType"],
                "Goal": c["TextCampaign"]["PriorityGoals"]["Items"],
                "Counters": c["TextCampaign"]["CounterIds"]["Items"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


def main() -> int:
    if not TOKEN:
        print("No YANDEX_DIRECT_TOKEN", file=sys.stderr)
        return 1
    # idempotency: skip if already exists
    existing = call(
        "campaigns",
        "get",
        {
            "SelectionCriteria": {"States": ["ON", "OFF", "SUSPENDED", "ENDED", "CONVERTED"]},
            "FieldNames": ["Id", "Name", "State"],
        },
    )
    for c in existing.get("Campaigns") or []:
        if c.get("Name") == "POISK_SPARTAK_ZENIT_HOT":
            print(f"Already exists id={c['Id']} state={c['State']} — resume only")
            resume(c["Id"])
            verify(c["Id"])
            return 0

    cid = create_campaign()
    groups = create_groups(cid)
    create_keywords(groups)
    create_ads(groups)
    resume(cid)
    verify(cid)
    print(f"\nDONE campaign_id={cid} href={HREF}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
