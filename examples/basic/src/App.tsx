import { FormattedMessage, useIntl } from "react-intl";
import Counter from "./components/Counter";
import LanguageSwitcher from "./components/LanguageSwitcher";
import "./App.css";

function App() {
  const intl = useIntl();

  return (
    <div className="App">
      <header className="App-header">
        <h1>
          <FormattedMessage defaultMessage="Vite Plugin FormatJS Example" />
        </h1>
        <p>
          <FormattedMessage defaultMessage="This is a basic example demonstrating vite-plugin-formatjs with React and react-intl." />
        </p>
      </header>

      <main className="App-main">
        <section className="demo-section">
          <h2>
            <FormattedMessage defaultMessage="Interactive Counter" />
          </h2>
          <Counter />
        </section>

        <section className="demo-section">
          <h2>
            <FormattedMessage defaultMessage="Date and Time Formatting" />
          </h2>
          <p>
            <FormattedMessage
              defaultMessage="Current time: {time}"
              values={{
                time: intl.formatTime(new Date(), {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }),
              }}
            />
          </p>
          <p>
            <FormattedMessage
              defaultMessage="Today is {date}"
              values={{
                date: intl.formatDate(new Date(), {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
              }}
            />
          </p>
        </section>

        <section className="demo-section">
          <LanguageSwitcher />
        </section>
      </main>

      <footer className="App-footer">
        <p>
          <FormattedMessage defaultMessage="Built with Vite, React, and vite-plugin-formatjs" />
        </p>
      </footer>
    </div>
  );
}

export default App;
