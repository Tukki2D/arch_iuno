(function() {
	const expressions = [];
	return function compile(query) {
		for (const [literal, expression] of expressions) if (query === literal) return expression;
		const expression = document.createExpression(query);
		expressions.push([query, expression]);
		return expression;
	};
})();
//#endregion
