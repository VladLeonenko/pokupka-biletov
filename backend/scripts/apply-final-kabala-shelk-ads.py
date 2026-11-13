#!/usr/bin/env python3
"""Apply FINAL approved ad pack to Kabala + Shelkonchik ONLY.

Does not touch Gamlet/Bayaderka. Does not raise DailyBudget.
No secrets in logs.
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
RUB = 1_000_000
BID_HOT = 90
BID_AUTO = 3

KABALA_CID = 709742229
SHELK_CID = 716098640
HREF_KABALA = "https://biletvsem.com/ticket/kabala-svyatosh"
HREF_SHELK = "https://biletvsem.com/ticket/novogodniy-balet-chaykovskogo-2026-12"

# Old groups to suspend ads+keywords in (leave groups, stop competition)
KABALA_OLD_GROUPS = {5749083212, 5786529391, 5786572054}
SHELK_OLD_GROUPS = {5823136795}


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


def call(service: str, method: str, params: dict) -> dict:
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
        with urllib.request.urlopen(req, timeout=120) as resp:
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


def check_len(label: str, value: str, limit: int) -> str:
    if len(value) > limit:
        raise ValueError(f"{label} len={len(value)} > {limit}: {value}")
    return value


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


def get_campaign(cid: int) -> dict:
    res = call(
        "campaigns",
        "get",
        {
            "SelectionCriteria": {"Ids": [cid]},
            "FieldNames": ["Id", "Name", "State", "Status", "DailyBudget", "NegativeKeywords"],
            "TextCampaignFieldNames": ["BiddingStrategy", "Settings"],
        },
    )
    camps = res.get("Campaigns") or []
    if not camps:
        raise RuntimeError(f"campaign {cid} not found")
    return camps[0]


def merge_campaign_negatives(cid: int, required: list[str]) -> None:
    c = get_campaign(cid)
    existing = list((c.get("NegativeKeywords") or {}).get("Items") or [])
    merged = uniq(existing + required)
    if set(x.lower() for x in merged) == set(x.lower() for x in existing):
        print(f"  negatives already complete for {cid}")
        return
    call(
        "campaigns",
        "update",
        {"Campaigns": [{"Id": cid, "NegativeKeywords": {"Items": merged}}]},
    )
    print(f"  negatives updated for {cid}: +{len(merged) - len(existing)} (total {len(merged)})")


def ensure_group(campaign_id: int, name: str, region_ids: list[int]) -> int:
    existing = (
        call(
            "adgroups",
            "get",
            {
                "SelectionCriteria": {"CampaignIds": [campaign_id]},
                "FieldNames": ["Id", "Name", "RegionIds"],
            },
        ).get("AdGroups")
        or []
    )
    for g in existing:
        if g.get("Name") == name:
            print(f"  group exists {name} id={g['Id']}")
            return int(g["Id"])
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
                        "RegionIds": region_ids,
                    }
                ]
            },
        ),
    )
    if not ids:
        raise RuntimeError(f"group {name} not created")
    return ids[0]


def ensure_keywords(group_id: int, keywords: list[str]) -> list[int]:
    got = (
        call(
            "keywords",
            "get",
            {
                "SelectionCriteria": {"AdGroupIds": [group_id]},
                "FieldNames": ["Id", "Keyword", "State"],
            },
        ).get("Keywords")
        or []
    )
    by_norm = {}
    for k in got:
        raw = (k.get("Keyword") or "").strip()
        by_norm[raw.lower()] = k
        by_norm[raw.strip('"').lower()] = k

    created: list[int] = []
    to_add = []
    to_resume = []
    for kw in keywords:
        hit = by_norm.get(kw.lower()) or by_norm.get(kw.strip('"').lower())
        if hit:
            if hit.get("State") == "SUSPENDED":
                to_resume.append(hit["Id"])
            continue
        to_add.append({"Keyword": kw, "AdGroupId": group_id, "Bid": BID_HOT * RUB})

    if to_add:
        created = print_add("keyword", call("keywords", "add", {"Keywords": to_add}))
    else:
        print("  keywords already present")

    if to_resume:
        call("keywords", "resume", {"SelectionCriteria": {"Ids": to_resume}})
        print(f"  resumed keywords n={len(to_resume)} ids={to_resume}")

    # autotarget bid floor
    got2 = (
        call(
            "keywords",
            "get",
            {
                "SelectionCriteria": {"AdGroupIds": [group_id]},
                "FieldNames": ["Id", "Keyword"],
            },
        ).get("Keywords")
        or []
    )
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
                    {"KeywordId": i, "SearchBid": BID_AUTO * RUB} for i in autos
                ]
            },
        )
        print(f"  autotarget SearchBid={BID_AUTO}₽ n={len(autos)} ids={autos}")
    return created


def ensure_ads(group_id: int, ads: list[dict]) -> list[int]:
    existing = (
        call(
            "ads",
            "get",
            {
                "SelectionCriteria": {"AdGroupIds": [group_id]},
                "FieldNames": ["Id", "State", "Status"],
                "TextAdFieldNames": ["Title", "Title2", "Text", "Href", "DisplayUrlPath"],
            },
        ).get("Ads")
        or []
    )
    by_title = {(a.get("TextAd") or {}).get("Title"): a for a in existing}
    created: list[int] = []
    to_add = []
    to_resume = []
    for ad in ads:
        title = check_len("Title", ad["title"], 56)
        title2 = check_len("Title2", ad["title2"], 30)
        text = check_len("Text", ad["text"], 81)
        path = check_len("DisplayUrlPath", ad["path"], 15)
        hit = by_title.get(title)
        if hit:
            if hit.get("State") == "SUSPENDED":
                to_resume.append(hit["Id"])
            print(f"  ad exists title={title!r} id={hit['Id']} state={hit.get('State')}")
            continue
        to_add.append(
            {
                "AdGroupId": group_id,
                "TextAd": {
                    "Title": title,
                    "Title2": title2,
                    "Text": text,
                    "Href": ad["href"],
                    "DisplayUrlPath": path,
                },
            }
        )
    if to_add:
        created = print_add("ad", call("ads", "add", {"Ads": to_add}))
    if to_resume:
        call("ads", "resume", {"SelectionCriteria": {"Ids": to_resume}})
        print(f"  resumed ads n={len(to_resume)} ids={to_resume}")
    return created


def suspend_ads(ids: list[int]) -> None:
    if not ids:
        return
    # chunk
    for i in range(0, len(ids), 10000):
        chunk = ids[i : i + 10000]
        call("ads", "suspend", {"SelectionCriteria": {"Ids": chunk}})
    print(f"  suspended ads n={len(ids)} ids={ids}")


def suspend_keywords(ids: list[int]) -> None:
    if not ids:
        return
    for i in range(0, len(ids), 10000):
        chunk = ids[i : i + 10000]
        call("keywords", "suspend", {"SelectionCriteria": {"Ids": chunk}})
    print(f"  suspended keywords n={len(ids)} ids={ids}")


def suspend_old_group_assets(campaign_id: int, old_group_ids: set[int]) -> dict:
    ads = (
        call(
            "ads",
            "get",
            {
                "SelectionCriteria": {"CampaignIds": [campaign_id]},
                "FieldNames": ["Id", "AdGroupId", "State"],
                "TextAdFieldNames": ["Title"],
            },
        ).get("Ads")
        or []
    )
    kws = (
        call(
            "keywords",
            "get",
            {
                "SelectionCriteria": {"CampaignIds": [campaign_id]},
                "FieldNames": ["Id", "AdGroupId", "Keyword", "State"],
            },
        ).get("Keywords")
        or []
    )
    ad_ids = [
        a["Id"]
        for a in ads
        if a.get("AdGroupId") in old_group_ids and a.get("State") == "ON"
    ]
    # suspend ALL non-autotarget ON keywords in old groups
    kw_ids = [
        k["Id"]
        for k in kws
        if k.get("AdGroupId") in old_group_ids
        and k.get("State") == "ON"
        and not (k.get("Keyword") or "").lower().startswith("---autotargeting")
    ]
    # also suspend autotarget in old groups so they don't burn budget
    auto_ids = [
        k["Id"]
        for k in kws
        if k.get("AdGroupId") in old_group_ids
        and k.get("State") == "ON"
        and (k.get("Keyword") or "").lower().startswith("---autotargeting")
    ]
    print(f"  old groups={sorted(old_group_ids)}")
    suspend_ads(ad_ids)
    suspend_keywords(kw_ids + auto_ids)
    return {"ads": ad_ids, "keywords": kw_ids, "autotarget": auto_ids}


def moderate_ads(ids: list[int]) -> None:
    if not ids:
        print("  nothing to moderate")
        return
    res = call("ads", "moderate", {"SelectionCriteria": {"Ids": ids}})
    print(f"  moderate requested n={len(ids)} ids={ids} result={json.dumps(res, ensure_ascii=False)[:400]}")


def resume_campaign_if_needed(cid: int) -> None:
    c = get_campaign(cid)
    print(
        f"  campaign {cid} {c.get('Name')} state={c.get('State')} status={c.get('Status')} "
        f"daily={(c.get('DailyBudget') or {}).get('Amount', 0)/RUB}"
    )
    if c.get("State") == "SUSPENDED":
        call("campaigns", "resume", {"SelectionCriteria": {"Ids": [cid]}})
        print(f"  resumed campaign {cid}")
    # never touch DailyBudget amount


def verify_budget_not_raised(cid: int, expected: float) -> None:
    c = get_campaign(cid)
    amount = (c.get("DailyBudget") or {}).get("Amount", 0) / RUB
    if amount > expected + 0.01:
        raise RuntimeError(f"DailyBudget raised for {cid}: {amount} > {expected}")
    print(f"  budget ok {cid}: {amount}₽ (keep ≤{expected})")


def setup_pack(campaign_id: int, groups: list[dict], region_ids: list[int]) -> dict:
    out = {"groups": {}, "ads_created": [], "keywords_created": []}
    for g in groups:
        print(f"\n-- group {g['name']}")
        gid = ensure_group(campaign_id, g["name"], region_ids)
        out["groups"][g["name"]] = gid
        k_ids = ensure_keywords(gid, g["keywords"])
        out["keywords_created"].extend(k_ids)
        a_ids = ensure_ads(
            gid,
            [
                {
                    "title": t1,
                    "title2": t2,
                    "text": text,
                    "href": g["href"],
                    "path": path,
                }
                for t1, t2, text, path in g["ads"]
            ],
        )
        out["ads_created"].extend(a_ids)
    return out


def dump_status(campaign_id: int, new_group_ids: list[int]) -> None:
    ads = (
        call(
            "ads",
            "get",
            {
                "SelectionCriteria": {"AdGroupIds": new_group_ids} if new_group_ids else {"CampaignIds": [campaign_id]},
                "FieldNames": ["Id", "AdGroupId", "State", "Status", "StatusClarification"],
                "TextAdFieldNames": ["Title", "Title2", "DisplayUrlPath"],
            },
        ).get("Ads")
        or []
    )
    print(f"\n=== VERIFY ads campaign={campaign_id} ===")
    for a in ads:
        t = a.get("TextAd") or {}
        print(
            f"  A {a['Id']} g={a['AdGroupId']} state={a.get('State')} status={a.get('Status')} "
            f"clar={a.get('StatusClarification')!r} T1={t.get('Title')!r}"
        )


def main() -> int:
    if not TOKEN:
        print("No YANDEX_DIRECT_TOKEN", file=sys.stderr)
        return 1
    print("auth ok (token/login present, values not printed)")

    kabala_neg = [
        "официальный",
        "реферат",
        "содержание",
        "скачать",
        "смотреть",
        "хабенский",
        "цискаридзе",
        "бесплатно",
        "википедия",
        "отзывы",
    ]
    shelk_neg = [
        "официальный",
        "bolshoi.ru",
        "мариинский",
        "мультфильм",
        "скачать",
        "смотреть",
        "либретто",
        "бесплатно",
        "казань",
        "спб",
        "википедия",
    ]

    kabala_groups = [
        {
            "name": "kabala_hot_buy",
            "href": HREF_KABALA,
            "keywords": [
                '"купить билеты кабала святош"',
                '"кабала святош билеты"',
                '"кабала святош билеты купить"',
                '"спектакль кабала святош купить билет"',
                '"кабала святош билеты онлайн"',
            ],
            "ads": [
                (
                    "Купить билеты Кабала святош",
                    "От 12 325 ₽, все даты",
                    "Лучшие места в продаже. Эксклюзив — оформите, пока есть",
                    "kabala",
                ),
                (
                    "Кабала святош — купить билет",
                    "Цены от 12 325 ₽",
                    "Все доступные даты. Выберите место на схеме и оплатите",
                    "kabala",
                ),
                (
                    "Билеты на Кабала святош",
                    "Успейте взять лучшие места",
                    "Ещё есть сильные ряды. От 12 325 ₽ — купить онлайн",
                    "kabala",
                ),
            ],
        },
        {
            "name": "kabala_mht",
            "href": HREF_KABALA,
            "keywords": [
                '"кабала святош мхт билеты"',
                '"купить билеты кабала святош мхт"',
                '"кабала святош мхт купить билеты"',
            ],
            "ads": [
                (
                    "Кабала святош — билеты МХТ",
                    "От 12 325 ₽",
                    "Места, которых нет у других. Все даты — купить сейчас",
                    "mht-kabala",
                ),
                (
                    "Билеты МХТ на Кабала святош",
                    "Эксклюзивное наличие",
                    "Лучшие ряды ещё в продаже. Успейте оформить онлайн",
                    "mht-kabala",
                ),
            ],
        },
        {
            "name": "kabala_seats",
            "href": HREF_KABALA,
            "keywords": [
                '"кабала святош билеты москва"',
                '"спектакль кабала святош билеты"',
            ],
            "ads": [
                (
                    "Кабала святош — лучшие места",
                    "Купить от 12 325 ₽",
                    "Эксклюзив по наличию. Дата и место — на схеме, оплата сразу",
                    "kabala-mesta",
                ),
                (
                    "Билеты Кабала святош — все даты",
                    "Пока есть хорошие места",
                    "Оплата онлайн. После оплаты билет на почту",
                    "kabala-mesta",
                ),
            ],
        },
    ]

    shelk_groups = [
        {
            "name": "shelk_hot_buy",
            "href": HREF_SHELK,
            "keywords": [
                '"щелкунчик купить билеты"',
                '"щелкунчик балет купить билеты"',
                '"купить билеты щелкунчик"',
            ],
            "ads": [
                (
                    "Купить билеты Щелкунчик",
                    "От 70 000 ₽",
                    "Все даты 18 дек – 10 янв. Лучшие места — успейте купить",
                    "shelk",
                ),
                (
                    "Щелкунчик — купить билет",
                    "Большой, Новый год",
                    "Эксклюзивное наличие. Выберите дату и оформите онлайн",
                    "shelk",
                ),
                (
                    "Билеты на Щелкунчик",
                    "Успейте на лучшие места",
                    "Цены от 70 000 ₽. Все ближайшие даты в продаже",
                    "shelk",
                ),
            ],
        },
        {
            "name": "shelk_bolshoi",
            "href": HREF_SHELK,
            "keywords": [
                '"щелкунчик большой театр билеты"',
                '"большой театр щелкунчик купить билет"',
                '"щелкунчик большой театр билеты 2026"',
            ],
            "ads": [
                (
                    "Щелкунчик — билеты Большой",
                    "Историческая сцена",
                    "Места, которых нет у агрегаторов. Купить на все даты",
                    "shelk-bolshoi",
                ),
                (
                    "Билеты Щелкунчик — Большой",  # · rejected by Direct Title charset
                    "От 70 000 ₽",
                    "18 декабря – 10 января. Лучшие места — оформите сейчас",
                    "shelk-bolshoi",
                ),
            ],
        },
        {
            "name": "shelk_dates",
            "href": HREF_SHELK,
            "keywords": [
                '"билеты на щелкунчик москва большой театр"',
                '"щелкунчик балет большой театр купить билеты"',
            ],
            "ads": [
                (
                    "Щелкунчик: все даты в продаже",
                    "18.12 – 10.01",
                    "Эксклюзив по наличию. Выберите вечер и место на схеме",
                    "shelk-dates",
                ),
                (
                    "Щелкунчик — лучшие места",
                    "Купить от 70 000 ₽",
                    "Пока есть сильные места. Оплата онлайн сразу",
                    "shelk-dates",
                ),
            ],
        },
    ]

    print("\n=== KABALA negatives + pack ===")
    verify_budget_not_raised(KABALA_CID, 850)
    merge_campaign_negatives(KABALA_CID, kabala_neg)
    # mirror geo of newer kabala groups
    kabala_res = setup_pack(KABALA_CID, kabala_groups, [213, 10174])

    print("\n=== KABALA suspend old ===")
    kabala_old = suspend_old_group_assets(KABALA_CID, KABALA_OLD_GROUPS)

    print("\n=== SHELK negatives + pack ===")
    verify_budget_not_raised(SHELK_CID, 700)
    merge_campaign_negatives(SHELK_CID, shelk_neg)
    shelk_res = setup_pack(SHELK_CID, shelk_groups, [213])

    print("\n=== SHELK suspend old ===")
    shelk_old = suspend_old_group_assets(SHELK_CID, SHELK_OLD_GROUPS)

    all_new_ads = kabala_res["ads_created"] + shelk_res["ads_created"]
    print("\n=== MODERATE new ads ===")
    # also collect existing new-group ads that may already exist from prior run
    all_new_gids = list(kabala_res["groups"].values()) + list(shelk_res["groups"].values())
    ads_in_new = (
        call(
            "ads",
            "get",
            {
                "SelectionCriteria": {"AdGroupIds": all_new_gids},
                "FieldNames": ["Id", "State", "Status"],
            },
        ).get("Ads")
        or []
    )
    moderate_ids = [a["Id"] for a in ads_in_new]
    moderate_ads(moderate_ids)

    print("\n=== RESUME campaigns if needed ===")
    resume_campaign_if_needed(KABALA_CID)
    resume_campaign_if_needed(SHELK_CID)

    # resume new ads if suspended after moderate (usually DRAFT→moderation)
    on_or_off = [a["Id"] for a in ads_in_new if a.get("State") == "SUSPENDED"]
    if on_or_off:
        call("ads", "resume", {"SelectionCriteria": {"Ids": on_or_off}})
        print(f"  resumed new ads n={len(on_or_off)} ids={on_or_off}")

    verify_budget_not_raised(KABALA_CID, 850)
    verify_budget_not_raised(SHELK_CID, 700)

    dump_status(KABALA_CID, list(kabala_res["groups"].values()))
    dump_status(SHELK_CID, list(shelk_res["groups"].values()))

    summary = {
        "kabala": {
            "groups": kabala_res["groups"],
            "ads_created": kabala_res["ads_created"],
            "old_suspended_ads": kabala_old["ads"],
            "old_suspended_keywords": kabala_old["keywords"],
            "old_suspended_autotarget": kabala_old["autotarget"],
        },
        "shelk": {
            "groups": shelk_res["groups"],
            "ads_created": shelk_res["ads_created"],
            "old_suspended_ads": shelk_old["ads"],
            "old_suspended_keywords": shelk_old["keywords"],
            "old_suspended_autotarget": shelk_old["autotarget"],
        },
        "moderate_ids": moderate_ids,
    }
    print("\n=== SUMMARY JSON ===")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
