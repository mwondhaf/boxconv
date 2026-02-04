import { createFileRoute } from '@tanstack/react-router'
import { AdminBrandsPage } from '~/features/admin/pages/brands'

export const Route = createFileRoute('/_authed/_admin/a/brands')({
  component: AdminBrandsPage,
})
