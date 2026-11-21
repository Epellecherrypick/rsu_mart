const adminSections = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/sellers", label: "Seller purchases" },
  { href: "/admin/finance", label: "Token requests & withdrawals" },
  { href: "/admin/reports", label: "Reports & monitoring" },
];

export default function AdminNav({ active }) {
  return (
    <nav className="admin-nav" aria-label="Admin dashboards">
      {adminSections.map((section) => (
        <a
          key={section.href}
          href={section.href}
          className={active === section.href ? "active" : ""}
          aria-current={active === section.href ? "page" : undefined}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
