import { createFileRoute } from '@tanstack/react-router'

import { VendorVariantsPage } from '~/features/vendor/pages/variants'

export const Route = createFileRoute('/_authed/_vendor/v/variants')({
  component: VendorVariantsPage,
})
