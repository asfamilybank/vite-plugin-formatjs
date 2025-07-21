/**
 * 国际化配置和消息加载
 *
 * 这个文件负责：
 * 1. 加载编译后的翻译文件
 * 2. 根据用户语言偏好提供消息
 */

// 支持的语言列表
export const supportedLocales = ["en", "zh"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

// 检查是否为支持的语言
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return supportedLocales.includes(locale as SupportedLocale);
}

/**
 * 动态加载编译后的翻译文件
 *
 * 注意：这里加载的是 vite-plugin-formatjs 编译后的文件
 * 默认输出目录是 src/compiled-lang/
 */
export async function loadMessages(
  locale: string
): Promise<Record<string, string>> {
  // 确保语言代码是支持的
  const normalizedLocale = isSupportedLocale(locale) ? locale : "en";

  try {
    // 动态导入编译后的翻译文件
    // 插件默认配置会将编译结果输出到 src/i18n/compiled-lang/ 目录
    const messages = await import(
      `../i18n/compiled-lang/${normalizedLocale}.json`
    );
    return messages.default || messages;
  } catch (error) {
    console.warn(
      `Failed to load messages for locale "${normalizedLocale}", falling back to English`,
      error
    );

    // 如果加载失败且不是英文，尝试加载英文
    if (normalizedLocale !== "en") {
      try {
        const fallbackMessages = await import("../i18n/compiled-lang/en.json");
        return fallbackMessages.default || fallbackMessages;
      } catch (fallbackError) {
        console.error(
          "Failed to load fallback English messages",
          fallbackError
        );
        return {};
      }
    }

    return {};
  }
}
