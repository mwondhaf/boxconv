import { useCan } from '~/shared/stores/ability-store'

export function VendorCustomersPage() {
  const canManageCustomer = useCan('manage', 'Customer')
  const canCreateCustomer = useCan('create', 'Customer')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">
            View and manage your customer relationships.
          </p>
        </div>
        {canCreateCustomer && (
          <button
            type="button"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
          >
            Add Customer
          </button>
        )}
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Customers</h3>
          <p className="mt-1 text-2xl font-bold text-gray-900">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">New This Month</h3>
          <p className="mt-1 text-2xl font-bold text-green-600">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Repeat Customers</h3>
          <p className="mt-1 text-2xl font-bold text-blue-600">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Avg. Order Value</h3>
          <p className="mt-1 text-2xl font-bold text-indigo-600">UGX 0</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            className="flex-1 min-w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent">
            <option value="">All Customers</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent">
            <option value="">Sort By</option>
            <option value="recent">Most Recent</option>
            <option value="orders">Most Orders</option>
            <option value="spent">Highest Spent</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Orders
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Spent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Order
              </th>
              {canManageCustomer && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td
                colSpan={canManageCustomer ? 7 : 6}
                className="px-6 py-12 text-center text-gray-500"
              >
                No customers found. Customers will appear here when they place
                orders.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Showing 0 of 0 customers</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-500 bg-gray-50 cursor-not-allowed"
          >
            Previous
          </button>
          <button
            type="button"
            disabled
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-500 bg-gray-50 cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
