/**
 * ARENAKORE — Universal Share Helper
 * Handles image sharing across iOS, Android, and Web platforms.
 * 
 * On iOS: Share.share({ url }) works
 * On Android: Share.share does NOT support `url` — use expo-sharing's shareAsync
 * On Web: fallback to download link or window.open
 */
import { Share, Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';

/**
 * Share an image URI with optional text message.
 * Handles platform differences automatically.
 */
export async function shareImageWithText(
  imageUri: string,
  message: string,
  title?: string
): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      // Web: open in new window or download
      if (imageUri.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = imageUri;
        link.download = `ARENAKORE_${Date.now()}.png`;
        link.click();
      } else {
        const w = window.open();
        if (w) w.document.write(`<img src="${imageUri}" style="max-width:100%"/>`);
      }
      return true;
    }

    // Native: Check if expo-sharing is available
    const Sharing = require('expo-sharing');
    const isAvailable = await Sharing.isAvailableAsync();

    if (isAvailable && imageUri) {
      // If imageUri is a file:// path, share directly
      // If it's a data URI or remote, we may need to save it first
      let fileUri = imageUri;

      // If the URI is a data:image URI (base64), save to temp file
      if (imageUri.startsWith('data:')) {
        const base64Data = imageUri.split(',')[1];
        if (base64Data && FileSystem.cacheDirectory) {
          fileUri = `${FileSystem.cacheDirectory}arenakore_share_${Date.now()}.png`;
          await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      }

      // Use expo-sharing for proper image sharing on both iOS and Android
      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/png',
        dialogTitle: title || 'ARENA KORE',
        UTI: 'public.png',
      });
      return true;
    }

    // Fallback: iOS supports url in Share.share, Android falls back to text-only
    if (Platform.OS === 'ios') {
      await Share.share({
        url: imageUri,
        message: message,
        title: title || 'ARENA KORE',
      });
    } else {
      // Android: text-only fallback
      await Share.share({
        message: message,
        title: title || 'ARENA KORE',
      });
    }
    return true;
  } catch (error: any) {
    if (error?.message !== 'User did not share') {
      Alert.alert('Errore', 'Impossibile condividere');
    }
    return false;
  }
}

/**
 * Share text only (no image).
 */
export async function shareText(message: string, title?: string): Promise<boolean> {
  try {
    await Share.share({
      message,
      title: title || 'ARENA KORE',
    });
    return true;
  } catch {
    return false;
  }
}
