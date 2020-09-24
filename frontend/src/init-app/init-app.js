/*
 * This is meant to be imported in the entry points
 * to initialize the different components that the entry points
 * may want to render in different parts of the app.
 * Initialization involves localizing the app and providing
 * it with the redux store.
 */

import React from "react";
import ReactDOM from "react-dom";

/* render app */

const init_app = function(target, component) {

  ReactDOM.render(component, target);
};

export default init_app;
