import "./typing-indicator.css";

export function TypingIndicator() {
  return (
    <svg
      className="typing-indicator"
      viewBox="0 0 120 60"
      role="img"
      aria-label="Typing"
    >
      <circle
        className="typing-indicator__dot typing-indicator__dot--one"
        cx="34"
        cy="35"
        r="7"
      />
      <circle
        className="typing-indicator__dot typing-indicator__dot--two"
        cx="60"
        cy="35"
        r="7"
      />
      <circle
        className="typing-indicator__dot typing-indicator__dot--three"
        cx="86"
        cy="35"
        r="7"
      />
    </svg>
  );
}
