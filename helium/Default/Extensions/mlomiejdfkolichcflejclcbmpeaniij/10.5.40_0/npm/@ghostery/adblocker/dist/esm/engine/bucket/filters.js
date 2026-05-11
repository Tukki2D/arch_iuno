import { StaticDataView, sizeOfBytes } from "../../data-view.js";
//#region node_modules/@ghostery/adblocker/dist/esm/engine/bucket/filters.js
/*!
* Copyright (c) 2017-present Ghostery GmbH. All rights reserved.
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/
var EMPTY_FILTERS = new Uint8Array(4);
/**
* Generic filters container (for both CosmeticFilter and NetworkFilter
* instances). This abstracts away some of the logic to serialize/lazy-load
* lists of filters (which is useful for things like generic cosmetic filters
* or $badfilter).
*/
var FiltersContainer = class FiltersContainer {
	static deserialize(buffer, deserialize, config) {
		const container = new FiltersContainer({
			deserialize,
			config,
			filters: []
		});
		container.filters = buffer.getBytes();
		return container;
	}
	constructor({ config, deserialize, filters }) {
		this.deserialize = deserialize;
		this.filters = EMPTY_FILTERS;
		this.config = config;
		if (filters.length !== 0) this.update(filters, void 0);
	}
	/**
	* Update filters based on `newFilters` and `removedFilters`.
	*/
	update(newFilters, removedFilters) {
		let bufferSizeEstimation = this.filters.byteLength;
		let selected = [];
		const compression = this.config.enableCompression;
		const currentFilters = this.getFilters();
		if (currentFilters.length !== 0) if (removedFilters === void 0 || removedFilters.size === 0) selected = currentFilters;
		else for (const filter of currentFilters) if (removedFilters.has(filter.getId()) === false) selected.push(filter);
		else bufferSizeEstimation -= filter.getSerializedSize(compression);
		const storedFiltersRemoved = selected.length !== currentFilters.length;
		const numberOfExistingFilters = selected.length;
		for (const filter of newFilters) {
			bufferSizeEstimation += filter.getSerializedSize(compression);
			selected.push(filter);
		}
		const storedFiltersAdded = selected.length > numberOfExistingFilters;
		if (selected.length === 0) this.filters = EMPTY_FILTERS;
		else if (storedFiltersAdded === true || storedFiltersRemoved === true) {
			const buffer = StaticDataView.allocate(bufferSizeEstimation, this.config);
			buffer.pushUint32(selected.length);
			if (this.config.debug === true) selected.sort((f1, f2) => f1.getId() - f2.getId());
			for (const filter of selected) filter.serialize(buffer);
			this.filters = buffer.buffer;
		}
	}
	getSerializedSize() {
		return sizeOfBytes(this.filters, false);
	}
	serialize(buffer) {
		buffer.pushBytes(this.filters);
	}
	getFilters() {
		if (this.filters.byteLength <= 4) return [];
		const filters = [];
		const buffer = StaticDataView.fromUint8Array(this.filters, this.config);
		const numberOfFilters = buffer.getUint32();
		for (let i = 0; i < numberOfFilters; i += 1) filters.push(this.deserialize(buffer));
		return filters;
	}
};
//#endregion
export { FiltersContainer as default };
