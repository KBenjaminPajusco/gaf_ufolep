# Palier — enchaînements GAF UFOLEP

Appli web (installable sur téléphone) pour construire un enchaînement GAF et estimer sa note
selon le **Programme Technique GAF UFOLEP du 29/09/2026**.

## Lancer

```
python server.py            # http://localhost:8790  (--port / --host pour changer)
```

Aucune dépendance. **L'appli est 100 % navigateur (sans serveur)** : `app/` est un site statique
hébergeable n'importe où (GitHub Pages, Netlify…) ; `server.py` sert juste à la lancer en local.

- Enchaînements et liens vidéo : stockés dans le navigateur (localStorage `palier-routines-v1`, `palier-media-v1`).
- Partage : code `PAL1-…` (JSON compressé deflate-raw + base64url, ~200 caractères) ou lien `…/#code=PAL1-…`.
- Sauvegarde/restauration : fichier JSON depuis « Mes enchaînements ».
- Version 2 prévue : base de données, comptes gymnaste/coach.

## Contenu

- `app/elements.json` : 414 éléments extraits des arches de la brochure (agrès, arche, secteur, palier, n°, page).
- `app/rules.js` : paliers autorisés/valorisables, tronc commun et valorisations par agrès et niveau (p. 26-32).
- `app/app.js` : catalogue, enchaînement, moteur de note (TC 1 pt/exigence, valorisations 3 pts (*) / 2 pts,
  « 4 parmi 5/6 » en B/C, éléments distincts entre valorisations, fautes automatiques + compteur de fautes).
- `server.py` : serveur statique local (son API `/api/routines` / `/api/media` n'est plus utilisée par l'appli).
- `app/img/` : vignettes découpées dans la brochure (pictogrammes UFOLEP : usage interne, droits à vérifier avant diffusion publique).
- `app/vendor/Sortable.min.js` : glisser-déposer (SortableJS 1.15.2, MIT).

## Régénérer les données depuis la brochure

```
.venv/Scripts/python.exe -I -X utf8 tools/extract.py      # PDF -> tools/raw.json (position -> palier)
.venv/Scripts/python.exe -I -X utf8 tools/build_data.py   # raw.json -> app/elements.json
.venv/Scripts/python.exe -I -X utf8 tools/pictos.py       # pictogrammes vectoriels -> app/img/<id>.webp
node tools/test_eval.js                                   # contrôle des exemples
```

## Limites connues

- Certaines valorisations demandent un jugement (balancés, « mvt en 2 parties »…) : elles sont à cocher à la main.
- Le bonus et les points de valorisation au saut ne sont pas chiffrés dans la brochure.
- Les drapeaux « envol », « salto », « rotation » sont déduits du nom des éléments (`tools/build_data.py`).
