import Link from "next/link";

export const metadata = {
  title: "Lesaal | Sign up",
  description: "Public sign-up is coming soon.",
};

export default function SignUpComingSoonPage() {
  return (
    <div className="signup-page-shell">
      <section className="signup-card">
        <h1>Sign up is coming soon</h1>
        <p>
          We are preparing public accounts. Join the waitlist and we will notify you when signup is ready.
        </p>
        <form action="#">
          <input type="email" placeholder="you@example.com" aria-label="Email address" />
          <button type="submit" className="lp-btn lp-btn-primary">
            Join waitlist
          </button>
        </form>
        <div className="services-page-actions">
          <Link href="/" className="lp-btn lp-btn-ghost">
            Back to Homepage
          </Link>
          <Link href="/admin/login" className="lp-btn lp-btn-ghost">
            Admin Log in
          </Link>
        </div>
      </section>
    </div>
  );
}
