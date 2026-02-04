import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/_admin/a/orders')({
  component: AdminOrdersPage,
})

function AdminOrdersPage() {
  return <div>Admin Orders</div>
}
