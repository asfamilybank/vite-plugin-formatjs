import { useState } from "react";
import { FormattedMessage, FormattedNumber } from "react-intl";

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="counter">
      <button onClick={() => setCount(count - 1)}>
        <FormattedMessage defaultMessage="Decrease" />
      </button>

      <div className="count">
        <FormattedNumber value={count} />
      </div>

      <button onClick={() => setCount(count + 1)}>
        <FormattedMessage defaultMessage="Increase" />
      </button>

      <button onClick={() => setCount(0)}>
        <FormattedMessage defaultMessage="Reset" />
      </button>

      <div>
        <FormattedMessage
          defaultMessage="Current count: {count}"
          values={{ count }}
        />
      </div>
    </div>
  );
}

export default Counter;
