import { createFileRoute } from '@tanstack/react-router'
import { AdminCategoriesPage } from '~/features/admin/pages/categories'

export const Route = createFileRoute('/_authed/_admin/a/categories')({
  component: AdminCategoriesPage,
})
