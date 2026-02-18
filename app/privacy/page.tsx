import { Metadata } from 'next';
import { BackgroundLayer } from '@/components/landing/BackgroundLayer';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | Zenko',
  description: 'Zenko Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
      <BackgroundLayer />
      <Navbar />
      <div className="relative z-10 px-4 md:px-6 pt-24 md:pt-32 pb-12">
        <article className="prose prose-invert prose-sm md:prose-base mx-auto max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-neutral-500 text-sm mb-10">Last updated: February 18, 2026</p>

          <h2>1. Introduction</h2>
          <p>
            Zenko (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our platform at waitlist.zenko.gg (the &quot;Service&quot;).
          </p>
          <p>By using the Service, you consent to the data practices described in this Privacy Policy. If you do not agree with this Privacy Policy, please do not use the Service.</p>

          <h2>2. Information We Collect</h2>

          <h3>2.1 Information from OAuth Providers</h3>
          <p>When you create an account using OAuth authentication (Google, Twitch, or X/Twitter), we collect:</p>
          <ul>
            <li>Your name or username</li>
            <li>Your email address (if made available by the provider)</li>
            <li>Your profile avatar/picture</li>
            <li>Unique user identifier from the OAuth provider</li>
          </ul>

          <h3>2.2 Information You Provide</h3>
          <p>When using the Service, you may provide:</p>
          <ul>
            <li>Game preferences (which games you play from our supported list)</li>
            <li>Referral information (users you invite to the waitlist)</li>
          </ul>

          <h3>2.3 Automatically Collected Information</h3>
          <p>We automatically collect certain technical information when you use the Service:</p>
          <ul>
            <li>IP address</li>
            <li>Browser type and version (user agent)</li>
            <li>Device type and operating system</li>
            <li>Pages visited and features used</li>
            <li>Date and time of access</li>
            <li>Referral source</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>

          <h3>2.4 Referral and Activity Data</h3>
          <p>We track:</p>
          <ul>
            <li>Your referral code and referral links</li>
            <li>Users who join through your referral</li>
            <li>Reputation points (XP) earned through referrals</li>
            <li>Waitlist position and ranking</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use the collected information for the following purposes:</p>
          <ul>
            <li><strong>Account Management:</strong> Creating and managing your waitlist account</li>
            <li><strong>Authentication:</strong> Verifying your identity through OAuth providers</li>
            <li><strong>Waitlist Operations:</strong> Managing waitlist positions and invitations</li>
            <li><strong>Referral Program:</strong> Tracking referrals and calculating reputation points</li>
            <li><strong>Leaderboards:</strong> Displaying rankings based on reputation points (using publicly visible usernames)</li>
            <li><strong>Communications:</strong> Sending updates about your waitlist status and Service announcements</li>
            <li><strong>Personalization:</strong> Customizing your experience based on game preferences</li>
            <li><strong>Analytics:</strong> Understanding how users interact with the Service to improve functionality</li>
            <li><strong>Security:</strong> Detecting and preventing fraud, abuse, and security threats</li>
            <li><strong>Legal Compliance:</strong> Complying with legal obligations and enforcing our Terms of Service</li>
          </ul>

          <h2>4. How We Share Your Information</h2>
          <p>We do not sell your personal information. We may share your information in the following circumstances:</p>

          <h3>4.1 Service Providers</h3>
          <p>We share information with third-party service providers who perform services on our behalf:</p>
          <ul>
            <li><strong>Vercel:</strong> Hosting infrastructure and blob storage for avatars</li>
            <li><strong>Neon:</strong> PostgreSQL database services for data storage</li>
            <li><strong>OAuth Providers:</strong> Google, Twitch, and X/Twitter for authentication</li>
          </ul>
          <p>These providers are contractually obligated to protect your information and use it only for the purposes we specify.</p>

          <h3>4.2 Public Information</h3>
          <p>Certain information may be publicly visible:</p>
          <ul>
            <li>Your username or display name</li>
            <li>Your avatar</li>
            <li>Your reputation points and leaderboard ranking</li>
          </ul>

          <h3>4.3 Legal Requirements</h3>
          <p>We may disclose your information if required by law or in response to:</p>
          <ul>
            <li>Legal processes (subpoenas, court orders)</li>
            <li>Government or regulatory requests</li>
            <li>Protection of our rights, property, or safety</li>
            <li>Investigation of fraud or security issues</li>
          </ul>

          <h3>4.4 Business Transfers</h3>
          <p>If Zenko is involved in a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.</p>

          <h2>5. Cookies and Tracking Technologies</h2>
          <p>We use cookies and similar technologies to:</p>
          <ul>
            <li>Maintain your session and keep you logged in</li>
            <li>Remember your preferences</li>
            <li>Analyze Service usage and performance</li>
          </ul>
          <p>You can control cookies through your browser settings, but disabling cookies may limit your ability to use certain features of the Service.</p>

          <h2>6. Data Retention</h2>
          <p>We retain your personal information for as long as:</p>
          <ul>
            <li>Your account is active</li>
            <li>Necessary to provide the Service</li>
            <li>Required for legal, regulatory, or business purposes</li>
          </ul>
          <p>If you delete your account, we will delete or anonymize your personal information within a reasonable timeframe, except where retention is required by law or legitimate business interests (such as fraud prevention).</p>

          <h2>7. Your Rights and Choices</h2>
          <p>Depending on your location, you may have the following rights:</p>
          <ul>
            <li><strong>Access and Portability:</strong> Request access to the personal information we hold about you and receive a copy in a structured, machine-readable format</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
            <li><strong>Deletion:</strong> Request deletion of your personal information by contacting us at support@zenko.gg</li>
            <li><strong>Opt-Out of Communications:</strong> Opt out of promotional emails by following the unsubscribe instructions or contacting us directly</li>
          </ul>

          <h2>8. Children&apos;s Privacy</h2>
          <p>
            The Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are under 13, do not use the Service or provide any information.
          </p>
          <p>Users between 13 and 18 years of age must have parental or guardian consent to use the Service.</p>
          <p>If we learn that we have collected personal information from a child under 13, we will delete that information promptly. If you believe we have information from a child under 13, please contact us at <a href="mailto:support@zenko.gg" className="text-purple-300 hover:text-purple-200">support@zenko.gg</a>.</p>

          <h2>9. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws than your jurisdiction. By using the Service, you consent to the transfer of your information to our servers and service providers located worldwide.
          </p>

          <h2>10. GDPR Rights (European Users)</h2>
          <p>If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you have additional rights under the General Data Protection Regulation (GDPR):</p>
          <ul>
            <li><strong>Legal Basis:</strong> We process your data based on consent, contractual necessity, legal obligations, and legitimate interests</li>
            <li><strong>Right to Object:</strong> You can object to processing based on legitimate interests</li>
            <li><strong>Right to Restriction:</strong> You can request restriction of processing in certain circumstances</li>
            <li><strong>Right to Withdraw Consent:</strong> You can withdraw consent at any time (without affecting prior processing)</li>
            <li><strong>Right to Lodge a Complaint:</strong> You can file a complaint with your local data protection authority</li>
          </ul>

          <h2>11. CCPA Rights (California Users)</h2>
          <p>If you are a California resident, you have rights under the California Consumer Privacy Act (CCPA):</p>
          <ul>
            <li><strong>Right to Know:</strong> Request information about the categories and specific pieces of personal information we collect, use, and disclose</li>
            <li><strong>Right to Delete:</strong> Request deletion of your personal information (subject to certain exceptions)</li>
            <li><strong>Right to Opt-Out:</strong> We do not sell personal information</li>
            <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights</li>
          </ul>
          <p>To exercise these rights, contact us at <a href="mailto:support@zenko.gg" className="text-purple-300 hover:text-purple-200">support@zenko.gg</a>.</p>

          <h2>12. Data Security</h2>
          <p>We implement reasonable technical and organizational security measures to protect your information, including:</p>
          <ul>
            <li>Encryption of data in transit (HTTPS/TLS)</li>
            <li>Secure authentication through established OAuth providers</li>
            <li>Access controls and authentication requirements</li>
            <li>Secure database and storage infrastructure</li>
          </ul>
          <p>However, no method of transmission or storage is 100% secure. We cannot guarantee absolute security of your information.</p>

          <h2>13. Third-Party Links</h2>
          <p>The Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing any information.</p>

          <h2>14. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated Privacy Policy on our website with a new &quot;Last updated&quot; date and, where possible, sending an email notification.
          </p>
          <p>Your continued use of the Service after changes become effective constitutes acceptance of the updated Privacy Policy.</p>

          <h2>15. Contact Us</h2>
          <p>
            If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at <a href="mailto:support@zenko.gg" className="text-purple-300 hover:text-purple-200">support@zenko.gg</a>.
          </p>
          <p>For GDPR-related inquiries, please include &quot;GDPR Request&quot; in your subject line. For CCPA-related inquiries, please include &quot;CCPA Request&quot; in your subject line.</p>
        </article>
      </div>
      <Footer />
    </main>
  );
}
