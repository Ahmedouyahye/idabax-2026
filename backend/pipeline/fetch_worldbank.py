"""Fetch public macro indicators for Mauritania (World Bank API + UNESCO UIS).

Run: python -m backend.pipeline.fetch_worldbank
Outputs: data/raw/worldbank_indicators.csv, data/raw/unesco_uis_outofschool.csv
"""
import json
import time

import pandas as pd
import requests

BASE = "https://api.worldbank.org/v2/country/mr/indicator"
INDICATORS = {
    "SP.POP.TOTL": "Population totale",
    "SP.POP.TOTL.FE.ZS": "Part femmes (%)",
    "SP.POP.0014.TO.ZS": "Population 0-14 ans (%)",
    "SP.POP.GROW": "Croissance démographique (%)",
    "SP.DYN.LE00.IN": "Espérance de vie",
    "SP.POP.1564.TO.ZS": "Population 15-64 (%)",
    "SP.POP.DPND": "Ratio de dépendance",
    "SP.POP.DPND.YG": "Ratio dépendance jeunes",
    "SE.PRM.UNER": "Enfants hors école, primaire (n)",
    "SE.PRM.UNER.ZS": "Taux hors école primaire (%)",
    "SE.PRM.UNER.FE.ZS": "Hors école primaire filles (%)",
    "SE.PRM.UNER.MA.ZS": "Hors école primaire garçons (%)",
    "SE.PRM.NENR": "Taux net scolarisation primaire (%)",
    "SE.PRM.ENRR": "Taux brut scolarisation primaire (%)",
    "SE.SEC.NENR": "Taux net scolarisation secondaire (%)",
    "SE.PRM.CMPT.ZS": "Taux achèvement primaire (%)",
    "SE.ADT.LITR.ZS": "Alphabétisation adultes (%)",
    "SE.ADT.1524.LT.ZS": "Alphabétisation jeunes 15-24 (%)",
    "SE.PRM.TCAQ.ZS": "Enseignants formés primaire (%)",
    "SI.POV.NAHC": "Pauvreté nationale (%)",
    "SI.POV.DDAY": "Pauvreté $2.15/jour (%)",
    "SL.UEM.TOTL.ZS": "Chômage total (%)",
    "SL.UEM.1524.ZS": "Chômage jeunes (%)",
    "NY.GDP.PCAP.CD": "PIB/habitant (US$)",
}


def fetch_worldbank() -> pd.DataFrame:
    rows = []
    for code, label in INDICATORS.items():
        url = f"{BASE}/{code}?format=json&per_page=200&date=2000:2025"
        r = requests.get(url, timeout=60)
        if r.status_code != 200:
            continue
        data = r.json()
        if isinstance(data, list) and len(data) > 1:
            for obs in data[1]:
                rows.append(
                    {
                        "indicator": code,
                        "label": label,
                        "year": obs.get("date"),
                        "value": obs.get("value"),
                    }
                )
        time.sleep(0.15)
    df = pd.DataFrame(rows)
    df.to_csv("data/raw/worldbank_indicators.csv", index=False)
    print(f"World Bank: {len(df)} observations for {df['indicator'].nunique()} indicators")
    return df


def fetch_unesco() -> pd.DataFrame:
    """UIS out-of-school & participation indicators via UIS.Stat SDMX API."""
    base = "https://apiportal.uis.unesco.org/bdds"
    url = (
        "https://api.data.uis.unesco.org/v1/data/EDU_OUT_OF_SCHOOL"
        "?startPeriod=2013&endPeriod=2024&format=json-stat"
    )
    rows = []
    try:
        r = requests.get(url, timeout=60)
        if r.status_code == 200:
            data = r.json()
            dims = data.get("dimension", {}).get("size", {})
            print("UNESCO UIS response received, dimensions:", list(dims))
            rows.append({"source": "UIS", "status": "ok", "n_dimensions": len(dims)})
    except Exception as e:  # noqa: BLE001
        rows.append({"source": "UIS", "status": "error", "error": str(e)})
    out = pd.DataFrame(rows)
    out.to_csv("data/raw/unesco_uis_outofschool.csv", index=False)
    return out


if __name__ == "__main__":
    fetch_worldbank()
    fetch_unesco()
