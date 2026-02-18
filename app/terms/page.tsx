import { Metadata } from 'next';
import { BackgroundLayer } from '@/components/landing/BackgroundLayer';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service | Zenko',
  description: 'Zenko Terms of Service',
};

export default function TermsPage() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
      <BackgroundLayer />
      <Navbar />
      <div className="relative z-10 px-4 md:px-6 pt-24 md:pt-32 pb-12">
        <article className="prose prose-invert prose-sm md:prose-base mx-auto max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-neutral-500 text-sm mb-10">Last updated: February 18, 2026</p>

          <h2>1. Introduction</h2>
          <p>
            Welcome to Zenko (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Zenko platform, including our website at waitlist.zenko.gg (collectively, the &quot;Service&quot;). By accessing or using the Service, you agree to be bound by these Terms.
          </p>
          <p>If you do not agree to these Terms, you may not access or use the Service.</p>

          <h2>2. Eligibility</h2>
          <p>
            You must be at least 13 years of age to use the Service. If you are between 13 and 18 years of age (or the age of legal majority in your jurisdiction), you may only use the Service with the consent and supervision of a parent or legal guardian who agrees to be bound by these Terms.
          </p>
          <p>By using the Service, you represent and warrant that you meet these eligibility requirements.</p>

          <h2>3. Account Registration</h2>
          <p>
            To participate in the Zenko waitlist, you must create an account by authenticating through one of our supported OAuth providers (Google, Twitch, or X/Twitter). When you register:
          </p>
          <ul>
            <li>You authorize us to access certain information from your OAuth provider account, including your name, email address (if available), and profile avatar</li>
            <li>You agree to provide accurate and complete information</li>
            <li>You are responsible for maintaining the security of your account</li>
            <li>You agree to notify us immediately of any unauthorized access to your account</li>
            <li>You may not create multiple accounts or share your account with others</li>
            <li>You may not use another person&apos;s account without permission</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms or for any other reason at our discretion.</p>

          <h2>4. Waitlist and Referral Program</h2>
          <p>Zenko is currently in a pre-launch waitlist phase. By joining the waitlist:</p>
          <ul>
            <li>You may receive early access invitations based on your waitlist position and activity</li>
            <li>You can participate in our referral program to earn reputation points (XP) by inviting others to join the waitlist</li>
            <li>Reputation points have no monetary value and are solely for tracking engagement and determining waitlist priority</li>
            <li>We reserve the right to modify, suspend, or terminate the referral program at any time</li>
            <li>Any attempt to manipulate, abuse, or exploit the referral system (including creating fake accounts, using bots, or engaging in fraudulent activity) will result in immediate disqualification and account termination</li>
            <li>Reputation points are non-transferable and cannot be exchanged for cash or other benefits</li>
          </ul>

          <h2>5. User Conduct</h2>
          <p>When using the Service, you agree to:</p>
          <ul>
            <li>Comply with all applicable laws and regulations</li>
            <li>Respect other users and maintain a positive community environment</li>
            <li>Not engage in harassment, hate speech, discrimination, or abusive behavior</li>
            <li>Not impersonate others or misrepresent your identity</li>
            <li>Not attempt to gain unauthorized access to the Service or other users&apos; accounts</li>
            <li>Not use the Service for any illegal, fraudulent, or malicious purposes</li>
            <li>Not upload, transmit, or distribute any viruses, malware, or harmful code</li>
            <li>Not spam, solicit, or engage in commercial activity without our permission</li>
            <li>Not scrape, data mine, or use automated tools to access the Service</li>
          </ul>
          <p>We reserve the right to investigate violations and take appropriate action, including account suspension or termination.</p>

          <h2>6. Intellectual Property</h2>
          <p>
            The Service, including all content, features, functionality, software, text, graphics, logos, and trademarks, is owned by Zenko and is protected by copyright, trademark, and other intellectual property laws.
          </p>
          <p>You are granted a limited, non-exclusive, non-transferable license to access and use the Service for personal, non-commercial purposes. You may not:</p>
          <ul>
            <li>Copy, modify, distribute, sell, or lease any part of the Service</li>
            <li>Reverse engineer or attempt to extract source code from the Service</li>
            <li>Remove or alter any copyright, trademark, or proprietary notices</li>
            <li>Use our trademarks or branding without written permission</li>
          </ul>
          <p>Any feedback, suggestions, or ideas you provide about the Service may be used by us without obligation or compensation to you.</p>

          <h2>7. Privacy</h2>
          <p>
            Your privacy is important to us. Our <a href="/privacy" className="text-purple-300 hover:text-purple-200">Privacy Policy</a> explains how we collect, use, and protect your personal information. By using the Service, you consent to our collection and use of information as described in the Privacy Policy.
          </p>

          <h2>8. Third-Party Services</h2>
          <p>
            The Service integrates with third-party authentication providers (Google, Twitch, X/Twitter) and other services. Your use of these third-party services is subject to their respective terms of service and privacy policies. We are not responsible for the practices or content of third-party services.
          </p>

          <h2>9. Disclaimers</h2>
          <p className="uppercase text-xs tracking-wide">
            The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied. We disclaim all warranties, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </p>
          <p>We do not guarantee that:</p>
          <ul>
            <li>The Service will be uninterrupted, secure, or error-free</li>
            <li>Any defects will be corrected</li>
            <li>The Service will meet your requirements or expectations</li>
            <li>Your waitlist position guarantees access to future features</li>
          </ul>

          <h2>10. Limitation of Liability</h2>
          <p className="uppercase text-xs tracking-wide">
            To the maximum extent permitted by law, Zenko and its affiliates, officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or use, arising out of or related to these Terms or the Service.
          </p>
          <p>Some jurisdictions do not allow limitations on liability, so these limitations may not apply to you.</p>

          <h2>11. Indemnification</h2>
          <p>You agree to indemnify, defend, and hold harmless Zenko and its affiliates from any claims, liabilities, damages, losses, and expenses (including legal fees) arising out of or related to:</p>
          <ul>
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any rights of another person or entity</li>
            <li>Your violation of any applicable laws or regulations</li>
          </ul>

          <h2>12. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time by posting revised Terms on our website. Material changes will be notified through the Service or via email. Your continued use of the Service after changes become effective constitutes acceptance of the revised Terms.
          </p>
          <p>If you do not agree to the modified Terms, you must stop using the Service.</p>

          <h2>13. Termination</h2>
          <p>We may suspend or terminate your access to the Service at any time, with or without cause, with or without notice. Upon termination:</p>
          <ul>
            <li>Your right to access and use the Service immediately ceases</li>
            <li>We may delete your account and associated data</li>
            <li>Provisions of these Terms that by their nature should survive termination will remain in effect</li>
          </ul>
          <p>You may delete your account at any time by contacting us at support@zenko.gg.</p>

          <h2>14. Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the jurisdiction in which Zenko operates, without regard to conflict of law principles. Any disputes arising out of or relating to these Terms or the Service shall be resolved through binding arbitration, except that either party may seek injunctive relief in court for intellectual property infringement or unauthorized access to the Service.
          </p>

          <h2>15. Miscellaneous</h2>
          <p><strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy, constitute the entire agreement between you and Zenko regarding the Service.</p>
          <p><strong>Severability:</strong> If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will remain in full force and effect.</p>
          <p><strong>Waiver:</strong> Our failure to enforce any right or provision of these Terms does not constitute a waiver of that right or provision.</p>
          <p><strong>Assignment:</strong> You may not assign or transfer these Terms or your account without our written consent. We may assign these Terms without restriction.</p>

          <h2>16. Contact Information</h2>
          <p>If you have questions about these Terms, please contact us at <a href="mailto:support@zenko.gg" className="text-purple-300 hover:text-purple-200">support@zenko.gg</a>.</p>
        </article>
      </div>
      <Footer />
    </main>
  );
}
