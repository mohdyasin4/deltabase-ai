// app/api/database/[id]/tables/[tableName]/columns/route.ts  
import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';
import { connectToPostgres, listPostgresColumns, connectToMySQL, listMySQLColumns, connectToMongoDB, listMongoDBColumns } from '@/utils/databaseUtils';

export async function GET(req: NextRequest, { params }: { params: { id: string; tableName: string } }) {
  const { id, tableName } = params;

  if (!id || !tableName) {
    return NextResponse.json({ error: 'Invalid ID or tableName' }, { status: 400 });
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
    let columns: string[] = [];
    switch (database_type) {
      case 'postgres':
        const pgClient = await connectToPostgres({ host, database: database_name, user: username, password });
        columns = await listPostgresColumns(pgClient, tableName);
        await pgClient.end();
        break;
      case 'mysql':
        const mysqlConnection = await connectToMySQL({ host, database: database_name, user: username, password });
        columns = await listMySQLColumns(mysqlConnection, tableName);
        await mysqlConnection.end();
        break;
      case 'mongodb':
        const { db, client } = await connectToMongoDB({ host, database: database_name, user: username, password });
        columns = await listMongoDBColumns(db, tableName);
        await client.close();
        break;
      default:
        return NextResponse.json({ error: 'Unsupported database type' }, { status: 400 });
    }

    return NextResponse.json(columns, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Error connecting to the database or querying the table' }, { status: 500 });
  }
}
