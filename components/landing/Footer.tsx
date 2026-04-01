const links = [
  { label: "About Us", href: "/about" },
  { label: "Examples", href: "/Workspace/Examples/" },
  { label: "Homework", href: "/Homework" },
  { label: "Projects", href: "/Workspace/Projects" },
  { label: "Tutorials", href: "/Tutorials" },
];

const social = [
  { label: "Reddit", href: "https://www.reddit.com/r/CADWOLF/" },
  { label: "Facebook", href: "https://www.facebook.com/cadwolfplatform/" },
  { label: "Twitter", href: "https://twitter.com/CADWOLFPlatform" },
  { label: "YouTube", href: "https://www.youtube.com/channel/UCQJZ2Wcg7LwIZvv_q21PhYQ" },
];

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="container mx-auto px-6 max-w-5xl flex flex-col md:flex-row justify-between gap-8">
        <div>
          <p className="text-white font-bold text-lg mb-1">CADWOLF</p>
          <p className="text-sm mb-4">
            Copyrights © 2017 All Rights Reserved by CADWOLF Inc.
          </p>
          <div className="flex flex-col gap-1 text-sm">
            {links.map(({ label, href }) => (
              <a key={label} href={href} className="hover:text-white transition-colors">
                {label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex gap-6 items-start text-sm">
          {social.map(({ label, href }) => (
            <a key={label} href={href} className="hover:text-white transition-colors">
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
