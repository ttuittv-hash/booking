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
  image: string | null;
  featured: boolean;
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
  amenityGallery: VenueKeyMap[];
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

export interface HomeFeature {
  title: string;
  desc: string;
  href: string;
  image: string | null;
}

export interface HomeProcessStep {
  no: string;
  title: string;
  desc: string;
}

export interface HomeContent {
  heroImage: string | null;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryLabel: string;
  heroPrimaryHref: string;
  heroSecondaryLabel: string;
  heroSecondaryHref: string;
  missionLabel: string;
  mission: string;
  visionLabel: string;
  vision: string;
  featuresLabel: string;
  featuresTitle: string;
  features: HomeFeature[];
  processLabel: string;
  processTitle: string;
  processSteps: HomeProcessStep[];
}
