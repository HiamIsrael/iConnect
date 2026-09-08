import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Login: undefined;
  Signup: undefined;
  MusicianProfile: { id: string };
  GigDetail: { id: string };
  BandDetail: { id: string };
  VenueDetail: { id: string };
  Bands: undefined;
  Venues: undefined;
  Messages: { to?: string } | undefined;
  Availability: undefined;
  Epk: { id: string };
  Notifications: undefined;
  Admin: undefined;
};

export type TabParamList = {
  Home: undefined;
  Musicians: undefined;
  Gigs: undefined;
  Community: undefined;
  Profile: undefined;
};
