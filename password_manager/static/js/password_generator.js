/**
 * Password generation and strength calculation utilities
 */

class PasswordGenerator {
    constructor() {
        this.charset = {
            lowercase: 'abcdefghijklmnopqrstuvwxyz',
            uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            numbers: '0123456789',
            symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
        };
    }

    /**
     * Generate a secure random password
     */
    generatePassword(options = {}) {
        const {
            length = 16,
            includeUppercase = true,
            includeLowercase = true,
            includeNumbers = true,
            includeSymbols = true
        } = options;

        if (length < 4) {
            throw new Error('Password length must be at least 4 characters');
        }

        let charset = '';
        let requiredChars = [];

        if (includeLowercase) {
            charset += this.charset.lowercase;
            requiredChars.push(this.getRandomChar(this.charset.lowercase));
        }

        if (includeUppercase) {
            charset += this.charset.uppercase;
            requiredChars.push(this.getRandomChar(this.charset.uppercase));
        }

        if (includeNumbers) {
            charset += this.charset.numbers;
            requiredChars.push(this.getRandomChar(this.charset.numbers));
        }

        if (includeSymbols) {
            charset += this.charset.symbols;
            requiredChars.push(this.getRandomChar(this.charset.symbols));
        }

        if (charset === '') {
            throw new Error('At least one character type must be selected');
        }

        // Generate remaining random characters
        const remainingLength = length - requiredChars.length;
        for (let i = 0; i < remainingLength; i++) {
            requiredChars.push(this.getRandomChar(charset));
        }

        // Shuffle the array to avoid predictable patterns
        return this.shuffleArray(requiredChars).join('');
    }

    /**
     * Get a cryptographically secure random character from charset
     */
    getRandomChar(charset) {
        const array = new Uint8Array(1);
        let char;
        
        do {
            window.crypto.getRandomValues(array);
            char = charset[array[0] % charset.length];
        } while (!char);
        
        return char;
    }

    /**
     * Shuffle array using Fisher-Yates algorithm with crypto.getRandomValues
     */
    shuffleArray(array) {
        const shuffled = [...array];
        
        for (let i = shuffled.length - 1; i > 0; i--) {
            const randomArray = new Uint8Array(1);
            window.crypto.getRandomValues(randomArray);
            const j = randomArray[0] % (i + 1);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        return shuffled;
    }

    /**
     * Calculate password strength score (0-4)
     */
    calculateStrength(password) {
        if (!password) return 0;

        let score = 0;
        const length = password.length;

        // Length scoring
        if (length >= 8) score++;
        if (length >= 12) score++;
        if (length >= 16) score++;

        // Character variety scoring
        const hasLowercase = /[a-z]/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSymbols = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);

        const varietyCount = [hasLowercase, hasUppercase, hasNumbers, hasSymbols]
            .filter(Boolean).length;

        if (varietyCount >= 2) score++;
        if (varietyCount >= 3) score++;
        if (varietyCount >= 4) score++;

        // Penalty for common patterns
        if (this.hasCommonPatterns(password)) {
            score = Math.max(0, score - 1);
        }

        // Entropy bonus for very long passwords
        if (length >= 20) score++;

        return Math.min(4, score);
    }

    /**
     * Check for common password patterns
     */
    hasCommonPatterns(password) {
        const commonPatterns = [
            /123/,
            /abc/i,
            /qwerty/i,
            /password/i,
            /admin/i,
            /(.)\1{2,}/, // Repeated characters
            /012|234|345|456|567|678|789/, // Sequential numbers
        ];

        return commonPatterns.some(pattern => pattern.test(password));
    }

    /**
     * Get strength label and class
     */
    getStrengthInfo(score) {
        const strengthLevels = [
            { label: 'Very Weak', class: 'strength-very-weak' },
            { label: 'Weak', class: 'strength-weak' },
            { label: 'Fair', class: 'strength-fair' },
            { label: 'Good', class: 'strength-good' },
            { label: 'Strong', class: 'strength-strong' }
        ];

        return strengthLevels[score] || strengthLevels[0];
    }
}

// Create global instance
window.passwordGenerator = new PasswordGenerator();

/**
 * Update password strength indicator in the UI
 */
function updatePasswordStrength(strengthElement, password) {
    const score = window.passwordGenerator.calculateStrength(password);
    const strengthInfo = window.passwordGenerator.getStrengthInfo(score);
    
    // Remove existing strength classes
    strengthElement.className = 'password-strength';
    
    if (password) {
        strengthElement.classList.add(strengthInfo.class);
        const textElement = strengthElement.querySelector('.strength-text');
        if (textElement) {
            textElement.textContent = strengthInfo.label;
        }
    } else {
        const textElement = strengthElement.querySelector('.strength-text');
        if (textElement) {
            textElement.textContent = 'Password strength';
        }
    }
}

/**
 * Calculate password strength (helper function for external use)
 */
function calculatePasswordStrength(password) {
    return window.passwordGenerator.calculateStrength(password);
}

/**
 * Generate password with current generator settings
 */
function generatePasswordWithSettings() {
    const lengthSlider = document.getElementById('lengthSlider');
    const includeUppercase = document.getElementById('includeUppercase');
    const includeLowercase = document.getElementById('includeLowercase');
    const includeNumbers = document.getElementById('includeNumbers');
    const includeSymbols = document.getElementById('includeSymbols');

    if (!lengthSlider) return '';

    const options = {
        length: parseInt(lengthSlider.value) || 16,
        includeUppercase: includeUppercase ? includeUppercase.checked : true,
        includeLowercase: includeLowercase ? includeLowercase.checked : true,
        includeNumbers: includeNumbers ? includeNumbers.checked : true,
        includeSymbols: includeSymbols ? includeSymbols.checked : true
    };

    try {
        return window.passwordGenerator.generatePassword(options);
    } catch (error) {
        console.error('Password generation failed:', error);
        showToast('Password generation failed: ' + error.message, 'error');
        return '';
    }
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        await navigator.clipboard.writeText(element.value);
        showToast('Copied to clipboard!', 'success');
    } catch (error) {
        // Fallback for older browsers
        element.select();
        element.setSelectionRange(0, 99999);
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard!', 'success');
        } catch (fallbackError) {
            console.error('Copy failed:', fallbackError);
            showToast('Failed to copy to clipboard', 'error');
        }
    }
}

/**
 * Toggle password visibility
 */
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling?.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) {
            icon.className = 'fas fa-eye-slash';
        }
    } else {
        input.type = 'password';
        if (icon) {
            icon.className = 'fas fa-eye';
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PasswordGenerator;
}
