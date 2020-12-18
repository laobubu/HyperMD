import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";

function MenuContainer(props) {
  const baseEl = useRef(null);
  
  const hideEvent = function(e) {
    baseEl.current.style.display = 'none';
    document.body.removeEventListener("click", hideEvent);
    props.onHideMenu();
    return false;
  }

  useEffect(() => {
    if (props.menuItems == null) return;
    baseEl.current.style.display = "block";
    document.body.addEventListener("click", hideEvent);
  }, [props.menuItems])

  return (
    <div ref={baseEl} style={{display: props.show ? "block" : "none", position: "absolute", top: "-10px", left: "14px", width: "30px", height: "30px"}}>
      <div className="menu-container" role="presentation">
        <div className="wrapper-south-start" style={{margin: 0}}>
          <div className="popover">
            <div className="card">
              <div className="arrow-south-start"></div>
              <div className="menu">
                <div className="menuItems">
                  {
                    props.show ? props.menuItems.map((v, i) => {
                      if (v == "divider") {
                        return <div className="menuDivider" key={i}></div>
                      } else {
                        return (
                          <div className="menuItemInline" key={i} onClick={(e) => {v["callback"](e)}}>
                            <div className="menuItemIcon">
                              {v["svg"]}
                            </div>
                            <div className="menuItemContent">
                              <span className="text">{v["text"]}</span>
                            </div>
                          </div>
                        )
                      }
                    }) : ""
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MenuContainer;
