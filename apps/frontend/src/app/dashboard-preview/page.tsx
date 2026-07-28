'use client'

import { useState } from 'react'

export default function DashboardPreview() {
  const [activeFilter, setActiveFilter] = useState('all')

  const projects = [
    { id: 1, title: 'iPhone 12 Pro', category: 'phones', price: '$450', status: 'Available' },
    { id: 2, title: 'MacBook Air M1', category: 'laptops', price: '$750', status: 'Sold' },
    { id: 3, title: 'Samsung Galaxy S21', category: 'phones', price: '$320', status: 'Available' },
    { id: 4, title: 'AirPods Pro', category: 'accessories', price: '$120', status: 'Available' },
  ]

  const filtered = activeFilter === 'all' ? projects : projects.filter(p => p.category === activeFilter)

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">KhmerOnlineshop</span>
          <div className="flex gap-8 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-900 transition-colors">Work</a>
            <a href="#" className="hover:text-gray-900 transition-colors">About</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Contact</a>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <section className="mb-24">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
              Second-hand electronics
              <span className="block text-gray-400 mt-2">for Cambodia</span>
            </h1>
            <p className="text-lg text-gray-500 max-w-xl mb-8">
              Quality pre-owned devices at fair prices. Every item verified and guaranteed.
            </p>
            <div className="flex gap-4">
              <button className="bg-gray-900 text-white px-6 py-3 text-sm rounded-full hover:bg-gray-800 transition-colors">
                Browse Shop
              </button>
              <button className="border border-gray-200 px-6 py-3 text-sm rounded-full hover:border-gray-400 transition-colors">
                Learn More
              </button>
            </div>
          </section>

          <section className="mb-16">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-semibold">Featured Products</h2>
              <div className="flex gap-3 text-sm">
                {['all', 'phones', 'laptops', 'accessories'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-2 rounded-full transition-colors ${
                      activeFilter === filter
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filtered.map(product => (
                <div
                  key={product.id}
                  className="group border border-gray-100 rounded-2xl p-6 hover:border-gray-200 hover:shadow-sm transition-all"
                >
                  <div className="aspect-square bg-gray-50 rounded-xl mb-4 flex items-center justify-center text-gray-300">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="font-medium mb-1">{product.title}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">{product.price}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      product.status === 'Available' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
                    }`}>
                      {product.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-gray-100 pt-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                { number: '200+', label: 'Products Sold' },
                { number: '98%', label: 'Satisfied Customers' },
                { number: '30 day', label: 'Return Policy' },
              ].map(stat => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold mb-1">{stat.number}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-400">
          &copy; 2026 KhmerOnlineshopbyTheo. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
