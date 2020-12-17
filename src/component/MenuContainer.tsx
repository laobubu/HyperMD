import React, { useState } from "react";
import ReactDOM from "react-dom";

function MenuContainer(props: any) {
  return (
    <div id={props.id} style={{display: "none", position: "absolute", top: 0, left: 0, width: "30px", height: "30px"}}>
      <div className="menu-container" role="presentation">
        <div className="wrapper-south-start" style={{margin: 0}}>
          <div className="popover">
            <div className="card">
              <div className="arrow-south-start"></div>
              <div className="menu">
                <div className="menuItems">
                  <div className="menuItemInline">
                    <div className="menuItemIcon">
                      <svg preserveAspectRatio="xMidYMid meet" height="1em" width="1em" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" stroke="none" className="icon" style={{color: "rgb(56, 132, 255)"}}><g><path d="M12.2 8.98c.06-.01.12-.03.18-.06.06-.02.12-.05.18-.09l.15-.12c.18-.19.29-.45.29-.71 0-.06-.01-.13-.02-.19a.603.603 0 0 0-.06-.19.757.757 0 0 0-.09-.18c-.03-.05-.08-.1-.12-.15-.28-.27-.72-.37-1.09-.21-.13.05-.23.12-.33.21-.04.05-.09.1-.12.15-.04.06-.07.12-.09.18-.03.06-.05.12-.06.19-.01.06-.02.13-.02.19 0 .26.11.52.29.71.1.09.2.16.33.21.12.05.25.08.38.08.06 0 .13-.01.2-.02M13 16v-4a1 1 0 1 0-2 0v4a1 1 0 1 0 2 0M12 3c-4.962 0-9 4.038-9 9 0 4.963 4.038 9 9 9 4.963 0 9-4.037 9-9 0-4.962-4.037-9-9-9m0 20C5.935 23 1 18.065 1 12S5.935 1 12 1c6.066 0 11 4.935 11 11s-4.934 11-11 11" fillRule="evenodd"></path></g></svg>
                    </div>
                    <div className="menuItemContent">
                      <span className="text">Info</span>
                    </div>
                  </div>
                  <div className="menuDivider"></div>
                  <div className="menuItemInline">
                    <div className="menuItemIcon">
                      <svg preserveAspectRatio="xMidYMid meet" height="1em" width="1em" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" className="icon"><g><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></g></svg>
                    </div>
                    <div className="menuItemContent">
                      <span className="text">Delete</span>
                    </div>
                  </div>
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

export const ShowMenuContainer = (e) => {
  const dom = document.getElementById("menu-container")
  dom.style.display = dom.style.display === 'none' ? '' : 'none';
  const clientRect = e.currentTarget.getBoundingClientRect();
  dom.style.top = window.pageYOffset + clientRect.top + "px";
  dom.style.left = clientRect.left + "px";
}