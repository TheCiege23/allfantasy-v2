'use client'

import { useState } from 'react'

/** Commissioner UI — local state only (wire save to league API separately). */
export function IDPCapPanel() {
  const [totalCap, setTotalCap] = useState(200)
  const [hardCap, setHardCap] = useState(true)
  const [floorOn, setFloorOn] = useState(false)
  const [floorPct, setFloorPct] = useState(0.75)
  const [rollover, setRollover] = useState(false)
  const [holdbackOn, setHoldbackOn] = useState(false)
  const [holdbackPct, setHoldbackPct] = useState(0.1)
  const [draftMethod, setDraftMethod] = useState<'auction' | 'snake_scale' | 'hybrid'>('auction')
  const [snakeHigh, setSnakeHigh] = useState(30)
  const [snakeLow, setSnakeLow] = useState(1)
  const [curve, setCurve] = useState<'linear' | 'logarithmic' | 'stepped'>('linear')
  const [auctionYears, setAuctionYears] = useState(1)
  const [snakeTop, setSnakeTop] = useState(3)
  const [snakeMid, setSnakeMid] = useState(2)
  const [snakeLate, setSnakeLate] = useState(1)
  const [extBoost, setExtBoost] = useState(15)
  const [maxYears, setMaxYears] = useState(5)
  const [tagOn, setTagOn] = useState(true)
  const [tagVal, setTagVal] = useState(20)
  const [dynasty, setDynasty] = useState(false)
  const [carry, setCarry] = useState(false)
  const [waiveDead, setWaiveDead] = useState(false)

  return (
    <div className="space-y-6 px-4 py-6 text-[13px] text-white/85" data-testid="idp-cap-panel">
      <section className="space-y-3 rounded-xl border border-white/[0.08] bg-[#0d1117] p-4">
        <h3 className="text-sm font-bold text-white">Cap Configuration</h3>
        <label className="flex items-center justify-between gap-2">
          <span>Total cap ($M)</span>
          <input
            type="number"
            value={totalCap}
            onChange={(e) => setTotalCap(Number(e.target.value))}
            className="w-24 rounded border border-white/15 bg-black/40 px-2 py-1 text-white"
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>Hard cap</span>
          <input type="checkbox" checked={hardCap} onChange={(e) => setHardCap(e.target.checked)} />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>Cap floor</span>
          <input type="checkbox" checked={floorOn} onChange={(e) => setFloorOn(e.target.checked)} />
        </label>
        {floorOn ? (
          <label className="flex items-center justify-between gap-2 pl-2">
            <span>Floor % of cap</span>
            <input
              type="number"
              step={0.05}
              value={floorPct}
              onChange={(e) => setFloorPct(Number(e.target.value))}
              className="w-20 rounded border border-white/15 bg-black/40 px-2 py-1"
            />
          </label>
        ) : null}
        <label className="flex items-center justify-between gap-2">
          <span>Cap rollover</span>
          <input type="checkbox" checked={rollover} onChange={(e) => setRollover(e.target.checked)} />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>In-season holdback</span>
          <input type="checkbox" checked={holdbackOn} onChange={(e) => setHoldbackOn(e.target.checked)} />
        </label>
        {holdbackOn ? (
          <label className="flex items-center justify-between gap-2 pl-2">
            <span>Holdback %</span>
            <input
              type="number"
              step={0.05}
              value={holdbackPct}
              onChange={(e) => setHoldbackPct(Number(e.target.value))}
              className="w-20 rounded border border-white/15 bg-black/40 px-2 py-1"
            />
          </label>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl border border-white/[0.08] bg-[#0d1117] p-4">
        <h3 className="text-sm font-bold text-white">Draft Salary Method</h3>
        <div className="flex flex-col gap-2">
          {(['auction', 'snake_scale', 'hybrid'] as const).map((m) => (
            <label key={m} className="flex items-center gap-2">
              <input
                type="radio"
                name="dm"
                checked={draftMethod === m}
                onChange={() => setDraftMethod(m)}
              />
              <span className="capitalize">{m.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
        {draftMethod === 'snake_scale' || draftMethod === 'hybrid' ? (
          <div className="space-y-2 border-t border-white/[0.06] pt-3">
            <label className="flex justify-between gap-2">
              Top pick salary ($M)
              <input
                type="number"
                value={snakeHigh}
                onChange={(e) => setSnakeHigh(Number(e.target.value))}
                className="w-20 rounded border border-white/15 bg-black/40 px-2 py-1"
              />
            </label>
            <label className="flex justify-between gap-2">
              Last pick salary ($M)
              <input
                type="number"
                value={snakeLow}
                onChange={(e) => setSnakeLow(Number(e.target.value))}
                className="w-20 rounded border border-white/15 bg-black/40 px-2 py-1"
              />
            </label>
            <p className="text-[11px] text-white/45">Salary curve</p>
            <select
              value={curve}
              onChange={(e) => setCurve(e.target.value as typeof curve)}
              className="rounded border border-white/15 bg-black/40 px-2 py-1 text-white"
            >
              <option value="linear">Linear</option>
              <option value="logarithmic">Logarithmic</option>
              <option value="stepped">Stepped</option>
            </select>
          </div>
        ) : null}
        <div className="grid gap-2 border-t border-white/[0.06] pt-3 text-[11px]">
          <label className="flex justify-between">
            Auction default years (1–5)
            <input
              type="number"
              min={1}
              max={5}
              value={auctionYears}
              onChange={(e) => setAuctionYears(Number(e.target.value))}
              className="w-16 rounded border border-white/15 bg-black/40 px-2 py-1"
            />
          </label>
          <label className="flex justify-between">
            Snake top 10 years
            <input
              type="number"
              min={1}
              max={5}
              value={snakeTop}
              onChange={(e) => setSnakeTop(Number(e.target.value))}
              className="w-16 rounded border border-white/15 bg-black/40 px-2 py-1"
            />
          </label>
          <label className="flex justify-between">
            Snake mid years
            <input
              type="number"
              min={1}
              max={5}
              value={snakeMid}
              onChange={(e) => setSnakeMid(Number(e.target.value))}
              className="w-16 rounded border border-white/15 bg-black/40 px-2 py-1"
            />
          </label>
          <label className="flex justify-between">
            Snake late years
            <input
              type="number"
              min={1}
              max={5}
              value={snakeLate}
              onChange={(e) => setSnakeLate(Number(e.target.value))}
              className="w-16 rounded border border-white/15 bg-black/40 px-2 py-1"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-white/[0.08] bg-[#0d1117] p-4">
        <h3 className="text-sm font-bold text-white">Contract Rules</h3>
        <label className="flex items-center justify-between gap-2">
          <span>Extension boost % (5–25)</span>
          <input
            type="range"
            min={5}
            max={25}
            value={extBoost}
            onChange={(e) => setExtBoost(Number(e.target.value))}
          />
          <span className="w-8 text-right">{extBoost}%</span>
        </label>
        <label className="flex justify-between gap-2">
          Max contract length
          <select
            value={maxYears}
            onChange={(e) => setMaxYears(Number(e.target.value))}
            className="rounded border border-white/15 bg-black/40 px-2 py-1"
          >
            {[1, 2, 3, 4, 5].map((y) => (
              <option key={y} value={y}>
                {y} yr
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between">
          <span>Franchise tag</span>
          <input type="checkbox" checked={tagOn} onChange={(e) => setTagOn(e.target.checked)} />
        </label>
        {tagOn ? (
          <label className="flex justify-between gap-2">
            Tag value ($M)
            <input
              type="number"
              value={tagVal}
              onChange={(e) => setTagVal(Number(e.target.value))}
              className="w-20 rounded border border-white/15 bg-black/40 px-2 py-1"
            />
          </label>
        ) : null}
        <label className="flex items-center justify-between">
          <span>Dynasty mode</span>
          <input type="checkbox" checked={dynasty} onChange={(e) => setDynasty(e.target.checked)} />
        </label>
        {dynasty ? (
          <label className="flex items-center justify-between pl-2">
            <span>Contracts carry over</span>
            <input type="checkbox" checked={carry} onChange={(e) => setCarry(e.target.checked)} />
          </label>
        ) : null}
      </section>

      <section className="space-y-2 rounded-xl border border-white/[0.08] bg-[#0d1117] p-4">
        <h3 className="text-sm font-bold text-white">Dead Money Rules</h3>
        <p className="text-[12px] text-white/55">Current year: 100% (standard)</p>
        <p className="text-[12px] text-white/55">Per future year: 25% (standard)</p>
        <label className="flex items-center justify-between gap-2 pt-2">
          <span>Commissioner override (waive dead money)</span>
          <input type="checkbox" checked={waiveDead} onChange={(e) => setWaiveDead(e.target.checked)} />
        </label>
      </section>

      <p className="text-[11px] text-amber-200/80">
        Save wiring to league services can connect these controls to your cap engine when ready.
      </p>
    </div>
  )
}
