import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { IntlProvider } from "react-intl";

import App from "./App.tsx";
import { loadMessages } from "./i18n/index.ts";

// 获取用户语言偏好
// const locale = navigator.language.split("-")[0] || "en";
const locale = "en";

// 加载消息
const messages = await loadMessages(locale);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <IntlProvider locale={locale} messages={messages}>
      <App />
    </IntlProvider>
  </StrictMode>
);
