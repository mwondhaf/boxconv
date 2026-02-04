import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/_rider/r/earnings')({
  component: RiderEarningsPage,
})

function RiderEarningsPage() {
  return <div>Earnings</div>
}
