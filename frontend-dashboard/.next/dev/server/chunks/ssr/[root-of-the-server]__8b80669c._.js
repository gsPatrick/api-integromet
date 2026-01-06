module.exports = [
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/http2 [external] (http2, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http2", () => require("http2"));

module.exports = mod;
}),
"[externals]/assert [external] (assert, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("assert", () => require("assert"));

module.exports = mod;
}),
"[externals]/tty [external] (tty, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("tty", () => require("tty"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[project]/Integromat/frontend-dashboard/src/services/api.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Integromat/frontend-dashboard/node_modules/axios/lib/axios.js [app-ssr] (ecmascript)");
;
const api = __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].create({
    baseURL: 'http://localhost:3000'
});
api.interceptors.request.use((config)=>{
    // Add strict API token header
    config.headers['x-api-token'] = '123456'; // HARDCODED FOR MVP AS REQUESTED
    return config;
});
const __TURBOPACK__default__export__ = api;
}),
"[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.module.css [app-ssr] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "card": "OrderCard-module__nyVlCG__card",
  "content": "OrderCard-module__nyVlCG__content",
  "customerName": "OrderCard-module__nyVlCG__customerName",
  "customerPhone": "OrderCard-module__nyVlCG__customerPhone",
  "details": "OrderCard-module__nyVlCG__details",
  "header": "OrderCard-module__nyVlCG__header",
  "image": "OrderCard-module__nyVlCG__image",
  "imageContainer": "OrderCard-module__nyVlCG__imageContainer",
  "meta": "OrderCard-module__nyVlCG__meta",
  "price": "OrderCard-module__nyVlCG__price",
  "productName": "OrderCard-module__nyVlCG__productName",
  "status": "OrderCard-module__nyVlCG__status",
  "statusError": "OrderCard-module__nyVlCG__statusError",
  "statusPending": "OrderCard-module__nyVlCG__statusPending",
  "statusProcessed": "OrderCard-module__nyVlCG__statusProcessed",
});
}),
"[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>OrderCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Integromat/frontend-dashboard/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Integromat/frontend-dashboard/node_modules/next/image.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.module.css [app-ssr] (css module)");
;
;
;
function OrderCard({ order, onClick }) {
    const getStatusClass = (status)=>{
        switch(status){
            case 'PROCESSED':
                return __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].statusProcessed;
            case 'ERROR':
                return __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].statusError;
            default:
                return __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].statusPending;
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].card,
        onClick: ()=>onClick(order),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].imageContainer,
                children: order.imageUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    src: order.imageUrl,
                    alt: order.productRaw || 'Produto',
                    fill: true,
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].image
                }, void 0, false, {
                    fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js",
                    lineNumber: 17,
                    columnNumber: 21
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#9ca3af'
                    },
                    children: "Sem Imagem"
                }, void 0, false, {
                    fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js",
                    lineNumber: 24,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js",
                lineNumber: 15,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].content,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].header,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].customerName,
                                        children: order.customerName || 'Cliente Desconhecido'
                                    }, void 0, false, {
                                        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js",
                                        lineNumber: 33,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].customerPhone,
                                        children: order.customerPhone
                                    }, void 0, false, {
                                        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js",
                                        lineNumber: 34,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js",
                                lineNumber: 32,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: `${__TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].status} ${getStatusClass(order.status)}`,
                                children: order.status
                            }, void 0, false, {
                                fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js",
                                lineNumber: 36,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js",
                        lineNumber: 31,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].details,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].productName,
                                children: order.productRaw || 'Produto não identificado'
                            }, void 0, false, {
                                fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js",
                                lineNumber: 42,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].meta,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            "Tam: ",
                                            order.extractedSize || '-'
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js",
                                        lineNumber: 44,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: [
                                            "Cor: ",
                                            order.extractedColor || '-'
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js",
                                        lineNumber: 45,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js",
                                lineNumber: 43,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].price,
                                children: [
                                    "R$ ",
                                    order.sellPrice ? Number(order.sellPrice).toFixed(2) : '0.00'
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js",
                                lineNumber: 47,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js",
                        lineNumber: 41,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js",
                lineNumber: 30,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js",
        lineNumber: 14,
        columnNumber: 9
    }, this);
}
}),
"[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.module.css [app-ssr] (css module)", ((__turbopack_context__) => {

__turbopack_context__.v({
  "actions": "EditModal-module__QIabGG__actions",
  "button": "EditModal-module__QIabGG__button",
  "cancel": "EditModal-module__QIabGG__cancel",
  "content": "EditModal-module__QIabGG__content",
  "form": "EditModal-module__QIabGG__form",
  "imageContainer": "EditModal-module__QIabGG__imageContainer",
  "input": "EditModal-module__QIabGG__input",
  "inputGroup": "EditModal-module__QIabGG__inputGroup",
  "label": "EditModal-module__QIabGG__label",
  "modal": "EditModal-module__QIabGG__modal",
  "overlay": "EditModal-module__QIabGG__overlay",
  "save": "EditModal-module__QIabGG__save",
  "sync": "EditModal-module__QIabGG__sync",
});
}),
"[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>EditModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Integromat/frontend-dashboard/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Integromat/frontend-dashboard/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Integromat/frontend-dashboard/node_modules/next/image.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Integromat/frontend-dashboard/src/services/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__ = __turbopack_context__.i("[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.module.css [app-ssr] (css module)");
;
;
;
;
;
function EditModal({ order, onClose, onSave }) {
    const [formData, setFormData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        productRaw: order.productRaw || '',
        extractedSize: order.extractedSize || '',
        extractedColor: order.extractedColor || '',
        sellPrice: order.sellPrice || ''
    });
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleChange = (e)=>{
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };
    const handleSave = async (sync = false)=>{
        setLoading(true);
        try {
            // 1. Update Order
            await __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].put(`/orders/${order.id}`, formData);
            // 2. Sync if requested
            if (sync) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post(`/orders/${order.id}/sync-bling`);
                alert('Pedido salvo e enviado para o Bling!');
            } else {
                alert('Dados salvos localmente!');
            }
            onSave(); // Refreshes parent
        } catch (error) {
            console.error('Error saving:', error);
            alert('Erro ao salvar. Verifique o console.');
        } finally{
            setLoading(false);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].overlay,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].modal,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].content,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].imageContainer,
                        children: order.imageUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            src: order.imageUrl,
                            alt: "Produto",
                            fill: true,
                            style: {
                                objectFit: 'contain'
                            }
                        }, void 0, false, {
                            fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                            lineNumber: 50,
                            columnNumber: 29
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            children: "Sem imagem"
                        }, void 0, false, {
                            fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                            lineNumber: 56,
                            columnNumber: 29
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                        lineNumber: 48,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].form,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                children: [
                                    "Editar Pedido #",
                                    order.id
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                lineNumber: 61,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].inputGroup,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].label,
                                        children: "Produto"
                                    }, void 0, false, {
                                        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                        lineNumber: 64,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        name: "productRaw",
                                        value: formData.productRaw,
                                        onChange: handleChange,
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].input
                                    }, void 0, false, {
                                        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                        lineNumber: 65,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                lineNumber: 63,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                style: {
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '16px'
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].inputGroup,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].label,
                                                children: "Tamanho"
                                            }, void 0, false, {
                                                fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                                lineNumber: 75,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                name: "extractedSize",
                                                value: formData.extractedSize,
                                                onChange: handleChange,
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].input
                                            }, void 0, false, {
                                                fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                                lineNumber: 76,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                        lineNumber: 74,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].inputGroup,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].label,
                                                children: "Cor"
                                            }, void 0, false, {
                                                fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                                lineNumber: 84,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                name: "extractedColor",
                                                value: formData.extractedColor,
                                                onChange: handleChange,
                                                className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].input
                                            }, void 0, false, {
                                                fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                                lineNumber: 85,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                        lineNumber: 83,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                lineNumber: 73,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].inputGroup,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].label,
                                        children: "Preço de Venda (R$)"
                                    }, void 0, false, {
                                        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                        lineNumber: 95,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        name: "sellPrice",
                                        type: "number",
                                        step: "0.01",
                                        value: formData.sellPrice,
                                        onChange: handleChange,
                                        className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].input
                                    }, void 0, false, {
                                        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                        lineNumber: 96,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                lineNumber: 94,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].actions,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: onClose,
                                        className: `${__TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].button} ${__TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].cancel}`,
                                        disabled: loading,
                                        children: "Cancelar"
                                    }, void 0, false, {
                                        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                        lineNumber: 107,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>handleSave(false),
                                        className: `${__TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].button} ${__TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].save}`,
                                        disabled: loading,
                                        title: "Salva apenas no banco de dados local",
                                        children: "Salvar Rascunho"
                                    }, void 0, false, {
                                        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                        lineNumber: 110,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>handleSave(true),
                                        className: `${__TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].button} ${__TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$module$2e$css__$5b$app$2d$ssr$5d$__$28$css__module$29$__["default"].sync}`,
                                        disabled: loading,
                                        title: "Salva e envia para o Bling",
                                        children: loading ? 'Enviando...' : '✅ Salvar e Sincronizar Bling'
                                    }, void 0, false, {
                                        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                        lineNumber: 113,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                                lineNumber: 106,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                        lineNumber: 60,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
                lineNumber: 46,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
            lineNumber: 45,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js",
        lineNumber: 44,
        columnNumber: 9
    }, this);
}
}),
"[project]/Integromat/frontend-dashboard/src/app/dashboard/page.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Dashboard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Integromat/frontend-dashboard/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Integromat/frontend-dashboard/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Integromat/frontend-dashboard/src/services/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Integromat/frontend-dashboard/src/components/orders/OrderCard/OrderCard.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Integromat/frontend-dashboard/src/components/orders/EditModal/EditModal.js [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
function Dashboard() {
    const [orders, setOrders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [selectedOrder, setSelectedOrder] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        fetchOrders();
    }, []);
    const fetchOrders = async ()=>{
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$services$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get('/orders');
            // Backend returns { data: [...], total: ... }
            setOrders(response.data.data);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            // MOCK DATA FALLBACK FOR DEMONSTRATION
            setOrders([
                {
                    id: 1,
                    customerName: 'Maria Silva',
                    customerPhone: '5511999999999',
                    productRaw: 'Vestido Florido Verao',
                    extractedSize: 'M',
                    extractedColor: 'Vermelho',
                    sellPrice: 149.90,
                    status: 'PENDING',
                    imageUrl: 'https://storage.z-api.io/instances/YOUR_INSTANCE/token/YOUR_TOKEN/image.jpeg'
                },
                {
                    id: 2,
                    customerName: 'João Santos',
                    customerPhone: '5511988888888',
                    productRaw: 'Camisa Polo Básica',
                    extractedSize: 'G',
                    extractedColor: 'Azul Marinho',
                    sellPrice: 89.90,
                    status: 'PROCESSED',
                    imageUrl: null
                }
            ]);
        // alert('Erro ao carregar pedidos. Usando DADOS MOCKADOS para visualização.');
        } finally{
            setLoading(false);
        }
    };
    if (loading) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            padding: '2rem'
        },
        children: "Carregando pedidos..."
    }, void 0, false, {
        fileName: "[project]/Integromat/frontend-dashboard/src/app/dashboard/page.js",
        lineNumber: 55,
        columnNumber: 25
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            padding: '2rem',
            maxWidth: '1200px',
            margin: '0 auto'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                style: {
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    marginBottom: '2rem'
                },
                children: "Painel de Pedidos (Mock View)"
            }, void 0, false, {
                fileName: "[project]/Integromat/frontend-dashboard/src/app/dashboard/page.js",
                lineNumber: 59,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '1.5rem'
                },
                children: orders.map((order)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$OrderCard$2f$OrderCard$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        order: order,
                        onClick: setSelectedOrder
                    }, order.id, false, {
                        fileName: "[project]/Integromat/frontend-dashboard/src/app/dashboard/page.js",
                        lineNumber: 67,
                        columnNumber: 21
                    }, this))
            }, void 0, false, {
                fileName: "[project]/Integromat/frontend-dashboard/src/app/dashboard/page.js",
                lineNumber: 61,
                columnNumber: 13
            }, this),
            selectedOrder && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$Integromat$2f$frontend$2d$dashboard$2f$src$2f$components$2f$orders$2f$EditModal$2f$EditModal$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                order: selectedOrder,
                onClose: ()=>setSelectedOrder(null),
                onSave: ()=>{
                    setSelectedOrder(null);
                    fetchOrders();
                }
            }, void 0, false, {
                fileName: "[project]/Integromat/frontend-dashboard/src/app/dashboard/page.js",
                lineNumber: 76,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/Integromat/frontend-dashboard/src/app/dashboard/page.js",
        lineNumber: 58,
        columnNumber: 9
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__8b80669c._.js.map