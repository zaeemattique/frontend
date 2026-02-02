/**
 * Sidebar Component
 *
 * Navigation sidebar with active state styling
 * Shows/hides menu items based on user role permissions
 */

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { House, Box, Folder, Files, Plug, Users, Bell, LucideIcon } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export function Sidebar() {
  const pathname = usePathname();
  const { visibleSidebarItems } = usePermissions();

  // All navigation items with their visibility names
  const allNavigation: NavItem[] = [
    { name: 'Dashboard', href: '/', icon: House },
    { name: 'Deals', href: '/deals', icon: Folder },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Knowledge Base', href: '/knowledge-base', icon: Box },
    { name: 'Templates', href: '/templates', icon: Files },
    { name: 'Integrations', href: '/integrations', icon: Plug },
    { name: 'Manage Users', href: '/users', icon: Users },
  ];

  // Filter navigation based on permissions
  const mainNavigation = allNavigation.filter((item) =>
    visibleSidebarItems.includes(item.name)
  );

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="sidebar">
      {/* Logo Section - matches header height (64px) */}
      <div className="flex items-center px-6 h-16 border-b border-neutral-200">
        <Image
          src="/icon-logo.png"
          alt="OSCAR Logo"
          width={40}
          height={40}
          className="object-contain"
        />
        <span
          className="text-primary font-koulen"
          style={{
            fontSize: '32px',
            fontWeight: 400,
            lineHeight: '18px',
            letterSpacing: '0%',
          }}
        >
          OSCAR
        </span>
      </div>

      {/* Navigation */}
      <nav className="mt-5 px-2">
        {mainNavigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-item text-lg rounded-xl hover:bg-violet-100 hover:font-bold hover:text-neutral-800 ${active
                  ? 'bg-violet-50 text-neutral-800 font-medium'
                  : 'text-brand-black'
                }`}
            >
              <item.icon className="mr-2" size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
