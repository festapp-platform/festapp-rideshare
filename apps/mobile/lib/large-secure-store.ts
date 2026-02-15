/**
 * LargeSecureStore - AES-encrypted session storage adapter for Supabase.
 *
 * expo-secure-store has a 2048-byte limit which is too small for OAuth sessions
 * (Google tokens are large). This adapter stores the AES encryption key in
 * SecureStore (small, within limit) and the encrypted data in AsyncStorage
 * (unlimited size).
 *
 * Implements the Supabase StorageAdapter interface (getItem, setItem, removeItem).
 */
import "react-native-get-random-values";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as aesjs from "aes-js";

export class LargeSecureStore {
  private async _encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));

    const cipher = new aesjs.ModeOfOperation.ctr(
      encryptionKey,
      new aesjs.Counter(1),
    );
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    // Store the encryption key in SecureStore (small, fits within 2048-byte limit)
    await SecureStore.setItemAsync(
      key,
      aesjs.utils.hex.fromBytes(encryptionKey),
    );

    // Return encrypted data to be stored in AsyncStorage
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async _decrypt(
    key: string,
    value: string,
  ): Promise<string | null> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) {
      return null;
    }

    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1),
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));

    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) {
      return null;
    }
    return await this._decrypt(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this._encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }
}
