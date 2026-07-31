"use client";

import { useState, useMemo } from "react";
import { categoryThumbs } from "@/components/community/CategoryThumbs";

const categories = [
  {
    id: "angkor",
    name: "Angkor Wat & Temples",
    icon: "🏛️",
    count: 180,
    color: "text-amber-700",
    bg: "bg-amber-50",
    sites: [
      { name: "Angkor Wat", count: 45, color: "bg-amber-100 text-amber-800" },
      { name: "Bayon", count: 28, color: "bg-stone-100 text-stone-800" },
      { name: "Ta Prohm", count: 32, color: "bg-emerald-100 text-emerald-800" },
      { name: "Angkor Thom", count: 25, color: "bg-orange-100 text-orange-800" },
      { name: "Banteay Srei", count: 22, color: "bg-pink-100 text-pink-800" },
      { name: "Preah Khan", count: 18, color: "bg-slate-100 text-slate-800" },
      { name: "Other Temples", count: 30, color: "bg-gray-100 text-gray-800" },
    ],
    sources: [
      { name: "Freepik - Angkor Vectors", url: "https://www.freepik.com/search?format=search&query=angkor+wat", type: "Vectors & PNGs" },
      { name: "Pixabay - Angkor Wat", url: "https://pixabay.com/images/search/angkor+wat/", type: "Free PNG/Photos" },
      { name: "Unsplash - Cambodia Temples", url: "https://unsplash.com/s/photos/angkor-wat", type: "Free Photos" },
      { name: "CleanPNG - Angkor", url: "https://www.cleanpng.com/search/angkor-wat.html", type: "PNG Cutouts" },
    ],
  },
  {
    id: "culture",
    name: "Khmer Culture & Traditions",
    icon: "💃",
    count: 220,
    color: "text-red-600",
    bg: "bg-red-50",
    sites: [
      { name: "Apsara Dance", count: 38, color: "bg-red-100 text-red-800" },
      { name: "Classical Dance", count: 30, color: "bg-rose-100 text-rose-800" },
      { name: "Ceremonies & Rituals", count: 42, color: "bg-purple-100 text-purple-800" },
      { name: "Monks & Buddhism", count: 35, color: "bg-yellow-100 text-yellow-800" },
      { name: "Festivals (Pchum Ben, Khmer New Year)", count: 45, color: "bg-green-100 text-green-800" },
      { name: "Village Life", count: 30, color: "bg-teal-100 text-teal-800" },
    ],
    sources: [
      { name: "Freepik - Khmer Culture", url: "https://www.freepik.com/search?format=search&query=khmer+culture", type: "Vectors & PNGs" },
      { name: "Flaticon - Cambodia Icons", url: "https://www.flaticon.com/search?word=cambodia", type: "PNG Icons" },
      { name: "PNGTree - Apsara", url: "https://pngtree.com/so/apsara", type: "PNG Resources" },
      { name: "Vecteezy - Khmer Dance", url: "https://www.vecteezy.com/free-vector/khmer-dance", type: "Free Vectors" },
    ],
  },
  {
    id: "flag",
    name: "Flag & National Symbols",
    icon: "🇰🇭",
    count: 95,
    color: "text-blue-700",
    bg: "bg-blue-50",
    sites: [
      { name: "Cambodian Flag", count: 25, color: "bg-blue-100 text-blue-800" },
      { name: "Royal Arms", count: 12, color: "bg-indigo-100 text-indigo-800" },
      { name: "National Symbols", count: 20, color: "bg-cyan-100 text-cyan-800" },
      { name: "Map of Cambodia", count: 18, color: "bg-sky-100 text-sky-800" },
      { name: "Krama Patterns", count: 20, color: "bg-red-100 text-red-800" },
    ],
    sources: [
      { name: "Flagpedia - Cambodia Flag", url: "https://flagpedia.net/cambodia", type: "Flag PNGs" },
      { name: "Wikimedia - Cambodia", url: "https://commons.wikimedia.org/wiki/Cambodia", type: "Free Media" },
      { name: "PNGMart - Cambodia Flag", url: "https://www.pngmart.com/search/cambodia", type: "PNG Downloads" },
      { name: "Countryflags - Cambodia", url: "https://www.countryflags.com/cambodia-flag-image/", type: "Flag PNGs" },
    ],
  },
  {
    id: "clothing",
    name: "Traditional Clothing",
    icon: "👘",
    count: 150,
    color: "text-pink-700",
    bg: "bg-pink-50",
    sites: [
      { name: "Sampot", count: 35, color: "bg-pink-100 text-pink-800" },
      { name: "Krama (Scarf)", count: 28, color: "bg-rose-100 text-rose-800" },
      { name: "Wedding Attire", count: 30, color: "bg-red-100 text-red-800" },
      { name: "Traditional Jewelry", count: 22, color: "bg-yellow-100 text-yellow-800" },
      { name: "Modern Khmer Fashion", count: 35, color: "bg-purple-100 text-purple-800" },
    ],
    sources: [
      { name: "Freepik - Cambodian Traditional", url: "https://www.freepik.com/search?format=search&query=cambodian+traditional+clothing", type: "Free PNGs" },
      { name: "PNGTree - Sampot", url: "https://pngtree.com/so/sampot", type: "PNG Resources" },
      { name: "Vecteezy - Khmer Fashion", url: "https://www.vecteezy.com/free-vector/khmer-clothing", type: "Free Vectors" },
    ],
  },
  {
    id: "food",
    name: "Cambodian Food",
    icon: "🍜",
    count: 130,
    color: "text-orange-600",
    bg: "bg-orange-50",
    sites: [
      { name: "Amok", count: 22, color: "bg-orange-100 text-orange-800" },
      { name: "Lok Lak", count: 18, color: "bg-red-100 text-red-800" },
      { name: "Nom Banh Chok", count: 15, color: "bg-yellow-100 text-yellow-800" },
      { name: "Fruits (Mango, Dragonfruit)", count: 28, color: "bg-green-100 text-green-800" },
      { name: "Street Food", count: 25, color: "bg-amber-100 text-amber-800" },
      { name: "Desserts", count: 22, color: "bg-pink-100 text-pink-800" },
    ],
    sources: [
      { name: "Freepik - Cambodian Food", url: "https://www.freepik.com/search?format=search&query=cambodian+food", type: "Free PNGs & Vectors" },
      { name: "Pixabay - Asian Food", url: "https://pixabay.com/images/search/cambodian+food/", type: "Free Photos" },
      { name: "CleanPNG - Food", url: "https://www.cleanpng.com/search/cambodian-food.html", type: "PNG Cutouts" },
    ],
  },
  {
    id: "nature",
    name: "Nature & Landscapes",
    icon: "🌴",
    count: 200,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    sites: [
      { name: "Mekong River", count: 30, color: "bg-blue-100 text-blue-800" },
      { name: "Tonle Sap Lake", count: 25, color: "bg-cyan-100 text-cyan-800" },
      { name: "Beaches (Sihanoukville, Koh Rong)", count: 35, color: "bg-sky-100 text-sky-800" },
      { name: "Rice Fields & Countryside", count: 40, color: "bg-green-100 text-green-800" },
      { name: "Rainforest & Wildlife", count: 35, color: "bg-emerald-100 text-emerald-800" },
      { name: "Sunrise/Sunset", count: 35, color: "bg-orange-100 text-orange-800" },
    ],
    sources: [
      { name: "Unsplash - Cambodia", url: "https://unsplash.com/s/photos/cambodia", type: "Free Photos" },
      { name: "Pexels - Cambodia", url: "https://www.pexels.com/search/cambodia/", type: "Free Stock Photos" },
      { name: "Pixabay - Cambodia", url: "https://pixabay.com/images/search/cambodia/", type: "Free Images" },
      { name: "Freepik - Cambodia Landscape", url: "https://www.freepik.com/search?format=search&query=cambodia+landscape", type: "Vectors & PNGs" },
    ],
  },
  {
    id: "patterns",
    name: "Khmer Patterns & Textiles",
    icon: "🎨",
    count: 120,
    color: "text-purple-700",
    bg: "bg-purple-50",
    sites: [
      { name: "Traditional Patterns", count: 35, color: "bg-purple-100 text-purple-800" },
      { name: "Silk Weaving", count: 25, color: "bg-fuchsia-100 text-fuchsia-800" },
      { name: "Batik & Ikat", count: 20, color: "bg-indigo-100 text-indigo-800" },
      { name: "Ornamental Motifs", count: 22, color: "bg-violet-100 text-violet-800" },
      { name: "Sacred Geometry", count: 18, color: "bg-pink-100 text-pink-800" },
    ],
    sources: [
      { name: "Freepik - Khmer Pattern", url: "https://www.freepik.com/search?format=search&query=khmer+pattern", type: "Free Patterns" },
      { name: "Flaticon - Cambodia Pattern", url: "https://www.flaticon.com/search?word=cambodia+pattern", type: "PNG Icons" },
      { name: "Vecteezy - Khmer Pattern", url: "https://www.vecteezy.com/free-vector/khmer-pattern", type: "Free Vectors" },
    ],
  },
  {
    id: "wildlife",
    name: "Cambodia Wildlife",
    icon: "🐘",
    count: 85,
    color: "text-green-700",
    bg: "bg-green-50",
    sites: [
      { name: "Kouprey (National Animal)", count: 12, color: "bg-green-100 text-green-800" },
      { name: "Royal Turtle", count: 15, color: "bg-emerald-100 text-emerald-800" },
      { name: "Elephants", count: 18, color: "bg-slate-100 text-slate-800" },
      { name: "Birds (Mekong species)", count: 22, color: "bg-sky-100 text-sky-800" },
      { name: "Mekong Dolphins", count: 10, color: "bg-blue-100 text-blue-800" },
      { name: "Other Wildlife", count: 8, color: "bg-teal-100 text-teal-800" },
    ],
    sources: [
      { name: "Unsplash - Cambodia Wildlife", url: "https://unsplash.com/s/photos/cambodia-wildlife", type: "Free Photos" },
      { name: "Pexels - Animals Cambodia", url: "https://www.pexels.com/search/cambodia%20animal/", type: "Free Stock" },
      { name: "Freepik - Wildlife Vectors", url: "https://www.freepik.com/search?format=search&query=cambodia+animals", type: "Free Vectors" },
    ],
  },
  {
    id: "architecture",
    name: "Khmer Architecture",
    icon: "🏗️",
    count: 95,
    color: "text-stone-700",
    bg: "bg-stone-50",
    sites: [
      { name: "Traditional Houses", count: 25, color: "bg-stone-100 text-stone-800" },
      { name: "Pagodas & Wats", count: 30, color: "bg-yellow-100 text-yellow-800" },
      { name: "Royal Palace", count: 18, color: "bg-amber-100 text-amber-800" },
      { name: "Colonial Architecture", count: 12, color: "bg-gray-100 text-gray-800" },
      { name: "Modern Khmer Design", count: 10, color: "bg-slate-100 text-slate-800" },
    ],
    sources: [
      { name: "Unsplash - Khmer Architecture", url: "https://unsplash.com/s/photos/khmer-architecture", type: "Free Photos" },
      { name: "Freepik - Cambodia Building", url: "https://www.freepik.com/search?format=search&query=cambodia+building", type: "Vectors & PNGs" },
    ],
  },
  {
    id: "people",
    name: "People & Portraits",
    icon: "👥",
    count: 160,
    color: "text-sky-700",
    bg: "bg-sky-50",
    sites: [
      { name: "Children", count: 35, color: "bg-sky-100 text-sky-800" },
      { name: "Monks in Daily Life", count: 30, color: "bg-orange-100 text-orange-800" },
      { name: "Farmers & Fishermen", count: 35, color: "bg-green-100 text-green-800" },
      { name: "Artisans & Craftsmen", count: 28, color: "bg-yellow-100 text-yellow-800" },
      { name: "Festival & Celebration", count: 32, color: "bg-red-100 text-red-800" },
    ],
    sources: [
      { name: "Unsplash - Cambodian People", url: "https://unsplash.com/s/photos/cambodian-people", type: "Free Photos" },
      { name: "Pexels - Cambodia People", url: "https://www.pexels.com/search/cambodia%20people/", type: "Free Stock" },
      { name: "Freepik - Cambodian People", url: "https://www.freepik.com/search?format=search&query=cambodian+people", type: "Free Vectors" },
    ],
  },
  {
    id: "religious",
    name: "Religious & Spiritual",
    icon: "☸️",
    count: 110,
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    sites: [
      { name: "Buddha Statues", count: 30, color: "bg-yellow-100 text-yellow-800" },
      { name: "Pagoda Art", count: 25, color: "bg-amber-100 text-amber-800" },
      { name: "Hindu Deities (Vishnu, Shiva)", count: 20, color: "bg-orange-100 text-orange-800" },
      { name: "Spirit Houses", count: 18, color: "bg-red-100 text-red-800" },
      { name: "Meditation & Yoga", count: 17, color: "bg-purple-100 text-purple-800" },
    ],
    sources: [
      { name: "Freepik - Buddha", url: "https://www.freepik.com/search?format=search&query=buddha+cambodia", type: "Free PNGs" },
      { name: "CleanPNG - Buddha", url: "https://www.cleanpng.com/search/buddha.html", type: "PNG Cutouts" },
      { name: "PNGTree - Buddhist", url: "https://pngtree.com/so/buddhist", type: "PNG Resources" },
    ],
  },
  {
    id: "icons",
    name: "UI Icons & Graphics",
    icon: "🖌️",
    count: 200,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    sites: [
      { name: "Khmer UI Icons", count: 50, color: "bg-indigo-100 text-indigo-800" },
      { name: "Country Silhouettes", count: 30, color: "bg-blue-100 text-blue-800" },
      { name: "Travel Badges", count: 40, color: "bg-cyan-100 text-cyan-800" },
      { name: "Food Icons", count: 45, color: "bg-orange-100 text-orange-800" },
      { name: "Cultural Symbols", count: 35, color: "bg-purple-100 text-purple-800" },
    ],
    sources: [
      { name: "Flaticon - Cambodia Icons", url: "https://www.flaticon.com/search?word=cambodia+flag", type: "Free PNG Icons" },
      { name: "SVGRepo - Cambodia", url: "https://www.svgrepo.com/collection/cambodia-vectors/", type: "Free SVGs/PNGs" },
      { name: "Icon8 - Cambodia", url: "https://icons8.com/icons/set/cambodia", type: "Free Icons" },
    ],
  },
];

const colorPalettes = [
  {
    name: "Khmer Flag",
    colors: ["#1a237e", "#d42027", "#ffffff"],
    desc: "National flag colors",
  },
  {
    name: "Temple Stone",
    colors: ["#8B7D6B", "#6B5E4F", "#A8907C", "#C4B5A5", "#E8DDD0"],
    desc: "Angkor Wat sandstone tones",
  },
  {
    name: "Apsara Gold",
    colors: ["#D4A027", "#F0C040", "#8B6914", "#FFD966", "#F5E6B8"],
    desc: "Classical dance ornaments",
  },
  {
    name: "Mekong Green",
    colors: ["#2D5016", "#4A7C28", "#6BA33D", "#8BC34A", "#AED581"],
    desc: "Rice fields & countryside",
  },
  {
    name: "Sunset Sky",
    colors: ["#FF6B35", "#FF8C42", "#FFAB5E", "#FFD180", "#FFE0B2"],
    desc: "Cambodian sunset hues",
  },
  {
    name: "Sacred Saffron",
    colors: ["#E65100", "#FF6F00", "#FF8F00", "#FFA726", "#FFCC80"],
    desc: "Monk robes & pagoda gold",
  },
  {
    name: "Tonle Sap",
    colors: ["#0D47A1", "#1565C0", "#1E88E5", "#42A5F5", "#90CAF9"],
    desc: "Lake & river waters",
  },
  {
    name: "Royal Purple",
    colors: ["#4A148C", "#6A1B9A", "#8E24AA", "#AB47BC", "#CE93D8"],
    desc: "Cambodian royalty",
  },
  {
    name: "Tropical Fruit",
    colors: ["#FFB300", "#FF6F00", "#E53935", "#43A047", "#FB8C00"],
    desc: "Mango, dragonfruit, palm",
  },
  {
    name: "Silk Weave",
    colors: ["#C62828", "#AD1457", "#6A1B9A", "#283593", "#00838F"],
    desc: "Traditional silk textiles",
  },
  {
    name: "Forest Canopy",
    colors: ["#1B5E20", "#2E7D32", "#388E3C", "#43A047", "#66BB6A"],
    desc: "Cambodian rainforest",
  },
  {
    name: "Coastal Sand",
    colors: ["#F5E6CA", "#E8D5B0", "#D4C4A0", "#B8A88C", "#A09070"],
    desc: "Sihanoukville beaches",
  },
];

export default function DesignPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.sites.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [search]);

  const totalResources = categories.reduce((sum, c) => sum + c.count, 0);
  const totalSources = categories.reduce((sum, c) => sum + c.sources.length, 0);

  const activeData = activeCategory
    ? categories.find((c) => c.id === activeCategory)
    : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Design Assets</h1>
        <p className="page-subtitle">
          Free Cambodia-themed PNG resources, color palettes, and design tools for your projects.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <span className="text-2xl font-bold text-khmer-blue">{totalResources}+</span>
          <p className="text-xs text-gray-500 mt-1">Free PNG Resources</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <span className="text-2xl font-bold text-khmer-gold">{categories.length}</span>
          <p className="text-xs text-gray-500 mt-1">Categories</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <span className="text-2xl font-bold text-green-600">{totalSources}+</span>
          <p className="text-xs text-gray-500 mt-1">Source Links</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <span className="text-2xl font-bold text-purple-600">{colorPalettes.length}</span>
          <p className="text-xs text-gray-500 mt-1">Color Palettes</p>
        </div>
      </div>

      {/* Search & View Toggle */}
      <div className="flex gap-3 mb-6 items-center">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search design assets, categories, or keywords..."
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setViewMode("grid")} className={`px-3 py-1.5 text-xs rounded-md transition font-medium ${viewMode === "grid" ? "bg-white shadow-sm text-khmer-blue" : "text-gray-500 hover:text-gray-700"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
          </button>
          <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 text-xs rounded-md transition font-medium ${viewMode === "list" ? "bg-white shadow-sm text-khmer-blue" : "text-gray-500 hover:text-gray-700"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
          </button>
        </div>
      </div>

      {/* Color Palettes Section */}
      <section className="mb-10">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400" />
          Khmer Color Palettes
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {colorPalettes.map((palette) => (
            <div key={palette.name} className="rounded-xl border border-gray-200 bg-white p-3 hover:shadow-md transition">
              <div className="flex rounded-lg overflow-hidden h-8 mb-2">
                {palette.colors.map((c, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: c }} title={c} />
                ))}
              </div>
              <p className="text-xs font-semibold text-gray-800 truncate">{palette.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{palette.desc}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {palette.colors.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => navigator.clipboard.writeText(c)}
                    className="text-[10px] font-mono text-gray-500 hover:text-khmer-blue bg-gray-50 px-1.5 py-0.5 rounded hover:bg-blue-50 transition"
                    title={`Copy ${c}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Category Browser */}
      {activeData ? (
        <div className="mb-8">
          <button onClick={() => setActiveCategory(null)} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to all categories
          </button>
          <div className={`rounded-2xl border p-6 ${activeData.bg}`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-16 rounded-xl overflow-hidden ring-1 ring-black/10 shrink-0 shadow-sm">
                {(() => { const T = categoryThumbs[activeData.id]; return T ? <T className="w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-3xl bg-white">{activeData.icon}</div> })()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{activeData.name}</h2>
                <p className="text-sm text-gray-500">{activeData.count}+ free PNG resources</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-6">
              {activeData.sites.map((site) => (
                <div key={site.name} className={`${site.color} rounded-lg px-3 py-2 text-xs font-medium text-center`}>
                  {site.name}
                  <span className="block text-[10px] opacity-70 mt-0.5">{site.count} PNGs</span>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-gray-700 mb-3">Free Download Sources</h3>
            <div className="grid gap-2">
              {activeData.sources.map((src) => (
                <a
                  key={src.name}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-white rounded-xl px-4 py-3 hover:shadow-sm transition border border-gray-200 group"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-khmer-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    <div>
                      <p className="text-sm font-medium text-gray-800 group-hover:text-khmer-blue transition">{src.name}</p>
                      <span className="text-xs text-gray-400">{src.type}</span>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-khmer-blue transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Category Grid */}
      {!activeData ? (
        <section>
          <h2 className="section-title mb-4">Browse by Category</h2>
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No categories match your search</p>
              <p className="text-sm mt-1">Try a different keyword.</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="text-left rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition group card-hover"
                >
                  <div className={`w-full h-24 rounded-lg overflow-hidden ring-1 ring-black/5 mb-3`}>
                    {(() => { const T = categoryThumbs[cat.id]; return T ? <T className="w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-3xl bg-white">{cat.icon}</div> })()}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-khmer-blue transition-colors">{cat.name}</h3>
                  <p className="text-sm text-gray-400">{cat.count}+ free resources</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {cat.sites.slice(0, 3).map((site) => (
                      <span key={site.name} className={`${site.color} text-[10px] rounded px-1.5 py-0.5`}>
                        {site.name}
                      </span>
                    ))}
                    {cat.sites.length > 3 && (
                      <span className="text-[10px] text-gray-400 px-1">+{cat.sites.length - 3}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="w-full text-left flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm transition group"
                >
                  <div className="w-24 h-16 rounded-lg overflow-hidden ring-1 ring-black/5 shrink-0">
                    {(() => { const T = categoryThumbs[cat.id]; return T ? <T className="w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-2xl bg-white">{cat.icon}</div> })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-khmer-blue transition-colors">{cat.name}</h3>
                    <p className="text-xs text-gray-400">{cat.count}+ resources across {cat.sites.length} subcategories</p>
                  </div>
                  <span className="text-xs text-gray-400">{cat.sources.length} sources</span>
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-khmer-blue transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Design Tips Section */}
      <section className="mt-10 p-6 rounded-2xl bg-gradient-to-br from-khmer-blue/5 to-purple-50/50 border border-khmer-blue/10">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-khmer-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
          Design Tips for Cambodia-Themed Projects
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="bg-white/80 rounded-xl p-4 border border-gray-100">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-lg">🎨</span>
            </div>
            <p className="font-medium text-gray-800 mb-1">Use Authentic Colors</p>
            <p className="text-xs text-gray-500">Reference the color palettes above — especially temple stone, saffron, and flag colors for authentic Khmer design.</p>
          </div>
          <div className="bg-white/80 rounded-xl p-4 border border-gray-100">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-lg">🖼️</span>
            </div>
            <p className="font-medium text-gray-800 mb-1">High-Resolution Assets</p>
            <p className="text-xs text-gray-500">Use Unsplash and Pexels for print-ready photos. Freepik and Vecteezy are best for scalable vectors and PNGs.</p>
          </div>
          <div className="bg-white/80 rounded-xl p-4 border border-gray-100">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-lg">✒️</span>
            </div>
            <p className="font-medium text-gray-800 mb-1">Pair Fonts Carefully</p>
            <p className="text-xs text-gray-500">Combine Playfair Display (headings) with Inter (body) for a clean, professional Khmer-themed layout.</p>
          </div>
          <div className="bg-white/80 rounded-xl p-4 border border-gray-100">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-lg">📐</span>
            </div>
            <p className="font-medium text-gray-800 mb-1">Respect the Culture</p>
            <p className="text-xs text-gray-500">Always use images respectfully. Avoid modifying sacred symbols. Credit photographers when required.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
