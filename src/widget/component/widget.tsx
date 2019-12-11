import React, { ReactNode } from "react";
import { Attributes } from "../../addon/fold";

export interface WidgetArgs {
  attributes: Attributes;
  setAttributes?: (attributes: Attributes) => void;
  removeSelf?: () => void;
  isPreview?: boolean;
}

interface Props {
  children: ReactNode;
}
export function Widget(props: Props) {
  return (
    <span className="vickymd-widget" onClick={event => event.preventDefault()}>
      {props.children}
    </span>
  );
}
