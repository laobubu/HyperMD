import { Attributes } from "../addon/attributes/index";
import { Editor } from "codemirror";

// VickyMD, copyright (c) by 0xGG Team
// Distributed under an AGPL3
// DESCRIPTION: The widget component that allows you to create and register widget
//

export interface WidgetArgs {
  editor?: Editor;
  attributes: Attributes;
  setAttributes?: (attributes: Attributes) => void;
  removeSelf?: () => void;
  replaceSelf?: (inputString: string) => void;
  isPreview?: boolean;
}

export type WidgetCreator = (args: WidgetArgs) => [HTMLElement, CodeMirror.TextMarkerOptions?];

let widgetMap: { [key: string]: WidgetCreator } = {};

/**
 *
 * @param name Name of the widget
 * @param creator Creator function
 */
export function registerWidgetCreator(
  name: string,
  creator: WidgetCreator,
  forceOverride: boolean = false
) {
  if (name in widgetMap && !forceOverride) {
    throw new Error(`Widget with name ${name} is already registered`);
  }
  widgetMap[name] = creator;
}

/**
 *
 * @param name Name of the widget
 */
export function getWidgetCreator(name: string): WidgetCreator {
  return widgetMap[name];
}

export function resetWidgetCreators() {
  widgetMap = {};
}
