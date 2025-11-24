import 'react-native';

declare module 'react-native' {
  interface NativeModulesStatic {
    DirectCallModule?: {
      startDirectCall(phoneNumber: string): Promise<boolean>;
    };
  }
}
import type {NativeModulesStatic} from 'react-native';

interface SmsModuleType {
  sendDirectSms(phone: string, message: string): Promise<boolean>;
}

declare module 'react-native' {
  interface NativeModulesStatic {
    SmsModule?: SmsModuleType;
  }
}


