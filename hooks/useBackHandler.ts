import { useEffect } from 'react';
import { BackHandler, Alert, Platform } from 'react-native';

export const useBackHandler = (handler?: () => boolean) => {
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const backAction = () => {
      if (handler) {
        return handler();
      }

      // Default behavior: show confirmation dialog
      Alert.alert(
        'Exit App',
        'Are you sure you want to exit?',
        [
          {
            text: 'Cancel',
            onPress: () => null,
            style: 'cancel',
          },
          {
            text: 'Exit',
            onPress: () => BackHandler.exitApp(),
          },
        ],
        { cancelable: false }
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [handler]);
};
