/** Temporary mock content — replace with Laravel API (see src/services). */
import type { OfferTag } from '@/types'

type L = { ar: string; en: string }

export const brands = [
  { id: 'kia', name: 'KIA', logo: '/images/brands/kia.png' },
  { id: 'ford', name: 'Ford', logo: '/images/brands/ford.png' },
  { id: 'kia-2', name: 'KIA', logo: '/images/brands/kia.png' },
  { id: 'ford-2', name: 'Ford', logo: '/images/brands/ford.png' },
  { id: 'kia-3', name: 'KIA', logo: '/images/brands/kia.png' },
  { id: 'ford-3', name: 'Ford', logo: '/images/brands/ford.png' },
]

export const partners = [
  { id: 'p1', name: 'Abdul Latif Jameel', logo: '/images/partners/p1.png' },
  { id: 'p2', name: 'Al Rajhi Bank', logo: '/images/partners/p2.png' },
  { id: 'p3', name: 'Bank Albilad', logo: '/images/partners/p3.png' },
  { id: 'p4', name: 'Alinma Bank', logo: '/images/partners/p4.png' },
  { id: 'p5', name: 'BSF', logo: '/images/partners/p5.png' },
]

export const offerTagLabels: Record<OfferTag, L> = {
  popular: { ar: 'شائع', en: 'Popular' },
  exclusive: { ar: 'حصري', en: 'Exclusive' },
  new: { ar: 'جديد', en: 'New' },
  limited: { ar: 'محدود', en: 'Limited' },
}

const ramadan = {
  title: { ar: 'عرض رمضان الاستثنائي', en: 'Exceptional Ramadan Offer' },
  benefit: { ar: 'تمويل بدون أرباح لأول 6 أشهر', en: 'Zero-profit financing for the first 6 months' },
}

/** Offers end relative to "now" so the countdown is always live in the mock. */
const inFromNow = (d: number, h: number, m: number, s = 0) =>
  new Date(Date.now() + (((d * 24 + h) * 60 + m) * 60 + s) * 1000).toISOString()

export const offers: { id: string; title: L; benefit: L; image: string; tag: OfferTag; endsAt: string; featured?: boolean }[] = [
  { id: 'ramadan', ...ramadan, image: '/images/offers/ramadan-art.png', tag: 'limited', endsAt: inFromNow(4, 23, 40, 3), featured: true },
  { id: 'o1', ...ramadan, image: '/images/offers/ramadan-offer.jpg', tag: 'limited', endsAt: inFromNow(4, 23, 40) },
  { id: 'o2', ...ramadan, image: '/images/offers/ramadan-offer.jpg', tag: 'popular', endsAt: inFromNow(4, 23, 40) },
  { id: 'o3', ...ramadan, image: '/images/offers/ramadan-offer.jpg', tag: 'exclusive', endsAt: inFromNow(4, 23, 40) },
  { id: 'o4', ...ramadan, image: '/images/offers/ramadan-offer.jpg', tag: 'new', endsAt: inFromNow(4, 23, 40) },
  { id: 'o5', ...ramadan, image: '/images/offers/ramadan-offer.jpg', tag: 'limited', endsAt: inFromNow(4, 23, 40) },
  { id: 'o6', ...ramadan, image: '/images/offers/ramadan-offer.jpg', tag: 'popular', endsAt: inFromNow(4, 23, 40) },
]

const evArticle = {
  title: { ar: 'مستقبل السيارات الكهربائية في المملكة العربية السعودية', en: 'The future of electric cars in Saudi Arabia' },
  excerpt: {
    ar: 'مع تسارع وتيرة التحول نحو الطاقة الكهربائية، كيف يتشكّل مستقبل السيارات الكهربائية في السوق السعودي؟',
    en: 'As the shift to electric power accelerates, how is the future of EVs taking shape in the Saudi market?',
  },
  category: { ar: 'اتجاهات', en: 'Trends' },
  date: { ar: '٥ يناير ٢٠٢٤', en: '5 January 2024' },
  readTime: { ar: '٦ دقائق', en: '6 min' },
  image: '/images/blog/article.jpg',
}

export const articles: {
  slug: string
  title: L
  excerpt: L
  category: L
  date: L
  readTime: L
  image: string
  tag: OfferTag
}[] = [
  { slug: 'ev-future-saudi', ...evArticle, tag: 'popular' },
  { slug: 'car-finance-guide', ...evArticle, title: { ar: 'دليلك لتمويل السيارات في السعودية', en: 'Your guide to car financing in Saudi Arabia' }, excerpt: { ar: 'تعرّف على أنواع التمويل، وأهم الشروط، والتكاليف التي تدخل في قرارك.', en: 'Learn about financing types, key requirements, and the costs that shape your decision.' }, category: { ar: 'تمويل', en: 'Finance' }, image: '/images/finance/cover.png', tag: 'exclusive' },
  { slug: 'ev-future-saudi-2', ...evArticle, tag: 'new' },
  { slug: 'ev-future-saudi-3', ...evArticle, tag: 'limited' },
  { slug: 'ev-future-saudi-4', ...evArticle, tag: 'popular' },
  { slug: 'ev-future-saudi-5', ...evArticle, tag: 'new' },
]

export const financeGuide = {
  subtitle: {
    ar: 'تعرّف على أنواع التمويل، وأهم الشروط، والتكاليف التي تدخل في قرارك.',
    en: 'Learn about financing types, key requirements, and the costs that shape your decision.',
  },
  cover: '/images/finance/cover.png',
  sections: [
    {
      id: 'types',
      title: { ar: 'أنواع تمويل السيارات في السعودية', en: 'Types of car financing in Saudi Arabia' },
      toc: { ar: 'أنواع التمويل', en: 'Financing types' },
      options: [
        { title: { ar: 'التمويل البنكي التقليدي', en: 'Conventional bank financing' }, description: { ar: 'نسب تبدأ من ٣.٩٪ سنوياً', en: 'Rates starting from 3.9% per year' } },
        { title: { ar: 'التمويل الإسلامي (المرابحة)', en: 'Islamic financing (Murabaha)' }, description: { ar: 'الأكثر شيوعاً والمتوافق مع الشريعة', en: 'The most common, Sharia-compliant option' } },
        { title: { ar: 'تمويل الوكالة', en: 'Dealership financing' }, description: { ar: 'أسرع ولكن أحياناً بنسب أعلى', en: 'Faster, but sometimes at higher rates' } },
      ],
    },
    {
      id: 'requirements',
      title: { ar: 'أهم الشروط للحصول على تمويل سيارة', en: 'Key requirements for car financing' },
      toc: { ar: 'شروط الحصول على التمويل', en: 'Financing requirements' },
      paragraphs: [
        {
          ar: 'يشترط معظم البنوك السعودية راتباً لا يقل عن ٤٠٠٠ ريال، وأن لا يتجاوز قسط السيارة ٣٣٪ من الراتب الشهري الصافي. كما أن السجل الائتماني الجيد يمنحك قدرة تفاوضية أعلى على الفائدة.',
          en: 'Most Saudi banks require a minimum salary of SAR 4,000, and the car installment should not exceed 33% of your net monthly salary. A good credit record also gives you more room to negotiate the rate.',
        },
      ],
      callout: {
        ar: 'يجب أن يكون لديك تاريخ ائتماني نظيف، حيث قد تؤثر الديون السابقة على قدرتك على الحصول على التمويل.',
        en: 'You need a clean credit history — previous debts may affect your ability to get financing.',
      },
      note: { ar: 'يمكن أن تتطلب بعض البنوك كفيلًا أو ضمانات إضافية للموافقة على الطلب.', en: 'Some banks may require a guarantor or additional collateral to approve the application.' },
    },
    {
      id: 'duration',
      title: { ar: 'مدة التمويل ونوع السيارة', en: 'Financing term and car type' },
      toc: { ar: 'المدة ونوع السيارة', en: 'Term and car type' },
      paragraphs: [
        { ar: 'تختلف مدة التمويل من بنك إلى آخر، حيث تتراوح عادة بين 12 إلى 60 شهرًا.', en: 'Financing terms vary between banks, typically ranging from 12 to 60 months.' },
        { ar: 'يجب أن يتوافق نوع السيارة مع سياسات التمويل الخاصة بالبنك، حيث لا تقبل بعض البنوك سيارات معينة.', en: "The car type must match the bank's financing policy, as some banks do not accept certain cars." },
      ],
    },
    {
      id: 'insurance',
      title: { ar: 'التأمين والتكاليف الإضافية', en: 'Insurance and additional costs' },
      toc: { ar: 'التأمين والتكاليف', en: 'Insurance and costs' },
      paragraphs: [
        { ar: 'قد تتطلب بعض المؤسسات المالية تأمين السيارة كمطلب أساسي قبل منح التمويل.', en: 'Some financial institutions require car insurance before granting financing.' },
        { ar: 'التكاليف الإضافية مثل رسوم التسجيل والضرائب ينبغي وضعها في الاعتبار عند حساب ميزانية الشراء.', en: 'Additional costs such as registration fees and taxes should be considered when budgeting for your purchase.' },
      ],
    },
  ],
  figures: [
    { value: { ar: '٤٠٠٠ ريال', en: 'SAR 4,000' }, label: { ar: 'الراتب المذكور لدى معظم البنوك', en: 'Minimum salary cited by most banks' } },
    { value: { ar: '٣٣٪', en: '33%' }, label: { ar: 'الحد المذكور للقسط من صافي الراتب', en: 'Installment cap of net salary' } },
    { value: { ar: '⁦12–60⁩ شهرًا', en: '12–60 months' }, label: { ar: 'المدة المعتادة بحسب البنك', en: 'Typical term, depending on the bank' } },
  ],
}

export const testimonials = [
  {
    id: 't1',
    name: { ar: 'عبدالرحمن الدوسري', en: 'Abdulrahman Al-Dosari' },
    role: { ar: 'مهندس · الدمام', en: 'Engineer · Dammam' },
    quote: {
      ar: '"من أفضل تجارب الشراء في حياتي. السعر كان تنافسياً والتمويل مرن. شكراً لفريق زاد كابيتال على الاهتمام والمتابعة المستمرة."',
      en: '"One of the best buying experiences of my life. Competitive price and flexible financing. Thanks to the team for their care and constant follow-up."',
    },
    avatar: '/images/people/p1.jpg',
  },
  {
    id: 't2',
    name: { ar: 'سارة الشمري', en: 'Sara Al-Shammari' },
    role: { ar: 'طبيبة · جدة', en: 'Doctor · Jeddah' },
    quote: {
      ar: '"خدمة راقية ومتميزة. أنصح كل من يريد تمويل سيارته بالتواصل مع زاد كابيتال — الشفافية والاحترافية في كل تفصيلة."',
      en: '"Refined, outstanding service. I recommend them to anyone financing a car — transparency and professionalism in every detail."',
    },
    avatar: '/images/people/p2.jpg',
  },
  {
    id: 't3',
    name: { ar: 'عبدالرحمن الدوسري', en: 'Abdulrahman Al-Dosari' },
    role: { ar: 'مهندس · الدمام', en: 'Engineer · Dammam' },
    quote: {
      ar: '"من أفضل تجارب الشراء في حياتي. السعر كان تنافسياً والتمويل مرن. شكراً لفريق زاد كابيتال على الاهتمام والمتابعة المستمرة."',
      en: '"One of the best buying experiences of my life. Competitive price and flexible financing. Thanks to the team for their care and constant follow-up."',
    },
    avatar: '/images/people/p3.jpg',
  },
]

export const faqs = [
  {
    id: 'f1',
    question: { ar: 'ما هي شروط التمويل لدى نواف أوتو؟', en: 'What are the financing requirements at Nawaf Auto?' },
    answer: {
      ar: 'للاطلاع على الشروط المناسبة لحالتك، تواصل مع فريق التمويل واذكر السيارة المطلوبة. تقديم الاستفسار لا يعني الموافقة على التمويل.',
      en: 'To learn the terms that fit your case, contact our finance team and mention the car you want. Submitting an inquiry does not mean financing approval.',
    },
  },
  {
    id: 'f2',
    question: { ar: 'كم تستغرق عملية الموافقة على التمويل؟', en: 'How long does financing approval take?' },
    answer: { ar: 'عادةً يتواصل معك فريقنا خلال 24 ساعة، وتختلف مدة الموافقة النهائية بحسب جهة التمويل.', en: 'Our team usually contacts you within 24 hours; final approval time depends on the finance provider.' },
  },
  {
    id: 'f3',
    question: { ar: 'هل يمكن التمويل بدون دفعة أولى؟', en: 'Can I get financing without a down payment?' },
    answer: { ar: 'بعض جهات التمويل تتيح ذلك بحسب الراتب والسجل الائتماني. تواصل معنا لمعرفة الخيارات المتاحة لك.', en: 'Some providers allow it depending on salary and credit record. Contact us to learn your options.' },
  },
  {
    id: 'f4',
    question: { ar: 'ما هي أقصى مدة للتمويل؟', en: 'What is the maximum financing term?' },
    answer: { ar: 'تصل مدة التمويل عادةً إلى 60 شهرًا، وقد تمتد لدى بعض الجهات حتى 84 شهرًا.', en: 'Terms usually go up to 60 months, and some providers extend to 84 months.' },
  },
  {
    id: 'f5',
    question: { ar: 'هل يمكنني طلب سيارة غير متوفرة في المعرض؟', en: "Can I request a car that isn't in the showroom?" },
    answer: { ar: 'نعم، من خلال نموذج الطلب المخصص نبحث عن السيارة بالمواصفات التي تحددها ونتواصل معك.', en: 'Yes — through the custom request form we search for the car with your specs and get back to you.' },
  },
]

export const ugcStories = [
  { id: 'u1', image: '/images/videos/v1.png' },
  { id: 'u2', image: '/images/videos/v2.png' },
  { id: 'u3', image: '/images/videos/v1.png' },
  { id: 'u4', image: '/images/videos/v2.png' },
]
