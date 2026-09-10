import { PageProfileView } from "@/components/social/PageProfileView";

export default function PageProfileRoute({ params }: { params: { username: string } }) {
  return <PageProfileView username={params.username} />;
}
