import Image from "next/image";
import Link from "next/link";

const LOGO_SRC = "/brand/arwl-logo.svg";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      aria-label="Anand Rathi Wealth — SP Dashboard home"
      className="brand-logo-link shrink-0"
      href="/"
    >
      <Image
        alt="Anand Rathi Wealth"
        className={compact ? "h-9 w-auto" : "h-11 w-auto"}
        height={48}
        priority
        src={LOGO_SRC}
        width={220}
      />
    </Link>
  );
}
