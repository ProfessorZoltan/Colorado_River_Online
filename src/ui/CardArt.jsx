/**
 * CardArt.jsx
 * Registry mapping every cards.json ID to its SVG artwork component.
 *
 * Usage:
 *   import { CardArtDisplay } from './CardArt.jsx';
 *   <CardArtDisplay cardId="sneaky_pete" />        // renders at full size
 *   <CardArtDisplay cardId="protest_a" size={120} /> // 120 × 170 px
 *
 * For SC cases the component derives plaintiff/defendant from the card ID string
 * (e.g. "arizona_v_california" → plaintiffId="arizona", defendantId="california").
 */

import { CardActivistA, CardActivistB, CardActivistC, CardActivistD }
  from '../../artwork/activist-cards.jsx';
import { CardFarmerA, CardServiceWorkerA, CardServiceWorkerB, CardFirefighterA }
  from '../../artwork/citizen-cards.jsx';
import { CardProtestA, CardProtestB, CardSevereDrought, CardLargeSnowMelt, CardSCSession }
  from '../../artwork/event-cards.jsx';
import { CardAdjudicator, CardProBono, CardCorporateCounsel, CardWaterSpecialist }
  from '../../artwork/lawyer-cards_1.jsx';
import { CardAntiEnv, CardItsAJob, CardTeamPlayer, CardWorkaholic,
         CardRiderCoattails, CardInItForGlory }
  from '../../artwork/lawyer-cards-2.jsx';
import { CardDealFederal, CardQuidProQuo, CardLobbyFederal, CardScorchedEarth,
         CardWaterBribe, CardRedHerring, CardDonateSCJustice, CardProtectInterests }
  from '../../artwork/strategy-cards.jsx';
import { SCCaseCard }
  from '../../artwork/sc-case-cards.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Card-ID → Component registry
// ─────────────────────────────────────────────────────────────────────────────

export const CARD_ART = {
  // Activists
  activist_a:               CardActivistA,
  activist_b:               CardActivistB,
  activist_c:               CardActivistC,
  activist_d:               CardActivistD,

  // Citizens
  farmer_a:                 CardFarmerA,
  service_worker_a:         CardServiceWorkerA,
  service_worker_b:         CardServiceWorkerB,
  firefighter_a:            CardFirefighterA,

  // Lawyers
  sneaky_pete:              CardAdjudicator,      // scales-of-justice illustration
  anti_environmentalist:    CardAntiEnv,
  pro_bono_attorney:        CardProBono,
  its_a_job_lawyer:         CardItsAJob,
  team_player:              CardTeamPlayer,
  workaholic:               CardWorkaholic,
  rider_of_coattails:       CardRiderCoattails,
  in_it_for_glory:          CardInItForGlory,

  // Strategy
  deal_with_federal_government: CardDealFederal,
  quid_pro_quo:             CardQuidProQuo,
  lobby_federal_government: CardLobbyFederal,
  scorched_earth_negotiating: CardScorchedEarth,
  water_bribe:              CardWaterBribe,
  red_herring_case:         CardRedHerring,
  donate_to_sc_justice:     CardDonateSCJustice,
  protect_our_interests:    CardProtectInterests,

  // Events
  protest_a:                CardProtestA,
  protest_b:                CardProtestB,
  severe_drought:           CardSevereDrought,
  large_snow_melt:          CardLargeSnowMelt,
  supreme_court_session:    CardSCSession,
};

// ─────────────────────────────────────────────────────────────────────────────
// Wrapper component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders the artwork for a given card ID.
 *
 * @param {string}  cardId    — cards.json id
 * @param {number}  [width]   — container width in px (default: "100%")
 * @param {number}  [height]  — container height in px (default: "100%")
 * @param {string}  [style]   — extra inline style on the wrapper div
 */
export function CardArtDisplay({ cardId, width, height, style }) {
  // Handle SC case cards: "arizona_v_california" → {plaintiff, defendant}
  if (cardId?.includes('_v_')) {
    const parts = cardId.split('_v_');
    const plaintiffId  = parts[0];
    const defendantId  = parts.slice(1).join('_v_'); // handles multi-underscore names
    return (
      <div style={{ width: width ?? '100%', height: height ?? '100%',
        overflow: 'hidden', ...style }}>
        <SCCaseCard plaintiffId={plaintiffId} defendantId={defendantId} />
      </div>
    );
  }

  const Art = CARD_ART[cardId];
  if (!Art) return null; // no art for this card — render nothing

  return (
    <div style={{ width: width ?? '100%', height: height ?? '100%',
      overflow: 'hidden', ...style }}>
      <Art />
    </div>
  );
}
