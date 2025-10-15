import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import Messages from "./messages.tsx";

// 获取用户语言偏好
// const locale = navigator.language.split("-")[0] || "en";
const locale = "en";


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Messages language={locale}>
      <App />
    </Messages>
  </StrictMode>
);
