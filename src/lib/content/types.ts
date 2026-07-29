export interface VenueHall {
  no: string;
  title: string;
  titleEn: string;
  stat: string;
  desc: string;
  image: string | null;
}

export interface VenueSpec {
  name: string;
  rows: [string, string][];
  image: string | null;
}

export interface VenueAmenity {
  name: string;
  desc: string;
}

export interface VenueKeyMap {
  url: string;
  label: string;
}

export interface VenueHighlightCard {
  title: string;
  desc: string;
  image: string | null;
}

export interface VenueHighlight {
  badges: string[];
  highlightBadge: string;
  title: string;
  subtitle: string;
  cards: VenueHighlightCard[];
}

export interface VenueContent {
  intro: string;
  overviewIntro: string;
  halls: VenueHall[];
  features: string[];
  specsIntro: string;
  specs: VenueSpec[];
  specHighlights: VenueHighlight[];
  providedFacilities: string[];
  arenaAmenities: VenueAmenity[];
  mediumHallAmenities: VenueAmenity[];
  keyMaps: VenueKeyMap[];
}

export interface GuideStep {
  no: string;
  title: string;
  desc: string;
}

export interface GuideContent {
  intro: string;
  steps: GuideStep[];
  notices: string[];
  packageIntro: string;
  packageBullets: string[];
  rulesIntro: string;
}
