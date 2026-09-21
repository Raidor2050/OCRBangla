import type { DocumentOutcome } from '../ocr/pipeline'

/**
 * Structured JSON export for one processed document. Contains only the
 * document text, engine metadata, and processing facts — never credentials,
 * private configuration, or other users' data.
 */
export function buildDocumentJson(doc: DocumentOutcome): Record<string, unknown> {
  return {
    app: 'ordinary-chobi-reader',
    version: 1,
    fileName: doc.fileName,
    providerId: doc.providerId,
    model: doc.model ?? null,
    processingMs: doc.processingMs,
    processedAtIso: new Date(doc.finishedAt).toISOString(),
    stages: doc.stages,
    text: doc.text,
    rawText: doc.rawText,
    issueCount: doc.issues.length,
    issues: doc.issues.map((i) => ({
      code: i.code,
      severity: i.severity,
      message: i.message,
    })),
    pages: doc.pageOutcomes.map((o) => ({
      pageIndex: o.ocr.pageIndex,
      text: o.ocr.text,
      rawText: o.rawText,
      confidence:
        typeof o.ocr.confidence === 'number' ? Number(o.ocr.confidence.toFixed(2)) : null,
      lineCount: o.ocr.lines?.length ?? null,
      preprocessing: o.preprocessApplied,
      meta: o.ocr.meta ?? {},
    })),
  }
}