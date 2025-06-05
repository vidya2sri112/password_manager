/**
 * Main application JavaScript
 * Handles dashboard functionality, password management, and UI interactions
 */

// Global variables
let currentMasterPassword = '';
let sessionTimer = 300; // 5 minutes in seconds
let timerInterval = null;
let passwords = [];

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupEventListeners();
    startSessionTimer();
});

/**
 * Initialize dashboard functionality
 */
async function initializeDashboard() {
    if (!window.userSalt) {
        console.error('User salt not available');
        return;
    }

    // Prompt for master password on page load
    await promptForMasterPassword();
    
    // Load and display passwords
    await loadPasswords();
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterPasswords);
    }

    // Password generator length slider
    const lengthSlider = document.getElementById('lengthSlider');
    const lengthValue = document.getElementById('lengthValue');
    if (lengthSlider && lengthValue) {
        lengthSlider.addEventListener('input', function() {
            lengthValue.textContent = this.value;
        });
    }

    // Add password form submission
    const addPasswordForm = document.getElementById('addPasswordForm');
    if (addPasswordForm) {
        addPasswordForm.addEventListener('submit', handleAddPassword);
    }

    // Close modals when clicking outside
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            hideAllModals();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            hideAllModals();
        }
    });
}

/**
 * Prompt user for master password
 */
async function promptForMasterPassword() {
    return new Promise((resolve) => {
        const password = prompt('Enter your master password to decrypt your passwords:');
        if (password) {
            currentMasterPassword = password;
            resolve(password);
        } else {
            // Redirect to logout if no password provided
            window.location.href = '/logout/';
        }
    });
}

/**
 * Start session timer for auto-lock
 */
function startSessionTimer() {
    const timerElement = document.getElementById('sessionTimer');
    if (!timerElement) return;

    timerInterval = setInterval(() => {
        sessionTimer--;
        
        const minutes = Math.floor(sessionTimer / 60);
        const seconds = sessionTimer % 60;
        timerElement.textContent = `Session expires in: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (sessionTimer <= 0) {
            clearInterval(timerInterval);
            autoLockSession();
        }
    }, 1000);

    // Reset timer on user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetSessionTimer, { passive: true });
    });
}

/**
 * Reset session timer on user activity
 */
function resetSessionTimer() {
    sessionTimer = 300; // Reset to 5 minutes
}

/**
 * Auto-lock session when timer expires
 */
function autoLockSession() {
    currentMasterPassword = '';
    passwords = [];
    showToast('Session expired. Please log in again.', 'warning');
    window.location.href = '/logout/';
}

/**
 * Load passwords from server
 */
async function loadPasswords() {
    try {
        showLoading();
        
        const response = await fetch('/api/get-passwords/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            }
        });

        const data = await response.json();
        
        if (data.success) {
            passwords = data.passwords;
            await displayPasswords(passwords);
        } else {
            showToast('Failed to load passwords: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error loading passwords:', error);
        showToast('Failed to load passwords', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Display passwords in the grid
 */
async function displayPasswords(passwordList) {
    const grid = document.getElementById('passwordsGrid');
    if (!grid) return;

    if (passwordList.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-key" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <h3>No passwords yet</h3>
                <p>Click "Add Password" to store your first password securely.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = '';

    for (const passwordEntry of passwordList) {
        const card = await createPasswordCard(passwordEntry);
        grid.appendChild(card);
    }
}

/**
 * Create a password card element
 */
async function createPasswordCard(passwordEntry) {
    const card = document.createElement('div');
    card.className = 'password-card';
    card.dataset.id = passwordEntry.id;

    let decryptedPassword = '';
    try {
        decryptedPassword = await window.cryptoManager.decryptPassword(
            {
                encryptedPassword: passwordEntry.encrypted_password,
                salt: passwordEntry.salt,
                iv: passwordEntry.iv
            },
            currentMasterPassword,
            window.userSalt
        );
    } catch (error) {
        console.error('Failed to decrypt password:', error);
        decryptedPassword = '[Decryption Failed]';
    }

    const updatedDate = new Date(passwordEntry.updated_at).toLocaleDateString();

    card.innerHTML = `
        <div class="password-header">
            <div>
                <div class="password-title">${escapeHtml(passwordEntry.website)}</div>
                <div class="password-username">${escapeHtml(passwordEntry.username)}</div>
            </div>
            <div class="password-actions">
                <button class="btn-icon" onclick="copyPasswordToClipboard(${passwordEntry.id})" title="Copy password">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn-icon" onclick="deletePassword(${passwordEntry.id})" title="Delete password">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="password-meta">
            <span>Updated: ${updatedDate}</span>
            <span class="password-strength strength-${getPasswordStrengthClass(decryptedPassword)}">
                ${getPasswordStrengthLabel(decryptedPassword)}
            </span>
        </div>
    `;

    // Store decrypted password in dataset for copying
    card.dataset.decryptedPassword = decryptedPassword;

    return card;
}

/**
 * Get password strength class for styling
 */
function getPasswordStrengthClass(password) {
    const score = window.passwordGenerator.calculateStrength(password);
    const classes = ['very-weak', 'weak', 'fair', 'good', 'strong'];
    return classes[score] || 'very-weak';
}

/**
 * Get password strength label
 */
function getPasswordStrengthLabel(password) {
    const score = window.passwordGenerator.calculateStrength(password);
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return labels[score] || 'Very Weak';
}

/**
 * Filter passwords based on search input
 */
function filterPasswords() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredPasswords = passwords.filter(password => 
        password.website.toLowerCase().includes(searchTerm) ||
        password.username.toLowerCase().includes(searchTerm)
    );
    displayPasswords(filteredPasswords);
}

/**
 * Copy password to clipboard
 */
async function copyPasswordToClipboard(passwordId) {
    const card = document.querySelector(`[data-id="${passwordId}"]`);
    if (!card) return;

    const decryptedPassword = card.dataset.decryptedPassword;
    if (!decryptedPassword || decryptedPassword === '[Decryption Failed]') {
        showToast('Cannot copy - password decryption failed', 'error');
        return;
    }

    try {
        await navigator.clipboard.writeText(decryptedPassword);
        showToast('Password copied to clipboard!', 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('Failed to copy password', 'error');
    }
}

/**
 * Delete password
 */
async function deletePassword(passwordId) {
    if (!confirm('Are you sure you want to delete this password?')) {
        return;
    }

    try {
        showLoading();

        const response = await fetch(`/api/delete-password/${passwordId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            }
        });

        const data = await response.json();

        if (data.success) {
            showToast('Password deleted successfully', 'success');
            await loadPasswords(); // Reload passwords
        } else {
            showToast('Failed to delete password: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error deleting password:', error);
        showToast('Failed to delete password', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Handle add password form submission
 */
async function handleAddPassword(event) {
    event.preventDefault();
    
    const website = document.getElementById('website').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!website || !username || !password) {
        showToast('All fields are required', 'error');
        return;
    }

    try {
        showLoading();

        // Encrypt password on client side
        const encryptedData = await window.cryptoManager.encryptPassword(
            password,
            currentMasterPassword,
            window.userSalt
        );

        // Send encrypted data to server
        const response = await fetch('/api/save-password/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({
                website: website,
                username: username,
                encrypted_password: encryptedData.encryptedPassword,
                salt: encryptedData.salt,
                iv: encryptedData.iv
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Password saved successfully!', 'success');
            hideAddPasswordModal();
            
            // Clear form
            document.getElementById('addPasswordForm').reset();
            
            // Reload passwords
            await loadPasswords();
        } else {
            showToast('Failed to save password: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error saving password:', error);
        showToast('Failed to save password', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Show add password modal
 */
function showAddPasswordModal() {
    const modal = document.getElementById('addPasswordModal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('website').focus();
    }
}

/**
 * Hide add password modal
 */
function hideAddPasswordModal() {
    const modal = document.getElementById('addPasswordModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Show password generator modal
 */
function showPasswordGenerator() {
    const modal = document.getElementById('passwordGeneratorModal');
    if (modal) {
        modal.classList.add('active');
        generateNewPassword();
    }
}

/**
 * Hide password generator modal
 */
function hidePasswordGenerator() {
    const modal = document.getElementById('passwordGeneratorModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Generate new password in generator modal
 */
function generateNewPassword() {
    const password = generatePasswordWithSettings();
    const outputField = document.getElementById('generatedPassword');
    if (outputField) {
        outputField.value = password;
    }
}

/**
 * Generate password for input field
 */
function generatePasswordForInput() {
    const password = generatePasswordWithSettings();
    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.value = password;
        passwordField.type = 'text'; // Show generated password briefly
        
        // Hide password after 2 seconds
        setTimeout(() => {
            passwordField.type = 'password';
        }, 2000);
    }
}

/**
 * Hide all modals
 */
function hideAllModals() {
    hideAddPasswordModal();
    hidePasswordGenerator();
}

/**
 * Get CSRF token from cookie
 */
function getCSRFToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * Check session validity periodically
 */
setInterval(async function() {
    try {
        const response = await fetch('/api/check-session/', {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        });

        if (!response.ok) {
            throw new Error('Session check failed');
        }

        const data = await response.json();
        if (!data.authenticated) {
            autoLockSession();
        }
    } catch (error) {
        console.error('Session check failed:', error);
        autoLockSession();
    }
}, 60000); // Check every minute
