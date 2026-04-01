import Nav from "@/components/landing/Nav";
import Footer from "@/components/landing/Footer";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
      <div className="text-gray-600 leading-relaxed space-y-4">{children}</div>
    </div>
  );
}

function PermRow({ level, description }: { level: string; description: string }) {
  return (
    <tr>
      <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{level}</td>
      <td className="px-4 py-3 text-gray-600">{description}</td>
    </tr>
  );
}

export default function AccountsPage() {
  return (
    <>
      <Nav />

      {/* Page header */}
      <section className="pt-32 pb-12 bg-gray-900 text-white text-center">
        <div className="container mx-auto px-6 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Accounts</h1>
          <p className="text-gray-300 text-lg">
            Everything you need to know about CadWolf accounts, plans, and permissions.
          </p>
        </div>
      </section>

      {/* Documentation body */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-3xl">

          <Section title="Free accounts">
            <p>
              Anyone can create a free CadWolf account — no credit card required and no time
              limit. Free accounts have access to the full equation solver, unlimited documents
              and workspaces, CAD integrations (Onshape and Fusion 360), dataset imports,
              variable sharing between documents, and the ability to make workspaces publicly
              viewable.
            </p>
            <p>
              The one limitation of a free account is <strong>image storage</strong>. Free
              accounts cannot upload images directly to CadWolf. Images can still be displayed
              inside documents by pasting an external URL — for example, a link from an image
              host, your company CDN, or any publicly accessible URL.
            </p>
          </Section>

          <Section title="Paid accounts">
            <p>
              Paid accounts unlock direct image uploads. When you upgrade, you are allocated a
              storage quota that you can use to upload images directly into your calculation
              documents. The exact storage amount and pricing for paid accounts will be listed
              on this page once billing is live.
            </p>
            <p>
              Your storage usage is visible in your account settings. If you cancel a paid
              plan, your documents remain intact. Existing uploaded images will continue to
              display, but new uploads will be disabled until you re-subscribe or remove
              images to bring your usage below the free limit.
            </p>
          </Section>

          <Section title="Business accounts">
            <p>
              A business account is an organization that sits on top of individual user
              accounts. A company purchases a number of seats and an organization admin
              invites users to join by email. Each invited user logs in with their own
              CadWolf account — their personal account and personal files remain entirely
              separate from the organization.
            </p>
            <p>
              Storage is pooled across the organization. The total quota is determined by the
              number of seats purchased. Billing is consolidated to one account — the
              organization owner pays a single invoice covering all seats.
            </p>
            <p>
              Organization members can switch between their personal workspace and the
              organization workspace from within the app. Work done inside the organization
              workspace belongs to the organization; personal work remains personal.
            </p>
          </Section>

          <Section title="Organization roles">
            <p>
              Every member of a business account has one of three roles:
            </p>
            <div className="overflow-hidden rounded-xl border border-gray-200 mt-2">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Role</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">What they can do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <PermRow level="Owner" description="Created the organization. Full control including billing, seat management, and can dissolve the organization." />
                  <PermRow level="Admin" description="Can invite and remove members, assign roles, and manage permissions on any workspace or document the organization owns." />
                  <PermRow level="Member" description="Works inside the organization's shared workspace subject to the file-level permissions set by an admin or the file owner." />
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="File permissions">
            <p>
              Every workspace and document has three permission levels that can be granted
              independently to individual users or entire teams:
            </p>
            <div className="overflow-hidden rounded-xl border border-gray-200 mt-2">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Level</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">What it allows</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <PermRow level="View" description="Read documents and run the solver. Cannot make any changes." />
                  <PermRow level="Edit" description="Add, modify, and delete blocks, datasets, and imports. Cannot change who has access." />
                  <PermRow level="Admin" description="Full control including changing permissions and deleting the file." />
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              Permissions can be set in one of three modes on each workspace or document:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li><strong>Public</strong> — anyone with the link can view (view level only).</li>
              <li><strong>Inherited</strong> — the same rules as the parent workspace apply. This is the default for new documents and folders.</li>
              <li><strong>Explicit</strong> — access is granted to a specific list of users or teams. Organization admins can manage these lists for any file the organization owns.</li>
            </ul>
            <p>
              The file owner always has full admin access regardless of any permission setting.
            </p>
          </Section>

          <Section title="Joining an organization">
            <p>
              If your company has a CadWolf business account, an organization admin will send
              you an invite to your email address. Click the link in the email to accept. If
              you already have a CadWolf account, log in and the invite will be applied. If
              you do not have an account yet, you can create one during the acceptance flow.
            </p>
            <p>
              Once accepted, you can switch between your personal workspace and the
              organization workspace from the workspace switcher in the app. Leaving an
              organization has no effect on your personal account or files.
            </p>
          </Section>

        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-700 py-16 text-white text-center">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold mb-3">Ready to get started?</h2>
          <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
            Create your free account in under a minute. No credit card required.
          </p>
          <a
            href="/register"
            className="inline-block bg-white text-blue-700 font-bold px-10 py-4 rounded-full text-lg hover:bg-blue-50 transition-colors"
          >
            Create Free Account
          </a>
        </div>
      </section>

      <Footer />
    </>
  );
}
