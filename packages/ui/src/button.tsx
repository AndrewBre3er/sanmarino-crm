import type { ButtonHTMLAttributes } from "react";

type UiButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function UiButton(props: UiButtonProps) {
  return <button {...props} />;
}
