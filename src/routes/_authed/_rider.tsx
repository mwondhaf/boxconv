import { createFileRoute, redirect } from '@tanstack/react-router'
import { RiderLayout } from '~/features/rider'
import type { PublicMetadata } from '~/shared/types/roles'

export const Route = createFileRoute('/_authed/_rider')({
  beforeLoad: ({ context }) => {
    const publicMetadata = context.publicMetadata as PublicMetadata | undefined

    // Only allow rider and admin roles
    const role = publicMetadata?.platformRole
    if (role !== 'rider' && role !== 'admin') {
      throw redirect({
        to: '/',
        search: { error: 'unauthorized' },
      })
    }
  },
  component: RiderLayout,
})
