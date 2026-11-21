import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const terms = [
  {
    title: '1. Introduction',
    paragraphs: [
      'Welcome to HAPZO360, a digital enterprise management platform developed and operated by HAPZO Private Limited ("HAPZO", "Company", "we", "us", or "our"). These Terms and Conditions ("Terms") govern access to and use of the HAPZO360 website, software applications, digital platforms, enterprise solutions, and related services.',
      'HAPZO360 provides technology-driven solutions supporting enterprise resource planning, human resource management, payroll administration, production management, inventory control, supply chain traceability, compliance management, sustainability monitoring, and related business operations.',
      'By registering for an account, clicking an acceptance mechanism, executing a subscription agreement incorporating these Terms, or otherwise accepting these Terms through an authorized process, users agree to be bound by them. A person accepting these Terms for an organization represents that they have authority to bind that organization. Users who do not agree must not register for or use services requiring their acceptance.',
    ],
  },
  {
    title: '2. Definitions',
    bullets: [
      '"Platform" means the HAPZO360 website, software applications, dashboards, modules, databases, interfaces, APIs, and related technology services.',
      '"Company" means HAPZO Private Limited. "Customer" means a business entity or organization that subscribes to or is authorized to use HAPZO360 services.',
      '"User" means an individual authorized to access the website or Platform. "Authorized User" means an individual permitted by the Customer or HAPZO, as applicable, to access designated Platform functions.',
      '"Customer Data" means information, records, documents, and other content submitted, uploaded, generated, or maintained by or on behalf of a Customer through the Platform.',
      '"Services" means the software functionality, subscriptions, technical services, and related offerings made available by HAPZO. "Subscription" means an agreed arrangement granting access to specified Services for a defined period.',
      '"Order Form" means a quotation, proposal, subscription agreement, purchase order accepted by HAPZO, or other written commercial document specifying the Services purchased.',
    ],
  },
  {
    title: '3. Scope of Services',
    intro: 'Depending on subscribed modules and available functionality, HAPZO360 may provide:',
    bullets: [
      'Enterprise Resource Planning (ERP) and Human Resource Management Systems (HRMS).',
      'Attendance, leave, wage, and payroll administration.',
      'Production planning, process management, inventory, procurement, and material management.',
      'Supplier and supply chain management, product and material traceability, quality assurance, and inspection management.',
      'Compliance, certification, sustainability, environmental, and ESG data management.',
      'Business intelligence, analytics, reporting, workflow automation, integrations, and related features.',
    ],
    paragraphs: [
      'The availability, functionality, configuration, and limitations of each module depend on the applicable subscription, service description, and contractual agreement.',
      'HAPZO may introduce, improve, modify, or discontinue individual features in accordance with these Terms and applicable contractual obligations.',
    ],
  },
  {
    title: '4. Eligibility and Registration',
    paragraphs: [
      'Access to the Platform is intended primarily for business organizations, professional users, and individuals authorized to operate enterprise software. Users must provide accurate information during registration and maintain updated account details where relevant.',
      'Any person creating an organizational account must have authority to represent that organization. Customers are responsible for designating appropriate account administrators and ensuring access is granted only to authorized personnel.',
      'HAPZO may reject, suspend, or restrict registrations involving false information, unauthorized representations, suspected misuse, or violations of applicable law.',
    ],
  },
  {
    title: '5. User Accounts and Access Security',
    paragraphs: [
      'Users are responsible for maintaining the confidentiality of their account credentials and must not knowingly permit unauthorized individuals to access restricted Platform functions.',
      'Customers are responsible for managing organizational user permissions, including granting, modifying, and revoking access when employees or representatives change roles or leave the organization. Users must promptly notify HAPZO of suspected unauthorized access or compromised credentials.',
      'HAPZO may implement authentication requirements, access restrictions, session controls, and other reasonable security measures. Actions performed through an account may be attributed to the relevant Customer or Authorized User to the extent supported by applicable law and the circumstances of the activity.',
    ],
  },
  {
    title: '6. Software License and Permitted Use',
    paragraphs: [
      'Subject to payment of applicable fees, compliance with these Terms, and any governing agreement, HAPZO grants Customers a limited, non-exclusive, non-transferable, and non-sublicensable right to access and use subscribed Services during the applicable subscription period.',
      'The license is solely for the Customer’s authorized internal business operations unless otherwise agreed in writing. No ownership rights in the Platform, source code, underlying software architecture, algorithms, designs, or proprietary technology are transferred to Customers.',
      'Customers may not sell, rent, sublicense, commercially redistribute, or provide unauthorized third-party access to the Platform. The license remains subject to subscription limits, authorized users, service configuration, and contractual restrictions.',
    ],
  },
  {
    title: '7. Acceptable Use Policy',
    intro: 'Users agree to use HAPZO360 lawfully and responsibly. Users must not:',
    bullets: [
      'Access systems, accounts, records, or data without authorization, or bypass security measures, authentication controls, or access restrictions.',
      'Upload malware, harmful code, or materials intended to compromise the Platform.',
      'Reverse engineer, decompile, attempt to extract proprietary source code except where prohibited by law, or commercially exploit proprietary Platform components without authorization.',
      'Submit fraudulent, misleading, unlawful, or deliberately falsified information, or misrepresent audit findings, certifications, statutory records, employee details, or supply chain information.',
      'Interfere with Platform performance, service availability, or another user’s access, or infringe intellectual property, privacy, confidentiality, or other legal rights.',
      'Conduct automated scraping, penetration testing, vulnerability exploitation, or excessive API activity without authorization.',
    ],
    paragraphs: ['HAPZO reserves the right to investigate suspected violations and take proportionate corrective action.'],
  },
  {
    title: '8. Customer Data Ownership and Responsibility',
    paragraphs: [
      'Customers retain their applicable ownership and other legal rights in Customer Data. HAPZO does not acquire ownership merely because Customer Data is stored, processed, or managed through the Platform.',
      'Customers grant HAPZO a limited right to host, process, transmit, display, and otherwise handle Customer Data as necessary to provide contracted Services, maintain security, provide authorized support, and fulfill applicable legal obligations.',
      'Customers are responsible for ensuring that uploaded information is accurate, lawful, appropriately authorized, and relevant to their business purposes. Customers must obtain required permissions, provide applicable notices, and establish lawful grounds for processing personal information submitted to HAPZO360.',
      'HAPZO may rely on Customer instructions and information when delivering Services, subject to its legal and contractual obligations.',
    ],
  },
  {
    title: '9. Employee HRMS and Payroll Information',
    paragraphs: [
      'HAPZO360 may provide functionality for employee records, attendance management, shift allocation, leave administration, wages, payroll calculations, statutory contributions, and related workforce activities.',
      'The Customer remains responsible for employment terms and statutory requirements applicable to its workforce, including wages, working hours, overtime, leave, social security contributions, tax deductions, employee benefits, and statutory reporting where relevant.',
      'Payroll and HRMS outputs depend on accurate employee information, company settings, applicable rules, and user-configured calculations. Customers must independently review payroll calculations, statutory deductions, employee entitlements, and reports before payments, returns, or legal compliance reliance. HAPZO is a software provider and does not become the legal employer of individuals whose information is maintained through the Platform.',
    ],
  },
  {
    title: '10. Production and Business Operations',
    paragraphs: [
      'The Platform may enable Customers to manage production orders, manufacturing processes, inventory transactions, quality inspections, material consumption, operational performance, and related records.',
      'Customers remain responsible for manufacturing decisions, production schedules, workplace safety, product quality, and operational compliance. Platform recommendations, calculations, forecasts, or analytical outputs are intended to support business decisions only.',
      'HAPZO does not independently verify every operational record or guarantee production results, cost savings, efficiency improvements, or commercial outcomes. Customers must exercise appropriate review and professional judgment before acting on Platform-generated information.',
    ],
  },
  {
    title: '11. Traceability Certification and Compliance Management',
    paragraphs: [
      'HAPZO360 may provide tools for maintaining material traceability records, transaction histories, supplier information, certification documentation, audit evidence, environmental data, and compliance-related records.',
      'The Platform is a technology and information management solution, not an accredited certification body, regulatory authority, or independent auditing organization. Functionality supporting GOTS, OCS, GRS, RCS, OEKO-TEX, ISO, ZDHC, or other schemes does not constitute certification, accreditation, or official recognition by scheme owners.',
      'Unless expressly authorized by separate written arrangement, HAPZO does not issue, approve, or guarantee third-party certifications. Customers remain responsible for record authenticity, claim accuracy, standards compliance, and required approvals. Reports generated by HAPZO360 do not replace official certificates, statutory filings, regulatory inspections, or independent professional verification. Certification names, marks, and standards remain the property of their respective owners.',
    ],
  },
  {
    title: '12. Sustainability and ESG Information',
    paragraphs: [
      'The Platform may assist organizations in collecting, organizing, calculating, and reporting information about environmental performance, resource consumption, waste generation, emissions, social indicators, and sustainability-related activities.',
      'Outputs may depend on user-entered values, calculation assumptions, emission factors, methodologies, and third-party datasets. Customers are responsible for reviewing the accuracy, completeness, materiality, and appropriateness of sustainability disclosures.',
      'HAPZO does not guarantee a particular ESG rating, environmental performance level, regulatory approval, or certification outcome. Independent assurance or professional review may be necessary before information is used in statutory disclosures or external sustainability claims.',
    ],
  },
  {
    title: '13. Subscriptions Fees and Payments',
    paragraphs: [
      'HAPZO360 Services may be provided through paid subscriptions, enterprise agreements, trials, or separately quoted commercial arrangements. Pricing, billing frequency, subscription duration, user limits, implementation charges, and other commercial terms will be specified in the relevant Order Form or subscription arrangement.',
      'Customers agree to pay applicable fees according to the agreed schedule. Unless otherwise specified, quoted fees exclude applicable taxes, including Goods and Services Tax (GST). HAPZO may issue invoices and payment reminders according to agreed commercial terms.',
      'Interest, late-payment charges, or additional fees must be supported by the applicable agreement and law. Renewals operate according to the applicable Order Form; automatic renewal applies only where expressly disclosed and agreed. Subscription-fee changes will be communicated in accordance with the applicable agreement.',
    ],
  },
  {
    title: '14. Cancellation Refunds and Termination',
    paragraphs: [
      'Customers may request cancellation or non-renewal according to the applicable service agreement. The effective cancellation date, outstanding payment obligations, and refund eligibility will be determined by agreed commercial terms and applicable law.',
      'Unless a separate agreement provides otherwise, cancelling a subscription does not automatically entitle a Customer to reimbursement for Services already delivered. Nothing in these Terms excludes a statutory refund or remedy that cannot lawfully be restricted.',
      'HAPZO may suspend or terminate access where reasonably necessary due to material contractual breach, non-payment, security threats, fraudulent activity, or unlawful use. Where practicable, HAPZO will provide prior notice and an opportunity to remedy a breach; immediate action may be taken to prevent serious security, legal, or operational harm.',
      'On termination, Customer access rights cease, subject to any agreed transition, export, or data-retrieval arrangements.',
    ],
  },
  {
    title: '15. Customer Data Export and Deletion',
    paragraphs: [
      'Customers are encouraged to maintain appropriate independent records and backups of critical business information.',
      'On termination or expiry, HAPZO will handle Customer Data according to the applicable subscription agreement, data-processing arrangements, retention requirements, and Privacy Policy. Where data export is available under subscribed Services or a governing agreement, Customers may request information in the agreed format and period.',
      'Data may be retained where required by law, legitimate recordkeeping obligations, dispute resolution requirements, or contracted backup and retention procedures. Personal information will be deleted, anonymized, or otherwise managed according to applicable legal requirements.',
    ],
  },
  {
    title: '16. Intellectual Property Rights',
    paragraphs: [
      'All intellectual property rights relating to HAPZO360, including software code, system architecture, visual designs, interfaces, workflows, product names, branding, documentation, and proprietary technology, belong to HAPZO Private Limited or its licensors.',
      'Except for rights expressly granted under these Terms or a separate agreement, no intellectual-property license is implied. Users must not reproduce or commercially exploit proprietary content without authorization. Customers retain their applicable rights in their own business records, documents, trademarks, materials, and Customer Data.',
      'HAPZO may use voluntary feedback or suggestions to improve Services, provided this does not authorize disclosure of confidential Customer Data or infringement of third-party rights. Third-party technologies and open-source components remain subject to their applicable licenses.',
    ],
  },
  {
    title: '17. Confidentiality',
    paragraphs: [
      'HAPZO and its Customers acknowledge that Platform access may involve confidential commercial, operational, technical, or personal information. Each party will protect the other party’s confidential information using reasonable care and will not disclose it except as authorized, necessary to perform agreed Services, or required by law.',
      'Confidential information excludes information publicly available without breach, independently developed without misuse, lawfully obtained from an unrestricted third party, or already known without a confidentiality obligation.',
      'Confidential information may be disclosed to authorized employees, contractors, advisers, or service providers with an appropriate need to know and suitable confidentiality obligations. These obligations survive termination while the information remains confidential, subject to applicable law and any governing agreement.',
    ],
  },
  {
    title: '18. Privacy and Data Protection',
    paragraphs: [
      'Personal information processed through HAPZO360 is subject to the Company’s Privacy Policy and applicable data protection laws. Depending on the circumstances, HAPZO may act as a Data Fiduciary or Data Processor under the Indian digital personal data protection framework.',
      'Where HAPZO processes Customer-controlled personal information for a Customer, responsibilities may be further established through a Data Processing Agreement or other written contractual terms. Customers must ensure that submitted information was collected and is processed lawfully.',
      'HAPZO will maintain appropriate safeguards and fulfill applicable legal and contractual obligations for personal information. If these Terms conflict with a mandatory data-protection requirement, that mandatory requirement prevails. The Privacy Policy explains HAPZO’s own processing and applicable privacy-right mechanisms.',
    ],
  },
  {
    title: '19. Data Security and System Availability',
    paragraphs: [
      'HAPZO seeks to maintain appropriate technical and organizational security safeguards, including access restrictions, authentication controls, encrypted communications, security monitoring, backup arrangements, and other measures appropriate to the Services.',
      'HAPZO may temporarily interrupt access for maintenance, security updates, technical improvements, or emergency repairs. Availability may be affected by telecommunications networks, internet connectivity, customer systems, infrastructure providers, third-party integrations, or events outside HAPZO’s reasonable control.',
      'Uptime commitments, response times, recovery objectives, maintenance windows, or service credits apply only if expressly included in an applicable Service Level Agreement or binding agreement. No provision of these Terms removes responsibilities imposed on HAPZO by applicable law.',
    ],
  },
  {
    title: '20. Third Party Services and Integrations',
    paragraphs: [
      'HAPZO360 may support integrations with external applications, cloud services, APIs, payment systems, communication platforms, and other third-party technology. Customers enabling them are responsible for reviewing applicable third-party terms, permissions, and suitability.',
      'HAPZO is not responsible for independent operation of third-party services outside its control, except as required by law or an express contractual commitment. Integration availability may be affected by changes to third-party interfaces, policies, pricing, security requirements, or service availability.',
      'Where third parties process personal information for HAPZO, appropriate data-protection and contractual obligations will apply.',
    ],
  },
  {
    title: '21. Artificial Intelligence and Automated Features',
    paragraphs: [
      'HAPZO360 may introduce artificial intelligence, automated workflows, predictive analytics, intelligent reporting, or other technology-assisted features to support organizational decision-making and operational efficiency.',
      'AI-generated or automated outputs may contain errors, omissions, inaccuracies, or inappropriate assumptions. Customers must independently verify material outputs before relying on them for employment decisions, statutory filings, certification claims, financial transactions, or regulatory disclosures.',
      'Automated recommendations do not replace qualified professional advice, human judgment, or legally required review. Processing of Customer Data through AI-related functions must comply with contractual arrangements, disclosed purposes, and data-protection requirements.',
    ],
  },
  {
    title: '22. Website Content and Happenings',
    paragraphs: [
      'HAPZO may publish articles, company updates, announcements, event information, photographs, videos, professional insights, and related material through its website, including the Happenings section. Content is provided for general information and communication purposes.',
      'HAPZO seeks to maintain accurate and relevant website information but does not guarantee that all published material remains current or error-free. Users may not reproduce copyrighted website content for unauthorized commercial purposes.',
      'Concerns about privacy, accuracy, or publication rights concerning identified individuals or organizations may be directed to HAPZO. References to third-party organizations, events, certifications, or partners do not automatically imply endorsement, formal partnership, or authorization.',
    ],
  },
  {
    title: '23. Disclaimer of Warranties',
    paragraphs: [
      'HAPZO will provide Services with reasonable care and skill, subject to applicable contractual commitments and legal requirements.',
      'Except for express warranties in a governing agreement or warranties that cannot lawfully be excluded, HAPZO does not guarantee uninterrupted, completely error-free Services, suitability for every business requirement, or compatibility with all third-party systems.',
      'The Platform assists with business administration and information management. It is not a substitute for independent legal, financial, tax, employment, engineering, audit, or certification advice. Customers are responsible for assessing suitability and verifying material outputs before acting.',
    ],
  },
  {
    title: '24. Limitation of Liability',
    paragraphs: [
      'To the maximum extent permitted by law, neither party is liable to the other for indirect, incidental, special, or consequential losses, including lost anticipated profits or business opportunities, arising from use of the Services, except where exclusions are prohibited by law.',
      'Subject to legal restrictions and any separately negotiated agreement, HAPZO’s aggregate contractual liability arising from subscribed Services will not exceed total subscription fees paid or payable by the affected Customer for those Services during the twelve months immediately preceding the event giving rise to the claim.',
      'This does not apply to liabilities that cannot lawfully be limited, including fraud or willful misconduct, and does not override expressly agreed higher liability, statutory remedies, or obligations specifically excluded from the cap in a separate agreement. Customers remain responsible for their own business decisions, personnel actions, and unlawful use, subject to law.',
    ],
  },
  {
    title: '25. Indemnification',
    paragraphs: [
      'Each party is responsible for claims, losses, and liabilities arising from its own unlawful conduct or material breach of these Terms to the extent established by law or an express contractual obligation.',
      'Customers agree to indemnify HAPZO against third-party claims arising from Customer Data that infringes third-party rights, unlawful instructions, or material misuse of Services, to the extent caused by the Customer and not HAPZO’s own breach, negligence, or wrongful conduct.',
      'HAPZO remains responsible for its own contractual and legal obligations. An indemnification claim is subject to reasonable notice, cooperation, and appropriate defense control, without settlements imposing unapproved obligations on the other party.',
    ],
  },
  {
    title: '26. Suspension and Service Restrictions',
    intro: 'HAPZO may temporarily restrict an account or Service where reasonably necessary to address:',
    bullets: [
      'Suspected unauthorized access or serious security threats.',
      'Material violations of these Terms, fraudulent or unlawful activities, or significant unpaid charges under an applicable agreement.',
      'Conduct that threatens Platform stability or integrity, or binding legal or regulatory requirements.',
    ],
    paragraphs: ['Restrictions will be proportionate to the identified risk where reasonably practicable. HAPZO may restore access after the issue is resolved and applicable conditions are satisfied.'],
  },
  {
    title: '27. Force Majeure',
    paragraphs: [
      'Neither party is responsible for delay or failure to perform contractual obligations, other than payment obligations already due, when caused by extraordinary events beyond reasonable control. These may include natural disasters, widespread infrastructure failures, war, civil disturbances, government restrictions, or other unavoidable circumstances.',
      'The affected party must take reasonable steps to minimize disruption and resume performance as soon as reasonably possible. If the event continues for a substantial period, the parties may exercise termination rights provided in the applicable agreement or under law.',
    ],
  },
  {
    title: '28. Modifications to Services and Terms',
    paragraphs: [
      'HAPZO may update these Terms to reflect changes in law, technology, business operations, security requirements, or Services. Updated Terms will be published on the HAPZO360 website with a revised effective date.',
      'Material changes affecting existing paid subscriptions will be communicated in accordance with the applicable agreement and law. Changes to agreed commercial obligations will not be imposed retroactively without an appropriate contractual or legal basis. Where additional acceptance is required, HAPZO will seek it through a suitable mechanism.',
    ],
  },
  {
    title: '29. Governing Law and Dispute Resolution',
    paragraphs: [
      'These Terms are governed by the laws of India. The parties agree to attempt to resolve contractual disputes amicably through good-faith discussions before formal proceedings where appropriate.',
      'Subject to statutory rights, mandatory jurisdiction rules, and any expressly agreed dispute-resolution mechanism, competent courts at [Insert Registered Office City and State, India] have jurisdiction over disputes relating to these Terms.',
      'Nothing in this clause limits a right to approach a competent regulatory authority, statutory tribunal, or forum where that right cannot lawfully be restricted.',
    ],
  },
  {
    title: '30. Notices and Communications',
    paragraphs: [
      'HAPZO may communicate through registered email addresses, in-application notifications, account dashboards, or other agreed business communication channels.',
      'Customers are responsible for maintaining accurate contact details and reviewing important service communications. Formal contractual notices must use the methods specified in the applicable subscription or commercial agreement. Privacy-related communications may use the contact mechanisms in the Privacy Policy.',
    ],
  },
  {
    title: '31. Relationship Between the Parties',
    paragraphs: [
      'HAPZO operates as an independent technology and software service provider. These Terms do not create an employment relationship, partnership, joint venture, franchise, or agency between HAPZO and its Customers.',
      'Neither party may bind the other to third-party obligations without appropriate authorization. Customers remain independently responsible for their business operations, employees, regulatory obligations, and commercial decisions.',
    ],
  },
  {
    title: '32. Severability and Waiver',
    paragraphs: [
      'If a provision of these Terms is invalid or unenforceable, the remaining provisions continue to the extent legally permissible.',
      'Failure by either party to immediately enforce a right is not a permanent waiver. Any waiver of contractual rights must comply with applicable law and the governing agreement.',
    ],
  },
  {
    title: '33. Entire Agreement and Order of Precedence',
    paragraphs: [
      'These Terms, together with applicable Order Forms, Service Level Agreements, Data Processing Agreements, and other expressly incorporated documents, form the contractual framework governing Services.',
      'If documents conflict, mandatory law prevails, followed by any expressly negotiated written agreement applicable to the conflict. A Data Processing Agreement governs conflicting provisions specifically concerning Customer-controlled personal-data processing.',
      'An applicable Order Form governs agreed commercial details, including pricing, subscription periods, licensed users, and purchased modules, unless the parties expressly agree otherwise.',
    ],
  },
  {
    title: '34. Contact Information',
    intro: 'For enquiries concerning these Terms and Conditions, service-related issues, subscription matters, or contractual communications, please contact:',
    bullets: [
      'Company Name: HAPZO Private Limited',
      'Website: https://www.hapzo360.com',
      'Registered Office: 57 - 59 Durgalal Street, Fort, Coimbatore - 641001',
      'Official Email: Hapzo360@gmail.com',
      'Telephone: +91 9092410112, +91 638529544',
    ],
  },
  {
    title: '35. Acknowledgment and Acceptance',
    paragraphs: [
      'By accepting these Terms through an authorized registration, subscription, electronic acceptance, or contractual process, the Customer or User confirms they had an opportunity to review these Terms and agree to comply with applicable provisions.',
      'When acceptance is made for an organization, the individual confirms they are authorized to act for that organization. These Terms remain applicable throughout the relevant period of website or Service use, subject to their provisions and any governing agreement.',
    ],
  },
];

export default function TermsAndConditions() {
  return (
    <main className="page-shell py-10 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#315844] transition hover:text-[#20372a]">
          <ArrowLeft size={16} /> Back to Hapzo360
        </Link>

        <header className="mt-8 rounded-[28px] bg-[#11192f] px-6 py-8 text-white sm:px-10 sm:py-10">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#b8da9c] text-[#173226]"><ShieldCheck size={23} /></span>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.16em] text-[#b8da9c]">HAPZO Private Limited</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Terms &amp; Conditions</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">These Terms govern the HAPZO360 website, Platform, software applications, enterprise solutions, and related services.</p>
          <dl className="mt-6 grid gap-3 border-t border-white/15 pt-5 text-sm sm:grid-cols-2">
            <div><dt className="text-white/55">Website</dt><dd className="mt-1 font-semibold">www.hapzo360.com</dd></div>
            <div><dt className="text-white/55">Last updated</dt><dd className="mt-1 font-semibold">15 November 2026</dd></div>
            <div><dt className="text-white/55">Effective date</dt><dd className="mt-1 font-semibold">[Date of Publication]</dd></div>
          </dl>
        </header>

        <section className="mt-6 rounded-[24px] border border-[#11192f]/10 bg-white p-6 sm:p-9">
          <div className="space-y-9">
            {terms.map((term) => (
              <article key={term.title} className="border-t border-[#11192f]/10 pt-7 first:border-0 first:pt-0">
                <h2 className="text-xl font-extrabold tracking-tight text-[#11192f]">{term.title}</h2>
                {term.intro && <p className="mt-3 text-sm leading-7 text-[#11192f]/70">{term.intro}</p>}
                {term.bullets && <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[#11192f]/70 marker:text-[#315844]">{term.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
                {term.paragraphs && <div className="mt-3 space-y-3 text-sm leading-7 text-[#11192f]/70">{term.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>}
              </article>
            ))}
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-[#11192f]/55">© 2026 HAPZO Private Limited. All Rights Reserved.</p>
      </div>
    </main>
  );
}
