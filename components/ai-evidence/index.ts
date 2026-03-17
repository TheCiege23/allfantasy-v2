/**
 * Evidence presentation layer — evidence, uncertainty, missing data, caveats.
 * PROMPT 127: Evidence visible before AI explanation; confidence always displayed.
 * No AI-invented metrics; show uncertainty when data missing.
 */

export { default as EvidenceBlock } from './EvidenceBlock'
export { default as EvidenceCard } from './EvidenceCard'
export { default as ConfidenceMeter } from './ConfidenceMeter'
export { default as UncertaintyBlock } from './UncertaintyBlock'
export { default as UncertaintyNotice } from './UncertaintyNotice'
export { default as MissingDataBlock } from './MissingDataBlock'
export { default as MissingDataNotice } from './MissingDataNotice'
export { default as CaveatsBlock } from './CaveatsBlock'
export { default as AIEvidencePresentation } from './AIEvidencePresentation'

export type { EvidenceBlockProps } from './EvidenceBlock'
export type { EvidenceCardProps } from './EvidenceCard'
export type { ConfidenceMeterProps, ConfidenceLabel as ConfidenceMeterLabel } from './ConfidenceMeter'
export type { UncertaintyBlockProps } from './UncertaintyBlock'
export type { UncertaintyNoticeProps } from './UncertaintyNotice'
export type { MissingDataBlockProps } from './MissingDataBlock'
export type { MissingDataNoticeProps } from './MissingDataNotice'
export type { CaveatsBlockProps } from './CaveatsBlock'
export type { AIEvidencePresentationProps } from './AIEvidencePresentation'
