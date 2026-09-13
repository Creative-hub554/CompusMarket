import { PageProfileView } from "@/components/social/PageProfileView";

type Props = { params: Promise<{ username: string }> };

export default async function PageProfileRoute({ params }: Props) {
  const { username } = await params;
  return <PageProfileView username={username} />;
}
