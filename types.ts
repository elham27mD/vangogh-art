
export interface GenerationResult {
  originalUrl: string;
  processedUrl: string;
}

export enum AppStage {
  UPLOAD = 'UPLOAD',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT'
}
