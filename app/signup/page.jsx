"use client";

import Link from "next/link";
import "../styles/auth.css";

export default function SignUpComingSoonPage() {
  return (
    <div className="auth--page">
      <title>Lesaal | Sign up</title>
      <div className="auth--page-logo">
        <Link href="/">LESAAL</Link>
      </div>
      <div className="auth--container">
        <div className="auth--header">
          <h2>Public accounts coming soon</h2>
          <h1>Join the Waitlist</h1>
          <p className="auth--subtitle">
            We are preparing public accounts. Join the waitlist and we will notify you when signup is ready.
          </p>
        </div>
        
        <form className="auth--form" action="#" onSubmit={(e) => e.preventDefault()}>
          <div className="auth--group">
            <input 
              type="email" 
              placeholder="you@example.com" 
              required 
              className="auth--input" 
              aria-label="Email address" 
            />
          </div>
          <button type="submit" className="button-auth">
            Join waitlist
          </button>
        </form>

        <div className="auth--footer">
          <Link href="/" className="button--link">Back to Homepage</Link>
          <Link href="/admin/login" className="button--link">Admin Log in</Link>
        </div>
      </div>
    </div>
  );
}
