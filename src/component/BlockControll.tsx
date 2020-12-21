import React, { useState, useRef } from "react";
import ReactDOM from "react-dom";
import MenuContainer from '../component/MenuContainer'

function BlockControll(props: any) {
  const [active, setActive] = useState<boolean>(false);
  const buttonEl = useRef(null)

  const onClickShowMenu = function(e) {
    setActive(true);
    // document.body->clickに伝搬しないように
    e.stopPropagation();
    window.setMenuContainerAttr({
      menuItems: props.menuItems,
      onHide: onHideMenu,
      positionElement: buttonEl.current,
    })
  }
  const onHideMenu = function() {
    setActive(false);
  }
  return (
    <>
      <div className={active ? "blockControls active" : "blockControls"}>
        <div className="blockControlsContent">
          <div className="showMenu">
            <div ref={buttonEl} role="button" tabIndex={-1} className={active ? "circleButton-active" : "circleButton"} onClick={onClickShowMenu} style={ active ? {transform: "rotateZ(-180deg)"} : {} } >
              <svg preserveAspectRatio="xMidYMid meet" height="1em" width="1em" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" className="icon"><g><polyline points="6 9 12 15 18 9"></polyline></g></svg>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default BlockControll;
