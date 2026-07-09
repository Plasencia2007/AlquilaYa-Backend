import { Fragment } from 'react';
import Link from 'next/link';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export interface Crumb {
  label: string;
  /** Sin href = página actual (último elemento). */
  href?: string;
}

interface PageBreadcrumbProps {
  items: Crumb[];
  className?: string;
}

/**
 * Breadcrumb visual + JSON-LD BreadcrumbList (SEO, ítem 460) en un solo
 * componente — para no repetir el mapeo de rutas en cada página anidada.
 */
export function PageBreadcrumb({ items, className }: PageBreadcrumbProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
    })),
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumb className={className}>
        <BreadcrumbList>
          {items.map((item, i) => (
            <Fragment key={item.href ?? item.label}>
              <BreadcrumbItem>
                {item.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="line-clamp-1">{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {i < items.length - 1 && <BreadcrumbSeparator />}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}
