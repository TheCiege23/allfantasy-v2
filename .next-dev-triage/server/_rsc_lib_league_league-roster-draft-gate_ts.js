"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_rsc_lib_league_league-roster-draft-gate_ts";
exports.ids = ["_rsc_lib_league_league-roster-draft-gate_ts"];
exports.modules = {

/***/ "(rsc)/./lib/league/league-roster-draft-gate.ts":
/*!************************************************!*\
  !*** ./lib/league/league-roster-draft-gate.ts ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   isLeagueRosterDraftReady: () => (/* binding */ isLeagueRosterDraftReady)\n/* harmony export */ });\n/* harmony import */ var _lib_league_getEffectiveLeagueRosterTemplate__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @/lib/league/getEffectiveLeagueRosterTemplate */ \"(rsc)/./lib/league/getEffectiveLeagueRosterTemplate.ts\");\n\n/**\r\n * Draft start/pick/session: requires a persisted roster schema for the league (Sleeper-style).\r\n * When false, callers return 409 / soft-block UI via `rosterConfigurationIncomplete`.\r\n */ async function isLeagueRosterDraftReady(leagueId) {\n    const { hasPersistedRosterSchema } = await (0,_lib_league_getEffectiveLeagueRosterTemplate__WEBPACK_IMPORTED_MODULE_0__.getEffectiveLeagueRosterTemplate)(leagueId);\n    return hasPersistedRosterSchema;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvbGVhZ3VlL2xlYWd1ZS1yb3N0ZXItZHJhZnQtZ2F0ZS50cyIsIm1hcHBpbmdzIjoiOzs7OztBQUFnRztBQUVoRzs7O0NBR0MsR0FDTSxlQUFlQyx5QkFBeUJDLFFBQWdCO0lBQzdELE1BQU0sRUFBRUMsd0JBQXdCLEVBQUUsR0FBRyxNQUFNSCw4R0FBZ0NBLENBQUNFO0lBQzVFLE9BQU9DO0FBQ1QiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9hbGxmYW50YXN5LWFpLy4vbGliL2xlYWd1ZS9sZWFndWUtcm9zdGVyLWRyYWZ0LWdhdGUudHM/OGZmNyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBnZXRFZmZlY3RpdmVMZWFndWVSb3N0ZXJUZW1wbGF0ZSB9IGZyb20gJ0AvbGliL2xlYWd1ZS9nZXRFZmZlY3RpdmVMZWFndWVSb3N0ZXJUZW1wbGF0ZSdcclxuXHJcbi8qKlxyXG4gKiBEcmFmdCBzdGFydC9waWNrL3Nlc3Npb246IHJlcXVpcmVzIGEgcGVyc2lzdGVkIHJvc3RlciBzY2hlbWEgZm9yIHRoZSBsZWFndWUgKFNsZWVwZXItc3R5bGUpLlxyXG4gKiBXaGVuIGZhbHNlLCBjYWxsZXJzIHJldHVybiA0MDkgLyBzb2Z0LWJsb2NrIFVJIHZpYSBgcm9zdGVyQ29uZmlndXJhdGlvbkluY29tcGxldGVgLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGlzTGVhZ3VlUm9zdGVyRHJhZnRSZWFkeShsZWFndWVJZDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgY29uc3QgeyBoYXNQZXJzaXN0ZWRSb3N0ZXJTY2hlbWEgfSA9IGF3YWl0IGdldEVmZmVjdGl2ZUxlYWd1ZVJvc3RlclRlbXBsYXRlKGxlYWd1ZUlkKVxyXG4gIHJldHVybiBoYXNQZXJzaXN0ZWRSb3N0ZXJTY2hlbWFcclxufVxyXG4iXSwibmFtZXMiOlsiZ2V0RWZmZWN0aXZlTGVhZ3VlUm9zdGVyVGVtcGxhdGUiLCJpc0xlYWd1ZVJvc3RlckRyYWZ0UmVhZHkiLCJsZWFndWVJZCIsImhhc1BlcnNpc3RlZFJvc3RlclNjaGVtYSJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/league/league-roster-draft-gate.ts\n");

/***/ })

};
;