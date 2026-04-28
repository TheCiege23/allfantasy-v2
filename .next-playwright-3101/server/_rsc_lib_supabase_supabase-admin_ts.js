"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_rsc_lib_supabase_supabase-admin_ts";
exports.ids = ["_rsc_lib_supabase_supabase-admin_ts"];
exports.modules = {

/***/ "(rsc)/./lib/supabase/supabase-admin.ts":
/*!****************************************!*\
  !*** ./lib/supabase/supabase-admin.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   createSupabaseAdminClient: () => (/* binding */ createSupabaseAdminClient)\n/* harmony export */ });\n/* harmony import */ var server_only__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! server-only */ \"(rsc)/./node_modules/next/dist/compiled/server-only/empty.js\");\n/* harmony import */ var server_only__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(server_only__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @supabase/supabase-js */ \"(rsc)/./node_modules/@supabase/supabase-js/dist/index.mjs\");\n\n\n/**\r\n * Service-role client for server-only operations (e.g. admin.createUser).\r\n * Returns null when URL or SUPABASE_SERVICE_ROLE_KEY is missing.\r\n */ function createSupabaseAdminClient() {\n    const url = \"https://iyobqczaobkyxvgrrcgq.supabase.co\"?.trim();\n    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();\n    if (!url || !serviceRole) return null;\n    return (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_1__.createClient)(url, serviceRole, {\n        auth: {\n            autoRefreshToken: false,\n            persistSession: false\n        }\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvc3VwYWJhc2Uvc3VwYWJhc2UtYWRtaW4udHMiLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFvQjtBQUNxRDtBQUV6RTs7O0NBR0MsR0FDTSxTQUFTQztJQUNkLE1BQU1DLE1BQU1DLDBDQUFvQyxFQUFFRztJQUNsRCxNQUFNQyxjQUFjSixRQUFRQyxHQUFHLENBQUNJLHlCQUF5QixFQUFFRjtJQUMzRCxJQUFJLENBQUNKLE9BQU8sQ0FBQ0ssYUFBYSxPQUFPO0lBQ2pDLE9BQU9QLG1FQUFZQSxDQUFDRSxLQUFLSyxhQUFhO1FBQ3BDRSxNQUFNO1lBQ0pDLGtCQUFrQjtZQUNsQkMsZ0JBQWdCO1FBQ2xCO0lBQ0Y7QUFDRiIsInNvdXJjZXMiOlsid2VicGFjazovL2FsbGZhbnRhc3ktYWkvLi9saWIvc3VwYWJhc2Uvc3VwYWJhc2UtYWRtaW4udHM/NmVhMCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgXCJzZXJ2ZXItb25seVwiXHJcbmltcG9ydCB7IGNyZWF0ZUNsaWVudCwgdHlwZSBTdXBhYmFzZUNsaWVudCB9IGZyb20gXCJAc3VwYWJhc2Uvc3VwYWJhc2UtanNcIlxyXG5cclxuLyoqXHJcbiAqIFNlcnZpY2Utcm9sZSBjbGllbnQgZm9yIHNlcnZlci1vbmx5IG9wZXJhdGlvbnMgKGUuZy4gYWRtaW4uY3JlYXRlVXNlcikuXHJcbiAqIFJldHVybnMgbnVsbCB3aGVuIFVSTCBvciBTVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZIGlzIG1pc3NpbmcuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU3VwYWJhc2VBZG1pbkNsaWVudCgpOiBTdXBhYmFzZUNsaWVudCB8IG51bGwge1xyXG4gIGNvbnN0IHVybCA9IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NVUEFCQVNFX1VSTD8udHJpbSgpXHJcbiAgY29uc3Qgc2VydmljZVJvbGUgPSBwcm9jZXNzLmVudi5TVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZPy50cmltKClcclxuICBpZiAoIXVybCB8fCAhc2VydmljZVJvbGUpIHJldHVybiBudWxsXHJcbiAgcmV0dXJuIGNyZWF0ZUNsaWVudCh1cmwsIHNlcnZpY2VSb2xlLCB7XHJcbiAgICBhdXRoOiB7XHJcbiAgICAgIGF1dG9SZWZyZXNoVG9rZW46IGZhbHNlLFxyXG4gICAgICBwZXJzaXN0U2Vzc2lvbjogZmFsc2UsXHJcbiAgICB9LFxyXG4gIH0pXHJcbn1cclxuIl0sIm5hbWVzIjpbImNyZWF0ZUNsaWVudCIsImNyZWF0ZVN1cGFiYXNlQWRtaW5DbGllbnQiLCJ1cmwiLCJwcm9jZXNzIiwiZW52IiwiTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMIiwidHJpbSIsInNlcnZpY2VSb2xlIiwiU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWSIsImF1dGgiLCJhdXRvUmVmcmVzaFRva2VuIiwicGVyc2lzdFNlc3Npb24iXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./lib/supabase/supabase-admin.ts\n");

/***/ })

};
;