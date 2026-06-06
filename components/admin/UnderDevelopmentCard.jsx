import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export default function UnderDevelopmentCard({ title, description }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="inline-flex w-fit rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] px-3 py-1 text-xs font-medium uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">
          Under Development
        </p>
        <p className="text-sm text-[color:var(--ui-muted-foreground)]">{description}</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[color:var(--ui-muted-foreground)]">
          <li>Core functionality will be connected in the next release.</li>
          <li>Design and navigation are already in place.</li>
          <li>This page is intentionally marked as work in progress.</li>
        </ul>
      </CardContent>
    </Card>
  );
}
