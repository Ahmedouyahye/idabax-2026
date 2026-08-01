"""Accessibilité scolaire à la moughataa : descendre de 13 unités à 63.

Toute l'analyse du projet s'arrête à la wilaya. Or les 646 points d'éducation
d'OpenStreetMap portent déjà leur code `adm2_pcode` : passer à la moughataa ne
demande aucune jointure spatiale, seulement un regroupement. La granularité est
multipliée par cinq, et l'unité devient celle à laquelle on décide réellement
d'implanter une école.

Deux mesures :

1. **Densité et dispersion** nombre d'établissements par moughataa et distance
   moyenne au plus proche voisin — une moughataa peut avoir des écoles et rester
   mal couverte si elles sont toutes agglomérées au chef-lieu.
2. **Couverture surfacique** part du territoire situé à plus de 5 km et à plus
   de 10 km du plus proche établissement, estimée par échantillonnage régulier
   de points à l'intérieur de chaque polygone.

**Deux limites, à lire avant tout chiffre de cette page.**

1. *L'inventaire OSM n'est pas exhaustif.* On dénombre ici 543 établissements
   géolocalisés pour tout le pays, alors que la Mauritanie en compte plusieurs
   milliers. La couverture d'OpenStreetMap est concentrée sur les agglomérations
   (la distance médiane entre deux établissements est inférieure au kilomètre,
   signature d'une cartographie urbaine). Les taux de « territoire à plus de
   10 km d'une école » mesurent donc **autant le déficit de cartographie que le
   déficit d'écoles**, et doivent être lus en écart relatif entre moughataas,
   jamais comme un niveau absolu.
2. *La population n'existe pas à la moughataa.* Ni l'EPCV ni les projections HDX
   ne descendent sous la wilaya. Un indice d'accessibilité pondéré par la demande
   (2SFCA) est donc hors de portée : on mesure une couverture **surfacique**, ce
   qui surpondère mécaniquement les moughataas désertiques du nord.
"""
from __future__ import annotations

import json

import numpy as np
from shapely.geometry import shape
from shapely.prepared import prep

ADM2 = "data/raw/mrt_admin2.geojson"
ECOLES = "data/raw/education_facilities.geojson"
SORTIE = "data/processed/moughataa_acces.geojson"

AMENITES = {"school", "kindergarten", "college", "university"}
SEUILS_KM = (5.0, 10.0)
# Le pas d'échantillonnage doit être nettement plus fin que le plus petit seuil
# mesuré, sans quoi la « part au-delà de 5 km » est un artefact de la grille.
# Il est donc dérivé de la surface de chaque moughataa pour viser ~2 500 points,
# et borné pour rester à la fois résolvant et calculable.
POINTS_CIBLE = 2500
PAS_MIN_KM, PAS_MAX_KM = 0.8, 6.0
KM_PAR_DEGRE_LAT = 111.32


def _en_km(lon: np.ndarray, lat: np.ndarray, lat0: float) -> np.ndarray:
    """Projection équirectangulaire locale : suffisante aux latitudes mauritaniennes."""
    x = lon * KM_PAR_DEGRE_LAT * np.cos(np.radians(lat0))
    y = lat * KM_PAR_DEGRE_LAT
    return np.column_stack([x, y])


def charger_ecoles() -> list[dict]:
    d = json.load(open(ECOLES))
    points = []
    for f in d["features"]:
        p = f["properties"]
        if p.get("amenity") not in AMENITES:
            continue
        g = shape(f["geometry"])
        c = g.centroid                      # les bâtiments sont des polygones
        points.append(
            {
                "lon": float(c.x),
                "lat": float(c.y),
                "adm2_pcode": p.get("adm2_pcode"),
                "adm2_name": p.get("adm2_name"),
                "adm1_name": p.get("adm1_name"),
            }
        )
    return points


def run_acces() -> dict:
    from backend.pipeline.build_dataset import canonical

    adm2 = json.load(open(ADM2))
    ecoles = charger_ecoles()

    lon_e = np.array([e["lon"] for e in ecoles])
    lat_e = np.array([e["lat"] for e in ecoles])
    lat0 = float(lat_e.mean())
    xy_ecoles = _en_km(lon_e, lat_e, lat0)

    lignes, features_out = [], []
    for f in adm2["features"]:
        props = f["properties"]
        nom = props.get("adm2_name")
        pcode = props.get("adm2_pcode")
        wilaya = canonical(props.get("adm1_name"))
        geom = shape(f["geometry"]).buffer(0)
        if geom.is_empty:
            continue

        n_ecoles = sum(1 for e in ecoles if e["adm2_pcode"] == pcode)

        # échantillonnage régulier du polygone, au pas adapté à sa surface
        minx, miny, maxx, maxy = geom.bounds
        largeur_km = (maxx - minx) * KM_PAR_DEGRE_LAT * np.cos(np.radians(lat0))
        hauteur_km = (maxy - miny) * KM_PAR_DEGRE_LAT
        pas_km = float(np.clip(
            np.sqrt(max(largeur_km * hauteur_km, 1.0) / POINTS_CIBLE), PAS_MIN_KM, PAS_MAX_KM
        ))
        pas_lon = pas_km / (KM_PAR_DEGRE_LAT * np.cos(np.radians(lat0)))
        pas_lat = pas_km / KM_PAR_DEGRE_LAT
        gx = np.arange(minx, maxx + pas_lon, pas_lon)
        gy = np.arange(miny, maxy + pas_lat, pas_lat)
        maille_lon, maille_lat = np.meshgrid(gx, gy)
        candidats = np.column_stack([maille_lon.ravel(), maille_lat.ravel()])

        prepare = prep(geom)
        from shapely.geometry import Point

        dedans = np.array([prepare.contains(Point(a, b)) for a, b in candidats])
        interieurs = candidats[dedans]
        if len(interieurs) == 0:
            interieurs = np.array([[geom.centroid.x, geom.centroid.y]])

        xy_pts = _en_km(interieurs[:, 0], interieurs[:, 1], lat0)
        # distance au plus proche établissement, toutes moughataas confondues :
        # une école juste de l'autre côté de la limite dessert quand même
        d = np.sqrt(((xy_pts[:, None, :] - xy_ecoles[None, :, :]) ** 2).sum(axis=2)).min(axis=1)

        rec = {
            "adm2_pcode": pcode,
            "moughataa": nom,
            "wilaya": wilaya,
            "n_etablissements": n_ecoles,
            "n_points_echantillon": int(len(xy_pts)),
            "pas_grille_km": round(pas_km, 2),
            "distance_mediane_km": round(float(np.median(d)), 1),
            "distance_max_km": round(float(d.max()), 1),
        }
        for seuil in SEUILS_KM:
            rec[f"part_au_dela_{int(seuil)}km_pct"] = round(float((d > seuil).mean() * 100), 1)
        lignes.append(rec)

        f_out = dict(f)
        f_out["properties"] = {**props, **rec}
        features_out.append(f_out)

    # distance moyenne au plus proche voisin entre établissements (dispersion de l'offre)
    if len(xy_ecoles) > 1:
        dd = np.sqrt(((xy_ecoles[:, None, :] - xy_ecoles[None, :, :]) ** 2).sum(axis=2))
        np.fill_diagonal(dd, np.inf)
        ppv = dd.min(axis=1)
    else:
        ppv = np.array([0.0])

    lignes.sort(key=lambda r: -r["part_au_dela_10km_pct"])
    sans_ecole = [r for r in lignes if r["n_etablissements"] == 0]

    from backend.sanitize import dump_json

    dump_json(SORTIE, {"type": "FeatureCollection", "features": features_out})

    par_wilaya: dict[str, list] = {}
    for r in lignes:
        par_wilaya.setdefault(r["wilaya"], []).append(r)
    resume_wilaya = [
        {
            "wilaya": w,
            "n_moughataas": len(v),
            "n_etablissements": sum(x["n_etablissements"] for x in v),
            "moughataas_sans_ecole": sum(1 for x in v if x["n_etablissements"] == 0),
            "part_au_dela_10km_pct": round(float(np.mean([x["part_au_dela_10km_pct"] for x in v])), 1),
        }
        for w, v in par_wilaya.items()
    ]
    resume_wilaya.sort(key=lambda d: -d["part_au_dela_10km_pct"])

    return {
        "n_moughataas": len(lignes),
        "n_etablissements": len(ecoles),
        "points_cible_par_moughataa": POINTS_CIBLE,
        "seuils_km": list(SEUILS_KM),
        "distance_ppv_mediane_km": round(float(np.median(ppv)), 1),
        "moughataas": lignes,
        "par_wilaya": resume_wilaya,
        "moughataas_sans_ecole": [r["moughataa"] for r in sans_ecole],
        "geojson": SORTIE,
        "limite": (
            "Couverture surfacique et non de population : les projections HDX et l'EPCV "
            "s'arrêtent à la wilaya, aucune donnée de population n'existe à la moughataa. "
            "Un désert du nord peu peuplé pèse donc autant qu'une zone rurale dense du sud. "
            "Les indices d'accessibilité pondérés par la demande (2SFCA) ne sont pas "
            "calculables avec ces sources."
        ),
    }


if __name__ == "__main__":
    from backend.sanitize import dump_json

    res = run_acces()
    dump_json("data/processed/analytics/acces.json", res, indent=2)

    print(f"{res['n_moughataas']} moughataas, {res['n_etablissements']} établissements ; "
          f"distance médiane au plus proche voisin {res['distance_ppv_mediane_km']} km")
    print(f"{len(res['moughataas_sans_ecole'])} moughataas sans aucun établissement recensé")

    print(f"\n{'moughataa':<26}{'wilaya':<20}{'écoles':>8}{'>5 km':>9}{'>10 km':>9}{'d. méd.':>9}")
    for r in res["moughataas"][:12]:
        print(f"{str(r['moughataa'])[:25]:<26}{str(r['wilaya'])[:19]:<20}{r['n_etablissements']:>8}"
              f"{r['part_au_dela_5km_pct']:>8.1f}%{r['part_au_dela_10km_pct']:>8.1f}%"
              f"{r['distance_mediane_km']:>8.1f}")

    print(f"\n{'wilaya':<22}{'moughataas':>12}{'sans école':>12}{'>10 km moyen':>14}")
    for w in res["par_wilaya"]:
        print(f"{str(w['wilaya'])[:21]:<22}{w['n_moughataas']:>12}{w['moughataas_sans_ecole']:>12}"
              f"{w['part_au_dela_10km_pct']:>13.1f}%")
