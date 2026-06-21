import { redirect } from "next/navigation";
import { resolve_role_home_path } from "../../contracts/backoffice-shell.contract";
import { read_current_session } from "../../lib/auth/server-auth";

type SearchParams = Record<string, string | string[] | undefined>;

interface LoginPageProps {
  searchParams?: Promise<SearchParams> | SearchParams;
}

const login_error_messages: Readonly<Record<string, string>> = {
  invalid_input: "Заполните логин и пароль.",
  invalid_credentials: "Неверный логин или пароль.",
  session_parse_failed: "Сессия создана, но ответ сервера некорректен.",
  auth_api_unavailable: "Auth API временно недоступен."
};

function first_query_value(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage(props: LoginPageProps) {
  const activeSession = await read_current_session();
  if (activeSession) {
    redirect(resolve_role_home_path(activeSession.user.primaryRole));
  }

  const params = ((await props.searchParams) ?? {}) as SearchParams;
  const errorCode = first_query_value(params.error);
  const errorMessage = errorCode ? login_error_messages[errorCode] : undefined;

  return (
    <main className="bo-login-page">
      <section className="bo-login-card">
        <p className="bo-kicker">Sanmarino CRM</p>
        <h1>Вход в backoffice</h1>
        <p className="bo-muted">
          Авторизация выполняется через API auth-skeleton. Логика пользователей и полный RBAC
          engine отложены.
        </p>

        {errorMessage ? <p className="bo-login-error">{errorMessage}</p> : null}

        <form action="/session/login" method="post" className="bo-login-form">
          <label>
            Логин
            <input name="login" type="text" autoComplete="username" required minLength={3} />
          </label>

          <label>
            Пароль
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={3}
            />
          </label>

          <button type="submit">Войти</button>
        </form>
      </section>
    </main>
  );
}
