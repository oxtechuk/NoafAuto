import { Fragment, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Car } from '@/types'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import { useApi } from '@/hooks/useApi'
import { useCompare } from '@/context/CompareContext'
import { getCars } from '@/services/cars'
import { num, sar } from '@/lib/format'

const DEFAULT_IDS = ['mercedes-s500-4matic', 'bmw-x7-xdrive40i']

export default function Compare() {
  const { t } = useTranslation()
  const { ids, set } = useCompare()
  const { data } = useApi(() => getCars({}))
  const all = data?.data ?? []

  // Pre-fill with the design's default pair the first time
  useEffect(() => {
    if (ids.length === 0) set(DEFAULT_IDS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const slots: (Car | undefined)[] = [0, 1].map((i) => all.find((c) => c.id === ids[i]))
  const [a, b] = slots
  const choose = (i: number, id: string) => {
    const next = [...ids]
    next[i] = id
    set(next.filter(Boolean).slice(0, 2))
  }
  const remove = (i: number) => set(ids.filter((_, k) => k !== i))

  return (
    <>
      <section className="bg-ink">
        <div className="container-x pt-[34px] pb-8">
          <p className="text-small text-gold">
            <Link to="/cars" className="hover:underline">{t('nav.cars')}</Link> / {t('footer.compareCars')}
          </p>
          <h1 className="mt-9 text-[40px] leading-[52px] font-extrabold text-white md:text-display md:leading-[76px]">{t('compare.title')}</h1>
          <p className="mt-3.5 text-small text-gold">{t('compare.subtitle')}</p>
        </div>
      </section>

      {/* Selectors */}
      <section className="bg-cream py-10 pb-16">
        <div className="container-x">
          <div className="mx-auto grid max-w-[960px] gap-8 md:grid-cols-2 md:gap-16">
            {slots.map((car, i) => (
              <SelectorCard key={i} index={i} car={car} options={all.filter((c) => !ids.includes(c.id) || c.id === car?.id)} onChoose={(id) => choose(i, id)} onRemove={() => remove(i)} />
            ))}
          </div>
        </div>
      </section>

      {a && b ? <Comparison a={a} b={b} /> : <p className="bg-cream pb-24 text-center text-muted">{t('compare.pick')}</p>}
    </>
  )
}

function SelectorCard({ index, car, options, onChoose, onRemove }: { index: number; car?: Car; options: Car[]; onChoose: (id: string) => void; onRemove: () => void }) {
  const { t } = useTranslation()
  const picker = (label: string, cls: string) => (
    <label className={`relative flex cursor-pointer items-center justify-center rounded-lg border border-line text-body font-bold hover:bg-sand/60 ${cls}`}>
      {label}
      <select value={car?.id ?? ''} onChange={(e) => onChoose(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={label}>
        <option value="" disabled>{t('compare.choose')}</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>{c.brand} {c.model}</option>
        ))}
      </select>
    </label>
  )
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-white px-4 pt-5 pb-[14px]">
      <div className="flex items-center justify-between px-2 text-tiny font-medium text-muted">
        <span>{index === 0 ? t('compare.first') : t('compare.second')}</span>
        {car && <button onClick={onRemove} className="hover:text-ink">{t('common.remove')}</button>}
      </div>
      <div className="mt-5 flex h-[210px] items-center justify-center rounded-lg bg-sand">
        {car ? <img src={car.image} alt={car.model} className="max-h-full max-w-full object-contain" /> : <Icon name="compare" size={40} className="text-line" />}
      </div>
      {car ? (
        <div className="px-2">
          <p className="mt-3 text-tiny font-medium text-bronze">{car.brand} · {car.year}</p>
          <p className="mt-1.5 text-h3 font-bold">{car.model}</p>
          <p className="mt-1.5 text-tiny font-medium text-muted">
            <bdi>{car.horsepower} HP</bdi>&nbsp;&nbsp; · &nbsp;&nbsp;{car.fuelLabel}&nbsp;&nbsp; · &nbsp;&nbsp;{t('common.seats', { count: car.seats })}
          </p>
          {picker(t('compare.change'), 'mt-3.5 h-10')}
        </div>
      ) : (
        <div className="px-2 pt-6">{picker(t('compare.choose'), 'h-12')}</div>
      )}
    </div>
  )
}

type Row = { label: string; a: string; b: string; win?: 'a' | 'b' }

function Comparison({ a, b }: { a: Car; b: Car }) {
  const { t } = useTranslation()
  const name = (c: Car) => `${c.brand} ${c.model}`
  const lower = (x: number, y: number): 'a' | 'b' | undefined => (x === y ? undefined : x < y ? 'a' : 'b')
  const higher = (x: number, y: number): 'a' | 'b' | undefined => (x === y ? undefined : x > y ? 'a' : 'b')
  const pick = (w: 'a' | 'b' | undefined) => (w === 'a' ? a : w === 'b' ? b : undefined)

  const diffs = [
    { v: num(Math.abs(a.cashPrice - b.cashPrice)), l: t('compare.lessCash'), w: pick(lower(a.cashPrice, b.cashPrice)) },
    { v: num(Math.abs(a.monthlyPrice - b.monthlyPrice)), l: t('compare.lessMonthly'), w: pick(lower(a.monthlyPrice, b.monthlyPrice)) },
    { v: `${Math.abs(a.horsepower - b.horsepower)} HP`, l: t('compare.morePower'), w: pick(higher(a.horsepower, b.horsepower)) },
    { v: String(Math.abs(a.seats - b.seats)), l: t('compare.moreSeats'), w: pick(higher(a.seats, b.seats)) },
  ].filter((d) => d.w)

  const groups: { title: string; rows: Row[] }[] = [
    {
      title: t('compare.groupCost'),
      rows: [
        { label: t('compare.rowCash'), a: num(a.cashPrice), b: num(b.cashPrice), win: lower(a.cashPrice, b.cashPrice) },
        { label: t('compare.rowMonthly'), a: num(a.monthlyPrice), b: num(b.monthlyPrice), win: lower(a.monthlyPrice, b.monthlyPrice) },
      ],
    },
    {
      title: t('compare.groupEngine'),
      rows: [
        { label: t('compare.rowEngine'), a: a.engine, b: b.engine },
        { label: t('compare.rowPower'), a: `${a.horsepower} HP`, b: `${b.horsepower} HP`, win: higher(a.horsepower, b.horsepower) },
      ],
    },
    {
      title: t('compare.groupSpace'),
      rows: [
        { label: t('compare.rowCategory'), a: a.categoryLabel, b: b.categoryLabel },
        { label: t('compare.rowSeats'), a: t('common.seats', { count: a.seats }), b: t('common.seats', { count: b.seats }), win: higher(a.seats, b.seats) },
        { label: t('compare.rowFuel'), a: a.fuelLabel, b: b.fuelLabel },
        { label: t('compare.rowTransmission'), a: a.transmissionLabel, b: b.transmissionLabel },
      ],
    },
    {
      title: t('compare.groupData'),
      rows: [
        { label: t('compare.rowBrand'), a: a.brand, b: b.brand },
        { label: t('compare.rowYear'), a: String(a.year), b: String(b.year) },
        { label: t('compare.rowAvailability'), a: a.available ? t('common.available') : t('common.unavailable'), b: b.available ? t('common.available') : t('common.unavailable') },
      ],
    },
  ]

  const cell = (v: string, win: boolean) => (
    <div className="flex items-center justify-center p-2">
      <span className={`flex h-12 w-full items-center justify-center rounded-lg text-center text-body font-bold ${win ? 'bg-sand text-bronze' : ''}`}><bdi>{v}</bdi></span>
    </div>
  )

  let rowIndex = 0
  return (
    <>
      {/* Differences */}
      <section className="bg-cream pb-[60px]">
        <div className="container-x">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <h2 className="text-h2 font-bold">{t('compare.diffTitle')}</h2>
            <p className="text-small text-muted">{t('compare.diffSubtitle')}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-[42px] lg:grid-cols-4 lg:gap-6">
            {diffs.map((d, i) => (
              <div key={i} className="rounded-2xl bg-ink px-6 pt-6 pb-7">
                <p className="text-h1 font-extrabold text-gold"><bdi>{d.v}</bdi></p>
                <p className="mt-2.5 text-small text-white">{d.l}</p>
                <p className="mt-6 text-tiny font-medium text-silver">{name(d.w!)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Matrix */}
      <section className="bg-white pt-9 pb-5">
        <div className="container-x">
          <h2 className="text-h2 font-bold">{t('compare.detailTitle')}</h2>
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="mt-[30px] grid grid-cols-[220px_1fr_1fr] items-end pb-4">
                <p className="text-body font-bold">{t('compare.criterion')}</p>
                {[a, b].map((c, i) => (
                  <div key={c.id} className="text-center">
                    <p className="text-small text-muted">{i === 0 ? t('compare.firstAlt') : t('compare.second')}</p>
                    <p className="mt-1.5 text-body font-bold">{name(c)}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-hidden rounded-2xl border border-line">
                {groups.map((g, gi) => (
                  <Fragment key={g.title}>
                    <div className="flex h-11 items-center justify-between bg-sand px-4 ps-4 pe-6">
                      <p className="text-body font-bold">{g.title}</p>
                      <p className="text-tiny font-medium text-bronze">{String(gi + 1).padStart(2, '0')}</p>
                    </div>
                    {g.rows.map((r) => {
                      const odd = rowIndex++ % 2 === 1
                      return (
                        <div key={r.label} className={`grid h-16 grid-cols-[220px_1fr_1fr] border-b border-line last:border-b-0 ${odd ? 'bg-cream' : 'bg-white'}`}>
                          <p className="flex items-center border-e border-line px-4 text-small text-muted">{r.label}</p>
                          <div className="border-e border-line">{cell(r.a, r.win === 'a')}</div>
                          {cell(r.b, r.win === 'b')}
                        </div>
                      )
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-6 text-small text-muted">{t('compare.note1')}</p>
          <p className="mt-3.5 text-tiny font-medium text-muted">{t('compare.note2')}</p>
        </div>
      </section>

      {/* Decision actions */}
      <section className="bg-cream pt-7 pb-[22px]">
        <div className="container-x">
          <h2 className="text-h2 font-bold">{t('compare.nextTitle')}</h2>
          <div className="mt-9 grid gap-8 md:grid-cols-2">
            {[a, b].map((c) => (
              <div key={c.id} className="rounded-2xl bg-ink px-6 pt-5 pb-6">
                <p className="text-h3 font-bold text-white">{name(c)}</p>
                <div className="mt-[18px] flex justify-between gap-4">
                  <div>
                    <p className="text-tiny font-medium text-silver">{t('common.cash')}</p>
                    <p className="mt-2 text-h3 font-bold text-white">{sar(c.cashPrice)}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-tiny font-medium text-silver">{t('compare.fromMonthly')}</p>
                    <p className="mt-2 text-h3 font-bold text-gold">{sar(c.monthlyPrice)}</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-6">
                  <Button to={`/finance/calculator?car=${c.id}`} className="h-[46px]">{t('compare.requestNow')}</Button>
                  <Button to={`/cars/${c.id}`} variant="outline-dark" className="h-[46px]">{t('compare.details')}</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
