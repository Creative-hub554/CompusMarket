import { PageProfileView } from "@/components/social/PageProfileView";

export default async function PageProfileRoute({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <PageProfileView username={username} />;
}
