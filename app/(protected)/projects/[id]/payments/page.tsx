import { redirect } from "next/navigation";

export default function ProjectPaymentsRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/projects/${params.id}?tab=receivables`);
}
