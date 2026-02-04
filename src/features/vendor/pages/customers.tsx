import { useCan } from "~/shared/stores/ability-store";

export function VendorCustomersPage() {
  const canManageCustomer = useCan("manage", "Customer");
  const canCreateCustomer = useCan("create", "Customer");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl text-gray-900">Customers</h1>
          <p className="text-gray-600">
            View and manage your customer relationships.
          </p>
        </div>
        {canCreateCustomer && (
          <button
            className="rounded-lg bg-gray-900 px-4 py-2 text-white transition hover:bg-gray-800"
            type="button"
          >
            Add Customer
          </button>
        )}
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="font-medium text-gray-500 text-sm">Total Customers</h3>
          <p className="mt-1 font-bold text-2xl text-gray-900">0</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="font-medium text-gray-500 text-sm">New This Month</h3>
          <p className="mt-1 font-bold text-2xl text-green-600">0</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="font-medium text-gray-500 text-sm">
            Repeat Customers
          </h3>
          <p className="mt-1 font-bold text-2xl text-blue-600">0</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="font-medium text-gray-500 text-sm">
            Avg. Order Value
          </h3>
          <p className="mt-1 font-bold text-2xl text-indigo-600">UGX 0</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="flex flex-wrap gap-4">
          <input
            className="min-w-64 flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-gray-900"
            placeholder="Search by name, email, or phone..."
            type="text"
          />
          <select className="rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-gray-900">
            <option value="">All Customers</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select className="rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-gray-900">
            <option value="">Sort By</option>
            <option value="recent">Most Recent</option>
            <option value="orders">Most Orders</option>
            <option value="spent">Highest Spent</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                Orders
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                Total Spent
              </th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
                Last Order
              </th>
              {canManageCustomer && (
                <th className="px-6 py-3 text-right font-medium text-gray-500 text-xs uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            <tr>
              <td
                className="px-6 py-12 text-center text-gray-500"
                colSpan={canManageCustomer ? 7 : 6}
              >
                No customers found. Customers will appear here when they place
                orders.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm">Showing 0 of 0 customers</p>
        <div className="flex gap-2">
          <button
            className="cursor-not-allowed rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-500"
            disabled
            type="button"
          >
            Previous
          </button>
          <button
            className="cursor-not-allowed rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-500"
            disabled
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
