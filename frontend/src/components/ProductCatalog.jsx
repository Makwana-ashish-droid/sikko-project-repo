import { useEffect, useState } from 'react';

const emptyProduct = {
  name: '',
  description: '',
  hsn: '',
  packing: '',
  price: 0,
  gstRate: 18
};

export default function ProductCatalog() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('Loading product catalog...');

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Unable to load products');
      setProducts(await response.json());
      setStatus('');
    } catch (error) {
      console.error(error);
      setStatus('Unable to load product catalog.');
    }
  }

  function updateForm(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function editProduct(product) {
    setForm(product);
    setEditingId(product.id);
    setStatus('Editing product.');
  }

  function resetForm() {
    setForm(emptyProduct);
    setEditingId(null);
    setStatus('Ready to add a new product.');
  }

  async function saveProduct() {
    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products';
      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save product');
      setStatus(`Product ${editingId ? 'updated' : 'created'} successfully.`);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error(error);
      setStatus(error.message);
    }
  }

  async function removeProduct(id) {
    if (!window.confirm('Delete this product?')) return;
    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Unable to delete product');
      setStatus('Product deleted successfully.');
      fetchProducts();
    } catch (error) {
      console.error(error);
      setStatus('Product delete failed.');
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Product Catalog</h2>
        <p className="mt-2 text-sm text-slate-600">Manage product master data and GST rates for invoice automation.</p>
        <div className="mt-4 text-sm text-slate-700">{status}</div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit Product' : 'New Product'}</h3>
            <div className="mt-4 space-y-4 text-sm text-slate-700">
              {[
                { label: 'Product Name', key: 'name' },
                { label: 'HSN Code', key: 'hsn' },
                { label: 'Packing', key: 'packing' },
                { label: 'GST Rate', key: 'gstRate', type: 'number' },
                { label: 'Price Per Unit', key: 'price', type: 'number' }
              ].map(field => (
                <label key={field.key} className="block">
                  <span className="block font-medium text-slate-700">{field.label}</span>
                  <input
                    type={field.type || 'text'}
                    value={form[field.key]}
                    min={field.type === 'number' ? '0' : undefined}
                    onChange={event => updateForm(field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)}
                    className="mt-2 w-full"
                  />
                </label>
              ))}
              <label className="block">
                <span className="block font-medium text-slate-700">Description</span>
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={event => updateForm('description', event.target.value)}
                  className="mt-2 w-full"
                />
              </label>
              <div className="flex flex-wrap gap-3 pt-3">
                <button onClick={saveProduct} className="rounded-xl bg-sky-600 px-5 py-3 text-white hover:bg-sky-700">
                  {editingId ? 'Update Product' : 'Create Product'}
                </button>
                <button onClick={resetForm} className="rounded-xl bg-slate-100 px-5 py-3 text-slate-700 hover:bg-slate-200">
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">Catalog List</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Name</th>
                    <th className="px-3 py-3 font-semibold">HSN</th>
                    <th className="px-3 py-3 font-semibold">Pack</th>
                    <th className="px-3 py-3 font-semibold">Rate</th>
                    <th className="px-3 py-3 font-semibold">GST</th>
                    <th className="px-3 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {products.map(product => (
                    <tr key={product.id}>
                      <td className="px-3 py-3 align-top">{product.name}</td>
                      <td className="px-3 py-3 align-top">{product.hsn}</td>
                      <td className="px-3 py-3 align-top">{product.packing}</td>
                      <td className="px-3 py-3 align-top">{product.price}</td>
                      <td className="px-3 py-3 align-top">{product.gstRate}%</td>
                      <td className="px-3 py-3 align-top space-x-2">
                        <button
                          onClick={() => editProduct(product)}
                          className="rounded-xl bg-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeProduct(product.id)}
                          className="rounded-xl bg-rose-500 px-3 py-2 text-white hover:bg-rose-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
