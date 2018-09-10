"use strict";

const BookUtil = {
	_getSelectors (scrollTo) {
		return [
			`.statsBlockSectionHead > .entry-title:textEquals("${scrollTo}")`,
			`.statsBlockHead > .entry-title:textEquals("${scrollTo}")`,
			`.statsBlockSubHead > .entry-title:textEquals("${scrollTo}")`,
			`.statsBlockInset > .entry-title:textEquals("${scrollTo}")`,
			`.statsInlineHead > .entry-title:textEquals("${scrollTo}.")`
		];
	},

	scrollClick: (scrollTo, scrollIndex) => {
		const selectors = BookUtil._getSelectors(scrollTo);

		if (scrollIndex === undefined) {
			// textEquals selector defined below; added on window load
			const goToSect = $(selectors[0]);
			if (goToSect.length) {
				goToSect[0].scrollIntoView();
				return;
			}
			const goTo = $(selectors[1]);
			if (goTo.length) {
				goTo[0].scrollIntoView();
				return;
			}
			const goToSub = $(selectors[2]);
			if (goToSub.length) {
				goToSub[0].scrollIntoView();
				return;
			}
			const goToInset = $(selectors[3]);
			if (goToInset.length) {
				goToInset[0].scrollIntoView();
			}
			const goToInline = $(selectors[4]);
			if (goToInline.length) {
				goToInline[0].scrollIntoView();
			}
		} else {
			const goTo = $(`${selectors[0]}, ${selectors[1]}, ${selectors[2]}, ${selectors[3]}, ${selectors[4]}`);
			if (goTo.length) {
				if (goTo[scrollIndex]) goTo[scrollIndex].scrollIntoView();
				else goTo[0].scrollIntoView();
			}
		}
	},

	scrollPageTop: () => {
		$(`#pagecontent`)[0].scrollIntoView();
	},

	makeContentsBlock: (options) => {
		let out =
			`<ul class="bk-contents" ${options.defaultHidden ? `style="display: none;"` : ""}>`;

		options.book.contents.forEach((c, i) => {
			out +=
				`<li>
				<a href="${options.addPrefix || ""}#${options.book.id},${i}" ${options.addOnclick ? `onclick="BookUtil.scrollPageTop()"` : ""}>
					<span class="sect">${BookUtil.getOrdinalText(c.ordinal)}${c.name}</span>
				</a>
			</li>`;
			out += BookUtil.makeHeadersBlock(options.book.id, i, c, options.addPrefix, options.addOnclick, options.defaultHeadersHidden);
		});

		out +=
			"</ul>";
		return out;
	},

	getOrdinalText: (ordinal) => {
		if (ordinal === undefined) return "";
		return `${ordinal.type === "part" ? `Part ${ordinal.identifier} \u2014 ` : ordinal.type === "chapter" ? `Ch. ${ordinal.identifier}: ` : ordinal.type === "episode" ? `Ep. ${ordinal.identifier}: ` : `App. ${ordinal.identifier}: `}`;
	},

	makeHeadersBlock: (bookId, chapterIndex, chapter, addPrefix, addOnclick, defaultHeadersHidden) => {
		let out =
			`<ul class="bk-headers" ${defaultHeadersHidden ? `style="display: none;"` : ""}>`;
		chapter.headers && chapter.headers.forEach(c => {
			out +=
				`<li>
				<a href="${addPrefix || ""}#${bookId},${chapterIndex},${UrlUtil.encodeForHash(c)}" data-book="${bookId}" data-chapter="${chapterIndex}" data-header="${c}" ${addOnclick ? `onclick="BookUtil.scrollClick('${c.replace(/'/g, "\\'")}')"` : ""}>${c}</a>
			</li>`
		});
		out +=
			"</ul>";
		return out;
	},

	addHeaderHandles: (defHidden) => {
		// Add show/hide handles to section names, and update styles
		const allHeaders = $(`ul.bk-headers`);
		// add styles to all
		allHeaders.prev(`li`).find(`a`).css({
			display: "flex",
			"justify-content": "space-between",
			padding: "0"
		});
		allHeaders.filter((i, ele) => $(ele).children().length).each((i, ele) => {
			const $ele = $(ele);
			// add expand/collapse to only those with children
			const $appendTo = $ele.prev(`li`).find(`a`);
			if (!$appendTo.children(`.showhide`).length) {
				$appendTo.append(`<span class="showhide" onclick="BookUtil.sectToggle(event, this)" data-hidden="true">${defHidden ? `[+]` : `[\u2013]`}</span>`)
			}
		});
	},

	sectToggle: (evt, ele) => {
		if (evt) {
			evt.stopPropagation();
			evt.preventDefault();
		}
		const $ele = $(ele);
		const $childList = $ele.closest(`li`).next(`ul.bk-headers`);
		if ($ele.data("hidden")) {
			$childList.show();
			$ele.data("hidden", false);
			$ele.html(`[\u2013]`);
		} else {
			$childList.hide();
			$ele.data("hidden", true);
			$ele.html(`[+]`);
		}
	},

	thisContents: null,
	curRender: {
		curAdvId: "NONE",
		chapter: -1,
		data: {},
		fromIndex: {},
		lastRefHeader: null,
		controls: {}
	},
	showBookContent: (data, fromIndex, bookId, hashParts) => {
		function handleQuickReferenceShowAll () {
			$(`div.statsBlockSectionHead`).show();
			$(`hr.section-break`).show();
		}

		/**
		 * @param sectionHeader Section header to scroll to.
		 * @return {boolean} True if the scroll happened, false otherwise.
		 */
		function handleQuickReferenceShow (sectionHeader) {
			handleQuickReferenceShowAll();
			if (sectionHeader) {
				const $allSects = $(`div.statsBlockSectionHead`);
				const $toShow = $allSects.filter((i, e) => {
					const $e = $(e);
					const $match = $e.children().filter(`span.entry-title:textEquals("${sectionHeader}")`);
					return $match.length;
				});

				if ($toShow.length) {
					BookUtil.curRender.lastRefHeader = sectionHeader.toLowerCase();
					$allSects.hide();
					$(`hr.section-break`).hide();
					$toShow.show();
					MiscUtil.scrollPageTop();
				} else BookUtil.curRender.lastRefHeader = null;
				return !!$toShow.length;
			}
		}

		let chapter = 0;
		let scrollTo;
		let scrollIndex;
		let forceScroll = false;
		if (hashParts && hashParts.length > 0) chapter = Number(hashParts[0]);
		if (hashParts && hashParts.length > 1) {
			scrollTo = $(`[href="#${bookId},${chapter},${hashParts[1]}"]`).data("header");
			if (BookUtil.referenceId) {
				handleQuickReferenceShow(scrollTo);
			}

			// fallback to scanning the document
			if (!scrollTo) {
				scrollTo = decodeURIComponent(hashParts[1]);
				if (hashParts[2]) scrollIndex = Number(hashParts[2]);
				forceScroll = true;
			}
		} else if (BookUtil.referenceId) {
			handleQuickReferenceShowAll();
		}

		BookUtil.curRender.data = data;
		BookUtil.curRender.fromIndex = fromIndex;
		if (BookUtil.curRender.chapter !== chapter || BookUtil.curRender.curAdvId !== bookId) {
			BookUtil.thisContents.children(`ul`).children(`ul, li`).removeClass("active");
			BookUtil.thisContents.children(`ul`).children(`li:nth-of-type(${chapter + 1}), ul:nth-of-type(${chapter + 1})`).addClass("active");
			const $showHideBtn = BookUtil.thisContents.children(`ul`).children(`li:nth-of-type(${chapter + 1})`).find(`.showhide`);
			if ($showHideBtn.data("hidden")) $showHideBtn.click();

			BookUtil.curRender.curAdvId = bookId;
			BookUtil.curRender.chapter = chapter;
			BookUtil.renderArea.html("");

			const chapterTitle = (fromIndex.contents[chapter] || {}).name;
			document.title = `${chapterTitle ? `${chapterTitle} - ` : ""}${fromIndex.name} - 5etools`;

			const goToPage = (mod) => {
				const changeChapter = () => {
					const newHashParts = [bookId, chapter + mod];
					window.location.hash = newHashParts.join(HASH_PART_SEP);
					MiscUtil.scrollPageTop();
				};

				if (BookUtil.referenceId && BookUtil.curRender.lastRefHeader) {
					const chap = BookUtil.curRender.fromIndex.contents[chapter];
					const ix = chap.headers.findIndex(it => it.toLowerCase() === BookUtil.curRender.lastRefHeader);
					if (~ix) {
						if (chap.headers[ix + mod]) {
							const newHashParts = [bookId, chapter, chap.headers[ix + mod].toLowerCase()];
							window.location.hash = newHashParts.join(HASH_PART_SEP);
						} else {
							changeChapter();
							const nxtHeaders = BookUtil.curRender.fromIndex.contents[chapter + mod].headers;
							const nxtIx = mod > 0 ? 0 : nxtHeaders.length - 1;
							const newHashParts = [bookId, chapter + mod, nxtHeaders[nxtIx].toLowerCase()];
							window.location.hash = newHashParts.join(HASH_PART_SEP);
						}
					} else changeChapter();
				} else changeChapter();
			};

			const renderNavButtons = (isTop) => {
				const tdStlye = `padding-${isTop ? "top" : "bottom"}: 6px; padding-left: 9px; padding-right: 9px;`;
				const $wrpControls = $(`<div class="split"/>`).appendTo($(`<td colspan="6" style="${tdStlye}"/>`).appendTo($(`<tr/>`).appendTo(BookUtil.renderArea)));

				const showPrev = chapter > 0;
				(BookUtil.curRender.controls.$btnsPrv = BookUtil.curRender.controls.$btnsPrv || [])
					.push($(`<button class="btn btn-xs btn-default"><span class="glyphicon glyphicon-chevron-left"></span>Previous</button>`)
						.click(() => goToPage(-1))
						.toggle(showPrev)
						.appendTo($wrpControls));
				(BookUtil.curRender.controls.$divsPrv = BookUtil.curRender.controls.$divsPrv || [])
					.push($(`<div/>`)
						.toggle(!showPrev)
						.appendTo($wrpControls));

				if (!isTop) $(`<button class="btn btn-xs btn-default">Back to Top</button>`).click(() => MiscUtil.scrollPageTop()).appendTo($wrpControls);

				const showNxt = chapter < data.length - 1;
				(BookUtil.curRender.controls.$btnsNxt = BookUtil.curRender.controls.$btnsNxt || [])
					.push($(`<button class="btn btn-xs btn-default">Next<span class="glyphicon glyphicon-chevron-right"></span></button>`)
						.click(() => goToPage(1))
						.toggle(showNxt)
						.appendTo($wrpControls));
				(BookUtil.curRender.controls.$divsNxt = BookUtil.curRender.controls.$divNxt || [])
					.push($(`<div/>`)
						.toggle(!showNxt)
						.appendTo($wrpControls));
			};

			BookUtil.curRender.controls = {};
			BookUtil.renderArea.append(EntryRenderer.utils.getBorderTr());
			renderNavButtons(true);
			const textStack = [];
			BookUtil._renderer.setFirstSection(true);
			BookUtil._renderer.resetHeaderIndex();
			BookUtil._renderer.recursiveEntryRender(data[chapter], textStack);
			BookUtil.renderArea.append(`<tr class="text"><td colspan="6">${textStack.join("")}</td></tr>`);
			renderNavButtons();

			BookUtil.renderArea.append(EntryRenderer.utils.getBorderTr());

			if (scrollTo) {
				let handled = false;
				if (BookUtil.referenceId) handled = handleQuickReferenceShow(scrollTo);
				if (!handled) {
					setTimeout(() => {
						BookUtil.scrollClick(scrollTo, scrollIndex);
					}, BookUtil.isHashReload ? 1 : 75);
					BookUtil.isHashReload = false;
				}
			}
		} else {
			if (hashParts.length <= 1) {
				if (BookUtil.referenceId) MiscUtil.scrollPageTop();
				else BookUtil.scrollPageTop();
			} else if (forceScroll) BookUtil.scrollClick(scrollTo, scrollIndex);
		}

		(function updateControls () {
			if (BookUtil.referenceId) {
				const cnt = BookUtil.curRender.controls;

				const chap = BookUtil.curRender.fromIndex.contents[chapter];
				const getHeaderIx = () => {
					return chap.headers.findIndex(it => it.toLowerCase() === BookUtil.curRender.lastRefHeader);
				};

				const headerIx = getHeaderIx();
				const renderPrev = chapter > 0 || (~headerIx && headerIx > 0);
				const renderNxt = chapter < data.length - 1 || (~headerIx && headerIx < chap.headers.length - 1);
				cnt.$btnsPrv.forEach($it => $it.toggle(renderPrev));
				cnt.$btnsNxt.forEach($it => $it.toggle(renderNxt));
				cnt.$divsPrv.forEach($it => $it.toggle(!renderPrev));
				cnt.$divsNxt.forEach($it => $it.toggle(!renderNxt));
			}
		})();
	},

	indexListToggle: (evt, ele) => {
		if (evt) {
			evt.stopPropagation();
			evt.preventDefault();
		}
		const $ele = $(ele);
		const $childList = $ele.closest(`li`).find(`ul.bk-contents`);
		if ($ele.data("hidden")) {
			$childList.show();
			$ele.data("hidden", false);
			$ele.html(`[\u2013]`);
		} else {
			$childList.hide();
			$ele.data("hidden", true);
			$ele.html(`[+]`);
		}
	},

	initLinkGrabbers () {
		const $body = $(`body`);
		$body.on(`mousedown`, `.entry-title-inner`, function (evt) {
			evt.preventDefault();
		});
		$body.on(`click`, `.entry-title-inner`, function (evt) {
			const $this = $(this);
			const text = $this.text().replace(/\.$/, "");

			if (evt.shiftKey) {
				copyText(text);
				showCopiedEffect($this);
			} else {
				const toCopy = [`${window.location.href.split("#")[0]}#${BookUtil.curRender.curAdvId}`, BookUtil.curRender.chapter, text, $this.parent().data("title-relative-index")];
				copyText(toCopy.join(HASH_PART_SEP));
				showCopiedEffect($this, "Copied link!");
			}
		});
	},

	baseDataUrl: "",
	bookIndex: [],
	homebrewIndex: null,
	homebrewData: null,
	renderArea: null,
	referenceId: false,
	isHashReload: false,
	// custom loading to serve multiple sources
	booksHashChange: () => {
		function cleanName (name) {
			// prevent TftYP names from causing the header to wrap
			return name.includes(Parser.SOURCE_JSON_TO_FULL[SRC_TYP]) ? name.replace(Parser.SOURCE_JSON_TO_FULL[SRC_TYP], Parser.sourceJsonToAbv(SRC_TYP)) : name;
		}

		function handleFound (fromIndex, homebrewData) {
			document.title = `${fromIndex.name} - 5etools`;
			$(`.book-head-header`).html(cleanName(fromIndex.name));
			$(`.book-head-message`).html("Browse content. Press F to find.");
			BookUtil.loadBook(fromIndex, bookId, hashParts, homebrewData);
			currentPage();
		}

		function handleNotFound () {
			if (!window.location.hash) window.history.back();
			else {
				$(`.initial-message`).text(`Loading failed\u2014could not find a book with id "${bookId}"`);
				throw new Error(`No book with ID: ${bookId}`);
			}
		}

		const [bookId, ...hashParts] = window.location.hash.slice(1).split(HASH_PART_SEP);
		const fromIndex = BookUtil.bookIndex.find(bk => UrlUtil.encodeForHash(bk.id) === UrlUtil.encodeForHash(bookId));
		if (fromIndex && !fromIndex.uniqueId) handleFound(fromIndex);
		else if (fromIndex && fromIndex.uniqueId) { // it's homebrew
			BrewUtil.pAddBrewData() // to load existing data
				.then((brew) => {
					if (!brew[BookUtil.homebrewData]) handleNotFound();
					const bookData = (brew[BookUtil.homebrewData] || []).find(bk => UrlUtil.encodeForHash(bk.id) === UrlUtil.encodeForHash(bookId));
					if (!bookData) handleNotFound();
					handleFound(fromIndex, bookData);
				})
				.catch(() => {
					BrewUtil.purgeBrew();
					handleNotFound();
				});
		} else handleNotFound();
	},

	_renderer: new EntryRenderer().setEnumerateTitlesRel(true),
	loadBook: (fromIndex, bookId, hashParts, homebrewData) => {
		function doPopulate (data) {
			const allContents = $(`.contents-item`);
			BookUtil.thisContents = allContents.filter(`[data-bookid="${UrlUtil.encodeForHash(bookId)}"]`);
			BookUtil.thisContents.show();
			allContents.filter(`[data-bookid!="${UrlUtil.encodeForHash(bookId)}"]`).hide();
			BookUtil.showBookContent(BookUtil.referenceId ? data.data[BookUtil.referenceId] : data.data, fromIndex, bookId, hashParts);
			BookUtil.addSearch(fromIndex, bookId);
		}

		if (homebrewData) {
			doPopulate(homebrewData);
		} else {
			DataUtil.loadJSON(`${BookUtil.baseDataUrl}${bookId.toLowerCase()}.json`).then(doPopulate);
		}
	},

	_$body: null,
	_$findAll: null,
	_headerCounts: null,
	_lastHighlight: null,
	addSearch: (indexData, bookId) => {
		function getHash (found) {
			return `${UrlUtil.encodeForHash(bookId)}${HASH_PART_SEP}${found.ch}${found.header ? `${HASH_PART_SEP}${UrlUtil.encodeForHash(found.header)}${HASH_PART_SEP}${found.headerIndex}` : ""}`
		}

		BookUtil._$body = BookUtil._$body || $(`body`);

		BookUtil._$body.on("click", () => {
			if (BookUtil._$findAll) BookUtil._$findAll.remove();
		});

		BookUtil._$body.off("keypress");
		BookUtil._$body.on("keypress", (e) => {
			const handleReNav = (ele) => {
				const hash = window.location.hash.slice(1).toLowerCase();
				const linkHash = $(ele).attr("href").slice(1).toLowerCase();
				if (hash === linkHash) {
					BookUtil.isHashReload = true;
					BookUtil.booksHashChange();
				}
			};

			if ((e.key === "f" && noModifierKeys(e))) {
				if (MiscUtil.isInInput(e)) return;
				$(`span.temp`).contents().unwrap();
				BookUtil._lastHighlight = null;
				if (BookUtil._$findAll) BookUtil._$findAll.remove();
				BookUtil._$findAll = $(`<div class="f-all-wrapper"/>`).on("click", (e) => {
					e.stopPropagation();
				});

				const $results = $(`<div class="f-all-out">`);
				const $srch = $(`<input class="form-control" placeholder="Find text...">`).on("keypress", (e) => {
					e.stopPropagation();
					if (e.key === "Enter" && noModifierKeys(e)) {
						$results.html("");
						const found = [];
						const toSearch = BookUtil.curRender.data;
						toSearch.forEach((section, i) => {
							BookUtil._headerCounts = {};
							searchEntriesFor(i, "", found, $srch.val(), section)
						});
						if (found.length) {
							$results.show();
							found.forEach(f => {
								const $row = $(`<p class="f-result"/>`);
								const $ptLink = $(`<span/>`);
								const $link = $(
									`<a href="#${getHash(f)}">
									<i>${BookUtil.getOrdinalText(indexData.contents[f.ch].ordinal)} ${indexData.contents[f.ch].name}${f.header ? ` \u2013 ${f.headerMatches ? `<span class="highlight">` : ""}${f.header}${f.headerMatches ? `</span>` : ""}` : ""}</i>
								</a>`
								);
								$ptLink.append($link);
								$row.append($ptLink);

								if (f.previews) {
									const $ptPreviews = $(`<a href="#${getHash(f)}"/>`).click(function () {
										handleReNav(this);
									});
									const re = new RegExp(RegExp.escape(f.term), "gi");

									$ptPreviews.on("click", () => {
										setTimeout(() => {
											if (BookUtil._lastHighlight === null || BookUtil._lastHighlight !== f.term.toLowerCase()) {
												BookUtil._lastHighlight = f.term;
												$(`#pagecontent`)
													.find(`p:containsInsensitive("${f.term}"), li:containsInsensitive("${f.term}"), td:containsInsensitive("${f.term}"), a:containsInsensitive("${f.term}")`)
													.each((i, ele) => {
														$(ele).html($(ele).html().replace(re, "<span class='temp highlight'>$&</span>"))
													});
											}
										}, 15)
									});

									$ptPreviews.append(`<span>${f.previews[0]}</span>`);
									if (f.previews[1]) {
										$ptPreviews.append(" ... ");
										$ptPreviews.append(`<span>${f.previews[1]}</span>`);
									}
									$row.append($ptPreviews);

									$link.on("click", () => $ptPreviews.click());
								} else {
									$link.click(function () {
										handleReNav(this);
									});
								}

								$results.append($row);
							});
						} else {
							$results.hide();
						}
					}
				});
				BookUtil._$findAll.append($srch).append($results);

				BookUtil._$body.append(BookUtil._$findAll);

				$srch.focus();
				// because somehow creating an input box from an event and then focusing it adds the "f" character? :joy:
				setTimeout(() => {
					$srch.val("");
				}, 5)
			}
		});

		function isNamedEntry (obj) {
			return obj.name && (obj.type === "entries" || obj.type === "inset" || obj.type === "section");
		}

		const EXTRA_WORDS = 2;
		function searchEntriesFor (chapterIndex, prevLastName, appendTo, term, obj) {
			if (term === undefined || term === null) return;
			const cleanTerm = term.toLowerCase().trim();
			if (!cleanTerm) return;

			if (isNamedEntry(obj)) {
				if (BookUtil._headerCounts[obj.name] === undefined) BookUtil._headerCounts[obj.name] = 0;
				else BookUtil._headerCounts[obj.name]++;
			}
			let lastName;
			if (isNamedEntry(obj)) {
				lastName = obj.name;
				if (lastName.toLowerCase().includes(cleanTerm)) {
					appendTo.push({
						ch: chapterIndex,
						header: lastName,
						headerIndex: BookUtil._headerCounts[lastName],
						term: term.trim(),
						headerMatches: true
					});
				}
			} else {
				lastName = prevLastName;
			}
			if (obj.entries) {
				obj.entries.forEach(e => searchEntriesFor(chapterIndex, lastName, appendTo, term, e))
			} else if (obj.items) {
				obj.items.forEach(e => searchEntriesFor(chapterIndex, lastName, appendTo, term, e))
			} else if (obj.rows) {
				obj.rows.forEach(r => {
					const toSearch = r.row ? r.row : r;
					toSearch.forEach(c => searchEntriesFor(chapterIndex, lastName, appendTo, term, c));
				})
			} else if (obj.entry) {
				searchEntriesFor(chapterIndex, lastName, appendTo, term, obj.entry)
			} else if (typeof obj === "string" || typeof obj === "number") {
				const renderStack = [];
				BookUtil._renderer.recursiveEntryRender(obj, renderStack);
				const rendered = $(`<p>${renderStack.join("")}</p>`).text();

				const toCheck = typeof obj === "number" ? String(rendered) : rendered.toLowerCase();
				if (toCheck.includes(cleanTerm)) {
					if (!appendTo.length || (!(appendTo[appendTo.length - 1].header === lastName && appendTo[appendTo.length - 1].headerIndex === BookUtil._headerCounts[lastName] && appendTo[appendTo.length - 1].previews))) {
						const first = toCheck.indexOf(cleanTerm);
						const last = toCheck.lastIndexOf(cleanTerm);

						const slices = [];
						if (first === last) {
							slices.push(getSubstring(rendered, first, first));
						} else {
							slices.push(getSubstring(rendered, first, first + cleanTerm.length));
							slices.push(getSubstring(rendered, last, last + cleanTerm.length));
						}
						appendTo.push({
							ch: chapterIndex,
							header: lastName,
							headerIndex: BookUtil._headerCounts[lastName],
							previews: slices.map(s => s.preview),
							term: term.trim(),
							matches: slices.map(s => s.match),
							headerMatches: lastName.toLowerCase().includes(cleanTerm)
						});
					} else {
						const last = toCheck.lastIndexOf(cleanTerm);
						const slice = getSubstring(rendered, last, last + cleanTerm.length);
						const lastItem = appendTo[appendTo.length - 1];
						lastItem.previews[1] = slice.preview;
						lastItem.matches[1] = slice.match;
					}
				}
			} else if (!(obj.type === "image" || obj.type === "gallery" || obj.type === "link" || obj.type === "abilityGeneric")) {
				throw new Error("Unhandled entity type")
			}

			function getSubstring (rendered, first, last) {
				let spaceCount = 0;
				let braceCount = 0;
				let pre = "";
				let i = first - 1;
				for (; i >= 0; --i) {
					pre = rendered.charAt(i) + pre;
					if (rendered.charAt(i) === " " && braceCount === 0) {
						spaceCount++;
					}
					if (spaceCount > EXTRA_WORDS) {
						break;
					}
				}
				pre = pre.trimStart();
				const preDots = i > 0;

				spaceCount = 0;
				let post = "";
				const start = first === last ? last + cleanTerm.length : last;
				i = Math.min(start, rendered.length);
				for (; i < rendered.length; ++i) {
					post += rendered.charAt(i);
					if (rendered.charAt(i) === " " && braceCount === 0) {
						spaceCount++;
					}
					if (spaceCount > EXTRA_WORDS) {
						break;
					}
				}
				post = post.trimEnd();
				const postDots = i < rendered.length;

				const originalTerm = rendered.substr(first, term.length);

				return {
					preview: `${preDots ? "..." : ""}${pre}<span class="highlight">${originalTerm}</span>${post}${postDots ? "..." : ""}`,
					match: `${pre}${term}${post}`
				};
			}
		}
	}
};