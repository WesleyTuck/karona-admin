import ConfirmPayoutForm from "@/components/confirm-payout-form";

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConfirmPayoutForm payoutId={id} />;
}
