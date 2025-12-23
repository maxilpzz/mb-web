'use client'

import Link from 'next/link'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-400 mb-4">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-2">
          {index > 0 && <span className="text-gray-600">›</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-300">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
