'use client'

import { motion, AnimatePresence } from 'framer-motion'

type Props = {
  open: boolean
  onClose: () => void
  name: string
  position: string
  team: string
  imageUrl?: string | null
}

export function PlayerCard({ open, onClose, name, position, team, imageUrl }: Props) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#0c0c1e] p-4 shadow-xl"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-3">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white/10 text-lg font-bold text-white/50">
                  {name.slice(0, 2)}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-white">{name}</p>
                <p className="text-xs text-white/50">
                  {position} · {team}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-lg bg-white/[0.08] py-2 text-sm text-white/80"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
