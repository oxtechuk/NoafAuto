import type { CarCategory, FuelType } from '@/types'

/** Temporary mock data — replace with Laravel API (see src/services). */
type L = { ar: string; en: string }

export interface CarRecord {
  id: string
  brand: string
  model: string
  year: number
  category: CarCategory
  fuel: FuelType
  seats: number
  engine: string
  horsepower: number
  cashPrice: number
  monthlyPrice: number
  image: string
  gallery: string[]
  isNew: boolean
  available: boolean
  series?: string
  description?: L
  features?: L[]
}

export const categoryLabels: Record<CarCategory, L> = {
  suv: { ar: 'SUV', en: 'SUV' },
  sedan: { ar: 'سيدان', en: 'Sedan' },
  sport: { ar: 'سيارة رياضية', en: 'Sports car' },
  luxury: { ar: 'فاخرة', en: 'Luxury' },
  electric: { ar: 'سيارة كهربائية', en: 'Electric' },
  crossover: { ar: 'كروس أوفر', en: 'Crossover' },
  compact: { ar: 'سيارة مدمجة', en: 'Compact' },
}

export const fuelLabels: Record<FuelType, L> = {
  petrol: { ar: 'بنزين', en: 'Petrol' },
  diesel: { ar: 'ديزل', en: 'Diesel' },
  hybrid: { ar: 'هجين', en: 'Hybrid' },
  electric: { ar: 'كهرباء', en: 'Electric' },
}

export const transmissionLabel: L = { ar: 'أوتوماتيك', en: 'Automatic' }

const sClassFeatures: L[] = [
  { ar: 'نظام MBUX Hyperscreen 56 بوصة', en: '56-inch MBUX Hyperscreen' },
  { ar: 'مقاعد Nappa بـ 10 اتجاهات', en: '10-way Nappa leather seats' },
  { ar: 'محرك V6 Biturbo 3.0L', en: '3.0L V6 Biturbo engine' },
  { ar: 'شمس الأمامية الزجاجية الكاملة', en: 'Full panoramic glass roof' },
  { ar: 'مدير مسار Distronic Plus', en: 'Distronic Plus lane assist' },
  { ar: 'نظام رؤية ليلية', en: 'Night vision system' },
  { ar: 'نظام صوت Burmester 3D', en: 'Burmester 3D sound system' },
  { ar: 'مقاعد خلفية تنفيذية فاخرة', en: 'Executive luxury rear seats' },
  { ar: 'مدير مسار Traffic Sign Assist', en: 'Traffic Sign Assist' },
]

export const cars: CarRecord[] = [
  {
    id: 'porsche-cayenne-gts',
    brand: 'Porsche',
    model: 'Cayenne GTS',
    year: 2024,
    category: 'suv',
    fuel: 'petrol',
    seats: 5,
    engine: '4.0L V8',
    horsepower: 493,
    cashPrice: 650000,
    monthlyPrice: 10600,
    image: '/images/cars/cayenne-gts.png',
    gallery: ['/images/cars/cayenne-gts.png'],
    isNew: true,
    available: true,
    series: 'CAYENNE',
  },
  {
    id: 'bmw-x1',
    brand: 'BMW',
    model: 'X1',
    year: 2024,
    category: 'compact',
    fuel: 'diesel',
    seats: 5,
    engine: '2.0L Turbo',
    horsepower: 241,
    cashPrice: 400000,
    monthlyPrice: 7500,
    image: '/images/cars/x1.png',
    gallery: ['/images/cars/x1.png'],
    isNew: true,
    available: true,
    series: 'X1',
  },
  {
    id: 'toyota-rav4',
    brand: 'Toyota',
    model: 'RAV4',
    year: 2024,
    category: 'crossover',
    fuel: 'hybrid',
    seats: 5,
    engine: '2.5L Hybrid',
    horsepower: 302,
    cashPrice: 450000,
    monthlyPrice: 8200,
    image: '/images/cars/rav4.png',
    gallery: ['/images/cars/rav4.png'],
    isNew: true,
    available: true,
    series: 'RAV4',
  },
  {
    id: 'mercedes-amg-gt',
    brand: 'Mercedes',
    model: 'AMG GT',
    year: 2024,
    category: 'sport',
    fuel: 'petrol',
    seats: 2,
    engine: '4.0L V8 Biturbo',
    horsepower: 577,
    cashPrice: 1200000,
    monthlyPrice: 15000,
    image: '/images/cars/amg-gt.png',
    gallery: ['/images/cars/amg-gt.png'],
    isNew: true,
    available: true,
    series: 'AMG GT',
  },
  {
    id: 'tesla-model-y',
    brand: 'Tesla',
    model: 'Model Y',
    year: 2024,
    category: 'electric',
    fuel: 'electric',
    seats: 5,
    engine: 'Dual Motor',
    horsepower: 384,
    cashPrice: 700000,
    monthlyPrice: 12000,
    image: '/images/cars/model-y.png',
    gallery: ['/images/cars/model-y.png'],
    isNew: true,
    available: true,
    series: 'MODEL Y',
  },
  {
    id: 'mercedes-s500-4matic',
    brand: 'Mercedes-Benz',
    model: 'S 500 4MATIC',
    year: 2024,
    category: 'sedan',
    fuel: 'petrol',
    seats: 5,
    engine: '3.0L Turbo',
    horsepower: 435,
    cashPrice: 750000,
    monthlyPrice: 12300,
    image: '/images/cars/s-class.png',
    gallery: ['/images/cars/s-class.png', '/images/cars/s-class-interior.jpg', '/images/cars/s-class.png', '/images/cars/s-class-interior.jpg'],
    isNew: true,
    available: true,
    series: 'S–CLASS',
    description: {
      ar: 'Mercedes-Benz S 500 4MATIC تُعيد تعريف معنى الرفاهية الحقيقية. بتصميم خارجي آسر وداخلية تشبه جناح فندق خمس نجوم، تقدم هذه السيدان تجربة يصعب مجاراتها في أي سيارة أخرى.',
      en: 'The Mercedes-Benz S 500 4MATIC redefines true luxury. With a captivating exterior and a cabin that feels like a five-star suite, this sedan delivers an experience few cars can match.',
    },
    features: sClassFeatures,
  },
  {
    id: 'bmw-x7-xdrive40i',
    brand: 'BMW',
    model: 'X7 xDrive40i',
    year: 2024,
    category: 'suv',
    fuel: 'petrol',
    seats: 7,
    engine: '3.0L TwinTurbo',
    horsepower: 340,
    cashPrice: 520000,
    monthlyPrice: 8500,
    image: '/images/cars/x7.png',
    gallery: ['/images/cars/x7.png'],
    isNew: false,
    available: true,
    series: 'X7',
  },
]
