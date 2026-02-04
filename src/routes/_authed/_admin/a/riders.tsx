import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/_admin/a/riders')({
  component: AdminRidersPage,
})

function AdminRidersPage() {
  return <div>Admin Riders</div>
}
