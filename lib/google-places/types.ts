export type SelectedGooglePlace = {
  placeId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  county: string | null;
  locality: string | null;
  neighborhood: string | null;
  sublocality: string | null;
  sublocalityLevel1: string | null;
  sublocalityLevel2: string | null;
  adminAreaLevel2: string | null;
};

export type PlacesPrediction = {
  placeId: string;
  label: string;
  secondary: string;
};
