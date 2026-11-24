import { Link } from 'react-router-dom'
import type { SkAssistantCar, SkAssistantCard } from '@/sitekit-sdk/assistant'
import { useCompare } from '@/context/CompareContext'
import { sar } from '@/lib/format'
import { asset } from '@/lib/asset'
import Icon from '@/components/ui/Icon'

/** Rich message cards returned by the assistant's tools, drawn with Nawaf's design. */
export default function AssistantCards({ cards }: { cards: SkAssistantCard[] }) {
  return (
    <div className="mt-2 space-y-2">
      {cards.map((card, i) => {
        switch (card.type) {
          case 'cars':
            return <CarsCard key={i} cars={card.cars} />
          case 'comparison':
            return <ComparisonCard key={i} card={card} />
          case 'installment':
            return <InstallmentCard key={i} card={card} />
          case 'showroom_info':
            return <ShowroomCard key={i} card={card} />
          case 'lead_created':
            return (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-sand px-3 py-2 text-small font-bold text-bronze">
                <Icon name="check" size={16} /> تم تسجيل طلبك رقم {card.lead_id} — بنتواصل معك قريباً
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
}

function CarsCard({ cars }: { cars: SkAssistantCar[] }) {
  const { has, toggle } = useCompare()
  return (
    <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
      {cars.map((car) => (
        <div key={car.slug} className="w-[200px] shrink-0 snap-start overflow-hidden rounded-xl border border-line bg-cream">
          <Link to={car.url} className="block">
            <img src={car.image || asset('/images/cars/mercedes-thumb.jpg')} alt={car.name} className="h-[96px] w-full bg-white object-contain" loading="lazy" />
            <div className="px-3 pt-2">
              <p className="truncate text-tiny text-muted">
                {car.brand} {car.year ? `· ${car.year}` : ''}
              </p>
              <p className="truncate text-small font-bold text-ink">{car.name}</p>
              {car.price !== undefined && <p className="mt-1 text-small font-bold text-bronze">{sar(car.price)}</p>}
              {car.monthly_from !== undefined && <p className="text-tiny text-muted">قسط من {sar(car.monthly_from)} / شهر</p>}
              {car.offer && <p className="mt-1 truncate text-tiny font-medium text-bronze">🏷️ {car.offer}</p>}
            </div>
          </Link>
          <div className="flex gap-1.5 p-3">
            <Link to={car.url} className="flex-1 rounded-lg bg-ink py-1.5 text-center text-tiny font-bold text-gold">
              التفاصيل
            </Link>
            <button
              onClick={() => toggle(car.slug)}
              className={`flex items-center justify-center rounded-lg border px-2 text-tiny font-bold ${has(car.slug) ? 'border-bronze bg-sand text-bronze' : 'border-line bg-white text-ink'}`}
              aria-label="أضف للمقارنة"
            >
              <Icon name="compare" size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ComparisonCard({ card }: { card: Extract<SkAssistantCard, { type: 'comparison' }> }) {
  const rows = card.sections.flatMap((s) => s.rows).slice(0, 10)
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full text-tiny">
        <thead className="bg-sand">
          <tr>
            <th className="px-2 py-2 text-start font-bold text-muted"> </th>
            {card.cars.map((car) => (
              <th key={car.slug} className="px-2 py-2 text-start font-bold text-ink">
                <Link to={car.url}>{car.name}</Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, i) => (
            <tr key={i}>
              <td className="px-2 py-1.5 text-muted">{row.label}</td>
              {row.values.map((value, j) => (
                <td key={j} className={`px-2 py-1.5 ${row.winner === j ? 'font-bold text-bronze' : 'text-ink'}`}>
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <Link to={`/compare`} className="block border-t border-line py-2 text-center text-tiny font-bold text-bronze">
        المقارنة الكاملة
      </Link>
    </div>
  )
}

function InstallmentCard({ card }: { card: Extract<SkAssistantCard, { type: 'installment' }> }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <p className="text-tiny text-muted">{card.car}</p>
      <p className="mt-1 text-h3 font-bold text-ink">
        {sar(card.best_option.monthly)} <span className="text-small font-medium text-muted">/ شهرياً</span>
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-tiny">
        <dt className="text-muted">البنك</dt>
        <dd className="font-bold text-ink">{card.best_option.bank}</dd>
        <dt className="text-muted">المدة</dt>
        <dd className="font-bold text-ink">{card.months} شهر</dd>
        <dt className="text-muted">الدفعة الأولى</dt>
        <dd className="font-bold text-ink">{sar(card.down_payment)}</dd>
        <dt className="text-muted">الإجمالي</dt>
        <dd className="font-bold text-ink">{sar(card.best_option.total)}</dd>
      </dl>
      {card.eligibility && (
        <p className={`mt-2 rounded-lg px-2 py-1 text-tiny font-bold ${card.eligibility.fits_salary ? 'bg-sand text-bronze' : 'bg-red-50 text-red-700'}`}>
          {card.eligibility.fits_salary ? 'القسط مناسب لراتبك تقديرياً' : `القسط أعلى من المناسب لراتبك (حتى ${sar(card.eligibility.max_affordable_installment)})`}
        </p>
      )}
      {card.disclaimer && <p className="mt-2 text-tiny text-muted">{card.disclaimer}</p>}
      <Link to={`/finance/calculator?car=${card.slug}`} className="mt-2 block rounded-lg bg-ink py-1.5 text-center text-tiny font-bold text-gold">
        قدّم طلب تمويل
      </Link>
    </div>
  )
}

function ShowroomCard({ card }: { card: Extract<SkAssistantCard, { type: 'showroom_info' }> }) {
  const whatsapp = card.whatsapp?.replace(/\D/g, '')
  return (
    <div className="flex gap-2">
      {card.phone && (
        <a href={`tel:${card.phone}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-white py-2 text-tiny font-bold text-ink">
          <Icon name="phone" size={14} /> اتصل بنا
        </a>
      )}
      {whatsapp && (
        <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink py-2 text-tiny font-bold text-gold">
          <Icon name="whatsapp" size={14} /> واتساب
        </a>
      )}
    </div>
  )
}
