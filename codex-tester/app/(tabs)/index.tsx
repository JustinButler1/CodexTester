import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    scannedUserId?: string | string[];
    scannedDisplayName?: string | string[];
  }>();
  const [isQrVisible, setIsQrVisible] = useState(false);
  const [showScanBanner, setShowScanBanner] = useState(false);
  const gamesLink = useMemo(() => Linking.createURL('/games'), []);
  const scannedUserId = Array.isArray(params.scannedUserId)
    ? params.scannedUserId[0]
    : params.scannedUserId;
  const scannedDisplayName = Array.isArray(params.scannedDisplayName)
    ? params.scannedDisplayName[0]
    : params.scannedDisplayName;

  useEffect(() => {
    if (scannedUserId && scannedDisplayName) {
      setShowScanBanner(true);
      return;
    }
    setShowScanBanner(false);
  }, [scannedUserId, scannedDisplayName]);

  const handleCloseModal = () => setIsQrVisible(false);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 48 },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.badge}>Instant Invite</Text>
          <Text style={styles.heading}>Share your games hub</Text>
          <Text style={styles.subheading}>
            Generate a QR code that jumps friends straight to the Games tab.
          </Text>
          {showScanBanner && scannedDisplayName && scannedUserId ? (
            <View style={styles.scanBanner}>
              <View>
                <Text style={styles.scanBannerTitle}>Profile scanned</Text>
                <Text style={styles.scanBannerBody}>
                  {scannedDisplayName} ({scannedUserId})
                </Text>
              </View>
              <TouchableOpacity style={styles.scanBannerClose} onPress={() => setShowScanBanner(false)}>
                <Text style={styles.scanBannerCloseLabel}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => setIsQrVisible(true)}
        >
          <Text style={styles.primaryButtonLabel}>Generate Games QR</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isQrVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan to open Games</Text>
              <Text style={styles.modalSubtitle}>
                Aim your camera at the code to launch the Games hub instantly.
              </Text>
            </View>
            <View style={styles.qrContainer}>
              <QRCode
                value={gamesLink}
                size={220}
                color={Colors.dark.textPrimary}
                backgroundColor="transparent"
              />
            </View>
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.85}
              onPress={handleCloseModal}
            >
              <Text style={styles.secondaryButtonLabel}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: 16,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.dark.surface,
    color: Colors.dark.textSecondary,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  heading: {
    textAlign: 'center',
    color: Colors.dark.textPrimary,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  subheading: {
    textAlign: 'center',
    color: Colors.dark.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  scanBanner: {
    marginTop: 20,
    width: '100%',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#221D2E',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  scanBannerTitle: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  scanBannerBody: {
    color: Colors.dark.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  scanBannerClose: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.dark.accent,
  },
  scanBannerCloseLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
    width: '100%',
    maxWidth: 420,
    marginBottom: 12,
    borderRadius: 16,
    paddingVertical: 18,
    backgroundColor: Colors.dark.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.36,
    shadowRadius: 24,
    elevation: 6,
  },
  primaryButtonLabel: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 3, 8, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: Colors.dark.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    gap: 28,
  },
  modalHeader: {
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    textAlign: 'center',
    color: Colors.dark.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    textAlign: 'center',
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  qrContainer: {
    alignItems: 'center',
  },
  secondaryButton: {
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: Colors.dark.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  secondaryButtonLabel: {
    color: Colors.dark.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
