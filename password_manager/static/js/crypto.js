/**
 * Client-side encryption utilities using Web Crypto API
 * Implements zero-knowledge encryption for password manager
 */

class CryptoManager {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12;
        this.saltLength = 32;
        this.iterations = 100000; // PBKDF2 iterations
    }

    /**
     * Generate a random salt
     */
    generateSalt() {
        return window.crypto.getRandomValues(new Uint8Array(this.saltLength));
    }

    /**
     * Generate a random IV (Initialization Vector)
     */
    generateIV() {
        return window.crypto.getRandomValues(new Uint8Array(this.ivLength));
    }

    /**
     * Convert array buffer to base64 string
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Convert base64 string to array buffer
     */
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Derive encryption key from master password using PBKDF2
     */
    async deriveKey(masterPassword, salt) {
        try {
            // Import the master password as a key
            const keyMaterial = await window.crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(masterPassword),
                { name: 'PBKDF2' },
                false,
                ['deriveBits', 'deriveKey']
            );

            // Derive the actual encryption key
            const key = await window.crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: this.iterations,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: this.algorithm, length: this.keyLength },
                false,
                ['encrypt', 'decrypt']
            );

            return key;
        } catch (error) {
            console.error('Key derivation failed:', error);
            throw new Error('Failed to derive encryption key');
        }
    }

    /**
     * Encrypt password using AES-GCM
     */
    async encryptPassword(password, masterPassword, userSalt) {
        try {
            // Generate salt and IV for this specific password
            const salt = this.generateSalt();
            const iv = this.generateIV();

            // Combine user salt with password-specific salt
            const combinedSalt = new Uint8Array(userSalt.length + salt.length);
            combinedSalt.set(new Uint8Array(this.base64ToArrayBuffer(userSalt)));
            combinedSalt.set(salt, userSalt.length);

            // Derive key from master password
            const key = await this.deriveKey(masterPassword, combinedSalt);

            // Encrypt the password
            const encryptedData = await window.crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                new TextEncoder().encode(password)
            );

            return {
                encryptedPassword: this.arrayBufferToBase64(encryptedData),
                salt: this.arrayBufferToBase64(salt),
                iv: this.arrayBufferToBase64(iv)
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt password');
        }
    }

    /**
     * Decrypt password using AES-GCM
     */
    async decryptPassword(encryptedData, masterPassword, userSalt) {
        try {
            const { encryptedPassword, salt, iv } = encryptedData;

            // Convert base64 strings back to array buffers
            const saltBuffer = this.base64ToArrayBuffer(salt);
            const ivBuffer = this.base64ToArrayBuffer(iv);
            const encryptedBuffer = this.base64ToArrayBuffer(encryptedPassword);

            // Combine user salt with password-specific salt
            const combinedSalt = new Uint8Array(userSalt.length + saltBuffer.byteLength);
            combinedSalt.set(new Uint8Array(this.base64ToArrayBuffer(userSalt)));
            combinedSalt.set(new Uint8Array(saltBuffer), userSalt.length);

            // Derive key from master password
            const key = await this.deriveKey(masterPassword, combinedSalt);

            // Decrypt the password
            const decryptedData = await window.crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: ivBuffer
                },
                key,
                encryptedBuffer
            );

            return new TextDecoder().decode(decryptedData);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt password - incorrect master password?');
        }
    }

    /**
     * Hash master password for server verification (not used for encryption)
     */
    async hashMasterPassword(masterPassword, salt) {
        try {
            const keyMaterial = await window.crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(masterPassword),
                { name: 'PBKDF2' },
                false,
                ['deriveBits']
            );

            const derivedBits = await window.crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: this.base64ToArrayBuffer(salt),
                    iterations: this.iterations,
                    hash: 'SHA-256'
                },
                keyMaterial,
                256
            );

            return this.arrayBufferToBase64(derivedBits);
        } catch (error) {
            console.error('Master password hashing failed:', error);
            throw new Error('Failed to hash master password');
        }
    }

    /**
     * Verify if master password is correct by attempting to decrypt a test value
     */
    async verifyMasterPassword(masterPassword, userSalt, testEncryptedData) {
        try {
            await this.decryptPassword(testEncryptedData, masterPassword, userSalt);
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Create global instance
window.cryptoManager = new CryptoManager();

// Utility function to show loading state
function showLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'block';
    }
}

function hideLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

// Utility function to show toast messages
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `message message-${type}`;
    toast.innerHTML = `
        <i class="fas fa-info-circle"></i>
        <span>${message}</span>
        <button class="message-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Find messages container or create one
    let messagesContainer = document.querySelector('.messages');
    if (!messagesContainer) {
        messagesContainer = document.createElement('div');
        messagesContainer.className = 'messages';
        document.querySelector('.main-content').prepend(messagesContainer);
    }

    messagesContainer.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CryptoManager;
}
