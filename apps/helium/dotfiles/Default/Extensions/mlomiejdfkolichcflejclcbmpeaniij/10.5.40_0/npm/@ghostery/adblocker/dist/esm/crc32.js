//#region node_modules/@ghostery/adblocker/dist/esm/crc32.js
var T = (() => {
	let c;
	const table = new Int32Array(256);
	for (let n = 0; n !== 256; n += 1) {
		c = n;
		c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
		c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
		c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
		c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
		c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
		c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
		c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
		c = c & 1 ? -306674912 ^ c >>> 1 : c >>> 1;
		table[n] = c;
	}
	return table;
})();
function crc32(buf, start, end) {
	let C = -1;
	const L = end - 7;
	let i = start;
	while (i < L) {
		C = C >>> 8 ^ T[(C ^ buf[i++]) & 255];
		C = C >>> 8 ^ T[(C ^ buf[i++]) & 255];
		C = C >>> 8 ^ T[(C ^ buf[i++]) & 255];
		C = C >>> 8 ^ T[(C ^ buf[i++]) & 255];
		C = C >>> 8 ^ T[(C ^ buf[i++]) & 255];
		C = C >>> 8 ^ T[(C ^ buf[i++]) & 255];
		C = C >>> 8 ^ T[(C ^ buf[i++]) & 255];
		C = C >>> 8 ^ T[(C ^ buf[i++]) & 255];
	}
	while (i < L + 7) C = C >>> 8 ^ T[(C ^ buf[i++]) & 255];
	return (C ^ -1) >>> 0;
}
//#endregion
export { crc32 as default };
