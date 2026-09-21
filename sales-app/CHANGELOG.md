# Notes de version

Ce qui change dans l'app, à chaque mise à jour. Écrit pour l'équipe, pas
pour les développeurs — la version technique est dans `README.md`.

---

## v3.0 — 21 septembre 2026 — « CHROME »

**Nouveau look complet.** L'app est passée du velours au métal.

### 🪞 Tout est en chrome

• **La carte est polie.** Elle était en velours sombre ; c'est maintenant du
  métal, avec un reflet qui **glisse sous ton doigt** quand tu la touches et
  une bande de lumière qui la traverse toute seule. Sa tranche continue de
  se remplir à mesure que tu vends — ça, ça ne change pas.
• **Les gros chiffres sont en métal**, vraiment : la matière coule
  lentement dedans. Les petits chiffres restent normaux — en métal ils
  devenaient illisibles.
• **Les boutons ont une épaisseur** : une arête claire en haut, une ombre en
  bas, et un éclat qui traverse le bouton principal toutes les cinq
  secondes.

### 🎨 Plus d'orange

L'orange est remplacé par un **beige crème**. Tout l'écran est froid — noir
bleuté, chrome gris — et le beige est la seule chose chaude. Sur un fond
froid, le chaud ressort sans avoir besoin de crier.

Le violet reste, et garde son rôle : il veut dire « ça se passe maintenant »
(quelqu'un est en ligne, une relance part, un objectif est atteint).

### 🔤 Nouvelle écriture

Les grands mots et les chiffres sont en **Unbounded** : très large, très
grasse — la lettre des pochettes du début des années 2000. Le reste est en
**Space Grotesk**, qui a du caractère tout en restant lisible en petit.

Les deux polices précédentes étaient correctes, mais neutres.

### ✨ Le fond a changé aussi

Les lignes de balayage façon vieil écran ont disparu. À la place : deux
brumes à l'aérographe qui dérivent, un treillis de chrome, les ondes NFC, et
un **vernis** — une bande iridescente qui traverse l'écran très lentement,
comme sur une vitre qu'on vient de polir.

### ♿ Toujours

Si ton téléphone est réglé sur « réduire les animations », **tous** ces
reflets s'arrêtent et l'app reste parfaitement utilisable.

---

## v2.4 — 21 septembre 2026

### 🐛 Le planning ne s'ouvrait pas

La page **Planning** plantait et affichait « Ça a coincé » au lieu du
planning. Corrigé.

La cause : la liste des jours de la semaine était rangée dans un fichier
réservé au navigateur, et la page — qui se construit sur le serveur — ne
recevait pas la liste mais une référence vide. Rien ne le signalait au
moment de fabriquer l'app ; ça ne se voyait qu'en ouvrant la page.

### 📅 Le chef peut enfin régler les créneaux de chacun

Jusqu'ici chacun ne pouvait modifier que **ses** disponibilités, depuis son
profil. Mohamed et Malik voyaient le planning de l'équipe sans pouvoir le
corriger.

Maintenant, sur la page Planning : une rangée de noms, on en touche un, et
sa grille 7 jours × matin/après-midi s'ouvre juste en dessous. Les noms de
la table « La semaine » ouvrent la même chose.

La base l'autorisait déjà depuis le début — c'est seulement l'écran qui
manquait. Et un commercial qui essaierait de modifier les créneaux d'un
collègue se fait toujours refuser par la base.

---

## v2.3 — 20 septembre 2026

### 🧩 Tous les écrans au même niveau

Les pages qui n'avaient pas encore été reprises le sont :

• **Équipe** utilise exactement la même carte joueur que l'écran d'accueil —
  même barre, même diode, même rang — avec en plus le **cumul depuis le
  début**. L'accueil répond « où en est la journée », Équipe répond « qui
  porte l'équipe depuis le départ », et les deux se trient différemment
  pour ça.
• **Ventes**, **Commerces** et **Historique** : chiffres en compteurs
  animés, lignes sans cadre, plus de petit texte technique, et les blocs se
  posent en cascade.
• Chaque journée de l'historique a sa barre de progression.

### ⚡ Un peu plus rapide à l'affichage

Chaque page jouait **deux** animations d'entrée l'une par-dessus l'autre
depuis la mise à jour précédente — le contenu mettait deux fois plus de
temps à se poser pour un effet qu'on ne voyait pas. Il n'en reste qu'une.

---

## v2.2 — 20 septembre 2026 — « ARCADE »

### 🎮 L'app bouge

Tout est en mouvement, en permanence et partout :

• **Un décor animé derrière chaque écran** : une grille qui dérive
  lentement, des ondes NFC qui partent du centre comme quand on approche
  une carte d'un lecteur, deux voiles de couleur qui flottent, et des
  lignes de balayage façon vieil écran.
• **Chaque page « démarre »** au lieu de s'afficher : le contenu arrive de
  l'arrière, légèrement flou, et se pose.
• **Les blocs se posent en cascade**, l'un après l'autre.
• **Les chiffres montent** jusqu'à leur valeur au lieu d'apparaître d'un
  coup.

### 🏆 Écran du chef et de Malik : un tableau de score

Ce n'est plus un tableau de bord, c'est un score :

• **Le CA du jour en énorme**, qui monte en compteur.
• **Une barre d'objectif d'équipe** sous le score — calculée sur les
  personnes **attendues** aujourd'hui, pas sur toute l'équipe : un jour où
  la moitié est en repos, une barre impossible à remplir ne sert à rien.
• **Une carte par joueur** : rang (1 en couleur), photo, barre de
  progression vers son objectif, gain du jour, et une **diode** qui bat
  pour ceux qui sont dehors en ce moment.
• Objectif atteint → la barre passe du pêche au violet.
• Malik n'a plus de barre de vente quand il n'a pas ouvert de journée : ce
  n'est pas son travail, l'app arrêtait de le lui reprocher.

### 🐛 Couleurs disparues

Plusieurs éléments avaient perdu leur couleur au changement de look
précédent, sans que rien ne plante : **les barres du graphique d'analytics
ne s'affichaient plus du tout**, les cases à cocher du planning repassaient
au bleu du navigateur, l'onde du logo s'éteignait. Tout est revenu.

---

## v2.1 — 20 septembre 2026 — « VELOURS »

### 🔔 Notifications push *(nouveau)*

Les relances et les messages arrivent maintenant **sur ton téléphone, même
quand l'app est fermée**.

👉 Ça s'active dans **Profil → Notifications**, et c'est un réglage **par
appareil** : l'activer sur ton téléphone ne l'active pas sur l'ordinateur.

⚠️ **Sur iPhone**, il faut d'abord **ajouter l'app à l'écran d'accueil**.
Depuis Safari, Apple ne l'autorise pas — l'app te le dira au lieu
d'afficher un bouton qui ne ferait rien.

La notification ne contient que le titre et le texte : jamais un chiffre
d'affaires. Elle peut s'afficher sur un écran verrouillé, devant n'importe
qui.

### 🎨 Nouveau look, en plus doux

Le look précédent faisait trop « site de paris ». Ce qui change :

• **Fini le petit texte technique.** Plus de minuscules capitales espacées,
  plus de 10 px, plus de police de terminal. Les étiquettes sont écrites
  normalement, et tout est plus gros.
• **Des couleurs chaudes.** Le noir tire sur le violet, deux voiles flous
  dérivent lentement derrière la page — pêche en haut, lilas en bas.
• **Tout est arrondi et mou.** Boutons pilules, verre dépoli, mouvements
  ralentis. Plus rien ne claque.
• Les statuts ne crient plus : « Pas commencé » au lieu de
  « PAS COMMENCÉ ».
• Les libellés sont revenus sous les icônes du bas.

### 🐛 L'erreur au moment d'envoyer un message

Envoyer un message dans le groupe pouvait afficher un écran technique en
anglais parlant de déploiements. Le message partait bien — c'est
l'affichage qui mentait.

Ça arrivait quand l'app était restée ouverte pendant une mise à jour. Elle
se recharge maintenant toute seule dans ce cas, et si quelque chose casse
vraiment, tu vois un message en français avec un bouton, pas une page
d'erreur de développeur.

---

## v2.0 — 20 septembre 2026 — « MATIÈRE »

**La plus grosse mise à jour depuis le lancement.** L'app ne ressemble plus
à un tableau de bord : elle ressemble à un objet.

*(Le look décrit ici a été radouci dès le lendemain — voir la v2.1. La
carte, les sons et le reste n'ont pas bougé.)*

### 🃏 La carte

L'écran d'accueil, c'est maintenant **une carte NFC en volume**, posée dans
le noir. Ce n'est pas une image : c'est ta journée.

- La **tranche du bas se remplit** à mesure que tu vends. 8 cartes sur 10,
  c'est 80 % de la tranche allumée. Il n'y a plus de jauge à côté — la
  jauge, c'est la carte.
- **Appui long sur la carte = ouvrir ta journée.** Plus de bouton.
- Une fois la journée ouverte, **appui long = enregistrer une vente.**
- Touche-la, fais-la glisser : elle s'enfonce sous le doigt, elle tourne,
  elle continue toute seule quand tu la lâches et elle se remet en place.
  Au repos, elle respire.
- Journée validée par le chef : la carte s'éteint et ne bouge plus.

> L'anneau qui se remplit sous ton doigt te dit où tu en es. Si tu relâches
> avant qu'il soit plein, il ne se passe rien — c'est fait exprès.

### 🎨 Le nouveau look

- **Du gris, du noir, et une seule couleur : l'orange braise.** Elle ne
  sort que pour trois choses : la tranche de ta carte, **ton net** (l'argent
  qui est à toi), et ce qui réclame une action tout de suite. Si tout était
  coloré, plus rien ne ressortirait.
- **Plus aucun cadre.** Les chiffres sont posés dans le vide. Ce qui sépare
  deux infos, c'est de l'espace, pas une boîte.
- **Des mots énormes** en fond d'écran, qui débordent volontairement.
- Les écrans n'apparaissent plus d'un coup : ils **se mettent au point**,
  comme une caméra.

### 🔊 Les sons

Six sons courts, tous fabriqués par l'app (aucun fichier à télécharger) :

| Quand | Ce que tu entends |
|---|---|
| Vente enregistrée | le tiroir-caisse |
| Journée ouverte ou fermée | le tampon |
| Message envoyé / reçu | pop / blip |
| Quantité modifiée | un cran |
| Action refusée | deux notes qui descendent |

Chaque son part **quand l'action a réellement marché**, jamais au moment du
clic. Si tu entends le tiroir-caisse, la vente est en base.

👉 Tu peux tout couper depuis **Profil → Sons**.

### 📅 Planning et relances *(nouveau)*

- Chacun déclare ses **créneaux** depuis son profil : 7 jours × matin /
  après-midi.
- L'encadrement voit **qui est attendu aujourd'hui** et **qui n'a pas
  encore ouvert sa journée**, sur la page Planning.
- De là, Malik ou Mohamed envoie une **relance** : tu la reçois en
  notification, avec ton prénom.
- Une relance par personne **maximum toutes les heures**. C'est bloqué dans
  la base, pas juste un bouton grisé.

> ⚠️ **Important :** un jour où tu n'es pas dispo, tu n'es pas en retard.
> C'est tout l'intérêt du planning. Et un objectif manqué ne déclenche
> **aucune retenue automatique** sur ton argent — jamais.

### 💬 Chat

- **On voit enfin qui est dans le groupe** (panneau « Les participants »,
  en haut de la conversation).
- **Réactions emoji** en un geste : 🔥 💪 👍 😂 😮 ❤️
- **Qui est en ligne** s'affiche en direct.
- Les messages d'une même personne sont **regroupés**, et les journées
  séparées par « Hier » / « Aujourd'hui ».
- 🐛 **Le groupe Équipe remarche.** L'envoi de message plantait avec une
  « erreur uuid » — corrigé.

### 👤 Profil

Tu peux maintenant modifier toi-même :

- ton **nom**,
- ton **téléphone**,
- ta **photo** (elle apparaît dans le chat et dans la vue d'équipe, 2 Mo
  max),
- tes **créneaux de dispo**,
- les **sons**.

Le rôle et l'objectif quotidien restent réglés par le chef.

### 🐛 Corrections

- Le panneau principal de l'écran d'accueil était **totalement invisible**
  sur certains appareils. Corrigé.
- « Vendues au total » s'affichait « VENDUES AU TOTA » dans les colonnes
  étroites. Corrigé.
- Des étiquettes comme « COMMISSION » se coupaient en plein milieu d'un mot.
  Corrigé.
- Le logo disparaissait dans la barre du haut sur mobile. Corrigé.
- Les barres des graphiques n'apparaissaient pas. Corrigé.

### ♿ Accessibilité

Si ton téléphone est réglé sur « réduire les animations », **toute l'app
arrête de bouger** et reste parfaitement utilisable. L'appui long a aussi
un équivalent au clavier.

---

## v1.0 — Le socle

Rappel de ce qui existait déjà et qui n'a pas bougé :

- **Trois rôles** : Mohamed (admin), Malik (manager), et les commerciaux.
  Un commercial ne voit **que ses propres données** — changer un numéro
  dans l'adresse du navigateur ne donne rien, c'est la base qui refuse.
- **Journées de travail** : ouverture, clôture avec note, validation par
  l'encadrement.
- **Ventes** : quantité, prix, commerce, notes, photo. Le montant, la
  commission et le net sont **calculés par la base**, jamais par le
  téléphone.
- **Commission configurable** (10 % aujourd'hui), réglable par l'admin sans
  toucher au code.
- **Stock de cartes** : dépôt, attributions, retours, pertes, recomptages —
  avec un historique complet. Total toujours d'accord avec l'historique.
- **Commerces**, **historique**, **analytics** avec filtres de période,
  **journal d'audit**.
- **Installable sur l'écran d'accueil** (PWA), avec le rebond et les
  glissements parasites neutralisés.

---

## Ça arrive

- Les vraies adresses e-mail de l'équipe — sans elles, « mot de passe
  oublié » ne peut rien envoyer.
- La création de comptes directement depuis l'app.
