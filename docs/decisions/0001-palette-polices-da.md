# 0001 — Palette et polices de la nouvelle direction artistique
- Date : 2026-10-10
- Statut : validée
- Décideurs : Carlos, Emma
- Tickets liés : aucun renseigné
## Contexte
Emma a défini une nouvelle direction artistique, avec le logo variante C (dégradé #43A047 → #FFA726, pictogramme blanc). Il fallait conserver les contrastes WCAG 2.2 AA.
## Options envisagées
**Logo**
- A : logo n°2 d'Emma tel quel.
- B : dégradé #4CAF50 → #FF9800, personnage crème.
- C : dégradé #43A047 → #FFA726, personnage blanc. **Retenue.**
- D : même dégradé que C, personnage sombre.

**Interrupteur désactivé**
- A : garder #DDD8CE (1,4:1). Refusée.
- B : piste #7C847F (3,8:1). **Retenue.**
- C : autre option, non retenue.

**Neutres**
- A : garder crème/beige. **Retenue.**

**Bleu tertiary**
- A : garder #2B6CB0. **Retenue.**
## Décision
- primary : #4CAF50 (hover #43A047)
- accent : #FF9800
- texte sur fond de marque : #212529
- variantes « -strong » pour tout texte, icône, marqueur ou tracé coloré sur fond clair : #2E7D32 (vert), #B34700 (orange)
- border-strong : #7C847F, pour les contours de champs et les pistes d'interrupteur (3,8:1)
- tertiary : bleu #2B6CB0
- neutres crème/beige inchangés : #FAF7F2, #EFEAE0, #DDD8CE
- polices : Montserrat (titres) et Inter (texte)
## Conséquences
- primary et accent ne servent que de fond.
- Les couleurs viennent des tokens du Figma (page 10 - Foundations, tableaux de correspondance et de contrastes), jamais en dur.
