# Authentication Components

This directory contains components related to user authentication and authorization.

### BiometricAuth.vue

- A component for handling biometric authentication (e.g., Touch ID, Face ID).
- Manages different states: prompt, authenticating, success, and error.
- Supports device management for registered biometric methods.

### LoginForm.vue

- A standard login form for users to sign in with email and password.
- Includes "Remember Me" and "Forgot Password" options.
- Supports social login (e.g., Google) and biometric login as alternatives.

### MasterPasswordPrompt.vue

- A component to prompt the user for their master password to unlock the vault.
- Displays user information and password hints.
- Handles failed attempts and account lockout.
- Provides access to emergency recovery options.

### RegisterForm.vue

- A registration form for new users to create an account.
- Includes fields for email, master password (with strength meter), and password hint.
- Handles terms of service agreement. 