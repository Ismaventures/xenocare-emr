export {
  generateEmbedding,
  generateEmbeddingBatch,
  checkEmbeddingHealth,
} from './embeddingClient';
export {
  buildChunk,
  buildChunks,
  getEmbeddableTables,
  getTableMeta,
} from './chunkBuilder';
export {
  syncPatientEmbeddings,
  syncAllPatientsEmbeddings,
  cancelPatientSync,
  deletePatientEmbeddings,
  getPatientEmbeddingStats,
} from './embeddingSync';
