const build = Number(process.env.GITHUB_RUN_NUMBER || 1);

module.exports = {
  expo: {
    name: 'Layer',
    slug: 'layer',
    version: `1.0.${build}`,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    backgroundColor: '#090B10',
    android: {
      package: 'pro.halim.layer',
      versionCode: build,
      adaptiveIcon: {
        backgroundColor: '#090B10',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'POST_NOTIFICATIONS'],
      blockedPermissions: [
        'ACCESS_BACKGROUND_LOCATION',
        'SYSTEM_ALERT_WINDOW',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
      ],
    },
    plugins: [
      [
        'expo-build-properties',
        {
          android: {
            extraProguardRules: [
              '-keep class androidx.work.** { *; }',
              '-keep class * extends androidx.room.RoomDatabase { *; }',
              '-keepnames class * extends androidx.room.RoomDatabase',
              '-keep class **_Impl { *; }',
            ].join('\n'),
          },
        },
      ],
      'expo-sqlite',
      'expo-font',
      'expo-background-task',
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'Layer uses your location once to save where home is.',
          isAndroidBackgroundLocationEnabled: false,
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/android-icon-monochrome.png',
          color: '#F2A65A',
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#090B10',
        },
      ],
    ],
  },
};
