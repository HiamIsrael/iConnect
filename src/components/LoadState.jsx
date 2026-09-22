export function Loader({ children }) {
  return (
    <div className="loader" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function LoadError({ error, onRetry, what }) {
  return (
    <div className="load-error" role="alert">
      <p>Couldn't load {what}.</p>
      {error && <p className="load-error-message">{error.message}</p>}
      {onRetry && (
        <div className="load-error-actions">
          <button type="button" className="btn" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
