interface ErrorStateProps {
  title: string;
  message: string;
}

export function ErrorState({ title, message }: ErrorStateProps) {
  return (
    <div className="bo-state bo-state-error" role="alert">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}
