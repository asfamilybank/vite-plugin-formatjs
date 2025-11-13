export function onHotUpdate(
  update: (payload: {
    file: string;
    language: string;
    messages: Record<string, string>;
  }) => void
) {
  import.meta.hot?.on('vite-plugin-formatjs:update-messages', payload => {
    update(
      payload as {
        file: string;
        language: string;
        messages: Record<string, string>;
      }
    );
  });
}

export function offHotUpdate(
  update: (payload: {
    file: string;
    language: string;
    messages: Record<string, string>;
  }) => void
) {
  import.meta.hot?.off('vite-plugin-formatjs:update-messages', payload => {
    update(
      payload as {
        file: string;
        language: string;
        messages: Record<string, string>;
      }
    );
  });
}
