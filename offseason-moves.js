// PuckLab offseason snapshot: confirmed moves through 2026-09-08.
// Movement review: 2026-09-10.
//
// Includes only skaters with at least 10 NHL regular-season
// games played in 2025-26.
//
// Excludes goalies, renewals, unresolved free agents and
// players who do not meet the games-played requirement.
//
// Multiple offseason moves are combined into one net move.
// This list needs manual updates when further moves are confirmed.

const referenceSources = [
  "https://www.nhl.com/news/topic/trade-coverage/2025-26-nhl-trades",
  "https://www.nhl.com/news/topic/trade-coverage/2026-27-nhl-trades",
  "https://www.nhl.com/news/topic/free-agency/free-agency-signings-nhl-2026-27"
];

function reviewed(added, lost) {
  const sources = [...referenceSources];

  // The Islanders' announcement resolves a destination typo
  // for Mitchell Chaffee in the free-agent tracker.
  if (added.includes(8482070) || lost.includes(8482070)) {
    sources.push(
      "https://www.nhl.com/islanders/news/islanders-sign-chaffee"
    );
  }

  return {
    asOf: "2026-09-10",
    snapshotDate: "2026-09-08",
    qualifyingOnly: true,
    added,
    lost,
    sources
  };
}

export const moves = {
  ANA: reviewed(
    [8475324, 8478421, 8482408],
    [8474590, 8475462, 8476885, 8477527, 8478424, 8479705, 8482745, 8482803]
  ),

  BOS: reviewed(
    [8476867, 8477365, 8478840, 8482175, 8483531],
    [8478042, 8479369]
  ),

  BUF: reviewed(
    [8477839, 8481806, 8482803],
    [8474568, 8477949, 8478413, 8480891, 8481524, 8482623]
  ),

  CAR: reviewed(
    [8480058],
    [8481491]
  ),

  CBJ: reviewed(
    [8477501, 8478841, 8479066],
    [8476432, 8476867, 8478975, 8479944, 8481178]
  ),

  CGY: reviewed(
    [8478136, 8480259, 8482107, 8483495, 8484958],
    [8476399, 8476874, 8477993, 8478109, 8479066, 8481556]
  ),

  CHI: reviewed(
    [8474013, 8474141, 8478413, 8481524, 8482062],
    [8477444, 8478043, 8481624, 8481806]
  ),

  COL: reviewed(
    [8475768, 8476994, 8478454, 8482742, 8482768],
    [8477501, 8479525, 8480835, 8481641, 8482072, 8482947]
  ),

  DAL: reviewed(
    [8481641],
    [8475755, 8480950, 8481609, 8482145]
  ),

  DET: reviewed(
    [8478042, 8478434, 8480196],
    [8474141]
  ),

  EDM: reviewed(
    [8478472, 8478854, 8482166],
    [8477498, 8478458]
  ),

  FLA: reviewed(
    [8474189, 8475462, 8475755, 8477903, 8478043, 8480801, 8481556],
    [8476994, 8477931, 8478421, 8478542, 8479393, 8480003, 8480021, 8481518, 8482107, 8482713]
  ),

  LAK: reviewed(
    [8470621, 8475287, 8475692],
    [8471685, 8478472, 8479421, 8482408, 8483808]
  ),

  MIN: reviewed(
    [8476399, 8476874, 8477993, 8485702],
    [8475149, 8475692, 8478136, 8480259]
  ),

  MTL: reviewed(
    [8482132],
    [8475848, 8478104, 8480813]
  ),

  NJD: reviewed(
    [8477511, 8478542, 8480003, 8480990, 8481609, 8482146],
    [8478841, 8479395, 8481032, 8483495, 8483531, 8484958]
  ),

  NSH: reviewed(
    [8477021, 8479525, 8480835, 8480950, 8481535, 8481726, 8482072, 8482145],
    [8475287, 8482146, 8482742, 8482768]
  ),

  NYI: reviewed(
    [8481711, 8482070, 8482516],
    [8475314, 8483553, 8485702]
  ),

  NYR: reviewed(
    [8477416, 8477969, 8479395, 8480009, 8480434, 8480813, 8481604],
    [8476389, 8477380, 8477839, 8478840, 8481726, 8482132]
  ),

  OTT: reviewed(
    [8477444, 8478104, 8482667],
    [8474189, 8475324, 8480801, 8481575]
  ),

  PHI: reviewed(
    [8478569, 8479944, 8480021, 8481122, 8481518],
    [8477903, 8478454, 8479022, 8482126]
  ),

  PIT: reviewed(
    [8477845, 8481527, 8481582, 8482148, 8483398, 8483808],
    [8475763, 8477365, 8477511, 8478450, 8478569, 8478854, 8479533, 8481030]
  ),

  SEA: reviewed(
    [8480876, 8482713],
    [8475768, 8476467, 8480009]
  ),

  SJS: reviewed(
    [8476885, 8477498, 8478975, 8480891],
    [8479576, 8479983, 8482166, 8482667]
  ),

  STL: reviewed(
    [8477527, 8478443, 8481580, 8482745],
    [8479385, 8482516]
  ),

  TBL: reviewed(
    [8474590, 8478424, 8479705, 8481624],
    [8470621, 8477416, 8477426, 8478178, 8482070, 8483398]
  ),

  TOR: reviewed(
    [8476925, 8476927, 8477426, 8478178, 8478458, 8479520, 8482126],
    [8475714, 8478443, 8481122, 8481582, 8481711]
  ),

  UTA: reviewed(
    [8475314, 8476389, 8479369],
    [8474013, 8477021, 8480434, 8482175]
  ),

  VAN: reviewed(
    [8474568, 8475848, 8476467, 8481032],
    [8476927, 8477969, 8480058, 8480876, 8481535]
  ),

  VGK: reviewed(
    [8478109, 8478450, 8483553],
    [8476925, 8478434, 8481527, 8481604, 8482062]
  ),

  WPG: reviewed(
    [8479393, 8479983, 8481030],
    [8473604, 8476525, 8480196]
  ),

  WSH: reviewed(
    [8476432, 8477380, 8477949, 8479385, 8479576, 8482623],
    [8477845, 8477947, 8479520, 8480144, 8480990, 8481580, 8482148]
  )
};

export const teamNames = {
  ANA: "Anaheim Ducks",
  BOS: "Boston Bruins",
  BUF: "Buffalo Sabres",
  CAR: "Carolina Hurricanes",
  CBJ: "Columbus Blue Jackets",
  CGY: "Calgary Flames",
  CHI: "Chicago Blackhawks",
  COL: "Colorado Avalanche",
  DAL: "Dallas Stars",
  DET: "Detroit Red Wings",
  EDM: "Edmonton Oilers",
  FLA: "Florida Panthers",
  LAK: "Los Angeles Kings",
  MIN: "Minnesota Wild",
  MTL: "Montréal Canadiens",
  NJD: "New Jersey Devils",
  NSH: "Nashville Predators",
  NYI: "New York Islanders",
  NYR: "New York Rangers",
  OTT: "Ottawa Senators",
  PHI: "Philadelphia Flyers",
  PIT: "Pittsburgh Penguins",
  SEA: "Seattle Kraken",
  SJS: "San Jose Sharks",
  STL: "St. Louis Blues",
  TBL: "Tampa Bay Lightning",
  TOR: "Toronto Maple Leafs",
  UTA: "Utah Mammoth",
  VAN: "Vancouver Canucks",
  VGK: "Vegas Golden Knights",
  WPG: "Winnipeg Jets",
  WSH: "Washington Capitals"
};
