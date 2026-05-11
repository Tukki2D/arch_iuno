// ES6 module wrapper for ExtPay
// This file is imported by background.js (MV3 service worker)
// ExtPay.js itself cannot have 'export' because it's also used as a content script

// Load ExtPay.js and re-export the global
import './ExtPay.js';

// In service worker context, use self; in window context, use window
const ExtPay = (typeof self !== 'undefined' && self.ExtPay) ||
               (typeof window !== 'undefined' && window.ExtPay);

export default ExtPay;
