import { appConfig } from "@/app.config";
import { Container } from "./Container";
import { Link } from "./Link";

/** Structure only: contentinfo landmark, optional labelled nav from appConfig.footerNav, copyright line. */
export function Footer() {
  return (
    <footer className="border-t border-line bg-bg text-fg">
      <Container className="flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          &copy; <span suppressHydrationWarning>{new Date().getFullYear()}</span> {appConfig.name}
        </p>
        {appConfig.footerNav.length > 0 ? (
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {appConfig.footerNav.map((item) => (
                <li key={item.to + item.label}>
                  <Link to={item.to} className="text-sm text-muted hover:text-fg">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </Container>
    </footer>
  );
}
