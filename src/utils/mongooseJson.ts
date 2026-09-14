import { Schema } from 'mongoose';

/**
 * Serializes documents as { id, ...fields } instead of Mongoose's default
 * { _id, __v, ...fields } — matches the frontend's `id: string` field on
 * every documented response type. `hiddenFields` strips internal-only
 * fields (e.g. walletAddress used to link a record back to a Contributor)
 * that aren't part of the documented response shape.
 */
export function applyJsonTransform(schema: Schema, hiddenFields: string[] = []) {
  schema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret: Record<string, any>) => {
      delete ret._id;
      delete ret.__v;
      for (const field of hiddenFields) {
        delete ret[field];
      }
    },
  });
}
