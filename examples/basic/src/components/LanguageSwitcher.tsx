import { FormattedMessage } from "react-intl";

const languages = [
  { code: "en", name: "English" },
  { code: "zh", name: "中文" },
];

function LanguageSwitcher() {
  const currentLocale = "en"; // 这里简化处理，实际项目中需要从 context 获取

  const handleLanguageChange = (locale: string) => {
    // 这里简化处理，实际项目中需要实现语言切换逻辑
    console.log(`Switching to ${locale}`);
    // 在真实项目中，你需要：
    // 1. 更新 IntlProvider 的 locale 和 messages
    // 2. 可能需要保存到 localStorage 或 URL
    // 3. 重新加载对应的翻译文件
  };

  return (
    <div>
      <h3>
        <FormattedMessage defaultMessage="Language Switcher" />
      </h3>
      <p>
        <FormattedMessage defaultMessage="Note: This is a demo. In a real app, you would implement proper language switching logic." />
      </p>
      <div className="language-switcher">
        <FormattedMessage defaultMessage="Choose language:" />
        {languages.map((lang) => (
          <button
            key={lang.code}
            className={currentLocale === lang.code ? "active" : ""}
            onClick={() => handleLanguageChange(lang.code)}
          >
            {lang.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default LanguageSwitcher;
