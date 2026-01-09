import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  ForgotPassword: undefined;
};

export type MainStackParamList = {
  Dashboard: undefined;
  AlertResponse: { alert: any };
  Alerts: { filter?: string } | undefined;
  GeofenceArea: undefined;
  Broadcast: undefined;
  Profile: undefined;
  LeafletMap: { enableSelection?: boolean; onAreaSelected?: (area: any) => void } | undefined;
};

export type DrawerParamList = {
  Home: undefined;
  Profile: undefined;
  Alerts: { filter?: string } | undefined;
  GeofenceArea: undefined;
  Broadcast: undefined;
};