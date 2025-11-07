import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  const { rows } = await sql`select now() as server_time`;
  return NextResponse.json(rows[0]);
}