import { Package, TrendingDown, Plus } from 'lucide-react';

const assets = [
  { id: 1, code: 'FA-001', name: 'Office Building - HQ', category: 'Buildings', purchaseDate: '2020-01-15', cost: 2500000, usefulLife: 300, accDepreciation: 250000, bookValue: 2250000, status: 'Active' },
  { id: 2, code: 'FA-012', name: 'Delivery Van - Mercedes', category: 'Vehicles', purchaseDate: '2023-06-20', cost: 180000, usefulLife: 60, accDepreciation: 60000, bookValue: 120000, status: 'Active' },
  { id: 3, code: 'FA-035', name: 'Production Machinery', category: 'Equipment', purchaseDate: '2022-03-10', cost: 450000, usefulLife: 120, accDepreciation: 112500, bookValue: 337500, status: 'Active' },
  { id: 4, code: 'FA-048', name: 'Computer Servers', category: 'IT Equipment', purchaseDate: '2024-01-05', cost: 85000, usefulLife: 36, accDepreciation: 9444, bookValue: 75556, status: 'Active' },
  { id: 5, code: 'FA-052', name: 'Office Furniture Set', category: 'Furniture', purchaseDate: '2023-09-15', cost: 42000, usefulLife: 84, accDepreciation: 7000, bookValue: 35000, status: 'Active' },
];

const categories = [
  { name: 'Buildings', count: 3, totalValue: 3800000 },
  { name: 'Vehicles', count: 5, totalValue: 620000 },
  { name: 'Equipment', count: 12, totalValue: 1250000 },
  { name: 'IT Equipment', count: 24, totalValue: 385000 },
  { name: 'Furniture', count: 8, totalValue: 156000 },
];

export default function FixedAssetsPage() {
  const totalAssetValue = assets.reduce((sum, a) => sum + a.bookValue, 0);
  const totalDepreciation = assets.reduce((sum, a) => sum + a.accDepreciation, 0);
  const totalCost = assets.reduce((sum, a) => sum + a.cost, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Fixed Assets</h1>
          <p className="text-gray-600">Manage fixed assets, depreciation, and maintenance</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5" />
          Add Asset
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="p-3 rounded-lg bg-blue-100 text-blue-600 w-fit mb-3">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Total Assets</h3>
          <p className="text-2xl font-bold">{assets.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="p-3 rounded-lg bg-purple-100 text-purple-600 w-fit mb-3">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Purchase Cost</h3>
          <p className="text-2xl font-bold">${totalCost.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="p-3 rounded-lg bg-red-100 text-red-600 w-fit mb-3">
            <TrendingDown className="w-6 h-6" />
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Accumulated Depreciation</h3>
          <p className="text-2xl font-bold text-red-600">${totalDepreciation.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="p-3 rounded-lg bg-green-100 text-green-600 w-fit mb-3">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-sm text-gray-600 mb-1">Net Book Value</h3>
          <p className="text-2xl font-bold text-green-600">${totalAssetValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Asset Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {categories.map((cat, index) => (
            <div key={index} className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">{cat.name}</h3>
              <p className="text-sm text-gray-600 mb-1">{cat.count} assets</p>
              <p className="text-lg font-bold text-purple-600">${cat.totalValue.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Asset Register</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Purchase Cost</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acc. Depreciation</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Book Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">{asset.code}</td>
                  <td className="px-6 py-4">{asset.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                      {asset.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{asset.purchaseDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">${asset.cost.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                    ${asset.accDepreciation.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                    ${asset.bookValue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      {asset.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
