"use client";

import { useEffect, useState } from "react";
import { api, type Category } from "@/services/api";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", slug: "" });

  const [editing, setEditing] = useState<Category | null>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.categories
      .adminList()
      .then(setCategories)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const slugify = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.categories.create({
        name: createForm.name,
        slug: createForm.slug || slugify(createForm.name),
      });
      setCreateForm({ name: "", slug: "" });
      setCreateOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      await api.categories.update(editing.id, {
        name: editForm.name,
        slug: editForm.slug,
      });
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category");
    }
    setSaving(false);
  }

  async function handleDelete(category: Category) {
    setError("");
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    try {
      await api.categories.remove(category.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    }
  }

  function startEdit(category: Category) {
    setEditing(category);
    setEditForm({ name: category.name, slug: category.slug });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <button
          onClick={() => setCreateOpen((v) => !v)}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          {createOpen ? "Cancel" : "Add Category"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {createOpen && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-lg border p-4 space-y-3"
        >
          <h2 className="font-semibold">New Category</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) =>
                setCreateForm({ name: e.target.value, slug: "" })
              }
              onBlur={() =>
                setCreateForm((prev) => ({
                  ...prev,
                  slug: prev.slug || slugify(prev.name),
                }))
              }
              className="w-full rounded border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug</label>
            <input
              type="text"
              value={createForm.slug}
              onChange={(e) =>
                setCreateForm({ ...createForm, slug: e.target.value })
              }
              className="w-full rounded border px-3 py-2 text-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Create
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Slug</th>
              <th className="px-4 py-3 text-left font-medium">Products</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {categories.map((cat) =>
              editing?.id === cat.id ? (
                <tr key={cat.id} className="bg-blue-50/50">
                  <td colSpan={4} className="px-4 py-3">
                    <form
                      onSubmit={handleUpdate}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        className="w-40 rounded border px-2 py-1.5 text-sm"
                        required
                      />
                      <input
                        type="text"
                        value={editForm.slug}
                        onChange={(e) =>
                          setEditForm({ ...editForm, slug: e.target.value })
                        }
                        className="w-40 rounded border px-2 py-1.5 text-sm"
                        required
                      />
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="rounded border px-3 py-1.5 text-xs hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{cat.name}</td>
                  <td className="px-4 py-3 text-gray-500">{cat.slug}</td>
                  <td className="px-4 py-3">{cat._count.products}</td>
                  <td className="px-4 py-3 space-x-3">
                    <button
                      onClick={() => startEdit(cat)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
        {loading && <p className="p-4 text-gray-500 text-center">Loading...</p>}
        {!loading && categories.length === 0 && (
          <p className="p-4 text-gray-500 text-center">No categories found.</p>
        )}
      </div>
    </div>
  );
}
