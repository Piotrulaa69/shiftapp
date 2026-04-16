import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../styles/theme';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertConfig = {
  title: string;
  message?: string;
  icon?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  buttons?: AlertButton[];
};

type AlertContextType = {
  showAlert: (title: string, message?: string, onOk?: () => void) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel?: string,
    cancelLabel?: string
  ) => void;
  showSuccess: (title: string, message?: string, onOk?: () => void) => void;
  showError: (title: string, message?: string) => void;
  alert: (config: AlertConfig) => void;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

const ICON_MAP = {
  success: { name: 'checkmark-circle' as const, color: theme.colors.green, bg: theme.colors.greenLight },
  error: { name: 'close-circle' as const, color: theme.colors.error, bg: theme.colors.errorLight },
  warning: { name: 'warning' as const, color: theme.colors.orange, bg: theme.colors.orangeLight },
  info: { name: 'information-circle' as const, color: theme.colors.primary, bg: theme.colors.primaryLight },
  confirm: { name: 'help-circle' as const, color: theme.colors.navy, bg: theme.colors.primaryLight },
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({ title: '' });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  const present = useCallback((cfg: AlertConfig) => {
    setConfig(cfg);
    setVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 100, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const dismiss = useCallback((callback?: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      callback?.();
    });
  }, [fadeAnim, scaleAnim]);

  const showAlert = useCallback((title: string, message?: string, onOk?: () => void) => {
    present({
      title,
      message,
      icon: 'info',
      buttons: [{ text: 'OK', onPress: onOk }],
    });
  }, [present]);

  const showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel = 'Potwierdź',
    cancelLabel = 'Anuluj'
  ) => {
    present({
      title,
      message,
      icon: 'confirm',
      buttons: [
        { text: cancelLabel, style: 'cancel' },
        { text: confirmLabel, onPress: onConfirm },
      ],
    });
  }, [present]);

  const showSuccess = useCallback((title: string, message?: string, onOk?: () => void) => {
    present({
      title,
      message,
      icon: 'success',
      buttons: [{ text: 'OK', onPress: onOk }],
    });
  }, [present]);

  const showError = useCallback((title: string, message?: string) => {
    present({
      title,
      message,
      icon: 'error',
      buttons: [{ text: 'OK' }],
    });
  }, [present]);

  const alertFn = useCallback((cfg: AlertConfig) => present(cfg), [present]);

  const iconCfg = config.icon ? ICON_MAP[config.icon] : null;
  const buttons = config.buttons ?? [{ text: 'OK' }];

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, showSuccess, showError, alert: alertFn }}>
      {children}
      <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
        <Animated.View style={[s.overlay, { opacity: fadeAnim }]}>
          <Pressable style={s.overlayPress} onPress={() => dismiss()} />
          <Animated.View style={[s.card, { transform: [{ scale: scaleAnim }] }]}>
            {/* Icon */}
            {iconCfg && (
              <View style={[s.iconWrap, { backgroundColor: iconCfg.bg }]}>
                <Ionicons name={iconCfg.name} size={32} color={iconCfg.color} />
              </View>
            )}

            {/* Title */}
            <Text style={s.title}>{config.title}</Text>

            {/* Message */}
            {config.message ? <Text style={s.message}>{config.message}</Text> : null}

            {/* Buttons */}
            <View style={s.btnRow}>
              {buttons.map((btn, idx) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                const isPrimary = !isCancel && !isDestructive;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      s.btn,
                      buttons.length > 1 && { flex: 1 },
                      isCancel && s.btnCancel,
                      isDestructive && s.btnDestructive,
                      isPrimary && s.btnPrimary,
                    ]}
                    onPress={() => dismiss(btn.onPress)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        s.btnText,
                        isCancel && s.btnTextCancel,
                        isDestructive && s.btnTextDestructive,
                        isPrimary && s.btnTextPrimary,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </AlertContext.Provider>
  );
};

export const useAlert = (): AlertContextType => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within AlertProvider');
  return ctx;
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayPress: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    ...theme.shadows.card,
    shadowRadius: 30,
    shadowOpacity: 0.15,
    elevation: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btn: {
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  btnPrimary: {
    backgroundColor: theme.colors.navy,
  },
  btnCancel: {
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  btnDestructive: {
    backgroundColor: theme.colors.error,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  btnTextPrimary: {
    color: theme.colors.white,
  },
  btnTextCancel: {
    color: theme.colors.textSecondary,
  },
  btnTextDestructive: {
    color: theme.colors.white,
  },
});
