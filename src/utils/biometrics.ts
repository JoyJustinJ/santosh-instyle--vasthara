/**
 * WebAuthn Biometric Utilities for Vasthara
 * Optimized for APK/WebView and standard WebAuthn API
 */

export const biometricSupported = () => {
    return !!(
        window.PublicKeyCredential &&
        window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
    );
};

export const checkBiometricAvailability = async () => {
    if (!biometricSupported()) return false;
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
};

export const generateChallenge = () => {
    return new Uint8Array(32).map(() => Math.floor(Math.random() * 256));
};

/**
 * Converts a buffer to a base64url string (safe for WebAuthn credential IDs)
 */
export const bufferToBase64url = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(b => (binary += String.fromCharCode(b)));
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

/**
 * Converts a base64url string back to a buffer
 */
export const base64urlToBuffer = (base64url: string): ArrayBuffer => {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return buffer;
};

