import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert — uses window.alert on web, native Alert on mobile.
 */
export function showAlert(title: string, message?: string, onOk?: () => void) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n${message}` : title);
    onOk?.();
  } else {
    Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
  }
}

/**
 * Cross-platform confirm — uses window.confirm on web, native Alert on mobile.
 */
export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'OK',
  cancelLabel = 'Anuluj'
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel' },
      { text: confirmLabel, onPress: onConfirm },
    ]);
  }
}
