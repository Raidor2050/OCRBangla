/** Shared prompts for multimodal API OCR providers. */

export const OCR_SYSTEM_PROMPT =
  'You are an OCR engine for documents written in Bangla (Bengali script), possibly mixed with English. ' +
  'Transcribe the image EXACTLY as written. Preserve paragraph and line breaks. Do not summarize, do not translate, ' +
  'do not add commentary, do not correct spelling or grammar. Output the transcription text only, with no extra prose.'

export const OCR_USER_PROMPT =
  'Transcribe this document image text exactly. Output only the transcription.'

export interface VisionMessage {
  role: 'system' | 'user'
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >
}

export function buildVisionMessages(imageDataUrl: string): VisionMessage[] {
  return [
    { role: 'system', content: OCR_SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: OCR_USER_PROMPT },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ],
    },
  ]
}