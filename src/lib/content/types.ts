export interface VenueHall {
  no: string;
  title: string;
  titleEn: string;
  stat: string;
  desc: string;
}

export interface VenueSpec {
  name: string;
  rows: [string, string][];
}

export interface VenueAmenity {
  name: string;
  desc: string;
}

export interface VenueContent {
  intro: string;
  overviewIntro: string;
  halls: VenueHall[];
  features: string[];
  specsIntro: string;
  specs: VenueSpec[];
  providedFacilities: string[];
  arenaAmenities: VenueAmenity[];
  mediumHallAmenities: VenueAmenity[];
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
