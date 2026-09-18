// ============================================================
// PrivacyPage — StackSave AI Privacy Policy
// Transparent, enterprise-standard privacy disclosure
// ============================================================

import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import UserNavMenu from '../components/UserNavMenu';

export default function PrivacyPage() {
  const lastUpdated = 'September 17, 2026';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size="md" />
            <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
              Privacy
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              ← Back to StackSave
            </Link>
            <UserNavMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-12">
          {/* Header */}
          <div className="border-b border-slate-100 pb-6 mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Last updated: {lastUpdated}
            </p>
          </div>

          <div className="space-y-8 text-sm sm:text-base text-slate-600 leading-relaxed">
            {/* Section 1 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mb-3">
                1. Our Privacy Commitment
              </h2>
              <p>
                At StackSave AI ("StackSave"), we believe software spend intelligence should be transparent, secure, and privacy-respecting. We do not sell your personal data, we do not require registration for guest usage, and we only store account information necessary to persist your explicitly saved audits.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mb-3">
                2. Information We Collect
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-slate-800">A. Google Authentication Data</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    When you sign in using Google OAuth 2.0, Google provides us with your basic profile information (email address, full name, profile picture URL, and unique Google ID). We use this information exclusively to create and authenticate your StackSave account. We never request access to your Google Drive, Gmail, contacts, or calendar.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">B. AI Stack & Audit Inputs</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    When you run an audit or build an AI stack, you submit software tool names, seat counts, and plan selections. For guest users, this data remains in temporary session memory. For authenticated users, audits are only persisted to MongoDB when you explicitly click "Save Audit".
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">C. Technical & Session Data</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    We maintain secure, encrypted sessions using HttpOnly cookies (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-700">stacksave_session</code>). These cookies are inaccessible to third-party scripts and cross-site requests.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mb-3">
                3. How We Use Information
              </h2>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>To calculate pricing benchmarks, savings opportunities, and plan optimizations.</li>
                <li>To secure and maintain your user account and authenticate requests.</li>
                <li>To display your saved audit history and saved AI stack in your private dashboard.</li>
                <li>To prevent abuse, bot activity, and ensure service reliability.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mb-3">
                4. Data Sharing & Third Parties
              </h2>
              <p>
                StackSave does not sell, rent, or monetize your personal or audit data. Data is only processed through trusted infrastructure providers:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 mt-2">
                <li><strong>Google Cloud Identity:</strong> For secure OAuth 2.0 authentication verification.</li>
                <li><strong>MongoDB Atlas:</strong> For encrypted database persistence of user accounts and explicitly saved audits.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mb-3">
                5. Your Rights & Data Deletion
              </h2>
              <p>
                You have full control over your data. You can delete any saved audit at any time directly from your <Link to="/dashboard/audits" className="text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2">Audit Dashboard</Link>. To request complete account deletion or data purge, contact us at{' '}
                <a href="mailto:privacy@stacksave.ai" className="text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2">
                  privacy@stacksave.ai
                </a>.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mb-3">
                6. Contact Us
              </h2>
              <p>
                If you have questions regarding this Privacy Policy or our security practices, contact our team at{' '}
                <a href="mailto:privacy@stacksave.ai" className="text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2">
                  privacy@stacksave.ai
                </a>.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} StackSave AI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/terms" className="hover:text-slate-900 transition-colors">
              Terms of Service
            </Link>
            <Link to="/privacy" className="hover:text-slate-900 font-medium text-slate-700">
              Privacy Policy
            </Link>
            <Link to="/" className="hover:text-slate-900 transition-colors">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
