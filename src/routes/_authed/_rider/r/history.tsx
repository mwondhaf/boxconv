import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/_rider/r/history')({
  component: RiderHistoryPage,
})

function RiderHistoryPage() {
  return <div>History</div>
}
