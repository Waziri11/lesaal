import { redirect } from "next/navigation";
import PageState from "../../../../components/shared/PageState";
import { Badge } from "../../../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { prisma } from "../../../../lib/prisma";
import { getAuthenticatedAdminFromCookies } from "../../../../lib/auth";
import { getGreetingForTime, isAdminProfileComplete } from "../../../../lib/admin-profile";

export const dynamic = "force-dynamic";

function getTodayStartInDarEsSalaam() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter
    .formatToParts(new Date())
    .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});

  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00+03:00`);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

export default async function DashboardPage() {
  const admin = await getAuthenticatedAdminFromCookies();

  if (!admin) {
    redirect("/admin/login");
  }

  if (!isAdminProfileComplete(admin)) {
    redirect("/admin/profile?setup=1");
  }

  const companyName = String(admin.companyName || "Lesaal").trim() || "Lesaal";
  const greeting = getGreetingForTime();
  const displayName = String(admin.firstName || admin.email?.split("@")?.[0] || "there").trim();
  const userChip = admin.firstName && admin.lastName ? `${admin.firstName} ${admin.lastName}` : admin.email;
  const todayStart = getTodayStartInDarEsSalaam();

  try {
    const [campaignCount, responseCount, responsesTodayCount, unreadNotificationsCount] = await Promise.all([
      prisma.campaign.count(),
      prisma.campaignResponse.count(),
      prisma.campaignResponse.count({
        where: {
          submittedAt: {
            gte: todayStart,
          },
        },
      }),
      prisma.adminNotification.count({
        where: {
          isRead: false,
        },
      }),
    ]);

    return (
      <section className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Admin Dashboard</p>
              <CardTitle className="mt-2 text-2xl">{`${greeting} ${displayName}`}</CardTitle>
            </div>
            <Badge>{userChip}</Badge>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{`${companyName} Day Summary`}</CardTitle>
            <CardDescription>Business activity for {companyName}, updated in real time.</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="space-y-2 p-5">
              <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Campaigns</p>
              <h2 className="text-2xl font-semibold">{formatNumber(campaignCount)}</h2>
              <p className="text-sm text-[color:var(--ui-muted-foreground)]">Total active and draft campaigns for {companyName}.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-5">
              <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Responses Today</p>
              <h2 className="text-2xl font-semibold">{formatNumber(responsesTodayCount)}</h2>
              <p className="text-sm text-[color:var(--ui-muted-foreground)]">Responses received today for {companyName}.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-5">
              <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">All Responses</p>
              <h2 className="text-2xl font-semibold">{formatNumber(responseCount)}</h2>
              <p className="text-sm text-[color:var(--ui-muted-foreground)]">Total campaign responses stored for {companyName}.</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-5">
              <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Unread Alerts</p>
              <h2 className="text-2xl font-semibold">{formatNumber(unreadNotificationsCount)}</h2>
              <p className="text-sm text-[color:var(--ui-muted-foreground)]">Unread notifications waiting for {companyName}.</p>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  } catch (error) {
    return <PageState status="error" errorMessage={error?.message || "Unable to load dashboard."} />;
  }
}
