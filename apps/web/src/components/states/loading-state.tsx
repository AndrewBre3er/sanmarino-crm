interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading shell data placeholder..." }: LoadingStateProps) {
  return (
    <div className="bo-state bo-state-loading" role="status" aria-live="polite">
      <span className="bo-loading-dot" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
