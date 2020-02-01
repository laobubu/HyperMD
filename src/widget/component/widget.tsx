import React, { ReactNode } from "react";

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
