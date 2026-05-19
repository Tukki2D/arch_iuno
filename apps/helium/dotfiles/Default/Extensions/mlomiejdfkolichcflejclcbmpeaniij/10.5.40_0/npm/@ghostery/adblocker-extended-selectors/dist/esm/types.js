//#region node_modules/@ghostery/adblocker-extended-selectors/dist/esm/types.js
function isAtoms(tokens) {
	return tokens.every((token) => typeof token !== "string");
}
function isAST(tokens) {
	return tokens.every((token) => token.type !== "comma" && token.type !== "combinator");
}
//#endregion
export { isAST, isAtoms };
