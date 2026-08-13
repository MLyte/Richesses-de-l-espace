<script setup lang="ts">
import { ref } from "vue";
import { useAccessibleModal } from "../composables/useAccessibleModal";

defineProps<{ compact?: boolean }>();
const open = ref(false);
const dialog = ref<HTMLElement | null>(null);
const { onKeydown } = useAccessibleModal(open, dialog, () => { open.value = false; });

const tvSteps = [
  ["1", "Lancez les dés", "Un double coûte sa valeur à la Banque. Il ne donne pas de tour supplémentaire."],
  ["2", "Explorez la case", "Le monde indique les concessions disponibles. Sa ressource détermine les droits."],
  ["3", "Choisissez vos concessions", "Achetez de zéro à six parts dans ce monde, au prix indiqué."],
  ["4", "Réglez les droits", "Les joueurs à 30 % ou plus de la ressource reçoivent leurs droits."],
  ["5", "Développez vos filières", "Les parts d’une même ressource se cumulent, où qu’elles soient."],
  ["6", "Terminez le tour", "Quand chaque décision est réglée, passez la main à l’équipage suivant."]
] as const;
</script>

<template>
  <button class="help-trigger" type="button" @click="open = true">? <span>Aide</span></button>
  <Teleport to="body">
    <div v-if="open" class="help-backdrop" role="presentation" @click.self="open = false">
      <section ref="dialog" class="help-dialog" :class="{ 'help-dialog--compact': compact }" role="dialog" aria-modal="true" aria-labelledby="help-title" tabindex="-1" @keydown="onKeydown">
        <button class="help-close" type="button" aria-label="Fermer l’aide" @click="open = false">×</button>

        <template v-if="compact">
          <div class="help-tv">
            <div class="help-tv__intro">
              <p class="eyebrow">Guide de l’expédition</p>
              <h2 id="help-title">Une galaxie à conquérir.</h2>
              <p>À l’écran : la situation de l’expédition. Sur les téléphones : toutes les décisions.</p>
            </div>
            <div class="help-tv__steps">
              <article v-for="([number, title, copy]) in tvSteps" :key="number">
                <b>{{ number }}</b>
                <div><h3>{{ title }}</h3><p>{{ copy }}</p></div>
              </article>
            </div>
            <div class="help-tv__essentials">
              <article><strong>Droits d’extraction</strong><span>30 %, 50 %, 70 % et 90 % : votre part totale fixe les droits reçus.</span></article>
              <article><strong>Portails</strong><span>Ils permettent d’acheter jusqu’à six concessions de ressources que vous possédez déjà.</span></article>
              <article><strong>Dette</strong><span>Sans crédits pour payer, vendez vos concessions ou laissez la Banque les reprendre.</span></article>
            </div>
            <p class="help-tv__hint">Les détails des marchés, alliances, technologies et événements sont accessibles dans l’aide de chaque téléphone.</p>
          </div>
        </template>

        <template v-else>
          <p class="eyebrow">Règles de navigation économique</p>
          <h2 id="help-title">Comment jouer à Richesses de l’espace ?</h2>
          <div class="help-grid">
            <article v-for="([number, title, copy]) in tvSteps" :key="number"><b>{{ number }}</b><div><h3>{{ title }}</h3><p>{{ copy }}</p></div></article>
          </div>
          <div class="help-rules-grid">
            <div class="help-rule"><strong>Course d’ouverture</strong><span>Chaque joueur choisit un vaisseau régional différent sur son téléphone. Seuls les vaisseaux choisis courent : leur nombre correspond au nombre de joueurs, et le premier arrivé joue en premier.</span></div>
            <div class="help-rule"><strong>Droits d’extraction</strong><span>Sommez les parts de toutes les concessions de la ressource, puis appliquez le plus haut seuil atteint : 30 %, 50 %, 70 % ou 90 %. Sous 30 %, aucun droit n’est dû. Plusieurs bénéficiaires peuvent être payés.</span></div>
            <div class="help-rule"><strong>Prime d’expédition</strong><span>Recevez immédiatement 0,5 crédit par point obtenu avec les deux dés. Réglez ensuite les droits de la ressource imprimée sur la case.</span></div>
            <div class="help-rule"><strong>Portails sectoriel et galactique</strong><span>Achetez jusqu’à six concessions de ressources que vous possédez déjà. Le portail sectoriel fonctionne dès le départ dans ses secteurs ; le portail galactique couvre tout le plateau après un tour complet.</span></div>
            <div class="help-rule"><strong>Quarantaine orbitale</strong><span>Votre prochain tour est perdu. Le serveur le passera automatiquement et avertira toute la table.</span></div>
            <div class="help-rule"><strong>Événement cosmique</strong><span>Piochez une carte et versez ou recevez immédiatement de la Banque interstellaire la somme indiquée.</span></div>
            <div class="help-rule"><strong>Technologie et Marché orbital</strong><span>Une Technologie coûte 3 crédits et évite une vente avant la sélection des lots. Sinon, les concessions d’une même ressource restent groupées. La mise commence à la moitié exacte du prix d’achat, avec des pas de 0,1 crédit et une fenêtre initiale de 7 secondes. Une offre tardive garantit 4 secondes pour répondre.</span></div>
            <div class="help-rule"><strong>Transactions entre joueurs</strong><span>Pendant votre tour, proposez une vente, un achat ou une alliance. Un échange de groupes reste possible hors tour. L’accord porte toujours sur le portefeuille complet de la ressource choisie ; le partenaire accepte ou refuse sur son téléphone.</span></div>
            <div class="help-rule"><strong>Consortiums conjoints</strong><span>Deux joueurs peuvent réunir leurs portefeuilles. Chacun paie la moitié du prix d’achat cumulé à la banque ; le pion du portefeuille le plus précieux devient pilote. Si ce regroupement ne laisse qu’un consortium opérationnel, la partie se termine.</span></div>
            <div class="help-rule"><strong>Dette et liquidation</strong><span>Si un droit dépasse vos liquidités, vous pouvez d’abord vendre un portefeuille complet à un autre joueur. Si la dette reste impossible à régler, la Banque interstellaire couvre le solde et vos concessions retournent aux registres.</span></div>
            <div class="help-notice"><strong>Fin de partie</strong><span>Il n’existe aucune limite automatique de rondes. La partie standard continue jusqu’à ce qu’un seul consortium reste opérationnel. Les Marchés et Stations deviennent des cases de repos lorsqu’il ne reste que deux joueurs.</span></div>
          </div>
        </template>
      </section>
    </div>
  </Teleport>
</template>
