/*!
 * VERSION: beta 0.3.4
 * DATE: 2015-08-15
 * UPDATES AND DOCS AT: http://greensock.com
 *
 * @license Copyright (c) 2008-2015, GreenSock. All rights reserved.
 * SplitText is a Club GreenSock membership benefit; You must have a valid membership to use
 * this code without violating the terms of use. Visit http://www.greensock.com/club/ to sign up or get more details.
 * This work is subject to the software agreement that was issued with your membership.
 * 
 * @author: Jack Doyle, jack@greensock.com
 */
var _gsScope = (typeof(module) !== "undefined" && module.exports && typeof(global) !== "undefined") ? global : this || window; //helps ensure compatibility with AMD/RequireJS and CommonJS/Node
(function(window) {
	
	"use strict";
	var _globals = window.GreenSockGlobals || window,
		_namespace = function(ns) {
			var a = ns.split("."),
				p = _globals, i;
			for (i = 0; i < a.length; i++) {
				p[a[i]] = p = p[a[i]] || {};
			}
			return p;
		},
		pkg = _namespace("com.greensock.utils"),
		_getText = function(e) {
			var type = e.nodeType,
				result = "";
			if (type === 1 || type === 9 || type === 11) {
				if (typeof(e.textContent) === "string") {
					return e.textContent;
				} else {
					for ( e = e.firstChild; e; e = e.nextSibling ) {
						result += _getText(e);
					}
				}
			} else if (type === 3 || type === 4) {
				return e.nodeValue;
			}
			return result;
		},
		_doc = document,
		_getComputedStyle = _doc.defaultView ? _doc.defaultView.getComputedStyle : function() {},
		_capsExp = /([A-Z])/g,
		_getStyle = function(t, p, cs, str) {
			var result;
			if ((cs = cs || _getComputedStyle(t, null))) {
				t = cs.getPropertyValue(p.replace(_capsExp, "-$1").toLowerCase());
				result = (t || cs.length) ? t : cs[p]; //Opera behaves VERY strangely - length is usually 0 and cs[p] is the only way to get accurate results EXCEPT when checking for -o-transform which only works with cs.getPropertyValue()!
			} else if (t.currentStyle) {
				cs = t.currentStyle;
				result = cs[p];
			}
			return str ? result : parseInt(result, 10) || 0;
		},
		_isArrayLike = function(e) {
			return (e.length && e[0] && ((e[0].nodeType && e[0].style && !e.nodeType) || (e[0].length && e[0][0]))) ? true : false; //could be an array of jQuery objects too, so accommodate that.
		},
		_flattenArray = function(a) {
			var result = [],
				l = a.length,
				i, e, j;
			for (i = 0; i < l; i++) {
				e = a[i];
				if (_isArrayLike(e)) {
					j = e.length;
					for (j = 0; j < e.length; j++) {
						result.push(e[j]);
					}
				} else {
					result.push(e);
				}
			}
			return result;
		},
		_brSwap = ")eefec303079ad17405c",
		_brExp = /(?:<br>|<br\/>|<br \/>)/gi,
		_isOldIE = (_doc.all && !_doc.addEventListener),
		_divStart = "<div style='position:relative;display:inline-block;" + (_isOldIE ? "*display:inline;*zoom:1;'" : "'"), //note: we must use both display:inline-block and *display:inline for IE8 and earlier, otherwise it won't flow correctly (and if we only use display:inline, IE won't render most of the property tweens - very odd).
		_cssClassFunc = function(cssClass) {
			cssClass = cssClass || "";
			var iterate = (cssClass.indexOf("++") !== -1),
				num = 1;
			if (iterate) {
				cssClass = cssClass.split("++").join("");
			}
			return function() {
				return _divStart + (cssClass ? " class='" + cssClass + (iterate ? num++ : "") + "'>" : ">");
			};
		},
		SplitText = pkg.SplitText = _globals.SplitText = function(element, vars) {
			if (typeof(element) === "string") {
				element = SplitText.selector(element);
			}
			if (!element) {
				throw("cannot split a null element.");
			}
			this.elements = _isArrayLike(element) ? _flattenArray(element) : [element];
			this.chars = [];
			this.words = [];
			this.lines = [];
			this._originals = [];
			this.vars = vars || {};
			this.split(vars);
		},
		_swapText = function(element, oldText, newText) {
			var type = element.nodeType;
			if (type === 1 || type === 9 || type === 11) {
				for ( element = element.firstChild; element; element = element.nextSibling ) {
					_swapText(element, oldText, newText);
				}
			} else if (type === 3 || type === 4) {
				element.nodeValue = element.nodeValue.split(oldText).join(newText);
			}
		},
		_pushReversed = function(a, merge) {
			var i = merge.length;
			while (--i > -1) {
				a.push(merge[i]);
			}
		},
		_split = function(element, vars, allChars, allWords, allLines) {
			if (_brExp.test(element.innerHTML)) {
				element.innerHTML = element.innerHTML.replace(_brExp, _brSwap); //swap in a unique string for <br/> tags so that we can identify it when we loop through later, and replace it appropriately
			}
			var text = _getText(element),
				types = vars.type || vars.split || "chars,words,lines",
				lines = (types.indexOf("lines") !== -1) ? [] : null,
				words = (types.indexOf("words") !== -1),
				chars = (types.indexOf("chars") !== -1),
				absolute = (vars.position === "absolute" || vars.absolute === true),
				space = absolute ? "&#173; " : " ",
				lineOffsetY = -999,
				cs = _getComputedStyle(element),
				paddingLeft = _getStyle(element, "paddingLeft", cs),
				borderTopAndBottom = _getStyle(element, "borderBottomWidth", cs) + _getStyle(element, "borderTopWidth", cs),
				borderLeftAndRight = _getStyle(element, "borderLeftWidth", cs) + _getStyle(element, "borderRightWidth", cs),
				padTopAndBottom = _getStyle(element, "paddingTop", cs) + _getStyle(element, "paddingBottom", cs),
				padLeftAndRight = _getStyle(element, "paddingLeft", cs) + _getStyle(element, "paddingRight", cs),
				textAlign = _getStyle(element, "textAlign", cs, true),
				origHeight = element.clientHeight,
				origWidth = element.clientWidth,
				wordEnd = "</div>",
				wordStart = _cssClassFunc(vars.wordsClass),
				charStart = _cssClassFunc(vars.charsClass),
				iterateLine = ((vars.linesClass || "").indexOf("++") !== -1),
				linesClass = vars.linesClass,
				hasTagStart = text.indexOf("<") !== -1,
				wordIsOpen = true,
				charArray = [],
				wordArray = [],
				lineArray = [],
				l, curLine, isChild, splitText, i, j, character, nodes, node, offset, lineNode, style, lineWidth, addWordSpaces;

			if (iterateLine) {
				linesClass = linesClass.split("++").join("");
			}
			if (hasTagStart) {
				text = text.split("<").join("{{LT}}"); //we can't leave "<" in the string, or when we set the innerHTML, it can be interpreted as
			}
			l = text.length;

			splitText = wordStart();
			for (i = 0; i < l; i++) {
				character = text.charAt(i);
				if (character === ")" && text.substr(i, 20) === _brSwap) {
					splitText += (wordIsOpen ? wordEnd : "") + "<BR/>";
					wordIsOpen = false;
					if (i !== l - 20 && text.substr(i+20, 20) !== _brSwap) {
						splitText += " " + wordStart();
						wordIsOpen = true;
					}
					i += 19;

				} else if (character === " " && text.charAt(i-1) !== " " && i !== l-1 && text.substr(i-20, 20) !== _brSwap) {
					splitText += wordIsOpen ? wordEnd : "";
					wordIsOpen = false;
					while (text.charAt(i + 1) === " ") { //skip over empty spaces (to avoid making them words)
						splitText += space;
						i++;
					}
					if (text.charAt(i + 1) !== ")" || text.substr(i + 1, 20) !== _brSwap) {
						splitText += space + wordStart();
						wordIsOpen = true;
					}

				} else if (character === "{" && text.substr(i, 6) === "{{LT}}") {
					splitText +=  chars ? charStart() + "{{LT}}" + "</div>" : "{{LT}}";
					i += 5;
				} else {
					splitText += (chars && character !== " ") ? charStart() + character + "</div>" : character;
				}
			}
			element.innerHTML = splitText + (wordIsOpen ? wordEnd : "");

			if (hasTagStart) {
				_swapText(element, "{{LT}}", "<");
			}
			//copy all the descendant nodes into an array (we can't use a regular nodeList because it's live and we may need to renest things)
			j = element.getElementsByTagName("*");
			l = j.length;
			nodes = [];
			for (i = 0; i < l; i++) {
				nodes[i] = j[i];
			}

			//for absolute positioning, we need to record the x/y offsets and width/height for every <div>. And even if we're not positioning things absolutely, in order to accommodate lines, we must figure out where the y offset changes so that we can sense where the lines break, and we populate the lines array.
			if (lines || absolute) {
				for (i = 0; i < l; i++) {
					node = nodes[i];
					isChild = (node.parentNode === element);
					if (isChild || absolute || (chars && !words)) {
					 	offset = node.offsetTop;
						if (lines && isChild && offset !== lineOffsetY && node.nodeName !== "BR") {
							curLine = [];
							lines.push(curLine);
							lineOffsetY = offset;
						}
						if (absolute) { //record offset x and y, as well as width and height so that we can access them later for positioning. Grabbing them at once ensures we don't trigger a browser paint & we maximize performance.
							node._x = node.offsetLeft;
							node._y = offset;
							node._w = node.offsetWidth;
							node._h = node.offsetHeight;
						}
						if (lines) {
							if (words === isChild || !chars) {
								curLine.push(node);
								node._x -= paddingLeft;
							}
							if (isChild && i) {
								nodes[i-1]._wordEnd = true;
							}
							if (node.nodeName === "BR" && node.nextSibling && node.nextSibling.nodeName === "BR") { //two consecutive <br> tags signify a new [empty] line.
								lines.push([]);
							}
						}
					}
				}
			}

			for (i = 0; i < l; i++) {
				node = nodes[i];
				isChild = (node.parentNode === element);
				if (node.nodeName === "BR") {
					if (lines || absolute) {
						element.removeChild(node);
						nodes.splice(i--, 1);
						l--;
					} else if (!words) {
						element.appendChild(node);
					}
					continue;
				}

				if (absolute) {
					style = node.style;
					if (!words && !isChild) {
						node._x += node.parentNode._x;
						node._y += node.parentNode._y;
					}
					style.left = node._x + "px";
					style.top = node._y + "px";
					style.position = "absolute";
					style.display = "block";
					//if we don't set the width/height, things collapse in older versions of IE and the origin for transforms is thrown off in all browsers.
					style.width = (node._w + 1) + "px"; //IE is 1px short sometimes. Avoid wrapping
					style.height = node._h + "px";
				}

				if (!words) {
					//we always start out wrapping words in their own <div> so that line breaks happen correctly, but here we'll remove those <div> tags if necessary and renest the characters directly into the element rather than inside the word <div>
					if (isChild) {
						element.removeChild(node);
						nodes.splice(i--, 1);
						l--;
					} else if (!isChild && chars) {
						offset = (!lines && !absolute && node.nextSibling); //if this is the last letter in the word (and we're not breaking by lines and not positioning things absolutely), we need to add a space afterwards so that the characters don't just mash together
						element.appendChild(node);
						if (!offset) {
							element.appendChild(_doc.createTextNode(" "));
						}
						charArray.push(node); //TODO: push()
					}
				} else if (isChild && node.innerHTML !== "") {
					wordArray.push(node);  //TODO: push()
				} else if (chars) {
					charArray.push(node);  //TODO: push()
				}
			}

			if (lines) {
				//the next 7 lines just give us the line width in the most reliable way and figure out the left offset (if position isn't relative or absolute). We must set the width along with text-align to ensure everything works properly for various alignments.
				if (absolute) {
					lineNode = _doc.createElement("div");
					element.appendChild(lineNode);
					lineWidth = lineNode.offsetWidth + "px";
					offset = (lineNode.offsetParent === element) ? 0 : element.offsetLeft;
					element.removeChild(lineNode);
				}
				style = element.style.cssText;
				element.style.cssText = "display:none;"; //to improve performance, set display:none on the element so that the browser doesn't have to worry about reflowing or rendering while we're renesting things. We'll revert the cssText later.
				//we can't use element.innerHTML = "" because that causes IE to literally delete all the nodes and their content even though we've stored them in an array! So we must loop through the children and remove them.
				while (element.firstChild) {
					element.removeChild(element.firstChild);
				}
				addWordSpaces = (!absolute || (!words && !chars));
				for (i = 0; i < lines.length; i++) {
					curLine = lines[i];
					lineNode = _doc.createElement("div");
					lineNode.style.cssText = "display:block;text-align:" + textAlign + ";position:" + (absolute ? "absolute;" : "relative;");
					if (linesClass) {
						lineNode.className = linesClass + (iterateLine ? i+1 : "");
					}
					lineArray.push(lineNode);  //TODO: push()
					l = curLine.length;
					for (j = 0; j < l; j++) {
						if (curLine[j].nodeName !== "BR") {
							node = curLine[j];
							lineNode.appendChild(node);
							if (addWordSpaces && (node._wordEnd || words)) {
								lineNode.appendChild(_doc.createTextNode(" "));
							}
							if (absolute) {
								if (j === 0) {
									lineNode.style.top = node._y + "px";
									lineNode.style.left = (paddingLeft + offset) + "px";
								}
								node.style.top = "0px";
								if (offset) {
									node.style.left = (node._x - offset) + "px";
								}
							}
						}
					}
					if (l === 0) { //if there are no nodes in the line (typically meaning there were two consecutive <br> tags, just add a non-breaking space so that things display properly.
						lineNode.innerHTML = "&nbsp;";
					}
					if (!words && !chars) {
						lineNode.innerHTML = _getText(lineNode).split(String.fromCharCode(160)).join(" ");
					}
					if (absolute) {
						lineNode.style.width = lineWidth;
						lineNode.style.height = node._h + "px";
					}
					element.appendChild(lineNode);
				}
				element.style.cssText = style;
			}

			//if everything shifts to being position:absolute, the container can collapse in terms of height or width, so fix that here.
			if (absolute) {
				if (origHeight > element.clientHeight) {
					element.style.height = (origHeight - padTopAndBottom) + "px";
					if (element.clientHeight < origHeight) { //IE8 and earlier use a different box model - we must include padding and borders
						element.style.height = (origHeight + borderTopAndBottom)+ "px";
					}
				}
				if (origWidth > element.clientWidth) {
					element.style.width = (origWidth - padLeftAndRight) + "px";
					if (element.clientWidth < origWidth) { //IE8 and earlier use a different box model - we must include padding and borders
						element.style.width = (origWidth + borderLeftAndRight)+ "px";
					}
				}
			}
			_pushReversed(allChars, charArray);
			_pushReversed(allWords, wordArray);
			_pushReversed(allLines, lineArray);
		},
		p = SplitText.prototype;

	p.split = function(vars) {
		if (this.isSplit) {
			this.revert();
		}
		this.vars = vars || this.vars;
		this._originals.length = this.chars.length = this.words.length = this.lines.length = 0;
		var i = this.elements.length;
		//we split in reversed order so that if/when we position:absolute elements, they don't affect the position of the ones after them in the document flow (shifting them up as they're taken out of the document flow).
		while (--i > -1) {
			this._originals[i] = this.elements[i].innerHTML;
			_split(this.elements[i], this.vars, this.chars, this.words, this.lines);
		}
		this.chars.reverse();
		this.words.reverse();
		this.lines.reverse();
		this.isSplit = true;
		return this;
	};

	p.revert = function() {
		if (!this._originals) {
			throw("revert() call wasn't scoped properly.");
		}
		var i = this._originals.length;
		while (--i > -1) {
			this.elements[i].innerHTML = this._originals[i];
		}
		this.chars = [];
		this.words = [];
		this.lines = [];
		this.isSplit = false;
		return this;
	};

	SplitText.selector = window.$ || window.jQuery || function(e) {
		var selector = window.$ || window.jQuery;
		if (selector) {
			SplitText.selector = selector;
			return selector(e);
		}
		return (typeof(document) === "undefined") ? e : (document.querySelectorAll ? document.querySelectorAll(e) : document.getElementById((e.charAt(0) === "#") ? e.substr(1) : e));
	};
	SplitText.version = "0.3.4";
	
})(_gsScope);

//export to AMD/RequireJS and CommonJS/Node (precursor to full modular build system coming at a later date)
(function(name) {
	"use strict";
	var getGlobal = function() {
		return (_gsScope.GreenSockGlobals || _gsScope)[name];
	};
	if (typeof(define) === "function" && define.amd) { //AMD
		define(["TweenLite"], getGlobal);
	} else if (typeof(module) !== "undefined" && module.exports) { //node
		module.exports = getGlobal();
	}
}("SplitText"));
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiIiwic291cmNlcyI6WyJ2ZW5kb3IvU3BsaXRUZXh0LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIVxuICogVkVSU0lPTjogYmV0YSAwLjMuNFxuICogREFURTogMjAxNS0wOC0xNVxuICogVVBEQVRFUyBBTkQgRE9DUyBBVDogaHR0cDovL2dyZWVuc29jay5jb21cbiAqXG4gKiBAbGljZW5zZSBDb3B5cmlnaHQgKGMpIDIwMDgtMjAxNSwgR3JlZW5Tb2NrLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICogU3BsaXRUZXh0IGlzIGEgQ2x1YiBHcmVlblNvY2sgbWVtYmVyc2hpcCBiZW5lZml0OyBZb3UgbXVzdCBoYXZlIGEgdmFsaWQgbWVtYmVyc2hpcCB0byB1c2VcbiAqIHRoaXMgY29kZSB3aXRob3V0IHZpb2xhdGluZyB0aGUgdGVybXMgb2YgdXNlLiBWaXNpdCBodHRwOi8vd3d3LmdyZWVuc29jay5jb20vY2x1Yi8gdG8gc2lnbiB1cCBvciBnZXQgbW9yZSBkZXRhaWxzLlxuICogVGhpcyB3b3JrIGlzIHN1YmplY3QgdG8gdGhlIHNvZnR3YXJlIGFncmVlbWVudCB0aGF0IHdhcyBpc3N1ZWQgd2l0aCB5b3VyIG1lbWJlcnNoaXAuXG4gKiBcbiAqIEBhdXRob3I6IEphY2sgRG95bGUsIGphY2tAZ3JlZW5zb2NrLmNvbVxuICovXG52YXIgX2dzU2NvcGUgPSAodHlwZW9mKG1vZHVsZSkgIT09IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlLmV4cG9ydHMgJiYgdHlwZW9mKGdsb2JhbCkgIT09IFwidW5kZWZpbmVkXCIpID8gZ2xvYmFsIDogdGhpcyB8fCB3aW5kb3c7IC8vaGVscHMgZW5zdXJlIGNvbXBhdGliaWxpdHkgd2l0aCBBTUQvUmVxdWlyZUpTIGFuZCBDb21tb25KUy9Ob2RlXG4oZnVuY3Rpb24od2luZG93KSB7XG5cdFxuXHRcInVzZSBzdHJpY3RcIjtcblx0dmFyIF9nbG9iYWxzID0gd2luZG93LkdyZWVuU29ja0dsb2JhbHMgfHwgd2luZG93LFxuXHRcdF9uYW1lc3BhY2UgPSBmdW5jdGlvbihucykge1xuXHRcdFx0dmFyIGEgPSBucy5zcGxpdChcIi5cIiksXG5cdFx0XHRcdHAgPSBfZ2xvYmFscywgaTtcblx0XHRcdGZvciAoaSA9IDA7IGkgPCBhLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHBbYVtpXV0gPSBwID0gcFthW2ldXSB8fCB7fTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBwO1xuXHRcdH0sXG5cdFx0cGtnID0gX25hbWVzcGFjZShcImNvbS5ncmVlbnNvY2sudXRpbHNcIiksXG5cdFx0X2dldFRleHQgPSBmdW5jdGlvbihlKSB7XG5cdFx0XHR2YXIgdHlwZSA9IGUubm9kZVR5cGUsXG5cdFx0XHRcdHJlc3VsdCA9IFwiXCI7XG5cdFx0XHRpZiAodHlwZSA9PT0gMSB8fCB0eXBlID09PSA5IHx8IHR5cGUgPT09IDExKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YoZS50ZXh0Q29udGVudCkgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0XHRyZXR1cm4gZS50ZXh0Q29udGVudDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRmb3IgKCBlID0gZS5maXJzdENoaWxkOyBlOyBlID0gZS5uZXh0U2libGluZyApIHtcblx0XHRcdFx0XHRcdHJlc3VsdCArPSBfZ2V0VGV4dChlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gMyB8fCB0eXBlID09PSA0KSB7XG5cdFx0XHRcdHJldHVybiBlLm5vZGVWYWx1ZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fSxcblx0XHRfZG9jID0gZG9jdW1lbnQsXG5cdFx0X2dldENvbXB1dGVkU3R5bGUgPSBfZG9jLmRlZmF1bHRWaWV3ID8gX2RvYy5kZWZhdWx0Vmlldy5nZXRDb21wdXRlZFN0eWxlIDogZnVuY3Rpb24oKSB7fSxcblx0XHRfY2Fwc0V4cCA9IC8oW0EtWl0pL2csXG5cdFx0X2dldFN0eWxlID0gZnVuY3Rpb24odCwgcCwgY3MsIHN0cikge1xuXHRcdFx0dmFyIHJlc3VsdDtcblx0XHRcdGlmICgoY3MgPSBjcyB8fCBfZ2V0Q29tcHV0ZWRTdHlsZSh0LCBudWxsKSkpIHtcblx0XHRcdFx0dCA9IGNzLmdldFByb3BlcnR5VmFsdWUocC5yZXBsYWNlKF9jYXBzRXhwLCBcIi0kMVwiKS50b0xvd2VyQ2FzZSgpKTtcblx0XHRcdFx0cmVzdWx0ID0gKHQgfHwgY3MubGVuZ3RoKSA/IHQgOiBjc1twXTsgLy9PcGVyYSBiZWhhdmVzIFZFUlkgc3RyYW5nZWx5IC0gbGVuZ3RoIGlzIHVzdWFsbHkgMCBhbmQgY3NbcF0gaXMgdGhlIG9ubHkgd2F5IHRvIGdldCBhY2N1cmF0ZSByZXN1bHRzIEVYQ0VQVCB3aGVuIGNoZWNraW5nIGZvciAtby10cmFuc2Zvcm0gd2hpY2ggb25seSB3b3JrcyB3aXRoIGNzLmdldFByb3BlcnR5VmFsdWUoKSFcblx0XHRcdH0gZWxzZSBpZiAodC5jdXJyZW50U3R5bGUpIHtcblx0XHRcdFx0Y3MgPSB0LmN1cnJlbnRTdHlsZTtcblx0XHRcdFx0cmVzdWx0ID0gY3NbcF07XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gc3RyID8gcmVzdWx0IDogcGFyc2VJbnQocmVzdWx0LCAxMCkgfHwgMDtcblx0XHR9LFxuXHRcdF9pc0FycmF5TGlrZSA9IGZ1bmN0aW9uKGUpIHtcblx0XHRcdHJldHVybiAoZS5sZW5ndGggJiYgZVswXSAmJiAoKGVbMF0ubm9kZVR5cGUgJiYgZVswXS5zdHlsZSAmJiAhZS5ub2RlVHlwZSkgfHwgKGVbMF0ubGVuZ3RoICYmIGVbMF1bMF0pKSkgPyB0cnVlIDogZmFsc2U7IC8vY291bGQgYmUgYW4gYXJyYXkgb2YgalF1ZXJ5IG9iamVjdHMgdG9vLCBzbyBhY2NvbW1vZGF0ZSB0aGF0LlxuXHRcdH0sXG5cdFx0X2ZsYXR0ZW5BcnJheSA9IGZ1bmN0aW9uKGEpIHtcblx0XHRcdHZhciByZXN1bHQgPSBbXSxcblx0XHRcdFx0bCA9IGEubGVuZ3RoLFxuXHRcdFx0XHRpLCBlLCBqO1xuXHRcdFx0Zm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuXHRcdFx0XHRlID0gYVtpXTtcblx0XHRcdFx0aWYgKF9pc0FycmF5TGlrZShlKSkge1xuXHRcdFx0XHRcdGogPSBlLmxlbmd0aDtcblx0XHRcdFx0XHRmb3IgKGogPSAwOyBqIDwgZS5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRcdFx0cmVzdWx0LnB1c2goZVtqXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJlc3VsdC5wdXNoKGUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH0sXG5cdFx0X2JyU3dhcCA9IFwiKWVlZmVjMzAzMDc5YWQxNzQwNWNcIixcblx0XHRfYnJFeHAgPSAvKD86PGJyPnw8YnJcXC8+fDxiciBcXC8+KS9naSxcblx0XHRfaXNPbGRJRSA9IChfZG9jLmFsbCAmJiAhX2RvYy5hZGRFdmVudExpc3RlbmVyKSxcblx0XHRfZGl2U3RhcnQgPSBcIjxkaXYgc3R5bGU9J3Bvc2l0aW9uOnJlbGF0aXZlO2Rpc3BsYXk6aW5saW5lLWJsb2NrO1wiICsgKF9pc09sZElFID8gXCIqZGlzcGxheTppbmxpbmU7Knpvb206MTsnXCIgOiBcIidcIiksIC8vbm90ZTogd2UgbXVzdCB1c2UgYm90aCBkaXNwbGF5OmlubGluZS1ibG9jayBhbmQgKmRpc3BsYXk6aW5saW5lIGZvciBJRTggYW5kIGVhcmxpZXIsIG90aGVyd2lzZSBpdCB3b24ndCBmbG93IGNvcnJlY3RseSAoYW5kIGlmIHdlIG9ubHkgdXNlIGRpc3BsYXk6aW5saW5lLCBJRSB3b24ndCByZW5kZXIgbW9zdCBvZiB0aGUgcHJvcGVydHkgdHdlZW5zIC0gdmVyeSBvZGQpLlxuXHRcdF9jc3NDbGFzc0Z1bmMgPSBmdW5jdGlvbihjc3NDbGFzcykge1xuXHRcdFx0Y3NzQ2xhc3MgPSBjc3NDbGFzcyB8fCBcIlwiO1xuXHRcdFx0dmFyIGl0ZXJhdGUgPSAoY3NzQ2xhc3MuaW5kZXhPZihcIisrXCIpICE9PSAtMSksXG5cdFx0XHRcdG51bSA9IDE7XG5cdFx0XHRpZiAoaXRlcmF0ZSkge1xuXHRcdFx0XHRjc3NDbGFzcyA9IGNzc0NsYXNzLnNwbGl0KFwiKytcIikuam9pbihcIlwiKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIF9kaXZTdGFydCArIChjc3NDbGFzcyA/IFwiIGNsYXNzPSdcIiArIGNzc0NsYXNzICsgKGl0ZXJhdGUgPyBudW0rKyA6IFwiXCIpICsgXCInPlwiIDogXCI+XCIpO1xuXHRcdFx0fTtcblx0XHR9LFxuXHRcdFNwbGl0VGV4dCA9IHBrZy5TcGxpdFRleHQgPSBfZ2xvYmFscy5TcGxpdFRleHQgPSBmdW5jdGlvbihlbGVtZW50LCB2YXJzKSB7XG5cdFx0XHRpZiAodHlwZW9mKGVsZW1lbnQpID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdGVsZW1lbnQgPSBTcGxpdFRleHQuc2VsZWN0b3IoZWxlbWVudCk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIWVsZW1lbnQpIHtcblx0XHRcdFx0dGhyb3coXCJjYW5ub3Qgc3BsaXQgYSBudWxsIGVsZW1lbnQuXCIpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5lbGVtZW50cyA9IF9pc0FycmF5TGlrZShlbGVtZW50KSA/IF9mbGF0dGVuQXJyYXkoZWxlbWVudCkgOiBbZWxlbWVudF07XG5cdFx0XHR0aGlzLmNoYXJzID0gW107XG5cdFx0XHR0aGlzLndvcmRzID0gW107XG5cdFx0XHR0aGlzLmxpbmVzID0gW107XG5cdFx0XHR0aGlzLl9vcmlnaW5hbHMgPSBbXTtcblx0XHRcdHRoaXMudmFycyA9IHZhcnMgfHwge307XG5cdFx0XHR0aGlzLnNwbGl0KHZhcnMpO1xuXHRcdH0sXG5cdFx0X3N3YXBUZXh0ID0gZnVuY3Rpb24oZWxlbWVudCwgb2xkVGV4dCwgbmV3VGV4dCkge1xuXHRcdFx0dmFyIHR5cGUgPSBlbGVtZW50Lm5vZGVUeXBlO1xuXHRcdFx0aWYgKHR5cGUgPT09IDEgfHwgdHlwZSA9PT0gOSB8fCB0eXBlID09PSAxMSkge1xuXHRcdFx0XHRmb3IgKCBlbGVtZW50ID0gZWxlbWVudC5maXJzdENoaWxkOyBlbGVtZW50OyBlbGVtZW50ID0gZWxlbWVudC5uZXh0U2libGluZyApIHtcblx0XHRcdFx0XHRfc3dhcFRleHQoZWxlbWVudCwgb2xkVGV4dCwgbmV3VGV4dCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gMyB8fCB0eXBlID09PSA0KSB7XG5cdFx0XHRcdGVsZW1lbnQubm9kZVZhbHVlID0gZWxlbWVudC5ub2RlVmFsdWUuc3BsaXQob2xkVGV4dCkuam9pbihuZXdUZXh0KTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdF9wdXNoUmV2ZXJzZWQgPSBmdW5jdGlvbihhLCBtZXJnZSkge1xuXHRcdFx0dmFyIGkgPSBtZXJnZS5sZW5ndGg7XG5cdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0YS5wdXNoKG1lcmdlW2ldKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdF9zcGxpdCA9IGZ1bmN0aW9uKGVsZW1lbnQsIHZhcnMsIGFsbENoYXJzLCBhbGxXb3JkcywgYWxsTGluZXMpIHtcblx0XHRcdGlmIChfYnJFeHAudGVzdChlbGVtZW50LmlubmVySFRNTCkpIHtcblx0XHRcdFx0ZWxlbWVudC5pbm5lckhUTUwgPSBlbGVtZW50LmlubmVySFRNTC5yZXBsYWNlKF9ickV4cCwgX2JyU3dhcCk7IC8vc3dhcCBpbiBhIHVuaXF1ZSBzdHJpbmcgZm9yIDxici8+IHRhZ3Mgc28gdGhhdCB3ZSBjYW4gaWRlbnRpZnkgaXQgd2hlbiB3ZSBsb29wIHRocm91Z2ggbGF0ZXIsIGFuZCByZXBsYWNlIGl0IGFwcHJvcHJpYXRlbHlcblx0XHRcdH1cblx0XHRcdHZhciB0ZXh0ID0gX2dldFRleHQoZWxlbWVudCksXG5cdFx0XHRcdHR5cGVzID0gdmFycy50eXBlIHx8IHZhcnMuc3BsaXQgfHwgXCJjaGFycyx3b3JkcyxsaW5lc1wiLFxuXHRcdFx0XHRsaW5lcyA9ICh0eXBlcy5pbmRleE9mKFwibGluZXNcIikgIT09IC0xKSA/IFtdIDogbnVsbCxcblx0XHRcdFx0d29yZHMgPSAodHlwZXMuaW5kZXhPZihcIndvcmRzXCIpICE9PSAtMSksXG5cdFx0XHRcdGNoYXJzID0gKHR5cGVzLmluZGV4T2YoXCJjaGFyc1wiKSAhPT0gLTEpLFxuXHRcdFx0XHRhYnNvbHV0ZSA9ICh2YXJzLnBvc2l0aW9uID09PSBcImFic29sdXRlXCIgfHwgdmFycy5hYnNvbHV0ZSA9PT0gdHJ1ZSksXG5cdFx0XHRcdHNwYWNlID0gYWJzb2x1dGUgPyBcIiYjMTczOyBcIiA6IFwiIFwiLFxuXHRcdFx0XHRsaW5lT2Zmc2V0WSA9IC05OTksXG5cdFx0XHRcdGNzID0gX2dldENvbXB1dGVkU3R5bGUoZWxlbWVudCksXG5cdFx0XHRcdHBhZGRpbmdMZWZ0ID0gX2dldFN0eWxlKGVsZW1lbnQsIFwicGFkZGluZ0xlZnRcIiwgY3MpLFxuXHRcdFx0XHRib3JkZXJUb3BBbmRCb3R0b20gPSBfZ2V0U3R5bGUoZWxlbWVudCwgXCJib3JkZXJCb3R0b21XaWR0aFwiLCBjcykgKyBfZ2V0U3R5bGUoZWxlbWVudCwgXCJib3JkZXJUb3BXaWR0aFwiLCBjcyksXG5cdFx0XHRcdGJvcmRlckxlZnRBbmRSaWdodCA9IF9nZXRTdHlsZShlbGVtZW50LCBcImJvcmRlckxlZnRXaWR0aFwiLCBjcykgKyBfZ2V0U3R5bGUoZWxlbWVudCwgXCJib3JkZXJSaWdodFdpZHRoXCIsIGNzKSxcblx0XHRcdFx0cGFkVG9wQW5kQm90dG9tID0gX2dldFN0eWxlKGVsZW1lbnQsIFwicGFkZGluZ1RvcFwiLCBjcykgKyBfZ2V0U3R5bGUoZWxlbWVudCwgXCJwYWRkaW5nQm90dG9tXCIsIGNzKSxcblx0XHRcdFx0cGFkTGVmdEFuZFJpZ2h0ID0gX2dldFN0eWxlKGVsZW1lbnQsIFwicGFkZGluZ0xlZnRcIiwgY3MpICsgX2dldFN0eWxlKGVsZW1lbnQsIFwicGFkZGluZ1JpZ2h0XCIsIGNzKSxcblx0XHRcdFx0dGV4dEFsaWduID0gX2dldFN0eWxlKGVsZW1lbnQsIFwidGV4dEFsaWduXCIsIGNzLCB0cnVlKSxcblx0XHRcdFx0b3JpZ0hlaWdodCA9IGVsZW1lbnQuY2xpZW50SGVpZ2h0LFxuXHRcdFx0XHRvcmlnV2lkdGggPSBlbGVtZW50LmNsaWVudFdpZHRoLFxuXHRcdFx0XHR3b3JkRW5kID0gXCI8L2Rpdj5cIixcblx0XHRcdFx0d29yZFN0YXJ0ID0gX2Nzc0NsYXNzRnVuYyh2YXJzLndvcmRzQ2xhc3MpLFxuXHRcdFx0XHRjaGFyU3RhcnQgPSBfY3NzQ2xhc3NGdW5jKHZhcnMuY2hhcnNDbGFzcyksXG5cdFx0XHRcdGl0ZXJhdGVMaW5lID0gKCh2YXJzLmxpbmVzQ2xhc3MgfHwgXCJcIikuaW5kZXhPZihcIisrXCIpICE9PSAtMSksXG5cdFx0XHRcdGxpbmVzQ2xhc3MgPSB2YXJzLmxpbmVzQ2xhc3MsXG5cdFx0XHRcdGhhc1RhZ1N0YXJ0ID0gdGV4dC5pbmRleE9mKFwiPFwiKSAhPT0gLTEsXG5cdFx0XHRcdHdvcmRJc09wZW4gPSB0cnVlLFxuXHRcdFx0XHRjaGFyQXJyYXkgPSBbXSxcblx0XHRcdFx0d29yZEFycmF5ID0gW10sXG5cdFx0XHRcdGxpbmVBcnJheSA9IFtdLFxuXHRcdFx0XHRsLCBjdXJMaW5lLCBpc0NoaWxkLCBzcGxpdFRleHQsIGksIGosIGNoYXJhY3Rlciwgbm9kZXMsIG5vZGUsIG9mZnNldCwgbGluZU5vZGUsIHN0eWxlLCBsaW5lV2lkdGgsIGFkZFdvcmRTcGFjZXM7XG5cblx0XHRcdGlmIChpdGVyYXRlTGluZSkge1xuXHRcdFx0XHRsaW5lc0NsYXNzID0gbGluZXNDbGFzcy5zcGxpdChcIisrXCIpLmpvaW4oXCJcIik7XG5cdFx0XHR9XG5cdFx0XHRpZiAoaGFzVGFnU3RhcnQpIHtcblx0XHRcdFx0dGV4dCA9IHRleHQuc3BsaXQoXCI8XCIpLmpvaW4oXCJ7e0xUfX1cIik7IC8vd2UgY2FuJ3QgbGVhdmUgXCI8XCIgaW4gdGhlIHN0cmluZywgb3Igd2hlbiB3ZSBzZXQgdGhlIGlubmVySFRNTCwgaXQgY2FuIGJlIGludGVycHJldGVkIGFzXG5cdFx0XHR9XG5cdFx0XHRsID0gdGV4dC5sZW5ndGg7XG5cblx0XHRcdHNwbGl0VGV4dCA9IHdvcmRTdGFydCgpO1xuXHRcdFx0Zm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuXHRcdFx0XHRjaGFyYWN0ZXIgPSB0ZXh0LmNoYXJBdChpKTtcblx0XHRcdFx0aWYgKGNoYXJhY3RlciA9PT0gXCIpXCIgJiYgdGV4dC5zdWJzdHIoaSwgMjApID09PSBfYnJTd2FwKSB7XG5cdFx0XHRcdFx0c3BsaXRUZXh0ICs9ICh3b3JkSXNPcGVuID8gd29yZEVuZCA6IFwiXCIpICsgXCI8QlIvPlwiO1xuXHRcdFx0XHRcdHdvcmRJc09wZW4gPSBmYWxzZTtcblx0XHRcdFx0XHRpZiAoaSAhPT0gbCAtIDIwICYmIHRleHQuc3Vic3RyKGkrMjAsIDIwKSAhPT0gX2JyU3dhcCkge1xuXHRcdFx0XHRcdFx0c3BsaXRUZXh0ICs9IFwiIFwiICsgd29yZFN0YXJ0KCk7XG5cdFx0XHRcdFx0XHR3b3JkSXNPcGVuID0gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aSArPSAxOTtcblxuXHRcdFx0XHR9IGVsc2UgaWYgKGNoYXJhY3RlciA9PT0gXCIgXCIgJiYgdGV4dC5jaGFyQXQoaS0xKSAhPT0gXCIgXCIgJiYgaSAhPT0gbC0xICYmIHRleHQuc3Vic3RyKGktMjAsIDIwKSAhPT0gX2JyU3dhcCkge1xuXHRcdFx0XHRcdHNwbGl0VGV4dCArPSB3b3JkSXNPcGVuID8gd29yZEVuZCA6IFwiXCI7XG5cdFx0XHRcdFx0d29yZElzT3BlbiA9IGZhbHNlO1xuXHRcdFx0XHRcdHdoaWxlICh0ZXh0LmNoYXJBdChpICsgMSkgPT09IFwiIFwiKSB7IC8vc2tpcCBvdmVyIGVtcHR5IHNwYWNlcyAodG8gYXZvaWQgbWFraW5nIHRoZW0gd29yZHMpXG5cdFx0XHRcdFx0XHRzcGxpdFRleHQgKz0gc3BhY2U7XG5cdFx0XHRcdFx0XHRpKys7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0ZXh0LmNoYXJBdChpICsgMSkgIT09IFwiKVwiIHx8IHRleHQuc3Vic3RyKGkgKyAxLCAyMCkgIT09IF9iclN3YXApIHtcblx0XHRcdFx0XHRcdHNwbGl0VGV4dCArPSBzcGFjZSArIHdvcmRTdGFydCgpO1xuXHRcdFx0XHRcdFx0d29yZElzT3BlbiA9IHRydWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0gZWxzZSBpZiAoY2hhcmFjdGVyID09PSBcIntcIiAmJiB0ZXh0LnN1YnN0cihpLCA2KSA9PT0gXCJ7e0xUfX1cIikge1xuXHRcdFx0XHRcdHNwbGl0VGV4dCArPSAgY2hhcnMgPyBjaGFyU3RhcnQoKSArIFwie3tMVH19XCIgKyBcIjwvZGl2PlwiIDogXCJ7e0xUfX1cIjtcblx0XHRcdFx0XHRpICs9IDU7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c3BsaXRUZXh0ICs9IChjaGFycyAmJiBjaGFyYWN0ZXIgIT09IFwiIFwiKSA/IGNoYXJTdGFydCgpICsgY2hhcmFjdGVyICsgXCI8L2Rpdj5cIiA6IGNoYXJhY3Rlcjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0ZWxlbWVudC5pbm5lckhUTUwgPSBzcGxpdFRleHQgKyAod29yZElzT3BlbiA/IHdvcmRFbmQgOiBcIlwiKTtcblxuXHRcdFx0aWYgKGhhc1RhZ1N0YXJ0KSB7XG5cdFx0XHRcdF9zd2FwVGV4dChlbGVtZW50LCBcInt7TFR9fVwiLCBcIjxcIik7XG5cdFx0XHR9XG5cdFx0XHQvL2NvcHkgYWxsIHRoZSBkZXNjZW5kYW50IG5vZGVzIGludG8gYW4gYXJyYXkgKHdlIGNhbid0IHVzZSBhIHJlZ3VsYXIgbm9kZUxpc3QgYmVjYXVzZSBpdCdzIGxpdmUgYW5kIHdlIG1heSBuZWVkIHRvIHJlbmVzdCB0aGluZ3MpXG5cdFx0XHRqID0gZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcIipcIik7XG5cdFx0XHRsID0gai5sZW5ndGg7XG5cdFx0XHRub2RlcyA9IFtdO1xuXHRcdFx0Zm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuXHRcdFx0XHRub2Rlc1tpXSA9IGpbaV07XG5cdFx0XHR9XG5cblx0XHRcdC8vZm9yIGFic29sdXRlIHBvc2l0aW9uaW5nLCB3ZSBuZWVkIHRvIHJlY29yZCB0aGUgeC95IG9mZnNldHMgYW5kIHdpZHRoL2hlaWdodCBmb3IgZXZlcnkgPGRpdj4uIEFuZCBldmVuIGlmIHdlJ3JlIG5vdCBwb3NpdGlvbmluZyB0aGluZ3MgYWJzb2x1dGVseSwgaW4gb3JkZXIgdG8gYWNjb21tb2RhdGUgbGluZXMsIHdlIG11c3QgZmlndXJlIG91dCB3aGVyZSB0aGUgeSBvZmZzZXQgY2hhbmdlcyBzbyB0aGF0IHdlIGNhbiBzZW5zZSB3aGVyZSB0aGUgbGluZXMgYnJlYWssIGFuZCB3ZSBwb3B1bGF0ZSB0aGUgbGluZXMgYXJyYXkuXG5cdFx0XHRpZiAobGluZXMgfHwgYWJzb2x1dGUpIHtcblx0XHRcdFx0Zm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuXHRcdFx0XHRcdG5vZGUgPSBub2Rlc1tpXTtcblx0XHRcdFx0XHRpc0NoaWxkID0gKG5vZGUucGFyZW50Tm9kZSA9PT0gZWxlbWVudCk7XG5cdFx0XHRcdFx0aWYgKGlzQ2hpbGQgfHwgYWJzb2x1dGUgfHwgKGNoYXJzICYmICF3b3JkcykpIHtcblx0XHRcdFx0XHQgXHRvZmZzZXQgPSBub2RlLm9mZnNldFRvcDtcblx0XHRcdFx0XHRcdGlmIChsaW5lcyAmJiBpc0NoaWxkICYmIG9mZnNldCAhPT0gbGluZU9mZnNldFkgJiYgbm9kZS5ub2RlTmFtZSAhPT0gXCJCUlwiKSB7XG5cdFx0XHRcdFx0XHRcdGN1ckxpbmUgPSBbXTtcblx0XHRcdFx0XHRcdFx0bGluZXMucHVzaChjdXJMaW5lKTtcblx0XHRcdFx0XHRcdFx0bGluZU9mZnNldFkgPSBvZmZzZXQ7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoYWJzb2x1dGUpIHsgLy9yZWNvcmQgb2Zmc2V0IHggYW5kIHksIGFzIHdlbGwgYXMgd2lkdGggYW5kIGhlaWdodCBzbyB0aGF0IHdlIGNhbiBhY2Nlc3MgdGhlbSBsYXRlciBmb3IgcG9zaXRpb25pbmcuIEdyYWJiaW5nIHRoZW0gYXQgb25jZSBlbnN1cmVzIHdlIGRvbid0IHRyaWdnZXIgYSBicm93c2VyIHBhaW50ICYgd2UgbWF4aW1pemUgcGVyZm9ybWFuY2UuXG5cdFx0XHRcdFx0XHRcdG5vZGUuX3ggPSBub2RlLm9mZnNldExlZnQ7XG5cdFx0XHRcdFx0XHRcdG5vZGUuX3kgPSBvZmZzZXQ7XG5cdFx0XHRcdFx0XHRcdG5vZGUuX3cgPSBub2RlLm9mZnNldFdpZHRoO1xuXHRcdFx0XHRcdFx0XHRub2RlLl9oID0gbm9kZS5vZmZzZXRIZWlnaHQ7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAobGluZXMpIHtcblx0XHRcdFx0XHRcdFx0aWYgKHdvcmRzID09PSBpc0NoaWxkIHx8ICFjaGFycykge1xuXHRcdFx0XHRcdFx0XHRcdGN1ckxpbmUucHVzaChub2RlKTtcblx0XHRcdFx0XHRcdFx0XHRub2RlLl94IC09IHBhZGRpbmdMZWZ0O1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGlmIChpc0NoaWxkICYmIGkpIHtcblx0XHRcdFx0XHRcdFx0XHRub2Rlc1tpLTFdLl93b3JkRW5kID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRpZiAobm9kZS5ub2RlTmFtZSA9PT0gXCJCUlwiICYmIG5vZGUubmV4dFNpYmxpbmcgJiYgbm9kZS5uZXh0U2libGluZy5ub2RlTmFtZSA9PT0gXCJCUlwiKSB7IC8vdHdvIGNvbnNlY3V0aXZlIDxicj4gdGFncyBzaWduaWZ5IGEgbmV3IFtlbXB0eV0gbGluZS5cblx0XHRcdFx0XHRcdFx0XHRsaW5lcy5wdXNoKFtdKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHRcdG5vZGUgPSBub2Rlc1tpXTtcblx0XHRcdFx0aXNDaGlsZCA9IChub2RlLnBhcmVudE5vZGUgPT09IGVsZW1lbnQpO1xuXHRcdFx0XHRpZiAobm9kZS5ub2RlTmFtZSA9PT0gXCJCUlwiKSB7XG5cdFx0XHRcdFx0aWYgKGxpbmVzIHx8IGFic29sdXRlKSB7XG5cdFx0XHRcdFx0XHRlbGVtZW50LnJlbW92ZUNoaWxkKG5vZGUpO1xuXHRcdFx0XHRcdFx0bm9kZXMuc3BsaWNlKGktLSwgMSk7XG5cdFx0XHRcdFx0XHRsLS07XG5cdFx0XHRcdFx0fSBlbHNlIGlmICghd29yZHMpIHtcblx0XHRcdFx0XHRcdGVsZW1lbnQuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGFic29sdXRlKSB7XG5cdFx0XHRcdFx0c3R5bGUgPSBub2RlLnN0eWxlO1xuXHRcdFx0XHRcdGlmICghd29yZHMgJiYgIWlzQ2hpbGQpIHtcblx0XHRcdFx0XHRcdG5vZGUuX3ggKz0gbm9kZS5wYXJlbnROb2RlLl94O1xuXHRcdFx0XHRcdFx0bm9kZS5feSArPSBub2RlLnBhcmVudE5vZGUuX3k7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHN0eWxlLmxlZnQgPSBub2RlLl94ICsgXCJweFwiO1xuXHRcdFx0XHRcdHN0eWxlLnRvcCA9IG5vZGUuX3kgKyBcInB4XCI7XG5cdFx0XHRcdFx0c3R5bGUucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG5cdFx0XHRcdFx0c3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIjtcblx0XHRcdFx0XHQvL2lmIHdlIGRvbid0IHNldCB0aGUgd2lkdGgvaGVpZ2h0LCB0aGluZ3MgY29sbGFwc2UgaW4gb2xkZXIgdmVyc2lvbnMgb2YgSUUgYW5kIHRoZSBvcmlnaW4gZm9yIHRyYW5zZm9ybXMgaXMgdGhyb3duIG9mZiBpbiBhbGwgYnJvd3NlcnMuXG5cdFx0XHRcdFx0c3R5bGUud2lkdGggPSAobm9kZS5fdyArIDEpICsgXCJweFwiOyAvL0lFIGlzIDFweCBzaG9ydCBzb21ldGltZXMuIEF2b2lkIHdyYXBwaW5nXG5cdFx0XHRcdFx0c3R5bGUuaGVpZ2h0ID0gbm9kZS5faCArIFwicHhcIjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICghd29yZHMpIHtcblx0XHRcdFx0XHQvL3dlIGFsd2F5cyBzdGFydCBvdXQgd3JhcHBpbmcgd29yZHMgaW4gdGhlaXIgb3duIDxkaXY+IHNvIHRoYXQgbGluZSBicmVha3MgaGFwcGVuIGNvcnJlY3RseSwgYnV0IGhlcmUgd2UnbGwgcmVtb3ZlIHRob3NlIDxkaXY+IHRhZ3MgaWYgbmVjZXNzYXJ5IGFuZCByZW5lc3QgdGhlIGNoYXJhY3RlcnMgZGlyZWN0bHkgaW50byB0aGUgZWxlbWVudCByYXRoZXIgdGhhbiBpbnNpZGUgdGhlIHdvcmQgPGRpdj5cblx0XHRcdFx0XHRpZiAoaXNDaGlsZCkge1xuXHRcdFx0XHRcdFx0ZWxlbWVudC5yZW1vdmVDaGlsZChub2RlKTtcblx0XHRcdFx0XHRcdG5vZGVzLnNwbGljZShpLS0sIDEpO1xuXHRcdFx0XHRcdFx0bC0tO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoIWlzQ2hpbGQgJiYgY2hhcnMpIHtcblx0XHRcdFx0XHRcdG9mZnNldCA9ICghbGluZXMgJiYgIWFic29sdXRlICYmIG5vZGUubmV4dFNpYmxpbmcpOyAvL2lmIHRoaXMgaXMgdGhlIGxhc3QgbGV0dGVyIGluIHRoZSB3b3JkIChhbmQgd2UncmUgbm90IGJyZWFraW5nIGJ5IGxpbmVzIGFuZCBub3QgcG9zaXRpb25pbmcgdGhpbmdzIGFic29sdXRlbHkpLCB3ZSBuZWVkIHRvIGFkZCBhIHNwYWNlIGFmdGVyd2FyZHMgc28gdGhhdCB0aGUgY2hhcmFjdGVycyBkb24ndCBqdXN0IG1hc2ggdG9nZXRoZXJcblx0XHRcdFx0XHRcdGVsZW1lbnQuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdFx0XHRcdFx0XHRpZiAoIW9mZnNldCkge1xuXHRcdFx0XHRcdFx0XHRlbGVtZW50LmFwcGVuZENoaWxkKF9kb2MuY3JlYXRlVGV4dE5vZGUoXCIgXCIpKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGNoYXJBcnJheS5wdXNoKG5vZGUpOyAvL1RPRE86IHB1c2goKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmIChpc0NoaWxkICYmIG5vZGUuaW5uZXJIVE1MICE9PSBcIlwiKSB7XG5cdFx0XHRcdFx0d29yZEFycmF5LnB1c2gobm9kZSk7ICAvL1RPRE86IHB1c2goKVxuXHRcdFx0XHR9IGVsc2UgaWYgKGNoYXJzKSB7XG5cdFx0XHRcdFx0Y2hhckFycmF5LnB1c2gobm9kZSk7ICAvL1RPRE86IHB1c2goKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmIChsaW5lcykge1xuXHRcdFx0XHQvL3RoZSBuZXh0IDcgbGluZXMganVzdCBnaXZlIHVzIHRoZSBsaW5lIHdpZHRoIGluIHRoZSBtb3N0IHJlbGlhYmxlIHdheSBhbmQgZmlndXJlIG91dCB0aGUgbGVmdCBvZmZzZXQgKGlmIHBvc2l0aW9uIGlzbid0IHJlbGF0aXZlIG9yIGFic29sdXRlKS4gV2UgbXVzdCBzZXQgdGhlIHdpZHRoIGFsb25nIHdpdGggdGV4dC1hbGlnbiB0byBlbnN1cmUgZXZlcnl0aGluZyB3b3JrcyBwcm9wZXJseSBmb3IgdmFyaW91cyBhbGlnbm1lbnRzLlxuXHRcdFx0XHRpZiAoYWJzb2x1dGUpIHtcblx0XHRcdFx0XHRsaW5lTm9kZSA9IF9kb2MuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcblx0XHRcdFx0XHRlbGVtZW50LmFwcGVuZENoaWxkKGxpbmVOb2RlKTtcblx0XHRcdFx0XHRsaW5lV2lkdGggPSBsaW5lTm9kZS5vZmZzZXRXaWR0aCArIFwicHhcIjtcblx0XHRcdFx0XHRvZmZzZXQgPSAobGluZU5vZGUub2Zmc2V0UGFyZW50ID09PSBlbGVtZW50KSA/IDAgOiBlbGVtZW50Lm9mZnNldExlZnQ7XG5cdFx0XHRcdFx0ZWxlbWVudC5yZW1vdmVDaGlsZChsaW5lTm9kZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0c3R5bGUgPSBlbGVtZW50LnN0eWxlLmNzc1RleHQ7XG5cdFx0XHRcdGVsZW1lbnQuc3R5bGUuY3NzVGV4dCA9IFwiZGlzcGxheTpub25lO1wiOyAvL3RvIGltcHJvdmUgcGVyZm9ybWFuY2UsIHNldCBkaXNwbGF5Om5vbmUgb24gdGhlIGVsZW1lbnQgc28gdGhhdCB0aGUgYnJvd3NlciBkb2Vzbid0IGhhdmUgdG8gd29ycnkgYWJvdXQgcmVmbG93aW5nIG9yIHJlbmRlcmluZyB3aGlsZSB3ZSdyZSByZW5lc3RpbmcgdGhpbmdzLiBXZSdsbCByZXZlcnQgdGhlIGNzc1RleHQgbGF0ZXIuXG5cdFx0XHRcdC8vd2UgY2FuJ3QgdXNlIGVsZW1lbnQuaW5uZXJIVE1MID0gXCJcIiBiZWNhdXNlIHRoYXQgY2F1c2VzIElFIHRvIGxpdGVyYWxseSBkZWxldGUgYWxsIHRoZSBub2RlcyBhbmQgdGhlaXIgY29udGVudCBldmVuIHRob3VnaCB3ZSd2ZSBzdG9yZWQgdGhlbSBpbiBhbiBhcnJheSEgU28gd2UgbXVzdCBsb29wIHRocm91Z2ggdGhlIGNoaWxkcmVuIGFuZCByZW1vdmUgdGhlbS5cblx0XHRcdFx0d2hpbGUgKGVsZW1lbnQuZmlyc3RDaGlsZCkge1xuXHRcdFx0XHRcdGVsZW1lbnQucmVtb3ZlQ2hpbGQoZWxlbWVudC5maXJzdENoaWxkKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRhZGRXb3JkU3BhY2VzID0gKCFhYnNvbHV0ZSB8fCAoIXdvcmRzICYmICFjaGFycykpO1xuXHRcdFx0XHRmb3IgKGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRjdXJMaW5lID0gbGluZXNbaV07XG5cdFx0XHRcdFx0bGluZU5vZGUgPSBfZG9jLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG5cdFx0XHRcdFx0bGluZU5vZGUuc3R5bGUuY3NzVGV4dCA9IFwiZGlzcGxheTpibG9jazt0ZXh0LWFsaWduOlwiICsgdGV4dEFsaWduICsgXCI7cG9zaXRpb246XCIgKyAoYWJzb2x1dGUgPyBcImFic29sdXRlO1wiIDogXCJyZWxhdGl2ZTtcIik7XG5cdFx0XHRcdFx0aWYgKGxpbmVzQ2xhc3MpIHtcblx0XHRcdFx0XHRcdGxpbmVOb2RlLmNsYXNzTmFtZSA9IGxpbmVzQ2xhc3MgKyAoaXRlcmF0ZUxpbmUgPyBpKzEgOiBcIlwiKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bGluZUFycmF5LnB1c2gobGluZU5vZGUpOyAgLy9UT0RPOiBwdXNoKClcblx0XHRcdFx0XHRsID0gY3VyTGluZS5sZW5ndGg7XG5cdFx0XHRcdFx0Zm9yIChqID0gMDsgaiA8IGw7IGorKykge1xuXHRcdFx0XHRcdFx0aWYgKGN1ckxpbmVbal0ubm9kZU5hbWUgIT09IFwiQlJcIikge1xuXHRcdFx0XHRcdFx0XHRub2RlID0gY3VyTGluZVtqXTtcblx0XHRcdFx0XHRcdFx0bGluZU5vZGUuYXBwZW5kQ2hpbGQobm9kZSk7XG5cdFx0XHRcdFx0XHRcdGlmIChhZGRXb3JkU3BhY2VzICYmIChub2RlLl93b3JkRW5kIHx8IHdvcmRzKSkge1xuXHRcdFx0XHRcdFx0XHRcdGxpbmVOb2RlLmFwcGVuZENoaWxkKF9kb2MuY3JlYXRlVGV4dE5vZGUoXCIgXCIpKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRpZiAoYWJzb2x1dGUpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoaiA9PT0gMCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0bGluZU5vZGUuc3R5bGUudG9wID0gbm9kZS5feSArIFwicHhcIjtcblx0XHRcdFx0XHRcdFx0XHRcdGxpbmVOb2RlLnN0eWxlLmxlZnQgPSAocGFkZGluZ0xlZnQgKyBvZmZzZXQpICsgXCJweFwiO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRub2RlLnN0eWxlLnRvcCA9IFwiMHB4XCI7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKG9mZnNldCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0bm9kZS5zdHlsZS5sZWZ0ID0gKG5vZGUuX3ggLSBvZmZzZXQpICsgXCJweFwiO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAobCA9PT0gMCkgeyAvL2lmIHRoZXJlIGFyZSBubyBub2RlcyBpbiB0aGUgbGluZSAodHlwaWNhbGx5IG1lYW5pbmcgdGhlcmUgd2VyZSB0d28gY29uc2VjdXRpdmUgPGJyPiB0YWdzLCBqdXN0IGFkZCBhIG5vbi1icmVha2luZyBzcGFjZSBzbyB0aGF0IHRoaW5ncyBkaXNwbGF5IHByb3Blcmx5LlxuXHRcdFx0XHRcdFx0bGluZU5vZGUuaW5uZXJIVE1MID0gXCImbmJzcDtcIjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCF3b3JkcyAmJiAhY2hhcnMpIHtcblx0XHRcdFx0XHRcdGxpbmVOb2RlLmlubmVySFRNTCA9IF9nZXRUZXh0KGxpbmVOb2RlKS5zcGxpdChTdHJpbmcuZnJvbUNoYXJDb2RlKDE2MCkpLmpvaW4oXCIgXCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoYWJzb2x1dGUpIHtcblx0XHRcdFx0XHRcdGxpbmVOb2RlLnN0eWxlLndpZHRoID0gbGluZVdpZHRoO1xuXHRcdFx0XHRcdFx0bGluZU5vZGUuc3R5bGUuaGVpZ2h0ID0gbm9kZS5faCArIFwicHhcIjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxlbWVudC5hcHBlbmRDaGlsZChsaW5lTm9kZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxlbWVudC5zdHlsZS5jc3NUZXh0ID0gc3R5bGU7XG5cdFx0XHR9XG5cblx0XHRcdC8vaWYgZXZlcnl0aGluZyBzaGlmdHMgdG8gYmVpbmcgcG9zaXRpb246YWJzb2x1dGUsIHRoZSBjb250YWluZXIgY2FuIGNvbGxhcHNlIGluIHRlcm1zIG9mIGhlaWdodCBvciB3aWR0aCwgc28gZml4IHRoYXQgaGVyZS5cblx0XHRcdGlmIChhYnNvbHV0ZSkge1xuXHRcdFx0XHRpZiAob3JpZ0hlaWdodCA+IGVsZW1lbnQuY2xpZW50SGVpZ2h0KSB7XG5cdFx0XHRcdFx0ZWxlbWVudC5zdHlsZS5oZWlnaHQgPSAob3JpZ0hlaWdodCAtIHBhZFRvcEFuZEJvdHRvbSkgKyBcInB4XCI7XG5cdFx0XHRcdFx0aWYgKGVsZW1lbnQuY2xpZW50SGVpZ2h0IDwgb3JpZ0hlaWdodCkgeyAvL0lFOCBhbmQgZWFybGllciB1c2UgYSBkaWZmZXJlbnQgYm94IG1vZGVsIC0gd2UgbXVzdCBpbmNsdWRlIHBhZGRpbmcgYW5kIGJvcmRlcnNcblx0XHRcdFx0XHRcdGVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gKG9yaWdIZWlnaHQgKyBib3JkZXJUb3BBbmRCb3R0b20pKyBcInB4XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChvcmlnV2lkdGggPiBlbGVtZW50LmNsaWVudFdpZHRoKSB7XG5cdFx0XHRcdFx0ZWxlbWVudC5zdHlsZS53aWR0aCA9IChvcmlnV2lkdGggLSBwYWRMZWZ0QW5kUmlnaHQpICsgXCJweFwiO1xuXHRcdFx0XHRcdGlmIChlbGVtZW50LmNsaWVudFdpZHRoIDwgb3JpZ1dpZHRoKSB7IC8vSUU4IGFuZCBlYXJsaWVyIHVzZSBhIGRpZmZlcmVudCBib3ggbW9kZWwgLSB3ZSBtdXN0IGluY2x1ZGUgcGFkZGluZyBhbmQgYm9yZGVyc1xuXHRcdFx0XHRcdFx0ZWxlbWVudC5zdHlsZS53aWR0aCA9IChvcmlnV2lkdGggKyBib3JkZXJMZWZ0QW5kUmlnaHQpKyBcInB4XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRfcHVzaFJldmVyc2VkKGFsbENoYXJzLCBjaGFyQXJyYXkpO1xuXHRcdFx0X3B1c2hSZXZlcnNlZChhbGxXb3Jkcywgd29yZEFycmF5KTtcblx0XHRcdF9wdXNoUmV2ZXJzZWQoYWxsTGluZXMsIGxpbmVBcnJheSk7XG5cdFx0fSxcblx0XHRwID0gU3BsaXRUZXh0LnByb3RvdHlwZTtcblxuXHRwLnNwbGl0ID0gZnVuY3Rpb24odmFycykge1xuXHRcdGlmICh0aGlzLmlzU3BsaXQpIHtcblx0XHRcdHRoaXMucmV2ZXJ0KCk7XG5cdFx0fVxuXHRcdHRoaXMudmFycyA9IHZhcnMgfHwgdGhpcy52YXJzO1xuXHRcdHRoaXMuX29yaWdpbmFscy5sZW5ndGggPSB0aGlzLmNoYXJzLmxlbmd0aCA9IHRoaXMud29yZHMubGVuZ3RoID0gdGhpcy5saW5lcy5sZW5ndGggPSAwO1xuXHRcdHZhciBpID0gdGhpcy5lbGVtZW50cy5sZW5ndGg7XG5cdFx0Ly93ZSBzcGxpdCBpbiByZXZlcnNlZCBvcmRlciBzbyB0aGF0IGlmL3doZW4gd2UgcG9zaXRpb246YWJzb2x1dGUgZWxlbWVudHMsIHRoZXkgZG9uJ3QgYWZmZWN0IHRoZSBwb3NpdGlvbiBvZiB0aGUgb25lcyBhZnRlciB0aGVtIGluIHRoZSBkb2N1bWVudCBmbG93IChzaGlmdGluZyB0aGVtIHVwIGFzIHRoZXkncmUgdGFrZW4gb3V0IG9mIHRoZSBkb2N1bWVudCBmbG93KS5cblx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdHRoaXMuX29yaWdpbmFsc1tpXSA9IHRoaXMuZWxlbWVudHNbaV0uaW5uZXJIVE1MO1xuXHRcdFx0X3NwbGl0KHRoaXMuZWxlbWVudHNbaV0sIHRoaXMudmFycywgdGhpcy5jaGFycywgdGhpcy53b3JkcywgdGhpcy5saW5lcyk7XG5cdFx0fVxuXHRcdHRoaXMuY2hhcnMucmV2ZXJzZSgpO1xuXHRcdHRoaXMud29yZHMucmV2ZXJzZSgpO1xuXHRcdHRoaXMubGluZXMucmV2ZXJzZSgpO1xuXHRcdHRoaXMuaXNTcGxpdCA9IHRydWU7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0cC5yZXZlcnQgPSBmdW5jdGlvbigpIHtcblx0XHRpZiAoIXRoaXMuX29yaWdpbmFscykge1xuXHRcdFx0dGhyb3coXCJyZXZlcnQoKSBjYWxsIHdhc24ndCBzY29wZWQgcHJvcGVybHkuXCIpO1xuXHRcdH1cblx0XHR2YXIgaSA9IHRoaXMuX29yaWdpbmFscy5sZW5ndGg7XG5cdFx0d2hpbGUgKC0taSA+IC0xKSB7XG5cdFx0XHR0aGlzLmVsZW1lbnRzW2ldLmlubmVySFRNTCA9IHRoaXMuX29yaWdpbmFsc1tpXTtcblx0XHR9XG5cdFx0dGhpcy5jaGFycyA9IFtdO1xuXHRcdHRoaXMud29yZHMgPSBbXTtcblx0XHR0aGlzLmxpbmVzID0gW107XG5cdFx0dGhpcy5pc1NwbGl0ID0gZmFsc2U7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH07XG5cblx0U3BsaXRUZXh0LnNlbGVjdG9yID0gd2luZG93LiQgfHwgd2luZG93LmpRdWVyeSB8fCBmdW5jdGlvbihlKSB7XG5cdFx0dmFyIHNlbGVjdG9yID0gd2luZG93LiQgfHwgd2luZG93LmpRdWVyeTtcblx0XHRpZiAoc2VsZWN0b3IpIHtcblx0XHRcdFNwbGl0VGV4dC5zZWxlY3RvciA9IHNlbGVjdG9yO1xuXHRcdFx0cmV0dXJuIHNlbGVjdG9yKGUpO1xuXHRcdH1cblx0XHRyZXR1cm4gKHR5cGVvZihkb2N1bWVudCkgPT09IFwidW5kZWZpbmVkXCIpID8gZSA6IChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsID8gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChlKSA6IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKChlLmNoYXJBdCgwKSA9PT0gXCIjXCIpID8gZS5zdWJzdHIoMSkgOiBlKSk7XG5cdH07XG5cdFNwbGl0VGV4dC52ZXJzaW9uID0gXCIwLjMuNFwiO1xuXHRcbn0pKF9nc1Njb3BlKTtcblxuLy9leHBvcnQgdG8gQU1EL1JlcXVpcmVKUyBhbmQgQ29tbW9uSlMvTm9kZSAocHJlY3Vyc29yIHRvIGZ1bGwgbW9kdWxhciBidWlsZCBzeXN0ZW0gY29taW5nIGF0IGEgbGF0ZXIgZGF0ZSlcbihmdW5jdGlvbihuYW1lKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXHR2YXIgZ2V0R2xvYmFsID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIChfZ3NTY29wZS5HcmVlblNvY2tHbG9iYWxzIHx8IF9nc1Njb3BlKVtuYW1lXTtcblx0fTtcblx0aWYgKHR5cGVvZihkZWZpbmUpID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkgeyAvL0FNRFxuXHRcdGRlZmluZShbXCJUd2VlbkxpdGVcIl0sIGdldEdsb2JhbCk7XG5cdH0gZWxzZSBpZiAodHlwZW9mKG1vZHVsZSkgIT09IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlLmV4cG9ydHMpIHsgLy9ub2RlXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBnZXRHbG9iYWwoKTtcblx0fVxufShcIlNwbGl0VGV4dFwiKSk7Il0sImZpbGUiOiJ2ZW5kb3IvU3BsaXRUZXh0LmpzIn0=
