import { redirect } from "next/navigation";

export default async function EditCampaignPage({ params }) {
  await params;
  redirect("/admin/campaigns");
}
