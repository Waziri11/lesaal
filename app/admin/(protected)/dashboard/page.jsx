import { redirect } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import { getAuthenticatedAdminFromCookies } from "../../../../lib/auth";
import { isAdminProfileComplete } from "../../../../lib/admin-profile";

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
    redirect("/");
  }

  if (!isAdminProfileComplete(admin)) {
    redirect("/admin/profile?setup=1");
  }

  const companyName = String(admin.companyName || "Lesaal").trim() || "Lesaal";
  const todayStart = getTodayStartInDarEsSalaam();

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
    <section className="profile-shell">
      <article className="admin-page-card">
        <h1>{`${companyName} Day Summary`}</h1>
        <p>Business activity for {companyName}, updated in real time.</p>
      </article>

      <article className="admin-page-card">
        <div className="profile-form-grid">
          <div>
            <p className="admin-header-eyebrow">Campaigns</p>
            <h2>{formatNumber(campaignCount)}</h2>
            <p>Total active and draft campaigns for {companyName}.</p>
          </div>
          <div>
            <p className="admin-header-eyebrow">Responses Today</p>
            <h2>{formatNumber(responsesTodayCount)}</h2>
            <p>Responses received today for {companyName}.</p>
          </div>
          <div>
            <p className="admin-header-eyebrow">All Responses</p>
            <h2>{formatNumber(responseCount)}</h2>
            <p>Total campaign responses stored for {companyName}.</p>
          </div>
          <div>
            <p className="admin-header-eyebrow">Unread Alerts</p>
            <h2>{formatNumber(unreadNotificationsCount)}</h2>
            <p>Unread notifications waiting for {companyName}.</p>
          </div>
        </div>
      </article>
    </section>
  );
}
