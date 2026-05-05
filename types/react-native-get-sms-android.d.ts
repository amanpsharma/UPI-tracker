declare module 'react-native-get-sms-android' {
  interface SmsAndroidModule {
    list(
      filter: string,
      onFailure: (error: string) => void,
      onSuccess: (count: number, smsList: string) => void
    ): void;
  }

  // package uses module.exports = NativeModules.Sms (CommonJS, no default export)
  const SmsAndroid: SmsAndroidModule;
  export = SmsAndroid;
}
