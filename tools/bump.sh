#!/bin/sh
# Nouvelle version publiée : numéro de version des fichiers (index.html) et du cache hors-ligne (sw.js).
cd "$(dirname "$0")/../app" || exit 1
n=$(grep -o 'palier-v[0-9]*' sw.js | grep -o '[0-9]*'); n=$((n + 1))
sed -i "s/palier-v[0-9]*/palier-v$n/" sw.js
sed -i "s/?v=[0-9]*\"/?v=$n\"/g" index.html
echo "version $n"
