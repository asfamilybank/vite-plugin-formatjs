import { useEffect,useState } from "react";
import { IntlProvider } from "react-intl";
import { onHotUpdate, offHotUpdate } from "vite-plugin-formatjs/utils";
import { loadMessages } from "./i18n";

export default function Message({ language, children }: { language: string, children: React.ReactNode }) {
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    async function updateMessages() {
      const messages = await loadMessages(language);
      setMessages(messages);
    }
    updateMessages();
  }, [language]);

  useEffect(() => {
    const callback = (payload: { file: string, language: string, messages: Record<string, string> }) => {
      if (payload.language === language) {
        setMessages(payload.messages);
      }
    }
    onHotUpdate(callback);
    return () => offHotUpdate(callback);
    
  }, [language])

  return (
    <IntlProvider locale={language} messages={messages}>
      {children}
    </IntlProvider>
  );
} 