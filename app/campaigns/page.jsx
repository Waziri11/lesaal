import Link from "next/link";
import { getPublishedCampaigns, isCampaignTableMissingError } from "../../lib/campaigns";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lesaal | Campaigns",
  description: "Explore active outreach campaigns and submit your response.",
};

export default async function CampaignsPage() {
  let campaigns = [];

  try {
    campaigns = await getPublishedCampaigns();
  } catch (error) {
    if (!isCampaignTableMissingError(error)) {
      throw error;
    }
  }

  return (
    <div className="campaigns-page-shell">
      <header className="campaigns-page-head">
        <h1>Campaigns</h1>
        <p>Browse current outreach programs and submit your details to participate.</p>
        <div className="services-page-actions">
          <Link href="/" className="lp-btn lp-btn-primary">
            Back to Homepage
          </Link>
          <Link href="/admin/login" className="lp-btn lp-btn-ghost">
            Admin Log in
          </Link>
        </div>
      </header>

      <section className="campaigns-page-grid">
        {campaigns.length ? (
          campaigns.map((campaign) => (
            <article key={campaign.id} className="campaign-public-card">
              <div className="campaign-public-media">
                {campaign.imageUrl ? (
                  <img src={campaign.imageUrl} alt={campaign.title} />
                ) : (
                  <div className="lp-image-placeholder">Campaign image</div>
                )}
              </div>

              <div className="campaign-public-content">
                <h3>{campaign.title}</h3>
                <p>{campaign.description}</p>
                <Link href={`/campaigns/${campaign.slug}`} className="lp-btn lp-btn-primary">
                  Join Campaign
                </Link>
              </div>
            </article>
          ))
        ) : (
          <article className="admin-page-card">
            <h2>No campaigns published yet</h2>
            <p>Check back soon for new outreach campaigns.</p>
          </article>
        )}
      </section>
    </div>
  );
}
