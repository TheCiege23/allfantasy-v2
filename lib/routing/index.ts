export {
  getProductEntryRoute,
  getProductRouteConfigs,
  isPathInProduct,
  PRODUCT_ROUTE_CONFIGS,
  type ProductRouteConfig,
} from "./CrossProductRouteResolver"
export {
  getProductSwitchHref,
  getProductSwitchItems,
  getSwitchTargetFromPath,
} from "./ProductSwitchController"
export {
  safeRedirectPath,
  getRedirectAfterLogin,
  getRedirectAfterSignup,
  loginUrlWithIntent,
  signupUrlWithIntent,
  getPostAuthDestination,
  buildLoginUrlWithIntent,
  buildSignupUrlWithIntent,
} from "./PostAuthIntentRouter"
export {
  isProtectedPath,
  isAdminPath,
  getLoginRedirectUrl,
  getSignupRedirectUrl,
} from "./ProtectedRouteResolver"
export {
  getUnauthorizedFallback,
  DEFAULT_UNAUTHENTICATED_FALLBACK,
  DEFAULT_UNAUTHORIZED_FALLBACK,
} from "./UnauthorizedFallbackResolver"
export {
  normalizeDeepLink,
  isAllowedDeepLink,
  getDeepLinkRedirect,
} from "./DeepLinkHandler"
