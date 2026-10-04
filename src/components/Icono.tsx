// Iconos de Lucide para las islas (los mismos SVG que usa el componente Icono de @lopublico/ui en Astro). Solo los que se usan aquí.
import check from "@lopublico/ui/iconos/lucide/check.svg?raw";
import chevronDown from "@lopublico/ui/iconos/lucide/chevron-down.svg?raw";
import chevronUp from "@lopublico/ui/iconos/lucide/chevron-up.svg?raw";
import copy from "@lopublico/ui/iconos/lucide/copy.svg?raw";
import download from "@lopublico/ui/iconos/lucide/download.svg?raw";
import externalLink from "@lopublico/ui/iconos/lucide/external-link.svg?raw";
import flag from "@lopublico/ui/iconos/lucide/flag.svg?raw";
import info from "@lopublico/ui/iconos/lucide/info.svg?raw";
import mail from "@lopublico/ui/iconos/lucide/mail.svg?raw";
import megaphone from "@lopublico/ui/iconos/lucide/megaphone.svg?raw";
import search from "@lopublico/ui/iconos/lucide/search.svg?raw";
import share2 from "@lopublico/ui/iconos/lucide/share-2.svg?raw";

const ICONOS = { check, "chevron-down": chevronDown, "chevron-up": chevronUp, copy, download, "external-link": externalLink, flag, info, mail, megaphone, search, "share-2": share2 };

export function Icono({ nombre, tam = 14, className = "", style }: { nombre: keyof typeof ICONOS; tam?: number; className?: string; style?: Record<string, string | number> }) {
  const svg = ICONOS[nombre].replace(/<!--[\s\S]*?-->/g, "").replace(/\s(width|height|class)="[^"]*"/g, "").replace("<svg", `<svg width="${tam}" height="${tam}" aria-hidden="true"`);
  return <span className={className} style={{ display: "inline-flex", verticalAlign: "middle", ...style }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
