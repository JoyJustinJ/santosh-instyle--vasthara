import { NativeBiometric } from '@capgo/capacitor-native-biometric';

export const checkBiometricAvailability = async () => {
    try {
        const result = await NativeBiometric.isAvailable();
        return result.isAvailable;
    } catch {
        return false;
    }
};

export const biometricSupported = checkBiometricAvailability;

export const getBiometricCredentialKey = (userId?: string) => {
    return `vastra_biometric_enabled_${userId || 'default'}`;
};

export const getStoredBiometricCredentialId = (userId?: string) => {
    return localStorage.getItem(getBiometricCredentialKey(userId)) || localStorage.getItem('vastra_biometric_credId');
};

export const storeBiometricCredentialId = (credentialId: string, userId?: string) => {
    localStorage.setItem(getBiometricCredentialKey(userId), 'true');
    localStorage.setItem('vastra_biometric_credId', 'true');
};

export const verifyBiometric = async (): Promise<boolean> => {
    try {
        await NativeBiometric.verifyIdentity({
            reason: "Verify your identity to log in",
            title: "Log In",
            subtitle: "Use your fingerprint or face to continue"
        });
        return true;
    } catch {
        return false;
    }
};
