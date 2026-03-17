// Selectors for all auth-related test IDs and CSS selectors

export const SELECTORS = {
  // Signup form
  signup: {
    email: '[data-testid="signup-email"]',
    username: '[data-testid="signup-username"]',
    password: '[data-testid="signup-password"]',
    confirmPassword: '[data-testid="signup-confirm-password"]',
    displayName: '[data-testid="signup-display-name"]',
    phone: '[data-testid="signup-phone"]',
    sleeperUsername: '[data-testid="signup-sleeper-username"]',
    ageConfirm: '[data-testid="signup-age-confirm"]',
    submit: '[data-testid="signup-submit"]',
    error: '[data-testid="signup-error"]',
  },

  // Signin form
  signin: {
    login: '[data-testid="signin-login"]',
    password: '[data-testid="signin-password"]',
    submit: '[data-testid="signin-submit"]',
    error: '[data-testid="signin-error"]',
  },

  // Protected pages
  navbar: {
    userMenu: '[data-testid="navbar-user-menu"]',
    logout: '[data-testid="navbar-logout"]',
  },

  // Password reset
  forgotPassword: {
    email: '[data-testid="forgot-password-email"]',
    submit: '[data-testid="forgot-password-submit"]',
  },
  resetPassword: {
    newPassword: '[data-testid="reset-password-new"]',
    confirmPassword: '[data-testid="reset-password-confirm"]',
    submit: '[data-testid="reset-password-submit"]',
    error: '[data-testid="reset-password-error"]',
  },
} as const

// Routes used in tests
export const ROUTES = {
  signup: "/signup",
  login: "/login",
  dashboard: "/dashboard",
  leagues: "/leagues",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",

  // API routes
  api: {
    register: "/api/auth/register",
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    me: "/api/auth/me",
    passwordResetRequest: "/api/auth/password/reset/request",
    passwordResetConfirm: "/api/auth/password/reset/confirm",
    userProfile: "/api/user/profile",
    leagueCreate: "/api/league/create",
    nextauth: "/api/auth/session",
  },
} as const
