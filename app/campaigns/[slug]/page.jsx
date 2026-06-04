import Link from "next/link";
import { notFound } from "next/navigation";
import CampaignResponseForm from "../../../components/CampaignResponseForm";
import { getCampaignBySlugForPublic, isCampaignTableMissingError } from "../../../lib/campaigns";

export const dynamic = "force-dynamic";

async function loadCampaign(slug) {
  try {
    return await getCampaignBySlugForPublic(slug);
  } catch (error) {
    if (isCampaignTableMissingError(error)) {
      return null;
    }

    throw error;
  }
}

export async function generateMetadata({ params }) {
  const slug = String(params?.slug || "");
  const campaign = await loadCampaign(slug);

  if (!campaign) {
    return {
      title: "Campaign Not Found | Lesaal",
      description: "The requested campaign could not be found.",
    };
  }

  return {
    title: `${campaign.title} | Lesaal Campaigns`,
    description: campaign.description,
  };
}

export default async function CampaignDetailPage({ params }) {
  const slug = String(params?.slug || "");
  const campaign = await loadCampaign(slug);

  if (!campaign) {
    notFound();
  }

  return (
    <div className="campaign-detail-shell">
      <header className="campaign-detail-head">
        <h1>{campaign.title}</h1>
        <p>{campaign.description}</p>

        <div className="services-page-actions">
          <Link href="/campaigns" className="lp-btn lp-btn-primary">
            View all campaigns
          </Link>
          <Link href="/" className="lp-btn lp-btn-ghost">
            Back to Homepage
          </Link>
        </div>
      </header>

      <section className="campaign-detail-grid">
        <article className="campaign-detail-media">
          {campaign.imageUrl ? <img src={campaign.imageUrl} alt={campaign.title} /> : <div className="lp-image-placeholder">Campaign image</div>}
        </article>

        <CampaignResponseForm campaign={campaign} />
      </section>
    </div>
  );
}
