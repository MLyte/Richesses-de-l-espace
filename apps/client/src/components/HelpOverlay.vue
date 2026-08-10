<script setup lang="ts">
import { ref } from "vue";

defineProps<{ compact?: boolean }>();
const open = ref(false);
</script>

<template>
  <button class="help-trigger" type="button" @click="open = true">? <span>Aide</span></button>
  <Teleport to="body">
    <div v-if="open" class="help-backdrop" role="presentation" @click.self="open = false">
      <section class="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <button class="help-close" type="button" aria-label="Fermer l’aide" @click="open = false">×</button>
        <p class="eyebrow">Règles du prototype</p>
        <h2 id="help-title">Comment jouer à Orbisium ?</h2>
        <div class="help-grid">
          <article><b>1</b><div><h3>Lancez les dés</h3><p>Un double coûte immédiatement à la banque autant de crédits que la valeur d’un dé, sans tour supplémentaire.</p></div></article>
          <article><b>2</b><div><h3>Lisez la case</h3><p>Chaque case classique associe un pays producteur et une ressource. Le pays détermine les titres achetables ; la ressource détermine les royalties.</p></div></article>
          <article><b>3</b><div><h3>Achetez dans le pays</h3><p>Choisissez de zéro à six titres encore disponibles produits par le pays, puis payez leur prix fixe à la banque.</p></div></article>
          <article><b>4</b><div><h3>Réglez la ressource</h3><p>Après l’achat, chaque autre joueur possédant au moins 30 % de la ressource de la case reçoit les royalties correspondant à sa part totale.</p></div></article>
          <article><b>5</b><div><h3>Cumulez les parts</h3><p>Les titres d’une ressource s’additionnent même s’ils proviennent de pays et de continents différents.</p></div></article>
          <article><b>6</b><div><h3>Terminez le tour</h3><p>Le tour ne peut finir qu’après le choix d’achat et le règlement de tous les bénéficiaires qualifiés.</p></div></article>
        </div>
        <div class="help-rule"><strong>Calcul des royalties</strong><span>Somme des pourcentages de tous les titres de la ressource, puis application du plus haut seuil atteint : 30 %, 50 %, 70 % ou 90 %. Le prix du titre et l’indice du grand thème n’interviennent pas.</span></div>
        <div class="help-rule"><strong>Dividende</strong><span>Recevez immédiatement 0,5 crédit par point obtenu avec les deux dés. Réglez ensuite les royalties de la ressource imprimée sur la case.</span></div>
        <div class="help-rule"><strong>Comptoir régional et Mandat global</strong><span>Achetez jusqu’à six titres de ressources que vous possédez déjà. Le Comptoir se limite à sa région. Le Mandat couvre le monde entier, mais seulement après un tour complet.</span></div>
        <div class="help-rule"><strong>Contrôle douanier</strong><span>Votre prochain tour est perdu. Le serveur le passera automatiquement et avertira toute la table.</span></div>
        <div class="help-rule"><strong>Tendance</strong><span>Piochez une carte et donnez ou recevez immédiatement à la banque la somme indiquée.</span></div>
        <div class="help-rule"><strong>Joker et vente forcée</strong><span>Un Joker coûte 3 crédits et annule une vente avant la sélection des lots. Sinon, les titres d’une même ressource restent groupés. La mise commence à la moitié exacte du prix d’achat, avec des pas de 0,1 crédit et un délai de 10 secondes.</span></div>
        <div class="help-rule"><strong>Acheter ou vendre à un joueur</strong><span>Pendant votre tour, avant de lancer les dés ou après avoir résolu la case, ouvrez « Acheter » ou « Vendre ». L’accord porte toujours sur tous les titres détenus pour la ressource choisie ; le partenaire accepte ou refuse sur son téléphone.</span></div>
        <div class="help-rule"><strong>Échanger des ressources</strong><span>Entre deux décisions obligatoires, n’importe quel joueur peut proposer l’échange complet d’une ressource contre le groupe complet d’une autre ressource. Les pourcentages et tous les pays d’origine sont transférés ensemble.</span></div>
        <div class="help-rule"><strong>Anticiper une dette</strong><span>Une transaction doit être conclue avant qu’un paiement obligatoire soit présenté. Si les liquidités sont insuffisantes au moment de payer, la dette doit être résolue immédiatement selon la procédure de faillite.</span></div>
        <div class="help-notice"><strong>Fin de partie</strong><span>Il n’existe pas de limite automatique de rondes. La partie continue tant qu’au moins deux joueurs sont solvables ; le dernier joueur solvable gagne. L’hôte peut aussi arrêter volontairement la partie depuis le menu, après confirmation.</span></div>
      </section>
    </div>
  </Teleport>
</template>
