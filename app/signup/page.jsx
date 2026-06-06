import Link from "next/link";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

export const metadata = {
  title: "Lesaal | Sign up",
  description: "Public sign-up is coming soon.",
};

export default function SignUpComingSoonPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Sign up is coming soon</CardTitle>
          <CardDescription>
            We are preparing public accounts. Join the waitlist and we will notify you when signup is ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action="#" className="space-y-3">
            <Input type="email" placeholder="you@example.com" aria-label="Email address" />
            <Button type="submit" className="w-full">
              Join waitlist
            </Button>
          </form>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/">Back to Homepage</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/login">Admin Log in</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
