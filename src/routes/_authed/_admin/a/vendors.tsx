import { createFileRoute } from '@tanstack/react-router'
import { AdminVendorsPage } from '~/features/admin/pages/vendors'

export const Route = createFileRoute('/_authed/_admin/a/vendors')({
  component: AdminVendorsPage,
})
