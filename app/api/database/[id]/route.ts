// app/api/database/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {supabaseClient} from '@/lib/supabaseClient';
import { connectToPostgres, listPostgresTables, connectToMySQL, listMySQLTables, connectToMongoDB, listMongoDBCollections } from '@/utils/databaseUtils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const { data, error } = await supabaseClient
    .from('database_connections')
    .select('database_type, host, database_name, username, password')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Error fetching database details' }, { status: 500 });
  }

  const { database_type, host, database_name, username, password } = data;

  try {
    let tables: string[] = [];
    switch (database_type) {
      case 'postgres':
        const pgClient = await connectToPostgres({ host, database: database_name, user: username, password });
        tables = await listPostgresTables(pgClient);
        await pgClient.end();
        break;
      case 'mysql':
        const mysqlConnection = await connectToMySQL({ host, database: database_name, user: username, password });
        tables = await listMySQLTables(mysqlConnection);
        await mysqlConnection.end();
        break;
      case 'mongodb':
        const mongoDb = await connectToMongoDB({ host, database: database_name, user: username, password });
        tables = await listMongoDBCollections(mongoDb);
        await mongoDb.client.close();
        break;
      default:
        return NextResponse.json({ error: 'Unsupported database type' }, { status: 400 });
    }

    return NextResponse.json(tables, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Error connecting to the database' }, { status: 500 });
  }
}
