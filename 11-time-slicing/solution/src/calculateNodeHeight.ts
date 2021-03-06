// @ts-nocheck

const isIE: boolean = !!document.documentElement.currentStyle;

const HIDDEN_TEXTAREA_STYLE = {
  "min-height": "0",
  "max-height": "none",
  height: "0",
  visibility: "hidden",
  overflow: "hidden",
  position: "absolute",
  "z-index": "-1000",
  top: "0",
  right: "0",
};

const SIZING_STYLE = [
  "letter-spacing",
  "line-height",
  "font-family",
  "font-weight",
  "font-size",
  "font-style",
  "tab-size",
  "text-rendering",
  "text-transform",
  "width",
  "text-indent",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "box-sizing",
];

let computedStyleCache = {};
const hiddenTextarea = document.createElement("textarea");

const forceHiddenStyles = (node) => {
  Object.keys(HIDDEN_TEXTAREA_STYLE).forEach((key) => {
    node.style.setProperty(key, HIDDEN_TEXTAREA_STYLE[key], "important");
  });
};

export default function calculateNodeHeight(
  uiTextNode,
  uid?,
  useCache = false,
  minRows = null,
  maxRows = null
) {
  if (hiddenTextarea.parentNode === null) {
    document.body.appendChild(hiddenTextarea);
  }

  // Copy all CSS properties that have an impact on the height of the content in
  // the textbox
  const nodeStyling = calculateNodeStyling(uiTextNode, uid, useCache);

  if (nodeStyling === null) {
    return null;
  }

  const { paddingSize, borderSize, boxSizing, sizingStyle } = nodeStyling;

  // Need to have the overflow attribute to hide the scrollbar otherwise
  // text-lines will not calculated properly as the shadow will technically be
  // narrower for content
  Object.keys(sizingStyle).forEach((key) => {
    hiddenTextarea.style[key] = sizingStyle[key];
  });
  forceHiddenStyles(hiddenTextarea);
  hiddenTextarea.value = uiTextNode.value || uiTextNode.placeholder || "x";

  let height = hiddenTextarea.scrollHeight;

  if (boxSizing === "border-box") {
    // border-box: add border, since height = content + padding + border
    height = height + borderSize;
  } else if (boxSizing === "content-box") {
    // remove padding, since height = content
    height = height - paddingSize;
  }
  return height;
}

function calculateNodeStyling(node, uid, useCache = false) {
  if (useCache && computedStyleCache[uid]) {
    return computedStyleCache[uid];
  }

  const style = window.getComputedStyle(node);

  if (style === null) {
    return null;
  }

  let sizingStyle = SIZING_STYLE.reduce((obj, name) => {
    obj[name] = style.getPropertyValue(name);
    return obj;
  }, {});

  const boxSizing = sizingStyle["box-sizing"];

  // probably node is detached from DOM, can't read computed dimensions
  if (boxSizing === "") {
    return null;
  }

  // IE (Edge has already correct behaviour) returns content width as computed width
  // so we need to add manually padding and border widths
  if (isIE && boxSizing === "border-box") {
    sizingStyle.width =
      parseFloat(sizingStyle.width) +
      parseFloat(style["border-right-width"]) +
      parseFloat(style["border-left-width"]) +
      parseFloat(style["padding-right"]) +
      parseFloat(style["padding-left"]) +
      "px";
  }

  const paddingSize =
    parseFloat(sizingStyle["padding-bottom"]) +
    parseFloat(sizingStyle["padding-top"]);

  const borderSize =
    parseFloat(sizingStyle["border-bottom-width"]) +
    parseFloat(sizingStyle["border-top-width"]);

  const nodeInfo = {
    sizingStyle,
    paddingSize,
    borderSize,
    boxSizing,
  };

  if (useCache) {
    computedStyleCache[uid] = nodeInfo;
  }

  return nodeInfo;
}

export const purgeCache = (uid) => {
  delete computedStyleCache[uid];
};
