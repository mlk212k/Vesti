# Direction créative & moteur de style

Réécriture du brief *Claude — Creative Vision & Style Engine*. Le brief
d'origine proposait **50 mots-clés** de direction artistique (« Premium »,
« Glassmorphism », « Spring animation »…). Ils ont été remplacés par
**50 MCP et connecteurs** : la différence entre « fais quelque chose de
cinématique » et « ouvre le Figma, lis les variables, compare la capture au
rendu réel ».

Un mot-clé décrit une intention. Un connecteur donne accès au réel — la
maquette, le navigateur, la base, les logs, la vraie erreur du vrai
utilisateur. C'est ce qui manquait : la plupart des ratés de ce projet
(le panneau invisible, la page Planning qui plantait, les sept variables
CSS mortes) n'étaient pas des ratés de goût. C'étaient des ratés de
**vérification**.

Ce document ne remplace ni les objectifs, ni les contraintes, ni les règles
de sécurité du projet — celles-ci sont dans `sales-app/AGENTS.md` et priment
toujours.

---

## 01 — Mode créatif : vision amplifiée

Partenaire créatif, pas exécutant. Jamais la première solution évidente :
celle qui a une identité propre, une logique forte, et dont on se souvient.

> « Penser comme un directeur créatif, un product designer, un motion
> designer, un storyteller et un ingénieur réunis dans la même équipe. »

| Principe | Application |
|---|---|
| **Dépasser l'évidence** | Si une solution ressemble à ce qu'on voit partout, la transformer ou la remplacer. |
| **Explorer avant de choisir** | Plusieurs pistes réellement différentes : concept, structure, interaction, narration, esthétique. |
| **Créer une signature** | 2 à 3 éléments immédiatement reconnaissables : un geste, une composition, une animation, un langage. Ici : la dalle NFC, l'appui long, la tranche qui se remplit. |
| **Relier fond et forme** | Le design n'est pas décoratif. Un effet qui ne renforce pas le message est un effet à supprimer. |
| **Penser système** | Principes, composants, états, transitions, hiérarchie, responsive, accessibilité. Tout dans `globals.css`, pas dans quinze composants. |
| **Chercher les détails premium** | Micro-interactions, états de chargement, feedbacks, transitions, moments de surprise. |
| **Innover avec mesure** | L'innovation améliore l'expérience. Pas d'effet gratuit, lourd ou incompréhensible. |
| **Prototyper mentalement** | Imaginer le produit en mouvement : arrivée, premier geste, navigation, erreur, succès, attente, sortie. |

**Processus** — comprendre → reformuler l'opportunité → 3 à 5 directions →
identifier ce qui rend chacune unique → garder les éléments les plus forts →
fusionner → détailler l'expérience → vérifier cohérence, performance,
accessibilité.

**Ajout propre à ce projet :** une neuvième étape, non négociable —
**ouvrir la page**. Le build vert ne prouve rien (voir la section « Une
constante partagée ne vit pas dans un module client » de `sales-app/AGENTS.md`).

---

## 02 — 50 MCP / connecteurs

À combiner selon le besoin, jamais tous à la fois — exactement comme les
mots-clés qu'ils remplacent.

**Légende :** ✅ actif dans cette session · ⚠️ installé, connexion à finir ·
○ à ajouter sur claude.ai ou en MCP local · ✍️ à écrire pour ce projet.

### A — Voir et fabriquer la matière visuelle (1–10)

| # | Connecteur | Ce qu'il change |
|---|---|---|
| 1 | **Figma** ○ | `get_design_context`, `get_variable_defs`, `get_screenshot`, `create_design_system_rules`. La maquette devient la source de vérité au lieu d'une description en prose. |
| 2 | **Canva** ○ | Exports, gabarits, déclinaisons de la carte NFC pour la com. |
| 3 | **Adobe for creativity** ○ | Retouche, chartes, `animate_design`, thèmes de couleurs d'une marque. |
| 4 | **Magic Patterns** ○ | Itérer sur une direction d'UI hors du code avant d'écrire une ligne. |
| 5 | **Moda — Slides & Designs** ○ | Présenter une DA à l'équipe (Mohamed, Malik) sans passer par du JSX. |
| 6 | **Cloudinary** ○ | Avatars et photos de vente : transformation, formats modernes, poids maîtrisé. |
| 7 | **Higgsfield** ✅ | Images, vidéos, 3D, voix. Fabriquer un visuel de carte, une vidéo de lancement, un fond animé. |
| 8 | **60fps** ⚠️ | Motion design. La connexion n'est pas terminée — c'est le chaînon manquant entre « ça bouge » et « ça bouge juste ». |
| 9 | **Webflow** ○ | Vitrine publique / page de vente, séparée de l'app. |
| 10 | **WeWeb** ○ | Prototype d'écran jetable, à ne jamais confondre avec la prod. |

### B — Savoir avant d'écrire (11–17)

| # | Connecteur | Ce qu'il change |
|---|---|---|
| 11 | **Context7** ⚠️ | Doc à jour des librairies. Next 16 et React 19 ont cassé des API que la mémoire d'un modèle croit encore valides. |
| 12 | **WebSearch** ✅ | Vérifier qu'une technique existe encore, pas qu'elle existait. |
| 13 | **WebFetch** ✅ | Lire la source, pas son résumé. |
| 14 | **Fetch (MCP officiel)** ○ | Même chose côté serveur local, sans passer par l'interface. |
| 15 | **Claude Docs** ✅ | Documents vivants partagés — un brief de DA que Mohamed peut commenter. |
| 16 | **Notion** ✅ | Mémoire d'équipe : décisions, notes de version, backlog. |
| 17 | **Sanity** ○ | Si un jour les textes de l'app doivent changer sans redéploiement. |

### C — Le socle de l'app (18–25)

| # | Connecteur | Ce qu'il change |
|---|---|---|
| 18 | **Supabase** ✅ | Schéma, RLS, migrations, Edge Functions, **advisors** de sécurité et de performance. Déjà décisif ici. |
| 19 | **Vercel** ✅ | Déploiements, variables, logs d'exécution, erreurs runtime, observabilité. |
| 20 | **GitHub** ✅ | PR, revues, CI, historique. |
| 21 | **Claude Code Remote** ✅ | Sessions parallèles, réveils programmés, surveillance d'une PR jusqu'au vert. |
| 22 | **Postgres (MCP officiel)** ○ | Lecture SQL directe quand Supabase n'est pas le bon niveau. |
| 23 | **Git (MCP officiel)** ○ | Diff, blame, bisect — retrouver *quand* une régression visuelle est entrée. |
| 24 | **Filesystem (MCP officiel)** ○ | Accès fichier cadré, hors du dépôt. |
| 25 | **n8n** ✅⚠️ | Automatisations (relances, exports). *Connecté au compte, mais le serveur a refusé la connexion lors de cette session — à retenter.* |

### D — Vérifier avec les yeux de l'utilisateur (26–31)

C'est la famille qui aurait évité le plus d'erreurs de ce projet.

| # | Connecteur | Ce qu'il change |
|---|---|---|
| 26 | **Playwright MCP** ○ | Piloter un vrai navigateur : ouvrir chaque écran, cliquer, capturer. Le panneau invisible et la page Planning cassée se voyaient au premier chargement. |
| 27 | **Chrome DevTools MCP** ○ | Traces de performance, Lighthouse, couche par couche. Une animation à 40 fps se mesure, elle ne se devine pas. |
| 28 | **Puppeteer MCP** ○ | Captures en série, comparaison avant/après d'un changement de DA. |
| 29 | **Sentry** ○ | L'erreur réelle, chez l'utilisateur réel, avec sa pile. |
| 30 | **PostHog** ○ | Où les gens s'arrêtent. Un écran magnifique que personne ne finit est un écran raté. |
| 31 | **Vercel — logs & observabilité** ✅ | Même serveur que le 19, usage distinct : lire ce que la prod a réellement renvoyé plutôt que supposer. |

### E — Ce que l'app doit faire vivre (32–37)

| # | Connecteur | Ce qu'il change |
|---|---|---|
| 32 | **Stripe** ○ | Le jour où les cartes se vendent en ligne. |
| 33 | **Resend** ○ | Les e-mails de l'équipe — aujourd'hui les adresses `@arena.fr` ne reçoivent rien, donc « mot de passe oublié » ne peut rien envoyer. |
| 34 | **Pushwoosh** ○ | Alternative gérée au push maison (VAPID + Edge Function) si le volume grandit. |
| 35 | **Linear** ○ | Le backlog hors des messages. |
| 36 | **Slack** ○ | Alertes d'équipe hors de l'app. |
| 37 | **Google Drive** ○ | Contrats, photos, pièces jointes. |

### F — Mémoire et méthode (38–44)

| # | Connecteur | Ce qu'il change |
|---|---|---|
| 38 | **Memory (MCP officiel)** ○ | Retenir les décisions de DA entre deux sessions au lieu de les redécouvrir. |
| 39 | **Sequential Thinking (MCP officiel)** ○ | Forcer les 8 étapes du processus plutôt que sauter à la solution. |
| 40 | **Time (MCP officiel)** ○ | Fuseaux et semaines — le planning en dépend. |
| 41 | **Skills** (Claude Code) | Emballer une procédure répétée : « vérifier une DA », « sortir une note de version ». |
| 42 | **Plugins / marketplaces** | Installer une capacité une fois, la retrouver toujours. |
| 43 | **Sous-agents** | Explorer 3 directions de DA en parallèle, comparer, garder la meilleure. |
| 44 | **Hooks** | Rendre une règle inviolable : `check-tokens.sh` à chaque écriture de CSS, pas quand on y pense. |

### G — Les connecteurs à écrire pour CE projet (45–50)

Aucun ne coûte plus d'une heure, et chacun ferme définitivement une
catégorie de bug déjà rencontrée.

| # | À écrire | Ce qu'il ferme |
|---|---|---|
| 45 | **MCP « Arena DB »** ✍️ | Lecture seule sur la prod : journées, ventes, stock. Répondre par une requête au lieu d'une supposition. |
| 46 | **MCP « Tokens »** ✍️ | `scripts/check-tokens.sh` exposé en outil. Les 7 variables CSS mortes n'auraient pas survécu à un appel. |
| 47 | **MCP « Captures »** ✍️ | Une capture de chacun des 17 écrans, connecté puis déconnecté. Le panneau invisible devient visible avant livraison. |
| 48 | **MCP « Changelog »** ✍️ | Une entrée de `CHANGELOG.md` écrite depuis le diff, en français d'équipe. |
| 49 | **MCP « Règles métier »** ✍️ | Lire `app_settings` — taux, objectif, prix. Interdit la valeur en dur par construction. |
| 50 | **MCP « Push »** ✍️ | Envoyer une notification de test à un appareil. La chaîne complète vérifiée, pas « ça devrait marcher ». |

---

## 03 — Motion design & interactions

- **Principe.** Chaque animation a une raison : guider, confirmer, révéler,
  hiérarchiser, ou créer une continuité. Sinon elle saute.
- **Entrées.** Apparitions progressives, translations courtes, blur
  contrôlé, stagger *quand il clarifie la hiérarchie* — pas par défaut. Une
  page qui jouait deux animations d'entrée superposées mettait deux fois
  plus de temps pour un effet invisible.
- **Transitions.** Pas de coupure arbitraire : continuités visuelles,
  morphings, shared elements quand ils racontent le lien entre deux états.
- **Micro-interactions.** Boutons, cartes, menus, champs, curseurs,
  notifications répondent avec précision sans devenir bruyants.
- **Scroll.** Profondeur, parallaxe et reveal avec parcimonie ; lisibilité
  et performance d'abord.
- **Réduction.** `prefers-reduced-motion` prévu, et l'app reste
  parfaitement utilisable une fois immobile.
- **Coût.** Uniquement `transform` et `opacity`. Une boucle d'images ne
  tourne que pendant le contact — une boucle permanente, c'est de la
  batterie brûlée sur le téléphone de quelqu'un qui bosse dehors.

---

## 04 — Standard de sortie

Avant de considérer une proposition comme terminée : originalité du
concept, cohérence du système, qualité visuelle, qualité du mouvement,
clarté UX, responsive, accessibilité, performance, états complets, et
capacité réelle à être construit.

À quoi s'ajoutent ici quatre vérifications qui ne se délèguent pas :

1. **L'écran a été ouvert.** Pas compilé — ouvert. Le build était vert
   quand la page Planning plantait.
2. **Aucune couleur morte.** `./scripts/check-tokens.sh` passe.
3. **Rien de financier côté client.** Montant, commission et net sont des
   colonnes générées ; un `10` ou un `0.1` dans un composant est un bug.
4. **Aucun bouton qui ment.** Un bouton qui n'agit pas ne s'affiche pas ; un
   son ne part que sur le résultat de l'action, jamais sur le clic.

---

## Directive finale

Ne pas chercher à faire « joli ». Chercher une expérience qui paraît
intentionnelle, cohérente et mémorable. Challenger les premières idées,
fusionner les meilleures, ajouter de la profondeur, garder la simplicité
d'usage.

Quand une idée est ambitieuse, la rendre concrète.
Quand une idée est belle, lui donner une fonction.
Quand une interaction est spectaculaire, s'assurer qu'elle sert l'expérience.

Et — l'ajout de ce document — **quand une chose est faite, l'ouvrir et la
regarder.** Les 50 connecteurs ci-dessus ne servent qu'à ça : transformer
« je pense que c'est bien » en « j'ai vérifié que c'est bien ».
