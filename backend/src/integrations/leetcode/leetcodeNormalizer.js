import { z } from 'zod';
import { ApiError } from '../../utils/errors.js';
export const leetcodeUsername = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{1,30}$/);
const rowSchema = z
  .object({
    externalId: z.string().trim().min(1).max(100),
    problemId: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(300),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
    occurredAt: z.iso
      .datetime({ offset: true })
      .refine((v) => Date.parse(v) <= Date.now(), 'Future timestamps are invalid'),
    status: z.literal('ACCEPTED'),
  })
  .strict();
export const importInput = z
  .object({
    format: z.enum(['json', 'csv']),
    content: z.string().min(1).max(500000),
    username: leetcodeUsername,
  })
  .strict();
export function parseCsv(content) {
  const rows = [];
  let row = [],
    cell = '',
    quoted = false,
    closed = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (quoted) {
      if (c === '"' && content[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else cell += c;
    } else if (c === '"' && !cell && !closed) quoted = true;
    else if ([',', '\n', '\r'].includes(c)) {
      row.push(cell);
      cell = '';
      closed = false;
      if (c !== ',') {
        rows.push(row);
        row = [];
        if (c === '\r' && content[i + 1] === '\n') i++;
      }
    } else {
      if (closed || c === '"') throw new ApiError(400, 'Malformed CSV quoting.');
      cell += c;
    }
  }
  if (quoted) throw new ApiError(400, 'Unclosed CSV quote.');
  if (cell || row.length || closed) {
    row.push(cell);
    rows.push(row);
  }
  const headers = rows.shift() || [];
  if (
    headers.length !== 6 ||
    new Set(headers).size !== 6 ||
    headers.some((h) => !Object.hasOwn(rowSchema.shape, h))
  )
    throw new ApiError(
      400,
      'Required columns: externalId,problemId,title,difficulty,occurredAt,status',
    );
  return rows.map((values) => {
    if (values.length !== headers.length) throw new ApiError(400, 'CSV column count mismatch.');
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
}
export function normalizeImport(input) {
  const { content, format } = importInput.parse(input);
  let rows;
  try {
    rows = format === 'json' ? JSON.parse(content) : parseCsv(content.replace(/^\uFEFF/, ''));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'Invalid JSON file.');
  }
  return z
    .array(rowSchema)
    .min(1)
    .max(1000)
    .parse(rows)
    .map((r) => ({
      externalId: r.externalId,
      problemId: r.problemId,
      title: r.title,
      difficulty: r.difficulty,
      occurredAt: new Date(r.occurredAt),
    }));
}
