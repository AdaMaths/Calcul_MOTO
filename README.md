# ElectroCalc Pro

Calculateurs professionnels pour l'électricité, les moteurs et les
transformateurs. Application web (PWA) en français, mobile-first, en
HTML/CSS/JS pur — aucune dépendance à installer, aucun build.

## 🚀 Aperçu local

```bash
python3 -m http.server 8000
# puis ouvrez http://localhost:8000
```

Ou ouvrez simplement `index.html` dans un navigateur.

## 📦 Structure du dépôt

```
electrocalc/
├── index.html         # Structure de la page, 5 calculateurs en onglets
├── style.css           # Tout le style (variables, thème clair/sombre, composants)
├── script.js             # Logique des 5 calculateurs, historique, thème, PWA
├── manifest.json           # Manifeste PWA (installable sur mobile/desktop)
├── favicon.svg               # Icône de l'application
└── README.md
```

## 🧮 Calculateurs disponibles

| Calculateur | Ce qu'il calcule |
|---|---|
| **Loi d'Ohm & puissance** | Tension, courant, résistance (à partir de 2 valeurs sur 3), puissances active/apparente/réactive |
| **Triphasé** | Puissances active, apparente, réactive d'un récepteur triphasé équilibré |
| **Moteur asynchrone** | Vitesse de synchronisme Ns, glissement, couple utile |
| **Transformateur** | Rapport de transformation, courant secondaire estimé (transfo idéal) |
| **Couplage étoile/triangle** | Tension et courant par enroulement selon le couplage |

Un **mode pédagogique** (case à cocher au-dessus des onglets) affiche le
détail des étapes de calcul sous chaque résultat — utile pour vérifier une
formule ou pour un usage en TD.

## ✨ Fonctionnalités

- Historique des 20 derniers calculs (tous calculateurs confondus),
  conservé dans `localStorage` du navigateur, exportable en CSV
- Thème clair/sombre, mémorisé entre les sessions
- Jauge visuelle de qualité du facteur de puissance
- Installable comme application (PWA) sur mobile et desktop via `manifest.json`
- Accessible : navigation clavier, lecteurs d'écran (`aria-*`, lien d'évitement)
- 100 % local : aucun calcul n'est envoyé à un serveur

## ✏️ Modifier le contenu

- **Styles** : tout dans `style.css`, variables de couleur en haut du
  fichier (`:root` et `body.dark`)
- **Nouveau calculateur** : dupliquer un bloc `.calc-panel` dans
  `index.html`, ajouter l'onglet correspondant dans `.calc-tabs`, et
  ajouter le gestionnaire de formulaire dans `script.js`
- **Listes/seuils** : chaque calculateur a ses propres champs, pas de
  configuration centralisée à ce stade

## 🐙 Héberger sur GitHub Pages

```bash
git init
git add .
git commit -m "ElectroCalc Pro v2.2"
git branch -M main
git remote add origin https://github.com/<votre-utilisateur>/electrocalc.git
git push -u origin main
```

Puis sur GitHub : **Settings → Pages → Source: Deploy from a branch → main / (root)**.
Le site est en ligne après 1-2 minutes à `https://<votre-utilisateur>.github.io/electrocalc/`.

---
© 2026 Adama GUEYE. Tous droits réservés.
adama.gueye.3304@gmail.com · github.com/AdaMaths
