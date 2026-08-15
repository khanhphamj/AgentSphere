import * as React from "react";
import * as ReactDOMClient from "react-dom/client";
import * as ReactDOM from "react-dom";
window.React = React;
window.ReactDOM = {
  ...ReactDOM,
  ...ReactDOMClient
};
const rootEl = document.getElementById("root");
rootEl.id = "as-app-mount";
await new Promise((resolve, reject) => {
  const s = document.createElement("script");
  s.src = "/ds/ds-bundle.js";
  s.onload = resolve;
  s.onerror = () => {
    console.warn("design-system bundle failed to load — falling back to plain surfaces");
    resolve();
  };
  document.head.appendChild(s);
});
rootEl.id = "root";
const {
  default: App
} = await import("./App.jsx");
ReactDOMClient.createRoot(rootEl).render(<App />);
