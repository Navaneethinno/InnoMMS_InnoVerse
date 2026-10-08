import { Link } from "react-router-dom";

const CLASS = "font-bold text-ink hover:underline";

// A link to one of the legal pages (terms, privacy policy). It opens in a new
// tab. The institution's own address (`href`, from its branding) is used when
// it has one; otherwise it opens the portal's own page (`fallback`, e.g.
// "/terms").
export default function LegalLink({ href, fallback, children }) {
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={CLASS}>
        {children}
      </a>
    );
  }
  if (fallback) {
    return (
      <Link to={fallback} target="_blank" rel="noopener noreferrer" className={CLASS}>
        {children}
      </Link>
    );
  }
  return <span className="font-semibold text-ink">{children}</span>;
}
